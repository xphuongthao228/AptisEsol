package com.example.aptis.controller;

import com.example.aptis.dto.AiDtos;
import com.example.aptis.dto.ApiResponse;
import com.example.aptis.service.AiScoringService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {
    private final AiScoringService scoringService;

    @PostMapping("/writing/score")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.WritingScoreResponse> scoreWriting(@Valid @RequestBody AiDtos.WritingScoreRequest request) {
        return ApiResponse.ok(scoringService.scoreWriting(request));
    }

    @PostMapping("/speaking/score")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.SpeakingScoreResponse> scoreSpeaking(@Valid @RequestBody AiDtos.SpeakingScoreRequest request) {
        return ApiResponse.ok(scoringService.scoreSpeaking(request));
    }

    @PostMapping("/lingo/chat")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.LingoChatResponse> chatWithLingo(@Valid @RequestBody AiDtos.LingoChatRequest request) {
        return ApiResponse.ok(scoringService.chatWithLingo(request));
    }
}
