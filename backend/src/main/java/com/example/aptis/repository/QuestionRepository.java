package com.example.aptis.repository;

import com.example.aptis.entity.Question;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    @org.springframework.data.jpa.repository.Query("""
            select q from Question q join fetch q.test t join fetch t.skill
            where q.deletedAt is null and t.deletedAt is null
              and t.status = com.example.aptis.enums.TestStatus.PUBLISHED
              and t.mode = com.example.aptis.enums.TestMode.PRACTICE
            """)
    List<Question> findRoadmapQuestions();
    @Override
    @EntityGraph(attributePaths = "answers")
    List<Question> findAll();

    @EntityGraph(attributePaths = "answers")
    List<Question> findByDeletedAtIsNullOrderBySortOrderAsc();

    @EntityGraph(attributePaths = "answers")
    List<Question> findByTestIdAndDeletedAtIsNullOrderBySortOrderAsc(Long testId);

    @EntityGraph(attributePaths = "answers")
    Optional<Question> findWithAnswersById(Long id);

    int countByTestIdAndDeletedAtIsNull(Long testId);
}
