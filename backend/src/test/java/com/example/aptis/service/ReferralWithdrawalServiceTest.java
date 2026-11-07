package com.example.aptis.service;

import com.example.aptis.entity.*;
import com.example.aptis.enums.*;
import com.example.aptis.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.*;
import java.util.UUID;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(showSql = false, properties = { "spring.datasource.url=jdbc:h2:mem:withdrawal-tests;MODE=MySQL;DB_CLOSE_DELAY=-1", "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect", "logging.level.org.springframework=WARN" })
@Import(ReferralWithdrawalService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ReferralWithdrawalServiceTest {
    @Autowired ReferralWithdrawalService service;
    @Autowired UserRepository users;
    @Autowired ReferralCommissionRepository commissions;
    @Autowired PaymentOrderRepository orders;
    @Autowired ReferralWithdrawalRepository withdrawals;

    @Test void minimumBalanceAndMaskedHistoryAreEnforced() {
        User user = funded(60000);
        assertThrows(IllegalArgumentException.class, () -> service.create(user.getEmail(), request(59999)));
        assertThrows(IllegalArgumentException.class, () -> service.create(user.getEmail(), request(60001)));
        var saved = service.create(user.getEmail(), request(60000));
        assertEquals(WithdrawalStatus.PENDING, saved.status());
        assertEquals("••••6789", saved.accountNumber());
        assertEquals(60000, withdrawals.sumForUser(user.getId(), java.util.List.of(WithdrawalStatus.PENDING)));
        assertEquals(1, service.mine(user.getEmail(), 0, 10).totalElements());
        assertEquals(0, service.mine(funded(0).getEmail(), 0, 10).totalElements());
    }

    @Test void retriesDoNotCreateDuplicatesAndOnlyOnePendingRequestIsAllowed() {
        User user = funded(200000);
        var request = request(75000);
        var first = service.create(user.getEmail(), request);
        assertEquals(first.id(), service.create(user.getEmail(), request).id());
        assertThrows(IllegalArgumentException.class, () -> service.create(user.getEmail(), request(75000)));
        assertEquals(1, service.mine(user.getEmail(), 0, 10).totalElements());
    }

    @Test void rejectingReleasesBalanceAndPayingNeverReleasesIt() {
        User user = funded(100000); User admin = funded(0);
        var first = service.create(user.getEmail(), request(75000));
        assertThrows(IllegalArgumentException.class, () -> service.review(admin.getEmail(), first.id(), new ReferralWithdrawalService.ReviewRequest(WithdrawalStatus.REJECTED, null, "")));
        service.review(admin.getEmail(), first.id(), new ReferralWithdrawalService.ReviewRequest(WithdrawalStatus.REJECTED, null, "Sai thông tin nhận tiền"));
        assertEquals(0, withdrawals.sumForUser(user.getId(), java.util.List.of(WithdrawalStatus.PENDING, WithdrawalStatus.PAID)));
        var second = service.create(user.getEmail(), request(75000));
        assertThrows(IllegalArgumentException.class, () -> service.review(admin.getEmail(), second.id(), new ReferralWithdrawalService.ReviewRequest(WithdrawalStatus.PAID, "", null)));
        var paid = new ReferralWithdrawalService.ReviewRequest(WithdrawalStatus.PAID, "BANK-TXN-001", null);
        service.review(admin.getEmail(), second.id(), paid);
        service.review(admin.getEmail(), second.id(), paid);
        assertEquals(75000, withdrawals.sumForUser(user.getId(), java.util.List.of(WithdrawalStatus.PAID)));
        assertThrows(IllegalArgumentException.class, () -> service.review(admin.getEmail(), second.id(), new ReferralWithdrawalService.ReviewRequest(WithdrawalStatus.REJECTED, null, "Đổi trạng thái")));
        assertThrows(IllegalArgumentException.class, () -> service.create(user.getEmail(), request(75000)));
        assertEquals(second.id(), service.create(user.getEmail(), new ReferralWithdrawalService.CreateRequest(75000L, "VCB", "00123456789", "TEST USER", withdrawals.findById(second.id()).orElseThrow().getRequestKey())).id());
    }

    @Test void concurrentRequestsCannotReserveTheSameBalanceTwice() throws Exception {
        User user = funded(100000);
        var executor = Executors.newFixedThreadPool(2); var start = new CountDownLatch(1);
        try {
            Callable<Boolean> action = () -> { start.await(); try { service.create(user.getEmail(), request(75000)); return true; } catch (IllegalArgumentException expected) { return false; } };
            var first = executor.submit(action); var second = executor.submit(action); start.countDown();
            assertNotEquals(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
            assertEquals(75000, withdrawals.sumForUser(user.getId(), java.util.List.of(WithdrawalStatus.PENDING)));
        } finally { executor.shutdownNow(); }
    }

    private ReferralWithdrawalService.CreateRequest request(long amount) {
        return new ReferralWithdrawalService.CreateRequest(amount, "VCB", "00123456789", "TEST USER", UUID.randomUUID().toString());
    }
    private User funded(int amount) {
        User user = new User(); user.setEmail(UUID.randomUUID() + "@test.invalid"); user.setFullName("Withdrawal test"); user.setPassword("unused"); users.saveAndFlush(user);
        if (amount > 0) {
            PaymentOrder order = new PaymentOrder(); order.setUser(user); order.setPackageLabel("Test"); order.setDays(7); order.setAmount(amount * 20); order.setPaymentCode("APTIS" + UUID.randomUUID().toString().replace("-", "")); order.setStatus(PaymentStatus.PAID); orders.saveAndFlush(order);
            ReferralCommission commission = new ReferralCommission(); commission.setPaymentOrder(order); commission.setReferrer(user); commission.setBaseAmount(amount * 20); commission.setRatePercent(5); commission.setAmount(amount); commissions.saveAndFlush(commission);
        }
        return user;
    }
}
