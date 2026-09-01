package com.example.aptis.mapper;

import com.example.aptis.dto.AuthDtos;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.entity.*;
import com.example.aptis.enums.RoleName;
import com.example.aptis.enums.TestMode;
import com.example.aptis.util.TextRepair;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class DtoMapper {
    private static final int EXAM_POINT_PER_QUESTION = 2;

    @Value("${app.subscription.free-trial-days:0}")
    private int freeTrialDays;

    public AuthDtos.UserResponse user(User user) {
        Set<RoleName> roles = user.getRoles().stream().map(Role::getName).collect(Collectors.toSet());
        LocalDateTime trialExpiresAt = freeTrialDays > 0 && user.getCreatedAt() != null
                ? user.getCreatedAt().plusDays(freeTrialDays)
                : null;
        LocalDateTime proExpiresAt = user.getProExpiresAt();
        LocalDateTime accessExpiresAt = proExpiresAt;
        if (accessExpiresAt == null || (trialExpiresAt != null && trialExpiresAt.isAfter(accessExpiresAt))) {
            accessExpiresAt = trialExpiresAt;
        }
        return new AuthDtos.UserResponse(user.getId(), user.getEmail(), clean(user.getFullName()), roles, user.isEnabled(),
                user.getProExpiresAt(), accessExpiresAt, user.getLastSeenAt(), user.getCreatedAt());
    }

    public CoreDtos.SkillResponse skill(Skill skill) {
        return new CoreDtos.SkillResponse(skill.getId(), skill.getType(), clean(skill.getName()), clean(skill.getDescription()));
    }

    public CoreDtos.TestResponse test(Test test) {
        return test(test, 0);
    }

    public CoreDtos.TestResponse test(Test test, int questionCount) {
        return new CoreDtos.TestResponse(test.getId(), test.getSkill().getId(), clean(test.getSkill().getName()),
                clean(test.getTitle()), clean(test.getDescription()), test.getDurationMinutes(), test.getStatus(),
                resolveTestMode(test), test.isFeatured(), questionCount);
    }

    public CoreDtos.LessonResponse lesson(Lesson lesson) {
        return new CoreDtos.LessonResponse(lesson.getId(), lesson.getSkill(), clean(lesson.getTitle()),
                clean(lesson.getSummary()), clean(lesson.getContent()), lesson.getStatus(), lesson.getUpdatedAt(),
                lesson.getResourceType(), clean(lesson.getResourceUrl()), clean(lesson.getPartLabel()));
    }

    public CoreDtos.PredictionResponse prediction(Prediction prediction) {
        return new CoreDtos.PredictionResponse(prediction.getId(), prediction.getSkill(), clean(prediction.getTitle()),
                clean(prediction.getSummary()), clean(prediction.getContent()), clean(prediction.getTags()), prediction.getPriority(),
                prediction.getStatus(), prediction.getUpdatedAt());
    }

    private TestMode resolveTestMode(Test test) {
        if (test.getMode() != null)
            return test.getMode();
        String value = normalizeText((test.getTitle() == null ? "" : test.getTitle()) + " " +
                (test.getDescription() == null ? "" : test.getDescription()));
        if (value.contains("practice") || value.contains("luyen tap"))
            return TestMode.PRACTICE;
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
                clean(question.getContent()), clean(question.getTopic()), clean(question.getAudioUrl()), clean(question.getScriptText()),
                clean(question.getExplanation()),
                EXAM_POINT_PER_QUESTION, question.getSortOrder(), question.isFeatured(),
                question.getAnswers().stream().sorted(Comparator.comparing(Answer::getSortOrder))
                        .map(answer -> new CoreDtos.AnswerResponse(answer.getId(), clean(answer.getContent()),
                                answer.isCorrect(), answer.getSortOrder()))
                        .toList());
    }

    public CoreDtos.SubmissionResponse submission(Submission s) {
        var answerResponses = s.getAnswers().stream()
                .sorted(Comparator.comparing(sa -> sa.getQuestion().getSortOrder()))
                .map(sa -> {
                    Question question = sa.getQuestion();
                    String correctAnswer = question.getAnswers().stream()
                            .filter(Answer::isCorrect)
                            .sorted(Comparator.comparing(Answer::getSortOrder))
                            .map(answer -> clean(answer.getContent()))
                            .collect(Collectors.joining(", "));
                    return new CoreDtos.SubmissionAnswerResponse(
                            sa.getId(),
                            question.getId(),
                            question.getSortOrder(),
                            clean(question.getContent()),
                            clean(question.getTopic()),
                            sa.getAnswer() == null ? null : clean(sa.getAnswer().getContent()),
                            clean(sa.getTextAnswer()),
                            correctAnswer.isBlank() ? null : correctAnswer,
                            sa.isCorrect(),
                            sa.getScore(),
                            clean(question.getExplanation()));
                })
                .toList();
        return new CoreDtos.SubmissionResponse(s.getId(), s.getTest().getId(), clean(s.getTest().getTitle()),
                clean(s.getTest().getSkill().getName()), s.getTotalScore(), s.getMaxScore(), s.getCreatedAt(),
                answerResponses);
    }

    private String clean(String value) {
        return TextRepair.repair(value);
    }
}
