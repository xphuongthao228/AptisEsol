package com.example.aptis.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.example.aptis.enums.PaymentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDateTime;

public class PaymentDtos {
    public record CreateRenewalPaymentRequest(
            @NotBlank String fullName,
            @NotBlank String packageLabel,
            @NotNull @Positive Integer days,
            @NotNull @Positive Integer amount
    ) {}

    public record PaymentResponse(
            Long id,
            String userEmail,
            String fullName,
            String packageLabel,
            Integer days,
            Integer amount,
            String paymentCode,
            PaymentStatus status,
            String bankId,
            String accountNo,
            String accountName,
            String qrUrl,
            LocalDateTime createdAt,
            LocalDateTime paidAt
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SepayWebhookRequest(
            String id,
            String transactionId,
            String gateway,
            String transactionDate,
            String accountNumber,
            String code,
            String content,
            String description,
            String transferContent,
            String transactionContent,
            String addInfo,
            String remark,
            String transferType,
            String type,
            Integer transferAmount,
            Integer amount,
            Integer value,
            Integer money,
            Integer accumulated,
            String subAccount,
            String referenceCode
    ) {}

    public record SepayWebhookResponse(
            boolean received,
            boolean matched,
            String message,
            String paymentCode,
            Integer receivedAmount,
            PaymentResponse payment
    ) {}

    public record RevenueSummary(
            long totalRevenue,
            long thisMonthRevenue,
            long transactions,
            long customers
    ) {}

    public record SubscriptionResponse(
            boolean active,
            LocalDateTime expiresAt,
            long daysLeft
    ) {}
}
