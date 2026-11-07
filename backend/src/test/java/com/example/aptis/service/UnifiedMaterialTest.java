package com.example.aptis.service;

import com.example.aptis.entity.*;
import com.example.aptis.repository.*;
import com.example.aptis.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UnifiedMaterialTest {
    final LearningMaterialRepository materials = mock(LearningMaterialRepository.class);
    final LearningMaterialService service = new LearningMaterialService(materials, mock(LessonRepository.class));
    @Test void articleAndAttachmentAreSavedTogetherAndHiddenDetailIsProtected() {
        when(materials.save(any())).thenAnswer(call -> call.getArgument(0));
        var item = service.save(null, new LearningMaterialService.Request("Guide", "Phương pháp học", "Summary", null, "/docs/guide.pdf", true, 0, "Article content"));
        assertEquals("Article content", item.getContent()); assertEquals("/docs/guide.pdf", item.getResourceUrl());
        when(materials.findById(1L)).thenReturn(Optional.of(item));
        assertSame(item, service.detail(1L));
        item.setVisible(false);
        assertThrows(ResourceNotFoundException.class, () -> service.detail(1L));
    }
    @Test void migrationPreservesDraftsAndDoesNotDuplicateOrRestoreDeletedImports() {
        var blogs = mock(BlogPostRepository.class);
        var post = new BlogPost(); post.setId(10L); post.setTitle("Draft"); post.setSummary("Summary"); post.setCategory("Reading"); post.setContent("Content");
        when(blogs.findByDeletedAtIsNullOrderByUpdatedAtDescIdDesc()).thenReturn(List.of(post));
        when(materials.findByDeletedAtIsNullOrderBySortOrderAscIdAsc()).thenReturn(List.of());
        var migration = new BlogMaterialMigration(blogs, materials);
        migration.run(null);
        var capture = org.mockito.ArgumentCaptor.forClass(LearningMaterial.class);
        verify(materials).save(capture.capture());
        assertEquals(10L, capture.getValue().getSourceBlogId());
        assertEquals("Content", capture.getValue().getContent()); assertFalse(capture.getValue().isVisible());
        when(materials.existsBySourceBlogId(10L)).thenReturn(true);
        migration.run(null);
        verify(materials, times(1)).save(any());
    }
}
