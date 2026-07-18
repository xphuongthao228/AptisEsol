package com.example.aptis.controller;

import com.example.aptis.dto.ApiResponse;
import com.example.aptis.dto.PaymentDtos;
import com.example.aptis.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;

    @PostMapping("/renewal")
    public ApiResponse<PaymentDtos.PaymentResponse> createRenewal(Authentication authentication,
                                                                  @Valid @RequestBody PaymentDtos.CreateRenewalPaymentRequest request) {
        return ApiResponse.ok(paymentService.createRenewalPayment(authentication.getName(), request));
    }

    @GetMapping("/status/{paymentCode}")
    public ApiResponse<PaymentDtos.PaymentResponse> status(Authentication authentication, @PathVariable String paymentCode) {
        return ApiResponse.ok(paymentService.status(authentication.getName(), paymentCode));
    }

    @GetMapping("/me")
    public ApiResponse<List<PaymentDtos.PaymentResponse>> mine(Authentication authentication) {
        return ApiResponse.ok(paymentService.myPayments(authentication.getName()));
    }

    @GetMapping("/subscription/me")
    public ApiResponse<PaymentDtos.SubscriptionResponse> subscription(Authentication authentication) {
        return ApiResponse.ok(paymentService.subscription(authentication.getName()));
    }

    @GetMapping("/revenue")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<PaymentDtos.PaymentResponse>> revenue() {
        return ApiResponse.ok(paymentService.paidPayments());
    }

    @GetMapping("/revenue/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<PaymentDtos.RevenueSummary> revenueSummary() {
        return ApiResponse.ok(paymentService.revenueSummary());
    }

    @PostMapping("/sepay/webhook")
    public ApiResponse<PaymentDtos.SepayWebhookResponse> sepayWebhook(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestHeader(value = "X-SePay-Token", required = false) String sepayToken,
            @RequestHeader(value = "X-Webhook-Token", required = false) String webhookToken,
            @RequestBody PaymentDtos.SepayWebhookRequest request) {
        return ApiResponse.message("Webhook received", paymentService.handleSepayWebhook(request, authorization, sepayToken, webhookToken));
    }
}
