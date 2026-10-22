package com.example.aptis.service;

import com.example.aptis.dto.PaymentDtos;
import com.example.aptis.entity.User;
import com.example.aptis.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=jdbc:h2:mem:payment-tests;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "logging.level.org.springframework=WARN",
        "app.payment.bank-id=TEST", "app.payment.account-no=000", "app.payment.account-name=Test",
        "app.payment.sepay-webhook-token=test-secret", "app.subscription.free-trial-days=0"
})
@Import({PaymentService.class, DiscountService.class, ReferralService.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PaymentConcurrencyTest {
    @Autowired PaymentService payments;
    @Autowired ReferralService referrals;

    @Test
    void referralCodeIsStableAndCannotBeUsedByOwner() {
        User owner = user();
        String code = referrals.mine(owner.getEmail()).code();
        assertEquals(code, referrals.mine(owner.getEmail()).code());
        assertThrows(IllegalArgumentException.class, () -> payments.quote(owner.getEmail(), 7, code));
        assertThrows(IllegalArgumentException.class, () -> payments.quote(user().getEmail(), 7, "REFUNKNOWN"));
    }

    @Test
    void referralRewardRequiresPaymentAndDuplicateCallbacksDoNotRewardTwice() throws Exception {
        User owner = user();
        User buyer = user();
        String code = referrals.mine(owner.getEmail()).code();
        var quote = payments.quote(buyer.getEmail(), 7, " " + code.toLowerCase() + " ");
        assertEquals(36000, quote.amount());
        var request = new PaymentDtos.CreateRenewalPaymentRequest("Test", "Week", 7, 36000, code);
        var order = payments.createRenewalPayment(buyer.getEmail(), request);
        assertEquals(order.id(), payments.createRenewalPayment(buyer.getEmail(), request).id());
        assertEquals(owner.getProExpiresAt(), users.findById(owner.getId()).orElseThrow().getProExpiresAt());
        var insufficient = new ObjectMapper().readValue("{\"code\":\"" + order.paymentCode()
            + "\",\"transferType\":\"in\",\"transferAmount\":35999}", PaymentDtos.SepayWebhookRequest.class);
        assertFalse(payments.handleSepayWebhook(insufficient, "Apikey test-secret", null, null).matched());
        assertNull(users.findById(buyer.getId()).orElseThrow().getReferredByUserId());
        var exact = new ObjectMapper().readValue("{\"code\":\"" + order.paymentCode()
            + "\",\"transferType\":\"in\",\"transferAmount\":36000}", PaymentDtos.SepayWebhookRequest.class);
        assertTrue(payments.handleSepayWebhook(exact, "Apikey test-secret", null, null).matched());
        assertTrue(payments.handleSepayWebhook(exact, "Apikey test-secret", null, null).matched());
        assertEquals(owner.getProExpiresAt().plusDays(3), users.findById(owner.getId()).orElseThrow().getProExpiresAt());
        assertEquals(buyer.getProExpiresAt().plusDays(7), users.findById(buyer.getId()).orElseThrow().getProExpiresAt());
        assertEquals(owner.getId(), users.findById(buyer.getId()).orElseThrow().getReferredByUserId());
        assertTrue(orders.findById(order.id()).orElseThrow().getReferralRewarded());
        assertThrows(IllegalArgumentException.class, () -> payments.quote(buyer.getEmail(), 7, code));
        assertThrows(IllegalArgumentException.class, () -> payments.createRenewalPayment(buyer.getEmail(), request));
    }

    @Test
    void concurrentReferralCallbacksRewardOnlyOnce() throws Exception {
        User owner = user();
        User buyer = user();
        var code = referrals.mine(owner.getEmail()).code();
        var order = payments.createRenewalPayment(buyer.getEmail(),
            new PaymentDtos.CreateRenewalPaymentRequest("Test", "Week", 7, 36000, code));
        concurrent(order.paymentCode(), order.paymentCode());
        assertEquals(owner.getProExpiresAt().plusDays(3), users.findById(owner.getId()).orElseThrow().getProExpiresAt());
    }

    @Autowired UserRepository users;
    @Autowired com.example.aptis.repository.DiscountCodeRepository discounts;
    @Autowired com.example.aptis.repository.PaymentOrderRepository orders;

    private com.example.aptis.entity.DiscountCode discount(String type, int value) {
        var code = new com.example.aptis.entity.DiscountCode();
        code.setCode("TEST" + UUID.randomUUID().toString().replace("-", "").substring(0,12).toUpperCase());
        code.setType(type); code.setValue(value); code.setActive(true);
        code.setStartsAt(java.time.Instant.now().minusSeconds(60));
        code.setEndsAt(java.time.Instant.now().plusSeconds(3600));
        return discounts.save(code);
    }

    @Test
    void discountedOrderUsesServerPriceForQrAndWebhook() throws Exception {
        var code = discount("PERCENT", 20);
        User user = user();
        var quote = new DiscountService(discounts).quote(30, " " + code.getCode().toLowerCase() + " ");
        assertEquals(112000, quote.amount());
        var order = payments.createRenewalPayment(user.getEmail(),
            new PaymentDtos.CreateRenewalPaymentRequest("Test", "1 Month", 30, quote.amount(), quote.discountCode()));
        assertEquals(112000, order.amount());
        assertTrue(order.qrUrl().contains("amount=112000"));
        var saved = orders.findById(order.id()).orElseThrow();
        assertEquals(140000, saved.getOriginalAmount());
        assertEquals(code.getCode(), saved.getDiscountCode());
        var callback = new ObjectMapper().readValue("{\"content\":\"" + order.paymentCode()
            + "\",\"transferType\":\"in\",\"transferAmount\":112000}", PaymentDtos.SepayWebhookRequest.class);
        assertTrue(payments.handleSepayWebhook(callback, "Apikey test-secret", null, null).matched());
        assertEquals(user.getProExpiresAt().plusDays(30), users.findById(user.getId()).orElseThrow().getProExpiresAt());
    }

    @Test
    void discountValidationAndFixedAmountFloor() {
        var service = new DiscountService(discounts);
        var code = discount("FIXED", 5000);
        assertEquals(35000, service.quote(7, code.getCode()).amount());
        code.setValue(100000); discounts.save(code);
        assertEquals(1000, service.quote(7, code.getCode()).amount());
        code.setActive(false); discounts.save(code);
        assertThrows(IllegalArgumentException.class, () -> service.quote(7, code.getCode()));
        code.setActive(true); code.setEndsAt(java.time.Instant.now().minusSeconds(1)); discounts.save(code);
        assertThrows(IllegalArgumentException.class, () -> service.quote(7, code.getCode()));
        code.setEndsAt(java.time.Instant.now().plusSeconds(600)); code.setStartsAt(java.time.Instant.now().plusSeconds(60)); discounts.save(code);
        assertThrows(IllegalArgumentException.class, () -> service.quote(7, code.getCode()));
        assertThrows(IllegalArgumentException.class, () -> service.quote(7, "UNKNOWN"));
    }

    @Test
    void discountIsRevalidatedAtCheckoutAndTamperedAmountRejected() {
        var code = discount("PERCENT", 20);
        User user = user();
        assertThrows(IllegalArgumentException.class, () -> payments.createRenewalPayment(user.getEmail(),
            new PaymentDtos.CreateRenewalPaymentRequest("Test", "Week", 7, 1, code.getCode())));
        code.setActive(false); discounts.save(code);
        assertThrows(IllegalArgumentException.class, () -> payments.createRenewalPayment(user.getEmail(),
            new PaymentDtos.CreateRenewalPaymentRequest("Test", "Week", 7, 32000, code.getCode())));
    }


    @Test
    void duplicateConcurrentCallbacksExtendOnlyOnce() throws Exception {
        User user = user();
        LocalDateTime before = user.getProExpiresAt();
        var order = payments.createRenewalPayment(user.getEmail(), request(7, 40000));
        concurrent(order.paymentCode(), order.paymentCode());
        assertEquals(before.plusDays(7), users.findById(user.getId()).orElseThrow().getProExpiresAt());
    }

    @Test
    void distinctConcurrentOrdersPreserveBothExtensions() throws Exception {
        User user = user();
        LocalDateTime before = user.getProExpiresAt();
        var first = payments.createRenewalPayment(user.getEmail(), request(7, 40000));
        var second = payments.createRenewalPayment(user.getEmail(), request(7, 40000));
        concurrent(first.paymentCode(), second.paymentCode());
        assertEquals(before.plusDays(14), users.findById(user.getId()).orElseThrow().getProExpiresAt());
    }

    @Test
    void apiKeyCallbackExtendsSubscriptionAndRecordsRevenueOnlyOnce() throws Exception {
        User user = user();
        var before = payments.revenueSummary();
        var order = payments.createRenewalPayment(user.getEmail(), request(7, 40000));
        var callback = webhook(order.paymentCode());
        assertTrue(payments.handleSepayWebhook(callback, "Apikey test-secret", null, null).matched());
        assertTrue(payments.handleSepayWebhook(callback, "Apikey test-secret", null, null).matched());
        assertEquals(user.getProExpiresAt().plusDays(7), users.findById(user.getId()).orElseThrow().getProExpiresAt());
        assertEquals(com.example.aptis.enums.PaymentStatus.PAID,
                payments.status(user.getEmail(), order.paymentCode()).status());
        assertEquals(before.totalRevenue() + 40000, payments.revenueSummary().totalRevenue());
        assertEquals(before.transactions() + 1, payments.revenueSummary().transactions());
    }

    @Test
    void bankSuffixDoesNotHideExistingPaymentCode() throws Exception {
        User user = user();
        var order = payments.createRenewalPayment(user.getEmail(), request(7, 40000));
        var callback = new ObjectMapper().readValue("{\"content\":\"" + order.paymentCode()
                + "MBVCB123456\",\"transferType\":\"in\",\"transferAmount\":40000}",
                PaymentDtos.SepayWebhookRequest.class);
        assertTrue(payments.handleSepayWebhook(callback, "Apikey test-secret", null, null).matched());
        assertEquals(user.getProExpiresAt().plusDays(7), users.findById(user.getId()).orElseThrow().getProExpiresAt());
    }

    @Test
    void tamperedPriceAndInvalidWebhookTokenAreRejected() throws Exception {
        User user = user();
        assertThrows(IllegalArgumentException.class,
                () -> payments.createRenewalPayment(user.getEmail(), request(60, 1)));
        var order = payments.createRenewalPayment(user.getEmail(), request(7, 40000));
        assertThrows(IllegalArgumentException.class,
                () -> payments.handleSepayWebhook(webhook(order.paymentCode()), "Apikey wrong", null, null));
        assertThrows(IllegalArgumentException.class,
                () -> payments.handleSepayWebhook(webhook(order.paymentCode()), null, "wrong", null));
        assertEquals(user.getProExpiresAt(), users.findById(user.getId()).orElseThrow().getProExpiresAt());
    }

    private void concurrent(String first, String second) throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        try {
            var a = executor.submit(() -> { start.await(); return payments.handleSepayWebhook(webhook(first), null, "test-secret", null); });
            var b = executor.submit(() -> { start.await(); return payments.handleSepayWebhook(webhook(second), null, "test-secret", null); });
            start.countDown();
            assertTrue(a.get(20, TimeUnit.SECONDS).matched());
            assertTrue(b.get(20, TimeUnit.SECONDS).matched());
        } finally {
            executor.shutdownNow();
        }
    }

    private User user() {
        User user = new User();
        user.setEmail(UUID.randomUUID() + "@test.invalid");
        user.setFullName("Payment test");
        user.setPassword("unused");
        user.setProExpiresAt(LocalDateTime.now().plusDays(2).withNano(0));
        return users.saveAndFlush(user);
    }

    private PaymentDtos.CreateRenewalPaymentRequest request(int days, int amount) {
        return new PaymentDtos.CreateRenewalPaymentRequest("Test", "Test", days, amount);
    }

    private PaymentDtos.SepayWebhookRequest webhook(String code) throws Exception {
        return new ObjectMapper().readValue("{\"code\":\"" + code
                + "\",\"transferType\":\"in\",\"transferAmount\":40000}", PaymentDtos.SepayWebhookRequest.class);
    }
}
