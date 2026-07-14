package com.deang.sourtea.security;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class JwtSecretConfigurationTest {
    private static final String STRONG_SECRET = "test-only-32-byte-minimum-secret-value";
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withUserConfiguration(JwtSecretConfiguration.class);

    @Test
    void demoWithoutConfiguredSecretGeneratesANewStrongKeyForEachContext() {
        List<String> generatedKeys = new ArrayList<>();

        runWithSecret("demo", "", generatedKeys);
        runWithSecret("demo", "", generatedKeys);

        assertThat(generatedKeys).hasSize(2);
        assertThat(generatedKeys.get(0)).isNotEqualTo(generatedKeys.get(1));
    }

    @Test
    void demoAcceptsStrongExternalSecretOverride() {
        contextRunner
            .withPropertyValues("spring.profiles.active=demo", "app.jwt-secret=" + STRONG_SECRET)
            .run(context -> {
                assertThat(context).hasSingleBean(JwtSigningKey.class);
                assertThat(context.getBean(JwtSigningKey.class).value())
                    .isEqualTo(STRONG_SECRET.getBytes(StandardCharsets.UTF_8));
            });
    }

    @Test
    void mysqlWithoutExternalSecretFailsStartup() {
        assertStartupFails("mysql", "", "JWT_SECRET is required");
    }

    @Test
    void nonDemoWithoutExternalSecretFailsStartup() {
        assertStartupFails("prod", "", "JWT_SECRET is required");
    }

    @Test
    void mysqlRejectsShortExternalSecret() {
        assertStartupFails("mysql", "too-short", "at least 32 bytes");
    }

    @Test
    void mysqlWithStrongExternalSecretStartsSecurityConfiguration() {
        contextRunner
            .withPropertyValues("spring.profiles.active=mysql", "app.jwt-secret=" + STRONG_SECRET)
            .run(context -> {
                assertThat(context).hasNotFailed();
                assertThat(context).hasSingleBean(JwtSigningKey.class);
            });
    }

    @Test
    void mysqlRequirementsWinWhenDemoAndMysqlProfilesAreBothActive() {
        assertStartupFails("demo,mysql", "", "JWT_SECRET is required");
    }

    @Test
    void packagedDemoConfigurationContainsNoJwtSigningSecret() throws Exception {
        String yaml = new ClassPathResource("application-demo.yml")
            .getContentAsString(StandardCharsets.UTF_8);

        assertThat(yaml).doesNotContain("jwt-secret");
    }

    private void runWithSecret(String profiles, String secret, List<String> keys) {
        contextRunner
            .withPropertyValues("spring.profiles.active=" + profiles, "app.jwt-secret=" + secret)
            .run(context -> {
                assertThat(context).hasNotFailed();
                byte[] key = context.getBean(JwtSigningKey.class).value();
                assertThat(key).hasSizeGreaterThanOrEqualTo(32);
                keys.add(Base64.getEncoder().encodeToString(key));
            });
    }

    private void assertStartupFails(String profiles, String secret, String expectedMessage) {
        contextRunner
            .withPropertyValues("spring.profiles.active=" + profiles, "app.jwt-secret=" + secret)
            .run(context -> {
                assertThat(context).hasFailed();
                assertThat(rootCause(context.getStartupFailure()))
                    .hasMessageContaining(expectedMessage);
            });
    }

    private Throwable rootCause(Throwable failure) {
        Throwable cause = failure;
        while (cause.getCause() != null) {
            cause = cause.getCause();
        }
        return cause;
    }
}
