package com.example.aptis.entity;

import com.example.aptis.enums.QuestionType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "questions", indexes = @jakarta.persistence.Index(name = "idx_questions_test_id", columnList = "test_id"))
public class Question extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_id", nullable = false)
    private Test test;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private QuestionType type = QuestionType.SINGLE_CHOICE;

    @Column(nullable = false, columnDefinition = "longtext")
    private String content;

    @Column(length = 255)
    private String topic;

    @Column(name = "audio_url", columnDefinition = "text")
    private String audioUrl;

    @Column(name = "script_text", columnDefinition = "text")
    private String scriptText;

    @Column(columnDefinition = "text")
    private String explanation;

    @Column(nullable = false)
    private Integer points = 1;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 1;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<Answer> answers = new ArrayList<>();
}
