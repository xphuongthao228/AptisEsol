package com.example.aptis.repository;
import com.example.aptis.entity.DiscountRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
public interface DiscountRedemptionRepository extends JpaRepository<DiscountRedemption,Long> {
 boolean existsByUserIdAndDiscountId(Long userId,Long discountId);
}
