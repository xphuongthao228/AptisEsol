package com.example.aptis.security;

import com.example.aptis.dto.AuthDtos;
import com.example.aptis.service.AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {
    private final AuthService authService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.jwt.refresh-token-days}")
    private long refreshDays;

    @Value("${app.jwt.access-token-minutes}")
    private long accessMinutes;

    @Value("${app.auth-cookie-secure:false}")
    private boolean secure;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        try {
            AuthDtos.AuthResponse auth = authService.loginWithGoogle((OAuth2User) authentication.getPrincipal());
            addCookie(response, "aptis_access_token", auth.accessToken(), Duration.ofMinutes(accessMinutes));
            addCookie(response, "aptis_refresh_token", auth.refreshToken(), Duration.ofDays(refreshDays));
            response.sendRedirect(frontendUrl + "/oauth2/callback");
        } catch (RuntimeException ex) {
            String error = URLEncoder.encode(ex.getMessage() == null ? "Google login failed" : ex.getMessage(),
                    StandardCharsets.UTF_8);
            response.sendRedirect(frontendUrl + "/login?oauthError=" + error);
        }
    }

    private void addCookie(HttpServletResponse response, String name, String value, Duration maxAge) {
        response.addHeader("Set-Cookie", ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(secure ? "None" : "Lax")
                .path("/")
                .maxAge(maxAge)
                .build()
                .toString());
    }
}
