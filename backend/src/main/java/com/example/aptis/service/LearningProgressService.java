package com.example.aptis.service;

import com.example.aptis.entity.*;
import com.example.aptis.enums.TestMode;
import com.example.aptis.enums.TestStatus;
import com.example.aptis.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class LearningProgressService {
    private final UserRepository users;
    private final QuestionRepository questions;
    private final LearningCompletionRepository completions;
    private final PaymentService payments;

    public record SkillProgress(String skill, int completed, int total) {}
    public record PracticeCompletion(Long questionId, boolean completed, List<Integer> completedClubs) {}

    @Transactional(readOnly = true)
    public List<PracticeCompletion> practiceCompletions(String email) {
        User user = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        Map<Long, Set<String>> saved = new HashMap<>();
        for (LearningCompletion completion : completions.findByUserIdAndDeletedAtIsNull(user.getId())) {
            if (completion.getQuestion() != null) saved.computeIfAbsent(completion.getQuestion().getId(), ignored -> new HashSet<>()).add(completion.getUnitKey());
        }
        List<PracticeCompletion> result = new ArrayList<>();
        for (Question question : questions.findRoadmapQuestions()) {
            Set<String> done = saved.get(question.getId());
            if (done == null) continue;
            Set<String> required = requiredUnits(question.getContent());
            Map<Integer, Set<String>> clubs = new TreeMap<>();
            for (String key : required) {
                if (key.startsWith("writing-")) {
                    int club = Integer.parseInt(key.split("-")[1]);
                    clubs.computeIfAbsent(club, ignored -> new HashSet<>()).add(key);
                }
            }
            result.add(new PracticeCompletion(question.getId(), done.containsAll(required),
                    clubs.entrySet().stream().filter(entry -> done.containsAll(entry.getValue())).map(Map.Entry::getKey).toList()));
        }
        return result;
    }
    public record RoadmapProgress(boolean guideReviewed, boolean predictionsReviewed, List<SkillProgress> skills, LocalDateTime lastPracticedAt) {}

    @Transactional(readOnly = true)
    public RoadmapProgress mine(String email) {
        User user = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        List<LearningCompletion> saved = completions.findByUserIdAndDeletedAtIsNull(user.getId());
        Set<String> done = new HashSet<>();
        saved.forEach(item -> { if (item.getQuestion() != null) done.add(item.getQuestion().getId() + ":" + item.getUnitKey()); });
        Map<String, int[]> counts = new LinkedHashMap<>();
        for (String skill : List.of("READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR")) counts.put(skill, new int[2]);
        for (Question q : questions.findRoadmapQuestions()) {
            if (q.getTest().getTitle().toLowerCase(Locale.ROOT).startsWith("bộ đề random")) continue;
            int[] count = counts.get(q.getTest().getSkill().getType().name());
            if (count == null) continue;
            for (String key : requiredUnits(q.getContent())) {
                count[1]++;
                if (done.contains(q.getId() + ":" + key)) count[0]++;
            }
        }
        return new RoadmapProgress(saved.stream().anyMatch(item -> item.getQuestion() == null && "guide".equals(item.getUnitKey())),
                saved.stream().anyMatch(item -> item.getQuestion() == null && "predictions".equals(item.getUnitKey())),
                counts.entrySet().stream().map(e -> new SkillProgress(e.getKey(), e.getValue()[0], e.getValue()[1])).toList(),
                saved.stream().filter(item -> item.getQuestion() != null).map(BaseEntity::getCreatedAt)
                        .filter(Objects::nonNull).max(LocalDateTime::compareTo).orElse(null));
    }

    @Transactional
    public void complete(String email, Long questionId, String unitKey) {
        User user = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        // Serialize duplicate completion requests from multiple tabs for this account.
        users.findByIdForUpdate(user.getId()).orElseThrow();
        Question question = null;
        if (questionId != null) {
            question = questions.findById(questionId).orElseThrow();
            Test test = question.getTest();
            if (question.getDeletedAt() != null || test.getDeletedAt() != null || test.getMode() != TestMode.PRACTICE
                    || test.getStatus() != TestStatus.PUBLISHED || !payments.canAccessTest(email, test.getId())) {
                throw new AccessDeniedException("Practice question is not accessible");
            }
            if (!requiredUnits(question.getContent()).contains(unitKey)) throw new IllegalArgumentException("Invalid practice unit");
        } else if (!Set.of("guide", "predictions").contains(unitKey)) throw new IllegalArgumentException("Invalid roadmap milestone");
        if (completions.existsByUserIdAndQuestionIdAndUnitKey(user.getId(), questionId, unitKey)) return;
        LearningCompletion completion = new LearningCompletion();
        completion.setUser(user);
        completion.setQuestion(question);
        completion.setUnitKey(unitKey);
        completions.save(completion);
    }

    static Set<String> requiredUnits(String content) {
        Set<String> keys = new LinkedHashSet<>();
        try {
            JsonNode data = new ObjectMapper().readTree(content);
            String template = data.path("template").asText();
            if (template.startsWith("SPEAKING_PART")) {
                int items = Math.max(1, data.path("questions").size());
                int prompts = template.equals("SPEAKING_PART2") || template.equals("SPEAKING_PART3") ? 3 : 1;
                for (int i = 0; i < items; i++) for (int j = 0; j < prompts; j++) keys.add("speaking-" + i + "-" + j);
            } else if (template.equals("WRITING_CLUB_COLLECTION")) {
                for (int club = 0; club < data.path("clubs").size(); club++)
                    for (int part = 0; part < Math.min(4, data.path("clubs").get(club).path("parts").size()); part++)
                        keys.add("writing-" + club + "-" + part);
            }
        } catch (Exception ignored) { /* Plain multiple-choice questions have one unit. */ }
        if (keys.isEmpty()) keys.add("question");
        return keys;
    }
}
