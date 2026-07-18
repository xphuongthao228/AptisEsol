package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.service.CoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/tests")
@RequiredArgsConstructor
public class TestController {
    private final CoreService service;
    @GetMapping public ApiResponse<List<CoreDtos.TestResponse>> all() { return ApiResponse.ok(service.tests()); }
    @GetMapping("/{id}") public ApiResponse<CoreDtos.TestResponse> one(@PathVariable Long id) { return ApiResponse.ok(service.test(id)); }
    @PostMapping @PreAuthorize("hasRole('ADMIN')") public ApiResponse<CoreDtos.TestResponse> create(@Valid @RequestBody CoreDtos.TestRequest request) { return ApiResponse.ok(service.saveTest(request)); }
    @PostMapping("/import-csv") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<List<CoreDtos.TestResponse>> importCsv(@RequestParam("file") MultipartFile file) throws Exception { return ApiResponse.ok(service.importTests(file)); }
    @PutMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<CoreDtos.TestResponse> update(@PathVariable Long id, @Valid @RequestBody CoreDtos.TestRequest request) { return ApiResponse.ok(service.updateTest(id, request)); }
    @DeleteMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Void> delete(@PathVariable Long id) { service.deleteTest(id); return ApiResponse.message("Deleted", null); }
}
