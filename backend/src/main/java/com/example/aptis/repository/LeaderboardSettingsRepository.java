package com.example.aptis.repository;

import com.example.aptis.entity.LeaderboardSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LeaderboardSettingsRepository extends JpaRepository<LeaderboardSettings, Long> {
    Optional<LeaderboardSettings> findTopByOrderByIdAsc();
}
