package com.example.aptis.service;

import com.example.aptis.entity.MockTest;
import com.example.aptis.enums.TestStatus;
import com.example.aptis.repository.MockTestRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MockAccessTest {
    @Test
    void freeAccessUsesNumericOrderAndNeverReturnsLockedContent() {
        var repository = mock(MockTestRepository.class);
        var ten = test(10L, "FULL", "Full Test 10");
        ten.setFeatured(true);
        when(repository.findByStatusAndDeletedAtIsNullOrderByUpdatedAtDesc(TestStatus.PUBLISHED))
                .thenReturn(List.of(ten, test(2L, "FULL", "Full Test 2"),
                        test(1L, "FULL", "Full Test 1"), test(20L, "WRITING", "Writing Test 1")));
        var service = new MockTestService(repository, new ObjectMapper());
        var free = service.published(false);
        var full = free.stream().filter(t -> t.skill().equals("FULL")).toList();
        assertEquals(List.of(1L, 2L, 10L), full.stream().map(t -> t.id()).toList());
        assertTrue(full.get(0).accessible());
        assertTrue(full.get(1).accessible());
        assertFalse(full.get(2).accessible());
        assertNull(full.get(2).questionData());
        assertEquals("private questions", full.get(0).questionData());
        assertTrue(free.stream().filter(t -> t.skill().equals("WRITING")).findFirst().orElseThrow().accessible());
        assertTrue(service.published(true).stream().allMatch(t -> t.accessible() && t.questionData() != null));
    }

    private MockTest test(Long id, String skill, String title) {
        var test = new MockTest();
        test.setId(id);
        test.setSkill(skill);
        test.setTitle(title);
        test.setQuestionData("private questions");
        return test;
    }
}
