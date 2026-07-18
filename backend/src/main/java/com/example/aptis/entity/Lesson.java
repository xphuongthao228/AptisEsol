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
@Table(name = "lessons", indexes = {
        @Index(name = "idx_lessons_skill", columnList = "skill"),
        @Index(name = "idx_lessons_status", columnList = "status")
})
public class Lesson extends BaseEntity {
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TestStatus status = TestStatus.PUBLISHED;
}
