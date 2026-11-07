package com.example.aptis.repository;

import com.example.aptis.entity.ReferralCommission;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ReferralCommissionRepository extends JpaRepository<ReferralCommission, Long> {
    boolean existsByPaymentOrderId(Long paymentOrderId);

    @Query("select coalesce(sum(c.amount), 0) from ReferralCommission c where c.referrer.id = :userId and c.deletedAt is null")
    long totalByReferrerId(@Param("userId") Long userId);

    long countByReferrerIdAndDeletedAtIsNull(Long userId);

    @Query("select count(distinct c.paymentOrder.user.id) from ReferralCommission c where c.referrer.id = :userId and c.deletedAt is null")
    long countReferredBuyers(@Param("userId") Long userId);

    @EntityGraph(attributePaths = "paymentOrder")
    List<ReferralCommission> findTop10ByReferrerIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long userId);
}
