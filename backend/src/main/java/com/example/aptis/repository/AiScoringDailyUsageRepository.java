package com.example.aptis.repository;

import com.example.aptis.entity.AiScoringDailyUsage;
import com.example.aptis.enums.AiScoringUsageType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface AiScoringDailyUsageRepository extends JpaRepository<AiScoringDailyUsage, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select usage from AiScoringDailyUsage usage
            where usage.user.id = :userId
              and usage.usageDate = :usageDate
              and usage.usageType = :usageType
            """)
    Optional<AiScoringDailyUsage> findForUpdate(
            @Param("userId") Long userId,
            @Param("usageDate") LocalDate usageDate,
            @Param("usageType") AiScoringUsageType usageType);
}
