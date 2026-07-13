package com.deang.sourtea.security;

import com.deang.sourtea.model.Role;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            jwtService.parseRole(header.substring(7)).ifPresent(this::authenticate);
        }
        filterChain.doFilter(request, response);
    }

    private void authenticate(Role role) {
        var auth = new UsernamePasswordAuthenticationToken(
            role.name(),
            null,
            List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
