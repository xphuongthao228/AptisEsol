package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.service.CoreService;
import com.example.aptis.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class SubmissionController {
    private final CoreService service;
    private final PaymentService paymentService;

    @PostMapping
    public ApiResponse<CoreDtos.SubmissionResponse> submit(Authentication auth,
            @Valid @RequestBody CoreDtos.SubmissionRequest request) {
        if (!paymentService.canAccessTest(auth.getName(), request.testId())) {
            throw new AccessDeniedException("Test requires Pro access");
        }
        return ApiResponse.ok(service.submit(auth.getName(), request));
    }

    @PostMapping("/practice-score")
    public ApiResponse<CoreDtos.SubmissionAnswerResponse> savePracticeScore(Authentication auth,
            @Valid @RequestBody CoreDtos.PracticeScoreRequest request) {
        return ApiResponse.ok(service.savePracticeScore(auth.getName(), request));
    }

    @GetMapping("/my-results")
    public ApiResponse<List<CoreDtos.SubmissionResponse>> mine(Authentication auth) {
        return ApiResponse.ok(service.myResults(auth.getName()));
    }

    @GetMapping("/leaderboard")
    public ApiResponse<List<CoreDtos.LeaderboardRowResponse>> leaderboard() {
        return ApiResponse.ok(service.leaderboard());
    }

    @GetMapping("/leaderboard/settings")
    public ApiResponse<CoreDtos.LeaderboardSettingsResponse> leaderboardSettings() {
        return ApiResponse.ok(service.leaderboardSettings());
    }

    @PutMapping("/leaderboard/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CoreDtos.LeaderboardSettingsResponse> updateLeaderboardSettings(
            @Valid @RequestBody CoreDtos.LeaderboardSettingsRequest request) {
        return ApiResponse.ok(service.updateLeaderboardSettings(request));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<CoreDtos.SubmissionResponse>> all() {
        return ApiResponse.ok(service.allResults());
    }

    @GetMapping("/{id}")
    public ApiResponse<CoreDtos.SubmissionResponse> one(Authentication auth, @PathVariable Long id) {
        boolean admin = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
        return ApiResponse.ok(service.submission(id, auth.getName(), admin));
    }
}
