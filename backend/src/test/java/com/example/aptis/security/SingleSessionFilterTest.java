package com.example.aptis.security;

import com.example.aptis.entity.User;
import com.example.aptis.repository.UserRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SingleSessionFilterTest {
    JwtService jwt;
    User account;
    org.springframework.security.core.userdetails.UserDetails details;
    JwtAuthenticationFilter filter;

    @BeforeEach void setup() {
        jwt = new JwtService();
        ReflectionTestUtils.setField(jwt, "secret", "test-secret-for-single-session-authentication-1234567890");
        ReflectionTestUtils.setField(jwt, "accessMinutes", 10L);
        account = new User();
        account.setActiveSessionId("first-device");
        details = org.springframework.security.core.userdetails.User.withUsername("student@example.com")
                .password("unused").roles("STUDENT").build();
        AppUserDetailsService service = mock(AppUserDetailsService.class);
        when(service.loadUserByUsername(details.getUsername())).thenReturn(details);
        UserRepository users = mock(UserRepository.class);
        when(users.findByEmailAndDeletedAtIsNull(details.getUsername())).thenReturn(Optional.of(account));
        filter = new JwtAuthenticationFilter(jwt, service, users);
    }

    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }

    MockHttpServletResponse request(String token, FilterChain chain) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/me");
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        return response;
    }

    @Test void newLoginImmediatelyRejectsOldAccessToken() throws Exception {
        String oldAccess = jwt.generate(details, "first-device");
        account.setActiveSessionId("second-device");
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletResponse response = request(oldAccess, chain);
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("SESSION_REPLACED"));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verifyNoInteractions(chain);
    }

    @Test void currentDeviceRemainsAuthenticated() throws Exception {
        FilterChain chain = mock(FilterChain.class);
        assertEquals(200, request(jwt.generate(details, "first-device"), chain).getStatus());
        assertEquals("first-device", SecurityContextHolder.getContext().getAuthentication().getCredentials());
        verify(chain).doFilter(any(), any());
    }
}
