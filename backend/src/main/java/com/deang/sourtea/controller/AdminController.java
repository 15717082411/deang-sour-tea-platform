package com.deang.sourtea.controller;

import com.deang.sourtea.common.ApiResponse;
import com.deang.sourtea.model.Merchant;
import com.deang.sourtea.model.Product;
import com.deang.sourtea.service.PlatformStore;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin
public class AdminController {
    private final PlatformStore store;

    public AdminController(PlatformStore store) {
        this.store = store;
    }

    @PostMapping("/products/{id}/approve")
    public ApiResponse<Product> approveProduct(@PathVariable Long id) {
        return store.approveProduct(id)
            .map(ApiResponse::ok)
            .orElseGet(() -> ApiResponse.fail("product not found"));
    }

    @PostMapping("/merchants/{id}/approve")
    public ApiResponse<Merchant> approveMerchant(@PathVariable Long id) {
        return store.approveMerchant(id)
            .map(ApiResponse::ok)
            .orElseGet(() -> ApiResponse.fail("merchant not found"));
    }
}
