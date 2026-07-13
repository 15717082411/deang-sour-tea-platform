package com.deang.sourtea.controller;

import com.deang.sourtea.common.ApiResponse;
import com.deang.sourtea.model.Content;
import com.deang.sourtea.service.PlatformStore;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contents")
@CrossOrigin
public class ContentController {
    private final PlatformStore store;

    public ContentController(PlatformStore store) {
        this.store = store;
    }

    @GetMapping
    public ApiResponse<List<Content>> list() {
        return ApiResponse.ok(store.listContents());
    }

    @PostMapping
    public ApiResponse<Content> create(@RequestBody Content content) {
        return ApiResponse.ok(store.createContent(content));
    }
}
