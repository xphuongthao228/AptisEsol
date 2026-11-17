package com.example.aptis.service;

import com.example.aptis.entity.RefreshToken;
import com.example.aptis.entity.User;
import com.example.aptis.mapper.DtoMapper;
import com.example.aptis.repository.RefreshTokenRepository;
import com.example.aptis.repository.UserRepository;
import com.example.aptis.security.JwtService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SingleSessionTest {
    @Mock UserRepository users;
    @Mock RefreshTokenRepository refreshTokens;
    @Mock EntityManager entityManager;
    @Mock UserDetailsService details;
    @Mock JwtService jwt;
    @Mock DtoMapper mapper;
    @Mock org.springframework.beans.factory.ObjectProvider<org.springframework.security.authentication.AuthenticationManager> authenticationManagerProvider;
    @InjectMocks AuthService auth;
    User user;

    @BeforeEach void setup() {
        user = new User();
        user.setEmail("student@example.com");
        user.setActiveSessionId("new-device");
    }

    RefreshToken token(String sessionId) {
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setSessionId(sessionId);
        token.setExpiresAt(Instant.now().plusSeconds(3600));
        when(refreshTokens.findByTokenAndRevokedFalse("refresh")).thenReturn(Optional.of(token));
        return token;
    }

    @Test void oldDeviceCannotRefresh() {
        token("old-device");
        assertThrows(ResponseStatusException.class, () -> auth.refresh("refresh"));
        verify(jwt, never()).generate(any(), any());
    }

    @Test void eachSuccessfulLoginReplacesThePreviousSession() {
        user.setEmailVerified(true);
        when(users.findByEmailAndDeletedAtIsNull(user.getEmail())).thenReturn(Optional.of(user));
        when(authenticationManagerProvider.getObject())
                .thenReturn(mock(org.springframework.security.authentication.AuthenticationManager.class));
        RefreshToken previous = new RefreshToken();
        previous.setSessionId("new-device");
        when(refreshTokens.findByUserAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtDesc(eq(user), any()))
                .thenReturn(List.of(previous));
        var request = new com.example.aptis.dto.AuthDtos.LoginRequest(user.getEmail(), "password");
        auth.login(request);
        String firstSession = user.getActiveSessionId();
        assertNotEquals("new-device", firstSession);
        assertTrue(previous.isRevoked());
        auth.login(request);
        assertNotEquals(firstSession, user.getActiveSessionId());
    }

    @Test void refreshKeepsCurrentSession() {
        RefreshToken old = token("new-device");
        when(refreshTokens.findByUserAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtDesc(eq(user), any()))
                .thenReturn(List.of());
        auth.refresh("refresh");
        assertTrue(old.isRevoked());
        assertEquals("new-device", user.getActiveSessionId());
        verify(refreshTokens).save(argThat(t -> t != old && "new-device".equals(t.getSessionId())));
    }

    @Test void oldDeviceLogoutDoesNotEndNewSession() {
        token("old-device");
        auth.logout("refresh");
        assertEquals("new-device", user.getActiveSessionId());
    }

    @Test void currentDeviceLogoutEndsSession() {
        token("new-device");
        auth.logout("refresh");
        assertNull(user.getActiveSessionId());
    }

    @Test void replacedSessionCannotBeRestoredFromCookie() {
        when(users.findByEmailAndDeletedAtIsNull(user.getEmail())).thenReturn(Optional.of(user));
        assertThrows(ResponseStatusException.class, () -> auth.session(user.getEmail(), "old-device"));
        verify(jwt, never()).generate(any(), any());
    }
}
