package com.example.aptis.repository;
import com.example.aptis.entity.DiscountCode;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface DiscountCodeRepository extends JpaRepository<DiscountCode,Long> { Optional<DiscountCode> findByCode(String code); }