package com.example.aptis.dto;

import com.example.aptis.enums.MediaType;
import com.example.aptis.enums.NotificationAudience;
import com.example.aptis.enums.NotificationLevel;
import com.example.aptis.enums.QuestionType;
import com.example.aptis.enums.SkillType;
import com.example.aptis.enums.TestMode;
import com.example.aptis.enums.TestStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDateTime;
import java.util.List;

public class CoreDtos {
    public record UserUpdateRequest(@NotBlank String fullName, Boolean enabled) {}
    public record ExtendUserAccessRequest(@NotNull @Positive Integer days) {}
    public record SkillRequest(@NotNull SkillType type, @NotBlank String name, String description) {}
    public record SkillResponse(Long id, SkillType type, String name, String description) {}
    public record TestRequest(@NotNull Long skillId, @NotBlank String title, String description,
                              Integer durationMinutes, TestStatus status, TestMode mode) {}
    public record TestResponse(Long id, Long skillId, String skillName, String title, String description,
                               Integer durationMinutes, TestStatus status, TestMode mode, int questionCount) {}
    public record LessonRequest(@NotNull SkillType skill, @NotBlank String title, String summary,
                                @NotBlank String content, TestStatus status) {}
    public record LessonResponse(Long id, SkillType skill, String title, String summary, String content,
                                 TestStatus status, LocalDateTime updatedAt) {}
    public record PredictionRequest(@NotNull SkillType skill, @NotBlank String title, String summary,
                                    @NotBlank String content, String tags, Integer priority, TestStatus status) {}
    public record PredictionResponse(Long id, SkillType skill, String title, String summary, String content,
                                     String tags, Integer priority, TestStatus status, LocalDateTime updatedAt) {}
    public record AnswerRequest(String content, boolean correct, Integer sortOrder) {}
    public record AnswerResponse(Long id, String content, boolean correct, Integer sortOrder) {}
    public record QuestionRequest(@NotNull Long testId, QuestionType type, @NotBlank String content,
                                  String topic, String audioUrl, String scriptText, String explanation, Integer points, Integer sortOrder,
                                  List<AnswerRequest> answers) {}
    public record QuestionResponse(Long id, Long testId, QuestionType type, String content, String topic,
                                   String audioUrl, String scriptText, String explanation,
                                   Integer points, Integer sortOrder, List<AnswerResponse> answers) {}
    public record SubmitAnswerRequest(@NotNull Long questionId, Long answerId, String textAnswer) {}
    public record SubmissionRequest(@NotNull Long testId, List<SubmitAnswerRequest> answers) {}
    public record SubmissionResponse(Long id, Long testId, String testTitle, Integer totalScore, Integer maxScore,
                                     LocalDateTime createdAt) {}
    public record ProgressResponse(Long skillId, String skillName, Integer completedTests, Integer bestScore) {}
    public record MediaResponse(Long id, String originalName, String contentType, Long sizeBytes, MediaType type) {}
    public record StatisticsResponse(long users, long tests, long submissions, double averageScore) {}
    public record NotificationRequest(@NotBlank String title, @NotBlank String message,
                                      NotificationAudience audience, NotificationLevel level, Boolean active, Boolean pinned) {}
    public record NotificationResponse(Long id, String title, String message,
                                       NotificationAudience audience, NotificationLevel level, Boolean active,
                                       Boolean pinned, LocalDateTime createdAt, LocalDateTime updatedAt) {}
}
