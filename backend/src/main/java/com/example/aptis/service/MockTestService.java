package com.example.aptis.service;

import com.example.aptis.dto.MockTestDtos;
import com.example.aptis.entity.MockTest;
import com.example.aptis.enums.TestStatus;
import com.example.aptis.exception.ResourceNotFoundException;
import com.example.aptis.repository.MockTestRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MockTestService {
    private final MockTestRepository mockTests;

    public List<MockTestDtos.MockTestResponse> all() {
        return mockTests.findByDeletedAtIsNullOrderByUpdatedAtDesc().stream().map(this::response).toList();
    }

    public List<MockTestDtos.MockTestResponse> published() {
        return mockTests.findByStatusAndDeletedAtIsNullOrderByUpdatedAtDesc(TestStatus.PUBLISHED).stream()
                .map(this::response)
                .toList();
    }

    public MockTestDtos.MockTestResponse save(MockTestDtos.MockTestRequest request) {
        MockTest mockTest = new MockTest();
        apply(mockTest, request);
        return response(mockTests.save(mockTest));
    }

    public MockTestDtos.MockTestResponse update(String id, MockTestDtos.MockTestRequest request) {
        MockTest mockTest = findActive(id);
        apply(mockTest, request);
        return response(mockTests.save(mockTest));
    }

    public void delete(String id) {
        MockTest mockTest = findActive(id);
        mockTest.setDeletedAt(LocalDateTime.now());
        mockTests.save(mockTest);
    }

    private MockTest findActive(String id) {
        MockTest mockTest = findByIdOrExternalId(id);
        if (mockTest.getDeletedAt() != null) throw new ResourceNotFoundException("Mock test not found");
        return mockTest;
    }

    private MockTest findByIdOrExternalId(String id) {
        String value = id == null ? "" : id.trim();
        if (value.isBlank()) throw new ResourceNotFoundException("Mock test not found");
        try {
            return mockTests.findById(Long.parseLong(value))
                    .orElseThrow(() -> new ResourceNotFoundException("Mock test not found"));
        } catch (NumberFormatException ignored) {
            return mockTests.findByExternalIdAndDeletedAtIsNull(value)
                    .orElseThrow(() -> new ResourceNotFoundException("Mock test not found"));
        }
    }

    @Transactional
    public List<MockTestDtos.MockTestResponse> importCsv(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("CSV file is empty");
        List<MockTestDtos.MockTestResponse> imported = new ArrayList<>();
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)) {
            Iterable<CSVRecord> records = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setTrim(true)
                    .build()
                    .parse(reader);
            for (CSVRecord record : records) {
                try {
                    String externalId = csv(record, "id", "");
                    MockTest mockTest = externalId.isBlank()
                            ? new MockTest()
                            : mockTests.findByExternalIdAndDeletedAtIsNull(externalId).orElseGet(MockTest::new);
                    mockTest.setExternalId(externalId);
                    mockTest.setSkill(parseSkill(csv(record, "skill", "FULL")));
                    mockTest.setTitle(required(record, "title"));
                    mockTest.setDescription(csv(record, "description", ""));
                    mockTest.setQuestions(csv(record, "questions", ""));
                    mockTest.setQuestionData(csv(record, "questionData", ""));
                    mockTest.setMinutes(csv(record, "minutes", ""));
                    mockTest.setStatus(parseStatus(csv(record, "status", "PUBLISHED")));
                    mockTest.setFeatured(parseBoolean(csv(record, "featured", "false")));
                    imported.add(response(mockTests.save(mockTest)));
                } catch (RuntimeException ex) {
                    throw new IllegalArgumentException("CSV row " + record.getRecordNumber() + " error: " + ex.getMessage(), ex);
                }
            }
        }
        return imported;
    }

    private void apply(MockTest mockTest, MockTestDtos.MockTestRequest request) {
        mockTest.setExternalId(blankToNull(request.externalId()));
        mockTest.setSkill(parseSkill(request.skill()));
        mockTest.setTitle(request.title());
        mockTest.setDescription(request.description());
        mockTest.setQuestions(request.questions());
        mockTest.setQuestionData(request.questionData());
        mockTest.setMinutes(request.minutes());
        mockTest.setStatus(request.status() == null ? TestStatus.PUBLISHED : request.status());
        mockTest.setFeatured(Boolean.TRUE.equals(request.featured()));
    }

    private MockTestDtos.MockTestResponse response(MockTest mockTest) {
        return new MockTestDtos.MockTestResponse(mockTest.getId(), mockTest.getExternalId(), mockTest.getSkill(),
                mockTest.getTitle(), mockTest.getDescription(), mockTest.getQuestions(), mockTest.getQuestionData(),
                mockTest.getMinutes(), mockTest.getStatus(), mockTest.isFeatured(), mockTest.getUpdatedAt());
    }

    private String csv(CSVRecord record, String name, String fallback) {
        return record.isMapped(name) ? record.get(name).trim() : fallback;
    }

    private String required(CSVRecord record, String name) {
        String value = csv(record, name, "");
        if (value.isBlank()) throw new IllegalArgumentException("Missing " + name);
        return value;
    }

    private String parseSkill(String value) {
        String normalized = value.trim().toUpperCase();
        if (!List.of("FULL", "SPEAKING", "LISTENING", "GRAMMAR", "READING", "WRITING").contains(normalized)) {
            throw new IllegalArgumentException("Invalid skill: " + value);
        }
        return normalized;
    }

    private TestStatus parseStatus(String value) {
        String normalized = value.trim().toUpperCase();
        if (normalized.equals("ĐANG HIỆN") || normalized.equals("DANG HIEN")) return TestStatus.PUBLISHED;
        if (normalized.equals("BẢN NHÁP") || normalized.equals("BAN NHAP")) return TestStatus.DRAFT;
        return TestStatus.valueOf(normalized);
    }

    private boolean parseBoolean(String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase();
        return normalized.equals("true") || normalized.equals("1") || normalized.equals("yes")
                || normalized.equals("y") || normalized.equals("featured") || normalized.equals("important")
                || normalized.equals("quan trong") || normalized.equals("quan trọng");
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
