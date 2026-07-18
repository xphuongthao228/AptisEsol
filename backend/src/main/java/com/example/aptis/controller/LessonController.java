package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.enums.SkillType;
import com.example.aptis.service.CoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/lessons")
@RequiredArgsConstructor
public class LessonController {
    private final CoreService service;

    @GetMapping
    public ApiResponse<List<CoreDtos.LessonResponse>> all(@RequestParam(required = false) SkillType skill) {
        return ApiResponse.ok(service.lessons(skill));
    }

    @GetMapping("/{id}")
    public ApiResponse<CoreDtos.LessonResponse> one(@PathVariable Long id) {
        return ApiResponse.ok(service.lesson(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CoreDtos.LessonResponse> create(@Valid @RequestBody CoreDtos.LessonRequest request) {
        return ApiResponse.ok(service.saveLesson(request));
    }

    @PostMapping("/import-csv")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<CoreDtos.LessonResponse>> importCsv(@RequestParam("file") MultipartFile file) throws Exception {
        return ApiResponse.ok(service.importLessons(file));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<CoreDtos.LessonResponse> update(@PathVariable Long id, @Valid @RequestBody CoreDtos.LessonRequest request) {
        return ApiResponse.ok(service.updateLesson(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        service.deleteLesson(id);
        return ApiResponse.message("Deleted", null);
    }
}
