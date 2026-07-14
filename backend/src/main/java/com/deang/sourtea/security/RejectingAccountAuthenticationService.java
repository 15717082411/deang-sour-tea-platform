package com.deang.sourtea.security;

import org.springframework.context.annotation.Conditional;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@Conditional(StrictDemoMode.DisabledCondition.class)
public class RejectingAccountAuthenticationService implements AccountAuthenticationService {
    @Override
    public Optional<AuthenticatedUser> authenticate(String username, String password) {
        return Optional.empty();
    }
}
