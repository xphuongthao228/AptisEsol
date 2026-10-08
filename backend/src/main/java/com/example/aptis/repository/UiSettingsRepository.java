package com.example.aptis.repository;

import com.example.aptis.entity.UiSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UiSettingsRepository extends JpaRepository<UiSettings, Long> {
    Optional<UiSettings> findTopByOrderByIdAsc();
}
