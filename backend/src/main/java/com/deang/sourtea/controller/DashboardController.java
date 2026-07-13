package com.deang.sourtea.controller;

import com.deang.sourtea.common.ApiResponse;
import com.deang.sourtea.service.PlatformStore;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin
public class DashboardController {
    private final PlatformStore store;

    public DashboardController(PlatformStore store) {
        this.store = store;
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> dashboard() {
        return ApiResponse.ok(store.dashboard());
    }
}
