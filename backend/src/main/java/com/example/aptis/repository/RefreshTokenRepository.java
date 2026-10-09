package com.example.aptis.repository;

import com.example.aptis.entity.RefreshToken;
import com.example.aptis.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenAndRevokedFalse(String token);

    List<RefreshToken> findByUserAndRevokedFalseAndExpiresAtAfterOrderByCreatedAtDesc(User user, Instant now);

    @Transactional
    long deleteByRevokedTrueOrExpiresAtBefore(Instant now);
}
