package com.example.aptis.service;

import com.example.aptis.entity.*;
import com.example.aptis.enums.WithdrawalStatus;
import com.example.aptis.repository.*;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor
public class ReferralWithdrawalService {
    public static final long MINIMUM_WITHDRAWAL = 60_000;
    private final UserRepository users;
    private final ReferralCommissionRepository commissions;
    private final ReferralWithdrawalRepository withdrawals;
    @PersistenceContext private EntityManager entityManager;

    public record CreateRequest(@NotNull @Min(MINIMUM_WITHDRAWAL) @Max(9000000000000L) Long amount,
            @NotBlank @Size(max = 100) String bankName,
            @NotBlank @Pattern(regexp = "[0-9]{6,30}") String accountNumber,
            @NotBlank @Size(max = 120) String accountHolder,
            @NotBlank @Pattern(regexp = "[A-Za-z0-9-]{16,36}") String requestKey) {}
    public record ReviewRequest(@NotNull WithdrawalStatus status, @Size(max = 160) String transferReference,
                                @Size(max = 500) String note) {}
    public record WithdrawalResponse(Long id, String fullName, String email, long amount, String bankName,
            String accountNumber, String accountHolder, WithdrawalStatus status, LocalDateTime createdAt,
            LocalDateTime reviewedAt, String transferReference, String adminNote) {}
    public record WithdrawalPage(List<WithdrawalResponse> items, int page, int totalPages, long totalElements) {}

    @Transactional
    public WithdrawalResponse create(String email, CreateRequest request) {
        User found = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        User user = users.findByIdForUpdate(found.getId()).orElseThrow();
        var prior = withdrawals.findByUserIdAndRequestKey(user.getId(), request.requestKey());
        if (prior.isPresent()) {
            ReferralWithdrawal existing = prior.get();
            if (!Objects.equals(existing.getAmount(), request.amount()) || !existing.getBankName().equals(request.bankName().trim())
                    || !existing.getAccountNumber().equals(request.accountNumber()) || !existing.getAccountHolder().equals(request.accountHolder().trim()))
                throw new IllegalArgumentException("Yêu cầu này đã được gửi với thông tin khác. Vui lòng cập nhật lịch sử rút.");
            return response(existing, false);
        }
        if (request.amount() == null || request.amount() < MINIMUM_WITHDRAWAL) throw new IllegalArgumentException("Số tiền rút tối thiểu là 60.000đ.");
        if (withdrawals.existsByUserIdAndStatusAndDeletedAtIsNull(user.getId(), WithdrawalStatus.PENDING))
            throw new IllegalArgumentException("Bạn đang có yêu cầu rút chờ xử lý. Vui lòng chờ admin xử lý trước.");
        long reserved = withdrawals.sumForUser(user.getId(), List.of(WithdrawalStatus.PENDING, WithdrawalStatus.PAID));
        long available = commissions.totalByReferrerId(user.getId()) - reserved;
        if (request.amount() > available) throw new IllegalArgumentException("Số dư hoa hồng khả dụng không đủ.");
        ReferralWithdrawal withdrawal = new ReferralWithdrawal();
        withdrawal.setUser(user); withdrawal.setAmount(request.amount());
        withdrawal.setBankName(request.bankName().trim()); withdrawal.setAccountNumber(request.accountNumber());
        withdrawal.setAccountHolder(request.accountHolder().trim()); withdrawal.setRequestKey(request.requestKey());
        return response(withdrawals.saveAndFlush(withdrawal), false);
    }

    @Transactional(readOnly = true)
    public WithdrawalPage mine(String email, int page, int size) {
        User user = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        var result = withdrawals.findByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(user.getId(), pageable(page, size));
        return new WithdrawalPage(result.getContent().stream().map(w -> response(w, false)).toList(), result.getNumber(), result.getTotalPages(), result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public WithdrawalPage list(WithdrawalStatus status, int page, int size) {
        var result = withdrawals.findByStatusAndDeletedAtIsNullOrderByCreatedAtAsc(status, pageable(page, size));
        return new WithdrawalPage(result.getContent().stream().map(w -> response(w, true)).toList(), result.getNumber(), result.getTotalPages(), result.getTotalElements());
    }

    @Transactional
    public WithdrawalResponse review(String adminEmail, Long id, ReviewRequest request) {
        ReferralWithdrawal found = withdrawals.findById(id).orElseThrow();
        users.findByIdForUpdate(found.getUser().getId()).orElseThrow();
        ReferralWithdrawal withdrawal = withdrawals.findByIdForUpdate(id).orElseThrow();
        entityManager.refresh(withdrawal);
        if (request.status() != WithdrawalStatus.PAID && request.status() != WithdrawalStatus.REJECTED)
            throw new IllegalArgumentException("Chỉ có thể xác nhận đã chuyển khoản hoặc từ chối.");
        String reference = request.transferReference() == null ? "" : request.transferReference().trim();
        String note = request.note() == null ? "" : request.note().trim();
        if (request.status() == WithdrawalStatus.PAID && reference.isEmpty()) throw new IllegalArgumentException("Nhập mã giao dịch chuyển khoản để xác nhận đã trả.");
        if (request.status() == WithdrawalStatus.REJECTED && note.isEmpty()) throw new IllegalArgumentException("Nhập lý do từ chối yêu cầu.");
        if (withdrawal.getStatus() != WithdrawalStatus.PENDING) {
            if (withdrawal.getStatus() == request.status() && (request.status() != WithdrawalStatus.PAID || reference.equals(withdrawal.getTransferReference()))) return response(withdrawal, true);
            throw new IllegalArgumentException("Yêu cầu này đã được xử lý.");
        }
        withdrawal.setStatus(request.status()); withdrawal.setTransferReference(reference.isEmpty() ? null : reference);
        withdrawal.setAdminNote(note.isEmpty() ? null : note); withdrawal.setReviewedAt(LocalDateTime.now());
        withdrawal.setReviewedBy(users.findByEmailAndDeletedAtIsNull(adminEmail).orElseThrow());
        return response(withdrawals.save(withdrawal), true);
    }

    private PageRequest pageable(int page, int size) { return PageRequest.of(Math.max(0, page), Math.max(1, Math.min(50, size))); }
    private WithdrawalResponse response(ReferralWithdrawal w, boolean admin) {
        String account = w.getAccountNumber();
        if (!admin) account = "••••" + account.substring(Math.max(0, account.length() - 4));
        return new WithdrawalResponse(w.getId(), admin ? w.getUser().getFullName() : null,
                admin ? w.getUser().getEmail() : null, w.getAmount(), w.getBankName(), account,
                w.getAccountHolder(), w.getStatus(), w.getCreatedAt(), w.getReviewedAt(), w.getTransferReference(), w.getAdminNote());
    }
}
