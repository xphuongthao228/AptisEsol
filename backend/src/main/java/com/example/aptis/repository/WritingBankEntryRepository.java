package com.example.aptis.repository;

import com.example.aptis.entity.WritingBankEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WritingBankEntryRepository extends JpaRepository<WritingBankEntry, Long> {
    List<WritingBankEntry> findByBankTypeOrderBySortOrderAscIdAsc(String bankType);
    void deleteByBankType(String bankType);
}
