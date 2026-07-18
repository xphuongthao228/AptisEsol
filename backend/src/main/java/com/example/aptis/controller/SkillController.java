package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.service.CoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/skills")
@RequiredArgsConstructor
public class SkillController {
    private final CoreService service;
    @GetMapping public ApiResponse<List<CoreDtos.SkillResponse>> all() { return ApiResponse.ok(service.skills()); }
    @PostMapping @PreAuthorize("hasRole('ADMIN')") public ApiResponse<CoreDtos.SkillResponse> create(@Valid @RequestBody CoreDtos.SkillRequest request) { return ApiResponse.ok(service.saveSkill(request)); }
    @PutMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<CoreDtos.SkillResponse> update(@PathVariable Long id, @Valid @RequestBody CoreDtos.SkillRequest request) { return ApiResponse.ok(service.updateSkill(id, request)); }
    @DeleteMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") public ApiResponse<Void> delete(@PathVariable Long id) { service.deleteSkill(id); return ApiResponse.message("Deleted", null); }
}
