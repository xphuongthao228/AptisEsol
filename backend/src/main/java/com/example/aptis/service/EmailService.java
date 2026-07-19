package com.example.aptis.service;

import com.example.aptis.entity.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

        private final ObjectMapper objectMapper;

        private final HttpClient httpClient = HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(20))
                        .followRedirects(HttpClient.Redirect.ALWAYS)
                        .build();

        @Value("${app.mail.enabled:false}")
        private boolean mailEnabled;

        @Value("${app.mail.gas-url:}")
        private String gasMailUrl;

        @Value("${app.mail.gas-secret:}")
        private String gasMailSecret;

        public void sendVerificationEmail(User user, String verificationLink) {
                if (!mailEnabled) {
                        log.info(
                                        "Mail disabled. Verification link for {}: {}",
                                        user.getEmail(),
                                        verificationLink);
                        return;
                }

                String textContent = """
                                Xin chào %s,

                                Bạn vừa đăng ký tài khoản Aptis ESOL.

                                Hãy bấm vào đường dẫn bên dưới để xác nhận email và hoàn tất đăng ký:

                                %s

                                Sau khi xác nhận, bạn mới có thể đăng nhập vào hệ thống.

                                Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.
                                """.formatted(displayName(user), verificationLink);

                String htmlContent = """
                                <!DOCTYPE html>
                                <html lang="vi">
                                <body style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px">
                                    <div style="max-width:560px;margin:auto;background:#ffffff;padding:28px;
                                                border-radius:12px;border:1px solid #e5e7eb">
                                        <h2 style="color:#1d4ed8;margin-top:0">Aptis ESOL</h2>

                                        <p>Xin chào <strong>%s</strong>,</p>

                                        <p>Bạn vừa đăng ký tài khoản Aptis ESOL.</p>

                                        <p>Hãy bấm vào nút bên dưới để xác nhận email:</p>

                                        <p style="text-align:center;margin:28px 0">
                                            <a href="%s"
                                               style="background:#1d4ed8;color:#ffffff;text-decoration:none;
                                                      padding:12px 20px;border-radius:8px;display:inline-block">
                                                Xác nhận email
                                            </a>
                                        </p>

                                        <p style="font-size:13px;color:#6b7280">
                                            Nếu nút không hoạt động, hãy sao chép đường dẫn sau:
                                        </p>

                                        <p style="font-size:13px;word-break:break-all;color:#374151">
                                            %s
                                        </p>

                                        <p style="color:#6b7280">
                                            Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.
                                        </p>
                                    </div>
                                </body>
                                </html>
                                """.formatted(
                                escapeHtml(displayName(user)),
                                escapeHtmlAttribute(verificationLink),
                                escapeHtml(verificationLink));

                sendEmail(
                                user.getEmail(),
                                "Xác nhận email Aptis ESOL",
                                textContent,
                                htmlContent,
                                "verification email");
        }

        public void sendRegistrationOtp(User user, String otp) {
                if (!mailEnabled) {
                        log.info(
                                        "Mail disabled. Registration OTP for {}: {}",
                                        user.getEmail(),
                                        otp);
                        return;
                }

                String textContent = """
                                Xin chào %s,

                                Mã OTP đăng ký tài khoản Aptis ESOL của bạn là:

                                %s

                                Nhập đúng mã này trên màn hình đăng ký để hoàn tất tạo tài khoản.

                                Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.
                                """.formatted(displayName(user), otp);

                String htmlContent = buildOtpHtml(
                                displayName(user),
                                "Mã OTP đăng ký tài khoản",
                                otp,
                                "Nhập đúng mã này trên màn hình đăng ký để hoàn tất tạo tài khoản.",
                                "Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.");

                sendEmail(
                                user.getEmail(),
                                "Mã OTP đăng ký Aptis ESOL",
                                textContent,
                                htmlContent,
                                "registration OTP");
        }

        public void sendPasswordResetOtp(User user, String otp) {
                if (!mailEnabled) {
                        log.info(
                                        "Mail disabled. Password reset OTP for {}: {}",
                                        user.getEmail(),
                                        otp);
                        return;
                }

                String textContent = """
                                Xin chào %s,

                                Mã OTP đặt lại mật khẩu Aptis ESOL của bạn là:

                                %s

                                Nhập mã này cùng mật khẩu mới để hoàn tất đặt lại mật khẩu.

                                Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này.
                                """.formatted(displayName(user), otp);

                String htmlContent = buildOtpHtml(
                                displayName(user),
                                "Mã OTP đặt lại mật khẩu",
                                otp,
                                "Nhập mã này cùng mật khẩu mới để hoàn tất đặt lại mật khẩu.",
                                "Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này.");

                sendEmail(
                                user.getEmail(),
                                "Mã OTP đặt lại mật khẩu Aptis ESOL",
                                textContent,
                                htmlContent,
                                "password reset OTP");
        }

        private void sendEmail(
                        String recipient,
                        String subject,
                        String textContent,
                        String htmlContent,
                        String mailType) {
                ensureGoogleAppsScriptConfigured();

                try {
                        log.info(
                                        "Sending {} through Google Apps Script to {}",
                                        mailType,
                                        recipient);

                        Map<String, String> payload = Map.of(
                                        "secret", gasMailSecret,
                                        "to", recipient,
                                        "subject", subject,
                                        "textBody", textContent,
                                        "htmlBody", htmlContent);

                        String jsonBody = objectMapper.writeValueAsString(payload);

                        HttpRequest request = HttpRequest.newBuilder()
                                        .uri(URI.create(gasMailUrl))
                                        .timeout(Duration.ofSeconds(30))
                                        .header("Content-Type", "application/json; charset=UTF-8")
                                        .POST(HttpRequest.BodyPublishers.ofString(
                                                        jsonBody,
                                                        StandardCharsets.UTF_8))
                                        .build();

                        HttpResponse<String> response = httpClient.send(
                                        request,
                                        HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

                        if (response.statusCode() < 200 || response.statusCode() >= 300) {
                                throw new IllegalStateException(
                                                "Google Apps Script trả về HTTP "
                                                                + response.statusCode()
                                                                + ". Response: "
                                                                + response.body());
                        }

                        JsonNode responseJson = objectMapper.readTree(response.body());

                        if (!responseJson.path("success").asBoolean(false)) {
                                String message = responseJson.path("message")
                                                .asText("Không rõ nguyên nhân");

                                throw new IllegalStateException(
                                                "Google Apps Script không gửi được email: " + message);
                        }

                        log.info(
                                        "{} sent successfully through Google Apps Script to {}",
                                        mailType,
                                        recipient);

                } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();

                        log.error(
                                        "Sending {} to {} was interrupted",
                                        mailType,
                                        recipient,
                                        e);

                        throw new IllegalStateException(
                                        "Quá trình gửi email bị gián đoạn",
                                        e);

                } catch (Exception e) {
                        log.error(
                                        "Failed to send {} through Google Apps Script to {}. Error: {}",
                                        mailType,
                                        recipient,
                                        e.getMessage(),
                                        e);

                        throw new IllegalStateException(
                                        "Không gửi được email qua Google Apps Script: "
                                                        + e.getMessage(),
                                        e);
                }
        }

        private void ensureGoogleAppsScriptConfigured() {
                if (gasMailUrl == null || gasMailUrl.isBlank()) {
                        throw new IllegalStateException(
                                        "Chưa cấu hình GAS_MAIL_URL");
                }

                if (gasMailSecret == null || gasMailSecret.isBlank()) {
                        throw new IllegalStateException(
                                        "Chưa cấu hình GAS_MAIL_SECRET");
                }

                if (!gasMailUrl.startsWith("https://script.google.com/")) {
                        throw new IllegalStateException(
                                        "GAS_MAIL_URL không hợp lệ");
                }

                if (!gasMailUrl.endsWith("/exec")) {
                        throw new IllegalStateException(
                                        "GAS_MAIL_URL phải là URL triển khai kết thúc bằng /exec");
                }
        }

        private String buildOtpHtml(
                        String name,
                        String title,
                        String otp,
                        String instruction,
                        String warning) {
                return """
                                <!DOCTYPE html>
                                <html lang="vi">
                                <body style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px">
                                    <div style="max-width:560px;margin:auto;background:#ffffff;padding:28px;
                                                border-radius:12px;border:1px solid #e5e7eb">
                                        <h2 style="color:#1d4ed8;margin-top:0">Aptis ESOL</h2>

                                        <p>Xin chào <strong>%s</strong>,</p>

                                        <p>%s</p>

                                        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;
                                                    text-align:center;padding:18px;margin:22px 0;
                                                    background:#eff6ff;border-radius:10px;color:#1d4ed8">
                                            %s
                                        </div>

                                        <p>%s</p>

                                        <p style="color:#6b7280">
                                            %s
                                        </p>

                                        <p style="font-size:13px;color:#9ca3af">
                                            Không cung cấp mã OTP cho bất kỳ ai.
                                        </p>
                                    </div>
                                </body>
                                </html>
                                """.formatted(
                                escapeHtml(name),
                                escapeHtml(title),
                                escapeHtml(otp),
                                escapeHtml(instruction),
                                escapeHtml(warning));
        }

        private String displayName(User user) {
                if (user.getFullName() == null || user.getFullName().isBlank()) {
                        return user.getEmail();
                }

                return user.getFullName();
        }

        private String escapeHtml(String value) {
                if (value == null) {
                        return "";
                }

                return value
                                .replace("&", "&amp;")
                                .replace("<", "&lt;")
                                .replace(">", "&gt;")
                                .replace("\"", "&quot;")
                                .replace("'", "&#39;");
        }

        private String escapeHtmlAttribute(String value) {
                return escapeHtml(value);
        }
}