package com.deang.sourtea.security;

import com.deang.sourtea.model.Role;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class JwtService {
    private static final String HEADER = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
    private final byte[] secret;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    @Autowired
    public JwtService(JwtSigningKey signingKey, ObjectMapper objectMapper) {
        this(signingKey, objectMapper, Clock.systemUTC());
    }

    JwtService(JwtSigningKey signingKey, ObjectMapper objectMapper, Clock clock) {
        this.secret = signingKey.value();
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public String createToken(AuthenticatedUser user) {
        validateIdentity(user);
        try {
            Map<String, Object> claims = new LinkedHashMap<>();
            claims.put("sub", user.userId().toString());
            claims.put("username", user.username());
            claims.put("role", user.role().name());
            if (user.merchantId() != null) claims.put("merchantId", user.merchantId());
            claims.put("exp", clock.instant().plusSeconds(60 * 60 * 8).getEpochSecond());

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
            String[] parts = token.split("\\.", -1);
            if (parts.length != 3 || !signatureMatches(parts[0] + "." + parts[1], parts[2])) return Optional.empty();
            JsonNode header = objectMapper.readTree(Base64.getUrlDecoder().decode(parts[0]));
            JsonNode claims = objectMapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
            if (!header.isObject()
                || !"HS256".equals(header.path("alg").asText())
                || !"JWT".equals(header.path("typ").asText())) {
                return Optional.empty();
            }
            return parseClaims(claims);
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    private Optional<AuthenticatedUser> parseClaims(JsonNode claims) {
        if (!claims.isObject()) return Optional.empty();

        JsonNode subjectClaim = claims.get("sub");
        JsonNode usernameClaim = claims.get("username");
        JsonNode roleClaim = claims.get("role");
        JsonNode expirationClaim = claims.get("exp");
        if (subjectClaim == null || !subjectClaim.isTextual()
            || usernameClaim == null || !usernameClaim.isTextual() || usernameClaim.textValue().isBlank()
            || roleClaim == null || !roleClaim.isTextual()
            || expirationClaim == null || !expirationClaim.isIntegralNumber() || !expirationClaim.canConvertToLong()
            || expirationClaim.longValue() <= clock.instant().getEpochSecond()) {
            return Optional.empty();
        }

        long userId = Long.parseLong(subjectClaim.textValue());
        if (userId <= 0) return Optional.empty();
        Role role = Role.valueOf(roleClaim.textValue());
        JsonNode merchantIdClaim = claims.get("merchantId");
        Long merchantId = null;
        if (role == Role.MERCHANT) {
            if (merchantIdClaim == null
                || !merchantIdClaim.isIntegralNumber()
                || !merchantIdClaim.canConvertToLong()
                || merchantIdClaim.longValue() <= 0) {
                return Optional.empty();
            }
            merchantId = merchantIdClaim.longValue();
        } else if (merchantIdClaim != null && !merchantIdClaim.isNull()) {
            return Optional.empty();
        }

        return Optional.of(new AuthenticatedUser(userId, usernameClaim.textValue(), role, merchantId));
    }

    private void validateIdentity(AuthenticatedUser user) {
        if (user == null
            || user.userId() == null || user.userId() <= 0
            || user.username() == null || user.username().isBlank()
            || user.role() == null
            || (user.role() == Role.MERCHANT && (user.merchantId() == null || user.merchantId() <= 0))
            || (user.role() != Role.MERCHANT && user.merchantId() != null)) {
            throw new IllegalArgumentException("Token identity claims are incomplete or inconsistent");
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
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
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
