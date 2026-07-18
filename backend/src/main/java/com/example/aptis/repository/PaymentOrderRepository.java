package com.example.aptis.repository;

import com.example.aptis.entity.PaymentOrder;
import com.example.aptis.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, Long> {
    Optional<PaymentOrder> findByPaymentCode(String paymentCode);
    List<PaymentOrder> findByUserEmailOrderByCreatedAtDesc(String email);
    List<PaymentOrder> findByStatusOrderByCreatedAtDesc(PaymentStatus status);
}
