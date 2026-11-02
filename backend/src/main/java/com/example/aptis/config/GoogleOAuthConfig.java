package com.example.aptis.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;

@Configuration(proxyBeanMethods = false)
@Conditional(GoogleOAuthConfigured.class)
public class GoogleOAuthConfig {
    @Bean
    ClientRegistrationRepository clientRegistrationRepository(
            @Value("${GOOGLE_CLIENT_ID}") String clientId,
            @Value("${GOOGLE_CLIENT_SECRET}") String clientSecret) {
        ClientRegistration google = CommonOAuth2Provider.GOOGLE.getBuilder("google")
                .clientId(clientId).clientSecret(clientSecret).build();
        return new InMemoryClientRegistrationRepository(google);
    }
}
