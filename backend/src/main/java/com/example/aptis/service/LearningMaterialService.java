package com.example.aptis.service;

import com.example.aptis.entity.LearningMaterial;
import com.example.aptis.enums.LessonResourceType;
import com.example.aptis.enums.TestStatus;
import com.example.aptis.exception.ResourceNotFoundException;
import com.example.aptis.repository.LearningMaterialRepository;
import com.example.aptis.repository.LessonRepository;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@org.springframework.core.annotation.Order(0)
@RequiredArgsConstructor
public class LearningMaterialService implements ApplicationRunner {
    private final LearningMaterialRepository materials;
    private final LessonRepository lessons;

    public record Request(@NotBlank @Size(max = 255) String title,
                          @NotBlank @Size(max = 80) String category, @Size(max = 1000) String description,
                          @Size(max = 2000) String coverUrl, @Size(max = 2000) String resourceUrl,
                          boolean visible, @Min(0) int sortOrder, @Size(max = 100000) String content) {
        public Request(String title, String category, String description, String coverUrl, String resourceUrl, boolean visible, int sortOrder) {
            this(title, category, description, coverUrl, resourceUrl, visible, sortOrder, null);
        }
    }

    public List<LearningMaterial> list(boolean admin) {
        return materials.findByDeletedAtIsNullOrderBySortOrderAscIdAsc().stream()
                .filter(item -> admin || item.isVisible()).toList();
    }

    @Transactional
    public LearningMaterial save(Long id, Request request) {
        validateUrl(request.coverUrl());
        validateUrl(request.resourceUrl());
        LearningMaterial item = id == null ? new LearningMaterial() : find(id);
        item.setTitle(request.title().trim());
        item.setCategory(request.category().trim());
        if (request.content() != null) item.setContent(clean(request.content()));
        item.setDescription(request.description());
        item.setCoverUrl(clean(request.coverUrl()));
        item.setResourceUrl(clean(request.resourceUrl()));
        item.setVisible(request.visible());
        item.setSortOrder(request.sortOrder());
        return materials.save(item);
    }

    private String clean(String url) { return url == null || url.isBlank() ? null : url.trim(); }

    private boolean validLegacyUrl(String url) {
        if (clean(url) == null || clean(url).length() > 2000) return false;
        try {
            validateUrl(url);
            return true;
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }

    private void validateUrl(String url) {
        if (clean(url) == null) return;
        String value = clean(url);
        if (value.contains("\\") || value.chars().anyMatch(Character::isISOControl))
            throw new IllegalArgumentException("Liên kết không hợp lệ");
        try {
            java.net.URI uri = java.net.URI.create(value);
            if (value.startsWith("/") && !value.startsWith("//")) return;
            if (("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme())) && uri.getHost() != null) return;
        } catch (IllegalArgumentException ignored) { }
        throw new IllegalArgumentException("Liên kết phải bắt đầu bằng http://, https:// hoặc /");
    }

    private LearningMaterial find(Long id) {
        return materials.findById(id).filter(item -> item.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài liệu"));
    }

    public LearningMaterial detail(Long id) {
        LearningMaterial item = find(id);
        if (!item.isVisible()) throw new ResourceNotFoundException("Không tìm thấy tài liệu");
        return item;
    }

    public LearningMaterial fromBlog(Long id) {
        LearningMaterial item = materials.findBySourceBlogId(id)
                .filter(value -> value.getDeletedAt() == null && value.isVisible())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài liệu"));
        return item;
    }

    @Transactional
    public void delete(Long id) {
        LearningMaterial item = find(id);
        item.setDeletedAt(LocalDateTime.now());
        materials.save(item);
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Soft-deleted rows also count, so deleted defaults never reappear on restart.
        if (materials.count() != 0) return;
        String[] categories = {"Grammar", "Vocabulary", "Reading", "Listening", "Writing", "Speaking"};
        String[] descriptions = {"Tổng hợp ngữ pháp trọng tâm cho bài thi Aptis.", "Từ vựng theo chủ đề thường gặp trong Aptis.",
                "Hướng dẫn cách làm từng dạng bài Reading.", "Hướng dẫn luyện nghe và các dạng bài thi.",
                "Hướng dẫn viết và cách triển khai câu trả lời.", "Hướng dẫn trả lời các phần thi Speaking."};
        var existing = lessons.findByDeletedAtIsNullOrderByUpdatedAtDesc();
        for (int i = 0; i < categories.length; i++) {
            String category = categories[i];
            String skill = category.equals("Vocabulary") ? "GRAMMAR" : category.toUpperCase(java.util.Locale.ROOT);
            String url = existing.stream().filter(lesson -> lesson.getStatus() == TestStatus.PUBLISHED
                    && lesson.getResourceType() == LessonResourceType.DOCUMENT && lesson.getSkill().name().equals(skill)
                    && (!skill.equals("GRAMMAR") || (category.equals("Vocabulary") == lesson.getTitle().toLowerCase(java.util.Locale.ROOT).matches(".*(vocab|từ vựng).*"))))
                    .map(lesson -> lesson.getResourceUrl()).filter(this::validLegacyUrl).findFirst().orElse(null);
            if (url == null && i >= 2) url = "/docs/aptislingo-huong-dan-" + category.toLowerCase(java.util.Locale.ROOT) + ".docx";
            save(null, new Request("Tài liệu " + category, category, descriptions[i], null, url, true, i));
        }
    }
}
