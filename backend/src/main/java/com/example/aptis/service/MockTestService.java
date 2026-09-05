package com.example.aptis.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.example.aptis.dto.MockTestDtos;
import com.example.aptis.entity.MockTest;
import com.example.aptis.enums.TestStatus;
import com.example.aptis.exception.ResourceNotFoundException;
import com.example.aptis.repository.MockTestRepository;
import com.example.aptis.util.TextRepair;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MockTestService {
    private final MockTestRepository mockTests;
    private final ObjectMapper objectMapper;

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
            Iterable<CSVRecord> parsed = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setTrim(true)
                    .build()
                    .parse(reader);
            List<CSVRecord> records = new ArrayList<>();
            for (CSVRecord record : parsed) {
                if (!isBlankCsvRecord(record)) records.add(record);
            }

            if (isQuestionRowsCsv(records)) {
                return importQuestionRowsAsMockTests(records);
            }

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
                    mockTest.setStatus(TestStatus.PUBLISHED);
                    mockTest.setFeatured(parseBoolean(csv(record, "featured", "false")));
                    imported.add(response(mockTests.save(mockTest)));
                } catch (RuntimeException ex) {
                    throw new IllegalArgumentException("CSV row " + record.getRecordNumber() + " error: " + ex.getMessage(), ex);
                }
            }
        }
        return imported;
    }

    private List<MockTestDtos.MockTestResponse> importQuestionRowsAsMockTests(List<CSVRecord> records) throws Exception {
        Map<String, List<CSVRecord>> groups = new LinkedHashMap<>();
        for (CSVRecord record : records) {
            String skill = inferSkill(record);
            String title = firstNonBlank(
                    csv(record, "mockTitle", ""),
                    csv(record, "testTitle", ""),
                    csv(record, "examTitle", ""),
                    csv(record, "setTitle", ""));
            if (title.isBlank()) title = "Đề import - " + skillLabel(skill);
            String key = skill + "::" + title;
            groups.computeIfAbsent(key, ignored -> new ArrayList<>()).add(record);
        }

        List<MockTestDtos.MockTestResponse> imported = new ArrayList<>();
        for (List<CSVRecord> group : groups.values()) {
            CSVRecord first = group.get(0);
            String skill = inferSkill(first);
            String title = firstNonBlank(
                    csv(first, "mockTitle", ""),
                    csv(first, "testTitle", ""),
                    csv(first, "examTitle", ""),
                    csv(first, "setTitle", ""),
                    "Đề import - " + skillLabel(skill));
            String externalId = firstNonBlank(csv(first, "id", ""), "import-" + slug(skill + "-" + title));

            MockTest mockTest = mockTests.findByExternalIdAndDeletedAtIsNull(externalId)
                    .or(() -> mockTests.findByTitleAndDeletedAtIsNull(title))
                    .orElseGet(MockTest::new);
            mockTest.setExternalId(externalId);
            mockTest.setSkill(skill);
            mockTest.setTitle(title);
            mockTest.setDescription(firstNonBlank(
                    csv(first, "description", ""),
                    "Đề thi thử được import từ CSV dạng từng câu."));
            mockTest.setQuestions(firstNonBlank(csv(first, "questions", ""), String.valueOf(group.size())));
            mockTest.setQuestionData(questionRowsJson(group));
            mockTest.setMinutes(firstNonBlank(csv(first, "minutes", ""), defaultMinutes(skill)));
            mockTest.setStatus(TestStatus.PUBLISHED);
            mockTest.setFeatured(parseBoolean(csv(first, "featured", "false")));
            imported.add(response(mockTests.save(mockTest)));
        }
        return imported;
    }

    private String questionRowsJson(List<CSVRecord> records) throws Exception {
        ArrayNode rows = objectMapper.createArrayNode();
        for (CSVRecord record : records) {
            ObjectNode row = objectMapper.createObjectNode();
            record.toMap().forEach((key, value) -> {
                String cleaned = value == null ? "" : value.trim();
                if (!cleaned.isBlank()) row.put(key.trim(), cleaned);
            });
            if (!row.hasNonNull("skill")) row.put("skill", inferSkill(record));
            if (!row.hasNonNull("template")) row.put("template", templateForSkill(row.path("skill").asText(), csv(record, "part", "")));
            if (!row.hasNonNull("audioUrl")) {
                String audioUrl = firstNonBlank(
                        flexibleCsv(record, "audioUrl"),
                        flexibleCsv(record, "audio_url"),
                        flexibleCsv(record, "audio"),
                        flexibleCsv(record, "audioLink"),
                        flexibleCsv(record, "linkAudio"),
                        flexibleCsv(record, "link audio"),
                        flexibleCsv(record, "link audio nghe"),
                        flexibleCsv(record, "link nghe"),
                        flexibleCsv(record, "file nghe"),
                        flexibleCsv(record, "url nghe"));
                if (!audioUrl.isBlank()) row.put("audioUrl", extractUrl(audioUrl));
            }
            if (!row.hasNonNull("imageUrl")) {
                String imageUrl = firstNonBlank(
                        flexibleCsv(record, "imageUrl"),
                        flexibleCsv(record, "image_url"),
                        flexibleCsv(record, "image"),
                        flexibleCsv(record, "picture"),
                        flexibleCsv(record, "photo"),
                        flexibleCsv(record, "link anh"),
                        flexibleCsv(record, "link ảnh"),
                        flexibleCsv(record, "url anh"),
                        flexibleCsv(record, "url ảnh"));
                if (!imageUrl.isBlank()) row.put("imageUrl", extractUrl(imageUrl));
            }
            if (!row.hasNonNull("imageUrl2")) {
                String imageUrl2 = firstNonBlank(
                        flexibleCsv(record, "imageUrl2"),
                        flexibleCsv(record, "image_url2"),
                        flexibleCsv(record, "image2"),
                        flexibleCsv(record, "picture2"),
                        flexibleCsv(record, "photo2"),
                        flexibleCsv(record, "link anh 2"),
                        flexibleCsv(record, "link ảnh 2"),
                        flexibleCsv(record, "url anh 2"),
                        flexibleCsv(record, "url ảnh 2"));
                if (!imageUrl2.isBlank()) row.put("imageUrl2", extractUrl(imageUrl2));
            }
            rows.add(row);
        }
        return objectMapper.writeValueAsString(rows);
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
                clean(mockTest.getTitle()), clean(mockTest.getDescription()), clean(mockTest.getQuestions()),
                clean(mockTest.getQuestionData()), clean(mockTest.getMinutes()), mockTest.getStatus(),
                mockTest.isFeatured(), mockTest.getUpdatedAt());
    }

    private String csv(CSVRecord record, String name, String fallback) {
        return record.isMapped(name) ? record.get(name).trim() : fallback;
    }

    private String flexibleCsv(CSVRecord record, String name) {
        String target = normalizeFieldKey(name);
        for (String header : record.toMap().keySet()) {
            if (normalizeFieldKey(header).equals(target)) {
                return record.get(header).trim();
            }
        }
        return "";
    }

    private boolean isQuestionRowsCsv(List<CSVRecord> records) {
        if (records.isEmpty()) return false;
        CSVRecord first = records.get(0);
        boolean mockTestCsv = first.isMapped("title") && first.isMapped("questions") && first.isMapped("minutes");
        if (mockTestCsv) return false;
        return first.isMapped("prompt")
                || first.isMapped("question")
                || first.isMapped("content")
                || first.isMapped("template")
                || first.isMapped("part")
                || first.isMapped("audioUrl")
                || first.isMapped("audio_url")
                || first.isMapped("answer")
                || first.isMapped("options");
    }

    private boolean isBlankCsvRecord(CSVRecord record) {
        for (String value : record) {
            if (value != null && !value.trim().isBlank()) return false;
        }
        return true;
    }

    private String required(CSVRecord record, String name) {
        String value = csv(record, name, "");
        if (value.isBlank()) throw new IllegalArgumentException("Missing " + name);
        return value;
    }

    private String parseSkill(String value) {
        String normalized = value.trim().toUpperCase();
        if (normalized.equals("GRAMMAR_VOCABULARY") || normalized.equals("GRAMMAR&VOCABULARY") || normalized.equals("G&V")) {
            return "GRAMMAR";
        }
        if (!List.of("FULL", "SPEAKING", "LISTENING", "GRAMMAR", "READING", "WRITING").contains(normalized)) {
            throw new IllegalArgumentException("Invalid skill: " + value);
        }
        return normalized;
    }

    private String inferSkill(CSVRecord record) {
        String raw = firstNonBlank(csv(record, "skill", ""), csv(record, "section", ""), csv(record, "template", ""), csv(record, "type", ""));
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if (normalized.contains("SPEAK") || normalized.contains("NOI") || normalized.contains("NÓI")) return "SPEAKING";
        if (normalized.contains("LISTEN") || normalized.contains("NGHE")) return "LISTENING";
        if (normalized.contains("READ") || normalized.contains("DOC") || normalized.contains("ĐỌC")) return "READING";
        if (normalized.contains("WRITE") || normalized.contains("WRIT") || normalized.contains("VIET") || normalized.contains("VIẾT")) return "WRITING";
        if (normalized.contains("GRAMMAR") || normalized.contains("VOCAB") || normalized.contains("NGU PHAP") || normalized.contains("TỪ VỰNG")) return "GRAMMAR";
        if (normalized.contains("FULL")) return "FULL";
        return "FULL";
    }

    private String defaultMinutes(String skill) {
        return switch (skill) {
            case "SPEAKING" -> "12";
            case "LISTENING" -> "40";
            case "GRAMMAR" -> "25";
            case "READING" -> "35";
            case "WRITING" -> "50";
            default -> "162";
        };
    }

    private String skillLabel(String skill) {
        return switch (skill) {
            case "SPEAKING" -> "Speaking";
            case "LISTENING" -> "Listening";
            case "GRAMMAR" -> "Grammar & Vocabulary";
            case "READING" -> "Reading";
            case "WRITING" -> "Writing";
            default -> "Full Aptis";
        };
    }

    private String templateForSkill(String skill, String part) {
        String normalizedPart = part == null ? "" : part.trim();
        return switch (skill) {
            case "SPEAKING" -> "SPEAKING_PART" + (normalizedPart.isBlank() ? "1" : normalizedPart);
            case "LISTENING" -> "LISTENING_AUDIO_MC";
            case "READING" -> normalizedPart.equals("2") || normalizedPart.equals("3") ? "READING_SENTENCE_ORDER" : "READING_GAP_FILL";
            case "WRITING" -> "WRITING_PART" + (normalizedPart.isBlank() ? "1" : normalizedPart);
            case "GRAMMAR" -> "GRAMMAR_MC";
            default -> "FULL_ROW";
        };
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isBlank()) return value.trim();
        }
        return "";
    }

    private String normalizeFieldKey(String value) {
        return java.text.Normalizer.normalize(value == null ? "" : value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace("đ", "d")
                .replace("Đ", "D")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }

    private String extractUrl(String value) {
        String cleaned = value == null ? "" : value.trim().replaceAll("^[\"']|[\"']$", "");
        java.util.regex.Matcher markdown = java.util.regex.Pattern.compile("\\((https?://[^)\\s]+)\\)", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(cleaned);
        if (markdown.find()) return unescapeMarkdownUrl(markdown.group(1));

        java.util.regex.Matcher raw = java.util.regex.Pattern.compile("https?://\\S+", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(cleaned);
        if (raw.find()) return unescapeMarkdownUrl(raw.group().replaceAll("[),.;]+$", ""));
        return unescapeMarkdownUrl(cleaned);
    }

    private String unescapeMarkdownUrl(String value) {
        return value.replaceAll("\\\\([_*.()\\[\\]`#+\\-=!>])", "$1");
    }

    private String slug(String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        normalized = normalized.replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return normalized.isBlank() ? String.valueOf(System.currentTimeMillis()) : normalized;
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

    private String clean(String value) {
        return TextRepair.repair(value);
    }
}
