package com.deang.sourtea.security;

import java.util.Optional;

public interface AccountAuthenticationService {
    Optional<AuthenticatedUser> authenticate(String username, String password);
}
