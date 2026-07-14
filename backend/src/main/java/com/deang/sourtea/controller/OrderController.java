package com.deang.sourtea.controller;

import com.deang.sourtea.common.ApiResponse;
import com.deang.sourtea.model.Order;
import com.deang.sourtea.security.AuthenticatedUser;
import com.deang.sourtea.service.PlatformStore;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin
public class OrderController {
    private final PlatformStore store;

    public OrderController(PlatformStore store) {
        this.store = store;
    }

    @GetMapping
    public ApiResponse<List<Order>> list(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(store.listOrdersByUserId(user.userId()));
    }

    @PostMapping
    public ApiResponse<Order> create(
        @RequestBody Map<String, List<Long>> body,
        @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return ApiResponse.ok(store.createOrder(user.userId(), body.getOrDefault("productIds", List.of())));
    }
}
