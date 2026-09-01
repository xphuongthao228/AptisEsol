package com.example.aptis.repository;

import com.example.aptis.entity.Test;
import com.example.aptis.enums.TestMode;
import com.example.aptis.enums.TestStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TestRepository extends JpaRepository<Test, Long> {
    @EntityGraph(attributePaths = "skill")
    List<Test> findByDeletedAtIsNull();

    List<Test> findBySkillIdAndModeAndStatusAndDeletedAtIsNullOrderByIdAsc(Long skillId, TestMode mode,
            TestStatus status);
}
