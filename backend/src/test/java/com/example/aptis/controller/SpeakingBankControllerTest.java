package com.example.aptis.controller;

import com.example.aptis.repository.WritingBankEntryRepository;
import com.example.aptis.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class SpeakingBankControllerTest {
    private final WritingBankEntryRepository repository = mock(WritingBankEntryRepository.class);
    private final PaymentService payment = mock(PaymentService.class);
    private final SpeakingBankController controller = new SpeakingBankController(repository, payment);

    @Test
    void readsSpeakingWithoutReadingWriting() {
        var admin = new UsernamePasswordAuthenticationToken("admin", "",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        when(repository.findByBankTypeOrderBySortOrderAscIdAsc("speaking-answers")).thenReturn(List.of());
        controller.get("answers", admin);
        verify(repository).findByBankTypeOrderBySortOrderAscIdAsc("speaking-answers");
        verify(repository, never()).findByBankTypeOrderBySortOrderAscIdAsc("answers");
    }

    @Test
    void replacingSpeakingCannotClearWriting() {
        when(repository.saveAll(anyList())).thenReturn(List.of());
        controller.replace("samples", List.of());
        verify(repository).deleteByBankType("speaking-samples");
        verify(repository, never()).deleteByBankType("samples");
        assertThrows(IllegalArgumentException.class, () -> controller.replace("speaking-samples", List.of()));
    }

    @Test
    void speakingRequiresProOrAdmin() {
        var student = new UsernamePasswordAuthenticationToken("student", "",
                List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
        assertThrows(AccessDeniedException.class, () -> controller.get("answers", null));
        assertThrows(AccessDeniedException.class, () -> controller.get("answers", student));
        when(payment.hasProAccess("student")).thenReturn(true);
        when(repository.findByBankTypeOrderBySortOrderAscIdAsc("speaking-answers")).thenReturn(List.of());
        controller.get("answers", student);
        verify(repository).findByBankTypeOrderBySortOrderAscIdAsc("speaking-answers");
    }
}
