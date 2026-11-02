package com.example.aptis.config;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

/** Google login is optional; incomplete credentials must not prevent startup. */
public class GoogleOAuthConfigured implements Condition {
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        return StringUtils.hasText(context.getEnvironment().getProperty("GOOGLE_CLIENT_ID"))
                && StringUtils.hasText(context.getEnvironment().getProperty("GOOGLE_CLIENT_SECRET"));
    }
}
