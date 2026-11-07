package com.example.aptis.service;

import com.example.aptis.entity.LearningMaterial;
import com.example.aptis.repository.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LearningMaterialServiceTest {
    final LearningMaterialRepository repository = mock(LearningMaterialRepository.class);
    final LessonRepository lessons = mock(LessonRepository.class);
    final LearningMaterialService service = new LearningMaterialService(repository, lessons);

    @Test void studentsOnlySeeVisibleMaterials() {
        LearningMaterial visible = new LearningMaterial();
        LearningMaterial hidden = new LearningMaterial();
        hidden.setVisible(false);
        when(repository.findByDeletedAtIsNullOrderBySortOrderAscIdAsc()).thenReturn(List.of(visible, hidden));
        assertEquals(List.of(visible), service.list(false));
        assertEquals(List.of(visible, hidden), service.list(true));
    }

    @Test void unsafeLinksAreRejectedBeforeSaving() {
        for (String url : List.of("javascript:alert(1)", "//evil.test/file", "/\\evil.test/file", "data:text/html,test")) {
            assertThrows(IllegalArgumentException.class, () -> service.save(null,
                    new LearningMaterialService.Request("Test", "Reading", "", null, url, true, 0)));
        }
        verify(repository, never()).save(any());
    }

    @Test void updatingMaterialCanRemoveDownloadAndHideIt() {
        LearningMaterial item = new LearningMaterial();
        item.setResourceUrl("https://example.com/old.pdf");
        when(repository.findById(5L)).thenReturn(Optional.of(item));
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
        var saved = service.save(5L, new LearningMaterialService.Request("New title", "Reading", "Description", "/cover.png", "  ", false, 3));
        assertNull(saved.getResourceUrl());
        assertFalse(saved.isVisible());
        assertEquals(3, saved.getSortOrder());
        assertEquals("New title", saved.getTitle());
    }

    @Test void defaultsAreNotRecreatedAfterDeletion() {
        when(repository.count()).thenReturn(6L);
        service.run(null);
        verify(repository, never()).save(any());
        verifyNoInteractions(lessons);
    }

    @Test void defaultsPreserveExistingSectionAndDeletionIsPersistent() {
        when(repository.count()).thenReturn(0L);
        when(lessons.findByDeletedAtIsNullOrderByUpdatedAtDesc()).thenReturn(List.of());
        service.run(null);
        verify(repository, times(6)).save(any());
        LearningMaterial item = new LearningMaterial();
        when(repository.findById(1L)).thenReturn(Optional.of(item));
        service.delete(1L);
        assertNotNull(item.getDeletedAt());
        assertThrows(com.example.aptis.exception.ResourceNotFoundException.class, () -> service.delete(1L));
    }
}
