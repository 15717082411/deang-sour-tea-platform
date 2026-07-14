package com.deang.sourtea.security;

import com.deang.sourtea.model.Role;

import java.security.Principal;

public record AuthenticatedUser(Long userId, String username, Role role, Long merchantId) implements Principal {
    @Override
    public String getName() {
        return username;
    }
}
