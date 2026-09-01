package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.service.CoreService;
import com.example.aptis.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionController {
    private final CoreService service;
    private final PaymentService paymentService;

    @GetMapping
    public ApiResponse<List<CoreDtos.QuestionResponse>> all(Authentication auth,
            @RequestParam(required = false) Long testId) {
        if (!isAdmin(auth) && !paymentService.canAccessQuestions(auth.getName(), testId)) {
            throw new AccessDeniedException("Test requires Pro access");
        }
        return ApiResponse.ok(service.questions(testId));
    }

    @GetMapping("/{id}")
    public ApiResponse<CoreDtos.QuestionResponse> one(Authentication auth, @PathVariable Long id) {
        if (!isAdmin(auth) && !paymentService.canAccessQuestion(auth.getName(), id)) {
            throw new AccessDeniedException("Question requires Pro access");
        }
        return ApiResponse.ok(service.question(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CoreDtos.QuestionResponse> create(@Valid @RequestBody CoreDtos.QuestionRequest request) {
        return ApiResponse.ok(service.saveQuestion(request));
    }

    @PostMapping("/import-csv")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CoreDtos.QuestionImportResponse> importCsv(@RequestParam Long testId,
            @RequestParam("file") MultipartFile file) throws Exception {
        return ApiResponse.ok(service.importQuestions(testId, file));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CoreDtos.QuestionResponse> update(@PathVariable Long id,
            @Valid @RequestBody CoreDtos.QuestionRequest request) {
        return ApiResponse.ok(service.updateQuestion(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.deleteQuestion(id);
        return ApiResponse.message("Deleted", null);
    }

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
    }
}
