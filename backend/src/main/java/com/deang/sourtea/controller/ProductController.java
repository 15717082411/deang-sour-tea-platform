package com.deang.sourtea.controller;

import com.deang.sourtea.common.ApiResponse;
import com.deang.sourtea.common.ApiException;
import com.deang.sourtea.model.Product;
import com.deang.sourtea.security.AuthenticatedUser;
import com.deang.sourtea.service.PlatformStore;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@CrossOrigin
public class ProductController {
    private final PlatformStore store;

    public ProductController(PlatformStore store) {
        this.store = store;
    }

    @GetMapping
    public ApiResponse<List<Product>> list() {
        return ApiResponse.ok(store.listProducts());
    }

    @PostMapping
    public ApiResponse<Product> create(
        @RequestBody Product product,
        @AuthenticationPrincipal AuthenticatedUser user
    ) {
        if (user == null || user.merchantId() == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "缺少商家身份");
        }
        product.setMerchantId(user.merchantId());
        return ApiResponse.ok(store.createProduct(product));
    }
}
