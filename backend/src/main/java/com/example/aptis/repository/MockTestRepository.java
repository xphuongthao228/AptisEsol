package com.example.aptis.repository;

import com.example.aptis.entity.MockTest;
import com.example.aptis.enums.TestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MockTestRepository extends JpaRepository<MockTest, Long> {
    List<MockTest> findByDeletedAtIsNullOrderByUpdatedAtDesc();

    List<MockTest> findByStatusAndDeletedAtIsNullOrderByUpdatedAtDesc(TestStatus status);

    Optional<MockTest> findByExternalIdAndDeletedAtIsNull(String externalId);

    Optional<MockTest> findByTitleAndDeletedAtIsNull(String title);
}
