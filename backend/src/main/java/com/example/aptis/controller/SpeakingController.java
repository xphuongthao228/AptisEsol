package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.SpeakingDtos;
import com.example.aptis.enums.AiScoringUsageType;
import com.example.aptis.service.AiScoringUsageService;
import com.example.aptis.service.SpeakingAssessmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;

@RestController
@RequestMapping("/api/speaking")
@RequiredArgsConstructor
public class SpeakingController {
    private final SpeakingAssessmentService service;
    private final AiScoringUsageService usageService;

    @PostMapping("/submit")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<SpeakingDtos.SubmitResponse> submit(
            Principal principal,
            @RequestParam Long studentId,
            @RequestParam Long testId,
            @RequestParam String part,
            @RequestParam String question,
            @RequestPart("audio") MultipartFile audio) {
        usageService.consume(principal.getName(), AiScoringUsageType.SPEAKING);
        try {
            return ApiResponse.ok(service.submit(principal.getName(), studentId, testId, part, question, audio));
        } catch (RuntimeException ex) {
            usageService.refund(principal.getName(), AiScoringUsageType.SPEAKING);
            throw ex;
        }
    }
}
