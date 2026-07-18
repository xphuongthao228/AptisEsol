package com.example.aptis.mapper;

import com.example.aptis.dto.AuthDtos;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.entity.*;
import com.example.aptis.enums.RoleName;
import com.example.aptis.enums.TestMode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class DtoMapper {
    @Value("${app.subscription.free-trial-days:2}")
    private int freeTrialDays;

    public AuthDtos.UserResponse user(User user) {
        Set<RoleName> roles = user.getRoles().stream().map(Role::getName).collect(Collectors.toSet());
        LocalDateTime trialExpiresAt = user.getCreatedAt() == null ? null : user.getCreatedAt().plusDays(freeTrialDays);
        LocalDateTime proExpiresAt = user.getProExpiresAt();
        LocalDateTime accessExpiresAt = proExpiresAt;
        if (accessExpiresAt == null || (trialExpiresAt != null && trialExpiresAt.isAfter(accessExpiresAt))) {
            accessExpiresAt = trialExpiresAt;
        }
        return new AuthDtos.UserResponse(user.getId(), user.getEmail(), user.getFullName(), roles, user.isEnabled(), user.getProExpiresAt(), accessExpiresAt);
    }

    public CoreDtos.SkillResponse skill(Skill skill) {
        return new CoreDtos.SkillResponse(skill.getId(), skill.getType(), skill.getName(), skill.getDescription());
    }

    public CoreDtos.TestResponse test(Test test) {
        return test(test, 0);
    }

    public CoreDtos.TestResponse test(Test test, int questionCount) {
        return new CoreDtos.TestResponse(test.getId(), test.getSkill().getId(), test.getSkill().getName(),
                test.getTitle(), test.getDescription(), test.getDurationMinutes(), test.getStatus(),
                resolveTestMode(test), questionCount);
    }

    public CoreDtos.LessonResponse lesson(Lesson lesson) {
        return new CoreDtos.LessonResponse(lesson.getId(), lesson.getSkill(), lesson.getTitle(),
                lesson.getSummary(), lesson.getContent(), lesson.getStatus(), lesson.getUpdatedAt());
    }

    public CoreDtos.PredictionResponse prediction(Prediction prediction) {
        return new CoreDtos.PredictionResponse(prediction.getId(), prediction.getSkill(), prediction.getTitle(),
                prediction.getSummary(), prediction.getContent(), prediction.getTags(), prediction.getPriority(),
                prediction.getStatus(), prediction.getUpdatedAt());
    }

    private TestMode resolveTestMode(Test test) {
        if (test.getMode() != null) return test.getMode();
        String value = normalizeText((test.getTitle() == null ? "" : test.getTitle()) + " " +
                (test.getDescription() == null ? "" : test.getDescription()));
        if (value.contains("practice") || value.contains("luyen tap")) return TestMode.PRACTICE;
        if (value.contains("bo de") || value.contains("de thi") || value.contains("exam") || value.contains("mock")) {
            return TestMode.EXAM;
        }
        return TestMode.PRACTICE;
    }

    private String normalizeText(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase();
    }

    public CoreDtos.QuestionResponse question(Question question) {
        return new CoreDtos.QuestionResponse(question.getId(), question.getTest().getId(), question.getType(),
                question.getContent(), question.getTopic(), question.getAudioUrl(), question.getScriptText(), question.getExplanation(),
                question.getPoints(), question.getSortOrder(),
                question.getAnswers().stream().sorted(Comparator.comparing(Answer::getSortOrder))
                        .map(answer -> new CoreDtos.AnswerResponse(answer.getId(), answer.getContent(), answer.isCorrect(), answer.getSortOrder()))
                        .toList());
    }

    public CoreDtos.SubmissionResponse submission(Submission s) {
        return new CoreDtos.SubmissionResponse(s.getId(), s.getTest().getId(), s.getTest().getTitle(),
                s.getTotalScore(), s.getMaxScore(), s.getCreatedAt());
    }
}
