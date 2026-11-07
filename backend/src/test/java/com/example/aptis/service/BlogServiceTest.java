package com.example.aptis.service;

import com.example.aptis.entity.BlogPost;
import com.example.aptis.repository.BlogPostRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BlogServiceTest {
    private final BlogPostRepository repository = mock(BlogPostRepository.class);
    private final BlogService service = new BlogService(repository);
    @Test void publicListUsesOnlyPublishedPostsAndDraftDetailIsHidden() {
        var published = new BlogPost(); published.setId(1L); published.setPublished(true); published.setTitle("Reading");
        var draft = new BlogPost(); draft.setId(2L);
        when(repository.findByPublishedTrueAndDeletedAtIsNullOrderByUpdatedAtDescIdDesc()).thenReturn(List.of(published));
        when(repository.findByIdAndDeletedAtIsNull(2L)).thenReturn(Optional.of(draft));
        assertEquals(List.of(1L), service.published().stream().map(BlogService.Preview::id).toList());
        assertThrows(ResponseStatusException.class, () -> service.detail(2L));
    }
    @Test void savesDraftAndSoftDeletesWithoutRemovingHistory() {
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
        var draft = service.save(null, new BlogService.Request(" Title ", "Summary", "First paragraph\n\nSecond paragraph", "", "Reading", false));
        assertEquals("Title", draft.getTitle()); assertFalse(draft.isPublished()); assertNull(draft.getCoverUrl());
        when(repository.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(draft));
        service.delete(1L);
        assertNotNull(draft.getDeletedAt());
        verify(repository, never()).delete(any());
    }
    @Test void rejectsExecutableCoverUrls() {
        assertThrows(IllegalArgumentException.class, () -> service.save(null,
                new BlogService.Request("Title", "Summary", "Content", "javascript:alert(1)", "Reading", true)));
        verify(repository, never()).save(any());
    }
}
