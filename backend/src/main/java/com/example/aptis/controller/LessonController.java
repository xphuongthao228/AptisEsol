package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.enums.SkillType;
import com.example.aptis.service.CoreService;
import com.example.aptis.service.PaymentService;
import com.example.aptis.enums.LessonResourceType;
import com.example.aptis.enums.TestStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.AccessDeniedException;
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
    private final PaymentService paymentService;

    @GetMapping
    public ApiResponse<List<CoreDtos.LessonResponse>> all(@RequestParam(required = false) SkillType skill, Authentication auth) {
        boolean admin = isAdmin(auth);
        return ApiResponse.ok(service.lessons(skill).stream()
                .filter(lesson -> admin || lesson.status() == TestStatus.PUBLISHED)
                .map(lesson -> admin || lesson.resourceType() != LessonResourceType.VIDEO ? lesson
                        : new CoreDtos.LessonResponse(lesson.id(), lesson.skill(), lesson.title(), null, null,
                                lesson.status(), lesson.updatedAt(), lesson.resourceType(), null, lesson.partLabel()))
                .toList());
    }

    @GetMapping("/{id}")
    public ApiResponse<CoreDtos.LessonResponse> one(@PathVariable Long id, Authentication auth) {
        CoreDtos.LessonResponse lesson = service.lesson(id);
        if (!isAdmin(auth)) {
            if (lesson.status() != TestStatus.PUBLISHED || (lesson.resourceType() == LessonResourceType.VIDEO
                    && (auth == null || !paymentService.hasProAccess(auth.getName())))) {
                throw new AccessDeniedException("Video requires an active Pro subscription");
            }
        }
        return ApiResponse.ok(lesson);
    }

    private boolean isAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities().stream().anyMatch(role -> "ROLE_ADMIN".equals(role.getAuthority()));
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
