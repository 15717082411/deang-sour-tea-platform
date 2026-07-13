package com.deang.sourtea.security;

import com.deang.sourtea.model.Role;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

@Service
public class JwtService {
    private final String secret;

    public JwtService(@Value("${app.jwt-secret}") String secret) {
        this.secret = secret;
    }

    public String createToken(Role role) {
        long expiresAt = Instant.now().plusSeconds(60 * 60 * 8).getEpochSecond();
        String payload = role.name() + ":" + expiresAt;
        String encodedPayload = base64(payload);
        return encodedPayload + "." + sign(encodedPayload);
    }

    public Optional<Role> parseRole(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 2 || !sign(parts[0]).equals(parts[1])) return Optional.empty();
            String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            String[] values = payload.split(":");
            if (values.length != 2 || Long.parseLong(values[1]) < Instant.now().getEpochSecond()) return Optional.empty();
            return Optional.of(Role.valueOf(values[0]));
        } catch (RuntimeException ex) {
            return Optional.empty();
        }
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return base64(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign token", ex);
        }
    }

    private String base64(String value) {
        return base64(value.getBytes(StandardCharsets.UTF_8));
    }

    private String base64(byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }
}
