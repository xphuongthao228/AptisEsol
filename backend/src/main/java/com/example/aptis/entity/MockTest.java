package com.example.aptis.entity;

import com.example.aptis.enums.TestStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "mock_tests", indexes = {
        @jakarta.persistence.Index(name = "idx_mock_tests_skill", columnList = "skill"),
        @jakarta.persistence.Index(name = "idx_mock_tests_status", columnList = "status")
})
public class MockTest extends BaseEntity {
    @Column(name = "external_id", length = 120)
    private String externalId;

    @Column(nullable = false, length = 40)
    private String skill;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(length = 120)
    private String questions;

    @Lob
    @Column(name = "question_data", columnDefinition = "LONGTEXT")
    private String questionData;

    @Column(length = 120)
    private String minutes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TestStatus status = TestStatus.PUBLISHED;

    @Column(nullable = false)
    private boolean featured = false;
}
