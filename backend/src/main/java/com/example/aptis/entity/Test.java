package com.example.aptis.entity;

import com.example.aptis.enums.TestMode;
import com.example.aptis.enums.TestStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "tests", indexes = {
        @jakarta.persistence.Index(name = "idx_tests_skill_id", columnList = "skill_id"),
        @jakarta.persistence.Index(name = "idx_tests_status", columnList = "status"),
        @jakarta.persistence.Index(name = "idx_tests_mode", columnList = "mode")
})
public class Test extends BaseEntity {
    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private Integer durationMinutes = 30;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TestStatus status = TestStatus.PUBLISHED;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TestMode mode = TestMode.PRACTICE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;
}
