package com.example.aptis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "practice_scores", indexes = {
        @Index(name = "idx_practice_scores_user_id", columnList = "user_id"),
        @Index(name = "idx_practice_scores_question_id", columnList = "question_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_practice_scores_user_question", columnNames = { "user_id", "question_id" })
})
public class PracticeScore extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false)
    private boolean correct;

    @Column(nullable = false)
    private Integer score = 0;
}
