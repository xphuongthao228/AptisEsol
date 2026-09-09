package com.example.aptis.repository;

import com.example.aptis.entity.PaymentOrder;
import com.example.aptis.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from PaymentOrder p where p.paymentCode = :code")
    Optional<PaymentOrder> findByPaymentCodeForUpdate(@org.springframework.data.repository.query.Param("code") String code);
    Optional<PaymentOrder> findByPaymentCode(String paymentCode);
    boolean existsByPaymentCode(String paymentCode);
    @org.springframework.data.jpa.repository.Query("select p.paymentCode from PaymentOrder p where p.status = :status order by p.createdAt desc")
    List<String> findPaymentCodesByStatus(@org.springframework.data.repository.query.Param("status") PaymentStatus status);
    List<PaymentOrder> findByUserEmailOrderByCreatedAtDesc(String email);
    List<PaymentOrder> findByStatusOrderByCreatedAtDesc(PaymentStatus status);
}
