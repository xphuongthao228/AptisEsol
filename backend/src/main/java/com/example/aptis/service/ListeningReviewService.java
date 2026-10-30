package com.example.aptis.service;

import com.example.aptis.dto.CoreDtos;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ListeningReviewService {
    private final AiScoringService ai;
    private final ObjectMapper mapper;
    private final Map<String, JsonNode> cache = new LinkedHashMap<>(32, 0.75f, true);

    // Bound memory and coalesce repeated requests for the same exercise.
    public synchronized JsonNode review(CoreDtos.QuestionResponse question) {
        String source;
        try {
            source = mapper.writeValueAsString(Map.of(
                    "content", value(question.content()), "script", value(question.scriptText()),
                    "explanation", value(question.explanation()), "answers", question.answers()));
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot read listening exercise", ex);
        }
        JsonNode cached = cache.get(source);
        if (cached != null) return cached;
        JsonNode result = ai.translateListeningReview(source);
        if (cache.size() >= 256) cache.remove(cache.keySet().iterator().next());
        cache.put(source, result);
        return result;
    }

    private String value(String text) {
        return text == null ? "" : text;
    }
}
