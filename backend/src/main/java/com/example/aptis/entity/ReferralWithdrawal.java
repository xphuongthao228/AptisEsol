package com.example.aptis.entity;

import com.example.aptis.enums.WithdrawalStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity @Getter @Setter
@Table(name = "referral_withdrawals", indexes = {
        @Index(name = "idx_withdrawal_user", columnList = "user_id"),
        @Index(name = "idx_withdrawal_status", columnList = "status")
}, uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "request_key"}))
public class ReferralWithdrawal extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(nullable = false) private Long amount;
    @Column(nullable = false, length = 100) private String bankName;
    @Column(nullable = false, length = 30) private String accountNumber;
    @Column(nullable = false, length = 120) private String accountHolder;
    @Column(name = "request_key", nullable = false, length = 36) private String requestKey;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private WithdrawalStatus status = WithdrawalStatus.PENDING;
    @Column(length = 160) private String transferReference;
    @Column(length = 500) private String adminNote;
    private LocalDateTime reviewedAt;
    @ManyToOne(fetch = FetchType.LAZY) private User reviewedBy;
}
