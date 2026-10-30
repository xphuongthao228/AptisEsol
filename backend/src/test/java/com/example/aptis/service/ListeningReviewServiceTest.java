package com.example.aptis.service;

import com.example.aptis.dto.CoreDtos;
import com.example.aptis.enums.QuestionType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class ListeningReviewServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final AiScoringService ai = mock(AiScoringService.class);
    private final ListeningReviewService service = new ListeningReviewService(ai, mapper);

    private CoreDtos.QuestionResponse question(String script) {
        return new CoreDtos.QuestionResponse(1L, 1L, QuestionType.SINGLE_CHOICE,
                "Choose an answer", "Listening", null, script, "Person 1: Option A",
                1, 1, false, List.of(new CoreDtos.AnswerResponse(1L, "Option A", true, 1)));
    }

    @Test
    void reusesTranslationUntilTheExerciseChanges() throws Exception {
        var translated = mapper.readTree("{\"scriptVi\":\"Bản dịch\",\"answers\":[]}");
        when(ai.translateListeningReview(anyString())).thenReturn(translated);
        assertSame(translated, service.review(question("Person A: First script.")));
        assertSame(translated, service.review(question("Person A: First script.")));
        verify(ai, times(1)).translateListeningReview(anyString());
        service.review(question("Person A: Updated script."));
        verify(ai, times(2)).translateListeningReview(anyString());
    }

    @Test
    void retriesFailedTranslationsInsteadOfCachingTheFailure() throws Exception {
        when(ai.translateListeningReview(anyString())).thenThrow(new IllegalStateException("Unavailable"))
                .thenReturn(mapper.readTree("{\"scriptVi\":\"Bản dịch\",\"answers\":[]}"));
        assertThrows(IllegalStateException.class, () -> service.review(question("Person A: Script.")));
        assertFalse(service.review(question("Person A: Script.")).path("scriptVi").asText().isBlank());
    }
}
