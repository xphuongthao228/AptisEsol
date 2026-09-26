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

    @Query("""
            select usage from AiScoringDailyUsage usage
            join fetch usage.user user
            where user.deletedAt is null
              and (:keyword is null
                or lower(user.email) like lower(concat('%', :keyword, '%'))
                or lower(user.fullName) like lower(concat('%', :keyword, '%')))
              and (:usageType is null or usage.usageType = :usageType)
              and (:fromDate is null or usage.usageDate >= :fromDate)
              and (:toDate is null or usage.usageDate <= :toDate)
            order by usage.usageDate desc, usage.updatedAt desc, usage.id desc
            """)
    java.util.List<AiScoringDailyUsage> searchForAdmin(
            @Param("keyword") String keyword,
            @Param("usageType") AiScoringUsageType usageType,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);
}
