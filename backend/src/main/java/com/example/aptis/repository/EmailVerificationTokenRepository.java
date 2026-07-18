package com.example.aptis.repository;

import com.example.aptis.entity.EmailVerificationToken;
import com.example.aptis.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    Optional<EmailVerificationToken> findByTokenAndUsedAtIsNull(String token);
    Optional<EmailVerificationToken> findFirstByUserEmailAndTokenAndUsedAtIsNullOrderByCreatedAtDesc(String email, String token);
    Optional<EmailVerificationToken> findFirstByUserEmailAndTokenAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(String email, String token, String purpose);
    List<EmailVerificationToken> findByUserAndPurposeAndUsedAtIsNull(User user, String purpose);
}
