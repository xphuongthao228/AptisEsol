package com.example.aptis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "progress", indexes = {
        @jakarta.persistence.Index(name = "idx_progress_user_id", columnList = "user_id"),
        @jakarta.persistence.Index(name = "idx_progress_skill_id", columnList = "skill_id")
})
public class Progress extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;

    @Column(nullable = false)
    private Integer completedTests = 0;

    @Column(nullable = false)
    private Integer bestScore = 0;
}
