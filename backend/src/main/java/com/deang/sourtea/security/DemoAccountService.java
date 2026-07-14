package com.deang.sourtea.security;

import com.deang.sourtea.model.Role;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
public class DemoAccountService {
    private final PasswordEncoder passwordEncoder;
    private final Map<String, DemoAccount> accounts;

    public DemoAccountService(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
        String passwordHash = passwordEncoder.encode("Demo123!");
        this.accounts = Map.of(
            "user_demo", new DemoAccount(1L, "user_demo", passwordHash, Role.USER, null),
            "merchant_demo", new DemoAccount(2L, "merchant_demo", passwordHash, Role.MERCHANT, 1L),
            "admin_demo", new DemoAccount(3L, "admin_demo", passwordHash, Role.ADMIN, null)
        );
    }

    public Optional<AuthenticatedUser> authenticate(String username, String password) {
        if (username == null || password == null) return Optional.empty();
        DemoAccount account = accounts.get(username.trim());
        if (account == null || !passwordEncoder.matches(password, account.passwordHash())) return Optional.empty();
        return Optional.of(new AuthenticatedUser(account.userId(), account.username(), account.role(), account.merchantId()));
    }

    private record DemoAccount(Long userId, String username, String passwordHash, Role role, Long merchantId) {
    }
}
