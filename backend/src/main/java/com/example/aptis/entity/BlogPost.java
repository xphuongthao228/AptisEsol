package com.example.aptis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "blog_posts")
public class BlogPost extends BaseEntity {
    @Column(nullable = false, length = 200)
    private String title;
    @Column(nullable = false, length = 600)
    private String summary;
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String content;
    @Column(length = 2000)
    private String coverUrl;
    @Column(nullable = false, length = 80)
    private String category;
    @Column(nullable = false)
    private boolean published;
}
