package com.example.aptis.service;

import com.example.aptis.dto.AiDtos;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiScoringService {
    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;

    @Value("${app.ai.deepseek-api-key:${app.ai.openai-api-key:}}")
    private String apiKey;

    @Value("${app.ai.deepseek-model:deepseek-chat}")
    private String model;

    @Value("${app.ai.deepseek-base-url:https://api.deepseek.com}")
    private String baseUrl;

    @Value("${app.ai.max-concurrent-requests:2}")
    private int maxConcurrentRequests;

    private RestClient deepSeekClient;
    private Semaphore aiRequestSemaphore;

    @PostConstruct
    void initHttpClient() {
        this.deepSeekClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + blankToEmpty(apiKey))
                .build();
        this.aiRequestSemaphore = new Semaphore(Math.max(1, maxConcurrentRequests));
    }

    public AiDtos.WritingScoreResponse scoreWriting(AiDtos.WritingScoreRequest request) {
        String answers = request.parts().stream()
                .map(part -> """
                        %s
                        Prompt: %s
                        Answer:
                        %s
                        """.formatted(part.title(), blankToEmpty(part.prompt()), part.answer()))
                .collect(Collectors.joining("\n---\n"));

        String prompt = loadPrompt("aptis-writing-score.md")
                .replace("{{ANSWERS}}", answers);
        String content = chatJson(
                "You are an Aptis ESOL Writing examiner. Return only valid JSON.",
                prompt);

        try {
            return objectMapper.treeToValue(normalizeWritingJson(content), AiDtos.WritingScoreResponse.class);
        } catch (Exception ex) {
            throw new IllegalStateException("Không đọc được kết quả chấm Writing AI: " + ex.getMessage());
        }
    }

    public AiDtos.SpeakingScoreResponse scoreSpeaking(AiDtos.SpeakingScoreRequest request) {
        return scoreSpeaking(request, List.of());
    }

    public AiDtos.SpeakingScoreResponse scoreSpeaking(AiDtos.SpeakingScoreRequest request, List<MultipartFile> audioFiles) {
        AiDtos.SpeakingScoreRequest requestWithAudio = attachAudioMetadata(request, audioFiles);
        String answers = requestWithAudio.parts().stream()
                .map(part -> """
                        %s
                        Prompt: %s
                        Audio file: %s
                        Audio type: %s
                        Audio size: %s bytes
                        Transcript:
                        %s
                        """.formatted(
                        part.title(),
                        part.prompt(),
                        blankToEmpty(part.audioFileName()),
                        blankToEmpty(part.audioContentType()),
                        part.audioSizeBytes() == null ? 0 : part.audioSizeBytes(),
                        part.transcript()))
                .collect(Collectors.joining("\n---\n"));

        String prompt = loadPrompt("aptis-speaking-score.md")
                .replace("{{ANSWERS}}", answers);
        String content = chatJson(
                "You are an Aptis ESOL Speaking examiner. Return only valid JSON.",
                prompt);

        try {
            return objectMapper.treeToValue(normalizeSpeakingJson(content), AiDtos.SpeakingScoreResponse.class);
        } catch (Exception ex) {
            return fallbackSpeakingScore(requestWithAudio);
        }
    }

    private AiDtos.SpeakingScoreRequest attachAudioMetadata(AiDtos.SpeakingScoreRequest request, List<MultipartFile> audioFiles) {
        if (audioFiles == null || audioFiles.isEmpty()) {
            return request;
        }

        List<AiDtos.SpeakingPartRequest> parts = new ArrayList<>();
        for (int i = 0; i < request.parts().size(); i++) {
            AiDtos.SpeakingPartRequest part = request.parts().get(i);
            MultipartFile file = i < audioFiles.size() ? audioFiles.get(i) : null;
            if (file == null || file.isEmpty()) {
                parts.add(new AiDtos.SpeakingPartRequest(
                        part.title(),
                        part.prompt(),
                        "[NO_AUDIO_FILE_SUBMITTED]",
                        null,
                        null,
                        0L));
                continue;
            }

            parts.add(new AiDtos.SpeakingPartRequest(
                    part.title(),
                    part.prompt(),
                    normalizeAudioTranscript(part.transcript()),
                    blankToEmpty(file.getOriginalFilename()),
                    blankToEmpty(file.getContentType()),
                    file.getSize()));
        }
        return new AiDtos.SpeakingScoreRequest(parts);
    }

    private String normalizeAudioTranscript(String transcript) {
        String value = blankToEmpty(transcript).trim();
        if (value.isBlank() || value.equals("[NO_AUDIO_FILE_SUBMITTED]")) {
            return "[AUDIO_FILE_RECORDED_BUT_TRANSCRIPTION_UNAVAILABLE]";
        }
        return value;
    }

    public AiDtos.LingoChatResponse chatWithLingo(AiDtos.LingoChatRequest request) {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", loadPrompt("lingo-system.md")));
        if (request.history() != null) {
            request.history().stream()
                    .filter(message -> "user".equals(message.role()) || "assistant".equals(message.role()))
                    .limit(12)
                    .forEach(message -> messages.add(Map.of("role", message.role(), "content", message.content())));
        }
        messages.add(Map.of("role", "user", "content", request.message()));

        String reply = chatText(messages);
        return new AiDtos.LingoChatResponse(reply);
    }

    private String chatJson(String systemPrompt, String userPrompt) {
        List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt));
        return chat(messages, true);
    }

    private String chatText(List<Map<String, String>> messages) {
        return chat(messages, false);
    }

    private String chat(List<Map<String, String>> messages, boolean jsonMode) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Chưa cấu hình DEEPSEEK_API_KEY cho backend.");
        }

        boolean acquired = false;
        try {
            acquired = aiRequestSemaphore.tryAcquire(30, TimeUnit.SECONDS);
            if (!acquired) {
                throw new IllegalStateException("AI is busy. Please try again later.");
            }
            return callDeepSeek(messages, jsonMode, model);
        } catch (RestClientResponseException ex) {
            String body = ex.getResponseBodyAsString(StandardCharsets.UTF_8);
            if (!"deepseek-chat".equals(model) && isModelError(body)) {
                return callDeepSeek(messages, jsonMode, "deepseek-chat");
            }
            throw new IllegalStateException(friendlyAiUnavailableMessage(ex.getStatusCode().value()));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("AI request was interrupted.");
        } finally {
            if (acquired) {
                aiRequestSemaphore.release();
            }
        }
    }

    private String callDeepSeek(List<Map<String, String>> messages, boolean jsonMode, String selectedModel) {
        Map<String, Object> body = jsonMode
                ? Map.of(
                        "model", selectedModel,
                        "messages", messages,
                        "temperature", 0.2,
                        "response_format", Map.of("type", "json_object"))
                : Map.of(
                        "model", selectedModel,
                        "messages", messages,
                        "temperature", 0.5);

        String response = deepSeekClient
                .post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);

        try {
            JsonNode root = objectMapper.readTree(response);
            String content = root.path("choices").path(0).path("message").path("content").asText();
            if (content == null || content.isBlank()) {
                throw new IllegalStateException("DeepSeek không trả về nội dung.");
            }
            return stripCodeFence(content);
        } catch (Exception ex) {
            throw new IllegalStateException("Không đọc được phản hồi DeepSeek: " + ex.getMessage());
        }
    }

    private boolean isModelError(String body) {
        String lower = body == null ? "" : body.toLowerCase();
        return lower.contains("model") || lower.contains("not found") || lower.contains("invalid");
    }

    private String simplifyDeepSeekError(String body) {
        if (body == null || body.isBlank()) {
            return "Không có nội dung lỗi từ DeepSeek.";
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            String message = root.path("error").path("message").asText();
            if (message != null && !message.isBlank()) {
                return message;
            }
        } catch (Exception ignored) {
            // Keep the raw body below.
        }
        return body.length() > 500 ? body.substring(0, 500) : body;
    }

    private String friendlyAiUnavailableMessage(int statusCode) {
        if (statusCode == 402 || statusCode == 429) {
            return "AI đang tạm hết lượt xử lý. Mỗi tài khoản có tối đa 10 lượt AI mỗi ngày; vui lòng thử lại sau.";
        }
        return "AI đang tạm bận nên chưa xử lý được yêu cầu. Vui lòng thử lại sau ít phút.";
    }

    private String loadPrompt(String fileName) {
        try {
            Resource resource = resourceLoader.getResource("classpath:prompts/" + fileName);
            if (!resource.exists()) {
                throw new IllegalStateException("Không tìm thấy prompt file: " + fileName);
            }
            return StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException("Không đọc được prompt file " + fileName + ": " + ex.getMessage());
        }
    }

    private JsonNode normalizeWritingJson(String content) throws Exception {
        JsonNode root = objectMapper.readTree(content);
        if (root instanceof ObjectNode objectNode && root.path("corrections").isArray()) {
            ArrayNode normalized = objectMapper.createArrayNode();
            root.path("corrections").forEach(item -> {
                if (item.isTextual()) {
                    normalized.add(item.asText());
                    return;
                }
                String original = item.path("original").asText("");
                String correction = item.path("correction").asText("");
                String explanation = item.path("explanation").asText("");
                String text = List.of(original, correction, explanation).stream()
                        .filter(value -> value != null && !value.isBlank())
                        .collect(Collectors.joining(" -> "));
                normalized.add(text.isBlank() ? item.toString() : text);
            });
            objectNode.set("corrections", normalized);
        }
        return root;
    }

    private JsonNode normalizeSpeakingJson(String content) throws Exception {
        JsonNode root = objectMapper.readTree(content);
        if (!root.has("overall_score") && !root.has("cefr_level") && !root.path("parts").isObject()) {
            return root;
        }

        ObjectNode normalized = objectMapper.createObjectNode();
        normalized.put("overallScore", root.path("overall_score").asInt(root.path("overallScore").asInt(0)));
        normalized.put("cefrLevel", root.path("cefr_level").asText(root.path("cefrLevel").asText("A1")));
        normalized.put("summary", buildSpeakingSummary(root));

        JsonNode sourceParts = root.path("parts");
        ArrayNode parts = objectMapper.createArrayNode();
        if (sourceParts.isObject()) {
            sourceParts.fields().forEachRemaining(entry -> {
                JsonNode part = entry.getValue();
                ObjectNode item = objectMapper.createObjectNode();
                item.put("title", speakingPartTitle(entry.getKey()));
                item.put("score", part.path("score").asInt(0));
                item.put("feedback", part.path("feedback").asText(""));
                parts.add(item);
            });
        }
        normalized.set("parts", parts);
        normalized.set("criteria", buildSpeakingCriteria(sourceParts));
        normalized.set("pronunciationTips", textArray(root.path("weaknesses"), "Pronunciation cannot be reliably assessed from transcript alone."));
        normalized.set("fluencyTips", textArray(root.path("improvement_suggestions"), "Develop each answer with reasons, examples, and linking words."));
        normalized.put("improvedAnswer", buildImprovedSpeakingAnswer(root));
        return normalized;
    }

    private AiDtos.SpeakingScoreResponse fallbackSpeakingScore(AiDtos.SpeakingScoreRequest request) {
        List<AiDtos.PartFeedback> parts = request.parts().stream()
                .map(part -> {
                    String transcript = blankToEmpty(part.transcript()).trim();
                    int score = (transcript.isBlank() || transcript.equals("[NO_AUDIO_FILE_SUBMITTED]")) ? 0 : 1;
                    String feedback = score == 0
                            ? "Phần này chưa có file ghi âm hoặc không có nội dung để chấm, nên tính 0 điểm."
                            : "Có file ghi âm nhưng hệ thống chưa lấy được nội dung nói rõ ràng, nên phần này chỉ được điểm rất thấp.";
                    return new AiDtos.PartFeedback(part.title(), score, feedback);
                })
                .toList();

        int overallScore = parts.isEmpty()
                ? 0
                : Math.round((float) parts.stream().mapToInt(AiDtos.PartFeedback::score).sum() / parts.size());
        String cefrLevel = overallScore < 4 ? "Below A1" : "A1";

        List<AiDtos.CriteriaScore> criteria = List.of(
                new AiDtos.CriteriaScore("Task response", 0, "Chưa có đủ nội dung bài nói để đánh giá mức độ trả lời đúng yêu cầu."),
                new AiDtos.CriteriaScore("Grammar", 0, "Chưa có transcript rõ ràng nên chưa thể đánh giá ngữ pháp."),
                new AiDtos.CriteriaScore("Vocabulary", 0, "Chưa có transcript rõ ràng nên chưa thể đánh giá từ vựng."),
                new AiDtos.CriteriaScore("Fluency", 0, "Chưa có dữ liệu nói đủ rõ để đánh giá độ trôi chảy."),
                new AiDtos.CriteriaScore("Pronunciation proxy", 0, "Pronunciation cannot be reliably assessed from transcript alone.")
        );

        return new AiDtos.SpeakingScoreResponse(
                overallScore,
                cefrLevel,
                "Không có đủ dữ liệu bài nói để chấm chi tiết. Các phần thiếu file ghi âm được tính 0; phần có file nhưng không lấy được nội dung nói được tính điểm rất thấp.",
                criteria,
                parts,
                List.of("Kiểm tra quyền microphone của trình duyệt.", "Nói rõ hơn, gần microphone hơn và tránh tiếng ồn nền.", "Dùng Chrome/Edge để trình duyệt hỗ trợ nhận diện giọng nói tốt hơn."),
                List.of("Trả lời trực tiếp câu hỏi, sau đó thêm lý do và ví dụ.", "Nói thành câu hoàn chỉnh thay vì từng từ rời.", "Dùng từ nối như because, for example, in my opinion để bài nói mạch lạc hơn."),
                "I think it is important to answer the question directly, give one clear reason, and add a short example from personal experience."
        );
    }

    private ArrayNode buildSpeakingCriteria(JsonNode sourceParts) {
        ArrayNode criteria = objectMapper.createArrayNode();
        addSpeakingCriterion(criteria, "Task response", sourceParts, "task_response");
        addSpeakingCriterion(criteria, "Grammar", sourceParts, "grammar");
        addSpeakingCriterion(criteria, "Vocabulary", sourceParts, "vocabulary");
        addSpeakingCriterion(criteria, "Fluency", sourceParts, "fluency_coherence");
        addSpeakingCriterion(criteria, "Pronunciation proxy", sourceParts, "pronunciation");
        return criteria;
    }

    private void addSpeakingCriterion(ArrayNode criteria, String name, JsonNode sourceParts, String fieldName) {
        int total = 0;
        int count = 0;
        if (sourceParts.isObject()) {
            var iterator = sourceParts.fields();
            while (iterator.hasNext()) {
                JsonNode part = iterator.next().getValue();
                if (part.has(fieldName)) {
                    total += part.path(fieldName).asInt(0);
                    count++;
                }
            }
        }
        int score = count == 0 ? 0 : Math.max(0, Math.min(10, Math.round((float) total / count)));
        ObjectNode item = objectMapper.createObjectNode();
        item.put("name", name);
        item.put("score", score);
        item.put("feedback", name + " " + (score >= 8 ? "tốt" : score >= 5 ? "đạt mức trung bình" : "cần cải thiện") + " theo transcript đã cung cấp.");
        criteria.add(item);
    }

    private ArrayNode textArray(JsonNode source, String fallback) {
        ArrayNode values = objectMapper.createArrayNode();
        if (source.isArray()) {
            source.forEach(item -> {
                if (item.isTextual() && !item.asText().isBlank()) {
                    values.add(item.asText());
                }
            });
        }
        if (values.isEmpty()) {
            values.add(fallback);
        }
        return values;
    }

    private String buildSpeakingSummary(JsonNode root) {
        String level = root.path("cefr_level").asText(root.path("cefrLevel").asText("A1"));
        int score = root.path("overall_score").asInt(root.path("overallScore").asInt(0));
        List<String> strengths = new ArrayList<>();
        root.path("strengths").forEach(item -> {
            if (item.isTextual() && !item.asText().isBlank()) strengths.add(item.asText());
        });
        List<String> weaknesses = new ArrayList<>();
        root.path("weaknesses").forEach(item -> {
            if (item.isTextual() && !item.asText().isBlank()) weaknesses.add(item.asText());
        });
        String strengthText = strengths.isEmpty() ? "chưa thể hiện nhiều điểm mạnh rõ ràng" : String.join("; ", strengths);
        String weaknessText = weaknesses.isEmpty() ? "cần phát triển câu trả lời đầy đủ hơn" : String.join("; ", weaknesses);
        return "Điểm Speaking ước tính: " + score + "/50 (" + level + "). Điểm mạnh: " + strengthText + ". Điểm cần cải thiện: " + weaknessText + ".";
    }

    private String buildImprovedSpeakingAnswer(JsonNode root) {
        List<String> suggestions = new ArrayList<>();
        root.path("improvement_suggestions").forEach(item -> {
            if (item.isTextual() && !item.asText().isBlank()) suggestions.add(item.asText());
        });
        return suggestions.isEmpty()
                ? "Try to answer each question directly, then add one reason and one example."
                : String.join("\n", suggestions);
    }

    private String speakingPartTitle(String key) {
        return switch (key.toLowerCase()) {
            case "part1" -> "Part 1 - Personal information";
            case "part2" -> "Part 2 - Describe and give reasons";
            case "part3" -> "Part 3 - Compare and explain";
            case "part4" -> "Part 4 - Discuss a topic";
            default -> key;
        };
    }

    private String stripCodeFence(String value) {
        String trimmed = value.trim();
        if (trimmed.startsWith("```json") && trimmed.endsWith("```")) {
            return trimmed.substring(7, trimmed.length() - 3).trim();
        }
        if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
            return trimmed.substring(3, trimmed.length() - 3).trim();
        }
        return trimmed;
    }

    private String blankToEmpty(String value) {
        return value == null ? "" : value;
    }
}
