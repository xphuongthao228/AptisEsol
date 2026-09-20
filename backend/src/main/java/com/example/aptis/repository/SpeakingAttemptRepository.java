package com.example.aptis.repository;

import com.example.aptis.entity.SpeakingAttempt;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SpeakingAttemptRepository extends JpaRepository<SpeakingAttempt, Long> {
    @EntityGraph(attributePaths = {"answers", "student", "test"})
    List<SpeakingAttempt> findByStudentIdAndTestIdOrderByCreatedAtDesc(Long studentId, Long testId);

    @EntityGraph(attributePaths = {"answers", "student", "test"})
    @Query("select a from SpeakingAttempt a where a.id = :id")
    Optional<SpeakingAttempt> findWithAnswersById(Long id);
}
