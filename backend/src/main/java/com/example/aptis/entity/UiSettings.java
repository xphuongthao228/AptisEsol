package com.example.aptis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "ui_settings")
public class UiSettings extends BaseEntity {
    @Column(name = "student_theme", nullable = false, length = 16)
    private String studentTheme = "dark";

    @Column(name = "student_skin", nullable = false, length = 32)
    private String studentSkin = "default";
}
