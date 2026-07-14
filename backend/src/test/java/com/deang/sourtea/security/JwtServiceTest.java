package com.deang.sourtea.security;

import com.deang.sourtea.model.Role;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.params.provider.Arguments.arguments;

class JwtServiceTest {
    private static final String TEST_SECRET = "test-only-32-byte-minimum-secret-value";
    private static final Instant NOW = Instant.parse("2026-07-14T03:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final JwtSigningKey signingKey = new JwtSigningKey(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
    private final JwtService jwtService = new JwtService(signingKey, objectMapper, CLOCK);

    @Test
    void roundTripsCompleteUserClaims() {
        AuthenticatedUser user = new AuthenticatedUser(7L, "secure_user", Role.USER, null);

        assertThat(jwtService.parse(jwtService.createToken(user))).contains(user);
    }

    @Test
    void roundTripsCompleteMerchantClaims() {
        AuthenticatedUser merchant = new AuthenticatedUser(8L, "secure_merchant", Role.MERCHANT, 42L);

        assertThat(jwtService.parse(jwtService.createToken(merchant))).contains(merchant);
    }

    @Test
    void rejectsTamperedSignature() {
        String token = jwtService.createToken(new AuthenticatedUser(7L, "secure_user", Role.USER, null));
        char replacement = token.charAt(token.length() - 1) == 'A' ? 'B' : 'A';
        String tampered = token.substring(0, token.length() - 1) + replacement;

        assertThat(jwtService.parse(tampered)).isEmpty();
    }

    @Test
    void rejectsTokenExpiredBeforeCurrentSecond() throws Exception {
        Map<String, Object> claims = completeClaims(Role.USER);
        claims.put("exp", NOW.getEpochSecond() - 1);

        assertThat(jwtService.parse(signedToken(claims))).isEmpty();
    }

    @Test
    void rejectsTokenExpiringAtCurrentSecond() throws Exception {
        Map<String, Object> claims = completeClaims(Role.USER);
        claims.put("exp", NOW.getEpochSecond());

        assertThat(jwtService.parse(signedToken(claims))).isEmpty();
    }

    @ParameterizedTest(name = "missing {0}")
    @MethodSource("missingRequiredClaims")
    void rejectsMissingRequiredClaims(String claimName, Map<String, Object> claims) throws Exception {
        assertThat(jwtService.parse(signedToken(claims)))
            .as("missing claim %s", claimName)
            .isEmpty();
    }

    @ParameterizedTest(name = "malformed {0}")
    @MethodSource("malformedClaims")
    void rejectsMalformedClaims(String claimName, Map<String, Object> claims) throws Exception {
        assertThat(jwtService.parse(signedToken(claims)))
            .as("malformed claim %s", claimName)
            .isEmpty();
    }

    @Test
    void rejectsMerchantWithoutMerchantId() throws Exception {
        Map<String, Object> claims = completeClaims(Role.MERCHANT);
        claims.remove("merchantId");

        assertThat(jwtService.parse(signedToken(claims))).isEmpty();
    }

    @Test
    void rejectsNonMerchantWithMerchantId() throws Exception {
        Map<String, Object> claims = completeClaims(Role.USER);
        claims.put("merchantId", 42L);

        assertThat(jwtService.parse(signedToken(claims))).isEmpty();
    }

    @Test
    void refusesToIssueIncompleteIdentityClaims() {
        assertThatThrownBy(() -> jwtService.createToken(
            new AuthenticatedUser(8L, "secure_merchant", Role.MERCHANT, null)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    private static Stream<Arguments> missingRequiredClaims() {
        return Stream.of("sub", "username", "role", "exp")
            .map(name -> {
                Map<String, Object> claims = completeClaims(Role.USER);
                claims.remove(name);
                return arguments(name, claims);
            });
    }

    private static Stream<Arguments> malformedClaims() {
        Map<String, Object> numericSubject = completeClaims(Role.USER);
        numericSubject.put("sub", 7L);
        Map<String, Object> blankUsername = completeClaims(Role.USER);
        blankUsername.put("username", "   ");
        Map<String, Object> stringExpiration = completeClaims(Role.USER);
        stringExpiration.put("exp", Long.toString(NOW.plusSeconds(60).getEpochSecond()));
        Map<String, Object> stringMerchantId = completeClaims(Role.MERCHANT);
        stringMerchantId.put("merchantId", "42");
        return Stream.of(
            arguments("sub", numericSubject),
            arguments("username", blankUsername),
            arguments("exp", stringExpiration),
            arguments("merchantId", stringMerchantId)
        );
    }

    private static Map<String, Object> completeClaims(Role role) {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("sub", "7");
        claims.put("username", "secure_user");
        claims.put("role", role.name());
        if (role == Role.MERCHANT) {
            claims.put("merchantId", 42L);
        }
        claims.put("exp", NOW.plusSeconds(60).getEpochSecond());
        return claims;
    }

    private String signedToken(Map<String, Object> claims) throws Exception {
        String header = encode(objectMapper.writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));
        String payload = encode(objectMapper.writeValueAsBytes(claims));
        String unsignedToken = header + "." + payload;

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(TEST_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return unsignedToken + "." + encode(mac.doFinal(unsignedToken.getBytes(StandardCharsets.UTF_8)));
    }

    private String encode(byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }
}
