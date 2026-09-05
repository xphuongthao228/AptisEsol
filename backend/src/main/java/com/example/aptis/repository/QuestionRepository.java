package com.example.aptis.repository;

import com.example.aptis.entity.Question;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuestionRepository extends JpaRepository<Question, Long> {
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
