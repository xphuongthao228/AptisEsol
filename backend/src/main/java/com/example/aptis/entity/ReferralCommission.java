package com.example.aptis.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "referral_commissions", indexes = @Index(name = "idx_referral_commission_referrer", columnList = "referrer_id"))
public class ReferralCommission extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_order_id", nullable = false, unique = true)
    private PaymentOrder paymentOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referrer_id", nullable = false)
    private User referrer;

    @Column(nullable = false)
    private Integer baseAmount;

    @Column(nullable = false)
    private Integer ratePercent;

    @Column(nullable = false)
    private Integer amount;
}
