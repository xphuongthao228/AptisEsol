package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.service.CoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class ProgressController {
    private final CoreService service;
    @GetMapping("/me") public ApiResponse<List<CoreDtos.ProgressResponse>> me(Authentication auth) { return ApiResponse.ok(service.myProgress(auth.getName())); }
    @GetMapping("/statistics") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<CoreDtos.StatisticsResponse> statistics() { return ApiResponse.ok(service.statistics()); }
}
