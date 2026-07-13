package com.deang.sourtea.controller;

import com.deang.sourtea.common.ApiResponse;
import com.deang.sourtea.model.Role;
import com.deang.sourtea.security.JwtService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {
    private final JwtService jwtService;

    public AuthController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String role = body.getOrDefault("role", "USER");
        Role parsedRole = Role.valueOf(role);
        return ApiResponse.ok(Map.of(
            "token", jwtService.createToken(parsedRole),
            "role", parsedRole,
            "nickname", switch (role) {
                case "MERCHANT" -> "出冬瓜酸茶工坊";
                case "ADMIN" -> "平台管理员";
                default -> "酸茶体验用户";
            }
        ));
    }
}
