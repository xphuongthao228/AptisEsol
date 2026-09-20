package com.example.aptis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "mock_test_results", indexes = {
        @jakarta.persistence.Index(name = "idx_mock_result_user_id", columnList = "user_id"),
        @jakarta.persistence.Index(name = "idx_mock_result_mock_id", columnList = "mock_test_id")
})
public class MockTestResult extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "mock_test_id", nullable = false, length = 120)
    private String mockTestId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 40)
    private String skill;

    @Column(nullable = false)
    private Integer score;

    @Column(name = "max_score", nullable = false)
    private Integer maxScore;

    @Column(name = "cefr_level", length = 20)
    private String cefrLevel;

    @Lob
    @Column(name = "result_json", nullable = false, columnDefinition = "LONGTEXT")
    private String resultJson;
}
