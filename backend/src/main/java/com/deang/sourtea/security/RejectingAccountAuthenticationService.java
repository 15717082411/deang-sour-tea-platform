package com.deang.sourtea.security;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@Profile("!demo | mysql")
public class RejectingAccountAuthenticationService implements AccountAuthenticationService {
    @Override
    public Optional<AuthenticatedUser> authenticate(String username, String password) {
        return Optional.empty();
    }
}
