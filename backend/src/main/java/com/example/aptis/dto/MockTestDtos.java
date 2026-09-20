package com.example.aptis.dto;

import com.example.aptis.enums.TestStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public class MockTestDtos {
    public record MockTestRequest(String externalId, @NotBlank String skill, @NotBlank String title,
            String description, String questions, String questionData, String minutes, TestStatus status,
            Boolean featured) {
    }

    public record MockTestResponse(Long id, String externalId, String skill, String title, String description,
            String questions, String questionData, String minutes, TestStatus status, Boolean featured,
            LocalDateTime updatedAt, boolean accessible, Integer accessOrder) {
    }

    public record ResultRequest(@NotBlank String mockTestId, @NotBlank String title, @NotBlank String skill,
            @NotNull Integer score, @NotNull Integer maxScore, String cefrLevel, @NotBlank String resultJson) {
    }

    public record ResultResponse(Long id, String mockTestId, String title, String skill, Integer score,
            Integer maxScore, String cefrLevel, String resultJson, LocalDateTime createdAt) {
    }
}
