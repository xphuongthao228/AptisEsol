package com.example.aptis.service;

import com.example.aptis.entity.*;
import com.example.aptis.enums.*;
import com.example.aptis.repository.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LearningProgressServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final QuestionRepository questions = mock(QuestionRepository.class);
    private final LearningCompletionRepository completions = mock(LearningCompletionRepository.class);
    private final PaymentService payments = mock(PaymentService.class);
    private final LearningProgressService service = new LearningProgressService(users, questions, completions, payments);

    @Test
    void speakingCountsEveryPromptInEveryImportedItem() {
        assertEquals(Set.of("speaking-0-0", "speaking-0-1", "speaking-0-2", "speaking-1-0", "speaking-1-1", "speaking-1-2"),
                LearningProgressService.requiredUnits("{\"template\":\"SPEAKING_PART2\",\"questions\":[{},{}]}"));
        assertEquals(Set.of("speaking-0-0"), LearningProgressService.requiredUnits("{\"template\":\"SPEAKING_PART4\",\"question\":\"Tell us\"}"));
    }

    @Test
    void writingCountsAllPartsAcrossClubsAndPlainQuestionsHaveOneUnit() {
        assertEquals(Set.of("writing-0-0", "writing-0-1", "writing-1-0"),
                LearningProgressService.requiredUnits("{\"template\":\"WRITING_CLUB_COLLECTION\",\"clubs\":[{\"parts\":[{},{}]},{\"parts\":[{}]}]}"));
        assertEquals(Set.of("question"), LearningProgressService.requiredUnits("Pick an answer"));
    }

    @Test
    void repeatedCompletionsAreIdempotentAndInvalidUnitsAreRejected() {
        User user = user();
        Question question = question(10L, SkillType.READING, "plain question");
        when(questions.findById(10L)).thenReturn(Optional.of(question));
        when(payments.canAccessTest("student@example.com", 20L)).thenReturn(true);
        when(completions.existsByUserIdAndQuestionIdAndUnitKey(1L, 10L, "question")).thenReturn(false, true);
        service.complete(user.getEmail(), 10L, "question");
        service.complete(user.getEmail(), 10L, "question");
        verify(completions, times(1)).save(any());
        assertThrows(IllegalArgumentException.class, () -> service.complete(user.getEmail(), 10L, "speaking-0-0"));
    }

    @Test
    void speakingTopicRequiresAllPromptsAndEmptyBankIsNotComplete() {
        user();
        Question question = question(10L, SkillType.SPEAKING, "{\"template\":\"SPEAKING_PART2\",\"questions\":[{}]}");
        LearningCompletion completion = new LearningCompletion();
        completion.setQuestion(question);
        completion.setUnitKey("speaking-0-0");
        when(questions.findRoadmapQuestions()).thenReturn(List.of(question));
        when(completions.findByUserIdAndDeletedAtIsNull(1L)).thenReturn(List.of(completion, completion));
        var result = service.mine("student@example.com");
        var speaking = result.skills().stream().filter(s -> s.skill().equals("SPEAKING")).findFirst().orElseThrow();
        assertEquals(0, speaking.completed());
        assertEquals(1, speaking.total());
        assertEquals(0, result.skills().stream().filter(s -> s.skill().equals("READING")).findFirst().orElseThrow().total());
        verify(completions).findByUserIdAndDeletedAtIsNull(1L);
    }

    @Test
    void roadmapCountsWritingClubsAndSpeakingTopicsUsingExistingCompletions() {
        user();
        Question speaking = question(10L, SkillType.SPEAKING,
                "{\"template\":\"SPEAKING_PART3\",\"questions\":[{},{}]}");
        Question writing = question(11L, SkillType.WRITING,
                "{\"template\":\"WRITING_CLUB_COLLECTION\",\"clubs\":[{\"parts\":[{},{},{},{}]},{\"parts\":[{},{},{},{}]}]}");
        Question reading = question(12L, SkillType.READING, "plain question");
        when(questions.findRoadmapQuestions()).thenReturn(List.of(speaking, writing, reading));
        List<LearningCompletion> saved = new ArrayList<>();
        for (String key : List.of("speaking-0-0", "speaking-0-1", "speaking-0-2", "speaking-1-0"))
            saved.add(completion(speaking, key));
        for (String key : List.of("writing-0-0", "writing-0-1", "writing-0-2", "writing-0-3", "writing-1-0"))
            saved.add(completion(writing, key));
        saved.add(completion(reading, "question"));
        saved.add(completion(speaking, "speaking-0-0")); // Duplicate records do not inflate counts.
        when(completions.findByUserIdAndDeletedAtIsNull(1L)).thenReturn(saved);
        var partial = service.mine("student@example.com").skills();
        assertEquals(new LearningProgressService.SkillProgress("SPEAKING", 1, 2), partial.stream().filter(s -> s.skill().equals("SPEAKING")).findFirst().orElseThrow());
        assertEquals(new LearningProgressService.SkillProgress("WRITING", 1, 2), partial.stream().filter(s -> s.skill().equals("WRITING")).findFirst().orElseThrow());
        assertEquals(new LearningProgressService.SkillProgress("READING", 1, 1), partial.get(0));
        saved.add(completion(speaking, "speaking-1-1"));
        saved.add(completion(speaking, "speaking-1-2"));
        for (int part = 1; part < 4; part++) saved.add(completion(writing, "writing-1-" + part));
        var complete = service.mine("student@example.com").skills();
        for (String skill : List.of("SPEAKING", "WRITING"))
            assertEquals(new LearningProgressService.SkillProgress(skill, 2, 2), complete.stream().filter(s -> s.skill().equals(skill)).findFirst().orElseThrow());
    }

    @Test
    void inaccessibleQuestionsCannotBeMarkedComplete() {
        user();
        when(questions.findById(10L)).thenReturn(Optional.of(question(10L, SkillType.WRITING, "plain question")));
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.complete("student@example.com", 10L, "question"));
        verify(completions, never()).save(any());
    }

    private User user() {
        User user = new User(); user.setId(1L); user.setEmail("student@example.com");
        when(users.findByEmailAndDeletedAtIsNull(user.getEmail())).thenReturn(Optional.of(user));
        when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(user));
        return user;
    }

    @Test
    void coverBadgesRequireEveryUnitAndKeepWritingClubsSeparate() {
        user();
        Question speaking = question(10L, SkillType.SPEAKING, "{\"template\":\"SPEAKING_PART2\",\"questions\":[{}]}");
        Question writing = question(11L, SkillType.WRITING, "{\"template\":\"WRITING_CLUB_COLLECTION\",\"clubs\":[{\"parts\":[{},{}]},{\"parts\":[{}]}]}");
        Question reading = question(12L, SkillType.READING, "plain question");
        when(questions.findRoadmapQuestions()).thenReturn(List.of(speaking, writing, reading));
        List<LearningCompletion> saved = new ArrayList<>();
        for (String key : List.of("speaking-0-0", "speaking-0-1")) saved.add(completion(speaking, key));
        saved.add(completion(writing, "writing-0-0"));
        saved.add(completion(writing, "writing-0-1"));
        when(completions.findByUserIdAndDeletedAtIsNull(1L)).thenReturn(saved);
        var partial = service.practiceCompletions("student@example.com");
        assertFalse(partial.get(0).completed());
        assertFalse(partial.get(1).completed());
        assertEquals(List.of(0), partial.get(1).completedClubs());
        assertEquals(2, partial.size(), "Unattempted questions must not be marked complete");
        saved.add(completion(speaking, "speaking-0-2"));
        saved.add(completion(writing, "writing-1-0"));
        saved.add(completion(reading, "question"));
        var complete = service.practiceCompletions("student@example.com");
        assertTrue(complete.stream().allMatch(LearningProgressService.PracticeCompletion::completed));
        assertEquals(List.of(0, 1), complete.get(1).completedClubs());
        verify(completions, times(2)).findByUserIdAndDeletedAtIsNull(1L);
    }

    private LearningCompletion completion(Question question, String unitKey) {
        LearningCompletion completion = new LearningCompletion();
        completion.setQuestion(question);
        completion.setUnitKey(unitKey);
        return completion;
    }

    private Question question(Long id, SkillType type, String content) {
        Skill skill = new Skill(); skill.setType(type);
        com.example.aptis.entity.Test test = new com.example.aptis.entity.Test();
        test.setId(20L); test.setTitle("Practice"); test.setMode(TestMode.PRACTICE); test.setStatus(TestStatus.PUBLISHED); test.setSkill(skill);
        Question question = new Question(); question.setId(id); question.setTest(test); question.setContent(content);
        return question;
    }
}
