package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.AuthDtos;
import com.example.aptis.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public ApiResponse<Void> register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        authService.register(request);
        return ApiResponse.message("Đã gửi mã OTP về Gmail/email. Nhập đúng OTP để hoàn tất đăng ký.", null);
    }

    @PostMapping("/verify-registration-otp")
    public ApiResponse<Void> verifyRegistrationOtp(@Valid @RequestBody AuthDtos.VerifyOtpRequest request) {
        authService.verifyRegistrationOtp(request);
        return ApiResponse.message("Xác nhận OTP thành công. Tài khoản đã được đăng ký.", null);
    }

    @PostMapping("/login")
    public ApiResponse<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @PostMapping("/refresh-token")
    public ApiResponse<AuthDtos.AuthResponse> refresh(@Valid @RequestBody AuthDtos.RefreshRequest request) {
        return ApiResponse.ok(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@Valid @RequestBody AuthDtos.RefreshRequest request) {
        authService.logout(request.refreshToken());
        return ApiResponse.message("Đã đăng xuất", null);
    }

    @PostMapping("/change-password")
    public ApiResponse<Void> changePassword(Authentication authentication, @Valid @RequestBody AuthDtos.ChangePasswordRequest request) {
        authService.changePassword(authentication.getName(), request);
        return ApiResponse.message("Đổi mật khẩu thành công", null);
    }

    @GetMapping("/me")
    public ApiResponse<AuthDtos.UserResponse> me(Authentication authentication) {
        return ApiResponse.ok(authService.currentUser(authentication.getName()));
    }

    @PutMapping("/me")
    public ApiResponse<AuthDtos.UserResponse> updateProfile(Authentication authentication, @Valid @RequestBody AuthDtos.UpdateProfileRequest request) {
        return ApiResponse.ok(authService.updateProfile(authentication.getName(), request));
    }

    @GetMapping("/verify-email")
    public ApiResponse<Void> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ApiResponse.message("Email đã được xác nhận. Tài khoản đăng ký thành công.", null);
    }

    @PostMapping("/resend-verification")
    public ApiResponse<Void> resendVerification(@Valid @RequestBody AuthDtos.EmailRequest request) {
        authService.resendVerification(request.email());
        return ApiResponse.message("Đã gửi lại mã OTP.", null);
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody AuthDtos.EmailRequest request) {
        authService.forgotPassword(request.email());
        return ApiResponse.message("Đã gửi mã OTP đặt lại mật khẩu về email của bạn.", null);
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ApiResponse.message("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.", null);
    }
}
