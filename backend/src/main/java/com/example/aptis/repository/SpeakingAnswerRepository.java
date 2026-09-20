package com.example.aptis.repository;

import com.example.aptis.entity.SpeakingAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SpeakingAnswerRepository extends JpaRepository<SpeakingAnswer, Long> {
    Optional<SpeakingAnswer> findByAttemptIdAndPart(Long attemptId, String part);
}
