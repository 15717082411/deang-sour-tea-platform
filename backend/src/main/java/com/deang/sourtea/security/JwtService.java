package com.deang.sourtea.security;

import com.deang.sourtea.model.Role;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class JwtService {
    private static final String HEADER = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
    private final String secret;
    private final ObjectMapper objectMapper;

    public JwtService(@Value("${app.jwt-secret}") String secret, ObjectMapper objectMapper) {
        this.secret = secret;
        this.objectMapper = objectMapper;
    }

    public String createToken(AuthenticatedUser user) {
        try {
            Map<String, Object> claims = new LinkedHashMap<>();
            claims.put("sub", user.userId().toString());
            claims.put("username", user.username());
            claims.put("role", user.role().name());
            if (user.merchantId() != null) claims.put("merchantId", user.merchantId());
            claims.put("exp", Instant.now().plusSeconds(60 * 60 * 8).getEpochSecond());

            String header = base64(HEADER);
            String payload = base64(objectMapper.writeValueAsBytes(claims));
            String unsignedToken = header + "." + payload;
            return unsignedToken + "." + sign(unsignedToken);
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to create token", exception);
        }
    }

    public Optional<AuthenticatedUser> parse(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3 || !signatureMatches(parts[0] + "." + parts[1], parts[2])) return Optional.empty();
            JsonNode header = objectMapper.readTree(Base64.getUrlDecoder().decode(parts[0]));
            JsonNode claims = objectMapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
            if (!"HS256".equals(header.path("alg").asText())) return Optional.empty();
            if (claims.path("exp").asLong(0) < Instant.now().getEpochSecond()) return Optional.empty();

            Long merchantId = claims.has("merchantId") ? claims.path("merchantId").asLong() : null;
            return Optional.of(new AuthenticatedUser(
                Long.valueOf(claims.path("sub").asText()),
                claims.path("username").asText(),
                Role.valueOf(claims.path("role").asText()),
                merchantId
            ));
        } catch (RuntimeException ex) {
            return Optional.empty();
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private boolean signatureMatches(String value, String signature) {
        return MessageDigest.isEqual(
            sign(value).getBytes(StandardCharsets.US_ASCII),
            signature.getBytes(StandardCharsets.US_ASCII)
        );
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
