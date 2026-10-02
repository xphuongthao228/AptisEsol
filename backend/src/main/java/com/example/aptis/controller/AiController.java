package com.example.aptis.controller;

import com.example.aptis.dto.AiDtos;
import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.entity.LingoChatHistory;
import com.example.aptis.enums.AiScoringUsageType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.aptis.repository.LingoChatHistoryRepository;
import com.example.aptis.repository.UserRepository;
import com.example.aptis.service.AiScoringService;
import com.example.aptis.service.CoreService;
import com.example.aptis.service.AiScoringUsageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.security.Principal;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {
    private final AiScoringService scoringService;
    private final AiScoringUsageService usageService;
    private final CoreService coreService;
    private final ObjectMapper objectMapper;
    private final LingoChatHistoryRepository lingoChatHistoryRepository;
    private final UserRepository userRepository;

    @PostMapping("/practice/generate")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.PracticeGenerateResponse> generatePractice(
            Principal principal, @Valid @RequestBody AiDtos.PracticeGenerateRequest request) {
        CoreDtos.SourcePrompt source = coreService.sourcePrompt(request.sourceTestId(), request.sourceQuestionId());
        if (request.sourcePrompt() != null && !request.sourcePrompt().isBlank()) {
            source = new CoreDtos.SourcePrompt(source.skill(), source.title(), request.sourcePrompt());
        }
        CoreDtos.SourcePrompt finalSource = source;
        String generated = withUsage(principal.getName(), AiScoringUsageType.LINGO_CHAT,
                () -> scoringService.generatePracticeQuestions(finalSource.skill(), request.part(), request.level(),
                        finalSource.title(), finalSource.content(), request.imageUrls()));
        return ApiResponse.ok(new AiDtos.PracticeGenerateResponse(
                null,
                "AI - " + finalSource.title() + " - " + request.level(),
                1,
                extractGeneratedAnswer(generated)));
    }

    @PostMapping("/writing/score")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.WritingScoreResponse> scoreWriting(Principal principal, @Valid @RequestBody AiDtos.WritingScoreRequest request) {
        return ApiResponse.ok(withUsage(principal.getName(), AiScoringUsageType.WRITING,
                () -> scoringService.scoreWriting(request)));
    }

    @PostMapping("/speaking/score")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.SpeakingScoreResponse> scoreSpeaking(Principal principal, @Valid @RequestBody AiDtos.SpeakingScoreRequest request) {
        return ApiResponse.ok(withUsage(principal.getName(), AiScoringUsageType.SPEAKING_FULL_TEST,
                () -> scoringService.scoreSpeaking(request)));
    }

    @PostMapping("/speaking/part4-sample")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.SpeakingPart4SampleResponse> generateSpeakingPart4Sample(
            Principal principal,
            @Valid @RequestBody AiDtos.SpeakingPart4SampleRequest request) {
        return ApiResponse.ok(withUsage(principal.getName(), AiScoringUsageType.SPEAKING_PART4_SAMPLE,
                () -> scoringService.generateSpeakingPart4Sample(request)));
    }

    @PostMapping(value = "/speaking/score-audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.SpeakingScoreResponse> scoreSpeakingAudio(
            Principal principal,
            @RequestPart("payload") String payload,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) throws Exception {
        AiDtos.SpeakingScoreRequest request = objectMapper.readValue(payload, AiDtos.SpeakingScoreRequest.class);
        return ApiResponse.ok(withUsage(principal.getName(), AiScoringUsageType.SPEAKING_FULL_TEST,
                () -> scoringService.scoreSpeaking(request, files == null ? List.of() : files)));
    }

    @PostMapping("/lingo/chat")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.LingoChatResponse> chatWithLingo(Principal principal, @Valid @RequestBody AiDtos.LingoChatRequest request) {
        throw new IllegalStateException("Lingo Chat đang tạm tắt.");
    }

    @PostMapping("/lingo/ask")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<AiDtos.LingoChatResponse> askLingo(
            Principal principal, @Valid @RequestBody AiDtos.LingoChatRequest request) {
        AiDtos.LingoChatResponse response = withUsage(principal.getName(), AiScoringUsageType.LINGO_CHAT,
                () -> scoringService.chatWithLingo(request));
        LingoChatHistory history = new LingoChatHistory();
        history.setUser(userRepository.findByEmailAndDeletedAtIsNull(principal.getName()).orElseThrow());
        history.setQuestion(request.message().trim());
        history.setReply(response.reply());
        lingoChatHistoryRepository.save(history);
        return ApiResponse.ok(response);
    }

    @GetMapping("/lingo/history")
    @PreAuthorize("@paymentService.hasActiveAccess(authentication.name)")
    public ApiResponse<List<AiDtos.LingoChatHistoryResponse>> lingoHistory(Principal principal) {
        return ApiResponse.ok(lingoChatHistoryRepository
                .findTop50ByUserEmailAndDeletedAtIsNullOrderByCreatedAtDesc(principal.getName())
                .stream()
                .map(item -> new AiDtos.LingoChatHistoryResponse(
                        item.getId(), item.getQuestion(), item.getReply(), item.getCreatedAt()))
                .toList());
    }

    private <T> T withUsage(String email, AiScoringUsageType usageType, AiCall<T> call) {
        usageService.consume(email, usageType);
        try {
            return call.execute();
        } catch (RuntimeException ex) {
            usageService.refund(email, usageType);
            throw ex;
        }
    }

    @FunctionalInterface
    private interface AiCall<T> {
        T execute();
    }

    private String extractGeneratedAnswer(String generated) {
        String text = generated == null ? "" : generated.trim();
        if (text.isBlank()) {
            throw new IllegalStateException("AI chưa trả về câu trả lời. Vui lòng thử lại.");
        }
        try {
            var root = objectMapper.readTree(text);
            for (String field : List.of("paragraph", "answer", "modelAnswer", "model_answer", "response", "text", "content")) {
                String value = root.path(field).asText("");
                if (!value.isBlank()) {
                    return value;
                }
            }
        } catch (Exception ignored) {
            // Plain text is still a valid AI answer for this screen.
        }
        if (text.startsWith("```") && text.endsWith("```")) {
            text = text.substring(3, text.length() - 3).trim();
            if (text.startsWith("json")) {
                text = text.substring(4).trim();
            }
        }
        return text;
    }
}
