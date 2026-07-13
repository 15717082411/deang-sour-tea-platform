package com.deang.sourtea.controller;

import com.deang.sourtea.common.ApiResponse;
import com.deang.sourtea.model.Merchant;
import com.deang.sourtea.service.PlatformStore;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/merchants")
@CrossOrigin
public class MerchantController {
    private final PlatformStore store;

    public MerchantController(PlatformStore store) {
        this.store = store;
    }

    @GetMapping
    public ApiResponse<List<Merchant>> list() {
        return ApiResponse.ok(store.listMerchants());
    }
}
