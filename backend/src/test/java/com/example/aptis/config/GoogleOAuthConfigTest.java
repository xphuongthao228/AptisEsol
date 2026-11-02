package com.example.aptis.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import static org.assertj.core.api.Assertions.assertThat;

class GoogleOAuthConfigTest {
    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withUserConfiguration(GoogleOAuthConfig.class);

    @Test
    void missingOrIncompleteCredentialsDisableGoogle() {
        context.withPropertyValues("GOOGLE_CLIENT_ID=", "GOOGLE_CLIENT_SECRET=")
                .run(c -> assertThat(c).doesNotHaveBean(ClientRegistrationRepository.class));
        context.withPropertyValues("GOOGLE_CLIENT_ID=test", "GOOGLE_CLIENT_SECRET= ")
                .run(c -> assertThat(c).doesNotHaveBean(ClientRegistrationRepository.class));
    }

    @Test
    void completeCredentialsEnableGoogle() {
        context.withPropertyValues("GOOGLE_CLIENT_ID=test-client", "GOOGLE_CLIENT_SECRET=test-secret")
                .run(c -> {
                    assertThat(c).hasSingleBean(ClientRegistrationRepository.class);
                    var google = c.getBean(ClientRegistrationRepository.class)
                            .findByRegistrationId("google");
                    assertThat(google.getClientId()).isEqualTo("test-client");
                    assertThat(google.getScopes()).contains("openid", "profile", "email");
                });
    }
}
