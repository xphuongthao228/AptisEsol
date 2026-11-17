package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.service.PublicStatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class PublicStatisticsController {
    private final PublicStatisticsService service;

    @GetMapping("/api/statistics/public")
    public ApiResponse<PublicStatisticsService.Statistics> get() {
        return ApiResponse.ok(service.get());
    }
}
