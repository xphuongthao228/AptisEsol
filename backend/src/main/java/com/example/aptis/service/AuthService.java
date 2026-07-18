package com.example.aptis.service;

import com.example.aptis.dto.AuthDtos;
import com.example.aptis.entity.EmailVerificationToken;
import com.example.aptis.entity.RefreshToken;
import com.example.aptis.entity.Role;
import com.example.aptis.entity.User;
import com.example.aptis.enums.RoleName;
import com.example.aptis.mapper.DtoMapper;
import com.example.aptis.repository.EmailVerificationTokenRepository;
import com.example.aptis.repository.RefreshTokenRepository;
import com.example.aptis.repository.RoleRepository;
import com.example.aptis.repository.UserRepository;
import com.example.aptis.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final SecureRandom OTP_RANDOM = new SecureRandom();
    private static final String PURPOSE_REGISTRATION = "REGISTRATION";
    private static final String PURPOSE_PASSWORD_RESET = "PASSWORD_RESET";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationTokenRepository emailTokenRepository;
    private final PasswordEncoder encoder;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final DtoMapper mapper;
    private final EmailService emailService;

    @Value("${app.jwt.refresh-token-days}")
    private long refreshDays;

    @Value("${app.mail.verification-token-hours}")
    private long verificationHours;

    @Transactional
    public void register(AuthDtos.RegisterRequest request) {
        String email = request.email().trim();
        Role role = roleRepository.findByName(RoleName.STUDENT).orElseThrow();
        User user = userRepository.findByEmailAndDeletedAtIsNull(email).orElseGet(User::new);

        if (user.getId() != null && user.isEmailVerified()) {
            throw new IllegalArgumentException("Email đã tồn tại");
        }

        user.setEmail(email);
        user.setFullName(request.fullName().trim());
        user.setPassword(encoder.encode(request.password()));
        user.setEmailVerified(false);
        if (user.getRoles().isEmpty()) {
            user.getRoles().add(role);
        }

        User saved = userRepository.save(user);
        sendRegistrationOtp(saved);
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        String email = request.email().trim();
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        User user = userRepository.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        if (!user.isEmailVerified()) {
            throw new IllegalStateException("Bạn cần nhập đúng mã OTP trong Gmail trước khi đăng nhập");
        }
        return tokens(user);
    }

    public AuthDtos.AuthResponse refresh(String refreshToken) {
        RefreshToken token = refreshTokenRepository.findByTokenAndRevokedFalse(refreshToken)
                .filter(rt -> rt.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new IllegalArgumentException("Refresh token không hợp lệ"));
        return tokens(token.getUser());
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenRepository.findByTokenAndRevokedFalse(refreshToken).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    public void changePassword(String email, AuthDtos.ChangePasswordRequest request) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        if (!encoder.matches(request.currentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không đúng");
        }
        user.setPassword(encoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    @Transactional
    public void forgotPassword(String email) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(email.trim())
                .orElseThrow(() -> new IllegalArgumentException("Email chưa tồn tại trong hệ thống"));
        sendPasswordResetOtp(user);
    }

    @Transactional
    public void resetPassword(AuthDtos.ResetPasswordRequest request) {
        EmailVerificationToken verificationToken = emailTokenRepository
                .findFirstByUserEmailAndTokenAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(
                        request.email().trim(), request.otp().trim(), PURPOSE_PASSWORD_RESET)
                .orElseThrow(() -> new IllegalArgumentException("Mã OTP không đúng"));
        if (verificationToken.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Mã OTP đã hết hạn");
        }

        User user = verificationToken.getUser();
        user.setPassword(encoder.encode(request.newPassword()));
        user.setEmailVerified(true);
        verificationToken.setUsedAt(Instant.now());
        userRepository.save(user);
        emailTokenRepository.save(verificationToken);
    }

    public AuthDtos.UserResponse currentUser(String email) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        return mapper.user(user);
    }

    public AuthDtos.UserResponse updateProfile(String email, AuthDtos.UpdateProfileRequest request) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        user.setFullName(request.fullName().trim());
        return mapper.user(userRepository.save(user));
    }

    @Transactional
    public void verifyEmail(String token) {
        EmailVerificationToken verificationToken = emailTokenRepository.findByTokenAndUsedAtIsNull(token)
                .orElseThrow(() -> new IllegalArgumentException("Link xác nhận không hợp lệ"));
        if (verificationToken.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Link xác nhận đã hết hạn");
        }
        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        verificationToken.setUsedAt(Instant.now());
        userRepository.save(user);
        emailTokenRepository.save(verificationToken);
    }

    @Transactional
    public void verifyRegistrationOtp(AuthDtos.VerifyOtpRequest request) {
        EmailVerificationToken verificationToken = emailTokenRepository
                .findFirstByUserEmailAndTokenAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(
                        request.email().trim(), request.otp().trim(), PURPOSE_REGISTRATION)
                .orElseThrow(() -> new IllegalArgumentException("Mã OTP không đúng"));
        if (verificationToken.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Mã OTP đã hết hạn");
        }
        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        verificationToken.setUsedAt(Instant.now());
        userRepository.save(user);
        emailTokenRepository.save(verificationToken);
    }

    @Transactional
    public void resendVerification(String email) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(email.trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy email"));
        if (user.isEmailVerified()) {
            throw new IllegalStateException("Email đã được xác nhận");
        }
        sendRegistrationOtp(user);
    }

    private void sendRegistrationOtp(User user) {
        EmailVerificationToken token = createOtpToken(user, PURPOSE_REGISTRATION);
        emailService.sendRegistrationOtp(user, token.getToken());
    }

    private void sendPasswordResetOtp(User user) {
        EmailVerificationToken token = createOtpToken(user, PURPOSE_PASSWORD_RESET);
        emailService.sendPasswordResetOtp(user, token.getToken());
    }

    private EmailVerificationToken createOtpToken(User user, String purpose) {
        emailTokenRepository.findByUserAndPurposeAndUsedAtIsNull(user, purpose).forEach(token -> {
            token.setUsedAt(Instant.now());
            emailTokenRepository.save(token);
        });

        EmailVerificationToken token = new EmailVerificationToken();
        token.setToken(String.format("%06d", OTP_RANDOM.nextInt(1_000_000)));
        token.setPurpose(purpose);
        token.setUser(user);
        token.setExpiresAt(Instant.now().plusSeconds(verificationHours * 3600));
        return emailTokenRepository.save(token);
    }

    private AuthDtos.AuthResponse tokens(User user) {
        String access = jwtService.generate(userDetailsService.loadUserByUsername(user.getEmail()));
        RefreshToken refresh = new RefreshToken();
        refresh.setToken(UUID.randomUUID().toString());
        refresh.setUser(user);
        refresh.setExpiresAt(Instant.now().plusSeconds(refreshDays * 24 * 3600));
        refreshTokenRepository.save(refresh);
        return new AuthDtos.AuthResponse(access, refresh.getToken(), mapper.user(user));
    }
}
