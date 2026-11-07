package com.example.aptis.repository;

import com.example.aptis.entity.LearningCompletion;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LearningCompletionRepository extends JpaRepository<LearningCompletion, Long> {
    @EntityGraph(attributePaths = "question")
    List<LearningCompletion> findByUserIdAndDeletedAtIsNull(Long userId);
    boolean existsByUserIdAndQuestionIdAndUnitKey(Long userId, Long questionId, String unitKey);
    void deleteByQuestionId(Long questionId);
}
