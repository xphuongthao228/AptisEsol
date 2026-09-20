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
@Table(name = "speaking_answer", indexes = {
        @jakarta.persistence.Index(name = "idx_speaking_answer_attempt_id", columnList = "attempt_id"),
        @jakarta.persistence.Index(name = "idx_speaking_answer_part", columnList = "part")
})
public class SpeakingAnswer extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private SpeakingAttempt attempt;

    @Column(nullable = false, length = 20)
    private String part;

    @Column(nullable = false, columnDefinition = "text")
    private String question;

    @Column(nullable = false, columnDefinition = "text")
    private String transcript;

    @Column(name = "part_score", nullable = false)
    private Integer partScore = 0;

    @Column(name = "grammar_score", nullable = false)
    private Integer grammarScore = 0;

    @Column(name = "vocabulary_score", nullable = false)
    private Integer vocabularyScore = 0;

    @Column(name = "fluency_score", nullable = false)
    private Integer fluencyScore = 0;

    @Column(name = "pronunciation_score", nullable = false)
    private Integer pronunciationScore = 0;

    @Column(name = "task_response_score", nullable = false)
    private Integer taskResponseScore = 0;

    @Column(name = "feedback", columnDefinition = "text")
    private String feedback;

    @Column(name = "mistakes_json", columnDefinition = "json")
    private String mistakesJson;

    @Column(name = "strengths_json", columnDefinition = "json")
    private String strengthsJson;

    @Column(name = "improvements_json", columnDefinition = "json")
    private String improvementsJson;
}
