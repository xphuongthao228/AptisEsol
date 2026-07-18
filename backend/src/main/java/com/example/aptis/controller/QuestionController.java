package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.service.CoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionController {
    private final CoreService service;
    @GetMapping @PreAuthorize("hasRole('ADMIN') or @paymentService.hasActiveAccess(authentication.name)") public ApiResponse<List<CoreDtos.QuestionResponse>> all(@RequestParam(required = false) Long testId) { return ApiResponse.ok(service.questions(testId)); }
    @GetMapping("/{id}") @PreAuthorize("hasRole('ADMIN') or @paymentService.hasActiveAccess(authentication.name)") public ApiResponse<CoreDtos.QuestionResponse> one(@PathVariable Long id) { return ApiResponse.ok(service.question(id)); }
    @PostMapping @PreAuthorize("hasRole('ADMIN')") public ApiResponse<CoreDtos.QuestionResponse> create(@Valid @RequestBody CoreDtos.QuestionRequest request) { return ApiResponse.ok(service.saveQuestion(request)); }
    @PostMapping("/import-csv") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<List<CoreDtos.QuestionResponse>> importCsv(@RequestParam Long testId, @RequestParam("file") MultipartFile file) throws Exception { return ApiResponse.ok(service.importQuestions(testId, file)); }
    @PutMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<CoreDtos.QuestionResponse> update(@PathVariable Long id, @Valid @RequestBody CoreDtos.QuestionRequest request) { return ApiResponse.ok(service.updateQuestion(id, request)); }
    @DeleteMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Void> delete(@PathVariable Long id) { service.deleteQuestion(id); return ApiResponse.message("Deleted", null); }
}
