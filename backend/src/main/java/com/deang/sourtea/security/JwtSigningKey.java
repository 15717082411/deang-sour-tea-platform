package com.deang.sourtea.security;

public final class JwtSigningKey {
    private final byte[] value;

    JwtSigningKey(byte[] value) {
        this.value = value.clone();
    }

    byte[] value() {
        return value.clone();
    }
}
