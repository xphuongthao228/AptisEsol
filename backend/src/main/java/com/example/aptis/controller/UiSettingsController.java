package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.service.CoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ui-settings")
@RequiredArgsConstructor
public class UiSettingsController {
    private final CoreService service;

    @GetMapping
    public ApiResponse<CoreDtos.UiSettingsResponse> get() {
        return ApiResponse.ok(service.uiSettings());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CoreDtos.UiSettingsResponse> update(@Valid @RequestBody CoreDtos.UiSettingsRequest request) {
        return ApiResponse.ok(service.updateUiSettings(request));
    }
}
