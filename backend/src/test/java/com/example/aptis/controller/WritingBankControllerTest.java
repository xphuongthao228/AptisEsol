package com.example.aptis.controller;

import com.example.aptis.repository.WritingBankEntryRepository;
import com.example.aptis.service.PaymentService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class WritingBankControllerTest {
    private final WritingBankEntryRepository repository = mock(WritingBankEntryRepository.class);
    private final PaymentService payment = mock(PaymentService.class);
    private final WritingBankController controller = new WritingBankController(repository, payment);

    private UsernamePasswordAuthenticationToken auth(String role) {
        return new UsernamePasswordAuthenticationToken("student@example.com", "", List.of(new SimpleGrantedAuthority("ROLE_" + role)));
    }

    @Test
    void guestsAndNonProAccountsCannotReadBank() {
        assertThrows(AccessDeniedException.class, () -> controller.get("answers", null));
        assertThrows(AccessDeniedException.class, () -> controller.get("answers", auth("STUDENT")));
        verifyNoInteractions(repository);
    }

    @Test
    void activeProAndAdminCanReadBank() {
        when(repository.findByBankTypeOrderBySortOrderAscIdAsc("answers")).thenReturn(List.of());
        when(payment.hasProAccess("student@example.com")).thenReturn(true);
        controller.get("answers", auth("STUDENT"));
        when(payment.hasProAccess("student@example.com")).thenReturn(false);
        controller.get("answers", auth("ADMIN"));
        verify(repository, times(2)).findByBankTypeOrderBySortOrderAscIdAsc("answers");
    }

    @Test
    void invalidBankCannotReadOrReplaceSamples() {
        assertThrows(IllegalArgumentException.class, () -> controller.get("answer", auth("ADMIN")));
        assertThrows(IllegalArgumentException.class, () -> controller.replace("answer", List.of()));
        verifyNoInteractions(repository);
    }

    @Test
    void clearingAnswersDoesNotDeleteSamples() {
        when(repository.saveAll(anyList())).thenReturn(List.of());
        controller.replace("answers", List.of());
        verify(repository).deleteByBankType("answers");
        verify(repository, never()).deleteByBankType("samples");
    }
}
