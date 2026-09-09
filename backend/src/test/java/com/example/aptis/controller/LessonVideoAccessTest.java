package com.example.aptis.controller;

import com.example.aptis.dto.CoreDtos;
import com.example.aptis.enums.LessonResourceType;
import com.example.aptis.enums.SkillType;
import com.example.aptis.enums.TestStatus;
import com.example.aptis.service.CoreService;
import com.example.aptis.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LessonVideoAccessTest {
    private final CoreService core = mock(CoreService.class);
    private final PaymentService payment = mock(PaymentService.class);
    private final LessonController controller = new LessonController(core, payment);
    private final CoreDtos.LessonResponse video = lesson(LessonResourceType.VIDEO, TestStatus.PUBLISHED);

    @Test
    void guestFreeExpiredAndTrialCannotReadVideoDetails() {
        when(core.lesson(1L)).thenReturn(video);
        assertThrows(AccessDeniedException.class, () -> controller.one(1L, null));
        for (String account : List.of("free", "expired", "trial")) {
            when(payment.hasActiveAccess(account)).thenReturn(true);
            assertThrows(AccessDeniedException.class, () -> controller.one(1L, auth(account, "STUDENT")));
        }
        verify(payment, never()).hasActiveAccess(anyString());
    }

    @Test
    void everyVideoOpenChecksCurrentProStatus() {
        when(core.lesson(1L)).thenReturn(video);
        when(payment.hasProAccess("pro")).thenReturn(true, false);
        var auth = auth("pro", "STUDENT");
        assertEquals(video, controller.one(1L, auth).data());
        assertThrows(AccessDeniedException.class, () -> controller.one(1L, auth));
    }

    @Test
    void catalogNeverLeaksVideoUrlsEvenInContentOrSummary() {
        var document = lesson(LessonResourceType.DOCUMENT, TestStatus.PUBLISHED);
        when(core.lessons(null)).thenReturn(List.of(video, document, lesson(LessonResourceType.VIDEO, TestStatus.DRAFT)));
        var guest = controller.all(null, null).data();
        assertEquals(2, guest.size());
        assertNull(guest.get(0).resourceUrl());
        assertNull(guest.get(0).content());
        assertNull(guest.get(0).summary());
        assertEquals(video.title(), guest.get(0).title());
        assertEquals(document, guest.get(1));
        var pro = controller.all(null, auth("pro", "STUDENT")).data();
        assertNull(pro.get(0).resourceUrl());
    }

    @Test
    void documentsRemainAvailableAndAdminCanManageVideos() {
        var document = lesson(LessonResourceType.DOCUMENT, TestStatus.PUBLISHED);
        when(core.lesson(1L)).thenReturn(document);
        assertEquals(document, controller.one(1L, auth("free", "STUDENT")).data());
        when(core.lesson(1L)).thenReturn(video);
        when(core.lessons(null)).thenReturn(List.of(video));
        assertEquals(video, controller.one(1L, auth("admin", "ADMIN")).data());
        assertEquals(video, controller.all(null, auth("admin", "ADMIN")).data().get(0));
    }

    private UsernamePasswordAuthenticationToken auth(String name, String role) {
        return new UsernamePasswordAuthenticationToken(name, "", List.of(new SimpleGrantedAuthority("ROLE_" + role)));
    }

    private CoreDtos.LessonResponse lesson(LessonResourceType type, TestStatus status) {
        return new CoreDtos.LessonResponse(1L, SkillType.READING, "Lesson", "https://video.example/summary",
                "https://video.example/content", status, null, type, "https://video.example/watch", "Part 1");
    }
}
