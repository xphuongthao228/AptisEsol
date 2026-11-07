package com.example.aptis.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "learning_materials")
public class LearningMaterial extends BaseEntity {
    @Column(nullable = false, length = 255)
    private String title;
    @Column(nullable = false, length = 80)
    private String category;
    @Column(length = 1000)
    private String description;
    @Column(length = 2000)
    private String coverUrl;
    @Column(length = 2000)
    private String resourceUrl;
    @Column(columnDefinition = "LONGTEXT")
    private String content;
    @Column(unique = true)
    private Long sourceBlogId;
    @Column(nullable = false)
    private boolean visible = true;
    @Column(nullable = false)
    private int sortOrder;
}
