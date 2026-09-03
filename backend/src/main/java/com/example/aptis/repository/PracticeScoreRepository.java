package com.example.aptis.repository;

import com.example.aptis.entity.PracticeScore;
import com.example.aptis.enums.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PracticeScoreRepository extends JpaRepository<PracticeScore, Long> {
    Optional<PracticeScore> findByUserIdAndQuestionId(Long userId, Long questionId);

    void deleteByQuestionId(Long questionId);

    @Query("""
            select ps.user.id as userId,
                   ps.user.fullName as fullName,
                   ps.user.email as email,
                   coalesce(sum(ps.score), 0) as score,
                   count(ps.id) as submissions,
                   max(ps.updatedAt) as latestSubmissionAt
            from PracticeScore ps
            join ps.user.roles r
            where ps.user.deletedAt is null and r.name = :role
            group by ps.user.id
            """)
    List<PracticeScoreProjection> leaderboard(@Param("role") RoleName role);

    @Query("""
            select ps.user.id as userId,
                   ps.user.fullName as fullName,
                   ps.user.email as email,
                   coalesce(sum(ps.score), 0) as score,
                   count(ps.id) as submissions,
                   max(ps.updatedAt) as latestSubmissionAt
            from PracticeScore ps
            join ps.user.roles r
            where ps.user.deletedAt is null
              and r.name = :role
              and ps.updatedAt >= :startAt
              and ps.updatedAt < :endAt
            group by ps.user.id, ps.user.fullName, ps.user.email
            """)
    List<PracticeScoreProjection> leaderboardBetween(
            @Param("role") RoleName role,
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt);

    interface PracticeScoreProjection {
        Long getUserId();
        String getFullName();
        String getEmail();
        Long getScore();
        Long getSubmissions();
        LocalDateTime getLatestSubmissionAt();
    }
}
