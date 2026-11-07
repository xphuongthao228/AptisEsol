package com.example.aptis.service;

import com.example.aptis.entity.LearningMaterial;
import com.example.aptis.repository.BlogPostRepository;
import com.example.aptis.repository.LearningMaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(org.springframework.core.Ordered.LOWEST_PRECEDENCE)
@RequiredArgsConstructor
public class BlogMaterialMigration implements ApplicationRunner {
    private final BlogPostRepository blogs;
    private final LearningMaterialRepository materials;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int order = materials.findByDeletedAtIsNullOrderBySortOrderAscIdAsc().stream()
                .mapToInt(LearningMaterial::getSortOrder).max().orElse(-1) + 1;
        for (var post : blogs.findByDeletedAtIsNullOrderByUpdatedAtDescIdDesc()) {
            if (materials.existsBySourceBlogId(post.getId())) continue;
            var item = new LearningMaterial();
            item.setSourceBlogId(post.getId());
            item.setTitle(post.getTitle());
            item.setCategory(post.getCategory());
            item.setDescription(post.getSummary());
            item.setContent(post.getContent());
            item.setCoverUrl(post.getCoverUrl());
            item.setVisible(post.isPublished());
            item.setSortOrder(order++);
            materials.save(item);
        }
    }
}
