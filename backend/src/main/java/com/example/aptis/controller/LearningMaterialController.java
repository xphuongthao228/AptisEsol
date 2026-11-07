package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.entity.LearningMaterial;
import com.example.aptis.service.LearningMaterialService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/learning-materials")
@RequiredArgsConstructor
public class LearningMaterialController {
    private final LearningMaterialService service;

    @GetMapping
    public ApiResponse<List<LearningMaterial>> all(Authentication auth) {
        boolean admin = auth != null && auth.getAuthorities().stream().anyMatch(role -> "ROLE_ADMIN".equals(role.getAuthority()));
        return ApiResponse.ok(service.list(admin));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<LearningMaterial> create(@Valid @RequestBody LearningMaterialService.Request request) {
        return ApiResponse.ok(service.save(null, request));
    }

    @GetMapping("/{id}")
    public ApiResponse<LearningMaterial> detail(@PathVariable Long id) {
        return ApiResponse.ok(service.detail(id));
    }

    @GetMapping("/from-blog/{id}")
    public ApiResponse<LearningMaterial> fromBlog(@PathVariable Long id) {
        return ApiResponse.ok(service.fromBlog(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<LearningMaterial> update(@PathVariable Long id, @Valid @RequestBody LearningMaterialService.Request request) {
        return ApiResponse.ok(service.save(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ApiResponse.message("Đã xóa tài liệu", null);
    }
}
