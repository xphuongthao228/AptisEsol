package com.example.aptis.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final AppUserDetailsService userDetailsService;
    private static final String[] PUBLIC_AUTH_PATHS = {
            "/auth/login",
            "/auth/register",
            "/auth/verify-registration-otp",
            "/auth/resend-verification",
            "/auth/forgot-password",
            "/auth/reset-password",
            "/auth/refresh-token",
            "/auth/logout",
            "/auth/verify-email",
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/verify-registration-otp",
            "/api/auth/resend-verification",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/refresh-token",
            "/api/auth/logout",
            "/api/auth/verify-email"
    };

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        for (String publicPath : PUBLIC_AUTH_PATHS) {
            if (path.equals(publicPath)) {
                return true;
            }
        }
        return "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String header = request.getHeader("Authorization");
            String cookieToken = request.getCookies() == null ? null
                    : java.util.Arrays.stream(request.getCookies())
                    .filter(cookie -> "aptis_access_token".equals(cookie.getName()))
                    .map(jakarta.servlet.http.Cookie::getValue)
                    .findFirst().orElse(null);

            // Prefer the Authorization header, but fall back to the OAuth
            // HttpOnly cookie when a persisted browser token has expired.
            String[] candidates = header != null && header.startsWith("Bearer ")
                    ? new String[] { header.substring(7), cookieToken }
                    : new String[] { cookieToken };

            for (String token : candidates) {
                if (token == null || token.isBlank()) continue;
                try {
                    UserDetails details = userDetailsService.loadUserByUsername(jwtService.subject(token));
                    if (jwtService.valid(token, details)) {
                        UsernamePasswordAuthenticationToken auth =
                                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
                        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                        break;
                    }
                } catch (RuntimeException ignored) {
                    // Try the next token, usually the fresh OAuth cookie.
                }
            }
        }
        chain.doFilter(request, response);
    }
}
