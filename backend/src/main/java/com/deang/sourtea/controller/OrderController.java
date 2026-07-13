package com.deang.sourtea.controller;

import com.deang.sourtea.common.ApiResponse;
import com.deang.sourtea.model.Order;
import com.deang.sourtea.service.PlatformStore;
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
    public ApiResponse<List<Order>> list() {
        return ApiResponse.ok(store.listOrders());
    }

    @PostMapping
    public ApiResponse<Order> create(@RequestBody Map<String, List<Long>> body) {
        return ApiResponse.ok(store.createOrder(body.getOrDefault("productIds", List.of())));
    }

    @PostMapping("/{id}/ship")
    public ApiResponse<Order> ship(@PathVariable Long id) {
        return store.shipOrder(id).map(ApiResponse::ok).orElseGet(() -> ApiResponse.fail("order not found"));
    }
}
