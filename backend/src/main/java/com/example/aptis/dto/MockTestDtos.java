package com.example.aptis.dto;

import com.example.aptis.enums.TestStatus;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

public class MockTestDtos {
    public record MockTestRequest(String externalId, @NotBlank String skill, @NotBlank String title,
            String description, String questions, String questionData, String minutes, TestStatus status,
            Boolean featured) {
    }

    public record MockTestResponse(Long id, String externalId, String skill, String title, String description,
            String questions, String questionData, String minutes, TestStatus status, Boolean featured,
            LocalDateTime updatedAt) {
    }
}
