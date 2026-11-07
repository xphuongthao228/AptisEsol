package com.example.aptis.controller;

import com.example.aptis.enums.WithdrawalStatus;
import com.example.aptis.service.ReferralWithdrawalService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringJUnitConfig(ReferralWithdrawalAuthorizationTest.Config.class)
class ReferralWithdrawalAuthorizationTest {
    @Configuration @EnableMethodSecurity
    static class Config {
        static final ReferralWithdrawalService SERVICE = mock(ReferralWithdrawalService.class);
        @Bean ReferralWithdrawalController controller() { return new ReferralWithdrawalController(SERVICE); }
    }
    @Autowired ReferralWithdrawalController controller;
    private final ReferralWithdrawalService service = Config.SERVICE;
    @BeforeEach void setup() { reset(service); }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void studentsCannotListBankDetailsOrProcessWithdrawals() {
        var auth = new UsernamePasswordAuthenticationToken("student@example.com", "", List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
        SecurityContextHolder.getContext().setAuthentication(auth);
        assertThrows(AccessDeniedException.class, () -> controller.list(WithdrawalStatus.PENDING, 0, 10));
        assertThrows(AccessDeniedException.class, () -> controller.review(auth, 1L, new ReferralWithdrawalService.ReviewRequest(WithdrawalStatus.PAID, "TXN-1", null)));
        verifyNoInteractions(service);
    }
    @Test void adminsCanReviewRequests() {
        var auth = new UsernamePasswordAuthenticationToken("admin@example.com", "", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);
        controller.list(WithdrawalStatus.PENDING, 0, 10);
        verify(service).list(WithdrawalStatus.PENDING, 0, 10);
    }
}
