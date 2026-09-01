package com.example.aptis.repository;

import com.example.aptis.entity.Question;
import com.example.aptis.enums.SkillType;
import com.example.aptis.enums.TestMode;
import com.example.aptis.enums.TestStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
    @Query("""
            select q from Question q
            join q.test t
            join t.skill s
            where q.deletedAt is null
              and t.deletedAt is null
              and t.status = :status
              and t.mode = :mode
              and s.type = :skill
            order by q.sortOrder asc
            """)
    List<Question> findQuestionBank(@Param("skill") SkillType skill, @Param("mode") TestMode mode,
            @Param("status") TestStatus status);

    @EntityGraph(attributePaths = "answers")
    Optional<Question> findWithAnswersById(Long id);

    int countByTestIdAndDeletedAtIsNull(Long testId);
}
