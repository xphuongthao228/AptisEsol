package com.example.aptis.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "vocabulary_catalog")
@Getter
@Setter
public class VocabularyCatalog {
    @Id
    private Long id;
    @Version
    private Long revision;
    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String content;
}
