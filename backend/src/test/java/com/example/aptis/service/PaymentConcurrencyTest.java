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
@Import(PaymentService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PaymentConcurrencyTest {
    @Autowired PaymentService payments;
    @Autowired UserRepository users;

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
