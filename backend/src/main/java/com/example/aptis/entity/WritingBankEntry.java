package com.example.aptis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "writing_bank_entries", indexes = {
        @Index(name = "idx_writing_bank_type", columnList = "bank_type"),
        @Index(name = "idx_writing_bank_type_part", columnList = "bank_type, part")
})
public class WritingBankEntry extends BaseEntity {
    @Column(name = "bank_type", nullable = false, length = 32)
    private String bankType;

    @Column(name = "prompt_id", nullable = false, length = 128)
    private String promptId;

    @Column(nullable = false, length = 64)
    private String part;

    @Column(nullable = false, length = 255)
    private String topic;

    @Column(length = 255)
    private String form;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String question;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String vi;

    @Column(name = "target_words", length = 64)
    private String targetWords;

    @Column(nullable = false, length = 32)
    private String section;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String text;

    @Lob
    @Column(name = "text_vi", columnDefinition = "LONGTEXT")
    private String textVi;

    @Column(length = 16)
    private String level;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String tag;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
