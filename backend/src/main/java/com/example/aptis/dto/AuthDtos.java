package com.example.aptis.dto;

import com.example.aptis.enums.RoleName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.Set;

public class AuthDtos {
    public record RegisterRequest(@Email @NotBlank String email, @NotBlank String fullName,
                                  @Size(min = 6) String password) {}
    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record EmailRequest(@Email @NotBlank String email) {}
    public record VerifyOtpRequest(@Email @NotBlank String email, @NotBlank String otp) {}
    public record ResetPasswordRequest(@Email @NotBlank String email, @NotBlank String otp,
                                       @NotBlank @Size(min = 6) String newPassword) {}
    public record RefreshRequest(@NotBlank String refreshToken) {}
    public record VerifyEmailRequest(@NotBlank String token) {}
    public record ChangePasswordRequest(@NotBlank String currentPassword, @Size(min = 6) String newPassword) {}
    public record UpdateProfileRequest(@NotBlank String fullName) {}
    public record AuthResponse(String accessToken, String refreshToken, UserResponse user) {}
    public record UserResponse(Long id, String email, String fullName, Set<RoleName> roles, boolean enabled,
                               LocalDateTime proExpiresAt, LocalDateTime accessExpiresAt) {}
}
