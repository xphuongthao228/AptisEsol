package com.example.aptis.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class AiDtos {
    public record WritingPartRequest(@NotBlank String title, String prompt, String answer) {
    }

    public record WritingScoreRequest(@NotEmpty List<@Valid WritingPartRequest> parts) {
    }

    public record SpeakingPartRequest(
            @NotBlank String title,
            @NotBlank String prompt,
            String transcript,
            String audioFileName,
            String audioContentType,
            Long audioSizeBytes) {
    }

    public record SpeakingScoreRequest(@NotEmpty List<@Valid SpeakingPartRequest> parts) {
    }

    public record LingoChatMessage(@NotBlank String role, @NotBlank String content) {
    }

    public record LingoChatRequest(@NotBlank String message, List<@Valid LingoChatMessage> history) {
    }

    public record CriteriaScore(String name, int score, String feedback) {
    }

    public record PartFeedback(String title, int score, String feedback) {
    }

    public record WritingScoreResponse(
            int overallScore,
            String cefrLevel,
            String summary,
            List<CriteriaScore> criteria,
            List<PartFeedback> parts,
            List<String> corrections,
            String suggestedAnswer) {
    }

    public record SpeakingScoreResponse(
            int overallScore,
            String cefrLevel,
            String summary,
            List<CriteriaScore> criteria,
            List<PartFeedback> parts,
            List<String> pronunciationTips,
            List<String> fluencyTips,
            String improvedAnswer) {
    }

    public record LingoChatResponse(String reply) {
    }

}
