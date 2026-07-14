package com.deang.sourtea.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

@Configuration(proxyBeanMethods = false)
public class JwtSecretConfiguration {
    private static final int MINIMUM_SECRET_BYTES = 32;

    @Bean
    JwtSigningKey jwtSigningKey(
        @Value("${app.jwt-secret:}") String configuredSecret,
        Environment environment
    ) {
        boolean demoOnly = StrictDemoMode.isActive(environment);
        if (configuredSecret == null || configuredSecret.isBlank()) {
            if (!demoOnly) {
                throw new IllegalStateException("JWT_SECRET is required outside the demo profile");
            }
            byte[] generatedSecret = new byte[MINIMUM_SECRET_BYTES];
            new SecureRandom().nextBytes(generatedSecret);
            return new JwtSigningKey(generatedSecret);
        }

        byte[] secret = configuredSecret.getBytes(StandardCharsets.UTF_8);
        if (secret.length < MINIMUM_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
        }
        return new JwtSigningKey(secret);
    }
}
