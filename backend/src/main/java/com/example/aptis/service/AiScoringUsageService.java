package com.example.aptis.service;

import com.example.aptis.entity.AiScoringDailyUsage;
import com.example.aptis.entity.User;
import com.example.aptis.enums.AiScoringUsageType;
import com.example.aptis.exception.AiDailyLimitExceededException;
import com.example.aptis.exception.ResourceNotFoundException;
import com.example.aptis.repository.AiScoringDailyUsageRepository;
import com.example.aptis.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class AiScoringUsageService {
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final AiScoringDailyUsageRepository usageRepository;
    private final UserRepository userRepository;

    @Value("${app.ai.daily-scoring-limit:10}")
    private int dailyScoringLimit;

    @Transactional
    public synchronized void consume(String email, AiScoringUsageType usageType) {
        User user = userRepository.findByEmailAndDeletedAtIsNull(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        AiScoringDailyUsage usage = usageRepository.findForUpdate(user.getId(), today, usageType)
                .orElseGet(() -> {
                    AiScoringDailyUsage created = new AiScoringDailyUsage();
                    created.setUser(user);
                    created.setUsageDate(today);
                    created.setUsageType(usageType);
                    created.setUsageCount(0);
                    return created;
                });

        int limit = Math.max(1, dailyScoringLimit);
        if (usage.getUsageCount() >= limit) {
            throw new AiDailyLimitExceededException(
                    "Bạn đã dùng hết " + limit + " lượt chấm AI " + displayName(usageType) + " hôm nay. Vui lòng quay lại vào ngày mai.");
        }
        usage.setUsageCount(usage.getUsageCount() + 1);
        usageRepository.save(usage);
    }

    private String displayName(AiScoringUsageType usageType) {
        return switch (usageType) {
            case WRITING -> "Writing";
            case SPEAKING -> "Speaking";
            case SPEAKING_FULL_TEST -> "Speaking Full Test";
        };
    }
}
