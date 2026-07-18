package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.enums.SkillType;
import com.example.aptis.service.CoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/predictions")
@RequiredArgsConstructor
public class PredictionController {
    private final CoreService service;

    @GetMapping
    public ApiResponse<List<CoreDtos.PredictionResponse>> all(
            @RequestParam(required = false) SkillType skill,
            @RequestParam(defaultValue = "false") boolean publishedOnly) {
        return ApiResponse.ok(service.predictions(skill, publishedOnly));
    }

    @GetMapping("/{id}")
    public ApiResponse<CoreDtos.PredictionResponse> one(@PathVariable Long id) {
        return ApiResponse.ok(service.prediction(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CoreDtos.PredictionResponse> create(@Valid @RequestBody CoreDtos.PredictionRequest request) {
        return ApiResponse.ok(service.savePrediction(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CoreDtos.PredictionResponse> update(@PathVariable Long id, @Valid @RequestBody CoreDtos.PredictionRequest request) {
        return ApiResponse.ok(service.updatePrediction(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.deletePrediction(id);
        return ApiResponse.message("Deleted", null);
    }
}
