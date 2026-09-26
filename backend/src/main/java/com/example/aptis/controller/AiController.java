package com.example.aptis.controller;

import com.example.aptis.dto.AiDtos;
import com.example.aptis.dto.ApiResponse;
import com.example.aptis.enums.AiScoringUsageType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.aptis.service.AiScoringService;
import com.example.aptis.service.AiScoringUsageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.security.Principal;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {
    private final AiScoringService scoringService;
    private final AiScoringUsageService usageService;
    private final ObjectMapper objectMapper;

    @PostMapping("/writing/score")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.WritingScoreResponse> scoreWriting(Principal principal, @Valid @RequestBody AiDtos.WritingScoreRequest request) {
        return ApiResponse.ok(withUsage(principal.getName(), AiScoringUsageType.WRITING,
                () -> scoringService.scoreWriting(request)));
    }

    @PostMapping("/speaking/score")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.SpeakingScoreResponse> scoreSpeaking(Principal principal, @Valid @RequestBody AiDtos.SpeakingScoreRequest request) {
        return ApiResponse.ok(withUsage(principal.getName(), AiScoringUsageType.SPEAKING_FULL_TEST,
                () -> scoringService.scoreSpeaking(request)));
    }

    @PostMapping("/speaking/part4-sample")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.SpeakingPart4SampleResponse> generateSpeakingPart4Sample(
            Principal principal,
            @Valid @RequestBody AiDtos.SpeakingPart4SampleRequest request) {
        throw new IllegalStateException("Tính năng gộp đề Speaking đang tạm tắt.");
    }

    @PostMapping(value = "/speaking/score-audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.SpeakingScoreResponse> scoreSpeakingAudio(
            Principal principal,
            @RequestPart("payload") String payload,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) throws Exception {
        AiDtos.SpeakingScoreRequest request = objectMapper.readValue(payload, AiDtos.SpeakingScoreRequest.class);
        return ApiResponse.ok(withUsage(principal.getName(), AiScoringUsageType.SPEAKING_FULL_TEST,
                () -> scoringService.scoreSpeaking(request, files == null ? List.of() : files)));
    }

    @PostMapping("/lingo/chat")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.LingoChatResponse> chatWithLingo(Principal principal, @Valid @RequestBody AiDtos.LingoChatRequest request) {
        throw new IllegalStateException("Lingo Chat đang tạm tắt.");
    }

    private <T> T withUsage(String email, AiScoringUsageType usageType, AiCall<T> call) {
        usageService.consume(email, usageType);
        try {
            return call.execute();
        } catch (RuntimeException ex) {
            usageService.refund(email, usageType);
            throw ex;
        }
    }

    @FunctionalInterface
    private interface AiCall<T> {
        T execute();
    }
}
