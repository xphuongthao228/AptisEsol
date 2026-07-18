package com.example.aptis.service;

import com.example.aptis.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {
    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    public void sendVerificationEmail(User user, String verificationLink) {
        if (!mailEnabled) {
            log.info("Email verification link for {}: {}", user.getEmail(), verificationLink);
            return;
        }
        ensureMailConfigured();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(user.getEmail());
        message.setSubject("Xác nhận email Aptis ESOL");
        message.setText("""
                Xin chào %s,

                Bạn vừa đăng ký tài khoản Aptis ESOL.
                Hãy bấm vào link bên dưới để xác nhận Gmail/email và hoàn tất đăng ký:

                %s

                Sau khi xác nhận, bạn mới có thể đăng nhập vào hệ thống.
                Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.
                """.formatted(displayName(user), verificationLink));
        mailSender.send(message);
    }

    public void sendRegistrationOtp(User user, String otp) {
        if (!mailEnabled) {
            log.info("Registration OTP for {}: {}", user.getEmail(), otp);
            return;
        }
        ensureMailConfigured();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(user.getEmail());
        message.setSubject("Mã OTP đăng ký Aptis ESOL");
        message.setText("""
                Xin chào %s,

                Mã OTP đăng ký tài khoản Aptis ESOL của bạn là:

                %s

                Nhập đúng mã này trên màn hình đăng ký để hoàn tất tạo tài khoản.
                Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.
                """.formatted(displayName(user), otp));
        mailSender.send(message);
    }

    public void sendPasswordResetOtp(User user, String otp) {
        if (!mailEnabled) {
            log.info("Password reset OTP for {}: {}", user.getEmail(), otp);
            return;
        }
        ensureMailConfigured();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(user.getEmail());
        message.setSubject("Mã OTP đặt lại mật khẩu Aptis ESOL");
        message.setText("""
                Xin chào %s,

                Mã OTP đặt lại mật khẩu Aptis ESOL của bạn là:

                %s

                Nhập mã này cùng mật khẩu mới để hoàn tất đặt lại mật khẩu.
                Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này.
                """.formatted(displayName(user), otp));
        mailSender.send(message);
    }

    private void ensureMailConfigured() {
        if (fromEmail == null || fromEmail.isBlank() || mailPassword == null || mailPassword.isBlank()) {
            throw new IllegalStateException("Chưa cấu hình MAIL_USERNAME/MAIL_PASSWORD nên hệ thống không thể gửi OTP");
        }
    }

    private String displayName(User user) {
        if (user.getFullName() == null || user.getFullName().isBlank()) {
            return user.getEmail();
        }
        return user.getFullName();
    }
}
