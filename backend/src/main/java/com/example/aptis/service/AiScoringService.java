package com.example.aptis.service;

import com.example.aptis.dto.AiDtos;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiScoringService {
    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;

    @Value("${app.ai.deepseek-api-key:}")
    private String apiKey;

    @Value("${app.ai.deepseek-model:deepseek-chat}")
    private String model;

    @Value("${app.ai.deepseek-base-url:https://api.deepseek.com}")
    private String baseUrl;

    @Value("${app.ai.transcription-api-key:}")
    private String transcriptionApiKey;

    @Value("${app.ai.transcription-base-url:https://api.groq.com/openai/v1}")
    private String transcriptionBaseUrl;

    @Value("${app.ai.transcription-model:whisper-large-v3-turbo}")
    private String transcriptionModel;

    @Value("${app.ai.max-concurrent-requests:2}")
    private int maxConcurrentRequests;

    private RestClient deepSeekClient;
    private RestClient transcriptionClient;
    private Semaphore aiRequestSemaphore;

    @PostConstruct
    void initHttpClient() {
        this.deepSeekClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + blankToEmpty(apiKey))
                .build();
        this.transcriptionClient = RestClient.builder()
                .baseUrl(transcriptionBaseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + blankToEmpty(transcriptionApiKey))
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
        if (requestWithAudio.parts().stream().noneMatch(this::hasScorableSpeakingAudio)) {
            return fallbackSpeakingScore(requestWithAudio);
        }
        String answers = requestWithAudio.parts().stream()
                .map(part -> """
                        %s
                        Prompt: %s
                        Transcript:
                        %s
                        """.formatted(
                        part.title(),
                        part.prompt(),
                        part.transcript()))
                .collect(Collectors.joining("\n---\n"));

        String prompt = loadPrompt("aptis-speaking-score.md")
                .replace("{{ANSWERS}}", answers);
        long recognizedParts = requestWithAudio.parts().stream().filter(this::hasScorableSpeakingAudio).count();
        int transcriptChars = requestWithAudio.parts().stream()
                .filter(this::hasScorableSpeakingAudio)
                .mapToInt(part -> blankToEmpty(part.transcript()).length())
                .sum();
        log.info("Submitting Speaking to DeepSeek: parts={}, recognizedParts={}, transcriptChars={}",
                requestWithAudio.parts().size(), recognizedParts, transcriptChars);
        String content = chatJson(
                "You are an Aptis ESOL Speaking examiner. Return only valid JSON.",
                prompt);

        try {
            AiDtos.SpeakingScoreResponse result = objectMapper.treeToValue(
                    normalizeSpeakingJson(content), AiDtos.SpeakingScoreResponse.class);
            log.info("DeepSeek Speaking result received: score={}, cefr={}",
                    result.overallScore(), result.cefrLevel());
            return withAudioDiagnostics(result, requestWithAudio);
        } catch (Exception ex) {
            throw new IllegalStateException("Không đọc được kết quả chấm Speaking AI. Vui lòng thử chấm lại.", ex);
        }
    }

    private AiDtos.SpeakingScoreRequest attachAudioMetadata(AiDtos.SpeakingScoreRequest request, List<MultipartFile> audioFiles) {
        if (audioFiles == null || audioFiles.isEmpty()) {
            return request;
        }

        Map<String, MultipartFile> filesByName = new HashMap<>();
        for (MultipartFile file : audioFiles) {
            if (file != null && !file.isEmpty() && file.getOriginalFilename() != null) {
                filesByName.put(file.getOriginalFilename(), file);
            }
        }

        List<AiDtos.SpeakingPartRequest> parts = new ArrayList<>();
        for (int i = 0; i < request.parts().size(); i++) {
            AiDtos.SpeakingPartRequest part = request.parts().get(i);
            MultipartFile file = filesByName.get(blankToEmpty(part.audioFileName()));
            if (file == null && i < audioFiles.size()) {
                file = audioFiles.get(i);
            }
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

            String audioTranscript = transcribeAudioSafely(file);
            parts.add(new AiDtos.SpeakingPartRequest(
                    part.title(),
                    part.prompt(),
                    normalizeAudioTranscript(firstNonBlank(audioTranscript, part.transcript())),
                    blankToEmpty(file.getOriginalFilename()),
                    blankToEmpty(file.getContentType()),
                    file.getSize()));
        }
        return new AiDtos.SpeakingScoreRequest(parts);
    }

    private String transcribeAudioSafely(MultipartFile file) {
        if (transcriptionApiKey == null || transcriptionApiKey.isBlank()) {
            return "";
        }
        try {
            return transcribeAudio(file);
        } catch (Exception ex) {
            log.warn("Groq transcription failed for file={}, size={} bytes: {}",
                    file.getOriginalFilename(), file.getSize(), ex.getMessage());
            // Keep the browser transcript as a fallback when the transcription provider is unavailable.
            return "";
        }
    }

    private String transcribeAudio(MultipartFile file) throws IOException {
        ByteArrayResource audioResource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                String filename = file.getOriginalFilename();
                return filename == null || filename.isBlank() ? "speaking.webm" : filename;
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("model", transcriptionModel);
        body.add("language", "en");
        body.add("response_format", "json");
        body.add("file", audioResource);

        String response = transcriptionClient
                .post()
                .uri("/audio/transcriptions")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .body(String.class);

        try {
            JsonNode root = objectMapper.readTree(response);
            return root.path("text").asText("");
        } catch (Exception ex) {
            throw new IllegalStateException("Không đọc được transcript từ AI: " + ex.getMessage());
        }
    }

    private String normalizeAudioTranscript(String transcript) {
        String value = blankToEmpty(transcript).trim();
        if (value.isBlank() || value.equals("[NO_AUDIO_FILE_SUBMITTED]")) {
            return "[AUDIO_FILE_RECORDED_BUT_TRANSCRIPTION_UNAVAILABLE]";
        }
        return value;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isBlank()) return value.trim();
        }
        return "";
    }

    private String compactForPrompt(String value, int maxLength) {
        String compact = blankToEmpty(value).replaceAll("\\s+", " ").trim();
        if (compact.length() <= maxLength) return compact;
        return compact.substring(0, Math.max(0, maxLength - 3)).trim() + "...";
    }

    public AiDtos.LingoChatResponse chatWithLingo(AiDtos.LingoChatRequest request) {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", loadPrompt("lingo-system.md")));
        if (request.history() != null) {
            request.history().stream()
                    .filter(message -> "user".equals(message.role()) || "assistant".equals(message.role()))
                    .skip(Math.max(0, request.history().stream()
                            .filter(message -> "user".equals(message.role()) || "assistant".equals(message.role())).count() - 12))
                    .forEach(message -> messages.add(Map.of("role", message.role(), "content", message.content())));
        }
        messages.add(Map.of("role", "user", "content", request.message()));

        String reply = chatText(messages);
        return new AiDtos.LingoChatResponse(reply);
    }

    public AiDtos.SpeakingPart4SampleResponse generateSpeakingPart4Sample(AiDtos.SpeakingPart4SampleRequest request) {
        List<String> topics = request.topics().stream()
                .map(this::blankToEmpty)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> compactForPrompt(value, 220))
                .distinct()
                .limit(5)
                .toList();

        if (topics.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn ít nhất một đề Speaking Part 4.");
        }

        String selectedTopics = topics.stream()
                .map(topic -> "- " + topic)
                .collect(Collectors.joining("\n"));
        String prompt = """
                Write one Aptis Speaking Part 4 answer, about 150 words.
                Topics:
                %s

                Rules: natural spoken English, B1-B2 level, one coherent answer, clear opinion, reasons, one personal example. No headings, bullets, translation, or analysis.
                """.formatted(selectedTopics);

        List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", "You write natural Aptis Speaking Part 4 model answers for learners."),
                Map.of("role", "user", "content", prompt));
        String sampleAnswer = chatText(messages, 260).trim();
        return new AiDtos.SpeakingPart4SampleResponse(prompt, sampleAnswer);
    }

    private String chatJson(String systemPrompt, String userPrompt) {
        List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt));
        return chat(messages, true);
    }

    private String chatText(List<Map<String, String>> messages) {
        return chat(messages, false, null);
    }

    private String chatText(List<Map<String, String>> messages, Integer maxTokens) {
        return chat(messages, false, maxTokens);
    }

    private String chat(List<Map<String, String>> messages, boolean jsonMode) {
        return chat(messages, jsonMode, null);
    }

    private String chat(List<Map<String, String>> messages, boolean jsonMode, Integer maxTokens) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Chưa cấu hình DEEPSEEK_API_KEY cho backend.");
        }

        boolean acquired = false;
        try {
            acquired = aiRequestSemaphore.tryAcquire(30, TimeUnit.SECONDS);
            if (!acquired) {
                throw new IllegalStateException("AI is busy. Please try again later.");
            }
            return callDeepSeek(messages, jsonMode, model, maxTokens);
        } catch (RestClientResponseException ex) {
            String body = ex.getResponseBodyAsString(StandardCharsets.UTF_8);
            if (!"deepseek-chat".equals(model) && isModelError(body)) {
                return callDeepSeek(messages, jsonMode, "deepseek-chat", maxTokens);
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

    private String callDeepSeek(List<Map<String, String>> messages, boolean jsonMode, String selectedModel, Integer maxTokens) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", selectedModel);
        body.put("messages", messages);
        body.put("temperature", jsonMode ? 0.2 : 0.5);
        if (jsonMode) {
            body.put("response_format", Map.of("type", "json_object"));
        }
        if (maxTokens != null && maxTokens > 0) {
            body.put("max_tokens", maxTokens);
        }

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
        if (statusCode == 402) {
            return "DeepSeek API không đủ số dư hoặc đã hết hạn mức sử dụng. Hãy kiểm tra Billing/Balance của tài khoản DeepSeek rồi thử lại.";
        }
        if (statusCode == 429) {
            return "DeepSeek API đang giới hạn tần suất hoặc đã hết quota. Hãy chờ một lúc, kiểm tra hạn mức DeepSeek rồi thử lại.";
        }
        return "DeepSeek API đang tạm thời không xử lý được yêu cầu (HTTP " + statusCode + "). Vui lòng thử lại sau ít phút.";
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
                item.put("feedback", learnerSafeSpeakingText(part.path("feedback").asText("")));
                parts.add(item);
            });
        }
        normalized.set("parts", parts);
        normalized.set("criteria", buildSpeakingCriteria(sourceParts));
        normalized.set("pronunciationTips", textArray(root.path("weaknesses"), "Chưa thể đánh giá phát âm thật chi tiết từ dữ liệu hiện tại."));
        normalized.set("fluencyTips", textArray(root.path("improvement_suggestions"), "Develop each answer with reasons, examples, and linking words."));
        normalized.put("improvedAnswer", buildImprovedSpeakingAnswer(root));
        return normalized;
    }

    private AiDtos.SpeakingScoreResponse fallbackSpeakingScore(AiDtos.SpeakingScoreRequest request) {
        List<AiDtos.PartFeedback> parts = request.parts().stream()
                .map(part -> {
                    String feedback = part.audioSizeBytes() == null || part.audioSizeBytes() <= 0
                            ? "Phần này chưa có file ghi âm nên tính 0 điểm."
                            : "Không nhận dạng được nội dung bản ghi âm nên phần này tính 0 điểm.";
                    return new AiDtos.PartFeedback(part.title(), 0, feedback);
                })
                .toList();

        int overallScore = 0;
        String cefrLevel = "Below A1";

        List<AiDtos.CriteriaScore> criteria = List.of(
                new AiDtos.CriteriaScore("Task response", 0, "Chưa có đủ nội dung bài nói để đánh giá mức độ trả lời đúng yêu cầu."),
                new AiDtos.CriteriaScore("Grammar", 0, "Chưa có đủ dữ liệu bài nói rõ ràng nên chưa thể đánh giá ngữ pháp."),
                new AiDtos.CriteriaScore("Vocabulary", 0, "Chưa có đủ dữ liệu bài nói rõ ràng nên chưa thể đánh giá từ vựng."),
                new AiDtos.CriteriaScore("Fluency", 0, "Chưa có dữ liệu nói đủ rõ để đánh giá độ trôi chảy."),
                new AiDtos.CriteriaScore("Pronunciation", 0, "Chưa thể đánh giá phát âm thật chi tiết từ dữ liệu hiện tại.")
        );

        AiDtos.SpeakingScoreResponse result = new AiDtos.SpeakingScoreResponse(
                overallScore,
                cefrLevel,
                "Không có bản ghi âm nhận dạng được để chấm. Bài Speaking được tính 0/50 theo thang điểm Aptis.",
                criteria,
                parts,
                List.of("Kiểm tra quyền microphone của trình duyệt.", "Nói rõ hơn, gần microphone hơn và tránh tiếng ồn nền.", "Dùng Chrome/Edge để trình duyệt hỗ trợ nhận diện giọng nói tốt hơn."),
                List.of("Trả lời trực tiếp câu hỏi, sau đó thêm lý do và ví dụ.", "Nói thành câu hoàn chỉnh thay vì từng từ rời.", "Dùng từ nối như because, for example, in my opinion để bài nói mạch lạc hơn."),
                "I think it is important to answer the question directly, give one clear reason, and add a short example from personal experience.",
                List.of()
        );
        return withAudioDiagnostics(result, request);
    }

    private AiDtos.SpeakingScoreResponse withAudioDiagnostics(
            AiDtos.SpeakingScoreResponse result,
            AiDtos.SpeakingScoreRequest request) {
        List<AiDtos.SpeakingAudioDiagnostic> diagnostics = request.parts().stream()
                .map(part -> {
                    long audioSize = part.audioSizeBytes() == null ? 0 : part.audioSizeBytes();
                    String transcript = blankToEmpty(part.transcript()).trim();
                    boolean unavailable = transcript.isBlank()
                            || "[NO_AUDIO_FILE_SUBMITTED]".equals(transcript)
                            || "[AUDIO_FILE_RECORDED_BUT_TRANSCRIPTION_UNAVAILABLE]".equals(transcript);
                    String status = audioSize <= 0
                            ? "NO_AUDIO"
                            : unavailable ? "NOT_RECOGNIZED" : "RECOGNIZED";
                    log.info("Speaking audio check: part={}, status={}, size={} bytes, transcriptLength={}",
                            part.title(), status, audioSize, unavailable ? 0 : transcript.length());
                    return new AiDtos.SpeakingAudioDiagnostic(
                            part.title(), status, audioSize > 0, audioSize, unavailable ? "" : transcript);
                })
                .toList();
        return new AiDtos.SpeakingScoreResponse(
                result.overallScore(),
                result.cefrLevel(),
                result.summary(),
                result.criteria(),
                result.parts(),
                result.pronunciationTips(),
                result.fluencyTips(),
                result.improvedAnswer(),
                diagnostics);
    }

    private boolean hasScorableSpeakingAudio(AiDtos.SpeakingPartRequest part) {
        if (part.audioSizeBytes() == null || part.audioSizeBytes() <= 0) {
            return false;
        }
        String transcript = blankToEmpty(part.transcript()).trim();
        return !transcript.isBlank()
                && !"[NO_AUDIO_FILE_SUBMITTED]".equals(transcript)
                && !"[AUDIO_FILE_RECORDED_BUT_TRANSCRIPTION_UNAVAILABLE]".equals(transcript);
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
        item.put("feedback", name + " " + (score >= 8 ? "tốt" : score >= 5 ? "đạt mức trung bình" : "cần cải thiện") + " theo nội dung bài nói đã ghi nhận.");
        criteria.add(item);
    }

    private ArrayNode textArray(JsonNode source, String fallback) {
        ArrayNode values = objectMapper.createArrayNode();
        if (source.isArray()) {
            source.forEach(item -> {
                if (item.isTextual() && !item.asText().isBlank()) {
                    values.add(learnerSafeSpeakingText(item.asText()));
                }
            });
        }
        if (values.isEmpty()) {
            values.add(learnerSafeSpeakingText(fallback));
        }
        return values;
    }

    private String learnerSafeSpeakingText(String text) {
        String value = blankToEmpty(text).trim();
        if (value.isBlank()) {
            return "";
        }
        String lower = value.toLowerCase();
        if (lower.contains("pronunciation cannot be reliably assessed")
                || lower.contains("transcript alone")
                || lower.contains("raw waveform")
                || lower.contains("speech-to-text")
                || lower.contains("browser-generated")
                || lower.contains("transcription")) {
            return "Chưa thể đánh giá phát âm thật chi tiết từ dữ liệu hiện tại.";
        }
        return value
                .replace("transcript", "nội dung bài nói")
                .replace("Transcript", "Nội dung bài nói")
                .replace("DeepSeek", "AI")
                .replace("OpenAI", "AI")
                .replace("Groq", "AI")
                .replace("Whisper", "AI");
    }

    private String buildSpeakingSummary(JsonNode root) {
        String level = root.path("cefr_level").asText(root.path("cefrLevel").asText("A1"));
        int score = root.path("overall_score").asInt(root.path("overallScore").asInt(0));
        List<String> strengths = new ArrayList<>();
        root.path("strengths").forEach(item -> {
            if (item.isTextual() && !item.asText().isBlank()) strengths.add(learnerSafeSpeakingText(item.asText()));
        });
        List<String> weaknesses = new ArrayList<>();
        root.path("weaknesses").forEach(item -> {
            if (item.isTextual() && !item.asText().isBlank()) weaknesses.add(learnerSafeSpeakingText(item.asText()));
        });
        String strengthText = strengths.isEmpty() ? "chưa thể hiện nhiều điểm mạnh rõ ràng" : String.join("; ", strengths);
        String weaknessText = weaknesses.isEmpty() ? "cần phát triển câu trả lời đầy đủ hơn" : String.join("; ", weaknesses);
        return "Điểm Speaking: " + score + "/50 (" + level + ")\n"
                + "Điểm mạnh: " + strengthText + ".\n"
                + "Cần cải thiện: " + weaknessText + ".";
    }

    private String buildImprovedSpeakingAnswer(JsonNode root) {
        List<String> suggestions = new ArrayList<>();
        root.path("improvement_suggestions").forEach(item -> {
            if (item.isTextual() && !item.asText().isBlank()) suggestions.add(learnerSafeSpeakingText(item.asText()));
        });
        return suggestions.isEmpty()
                ? "Try to answer each question directly, then add one reason and one example."
                : String.join("\n", suggestions);
    }

    private String speakingPartTitle(String key) {
        String normalized = key.toLowerCase().replace('_', ' ').replaceAll("\\s+", " ").trim();
        if (normalized.startsWith("part ")) {
            String[] numbers = normalized.replaceAll("[^0-9]+", " ").trim().split("\\s+");
            if (numbers.length >= 2) return "Phần " + numbers[0] + " - Câu " + numbers[1];
            if (numbers.length == 1 && !numbers[0].isBlank()) return "Phần " + numbers[0];
        }
        return switch (normalized) {
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
