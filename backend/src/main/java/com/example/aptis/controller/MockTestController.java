package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.MockTestDtos;
import com.example.aptis.service.MockTestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/mock-tests")
@RequiredArgsConstructor
public class MockTestController {
    private final MockTestService service;

    @GetMapping
    public ApiResponse<List<MockTestDtos.MockTestResponse>> published() {
        return ApiResponse.ok(service.published());
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<MockTestDtos.MockTestResponse>> all() {
        return ApiResponse.ok(service.all());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<MockTestDtos.MockTestResponse> create(@Valid @RequestBody MockTestDtos.MockTestRequest request) {
        return ApiResponse.ok(service.save(request));
    }

    @PostMapping("/import-csv")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<MockTestDtos.MockTestResponse>> importCsv(@RequestParam("file") MultipartFile file) throws Exception {
        return ApiResponse.ok(service.importCsv(file));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<MockTestDtos.MockTestResponse> update(@PathVariable String id, @Valid @RequestBody MockTestDtos.MockTestRequest request) {
        return ApiResponse.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ApiResponse.message("Deleted", null);
    }
}
