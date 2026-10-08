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

    public String generatePracticeQuestions(String skill, int part, String level, String sourceTitle, String sourceContent) {
        return generatePracticeQuestions(skill, part, level, sourceTitle, sourceContent, List.of());
    }

    public String generatePracticeQuestions(String skill, int part, String level, String sourceTitle,
                                            String sourceContent, List<String> imageUrls) {
        List<String> usableImages = imageUrls == null ? List.of() : imageUrls.stream()
                .filter(url -> url != null && !url.isBlank())
                .limit(2)
                .toList();
        if ("WRITING".equalsIgnoreCase(skill)) {
            String partRules = writingPartRules(part);
            String writingPrompt = """
                    The text inside IMPORTED QUESTION is the exact Aptis question selected by the learner.
                    Use that question as the only task to answer. Do not replace it, summarize it, or invent a different topic.
                    Write a high-quality Aptis ESOL Writing model answer based directly on that exact question.
                    Target CEFR level: %s. Follow Aptis conventions, answer every requirement, use natural English,
                    appropriate vocabulary and grammar for the level, and stay within a realistic Aptis word count.
                    Aptis Writing Part %d rules:
                    %s
                    For Part 4, the imported question contains TWO email tasks. You MUST answer both tasks:
                    first the informal email to the friend, then the formal email to the club president.
                    Do not stop after the first email. Clearly label them "Email 1 - Informal" and
                    "Email 2 - Formal", and include a greeting, complete message, and closing for each one.
                    %s
                    For Part 4, use the following level-specific email form as the structure.
                    Replace every placeholder in square brackets with specific information from the imported question.
                    Never output square-bracket placeholders. Keep the meaning natural and answer the exact task.
                    %s
                    Return ONLY valid JSON in exactly this shape: {"paragraph":"your answer to the imported question"}.
                    The paragraph must be the answer, not a new question and not an explanation.
                    IMPORTED QUESTION TITLE: %s
                    IMPORTED QUESTION:
                    %s
                    """.formatted(level, part, partRules, part == 4 ? writingPart4LengthRules() : "",
                            part == 4 ? writingPart4Form(level) : "", sourceTitle, sourceContent);
            return chatWithOptionalImages("You are DeepSeek Chat acting as an Aptis ESOL Writing tutor. Answer the learner's exact imported question.", writingPrompt, usableImages);
        }
        String prompt = """
                Answer the exact Aptis %s Part %d question selected by the learner.
                Do not create a new question, a practice set, or JSON array.
                Target CEFR level: %s.
                Give a clear, natural, high-quality model answer that directly addresses every requirement
                in the imported question. If the imported question contains multiple numbered questions,
                answer ALL of them in order and label the answers clearly as 1, 2, 3.
                Use the correct format and length for this Aptis task.
                Return ONLY valid JSON in exactly this shape:
                {"paragraph":"your model answer"}
                The paragraph must contain the answer for the learner to read, not an explanation of your process.
                Source title: %s
                Imported question:
                %s
                """.formatted(skill, part, level, sourceTitle, sourceContent);
        String imageInstruction = usableImages.isEmpty() ? "" : """
                Images attached to this Speaking task are authoritative. Analyze them before answering.
                For Part 2, describe the visible picture accurately. For Part 3, compare both pictures,
                identify similarities and differences, then answer the related questions. Do not invent
                visual details that are not present.
                """;
        prompt = prompt + imageInstruction;
        return chatWithOptionalImages("You are an Aptis ESOL tutor. Answer the learner's exact imported question.", prompt, usableImages);
    }

    private String chatWithOptionalImages(String systemPrompt, String userPrompt, List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) return chatJson(systemPrompt, userPrompt);
        List<Map<String, Object>> content = new ArrayList<>();
        content.add(Map.of("type", "text", "text", userPrompt));
        imageUrls.forEach(url -> content.add(Map.of("type", "image_url", "image_url", Map.of("url", url))));
        List<Map<String, Object>> messages = List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", content));
        return chatVision(messages);
    }

    private String chatVision(List<Map<String, Object>> messages) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("Chưa cấu hình DEEPSEEK_API_KEY cho backend.");
        }
        boolean acquired = false;
        try {
            acquired = aiRequestSemaphore.tryAcquire(30, TimeUnit.SECONDS);
            if (!acquired) throw new IllegalStateException("AI is busy. Please try again later.");
            return callDeepSeek(messages, true, model, null);
        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(friendlyAiUnavailableMessage(ex.getStatusCode().value()));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("AI request was interrupted.");
        } finally {
            if (acquired) aiRequestSemaphore.release();
        }
    }

    private String writingPartRules(int part) {
        return switch (part) {
            case 1 -> "Form filling / short personal answers. Produce short, direct answers, usually words or brief sentences, simple and accurate.";
            case 2 -> "Responding to short messages. Produce friendly, relevant replies with clear answers to every prompt, about 20-40 words where suitable.";
            case 3 -> "Social network / forum-style responses. Produce connected comments for multiple prompts, clear opinion, reason and personal detail, about 30-40 words per response where suitable.";
            case 4 -> "Email writing. Produce a complete email or message with greeting, clear purpose, developed details, appropriate tone, and closing. Match informal or formal style from the task.";
            default -> "Match the imported Aptis Writing task format exactly and answer all requirements.";
        };
    }

    private String writingPart4Form(String level) {
        return switch (blankToEmpty(level).trim().toUpperCase()) {
            case "B2" -> """
                    B2 informal email:
                    Hi [Name],
                    Guess what? I've just found out that [news/situation], and I'm really [feeling] about it!
                    Personally, I think [opinion], mainly because [reason]. To be honest, I didn't expect this,
                    but it could actually [effect/result]. I'm thinking of [plan], which might be a great way to
                    [benefit]. Maybe we could also [suggestion] together. Anyway, what do you reckon? I'd love
                    to hear your ideas!
                    Speak soon,
                    [Your name]

                    B2 formal email:
                    Dear Sir or Madam,
                    I am writing regarding [topic/news]. Having recently learned that [situation/change],
                    I would like to express my views on this matter and suggest a few possible solutions.
                    Firstly, I believe that [opinion 1], mainly because [reason]. This could have a significant
                    impact on [people/group], particularly [example]. Therefore, I would suggest [suggestion 1],
                    as this would [benefit/result].
                    Another possible solution would be [suggestion 2]. Not only would this [benefit 1], but it
                    could also [benefit 2]. I believe this would make the situation considerably better for
                    everyone involved.
                    I understand that [acknowledgement]. Nevertheless, I hope you will take these suggestions
                    into consideration.
                    Thank you for your time and attention. I look forward to hearing from you.
                    Yours faithfully,
                    [Your name]
                    """;
            case "C1" -> """
                    C1 informal email:
                    Hi [Name],
                    Great to hear from you! I've just found out about [topic/news], and I must admit I'm rather
                    [feeling] about the whole thing. While I can understand why [acknowledgement], I still feel
                    that [opinion], particularly since [reason]. Perhaps the best way forward would be to
                    [suggestion 1], which could [benefit]. Alternatively, we could [suggestion 2] and see
                    whether that improves the situation. Hopefully, they'll take our concerns on board.
                    Anyway, let me know what you reckon!
                    Take care,
                    [Your name]

                    C1 formal email:
                    Dear Sir or Madam,
                    I am writing in response to the recent announcement regarding [topic]. While I fully
                    appreciate that [acknowledgement], I would like to raise a few concerns and put forward
                    some suggestions that may help address the situation.
                    My main concern is that [problem/opinion], particularly given that [reason/context].
                    This could potentially [negative consequence], especially for [affected group]. One
                    practical way of addressing this issue would be to [suggestion 1], thereby [benefit/result].
                    Alternatively, you may wish to consider [suggestion 2]. This would not only [benefit 1]
                    but would also [benefit 2], making it a more practical solution for everyone concerned.
                    I appreciate that implementing such changes may not be straightforward. Nevertheless, I
                    believe these measures would go a long way towards improving the situation.
                    Thank you for considering my suggestions. I look forward to your response.
                    Yours faithfully,
                    [Your name]
                    """;
            default -> """
                    B1 informal email:
                    Hi [Name],
                    Guess what? I've just heard that [news/situation], and I'm really [feeling] about it!
                    I think [opinion] because [reason]. It sounds like a [good/bad] idea to me. I'm thinking of
                    [plan/action], and maybe we could [suggestion] together. I think it would be [positive result].
                    Anyway, what do you think about it? Have you got any other ideas?
                    Let me know!
                    Take care,
                    [Your name]

                    B1 formal email:
                    Dear Sir or Madam,
                    I am writing about [topic/news]. I have recently heard that [situation], and I would like
                    to share my opinion about it.
                    Firstly, I think [opinion 1] because [reason]. This may cause some problems for [people/group].
                    Therefore, I suggest [suggestion 1]. I think this would help [benefit].
                    Secondly, I think [opinion 2]. It would be a good idea to [suggestion 2] because [reason].
                    This could make the situation better for everyone.
                    I hope you will consider my suggestions and find a good solution to this problem.
                    Thank you for your time. I look forward to hearing from you.
                    Yours faithfully,
                    [Your name]
                    """;
        };
    }

    private String writingPart4LengthRules() {
        return """
                Part 4 length requirements are mandatory:
                - Email 1 - Informal (to a friend): write approximately 65 words for the email body.
                - Email 2 - Formal (to the club president): write between 120 and 150 words for the email body.
                Do not count the greeting, sign-off, name, labels, or separator when counting words.
                Develop the ideas with specific details from the imported question; do not produce short summaries.
                Before returning the answer, check both word counts and expand or shorten the emails as needed.
                """;
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
        String level = normalizeLingoLevel(request.level());
        String levelInstruction = """

                Learner target level: %s.
                Adapt every answer to this Aptis target level:
                - B1: simple common vocabulary, clear short-to-medium sentences, practical explanation and examples.
                - B2: more varied vocabulary, connected reasoning, natural detail and moderate challenge.
                - C1: precise and flexible vocabulary, complex but natural grammar, nuanced explanation and advanced examples.
                When correcting English, show a version appropriate for the selected level and explain briefly in Vietnamese.
                """.formatted(level);
        messages.add(Map.of("role", "system", "content", loadPrompt("lingo-system.md") + levelInstruction));
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

    private String normalizeLingoLevel(String level) {
        return switch (blankToEmpty(level).trim().toUpperCase()) {
            case "B1", "B2", "C1" -> level.trim().toUpperCase();
            default -> "B1";
        };
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
        String level = normalizeLingoLevel(request.level());
        String prompt = """
                Write one Aptis Speaking Part 4 answer of about 150-180 words at CEFR %s.
                Topics:
                %s

                Rules:
                - Create ONE coherent spoken answer that can address all the selected topics.
                - Combine overlapping ideas naturally instead of writing separate answers.
                - Mention or answer the key issue from every selected topic.
                - Include a clear overall opinion, reasons, consequences or comparison where relevant, and one personal example.
                - Use natural spoken English appropriate for %s, with clear linking phrases and no invented specific facts.
                - For B1 and B2, prioritize common, easy-to-remember vocabulary and familiar phrases over advanced or academic words.
                - Return only the answer. Do not use headings, bullets, topic labels, translation, or analysis.
                """.formatted(level, selectedTopics, level);

        List<Map<String, String>> messages = List.of(
                Map.of("role", "system", "content", "You write natural Aptis Speaking Part 4 model answers for learners. Prefer common, memorable vocabulary for B1-B2 learners."),
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

    private String callDeepSeek(List<? extends Map<String, ?>> messages, boolean jsonMode, String selectedModel, Integer maxTokens) {
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
                    String text = item.asText("");
                    ObjectNode correctionNode = objectMapper.createObjectNode();
                    correctionNode.put("partTitle", "");
                    correctionNode.put("original", extractLegacyCorrectionValue(text, "Original:"));
                    correctionNode.put("correction", extractLegacyCorrectionValue(text, "Correction:"));
                    correctionNode.put("explanation", extractLegacyCorrectionValue(text, "Explanation:"));
                    if (correctionNode.path("original").asText().isBlank()
                            && correctionNode.path("correction").asText().isBlank()
                            && correctionNode.path("explanation").asText().isBlank()) {
                        correctionNode.put("explanation", text);
                    }
                    normalized.add(correctionNode);
                    return;
                }
                String original = item.path("original").asText("");
                String correction = item.path("correction").asText("");
                String explanation = item.path("explanation").asText("");
                ObjectNode correctionNode = objectMapper.createObjectNode();
                correctionNode.put("partTitle", item.path("partTitle").asText(item.path("part").asText("")));
                correctionNode.put("original", original);
                correctionNode.put("correction", correction);
                correctionNode.put("explanation", explanation);
                normalized.add(correctionNode);
            });
            objectNode.set("corrections", normalized);
        }
        return root;
    }

    private String extractLegacyCorrectionValue(String text, String label) {
        String value = blankToEmpty(text);
        int start = value.indexOf(label);
        if (start < 0) {
            return "";
        }
        start += label.length();
        int end = value.length();
        for (String nextLabel : List.of("Original:", "Correction:", "Explanation:")) {
            int next = value.indexOf(nextLabel, start);
            if (next >= 0) {
                end = Math.min(end, next);
            }
        }
        return value.substring(start, end).replace("|", "").trim();
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
        normalized.set("corrections", normalizeSpeakingCorrections(root.path("corrections")));
        normalized.put("sampleAnswer", root.path("sample_answer").asText(root.path("sampleAnswer").asText("")));
        return normalized;
    }

    private ArrayNode normalizeSpeakingCorrections(JsonNode source) {
        ArrayNode corrections = objectMapper.createArrayNode();
        if (!source.isArray()) {
            return corrections;
        }
        source.forEach(item -> {
            if (!item.isObject()) {
                return;
            }
            String original = item.path("original").asText("");
            String correction = item.path("correction").asText("");
            String explanation = item.path("explanation").asText("");
            if (original.isBlank() && correction.isBlank() && explanation.isBlank()) {
                return;
            }
            ObjectNode node = objectMapper.createObjectNode();
            node.put("partTitle", item.path("partTitle").asText(item.path("part").asText("")));
            node.put("original", original);
            node.put("correction", correction);
            node.put("explanation", learnerSafeSpeakingText(explanation));
            corrections.add(node);
        });
        return corrections;
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
                List.of(),
                "Part 1: I answer personal questions directly and add a reason or example. Part 2: I describe the picture clearly and explain my opinion. Part 3: I compare the pictures and give reasons. Part 4: I give my opinion, support it with examples, and finish clearly.",
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
                result.corrections(),
                result.sampleAnswer(),
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
