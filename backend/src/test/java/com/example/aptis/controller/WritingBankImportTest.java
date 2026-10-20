package com.example.aptis.controller;

import com.example.aptis.repository.WritingBankEntryRepository;
import com.example.aptis.service.PaymentService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

@DataJpaTest(showSql = false, properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class WritingBankImportTest {
    @Autowired WritingBankEntryRepository repository;
    @Autowired EntityManager entityManager;

    @Test
    void importsLongAnswerAndFeedbackWithoutTruncation() {
        var controller = new WritingBankController(repository, mock(PaymentService.class));
        String tag = "Writing feedback ".repeat(30);
        String answer = "Thank you for your email. ".repeat(45);
        var request = new WritingBankController.WritingBankEntryRequest(
                "answer-1", "Writing Part 4", "Travel", "Email", "Write an email.",
                "", "120-150", "body", answer, "", "B2", tag);

        controller.replace("answers", List.of(request));
        repository.flush();
        entityManager.clear();

        var entries = repository.findByBankTypeOrderBySortOrderAscIdAsc("answers");
        assertEquals(1, entries.size());
        assertEquals(tag.trim(), entries.get(0).getTag());
        assertEquals(answer.trim(), entries.get(0).getText());
    }
}
