package com.deang.sourtea.security;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

class DemoAccountServiceProfileTest {
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withUserConfiguration(TestConfiguration.class);

    @Test
    void demoProfileExposesDemoAccounts() {
        contextRunner
            .withPropertyValues("spring.profiles.active=demo")
            .run(context -> {
                assertThat(context).hasSingleBean(DemoAccountService.class);
                assertThat(context).hasSingleBean(AccountAuthenticationService.class);
                assertThat(context.getBean(AccountAuthenticationService.class)
                    .authenticate("user_demo", "Demo123!"))
                    .isPresent();
            });
    }

    @Test
    void mysqlProfileDoesNotExposeDemoAccounts() {
        contextRunner
            .withPropertyValues("spring.profiles.active=mysql")
            .run(context -> {
                assertThat(context).doesNotHaveBean(DemoAccountService.class);
                assertThat(context).hasSingleBean(AccountAuthenticationService.class);
                assertThat(context.getBean(AccountAuthenticationService.class)
                    .authenticate("admin_demo", "Demo123!"))
                    .isEmpty();
            });
    }

    @Test
    void nonDemoProfileDoesNotExposeDemoAccounts() {
        contextRunner
            .withPropertyValues("spring.profiles.active=prod")
            .run(context -> {
                assertThat(context).doesNotHaveBean(DemoAccountService.class);
                assertThat(context).hasSingleBean(AccountAuthenticationService.class);
                assertThat(context.getBean(AccountAuthenticationService.class)
                    .authenticate("user_demo", "Demo123!"))
                    .isEmpty();
            });
    }

    @Test
    void mysqlWinsWhenDemoAndMysqlProfilesAreBothActive() {
        contextRunner
            .withPropertyValues("spring.profiles.active=demo,mysql")
            .run(context -> {
                assertThat(context).doesNotHaveBean(DemoAccountService.class);
                assertThat(context).hasSingleBean(AccountAuthenticationService.class);
                assertThat(context.getBean(AccountAuthenticationService.class)
                    .authenticate("merchant_demo", "Demo123!"))
                    .isEmpty();
            });
    }

    @Configuration(proxyBeanMethods = false)
    @Import({DemoAccountService.class, RejectingAccountAuthenticationService.class})
    static class TestConfiguration {
        @Bean
        PasswordEncoder passwordEncoder() {
            return new BCryptPasswordEncoder();
        }
    }
}
