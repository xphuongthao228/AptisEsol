package com.example.aptis.repository;

import com.example.aptis.entity.SubmissionAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionAnswerRepository extends JpaRepository<SubmissionAnswer, Long> {
    void deleteByQuestionId(Long questionId);
}
