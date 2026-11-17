package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.VocabularyDtos.Catalog;
import com.example.aptis.service.VocabularyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VocabularyController {
    private final VocabularyService service;

    @GetMapping("/vocabulary")
    public ApiResponse<Catalog> published() {
        return ApiResponse.ok(service.catalog(false));
    }

    @GetMapping("/admin/vocabulary")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Catalog> admin() {
        return ApiResponse.ok(service.catalog(true));
    }

    @PutMapping("/admin/vocabulary")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Catalog> save(@Valid @RequestBody Catalog request) {
        return ApiResponse.ok(service.save(request));
    }

    @ExceptionHandler({ObjectOptimisticLockingFailureException.class, DataIntegrityViolationException.class})
    public ResponseEntity<ApiResponse<Void>> concurrentSave(RuntimeException exception) {
        return ResponseEntity.status(409).body(ApiResponse.error(
                "Dữ liệu đã được cập nhật. Hãy tải lại trước khi lưu.", null));
    }
}
