package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.entity.WritingBankEntry;
import com.example.aptis.repository.WritingBankEntryRepository;
import com.example.aptis.service.PaymentService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/writing-bank")
@RequiredArgsConstructor
public class WritingBankController {
    private final WritingBankEntryRepository repository;
    private final PaymentService paymentService;

    @GetMapping("/{bankType}")
    public ApiResponse<List<WritingBankEntryResponse>> get(@PathVariable String bankType, Authentication auth) {
        boolean admin = auth != null && auth.getAuthorities().stream()
                .anyMatch(role -> "ROLE_ADMIN".equals(role.getAuthority()));
        if (!admin && (auth == null || !auth.isAuthenticated() || !paymentService.hasProAccess(auth.getName()))) {
            throw new AccessDeniedException("Kho Writing yêu cầu tài khoản Pro còn hạn");
        }
        return ApiResponse.ok(repository.findByBankTypeOrderBySortOrderAscIdAsc(normalizeBankType(bankType)).stream()
                .map(this::response)
                .toList());
    }

    @PutMapping("/{bankType}")
    @Transactional
    public ApiResponse<List<WritingBankEntryResponse>> replace(
            @PathVariable String bankType,
            @Valid @RequestBody List<WritingBankEntryRequest> requests
    ) {
        String normalized = normalizeBankType(bankType);
        repository.deleteByBankType(normalized);

        List<WritingBankEntry> entries = new ArrayList<>();
        for (int index = 0; index < requests.size(); index += 1) {
            WritingBankEntryRequest request = requests.get(index);
            WritingBankEntry entry = new WritingBankEntry();
            entry.setBankType(normalized);
            entry.setPromptId(cleanRequired(request.id(), "id", index));
            entry.setPart(cleanRequired(request.part(), "part", index));
            entry.setTopic(cleanRequired(request.topic(), "topic", index));
            entry.setForm(cleanOptional(request.form()));
            entry.setQuestion(cleanRequired(request.question(), "question", index));
            entry.setVi(cleanOptional(request.vi()));
            entry.setTargetWords(cleanOptional(request.targetWords()));
            entry.setSection(cleanRequired(request.section(), "section", index));
            entry.setText(cleanRequired(request.text(), "text", index));
            entry.setTextVi(cleanOptional(request.textVi()));
            entry.setLevel(cleanOptional(request.level()));
            entry.setTag(cleanOptional(request.tag()));
            entry.setSortOrder(index);
            entries.add(entry);
        }

        return ApiResponse.ok(repository.saveAll(entries).stream().map(this::response).toList());
    }

    protected String normalizeBankType(String bankType) {
        if ("answers".equalsIgnoreCase(bankType)) return "answers";
        if ("samples".equalsIgnoreCase(bankType)) return "samples";
        throw new IllegalArgumentException("Loại kho Writing không hợp lệ: " + bankType);
    }

    private String cleanRequired(String value, String field, int index) {
        String cleaned = cleanOptional(value);
        if (cleaned == null) {
            throw new IllegalArgumentException("Dòng " + (index + 1) + " thiếu cột bắt buộc: " + field);
        }
        return cleaned;
    }

    private String cleanOptional(String value) {
        if (value == null) return null;
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private WritingBankEntryResponse response(WritingBankEntry entry) {
        return new WritingBankEntryResponse(
                entry.getPromptId(),
                entry.getPart(),
                entry.getTopic(),
                entry.getForm(),
                entry.getQuestion(),
                entry.getVi(),
                entry.getTargetWords(),
                entry.getSection(),
                entry.getText(),
                entry.getTextVi(),
                entry.getLevel(),
                entry.getTag()
        );
    }

    public record WritingBankEntryRequest(
            @NotBlank String id,
            @NotBlank String part,
            @NotBlank String topic,
            String form,
            @NotBlank String question,
            String vi,
            String targetWords,
            @NotBlank String section,
            @NotBlank String text,
            String textVi,
            String level,
            String tag
    ) {}

    public record WritingBankEntryResponse(
            String id,
            String part,
            String topic,
            String form,
            String question,
            String vi,
            String targetWords,
            String section,
            String text,
            String textVi,
            String level,
            String tag
    ) {}
}
