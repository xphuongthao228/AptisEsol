package com.example.aptis.repository;

import com.example.aptis.entity.Submission;
import com.example.aptis.enums.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("""
            select u.id as userId,
                   u.fullName as fullName,
                   u.email as email,
                   count(sa.id) as score,
                   count(distinct s.id) as submissions,
                   max(s.createdAt) as latestSubmissionAt
            from User u
            join u.roles r
            left join Submission s on s.user = u
            left join SubmissionAnswer sa on sa.submission = s and sa.correct = true
            where u.deletedAt is null and r.name = :role
            group by u.id, u.fullName, u.email
            order by count(sa.id) desc, count(distinct s.id) asc, max(s.createdAt) asc, u.fullName asc
            """)
    List<LeaderboardProjection> leaderboard(@Param("role") RoleName role);

    interface LeaderboardProjection {
        Long getUserId();
        String getFullName();
        String getEmail();
        Long getScore();
        Long getSubmissions();
        LocalDateTime getLatestSubmissionAt();
    }
}
