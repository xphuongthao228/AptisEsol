package com.example.aptis.entity;

import com.example.aptis.enums.AiScoringUsageType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "ai_scoring_daily_usage",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_ai_scoring_daily_usage_user_day_type",
                columnNames = {"user_id", "usage_date", "usage_type"}))
public class AiScoringDailyUsage extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "usage_date", nullable = false)
    private LocalDate usageDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "usage_type", nullable = false, length = 40)
    private AiScoringUsageType usageType;

    @Column(name = "usage_count", nullable = false)
    private int usageCount;
}
