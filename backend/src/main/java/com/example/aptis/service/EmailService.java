package com.example.aptis.service;

import com.example.aptis.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
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
            log.info(
                    "Mail disabled. Verification link for {}: {}",
                    user.getEmail(),
                    verificationLink);
            return;
        }

        SimpleMailMessage message = createMessage(
                user,
                "Xác nhận email Aptis ESOL",
                """
                        Xin chào %s,

                        Bạn vừa đăng ký tài khoản Aptis ESOL.
                        Hãy bấm vào link bên dưới để xác nhận Gmail/email và hoàn tất đăng ký:

                        %s

                        Sau khi xác nhận, bạn mới có thể đăng nhập vào hệ thống.
                        Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.
                        """.formatted(displayName(user), verificationLink));

        sendMessage(message, user.getEmail(), "verification email");
    }

    public void sendRegistrationOtp(User user, String otp) {
        if (!mailEnabled) {
            log.info(
                    "Mail disabled. Registration OTP for {}: {}",
                    user.getEmail(),
                    otp);
            return;
        }

        SimpleMailMessage message = createMessage(
                user,
                "Mã OTP đăng ký Aptis ESOL",
                """
                        Xin chào %s,

                        Mã OTP đăng ký tài khoản Aptis ESOL của bạn là:

                        %s

                        Nhập đúng mã này trên màn hình đăng ký để hoàn tất tạo tài khoản.
                        Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.
                        """.formatted(displayName(user), otp));

        sendMessage(message, user.getEmail(), "registration OTP");
    }

    public void sendPasswordResetOtp(User user, String otp) {
        if (!mailEnabled) {
            log.info(
                    "Mail disabled. Password reset OTP for {}: {}",
                    user.getEmail(),
                    otp);
            return;
        }

        SimpleMailMessage message = createMessage(
                user,
                "Mã OTP đặt lại mật khẩu Aptis ESOL",
                """
                        Xin chào %s,

                        Mã OTP đặt lại mật khẩu Aptis ESOL của bạn là:

                        %s

                        Nhập mã này cùng mật khẩu mới để hoàn tất đặt lại mật khẩu.
                        Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này.
                        """.formatted(displayName(user), otp));

        sendMessage(message, user.getEmail(), "password reset OTP");
    }

    private SimpleMailMessage createMessage(
            User user,
            String subject,
            String content) {
        ensureMailConfigured();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(user.getEmail());
        message.setSubject(subject);
        message.setText(content);

        return message;
    }

    private void sendMessage(
            SimpleMailMessage message,
            String recipient,
            String mailType) {
        try {
            log.info(
                    "Sending {} from {} to {}",
                    mailType,
                    fromEmail,
                    recipient);

            mailSender.send(message);

            log.info(
                    "{} sent successfully to {}",
                    mailType,
                    recipient);
        } catch (MailException e) {
            log.error(
                    "Failed to send {} from {} to {}. Error type: {}. Message: {}",
                    mailType,
                    fromEmail,
                    recipient,
                    e.getClass().getName(),
                    e.getMessage(),
                    e);

            throw new IllegalStateException(
                    "Không gửi được email OTP. Lỗi kết nối hoặc xác thực máy chủ email.",
                    e);
        } catch (Exception e) {
            log.error(
                    "Unexpected error while sending {} to {}: {}",
                    mailType,
                    recipient,
                    e.getMessage(),
                    e);

            throw new IllegalStateException(
                    "Không gửi được email do lỗi hệ thống.",
                    e);
        }
    }

    private void ensureMailConfigured() {
        if (fromEmail == null || fromEmail.isBlank()) {
            throw new IllegalStateException(
                    "Chưa cấu hình MAIL_USERNAME nên hệ thống không thể gửi email");
        }

        if (mailPassword == null || mailPassword.isBlank()) {
            throw new IllegalStateException(
                    "Chưa cấu hình MAIL_PASSWORD nên hệ thống không thể gửi email");
        }
    }

    private String displayName(User user) {
        if (user.getFullName() == null || user.getFullName().isBlank()) {
            return user.getEmail();
        }

        return user.getFullName();
    }
}