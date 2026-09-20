package com.example.aptis.repository;

import com.example.aptis.entity.MockTestResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MockTestResultRepository extends JpaRepository<MockTestResult, Long> {
    List<MockTestResult> findByUserIdOrderByCreatedAtDesc(Long userId);
}
