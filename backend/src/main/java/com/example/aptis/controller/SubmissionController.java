package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.service.CoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class SubmissionController {
    private final CoreService service;
    @PostMapping @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)") public ApiResponse<CoreDtos.SubmissionResponse> submit(Authentication auth, @Valid @RequestBody CoreDtos.SubmissionRequest request) { return ApiResponse.ok(service.submit(auth.getName(), request)); }
    @GetMapping("/my-results") public ApiResponse<List<CoreDtos.SubmissionResponse>> mine(Authentication auth) { return ApiResponse.ok(service.myResults(auth.getName())); }
    @GetMapping @PreAuthorize("hasRole('ADMIN')") public ApiResponse<List<CoreDtos.SubmissionResponse>> all() { return ApiResponse.ok(service.allResults()); }
    @GetMapping("/{id}") public ApiResponse<CoreDtos.SubmissionResponse> one(@PathVariable Long id) { return ApiResponse.ok(service.submission(id)); }
}
