package com.example.aptis.entity;

import com.example.aptis.enums.NotificationAudience;
import com.example.aptis.enums.NotificationLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(
        name = "notifications",
        indexes = {
                @Index(name = "idx_notifications_audience_active", columnList = "audience, active"),
                @Index(name = "idx_notifications_pinned_created_at", columnList = "pinned, created_at"),
                @Index(name = "idx_notifications_created_at", columnList = "created_at")
        }
)
public class Notification extends BaseEntity {
    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationAudience audience = NotificationAudience.ALL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationLevel level = NotificationLevel.INFO;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private boolean pinned = false;
}
