package com.example.aptis.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "learning_completions", indexes = @Index(name = "idx_learning_completion_user", columnList = "user_id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "question_id", "unit_key"}))
public class LearningCompletion extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private Question question;

    @Column(name = "unit_key", nullable = false, length = 80)
    private String unitKey;
}
