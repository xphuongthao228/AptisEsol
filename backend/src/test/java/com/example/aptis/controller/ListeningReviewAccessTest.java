package com.example.aptis.controller;

import com.example.aptis.service.CoreService;
import com.example.aptis.service.ListeningReviewService;
import com.example.aptis.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class ListeningReviewAccessTest {
    @Test
    void checksQuestionAccessBeforeCallingTranslation() {
        var core = mock(CoreService.class);
        var payment = mock(PaymentService.class);
        var review = mock(ListeningReviewService.class);
        var controller = new QuestionController(core, payment, review);
        var auth = new UsernamePasswordAuthenticationToken("student", "",
                List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
        when(payment.canAccessQuestion("student", 99L)).thenReturn(false);
        assertThrows(AccessDeniedException.class, () -> controller.listeningReview(auth, 99L));
        verifyNoInteractions(core, review);
    }
}
