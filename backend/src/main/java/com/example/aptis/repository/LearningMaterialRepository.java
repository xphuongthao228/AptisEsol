package com.example.aptis.repository;

import com.example.aptis.entity.LearningMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LearningMaterialRepository extends JpaRepository<LearningMaterial, Long> {
    boolean existsBySourceBlogId(Long sourceBlogId);
    java.util.Optional<LearningMaterial> findBySourceBlogId(Long sourceBlogId);
    List<LearningMaterial> findByDeletedAtIsNullOrderBySortOrderAscIdAsc();
}
