package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.AuthDtos;
import com.example.aptis.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping({"/api/auth", "/auth"})
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    @Value("${app.auth-cookie-secure:false}") private boolean secureCookies;
    @Value("${app.jwt.access-token-minutes}") private long accessMinutes;
    @Value("${app.jwt.refresh-token-days}") private long refreshDays;

    @PostMapping("/register")
    public ApiResponse<AuthDtos.OtpResponse> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return ApiResponse.ok(authService.register(request));
    }

    @PostMapping("/verify-registration-otp")
    public ApiResponse<Void> verifyRegistrationOtp(@Valid @RequestBody AuthDtos.VerifyOtpRequest request) {
        authService.verifyRegistrationOtp(request);
        return ApiResponse.ok(null);
    }

    @PostMapping("/login")
    public ApiResponse<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @PostMapping("/refresh-token")
    public ApiResponse<AuthDtos.AuthResponse> refresh(@RequestBody(required = false) AuthDtos.RefreshRequest request,
                                                       HttpServletRequest httpRequest,
                                                       HttpServletResponse httpResponse) {
        String token = request != null ? request.refreshToken() : cookie(httpRequest, "aptis_refresh_token");
        if (token == null || token.isBlank()) throw new IllegalArgumentException("Refresh token khong hop le");
        AuthDtos.AuthResponse auth = authService.refresh(token);
        if (cookie(httpRequest, "aptis_refresh_token") != null) {
            addCookie(httpResponse, "aptis_access_token", auth.accessToken(), Duration.ofMinutes(accessMinutes));
            addCookie(httpResponse, "aptis_refresh_token", auth.refreshToken(), Duration.ofDays(refreshDays));
        }
        return ApiResponse.ok(auth);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@RequestBody(required = false) AuthDtos.RefreshRequest request,
                                    HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String token = request != null ? request.refreshToken() : cookie(httpRequest, "aptis_refresh_token");
        if (token != null && !token.isBlank()) authService.logout(token);
        clearCookie(httpResponse, "aptis_access_token");
        clearCookie(httpResponse, "aptis_refresh_token");
        return ApiResponse.ok(null);
    }

    @PostMapping("/change-password")
    public ApiResponse<Void> changePassword(Authentication authentication,
                                             @Valid @RequestBody AuthDtos.ChangePasswordRequest request) {
        authService.changePassword(authentication.getName(), request);
        return ApiResponse.ok(null);
    }

    @GetMapping("/me")
    public ApiResponse<AuthDtos.UserResponse> me(Authentication authentication) {
        return ApiResponse.ok(authService.currentUser(authentication.getName()));
    }

    @PostMapping("/heartbeat")
    public ApiResponse<AuthDtos.HeartbeatResponse> heartbeat(Authentication authentication,
            @RequestBody(required = false) AuthDtos.HeartbeatRequest request) {
        String email = authentication == null || authentication instanceof AnonymousAuthenticationToken
                ? null : authentication.getName();
        return ApiResponse.ok(authService.heartbeat(request == null ? null : request.visitorId(), email));
    }

    @PutMapping("/me")
    public ApiResponse<AuthDtos.UserResponse> updateProfile(Authentication authentication,
                                                             @Valid @RequestBody AuthDtos.UpdateProfileRequest request) {
        return ApiResponse.ok(authService.updateProfile(authentication.getName(), request));
    }

    @GetMapping("/verify-email")
    public ApiResponse<Void> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ApiResponse.ok(null);
    }

    @PostMapping("/resend-verification")
    public ApiResponse<AuthDtos.OtpResponse> resendVerification(@Valid @RequestBody AuthDtos.EmailRequest request) {
        return ApiResponse.ok(authService.resendVerification(request.email()));
    }

    @PostMapping("/forgot-password")
    public ApiResponse<AuthDtos.OtpResponse> forgotPassword(@Valid @RequestBody AuthDtos.EmailRequest request) {
        return ApiResponse.ok(authService.forgotPassword(request.email()));
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ApiResponse.ok(null);
    }

    private String cookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) if (name.equals(cookie.getName())) return cookie.getValue();
        return null;
    }

    private void addCookie(HttpServletResponse response, String name, String value, Duration maxAge) {
        response.addHeader("Set-Cookie", ResponseCookie.from(name, value).httpOnly(true).secure(secureCookies)
                .sameSite(secureCookies ? "None" : "Lax").path("/").maxAge(maxAge).build().toString());
    }

    private void clearCookie(HttpServletResponse response, String name) {
        addCookie(response, name, "", Duration.ZERO);
    }
}
