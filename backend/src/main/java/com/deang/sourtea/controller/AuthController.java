package com.deang.sourtea.controller;

import com.deang.sourtea.common.ApiResponse;
import com.deang.sourtea.common.ApiException;
import com.deang.sourtea.security.AccountAuthenticationService;
import com.deang.sourtea.security.AuthenticatedUser;
import com.deang.sourtea.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {
    private final JwtService jwtService;
    private final AccountAuthenticationService accountService;

    public AuthController(JwtService jwtService, AccountAuthenticationService accountService) {
        this.jwtService = jwtService;
        this.accountService = accountService;
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@RequestBody LoginRequest request) {
        if (request.role() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "角色由账号凭据决定，禁止在登录请求中指定");
        }
        AuthenticatedUser user = accountService.authenticate(request.username(), request.password())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "用户名或密码错误"));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("token", jwtService.createToken(user));
        response.put("userId", user.userId());
        response.put("id", user.userId());
        response.put("username", user.username());
        response.put("role", user.role());
        if (user.merchantId() != null) response.put("merchantId", user.merchantId());
        response.put("nickname", switch (user.role()) {
            case MERCHANT -> "出冬瓜酸茶工坊";
            case ADMIN -> "平台管理员";
            default -> "酸茶体验用户";
        });
        return ApiResponse.ok(response);
    }

    public record LoginRequest(String username, String password, String role) {
    }
}
