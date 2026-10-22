package com.example.aptis.repository;

import com.example.aptis.entity.LeaderboardBonus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.time.LocalDate;
import java.util.List;

public interface LeaderboardBonusRepository extends JpaRepository<LeaderboardBonus, Long> {
    @EntityGraph(attributePaths = "user")
    List<LeaderboardBonus> findByPeriodStart(LocalDate periodStart);
}
