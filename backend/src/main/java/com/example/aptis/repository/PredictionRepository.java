package com.example.aptis.repository;

import com.example.aptis.entity.Prediction;
import com.example.aptis.enums.SkillType;
import com.example.aptis.enums.TestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PredictionRepository extends JpaRepository<Prediction, Long> {
    List<Prediction> findByDeletedAtIsNullOrderByPriorityAscUpdatedAtDesc();
    List<Prediction> findBySkillAndDeletedAtIsNullOrderByPriorityAscUpdatedAtDesc(SkillType skill);
    List<Prediction> findByStatusAndDeletedAtIsNullOrderByPriorityAscUpdatedAtDesc(TestStatus status);
    List<Prediction> findBySkillAndStatusAndDeletedAtIsNullOrderByPriorityAscUpdatedAtDesc(SkillType skill, TestStatus status);
}
