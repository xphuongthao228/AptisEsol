package com.example.aptis.repository;

import com.example.aptis.entity.Skill;
import com.example.aptis.enums.SkillType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SkillRepository extends JpaRepository<Skill, Long> {
    Optional<Skill> findByType(SkillType type);
}
