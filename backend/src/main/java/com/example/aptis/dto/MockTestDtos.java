package com.example.aptis.dto;

import com.example.aptis.enums.TestStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

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

    public record ResultRequest(@NotBlank @Size(max = 120) String mockTestId,
            @NotBlank @Size(max = 255) String title,
            @NotBlank @Size(max = 40) String skill,
            @NotNull @Min(0) @Max(200) Integer score,
            @NotNull @Min(1) @Max(200) Integer maxScore,
            @Size(max = 20) String cefrLevel,
            @NotBlank @Size(max = 1_000_000) String resultJson) {
    }

    public record ResultResponse(Long id, String mockTestId, String title, String skill, Integer score,
            Integer maxScore, String cefrLevel, String resultJson, LocalDateTime createdAt) {
    }
}
