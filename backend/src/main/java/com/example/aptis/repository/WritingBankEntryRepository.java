package com.example.aptis.repository;

import com.example.aptis.entity.WritingBankEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WritingBankEntryRepository extends JpaRepository<WritingBankEntry, Long> {
    List<WritingBankEntry> findByBankTypeOrderBySortOrderAscIdAsc(String bankType);
    void deleteByBankType(String bankType);

    @Modifying
    @Query("delete from WritingBankEntry e where e.bankType = :bank and e.part = :part and e.promptId in :ids")
    int deletePrompts(@Param("bank") String bank, @Param("part") String part, @Param("ids") List<String> ids);
}
