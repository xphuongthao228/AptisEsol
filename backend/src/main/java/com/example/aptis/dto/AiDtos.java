package com.example.aptis.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.time.LocalDateTime;

public class AiDtos {
    public record PracticeGenerateRequest(@NotNull Long sourceTestId, Long sourceQuestionId, String sourcePrompt,
                                          @NotNull Integer part, @NotBlank String level, List<String> imageUrls) {}
    public record PracticeGenerateResponse(Long testId, String title, int questionCount, String generatedAnswer) {}
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

    public record LingoChatRequest(@NotBlank String message, List<@Valid LingoChatMessage> history, String level) {
    }

    public record SpeakingPart4SampleRequest(@NotEmpty List<@NotBlank String> topics, String level) {
    }

    public record CriteriaScore(String name, int score, String feedback) {
    }

    public record PartFeedback(String title, int score, String feedback) {
    }

    public record WritingCorrection(
            String partTitle,
            String original,
            String correction,
            String explanation) {
    }

    public record SpeakingAudioDiagnostic(
            String title,
            String status,
            boolean audioReceived,
            long audioSizeBytes,
            String transcript) {
    }

    public record SpeakingCorrection(
            String partTitle,
            String original,
            String correction,
            String explanation) {
    }

    public record WritingScoreResponse(
            int overallScore,
            String cefrLevel,
            String summary,
            List<CriteriaScore> criteria,
            List<PartFeedback> parts,
            List<WritingCorrection> corrections,
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
            String improvedAnswer,
            List<SpeakingCorrection> corrections,
            String sampleAnswer,
            List<SpeakingAudioDiagnostic> audioDiagnostics) {
    }

    public record LingoChatResponse(String reply) {
    }

    public record LingoChatHistoryResponse(Long id, String question, String reply, LocalDateTime createdAt) {
    }

    public record SpeakingPart4SampleResponse(String prompt, String sampleAnswer) {
    }

}
