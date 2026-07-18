package com.example.aptis.repository;

import com.example.aptis.entity.Lesson;
import com.example.aptis.enums.SkillType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
    List<Lesson> findByDeletedAtIsNullOrderByUpdatedAtDesc();
    List<Lesson> findBySkillAndDeletedAtIsNullOrderByUpdatedAtDesc(SkillType skill);
}
