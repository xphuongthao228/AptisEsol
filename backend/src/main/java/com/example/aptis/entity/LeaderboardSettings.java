package com.example.aptis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "leaderboard_settings")
public class LeaderboardSettings extends BaseEntity {
    @Column(name = "exam_date")
    private LocalDate examDate;
}
