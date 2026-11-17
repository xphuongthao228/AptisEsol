package com.example.aptis.service;

import com.example.aptis.enums.RoleName;
import com.example.aptis.enums.TestStatus;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class PublicStatisticsService {
    private final EntityManager entityManager;

    public record Statistics(long practiceSets, long students, long completedTests, LocalDateTime contentUpdatedAt) {}

    @Transactional(readOnly = true)
    public Statistics get() {
        long sets = publishedCount("Test") + publishedCount("MockTest");
        long students = entityManager.createQuery("""
                select count(distinct u.id) from User u join u.roles r
                where u.deletedAt is null and r.name = :role
                """, Long.class).setParameter("role", RoleName.STUDENT).getSingleResult();
        long completed = completedCount("Submission") + completedCount("MockTestResult");
        LocalDateTime updated = Stream.of(latestUpdate("Test"), latestUpdate("MockTest"),
                        entityManager.createQuery("""
                                select max(q.updatedAt) from Question q
                                where q.deletedAt is null and q.test.deletedAt is null and q.test.status = :status
                                """, LocalDateTime.class).setParameter("status", TestStatus.PUBLISHED).getSingleResult())
                .filter(java.util.Objects::nonNull).max(LocalDateTime::compareTo).orElse(null);
        return new Statistics(sets, students, completed, updated);
    }

    private long publishedCount(String entity) {
        return entityManager.createQuery("select count(e) from " + entity
                        + " e where e.deletedAt is null and e.status = :status", Long.class)
                .setParameter("status", TestStatus.PUBLISHED).getSingleResult();
    }

    private long completedCount(String entity) {
        return entityManager.createQuery("select count(e) from " + entity
                + " e where e.deletedAt is null and e.user.deletedAt is null", Long.class).getSingleResult();
    }

    private LocalDateTime latestUpdate(String entity) {
        return entityManager.createQuery("select max(e.updatedAt) from " + entity
                        + " e where e.deletedAt is null and e.status = :status", LocalDateTime.class)
                .setParameter("status", TestStatus.PUBLISHED).getSingleResult();
    }
}
