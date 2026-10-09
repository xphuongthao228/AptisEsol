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
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final SecureRandom OTP_RANDOM = new SecureRandom();
    private static final String PURPOSE_REGISTRATION = "REGISTRATION";
    private static final String PURPOSE_PASSWORD_RESET = "PASSWORD_RESET";
    private static final int MAX_ACTIVE_REFRESH_TOKENS_PER_USER = 5;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationTokenRepository emailTokenRepository;
    private final PasswordEncoder encoder;
    private final ObjectProvider<AuthenticationManager> authenticationManagerProvider;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final DtoMapper mapper;
    private final EmailService emailService;
    private final ActiveVisitorService activeVisitorService;

    @Value("${app.jwt.refresh-token-days}")
    private long refreshDays;

    @Value("${app.mail.verification-token-hours}")
    private long verificationHours;

    @Transactional
    public AuthDtos.OtpResponse register(AuthDtos.RegisterRequest request) {
        String email = normalizeEmail(request.email());
        Role role = roleRepository.findByName(RoleName.STUDENT).orElseThrow();
        User user = userRepository.findByEmail(email).orElseGet(User::new);

        if (user.getId() != null && user.isEmailVerified()) {
            throw new IllegalArgumentException("Email đã tồn tại");
        }

        user.setDeletedAt(null);
        user.setEmail(email);
        user.setFullName(request.fullName().trim());
        user.setPassword(encoder.encode(request.password()));
        user.setEmailVerified(false);
        if (user.getRoles().isEmpty()) {
            user.getRoles().add(role);
        }

        User saved = userRepository.save(user);
        return sendRegistrationOtp(saved);
    }

    @Transactional
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        String email = normalizeEmail(request.email());
        authenticationManagerProvider.getObject()
                .authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        User user = userRepository.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        if (!user.isEmailVerified()) {
            throw new IllegalStateException("Bạn cần nhập đúng mã OTP trong Gmail trước khi đăng nhập");
        }
        return tokens(user);
    }

    @Transactional
    public AuthDtos.AuthResponse loginWithGoogle(OAuth2User googleUser) {
        String googleId = requiredAttribute(googleUser, "sub");
        String email = normalizeEmail(requiredAttribute(googleUser, "email"));
        boolean emailVerified = Boolean.TRUE.equals(googleUser.getAttribute("email_verified"));
        if (!emailVerified) {
            throw new IllegalArgumentException("Google chưa xác minh địa chỉ email này");
        }

        User user = userRepository.findByGoogleId(googleId).orElse(null);
        if (user == null) {
            user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                if (!user.isEnabled()) {
                    throw new IllegalStateException("Account is disabled");
                }
                if (user.getGoogleId() != null && !user.getGoogleId().equals(googleId)) {
                    throw new IllegalStateException("Email is already linked to another Google account");
                }
                // Keep the existing password and add Google as a second sign-in method.
                user.setDeletedAt(null);
                user.setGoogleId(googleId);
                user.setEmailVerified(true);
                user.setFullName(firstNonBlank(googleUser.getAttribute("name"), user.getFullName()));
                user.setAvatarUrl(googleUser.getAttribute("picture"));
                user = userRepository.save(user);
                /* if (false) {
                throw new IllegalStateException(
                        "Email đã có tài khoản mật khẩu. Hãy đăng nhập bằng mật khẩu rồi liên kết Google trong phần cài đặt.");
            }

                }

            */
            }
            if (user == null) {
                Role role = roleRepository.findByName(RoleName.STUDENT).orElseThrow();
                user = new User();
                user.setEmail(email);
                user.setFullName(firstNonBlank(googleUser.getAttribute("name"), email));
                user.setPassword(encoder.encode(UUID.randomUUID().toString()));
                user.setEmailVerified(true);
                user.setGoogleId(googleId);
                user.setAvatarUrl(googleUser.getAttribute("picture"));
                user.getRoles().add(role);
                user = userRepository.save(user);
            }
        } else {
            if (!user.isEnabled()) {
                throw new IllegalStateException("Tài khoản đã bị khóa");
            }
            if (!user.getEmail().equalsIgnoreCase(email)) {
                throw new IllegalStateException("Email Google không khớp với tài khoản đã liên kết");
            }
            user.setDeletedAt(null);
            user.setEmailVerified(true);
            user.setFullName(firstNonBlank(googleUser.getAttribute("name"), user.getFullName()));
            user.setAvatarUrl(googleUser.getAttribute("picture"));
            user = userRepository.save(user);
        }
        return tokens(user);
    }

    private String requiredAttribute(OAuth2User user, String name) {
        Object value = user.getAttributes().get(name);
        if (value == null || value.toString().isBlank()) {
            throw new IllegalArgumentException("Google không trả về thông tin bắt buộc: " + name);
        }
        return value.toString();
    }

    private String firstNonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    @Transactional
    public AuthDtos.AuthResponse refresh(String refreshToken) {
        RefreshToken token = refreshTokenRepository.findByTokenAndRevokedFalse(refreshToken)
                .filter(rt -> rt.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new IllegalArgumentException("Refresh token không hợp lệ"));
        token.setRevoked(true);
        refreshTokenRepository.save(token);
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
    public AuthDtos.OtpResponse forgotPassword(String email) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(email.trim())
                .orElseThrow(() -> new IllegalArgumentException("Email chưa tồn tại trong hệ thống"));
        return sendPasswordResetOtp(user);
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

    @Transactional
    public AuthDtos.AuthResponse session(String email) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        return tokens(user);
    }

    @Transactional
    public AuthDtos.HeartbeatResponse heartbeat(String visitorId, String email) {
        String normalizedVisitorId = activeVisitorService.touch(visitorId);
        AuthDtos.UserResponse userResponse = null;
        if (email != null && !email.isBlank()) {
            User user = userRepository.findByEmailAndDeletedAtIsNull(email).orElseThrow();
            user.setLastSeenAt(LocalDateTime.now());
            userResponse = mapper.user(userRepository.save(user));
        }
        return new AuthDtos.HeartbeatResponse(normalizedVisitorId, activeVisitorService.onlineCount(), userResponse);
    }

    @Transactional
    public AuthDtos.UserResponse updateProfile(String email, AuthDtos.UpdateProfileRequest request) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(email).orElseThrow();

        user.setFullName(request.fullName().trim());

        User saved = userRepository.save(user);

        return mapper.user(saved);
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
    public AuthDtos.OtpResponse resendVerification(String email) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(email.trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy email"));
        if (user.isEmailVerified()) {
            throw new IllegalStateException("Email đã được xác nhận");
        }
        return sendRegistrationOtp(user);
    }

    private AuthDtos.OtpResponse sendRegistrationOtp(User user) {
        EmailVerificationToken token = createOtpToken(user, PURPOSE_REGISTRATION);
        if (!emailService.isDeliveryConfigured()) {
            return new AuthDtos.OtpResponse(false, token.getToken());
        }
        emailService.sendRegistrationOtp(user, token.getToken());
        return new AuthDtos.OtpResponse(true, null);
    }

    private AuthDtos.OtpResponse sendPasswordResetOtp(User user) {
        EmailVerificationToken token = createOtpToken(user, PURPOSE_PASSWORD_RESET);
        if (!emailService.isDeliveryConfigured()) {
            return new AuthDtos.OtpResponse(false, token.getToken());
        }
        emailService.sendPasswordResetOtp(user, token.getToken());
        return new AuthDtos.OtpResponse(true, null);
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
        cleanupRefreshTokens(user);
        return new AuthDtos.AuthResponse(access, refresh.getToken(), mapper.user(user));
    }

    private void cleanupRefreshTokens(User user) {
        Instant now = Instant.now();
        refreshTokenRepository.deleteByRevokedTrueOrExpiresAtBefore(now);

        List<RefreshToken> activeTokens = refreshTokenRepository
                .findByUserAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtDesc(user, now);
        if (activeTokens.size() <= MAX_ACTIVE_REFRESH_TOKENS_PER_USER) {
            return;
        }

        refreshTokenRepository.deleteAll(activeTokens.subList(MAX_ACTIVE_REFRESH_TOKENS_PER_USER, activeTokens.size()));
    }
}
