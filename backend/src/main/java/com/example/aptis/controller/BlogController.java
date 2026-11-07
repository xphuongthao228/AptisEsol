package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.entity.BlogPost;
import com.example.aptis.service.BlogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/blog")
@RequiredArgsConstructor
public class BlogController {
    private final BlogService service;
    @GetMapping
    public ApiResponse<List<BlogService.Preview>> list() { return ApiResponse.ok(service.published()); }
    @GetMapping("/{id:[0-9]+}")
    public ApiResponse<BlogPost> detail(@PathVariable Long id) { return ApiResponse.ok(service.detail(id)); }
    @GetMapping("/manage")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<BlogPost>> manage() { return ApiResponse.ok(service.adminList()); }
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<BlogPost> create(@Valid @RequestBody BlogService.Request request) { return ApiResponse.ok(service.save(null, request)); }
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<BlogPost> update(@PathVariable Long id, @Valid @RequestBody BlogService.Request request) { return ApiResponse.ok(service.save(id, request)); }
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) { service.delete(id); return ApiResponse.ok(null); }
}
