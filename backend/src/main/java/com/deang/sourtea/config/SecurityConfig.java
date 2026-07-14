package com.deang.sourtea.config;

import com.deang.sourtea.common.ApiResponse;
import com.deang.sourtea.security.JwtAuthenticationFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ObjectMapper objectMapper;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, ObjectMapper objectMapper) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.objectMapper = objectMapper;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/products", "/api/contents").permitAll()
                .requestMatchers("/api/admin/**", "/api/dashboard/**").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/products").hasRole("MERCHANT")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/bookings/verify").hasRole("ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/orders").hasRole("USER")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/orders").hasRole("USER")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/bookings").hasRole("USER")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/bookings").hasRole("USER")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/orders/*/ship").denyAll()
                .requestMatchers("/api/orders/**", "/api/bookings/**").denyAll()
                .requestMatchers("/api/merchants/**").hasAnyRole("MERCHANT", "ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/contents").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, exception) -> writeError(response, 401, "请先登录"))
                .accessDeniedHandler((request, response, exception) -> writeError(response, 403, "无权访问该资源"))
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private void writeError(jakarta.servlet.http.HttpServletResponse response, int status, String message)
        throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        objectMapper.writeValue(response.getWriter(), ApiResponse.fail(status, message));
    }
}
