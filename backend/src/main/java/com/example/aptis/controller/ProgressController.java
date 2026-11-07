package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.service.CoreService;
import com.example.aptis.service.LearningProgressService;
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
    private final LearningProgressService learning;
    @GetMapping("/roadmap") public ApiResponse<LearningProgressService.RoadmapProgress> roadmap(Authentication auth) {
        return ApiResponse.ok(learning.mine(auth.getName()));
    }
    public record CompletionRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 80) String unitKey) {}
    @PostMapping("/questions/{id}/complete") public ApiResponse<String> complete(Authentication auth, @PathVariable Long id,
            @jakarta.validation.Valid @RequestBody CompletionRequest request) {
        learning.complete(auth.getName(), id, request.unitKey());
        return ApiResponse.ok("Saved");
    }
    @PostMapping("/roadmap/guide") public ApiResponse<String> guide(Authentication auth) {
        learning.complete(auth.getName(), null, "guide");
        return ApiResponse.ok("Saved");
    }
    @PostMapping("/roadmap/predictions") public ApiResponse<String> predictions(Authentication auth) {
        learning.complete(auth.getName(), null, "predictions");
        return ApiResponse.ok("Saved");
    }
    @GetMapping("/me") public ApiResponse<List<CoreDtos.ProgressResponse>> me(Authentication auth) { return ApiResponse.ok(service.myProgress(auth.getName())); }
    @GetMapping("/statistics") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<CoreDtos.StatisticsResponse> statistics() { return ApiResponse.ok(service.statistics()); }
}
