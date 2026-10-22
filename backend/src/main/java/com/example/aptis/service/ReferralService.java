package com.example.aptis.service;
import com.example.aptis.entity.User;
import com.example.aptis.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
@Service @RequiredArgsConstructor
public class ReferralService {
    private final UserRepository users;
    public record ReferralInfo(String code, int discountPercent, int rewardDays) {}
    @Transactional
    public ReferralInfo mine(String email) {
        User found = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        User user = users.findByIdForUpdate(found.getId()).orElseThrow();
        if (user.getReferralCode() == null) {
            user.setReferralCode("REF" + UUID.randomUUID().toString().replace("-", "").toUpperCase(java.util.Locale.ROOT));
            users.save(user);
        }
        return new ReferralInfo(user.getReferralCode(), 10, 3);
    }
    @Transactional(readOnly=true)
    public User validate(String email, String code) {
        User buyer = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        User referrer = users.findByReferralCodeAndDeletedAtIsNullAndEnabledTrue(DiscountService.normalize(code))
            .orElseThrow(() -> new IllegalArgumentException("Mã giới thiệu không tồn tại."));
        if (buyer.getId().equals(referrer.getId())) throw new IllegalArgumentException("Bạn không thể sử dụng mã giới thiệu của chính mình.");
        if (buyer.getReferredByUserId() != null) throw new IllegalArgumentException("Bạn đã sử dụng ưu đãi giới thiệu.");
        return referrer;
    }
}
