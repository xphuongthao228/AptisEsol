package com.example.aptis.service;

import com.example.aptis.dto.PaymentDtos;
import com.example.aptis.entity.PaymentOrder;
import com.example.aptis.entity.User;
import com.example.aptis.enums.PaymentStatus;
import com.example.aptis.exception.ResourceNotFoundException;
import com.example.aptis.repository.PaymentOrderRepository;
import com.example.aptis.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private static final Pattern PAYMENT_CODE_PATTERN = Pattern.compile("APTIS[A-Z0-9]{7,32}");

    private final PaymentOrderRepository paymentOrders;
    private final UserRepository users;

    @Value("${app.payment.bank-id}")
    private String bankId;

    @Value("${app.payment.account-no}")
    private String accountNo;

    @Value("${app.payment.account-name}")
    private String accountName;

    @Value("${app.payment.sepay-webhook-token:}")
    private String sepayWebhookToken;

    @Value("${app.subscription.free-trial-days:2}")
    private int freeTrialDays;

    @Transactional
    public PaymentDtos.PaymentResponse createRenewalPayment(String email, PaymentDtos.CreateRenewalPaymentRequest request) {
        User user = users.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        PaymentOrder order = new PaymentOrder();
        order.setUser(user);
        order.setPackageLabel(request.packageLabel());
        order.setDays(request.days());
        order.setAmount(request.amount());
        order.setPaymentCode(generatePaymentCode(user));
        order.setStatus(PaymentStatus.PENDING);
        return response(paymentOrders.save(order));
    }

    @Transactional(readOnly = true)
    public PaymentDtos.PaymentResponse status(String email, String paymentCode) {
        PaymentOrder order = paymentOrders.findByPaymentCode(paymentCode)
                .orElseThrow(() -> new ResourceNotFoundException("Payment order not found"));
        if (!order.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new IllegalArgumentException("Payment order does not belong to this user");
        }
        return response(order);
    }

    @Transactional(readOnly = true)
    public List<PaymentDtos.PaymentResponse> myPayments(String email) {
        return paymentOrders.findByUserEmailOrderByCreatedAtDesc(email).stream().map(this::response).toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentDtos.PaymentResponse> paidPayments() {
        return paymentOrders.findByStatusOrderByCreatedAtDesc(PaymentStatus.PAID).stream().map(this::response).toList();
    }

    @Transactional(readOnly = true)
    public PaymentDtos.RevenueSummary revenueSummary() {
        List<PaymentOrder> paid = paymentOrders.findByStatusOrderByCreatedAtDesc(PaymentStatus.PAID);
        LocalDateTime now = LocalDateTime.now();
        long total = paid.stream().mapToLong(PaymentOrder::getAmount).sum();
        long month = paid.stream()
                .filter(order -> order.getPaidAt() != null)
                .filter(order -> order.getPaidAt().getMonth() == now.getMonth() && order.getPaidAt().getYear() == now.getYear())
                .mapToLong(PaymentOrder::getAmount)
                .sum();
        Set<String> customers = paid.stream().map(order -> order.getUser().getEmail()).collect(Collectors.toSet());
        return new PaymentDtos.RevenueSummary(total, month, paid.size(), customers.size());
    }

    @Transactional(readOnly = true)
    public PaymentDtos.SubscriptionResponse subscription(String email) {
        User user = users.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        LocalDateTime expiresAt = effectiveAccessExpiresAt(user);
        boolean active = expiresAt != null && expiresAt.isAfter(LocalDateTime.now());
        long daysLeft = active ? java.time.temporal.ChronoUnit.DAYS.between(LocalDateTime.now(), expiresAt) + 1 : 0;
        return new PaymentDtos.SubscriptionResponse(active, expiresAt, daysLeft);
    }

    @Transactional(readOnly = true)
    public boolean hasActiveAccess(String email) {
        return users.findByEmailAndDeletedAtIsNull(email)
                .map(user -> {
                    LocalDateTime expiresAt = effectiveAccessExpiresAt(user);
                    return expiresAt != null && expiresAt.isAfter(LocalDateTime.now());
                })
                .orElse(false);
    }

    @Transactional
    public PaymentDtos.SepayWebhookResponse handleSepayWebhook(PaymentDtos.SepayWebhookRequest request, String authorizationHeader, String sepayTokenHeader, String webhookTokenHeader) {
        validateWebhookToken(authorizationHeader, sepayTokenHeader, webhookTokenHeader);
        if (!isIncomingMoney(firstText(request.transferType(), request.type()))) {
            return webhookResponse(false, "Ignored non incoming transaction", null, null, null);
        }

        String text = concatTexts(
                request.content(),
                request.description(),
                request.transferContent(),
                request.transactionContent(),
                request.addInfo(),
                request.remark(),
                request.code(),
                request.referenceCode()
        );
        String paymentCode = resolvePaymentCode(request, text);
        if (paymentCode == null) {
            return webhookResponse(false, "Webhook received but no Aptis payment code matched", null,
                    firstPositive(request.transferAmount(), request.amount(), request.value(), request.money()), null);
        }

        PaymentOrder order = paymentOrders.findByPaymentCode(paymentCode).orElse(null);
        if (order == null) {
            return webhookResponse(false, "Webhook received but payment order was not found", paymentCode,
                    firstPositive(request.transferAmount(), request.amount(), request.value(), request.money()), null);
        }

        if (order.getStatus() == PaymentStatus.PAID) {
            return webhookResponse(true, "Payment order was already paid", paymentCode,
                    firstPositive(request.transferAmount(), request.amount(), request.value(), request.money()), response(order));
        }

        Integer receivedAmount = firstPositive(request.transferAmount(), request.amount(), request.value(), request.money());
        if (receivedAmount == null || receivedAmount < order.getAmount()) {
            return webhookResponse(false, "Webhook received but transfer amount is not enough", paymentCode, receivedAmount, null);
        }

        order.setStatus(PaymentStatus.PAID);
        order.setPaidAt(LocalDateTime.now());
        order.setSepayTransactionId(firstText(request.id(), request.transactionId(), request.referenceCode()));
        order.setSepayReferenceCode(firstText(request.referenceCode(), request.code()));
        order.setSepayContent(text);
        extendUserSubscription(order.getUser(), order.getDays());
        return webhookResponse(true, "Payment confirmed and subscription extended", paymentCode, receivedAmount,
                response(paymentOrders.save(order)));
    }

    private void extendUserSubscription(User user, int days) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime activeAccess = effectiveAccessExpiresAt(user);
        LocalDateTime base = activeAccess != null && activeAccess.isAfter(now) ? activeAccess : now;
        user.setProExpiresAt(base.plusDays(days));
        users.save(user);
    }

    private LocalDateTime effectiveAccessExpiresAt(User user) {
        LocalDateTime trialExpiresAt = user.getCreatedAt() == null ? null : user.getCreatedAt().plusDays(freeTrialDays);
        LocalDateTime proExpiresAt = user.getProExpiresAt();

        if (trialExpiresAt == null) return proExpiresAt;
        if (proExpiresAt == null) return trialExpiresAt;
        return proExpiresAt.isAfter(trialExpiresAt) ? proExpiresAt : trialExpiresAt;
    }

    private String resolvePaymentCode(PaymentDtos.SepayWebhookRequest request, String text) {
        String directCode = firstText(request.code(), request.addInfo());
        if (directCode != null && paymentOrders.findByPaymentCode(directCode.toUpperCase(Locale.ROOT)).isPresent()) {
            return directCode.toUpperCase(Locale.ROOT);
        }

        Matcher matcher = PAYMENT_CODE_PATTERN.matcher(text);
        if (matcher.find()) {
            return matcher.group();
        }

        String normalizedText = normalizePaymentText(text);
        return paymentOrders.findByStatusOrderByCreatedAtDesc(PaymentStatus.PENDING).stream()
                .map(PaymentOrder::getPaymentCode)
                .filter(code -> !normalizePaymentText(code).isBlank())
                .filter(code -> normalizedText.contains(normalizePaymentText(code)))
                .findFirst()
                .orElse(null);
    }

    private String normalizePaymentText(String value) {
        if (value == null) return "";
        return value.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }

    private PaymentDtos.SepayWebhookResponse webhookResponse(boolean matched, String message, String paymentCode,
                                                            Integer receivedAmount, PaymentDtos.PaymentResponse payment) {
        return new PaymentDtos.SepayWebhookResponse(true, matched, message, paymentCode, receivedAmount, payment);
    }

    private void validateWebhookToken(String authorizationHeader, String sepayTokenHeader, String webhookTokenHeader) {
        String expectedToken = sepayWebhookToken == null ? "" : sepayWebhookToken.trim();
        if (expectedToken.isBlank() || expectedToken.equalsIgnoreCase("dev-sepay-token-change-me")) {
            return;
        }

        String bearer = authorizationHeader == null ? "" : authorizationHeader.trim();
        String rawToken = sepayTokenHeader == null ? "" : sepayTokenHeader.trim();
        String webhookToken = webhookTokenHeader == null ? "" : webhookTokenHeader.trim();
        if (!bearer.equals("Bearer " + expectedToken) && !rawToken.equals(expectedToken) && !webhookToken.equals(expectedToken)) {
            throw new IllegalArgumentException("Invalid SePay webhook token");
        }
    }

    private String concatTexts(String... values) {
        StringBuilder builder = new StringBuilder();
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                builder.append(' ').append(value.trim());
            }
        }
        return builder.toString().toUpperCase(Locale.ROOT);
    }

    private String firstText(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private Integer firstPositive(Integer... values) {
        for (Integer value : values) {
            if (value != null && value > 0) {
                return value;
            }
        }
        return null;
    }

    private boolean isIncomingMoney(String transferType) {
        if (transferType == null || transferType.isBlank()) return true;
        String value = transferType.toLowerCase(Locale.ROOT);
        return value.contains("in") || value.contains("vao") || value.contains("credit");
    }

    private String generatePaymentCode(User user) {
        String userCode = String.valueOf(user.getId() == null ? Math.abs(user.getEmail().hashCode()) : user.getId());
        return ("APTIS" + userCode + UUID.randomUUID().toString().replace("-", "").substring(0, 6)).toUpperCase(Locale.ROOT);
    }

    private PaymentDtos.PaymentResponse response(PaymentOrder order) {
        String qrUrl = UriComponentsBuilder
                .fromUriString("https://img.vietqr.io/image/{bank}-{account}-qr_only.png")
                .queryParam("amount", order.getAmount())
                .queryParam("addInfo", order.getPaymentCode())
                .queryParam("accountName", accountName)
                .buildAndExpand(bankId, accountNo)
                .toUriString();
        return new PaymentDtos.PaymentResponse(
                order.getId(),
                order.getUser().getEmail(),
                order.getUser().getFullName(),
                order.getPackageLabel(),
                order.getDays(),
                order.getAmount(),
                order.getPaymentCode(),
                order.getStatus(),
                bankId,
                accountNo,
                accountName,
                qrUrl,
                order.getCreatedAt(),
                order.getPaidAt()
        );
    }
}
