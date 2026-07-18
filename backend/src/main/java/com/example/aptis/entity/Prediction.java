package com.example.aptis.entity;

import com.example.aptis.enums.SkillType;
import com.example.aptis.enums.TestStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "predictions", indexes = {
        @Index(name = "idx_predictions_skill", columnList = "skill"),
        @Index(name = "idx_predictions_status", columnList = "status"),
        @Index(name = "idx_predictions_priority", columnList = "priority")
})
public class Prediction extends BaseEntity {
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SkillType skill;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 1000)
    private String summary;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(length = 500)
    private String tags;

    @Column(nullable = false)
    private Integer priority = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TestStatus status = TestStatus.PUBLISHED;
}
