package com.example.aptis.service;
import com.example.aptis.entity.User;
import com.example.aptis.entity.PaymentOrder;
import com.example.aptis.entity.ReferralCommission;
import com.example.aptis.repository.UserRepository;
import com.example.aptis.repository.ReferralCommissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service @RequiredArgsConstructor
public class ReferralService {
    public static final int DISCOUNT_PERCENT = 5;
    public static final int COMMISSION_PERCENT = 5;
    private final UserRepository users;
    private final ReferralCommissionRepository commissions;
    private final com.example.aptis.repository.ReferralWithdrawalRepository withdrawals;
    public record CommissionEntry(Long id, Long orderId, String packageLabel, int baseAmount, int amount,
                                  java.time.LocalDateTime createdAt) {}
    public record ReferralInfo(String code, int discountPercent, int commissionPercent, long totalCommission,
                               long commissionOrders, java.util.List<CommissionEntry> recentCommissions,
                               long availableCommission, long pendingWithdrawal, long withdrawnCommission, long minimumWithdrawal,
                               long referredBuyers) {}
    @Transactional
    public ReferralInfo mine(String email) {
        User found = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        User user = users.findByIdForUpdate(found.getId()).orElseThrow();
        if (user.getShortReferralCode() == null) {
            // Account IDs give stable, collision-free short codes. Keep the original code as an alias.
            String suffix = Long.toString(user.getId(), 36).toUpperCase(java.util.Locale.ROOT);
            user.setShortReferralCode("REF" + "0".repeat(Math.max(0, 6 - suffix.length())) + suffix);
            if (user.getReferralCode() == null) user.setReferralCode(user.getShortReferralCode());
            users.save(user);
        }
        long total = commissions.totalByReferrerId(user.getId());
        long pending = withdrawals.sumForUser(user.getId(), java.util.List.of(com.example.aptis.enums.WithdrawalStatus.PENDING));
        long paid = withdrawals.sumForUser(user.getId(), java.util.List.of(com.example.aptis.enums.WithdrawalStatus.PAID));
        return new ReferralInfo(user.getShortReferralCode(), DISCOUNT_PERCENT, COMMISSION_PERCENT,
                total, commissions.countByReferrerIdAndDeletedAtIsNull(user.getId()),
                commissions.findTop10ByReferrerIdAndDeletedAtIsNullOrderByCreatedAtDesc(user.getId()).stream()
                        .map(item -> new CommissionEntry(item.getId(), item.getPaymentOrder().getId(),
                                item.getPaymentOrder().getPackageLabel(), item.getBaseAmount(), item.getAmount(), item.getCreatedAt())).toList(),
                Math.max(0, total - pending - paid), pending, paid,
                ReferralWithdrawalService.MINIMUM_WITHDRAWAL, commissions.countReferredBuyers(user.getId()));
    }

    /** Called while the payment order is locked, inside its confirmation transaction. */
    @Transactional
    public void creditCommission(PaymentOrder order, User referrer) {
        if (order.getUser().getId().equals(referrer.getId())) throw new IllegalArgumentException("Không thể tự nhận hoa hồng.");
        if (!java.util.Objects.equals(order.getReferrerId(), referrer.getId())) throw new IllegalArgumentException("Người giới thiệu không khớp với đơn thanh toán.");
        if (order.getStatus() != com.example.aptis.enums.PaymentStatus.PAID) throw new IllegalArgumentException("Đơn chưa thanh toán.");
        if (commissions.existsByPaymentOrderId(order.getId())) return;
        ReferralCommission commission = new ReferralCommission();
        commission.setPaymentOrder(order);
        commission.setReferrer(referrer);
        commission.setBaseAmount(order.getAmount());
        commission.setRatePercent(COMMISSION_PERCENT);
        commission.setAmount((int) ((long) order.getAmount() * COMMISSION_PERCENT / 100));
        commissions.save(commission);
    }
    @Transactional(readOnly=true)
    public User validate(String email, String code) {
        User buyer = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        User referrer = users.findByActiveReferralCode(DiscountService.normalize(code))
            .orElseThrow(() -> new IllegalArgumentException("Mã giới thiệu không tồn tại."));
        if (buyer.getId().equals(referrer.getId())) throw new IllegalArgumentException("Bạn không thể sử dụng mã giới thiệu của chính mình.");
        return referrer;
    }
}
