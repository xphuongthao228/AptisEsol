package com.example.aptis.entity;

import com.example.aptis.enums.PaymentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "payment_orders", indexes = {
        @jakarta.persistence.Index(name = "idx_payment_orders_code", columnList = "payment_code"),
        @jakarta.persistence.Index(name = "idx_payment_orders_user_id", columnList = "user_id"),
        @jakarta.persistence.Index(name = "idx_payment_orders_status", columnList = "status")
})
public class PaymentOrder extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "package_label", nullable = false, length = 80)
    private String packageLabel;

    @Column(nullable = false)
    private Integer days;

    @Column(nullable = false)
    private Integer amount;

    @Column(name = "payment_code", nullable = false, unique = true, length = 80)
    private String paymentCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "sepay_transaction_id", length = 80)
    private String sepayTransactionId;

    @Column(name = "sepay_reference_code", length = 120)
    private String sepayReferenceCode;

    @Column(name = "sepay_content", columnDefinition = "TEXT")
    private String sepayContent;
}
