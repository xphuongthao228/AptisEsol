package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.AuthDtos;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.service.CoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {
    private final CoreService service;

    @GetMapping public ApiResponse<List<AuthDtos.UserResponse>> all() { return ApiResponse.ok(service.users()); }
    @GetMapping("/{id}") public ApiResponse<AuthDtos.UserResponse> one(@PathVariable Long id) { return ApiResponse.ok(service.user(id)); }
    @PutMapping("/{id}") public ApiResponse<AuthDtos.UserResponse> update(@PathVariable Long id, @Valid @RequestBody CoreDtos.UserUpdateRequest request) { return ApiResponse.ok(service.updateUser(id, request)); }
    @PostMapping("/{id}/extend-access") public ApiResponse<AuthDtos.UserResponse> extendAccess(@PathVariable Long id, @Valid @RequestBody CoreDtos.ExtendUserAccessRequest request) { return ApiResponse.ok(service.extendUserAccess(id, request)); }
    @DeleteMapping("/{id}") public ApiResponse<Void> delete(@PathVariable Long id) { service.deleteUser(id); return ApiResponse.message("Deleted", null); }
}
