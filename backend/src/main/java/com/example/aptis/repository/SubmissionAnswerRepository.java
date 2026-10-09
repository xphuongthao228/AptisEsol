package com.example.aptis.repository;

import com.example.aptis.entity.SubmissionAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface SubmissionAnswerRepository extends JpaRepository<SubmissionAnswer, Long> {
    @Transactional
    void deleteByQuestionId(Long questionId);
}
