package com.example.aptis.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "speaking_attempt", indexes = {
        @jakarta.persistence.Index(name = "idx_speaking_attempt_student_id", columnList = "student_id"),
        @jakarta.persistence.Index(name = "idx_speaking_attempt_test_id", columnList = "test_id")
})
public class SpeakingAttempt extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id", nullable = false)
    private Test test;

    @Column(name = "overall_score", precision = 5, scale = 2)
    private BigDecimal overallScore = BigDecimal.ZERO;

    @Column(name = "cefr_level", length = 10)
    private String cefrLevel = "A1";

    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SpeakingAnswer> answers = new ArrayList<>();
}
