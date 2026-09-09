package com.example.aptis.service;

import com.example.aptis.entity.MockTest;
import com.example.aptis.repository.MockTestRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class MockTestServiceTest {
    @org.junit.jupiter.api.Test
    void listeningQuestionImportPreservesCsvTypes() throws Exception {
        MockTestRepository repository = mock(MockTestRepository.class);
        when(repository.save(any(MockTest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        String csv = "type,question1,q1_answer1,q1_answer2,correct_answer1\n"
                + "LISTENING_AUDIO_MC,First?,A,B,A\n"
                + "LISTENING_PART2,Match,A,B,A\n"
                + "LISTENING_PART3,Opinion,A,B,A\n"
                + "LISTENING_PART4,Monologue?,A,B,A\n";
        ObjectMapper mapper = new ObjectMapper();
        MockTestService service = new MockTestService(repository, mapper);
        var result = service.importCsv(new MockMultipartFile("file", "listening_de_01_import.csv",
                "text/csv", csv.getBytes(StandardCharsets.UTF_8)));
        assertEquals(1, result.size());
        var saved = org.mockito.ArgumentCaptor.forClass(MockTest.class);
        verify(repository).save(saved.capture());
        var rows = mapper.readTree(saved.getValue().getQuestionData());
        assertEquals(4, rows.size());
        assertEquals("LISTENING_AUDIO_MC", rows.get(0).path("template").asText());
        for (int i = 1; i < 4; i++) {
            assertEquals("LISTENING_PART" + (i + 1), rows.get(i).path("template").asText());
            assertEquals("LISTENING", rows.get(i).path("skill").asText());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "\uFEFF"})
    void reimportUpdatesExistingTestWithOrWithoutBom(String prefix) throws Exception {
        MockTestRepository repository = mock(MockTestRepository.class);
        MockTest existing = new MockTest();
        when(repository.findByExternalIdAndDeletedAtIsNull("full-01")).thenReturn(Optional.of(existing));
        when(repository.save(existing)).thenReturn(existing);
        String csv = prefix + "id,skill,title,questions,questionData,minutes\r\n"
                + "full-01,FULL,Updated test,5 skills,[],162 minutes\r\n";
        MockMultipartFile file = new MockMultipartFile("file", "tests.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));
        MockTestService service = new MockTestService(repository, new ObjectMapper());
        assertEquals(1, service.importCsv(file).size());
        verify(repository).findByExternalIdAndDeletedAtIsNull("full-01");
        verify(repository).save(existing);
        assertEquals("full-01", existing.getExternalId());
        assertEquals("Updated test", existing.getTitle());
    }
}
