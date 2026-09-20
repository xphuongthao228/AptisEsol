package com.example.aptis.service;

import com.example.aptis.dto.SpeakingDtos;
import com.example.aptis.entity.Role;
import com.example.aptis.entity.SpeakingAnswer;
import com.example.aptis.entity.SpeakingAttempt;
import com.example.aptis.entity.Test;
import com.example.aptis.entity.User;
import com.example.aptis.enums.RoleName;
import com.example.aptis.exception.ResourceNotFoundException;
import com.example.aptis.repository.SpeakingAnswerRepository;
import com.example.aptis.repository.SpeakingAttemptRepository;
import com.example.aptis.repository.TestRepository;
import com.example.aptis.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SpeakingAssessmentService {
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("mp3", "wav", "webm");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/wave",
            "audio/x-wav",
            "audio/webm");

    private final ObjectMapper objectMapper;
    private final UserRepository users;
    private final TestRepository tests;
    private final SpeakingAttemptRepository attempts;
    private final SpeakingAnswerRepository answers;

    @Value("${app.ai.deepseek-api-key:}")
    private String deepSeekApiKey;

    @Value("${app.ai.deepseek-model:deepseek-chat}")
    private String deepSeekModel;

    @Value("${app.ai.deepseek-base-url:https://api.deepseek.com}")
    private String deepSeekBaseUrl;

    @Value("${app.ai.transcription-api-key:}")
    private String transcriptionApiKey;

    @Value("${app.ai.transcription-base-url:https://api.groq.com/openai/v1}")
    private String transcriptionBaseUrl;

    @Value("${app.ai.transcription-model:whisper-large-v3-turbo}")
    private String transcriptionModel;

    @Value("${app.speaking.max-audio-bytes:15728640}")
    private long maxAudioBytes;

    private RestClient deepSeekClient;
    private RestClient transcriptionClient;

    @PostConstruct
    void initClients() {
        this.deepSeekClient = RestClient.builder()
                .baseUrl(deepSeekBaseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + safe(deepSeekApiKey))
                .build();
        this.transcriptionClient = RestClient.builder()
                .baseUrl(transcriptionBaseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + safe(transcriptionApiKey))
                .build();
    }

    @Transactional
    public SpeakingDtos.SubmitResponse submit(String authenticatedEmail, Long studentId, Long testId, String rawPart,
            String question, MultipartFile audio) {
        User authenticatedUser = users.findByEmailAndDeletedAtIsNull(authenticatedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User student = users.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        if (!student.getId().equals(authenticatedUser.getId()) && !isAdmin(authenticatedUser)) {
            throw new IllegalArgumentException("Bạn không có quyền nộp bài Speaking cho học viên này.");
        }

        Test test = tests.findById(testId).orElseThrow(() -> new ResourceNotFoundException("Test not found"));
        String part = normalizePart(rawPart);
        validateQuestion(question);
        validateAudio(audio);

        String transcript = transcribe(audio).trim();
        if (transcript.isBlank()) {
            throw new IllegalStateException("Groq Whisper không nhận dạng được nội dung bản ghi âm. Hãy nói rõ hơn và thử lại.");
        }

        SpeakingDtos.PartResult partResult = scorePart(part, question.trim(), transcript);
        SpeakingAttempt attempt = currentAttempt(student, test);
        SpeakingAnswer answer = answers.findByAttemptIdAndPart(attempt.getId(), part).orElseGet(SpeakingAnswer::new);
        answer.setAttempt(attempt);
        answer.setPart(part);
        answer.setQuestion(question.trim());
        answer.setTranscript(transcript);
        applyScore(answer, partResult);
        answers.save(answer);

        SpeakingAttempt refreshed = attempts.findWithAnswersById(attempt.getId()).orElse(attempt);
        SpeakingDtos.Result result = updateAttemptScore(refreshed);
        return new SpeakingDtos.SubmitResponse(refreshed.getId(), transcript, partResult, result);
    }

    private SpeakingAttempt currentAttempt(User student, Test test) {
        return attempts.findByStudentIdAndTestIdOrderByCreatedAtDesc(student.getId(), test.getId()).stream()
                .filter(attempt -> attempt.getAnswers().size() < 4)
                .findFirst()
                .orElseGet(() -> {
                    SpeakingAttempt next = new SpeakingAttempt();
                    next.setStudent(student);
                    next.setTest(test);
                    next.setOverallScore(BigDecimal.ZERO);
                    next.setCefrLevel("A1");
                    return attempts.save(next);
                });
    }

    private void validateQuestion(String question) {
        if (question == null || question.trim().isBlank()) {
            throw new IllegalArgumentException("Question không được để trống.");
        }
    }

    private void validateAudio(MultipartFile audio) {
        if (audio == null || audio.isEmpty()) {
            throw new IllegalArgumentException("Audio file không được để trống.");
        }
        if (audio.getSize() > maxAudioBytes) {
            throw new IllegalArgumentException("Audio file vượt quá dung lượng cho phép.");
        }
        String extension = extension(audio.getOriginalFilename());
        String contentType = safe(audio.getContentType()).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(extension) && !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Chỉ chấp nhận audio mp3, wav hoặc webm.");
        }
    }

    private String transcribe(MultipartFile audio) {
        if (transcriptionApiKey == null || transcriptionApiKey.isBlank()) {
            throw new IllegalStateException("Thiếu TRANSCRIPTION_API_KEY để gọi Groq Whisper.");
        }
        try {
            ByteArrayResource resource = new ByteArrayResource(audio.getBytes()) {
                @Override
                public String getFilename() {
                    String filename = audio.getOriginalFilename();
                    return filename == null || filename.isBlank() ? "speaking.webm" : filename;
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("model", transcriptionModel);
            body.add("file", resource);

            String response = transcriptionClient.post()
                    .uri("/audio/transcriptions")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            return objectMapper.readTree(response).path("text").asText("");
        } catch (RestClientResponseException ex) {
            throw new IllegalStateException("Groq Whisper trả lỗi: " + ex.getResponseBodyAsString(), ex);
        } catch (IOException ex) {
            throw new IllegalStateException("Không đọc được file audio.", ex);
        } catch (Exception ex) {
            throw new IllegalStateException("Không đọc được transcript từ Groq Whisper.", ex);
        }
    }

    private SpeakingDtos.PartResult scorePart(String part, String question, String transcript) {
        if (deepSeekApiKey == null || deepSeekApiKey.isBlank()) {
            throw new IllegalStateException("Thiếu DEEPSEEK_API_KEY để chấm Speaking.");
        }
        String prompt = buildPrompt(part, question, transcript);
        Map<String, Object> request = Map.of(
                "model", deepSeekModel,
                "temperature", 0.2,
                "messages", List.of(
                        Map.of("role", "system", "content", "You are an Aptis ESOL Speaking examiner. Return only valid JSON."),
                        Map.of("role", "user", "content", prompt)));
        try {
            String response = deepSeekClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(String.class);
            String content = objectMapper.readTree(response)
                    .path("choices").path(0).path("message").path("content").asText("");
            return parsePartResult(extractJson(content), part);
        } catch (RestClientResponseException ex) {
            throw new IllegalStateException("DeepSeek trả lỗi: " + ex.getResponseBodyAsString(), ex);
        } catch (Exception ex) {
            throw new IllegalStateException("Không đọc được kết quả chấm Speaking từ DeepSeek.", ex);
        }
    }

    private String buildPrompt(String part, String question, String transcript) {
        return """
                Assess Aptis Speaking %s. Return only JSON.

                Question: %s
                Transcript: %s

                Score used criteria 0-10; unused criteria 0.
                P1: grammar,vocabulary,fluency,pronunciation,taskResponse.
                P2: pictureDescription,vocabularyRange,grammar,fluency,organization.
                P3: comparisonSkill,ideasDevelopment,vocabulary,grammar,fluency.
                P4: opinionDevelopment,examples,vocabularyRange,grammarComplexity,fluency.
                partScore is 0-50. Feedback/strengths/improvements in concise Vietnamese.

                {
                  "part": "%s",
                  "scores": {
                    "grammar": 0,
                    "vocabulary": 0,
                    "fluency": 0,
                    "pronunciation": 0,
                    "taskResponse": 0,
                    "pictureDescription": 0,
                    "vocabularyRange": 0,
                    "organization": 0,
                    "comparisonSkill": 0,
                    "ideasDevelopment": 0,
                    "opinionDevelopment": 0,
                    "examples": 0,
                    "grammarComplexity": 0
                  },
                  "partScore": 0,
                  "mistakes": [{"original": "...", "correction": "..."}],
                  "strengths": ["..."],
                  "improvements": ["..."],
                  "feedback": "..."
                }
                """.formatted(part, question, transcript, part);
    }

    private SpeakingDtos.PartResult parsePartResult(String json, String fallbackPart) throws Exception {
        JsonNode root = objectMapper.readTree(json);
        JsonNode scores = root.path("scores");
        SpeakingDtos.Scores parsedScores = new SpeakingDtos.Scores(
                score(scores, "grammar"),
                score(scores, "vocabulary"),
                score(scores, "fluency"),
                score(scores, "pronunciation"),
                score(scores, "taskResponse"),
                score(scores, "pictureDescription"),
                score(scores, "vocabularyRange"),
                score(scores, "organization"),
                score(scores, "comparisonSkill"),
                score(scores, "ideasDevelopment"),
                score(scores, "opinionDevelopment"),
                score(scores, "examples"),
                score(scores, "grammarComplexity"));
        String part = normalizePart(root.path("part").asText(fallbackPart));
        int partScore = root.path("partScore").isNumber()
                ? clamp(root.path("partScore").asInt(), 0, 50)
                : calculatePartScore(part, parsedScores);
        return new SpeakingDtos.PartResult(
                part,
                parsedScores,
                partScore,
                mistakes(root.path("mistakes")),
                strings(root.path("strengths")),
                strings(root.path("improvements")),
                root.path("feedback").asText(""));
    }

    private int calculatePartScore(String part, SpeakingDtos.Scores scores) {
        return switch (part) {
            case "PART2" -> sum(scores.pictureDescription(), scores.vocabularyRange(), scores.grammar(), scores.fluency(), scores.organization());
            case "PART3" -> sum(scores.comparisonSkill(), scores.ideasDevelopment(), scores.vocabulary(), scores.grammar(), scores.fluency());
            case "PART4" -> sum(scores.opinionDevelopment(), scores.examples(), scores.vocabularyRange(), scores.grammarComplexity(), scores.fluency());
            default -> sum(scores.grammar(), scores.vocabulary(), scores.fluency(), scores.pronunciation(), scores.taskResponse());
        };
    }

    private void applyScore(SpeakingAnswer answer, SpeakingDtos.PartResult result) {
        SpeakingDtos.Scores scores = result.scores();
        answer.setPartScore(result.partScore());
        answer.setGrammarScore(firstPositive(scores.grammar(), scores.grammarComplexity()));
        answer.setVocabularyScore(firstPositive(scores.vocabulary(), scores.vocabularyRange()));
        answer.setFluencyScore(scores.fluency());
        answer.setPronunciationScore(scores.pronunciation());
        answer.setTaskResponseScore(firstPositive(scores.taskResponse(), scores.pictureDescription(), scores.comparisonSkill(), scores.opinionDevelopment()));
        answer.setFeedback(result.feedback());
        answer.setMistakesJson(toJson(result.mistakes()));
        answer.setStrengthsJson(toJson(result.strengths()));
        answer.setImprovementsJson(toJson(result.improvements()));
    }

    private SpeakingDtos.Result updateAttemptScore(SpeakingAttempt attempt) {
        List<SpeakingAnswer> sorted = attempt.getAnswers().stream()
                .sorted(Comparator.comparing(SpeakingAnswer::getPart))
                .toList();
        Integer part1 = scoreFor(sorted, "PART1");
        Integer part2 = scoreFor(sorted, "PART2");
        Integer part3 = scoreFor(sorted, "PART3");
        Integer part4 = scoreFor(sorted, "PART4");
        double averagePartScore = sorted.stream().mapToInt(SpeakingAnswer::getPartScore).average().orElse(0);
        BigDecimal overall = BigDecimal.valueOf(averagePartScore * 2).setScale(2, RoundingMode.HALF_UP);
        String cefr = cefr(overall.doubleValue());
        attempt.setOverallScore(overall);
        attempt.setCefrLevel(cefr);
        attempts.save(attempt);
        String feedback = sorted.stream()
                .map(answer -> answer.getPart() + ": " + safe(answer.getFeedback()))
                .filter(value -> !value.endsWith(": "))
                .collect(java.util.stream.Collectors.joining("\n"));
        return new SpeakingDtos.Result(part1, part2, part3, part4, overall, cefr, feedback);
    }

    private Integer scoreFor(List<SpeakingAnswer> answers, String part) {
        return answers.stream()
                .filter(answer -> part.equals(answer.getPart()))
                .map(SpeakingAnswer::getPartScore)
                .findFirst()
                .orElse(null);
    }

    private String cefr(double score) {
        if (score >= 80) return "C1";
        if (score >= 65) return "B2";
        if (score >= 50) return "B1";
        if (score >= 40) return "A2";
        return "A1";
    }

    private String normalizePart(String raw) {
        String value = safe(raw).trim().toUpperCase(Locale.ROOT).replace(" ", "").replace("_", "");
        if (value.matches("[1-4]")) return "PART" + value;
        if (value.matches("PART[1-4]")) return value;
        throw new IllegalArgumentException("Part chỉ nhận PART1, PART2, PART3 hoặc PART4.");
    }

    private int score(JsonNode scores, String field) {
        return clamp(scores.path(field).asInt(0), 0, 10);
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private int sum(int... values) {
        int total = 0;
        for (int value : values) total += clamp(value, 0, 10);
        return total;
    }

    private int firstPositive(int... values) {
        for (int value : values) {
            if (value > 0) return value;
        }
        return 0;
    }

    private List<SpeakingDtos.Mistake> mistakes(JsonNode node) {
        List<SpeakingDtos.Mistake> result = new ArrayList<>();
        if (!node.isArray()) return result;
        node.forEach(item -> result.add(new SpeakingDtos.Mistake(
                item.path("original").asText(""),
                item.path("correction").asText(""))));
        return result;
    }

    private List<String> strings(JsonNode node) {
        List<String> result = new ArrayList<>();
        if (!node.isArray()) return result;
        node.forEach(item -> {
            String value = item.asText("");
            if (!value.isBlank()) result.add(value);
        });
        return result;
    }

    private String extractJson(String value) {
        String text = safe(value).trim();
        if (text.startsWith("```")) {
            text = text.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
        }
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) return text.substring(start, end + 1);
        return text;
    }

    private String extension(String filename) {
        String value = safe(filename).toLowerCase(Locale.ROOT);
        int index = value.lastIndexOf('.');
        return index >= 0 ? value.substring(index + 1) : "";
    }

    private boolean isAdmin(User user) {
        return user.getRoles().stream().map(Role::getName).anyMatch(RoleName.ADMIN::equals);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "[]";
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
