package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.enums.WithdrawalStatus;
import com.example.aptis.service.ReferralWithdrawalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/payments/referral/withdrawals")
public class ReferralWithdrawalController {
    private final ReferralWithdrawalService service;
    @PostMapping
    public ApiResponse<ReferralWithdrawalService.WithdrawalResponse> create(Authentication auth, @Valid @RequestBody ReferralWithdrawalService.CreateRequest request) {
        return ApiResponse.ok(service.create(auth.getName(), request));
    }
    @GetMapping("/me")
    public ApiResponse<ReferralWithdrawalService.WithdrawalPage> mine(Authentication auth, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(service.mine(auth.getName(), page, size));
    }
    @GetMapping @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<ReferralWithdrawalService.WithdrawalPage> list(@RequestParam(defaultValue = "PENDING") WithdrawalStatus status, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(service.list(status, page, size));
    }
    @PutMapping("/{id}") @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<ReferralWithdrawalService.WithdrawalResponse> review(Authentication auth, @PathVariable Long id, @Valid @RequestBody ReferralWithdrawalService.ReviewRequest request) {
        return ApiResponse.ok(service.review(auth.getName(), id, request));
    }
}
