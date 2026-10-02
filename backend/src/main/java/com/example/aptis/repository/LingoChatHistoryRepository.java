package com.example.aptis.repository;

import com.example.aptis.entity.LingoChatHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LingoChatHistoryRepository extends JpaRepository<LingoChatHistory, Long> {
    List<LingoChatHistory> findTop50ByUserEmailAndDeletedAtIsNullOrderByCreatedAtDesc(String email);
}
