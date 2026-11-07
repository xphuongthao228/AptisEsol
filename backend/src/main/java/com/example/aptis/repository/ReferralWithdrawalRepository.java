package com.example.aptis.repository;

import com.example.aptis.entity.ReferralWithdrawal;
import com.example.aptis.enums.WithdrawalStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface ReferralWithdrawalRepository extends JpaRepository<ReferralWithdrawal, Long> {
    @Query("select coalesce(sum(w.amount), 0) from ReferralWithdrawal w where w.user.id = :userId and w.deletedAt is null and w.status in :statuses")
    long sumForUser(@Param("userId") Long userId, @Param("statuses") Collection<WithdrawalStatus> statuses);
    Optional<ReferralWithdrawal> findByUserIdAndRequestKey(Long userId, String requestKey);
    boolean existsByUserIdAndStatusAndDeletedAtIsNull(Long userId, WithdrawalStatus status);
    Page<ReferralWithdrawal> findByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long userId, Pageable pageable);
    @EntityGraph(attributePaths = "user")
    Page<ReferralWithdrawal> findByStatusAndDeletedAtIsNullOrderByCreatedAtAsc(WithdrawalStatus status, Pageable pageable);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from ReferralWithdrawal w where w.id = :id and w.deletedAt is null")
    Optional<ReferralWithdrawal> findByIdForUpdate(@Param("id") Long id);
}
