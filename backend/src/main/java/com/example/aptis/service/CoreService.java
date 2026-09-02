package com.example.aptis.service;

import com.example.aptis.dto.AuthDtos;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.entity.*;
import com.example.aptis.enums.MediaType;
import com.example.aptis.enums.QuestionType;
import com.example.aptis.enums.RoleName;
import com.example.aptis.enums.SkillType;
import com.example.aptis.enums.TestMode;
import com.example.aptis.enums.TestStatus;
import com.example.aptis.exception.ResourceNotFoundException;
import com.example.aptis.mapper.DtoMapper;
import com.example.aptis.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.text.Normalizer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
public class CoreService {
    private static final int EXAM_POINT_PER_QUESTION = 2;
    private static final String RANDOM_TEST_TITLE_PREFIX = "Đề thi thử Random";
    private static final String LEGACY_RANDOM_TEST_TITLE_PREFIX = "Bộ đề Random";

    private final UserRepository users;
    private final SkillRepository skills;
    private final TestRepository tests;
    private final QuestionRepository questions;
    private final AnswerRepository answers;
    private final LessonRepository lessons;
    private final PredictionRepository predictions;
    private final SubmissionRepository submissions;
    private final SubmissionAnswerRepository submissionAnswers;
    private final PracticeScoreRepository practiceScores;
    private final ProgressRepository progress;
    private final MediaFileRepository mediaFiles;
    private final LeaderboardSettingsRepository leaderboardSettings;
    private final DtoMapper mapper;
    private final ObjectMapper objectMapper;

    @Value("${app.upload-dir}")
    private String uploadDir;

    @Value("${app.subscription.free-trial-days:0}")
    private int freeTrialDays;

    public List<AuthDtos.UserResponse> users() {
        return users.findAll().stream().filter(u -> u.getDeletedAt() == null).map(mapper::user).toList();
    }

    public AuthDtos.UserResponse user(Long id) {
        return mapper.user(users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found")));
    }

    public AuthDtos.UserResponse updateUser(Long id, CoreDtos.UserUpdateRequest request) {
        User user = users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setFullName(request.fullName());
        if (request.enabled() != null)
            user.setEnabled(request.enabled());
        return mapper.user(users.save(user));
    }

    public AuthDtos.UserResponse extendUserAccess(Long id, CoreDtos.ExtendUserAccessRequest request) {
        User user = users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime base = effectiveAccessExpiresAt(user);
        if (base == null || base.isBefore(now)) {
            base = now;
        }
        user.setProExpiresAt(base.plusDays(request.days()));
        user.setEnabled(true);
        return mapper.user(users.save(user));
    }

    private LocalDateTime effectiveAccessExpiresAt(User user) {
        LocalDateTime trialExpiresAt = freeTrialDays > 0 && user.getCreatedAt() != null
                ? user.getCreatedAt().plusDays(freeTrialDays)
                : null;
        LocalDateTime proExpiresAt = user.getProExpiresAt();

        if (trialExpiresAt == null)
            return proExpiresAt;
        if (proExpiresAt == null)
            return trialExpiresAt;
        return proExpiresAt.isAfter(trialExpiresAt) ? proExpiresAt : trialExpiresAt;
    }

    public void deleteUser(Long id) {
        User user = users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setDeletedAt(LocalDateTime.now());
        users.save(user);
    }

    public List<CoreDtos.SkillResponse> skills() {
        return skills.findAll().stream().map(mapper::skill).toList();
    }

    public CoreDtos.SkillResponse saveSkill(CoreDtos.SkillRequest request) {
        Skill skill = skills.findByType(request.type()).orElseGet(Skill::new);
        skill.setType(request.type());
        skill.setName(request.name());
        skill.setDescription(request.description());
        return mapper.skill(skills.save(skill));
    }

    public CoreDtos.SkillResponse updateSkill(Long id, CoreDtos.SkillRequest request) {
        Skill skill = skills.findById(id).orElseThrow(() -> new ResourceNotFoundException("Skill not found"));
        skill.setType(request.type());
        skill.setName(request.name());
        skill.setDescription(request.description());
        return mapper.skill(skills.save(skill));
    }

    public void deleteSkill(Long id) {
        Skill skill = skills.findById(id).orElseThrow(() -> new ResourceNotFoundException("Skill not found"));
        skill.setDeletedAt(LocalDateTime.now());
        skills.save(skill);
    }

    public List<CoreDtos.TestResponse> tests() {
        return tests.findByDeletedAtIsNull().stream()
                .map(test -> mapper.test(test, questions.countByTestIdAndDeletedAtIsNull(test.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public CoreDtos.TestResponse test(Long id) {
        Test test = tests.findById(id).orElseThrow(() -> new ResourceNotFoundException("Test not found"));
        return mapper.test(test, questions.countByTestIdAndDeletedAtIsNull(test.getId()));
    }

    public CoreDtos.TestResponse saveTest(CoreDtos.TestRequest request) {
        Test test = new Test();
        applyTest(test, request);
        Test saved = tests.save(test);
        return mapper.test(saved, questions.countByTestIdAndDeletedAtIsNull(saved.getId()));
    }

    @Transactional
    public CoreDtos.TestResponse createRandomTest(CoreDtos.RandomTestRequest request) {
        CoreDtos.RandomTestRequest safeRequest = request == null ? new CoreDtos.RandomTestRequest(null, null, null) : request;
        SkillType skillType = safeRequest.skill() == null ? SkillType.LISTENING : safeRequest.skill();
        TestMode mode = safeRequest.mode() == null ? TestMode.EXAM : safeRequest.mode();
        Skill skill = skills.findByType(skillType)
                .orElseThrow(() -> new ResourceNotFoundException("Skill not found"));
        List<Question> questionBank = new ArrayList<>(questions.findQuestionBank(skillType, mode, TestStatus.PUBLISHED).stream()
                .filter(question -> !isGeneratedRandomTest(question.getTest()))
                .toList());
        if (questionBank.isEmpty()) {
            throw new ResourceNotFoundException("Chưa có câu hỏi đã xuất bản để tạo đề thi thử random.");
        }

        Collections.shuffle(questionBank);
        int requestedCount = safeRequest.questionCount() != null && safeRequest.questionCount() > 0
                ? safeRequest.questionCount()
                : defaultRandomQuestionCount(skillType);
        int questionCount = Math.min(requestedCount, questionBank.size());

        Test randomTest = new Test();
        randomTest.setSkill(skill);
        randomTest.setTitle("%s - %s".formatted(RANDOM_TEST_TITLE_PREFIX, skill.getName()));
        randomTest.setDescription("Đề được tạo tự động bằng cách random câu hỏi từ ngân hàng câu hỏi đã xuất bản.");
        randomTest.setDurationMinutes(defaultRandomDuration(skillType));
        randomTest.setStatus(TestStatus.PUBLISHED);
        randomTest.setMode(mode);
        randomTest.setFeatured(false);
        Test savedTest = tests.save(randomTest);

        for (int index = 0; index < questionCount; index++) {
            Question copy = copyQuestion(questionBank.get(index), savedTest, index + 1);
            questions.save(copy);
        }

        return mapper.test(savedTest, questionCount);
    }

    public CoreDtos.TestResponse updateTest(Long id, CoreDtos.TestRequest request) {
        Test test = tests.findById(id).orElseThrow(() -> new ResourceNotFoundException("Test not found"));
        applyTest(test, request);
        Test saved = tests.save(test);
        return mapper.test(saved, questions.countByTestIdAndDeletedAtIsNull(saved.getId()));
    }

    public void deleteTest(Long id) {
        Test test = tests.findById(id).orElseThrow(() -> new ResourceNotFoundException("Test not found"));
        test.setDeletedAt(LocalDateTime.now());
        tests.save(test);
    }

    @Transactional
    public List<CoreDtos.TestResponse> splitWritingCollectionTest(Long id) {
        Test source = tests.findById(id).orElseThrow(() -> new ResourceNotFoundException("Test not found"));
        if (source.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Test not found");
        }
        List<Question> sourceQuestions = questions.findByTestIdAndDeletedAtIsNullOrderBySortOrderAsc(id);
        if (source.getSkill() == null || source.getSkill().getType() != SkillType.WRITING
                || !isWritingCollectionQuestions(sourceQuestions)) {
            throw new IllegalArgumentException("Test này không phải Writing collection có thể tách thành nhiều đề.");
        }

        List<CoreDtos.TestResponse> splitTests = new ArrayList<>();
        for (Question sourceQuestion : sourceQuestions) {
            String title = cleanTopic(firstNonBlank(sourceQuestion.getTopic(), source.getTitle()));
            Test test = new Test();
            test.setSkill(source.getSkill());
            test.setTitle(title);
            test.setDescription(firstNonBlank(source.getDescription(), title));
            test.setDurationMinutes(source.getDurationMinutes());
            test.setStatus(source.getStatus());
            test.setMode(source.getMode() == null ? TestMode.EXAM : source.getMode());
            test.setFeatured(sourceQuestion.isFeatured() || source.isFeatured());
            Test savedTest = tests.save(test);

            Question copy = copyQuestion(sourceQuestion, savedTest, 1);
            questions.save(copy);
            splitTests.add(mapper.test(savedTest, 1));
        }

        source.setDeletedAt(LocalDateTime.now());
        tests.save(source);
        return splitTests;
    }

    private boolean isWritingCollectionQuestions(List<Question> sourceQuestions) {
        if (sourceQuestions == null || sourceQuestions.size() < 2) {
            return false;
        }
        Map<String, Boolean> topics = new LinkedHashMap<>();
        for (Question question : sourceQuestions) {
            String topic = cleanTopic(question.getTopic());
            String content = question.getContent() == null ? "" : question.getContent();
            if (question.getType() != QuestionType.TEXT || topic.isBlank()
                    || !content.contains("\"template\":\"WRITING_")) {
                return false;
            }
            topics.put(topic, Boolean.TRUE);
        }
        return topics.size() == sourceQuestions.size();
    }

    private void applyTest(Test test, CoreDtos.TestRequest request) {
        test.setSkill(
                skills.findById(request.skillId()).orElseThrow(() -> new ResourceNotFoundException("Skill not found")));
        test.setTitle(request.title());
        test.setDescription(request.description());
        if (request.durationMinutes() != null)
            test.setDurationMinutes(request.durationMinutes());
        if (request.status() != null)
            test.setStatus(request.status());
        if (request.mode() != null)
            test.setMode(request.mode());
        test.setFeatured(Boolean.TRUE.equals(request.featured()));
    }

    private Question copyQuestion(Question source, Test targetTest, int sortOrder) {
        Question copy = new Question();
        copy.setTest(targetTest);
        copy.setType(source.getType());
        copy.setContent(source.getContent());
        copy.setTopic(source.getTopic());
        copy.setAudioUrl(source.getAudioUrl());
        copy.setScriptText(source.getScriptText());
        copy.setExplanation(source.getExplanation());
        copy.setPoints(source.getPoints());
        copy.setSortOrder(sortOrder);
        copy.setFeatured(source.isFeatured());

        source.getAnswers().forEach(sourceAnswer -> {
            Answer answer = new Answer();
            answer.setQuestion(copy);
            answer.setContent(sourceAnswer.getContent());
            answer.setCorrect(sourceAnswer.isCorrect());
            answer.setSortOrder(sourceAnswer.getSortOrder());
            copy.getAnswers().add(answer);
        });

        return copy;
    }

    private int defaultRandomQuestionCount(SkillType skillType) {
        return switch (skillType) {
            case LISTENING -> 17;
            case SPEAKING, WRITING -> 4;
            case READING, GRAMMAR -> 25;
        };
    }

    private int defaultRandomDuration(SkillType skillType) {
        return switch (skillType) {
            case LISTENING, WRITING -> 50;
            case SPEAKING -> 12;
            case READING, GRAMMAR -> 35;
        };
    }

    private boolean isGeneratedRandomTest(Test test) {
        return test.getTitle() != null
                && (test.getTitle().startsWith(RANDOM_TEST_TITLE_PREFIX)
                        || test.getTitle().startsWith(LEGACY_RANDOM_TEST_TITLE_PREFIX));
    }

    @Transactional
    public List<CoreDtos.TestResponse> importTests(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("CSV/ZIP file is empty");
        }
        if (isZipUpload(file)) {
            return importExamTestsFromZip(file);
        }
        List<CoreDtos.TestResponse> imported = new ArrayList<>();
        List<CSVRecord> records = new ArrayList<>();
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)) {
            records.addAll(readCsvRecords(reader));
        }
        if (isWritingCollectionRows(records)) {
            return importWritingRowsAsExamTests(records);
        }
        if (isFullTestRows(records)) {
            return importFullTestRows(records);
        }
        if (isQuestionCsvRecords(records)) {
            return List.of(importExamTestFromQuestionRecords(file.getOriginalFilename(), records));
        }
        for (CSVRecord record : records) {
            try {
                Skill skill = skillForType(parseSkillType(requiredCsv(record, "skill")));
                TestMode mode = parseTestMode(csv(record, "mode", "PRACTICE"));
                Test test = new Test();
                test.setSkill(skill);
                test.setTitle(requiredCsv(record, "title"));
                test.setDescription(csv(record, "description", ""));
                test.setDurationMinutes(parseInteger(record, "duration_minutes",
                        mode == TestMode.EXAM ? defaultExamDuration(skill.getType()) : 30));
                test.setStatus(parseTestStatus(csv(record, "status", "PUBLISHED")));
                test.setMode(mode);
                test.setFeatured(parseBoolean(csv(record, "featured", "false")));
                Test saved = tests.save(test);
                imported.add(mapper.test(saved, 0));
            } catch (RuntimeException ex) {
                throw new IllegalArgumentException(
                        "CSV row " + record.getRecordNumber() + " error: " + ex.getMessage(), ex);
            }
        }
        return imported;
    }

    private List<CoreDtos.TestResponse> importExamTestsFromZip(MultipartFile file) throws Exception {
        List<CoreDtos.TestResponse> imported = new ArrayList<>();
        try (ZipInputStream zip = new ZipInputStream(file.getInputStream(), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (entry.isDirectory() || !entry.getName().toLowerCase().endsWith(".csv")) {
                    continue;
                }

                List<CSVRecord> records = readCsvRecords(new InputStreamReader(
                        new ByteArrayInputStream(readZipEntry(zip)), StandardCharsets.UTF_8));
                if (records.isEmpty()) {
                    continue;
                }

                if (isFullTestRows(records)) {
                    imported.addAll(importFullTestRows(records));
                } else {
                    imported.add(importExamTestFromQuestionRecords(entry.getName(), records));
                }
            }
        }
        if (imported.isEmpty()) {
            throw new IllegalArgumentException("ZIP does not contain any CSV question files");
        }
        return imported;
    }

    private boolean isFullTestRows(List<CSVRecord> records) {
        if (records == null || records.isEmpty()) {
            return false;
        }
        return records.stream().anyMatch(record -> isFullTestSkill(csv(record, "skill", ""))
                && !fullTestPayload(record).isBlank());
    }

    private List<CoreDtos.TestResponse> importFullTestRows(List<CSVRecord> records) {
        List<CoreDtos.TestResponse> imported = new ArrayList<>();
        for (CSVRecord record : records) {
            if (!isFullTestSkill(csv(record, "skill", ""))) {
                continue;
            }
            try {
                imported.addAll(importFullTestRow(record));
            } catch (RuntimeException ex) {
                throw new IllegalArgumentException(
                        "CSV row " + record.getRecordNumber() + " error: " + ex.getMessage(), ex);
            }
        }
        if (imported.isEmpty()) {
            throw new IllegalArgumentException("CSV does not contain any FULL_TEST rows");
        }
        return imported;
    }

    private List<CoreDtos.TestResponse> importFullTestRow(CSVRecord record) {
        String payload = fullTestPayload(record);
        if (payload.isBlank()) {
            throw new IllegalArgumentException("FULL_TEST row must contain JSON data in questionData/questions/content");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(sanitizeJsonPayload(payload));
        } catch (Exception ex) {
            throw new IllegalArgumentException("FULL_TEST JSON is invalid: " + ex.getMessage(), ex);
        }
        if (root == null || !root.isObject()) {
            throw new IllegalArgumentException("FULL_TEST JSON must be an object");
        }

        String baseTitle = requiredCsv(record, "title");
        String description = firstNonBlank(csv(record, "description", ""), baseTitle);
        TestStatus status = parseTestStatus(firstNonBlank(csv(record, "status", ""), csv(record, "minutes", "")));
        boolean featured = parseBoolean(csv(record, "featured", ""));
        List<CoreDtos.TestResponse> imported = new ArrayList<>();
        for (SkillType skillType : List.of(
                SkillType.SPEAKING,
                SkillType.LISTENING,
                SkillType.GRAMMAR,
                SkillType.READING,
                SkillType.WRITING)) {
            List<JsonNode> items = fullTestSectionItems(root, skillType);
            if (items.isEmpty()) {
                continue;
            }

            Test test = new Test();
            test.setSkill(skillForType(skillType));
            test.setTitle(baseTitle);
            test.setDescription(description);
            test.setDurationMinutes(defaultExamDuration(skillType));
            test.setStatus(status);
            test.setMode(TestMode.EXAM);
            test.setFeatured(featured);
            Test savedTest = tests.save(test);

            int importedQuestions = 0;
            for (JsonNode item : items) {
                Question question = buildQuestionFromFullTestItem(item, savedTest, skillType, importedQuestions + 1);
                questions.save(question);
                importedQuestions++;
            }
            imported.add(mapper.test(savedTest, importedQuestions));
        }

        if (imported.isEmpty()) {
            throw new IllegalArgumentException("FULL_TEST JSON does not contain skill sections");
        }
        return imported;
    }

    private String fullTestPayload(CSVRecord record) {
        for (String column : List.of("questionData", "questions", "data", "content")) {
            String value = csv(record, column, "").trim();
            if (value.startsWith("{") || value.startsWith("[")) {
                return value;
            }
        }
        return "";
    }

    private List<JsonNode> fullTestSectionItems(JsonNode root, SkillType skillType) {
        JsonNode section = root.path(skillType.name().toLowerCase());
        if (section.isMissingNode() && skillType == SkillType.GRAMMAR) {
            section = root.path("grammar_vocabulary");
        }
        List<JsonNode> items = new ArrayList<>();
        collectFullTestItems(section, skillType, "", items);
        return items;
    }

    private void collectFullTestItems(JsonNode node, SkillType skillType, String part, List<JsonNode> items) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                collectFullTestItems(child, skillType, part, items);
            }
            return;
        }
        if (!node.isObject()) {
            return;
        }

        boolean containsNestedParts = false;
        var fields = node.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            JsonNode child = field.getValue();
            if (child != null && (child.isArray() || child.isObject())
                    && field.getKey().toLowerCase().matches("part\\d+")) {
                containsNestedParts = true;
                collectFullTestItems(child, skillType, field.getKey().replaceAll("\\D+", ""), items);
            }
        }
        if (!containsNestedParts) {
            ObjectNode copy = node.deepCopy();
            copy.put("skill", skillType.name());
            if (!part.isBlank() && !copy.hasNonNull("part")) {
                copy.put("part", part);
            }
            items.add(copy);
        }
    }

    private Question buildQuestionFromFullTestItem(JsonNode item, Test test, SkillType skillType, int sortOrder) {
        Question q = new Question();
        q.setTest(test);
        String rawType = text(item, "type", "TEXT").trim().toUpperCase();
        q.setType(questionTypeForImportedFullTest(rawType));
        q.setTopic(cleanTopic(text(item, "topic", "")));
        q.setAudioUrl(jsonAudioUrl(item));
        q.setScriptText(firstNonBlank(text(item, "script_text", ""), text(item, "scriptText", "")));
        q.setExplanation(text(item, "explanation", ""));
        q.setPoints(intValue(item, "points", 1));
        q.setSortOrder(intValue(item, "sort_order", sortOrder));
        q.setFeatured(boolValue(item, "featured", false));
        q.setContent(fullTestQuestionContent(item, skillType));
        return q;
    }

    private QuestionType questionTypeForImportedFullTest(String rawType) {
        if (rawType.equals("SINGLE_CHOICE") || rawType.equals("MULTIPLE_CHOICE")
                || rawType.equals("AUDIO") || rawType.equals("SPEAKING")) {
            return parseQuestionType(rawType);
        }
        return QuestionType.TEXT;
    }

    private String fullTestQuestionContent(JsonNode item, SkillType skillType) {
        String rawContent = text(item, "content", "").trim();
        if (rawContent.startsWith("{") || rawContent.startsWith("[")) {
            try {
                JsonNode parsed = objectMapper.readTree(sanitizeJsonPayload(rawContent));
                JsonNode normalized = normalizeFullTestJsonNode(parsed, item, skillType);
                return objectMapper.writeValueAsString(normalized);
            } catch (Exception ignored) {
                // Fall through and preserve the row fields below.
            }
        }

        ObjectNode data = objectMapper.createObjectNode();
        if (item.isObject()) {
            item.fields().forEachRemaining(entry -> data.set(camelCaseCsvKey(entry.getKey()), entry.getValue()));
        }
        data.put("skill", skillType.name());
        if (!data.hasNonNull("prompt") && !rawContent.isBlank()) {
            data.put("prompt", rawContent);
        }
        if (!data.hasNonNull("audioUrl")) {
            data.put("audioUrl", jsonAudioUrl(item));
        }
        if (!data.hasNonNull("scriptText")) {
            data.put("scriptText", firstNonBlank(text(item, "script_text", ""), text(item, "scriptText", "")));
        }
        ArrayNode options = optionsFromFullTestItem(item);
        if (options.size() > 0 && !data.hasNonNull("options")) {
            data.set("options", options);
        }
        String correctAnswer = correctAnswerFromFullTestItem(item, options);
        if (!correctAnswer.isBlank() && !data.hasNonNull("correctAnswer")) {
            data.put("correctAnswer", correctAnswer);
        }
        try {
            return objectMapper.writeValueAsString(data);
        } catch (Exception ex) {
            throw new IllegalArgumentException("cannot serialize FULL_TEST question", ex);
        }
    }

    private JsonNode normalizeFullTestJsonNode(JsonNode parsed, JsonNode source, SkillType skillType) {
        if (parsed.isObject()) {
            ObjectNode data = ((ObjectNode) parsed).deepCopy();
            data.put("skill", skillType.name());
            String part = text(source, "part", "");
            if (!part.isBlank() && !data.hasNonNull("part")) {
                data.put("part", part);
            }
            for (String field : List.of("topic", "audioUrl", "scriptText", "explanation")) {
                String value = text(source, field, "");
                if (!value.isBlank() && !data.hasNonNull(field)) {
                    data.put(field, value);
                }
            }
            String audioUrl = jsonAudioUrl(source);
            if (!audioUrl.isBlank() && !data.hasNonNull("audioUrl")) {
                data.put("audioUrl", audioUrl);
            }
            String scriptText = firstNonBlank(text(source, "script_text", ""), text(source, "scriptText", ""));
            if (!scriptText.isBlank() && !data.hasNonNull("scriptText")) {
                data.put("scriptText", scriptText);
            }
            return data;
        }
        return parsed;
    }

    private ArrayNode optionsFromFullTestItem(JsonNode item) {
        ArrayNode options = objectMapper.createArrayNode();
        for (int i = 1; i <= 8; i++) {
            String option = text(item, "answer" + i, "");
            if (!option.isBlank()) {
                options.add(option);
            }
        }
        return options;
    }

    private String correctAnswerFromFullTestItem(JsonNode item, ArrayNode options) {
        String direct = firstNonBlank(text(item, "correct_answer", ""), text(item, "correctAnswer", ""));
        if (!direct.isBlank()) {
            return direct;
        }
        int correctIndex = intValue(item, "correct_index", 0);
        if (correctIndex > 0 && correctIndex <= options.size()) {
            return options.get(correctIndex - 1).asText();
        }
        return "";
    }

    private String sanitizeJsonPayload(String value) {
        return value == null ? "" : value.replaceAll(":\\s*NaN(?=\\s*[,}])", ": null");
    }

    private boolean isFullTestSkill(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase();
        return normalized.equals("FULL_TEST") || normalized.equals("FULL") || normalized.equals("FULLTEST");
    }

    private String text(JsonNode node, String field, String defaultValue) {
        if (node == null || !node.has(field) || node.get(field).isNull()) {
            return defaultValue;
        }
        String value = node.get(field).asText(defaultValue);
        return "NaN".equalsIgnoreCase(value) ? defaultValue : value;
    }

    private String textAny(JsonNode node, String... fields) {
        for (String field : fields) {
            String value = text(node, field, "");
            if (!value.isBlank()) return value;
        }
        return "";
    }

    private String jsonAudioUrl(JsonNode node) {
        return textAny(node,
                "audioUrl",
                "audio_url",
                "audio",
                "audioLink",
                "audio_link",
                "linkAudio",
                "link_audio",
                "linkAudioNghe",
                "link_audio_nghe",
                "recordingUrl",
                "recording_url",
                "fileUrl",
                "file_url",
                "url");
    }

    private int intValue(JsonNode node, String field, int defaultValue) {
        if (node == null || !node.has(field) || node.get(field).isNull()) {
            return defaultValue;
        }
        JsonNode value = node.get(field);
        if (value.isNumber()) {
            return value.asInt(defaultValue);
        }
        try {
            return Integer.parseInt(value.asText().trim());
        } catch (RuntimeException ex) {
            return defaultValue;
        }
    }

    private boolean boolValue(JsonNode node, String field, boolean defaultValue) {
        if (node == null || !node.has(field) || node.get(field).isNull()) {
            return defaultValue;
        }
        JsonNode value = node.get(field);
        return value.isBoolean() ? value.asBoolean(defaultValue) : parseBoolean(value.asText());
    }

    private String camelCaseCsvKey(String key) {
        return switch (key) {
            case "audio_url" -> "audioUrl";
            case "script_text" -> "scriptText";
            case "correct_index" -> "correctIndex";
            case "correct_answer" -> "correctAnswer";
            case "sort_order" -> "sortOrder";
            default -> key;
        };
    }

    private CoreDtos.TestResponse importExamTestFromQuestionRecords(String sourceName, List<CSVRecord> records) {
        SkillType skillType = inferCsvSkill(sourceName, records);
        Skill skill = skillForType(skillType);
        CSVRecord first = records.get(0);
        String title = firstNonBlank(csv(first, "test_title", ""), titleFromSourceName(sourceName, skillType));
        Test test = new Test();
        test.setSkill(skill);
        test.setTitle(title);
        test.setDescription(firstNonBlank(csv(first, "description", ""), title));
        test.setDurationMinutes(parseInteger(first, "duration_minutes", defaultExamDuration(skillType)));
        test.setStatus(parseTestStatus(csv(first, "status", "PUBLISHED")));
        test.setMode(TestMode.EXAM);
        test.setFeatured(parseBoolean(csv(first, "featured", "false")));
        Test savedTest = tests.save(test);

        int importedQuestions = 0;
        for (CSVRecord record : records) {
            try {
                Question question = buildQuestionFromCsv(record, savedTest, importedQuestions + 1);
                question.setSortOrder(parseInteger(record, "sort_order", importedQuestions + 1));
                questions.save(question);
                importedQuestions++;
            } catch (RuntimeException ex) {
                throw new IllegalArgumentException(sourceName + " row " + record.getRecordNumber()
                        + " error: " + ex.getMessage(), ex);
            }
        }
        return mapper.test(savedTest, importedQuestions);
    }

    private boolean isQuestionCsvRecords(List<CSVRecord> records) {
        if (records == null || records.isEmpty()) {
            return false;
        }
        CSVRecord first = records.get(0);
        return hasCsvHeader(first, "type") && hasCsvHeader(first, "content")
                && !hasCsvHeader(first, "skill") && !hasCsvHeader(first, "title");
    }

    private List<CSVRecord> readCsvRecords(Reader reader) throws Exception {
        List<CSVRecord> records = new ArrayList<>();
        try (Reader closeableReader = reader) {
            Iterable<CSVRecord> parsedRecords = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setTrim(true)
                    .build()
                    .parse(closeableReader);
            for (CSVRecord record : parsedRecords) {
                if (!isBlankCsvRecord(record)) {
                    records.add(record);
                }
            }
        }
        return records;
    }

    private byte[] readZipEntry(ZipInputStream zip) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = zip.read(buffer)) != -1) {
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }

    private boolean isZipUpload(MultipartFile file) {
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        return filename.endsWith(".zip") || "application/zip".equalsIgnoreCase(file.getContentType())
                || "application/x-zip-compressed".equalsIgnoreCase(file.getContentType());
    }

    private SkillType inferCsvSkill(String sourceName, List<CSVRecord> records) {
        for (CSVRecord record : records) {
            String skill = csv(record, "skill", "");
            if (!skill.isBlank()) {
                return parseSkillType(skill);
            }
        }

        String normalizedName = sourceName == null ? "" : sourceName.toLowerCase();
        if (normalizedName.contains("listening") || normalizedName.contains("listen")) return SkillType.LISTENING;
        if (normalizedName.contains("speaking") || normalizedName.contains("speak")) return SkillType.SPEAKING;
        if (normalizedName.contains("writing") || normalizedName.contains("write")) return SkillType.WRITING;
        if (normalizedName.contains("grammar")) return SkillType.GRAMMAR;
        return SkillType.READING;
    }

    private String titleFromSourceName(String sourceName, SkillType skillType) {
        String filename = sourceName == null ? "" : sourceName.replace("\\", "/");
        int slashIndex = filename.lastIndexOf('/');
        if (slashIndex >= 0) {
            filename = filename.substring(slashIndex + 1);
        }
        filename = filename.replaceFirst("(?i)\\.csv$", "")
                .replaceAll("(?i)_?import$", "")
                .replace('_', ' ')
                .replace('-', ' ')
                .trim();

        String[] parts = filename.split("\\s+");
        for (int i = 0; i < parts.length - 1; i++) {
            if (parts[i].equalsIgnoreCase("de") && parts[i + 1].matches("\\d+")) {
                return skillName(skillType) + " Test " + parts[i + 1];
            }
            if (parts[i].matches("(?i)de\\d+")) {
                return skillName(skillType) + " Test " + parts[i].replaceAll("\\D+", "");
            }
        }
        if (parts.length > 0 && parts[parts.length - 1].matches("(?i)de\\d+")) {
            return skillName(skillType) + " Test " + parts[parts.length - 1].replaceAll("\\D+", "");
        }
        return filename.isBlank() ? skillName(skillType) + " Test" : filename;
    }

    private int defaultExamDuration(SkillType skillType) {
        return switch (skillType) {
            case LISTENING -> 40;
            case SPEAKING -> 12;
            case READING -> 35;
            case WRITING -> 50;
            case GRAMMAR -> 25;
        };
    }

    public List<CoreDtos.LessonResponse> lessons(com.example.aptis.enums.SkillType skill) {
        List<Lesson> list = skill == null
                ? lessons.findByDeletedAtIsNullOrderByUpdatedAtDesc()
                : lessons.findBySkillAndDeletedAtIsNullOrderByUpdatedAtDesc(skill);
        return list.stream().map(mapper::lesson).toList();
    }

    public CoreDtos.LessonResponse lesson(Long id) {
        Lesson lesson = lessons.findById(id).orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));
        if (lesson.getDeletedAt() != null)
            throw new ResourceNotFoundException("Lesson not found");
        return mapper.lesson(lesson);
    }

    public CoreDtos.LessonResponse saveLesson(CoreDtos.LessonRequest request) {
        Lesson lesson = new Lesson();
        applyLesson(lesson, request);
        return mapper.lesson(lessons.save(lesson));
    }

    public CoreDtos.LessonResponse updateLesson(Long id, CoreDtos.LessonRequest request) {
        Lesson lesson = lessons.findById(id).orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));
        if (lesson.getDeletedAt() != null)
            throw new ResourceNotFoundException("Lesson not found");
        applyLesson(lesson, request);
        return mapper.lesson(lessons.save(lesson));
    }

    public void deleteLesson(Long id) {
        Lesson lesson = lessons.findById(id).orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));
        lesson.setDeletedAt(LocalDateTime.now());
        lessons.save(lesson);
    }

    private void applyLesson(Lesson lesson, CoreDtos.LessonRequest request) {
        lesson.setSkill(request.skill());
        lesson.setTitle(request.title());
        lesson.setSummary(request.summary());
        lesson.setContent(firstNonBlank(firstNonBlank(request.content(), request.summary()), request.title()));
        lesson.setStatus(request.status() == null ? com.example.aptis.enums.TestStatus.PUBLISHED : request.status());
        lesson.setResourceType(request.resourceType() == null ? com.example.aptis.enums.LessonResourceType.TIP : request.resourceType());
        lesson.setResourceUrl(request.resourceUrl());
        lesson.setPartLabel(request.partLabel());
    }

    @Transactional
    public List<CoreDtos.LessonResponse> importLessons(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("CSV file is empty");
        }
        List<CoreDtos.LessonResponse> imported = new ArrayList<>();
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)) {
            Iterable<CSVRecord> records = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setTrim(true)
                    .build()
                    .parse(reader);
            for (CSVRecord record : records) {
                try {
                    Lesson lesson = new Lesson();
                    lesson.setSkill(parseSkillType(requiredCsv(record, "skill")));
                    lesson.setTitle(requiredCsv(record, "title"));
                    lesson.setSummary(csv(record, "summary", ""));
                    lesson.setContent(requiredCsv(record, "content"));
                    lesson.setStatus(parseTestStatus(csv(record, "status", "PUBLISHED")));
                    lesson.setResourceType(parseLessonResourceType(csv(record, "resource_type", "TIP")));
                    lesson.setResourceUrl(csv(record, "resource_url", ""));
                    lesson.setPartLabel(csv(record, "part_label", ""));
                    imported.add(mapper.lesson(lessons.save(lesson)));
                } catch (RuntimeException ex) {
                    throw new IllegalArgumentException(
                            "CSV row " + record.getRecordNumber() + " error: " + ex.getMessage(), ex);
                }
            }
        }
        return imported;
    }

    private com.example.aptis.enums.LessonResourceType parseLessonResourceType(String value) {
        if (value == null || value.isBlank()) {
            return com.example.aptis.enums.LessonResourceType.TIP;
        }
        return com.example.aptis.enums.LessonResourceType.valueOf(value.trim().toUpperCase());
    }

    public List<CoreDtos.PredictionResponse> predictions(com.example.aptis.enums.SkillType skill,
            boolean publishedOnly) {
        List<Prediction> list;
        if (skill != null && publishedOnly) {
            list = predictions.findBySkillAndStatusAndDeletedAtIsNullOrderByPriorityAscUpdatedAtDesc(
                    skill, com.example.aptis.enums.TestStatus.PUBLISHED);
        } else if (skill != null) {
            list = predictions.findBySkillAndDeletedAtIsNullOrderByPriorityAscUpdatedAtDesc(skill);
        } else if (publishedOnly) {
            list = predictions.findByStatusAndDeletedAtIsNullOrderByPriorityAscUpdatedAtDesc(
                    com.example.aptis.enums.TestStatus.PUBLISHED);
        } else {
            list = predictions.findByDeletedAtIsNullOrderByPriorityAscUpdatedAtDesc();
        }
        return list.stream().map(mapper::prediction).toList();
    }

    public CoreDtos.PredictionResponse prediction(Long id) {
        Prediction prediction = predictions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prediction not found"));
        if (prediction.getDeletedAt() != null)
            throw new ResourceNotFoundException("Prediction not found");
        return mapper.prediction(prediction);
    }

    public CoreDtos.PredictionResponse savePrediction(CoreDtos.PredictionRequest request) {
        Prediction prediction = new Prediction();
        applyPrediction(prediction, request);
        return mapper.prediction(predictions.save(prediction));
    }

    public CoreDtos.PredictionResponse updatePrediction(Long id, CoreDtos.PredictionRequest request) {
        Prediction prediction = predictions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prediction not found"));
        if (prediction.getDeletedAt() != null)
            throw new ResourceNotFoundException("Prediction not found");
        applyPrediction(prediction, request);
        return mapper.prediction(predictions.save(prediction));
    }

    public void deletePrediction(Long id) {
        Prediction prediction = predictions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prediction not found"));
        prediction.setDeletedAt(LocalDateTime.now());
        predictions.save(prediction);
    }

    private void applyPrediction(Prediction prediction, CoreDtos.PredictionRequest request) {
        prediction.setSkill(request.skill());
        prediction.setTitle(request.title());
        prediction.setSummary(request.summary());
        prediction.setContent(request.content());
        prediction.setTags(request.tags());
        prediction.setPriority(request.priority() == null || request.priority() < 1 ? 1 : request.priority());
        prediction
                .setStatus(request.status() == null ? com.example.aptis.enums.TestStatus.PUBLISHED : request.status());
    }

    public List<CoreDtos.QuestionResponse> questions(Long testId) {
        List<Question> list = testId == null
                ? questions.findByDeletedAtIsNullOrderBySortOrderAsc()
                : questions.findByTestIdAndDeletedAtIsNullOrderBySortOrderAsc(testId);
        return list.stream().map(mapper::question).toList();
    }

    public CoreDtos.QuestionResponse question(Long id) {
        return mapper.question(questions.findWithAnswersById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question not found")));
    }

    @Transactional
    public CoreDtos.QuestionResponse saveQuestion(CoreDtos.QuestionRequest request) {
        Question q = new Question();
        applyQuestion(q, request);
        return mapper.question(questions.save(q));
    }

    @Transactional
    public CoreDtos.QuestionResponse updateQuestion(Long id, CoreDtos.QuestionRequest request) {
        Question q = questions.findById(id).orElseThrow(() -> new ResourceNotFoundException("Question not found"));
        q.getAnswers().clear();
        applyQuestion(q, request);
        return mapper.question(questions.save(q));
    }

    @Transactional
    public void deleteQuestion(Long id) {
        Question q = questions.findById(id).orElseThrow(() -> new ResourceNotFoundException("Question not found"));
        practiceScores.deleteByQuestionId(id);
        submissionAnswers.deleteByQuestionId(id);
        questions.delete(q);
    }

    @Transactional
    public CoreDtos.QuestionImportResponse importQuestions(Long testId, MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("CSV file is empty");
        }
        Test test = tests.findById(testId).orElseThrow(() -> new ResourceNotFoundException("Test not found"));
        List<CSVRecord> records = new ArrayList<>();
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)) {
            Iterable<CSVRecord> parsedRecords = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setTrim(true)
                    .build()
                    .parse(reader);
            for (CSVRecord record : parsedRecords) {
                if (!isBlankCsvRecord(record)) {
                    records.add(record);
                }
            }
        }
        if (records.isEmpty()) {
            throw new IllegalArgumentException("CSV does not contain any question rows");
        }
        if (shouldSplitWritingRowsIntoTests(test, records)) {
            return importWritingRowsAsTests(test, records);
        }

        List<Question> imported = new ArrayList<>();
        List<String> speakingPart3Items = new ArrayList<>();
        Question speakingPart3Question = null;
        int speakingPart3Total = 0;
        for (CSVRecord record : records) {
            try {
                String rawType = csv(record, "type", "SINGLE_CHOICE").trim().toUpperCase();
                Question q = buildQuestionFromCsv(record, test, imported.size() + 1);
                if (rawType.equals("SPEAKING_PART3") && hasSpeakingPart3Columns(record)) {
                    if (speakingPart3Question == null) {
                        speakingPart3Question = q;
                    }
                    if (speakingPart3Total == 0) {
                        speakingPart3Total = parseInteger(record, "total", 0);
                    }
                    speakingPart3Items.add(buildSpeakingPart3QuestionItem(record, speakingPart3Items.size()));
                    continue;
                }
                imported.add(questions.save(q));
            } catch (RuntimeException ex) {
                throw new IllegalArgumentException(
                        "CSV row " + record.getRecordNumber() + " error: " + ex.getMessage());
            }
        }
        if (!speakingPart3Items.isEmpty()) {
            speakingPart3Question.setContent(buildSpeakingPart3Template(
                    speakingPart3Total > 0 ? speakingPart3Total : speakingPart3Items.size(),
                    speakingPart3Items));
            imported.add(questions.save(speakingPart3Question));
        }
        if (imported.isEmpty()) {
            throw new IllegalArgumentException("CSV does not contain any question rows");
        }
        return new CoreDtos.QuestionImportResponse(imported.stream().map(mapper::question).toList(), List.of());
    }

    private boolean shouldSplitWritingRowsIntoTests(Test selectedTest, List<CSVRecord> records) {
        if (selectedTest.getSkill() == null || selectedTest.getSkill().getType() != SkillType.WRITING || records.size() < 2) {
            return false;
        }
        return isWritingCollectionRows(records);
    }

    private boolean isBlankCsvRecord(CSVRecord record) {
        return record == null || record.toMap().values().stream()
                .allMatch(value -> value == null || value.isBlank());
    }

    private boolean isWritingCollectionRows(List<CSVRecord> records) {
        if (records == null || records.size() < 2) {
            return false;
        }
        Map<String, Boolean> topics = new LinkedHashMap<>();
        for (CSVRecord record : records) {
            String rawType = csv(record, "type", "SINGLE_CHOICE").trim().toUpperCase();
            String topic = cleanTopic(csv(record, "topic", ""));
            String content = csv(record, "content", "");
            if (!rawType.equals("TEXT") || topic.isBlank() || !content.contains("\"template\":\"WRITING_")) {
                return false;
            }
            topics.put(topic, Boolean.TRUE);
        }
        return topics.size() == records.size();
    }

    private List<CoreDtos.TestResponse> importWritingRowsAsExamTests(List<CSVRecord> records) {
        Skill skill = skillForType(SkillType.WRITING);
        List<CoreDtos.TestResponse> importedTests = new ArrayList<>();
        for (CSVRecord record : records) {
            try {
                String title = cleanTopic(requiredCsv(record, "topic"));
                Test test = new Test();
                test.setSkill(skill);
                test.setTitle(title);
                test.setDescription(title);
                test.setDurationMinutes(30);
                test.setStatus(TestStatus.PUBLISHED);
                test.setMode(TestMode.EXAM);
                test.setFeatured(parseBoolean(csv(record, "featured", "false")));
                Test savedTest = tests.save(test);

                Question question = buildQuestionFromCsv(record, savedTest, 1);
                question.setSortOrder(1);
                questions.save(question);
                importedTests.add(mapper.test(savedTest, 1));
            } catch (RuntimeException ex) {
                throw new IllegalArgumentException(
                        "CSV row " + record.getRecordNumber() + " error: " + ex.getMessage());
            }
        }
        return importedTests;
    }

    private CoreDtos.QuestionImportResponse importWritingRowsAsTests(Test selectedTest, List<CSVRecord> records) {
        List<Question> importedQuestions = new ArrayList<>();
        List<CoreDtos.TestResponse> importedTests = new ArrayList<>();
        for (CSVRecord record : records) {
            try {
                String title = cleanTopic(requiredCsv(record, "topic"));
                Test test = new Test();
                test.setSkill(selectedTest.getSkill());
                test.setTitle(title);
                test.setDescription(firstNonBlank(selectedTest.getDescription(), title));
                test.setDurationMinutes(selectedTest.getDurationMinutes());
                test.setStatus(selectedTest.getStatus());
                test.setMode(selectedTest.getMode() == null ? TestMode.EXAM : selectedTest.getMode());
                test.setFeatured(parseBoolean(csv(record, "featured", String.valueOf(selectedTest.isFeatured()))));
                Test savedTest = tests.save(test);

                Question question = buildQuestionFromCsv(record, savedTest, 1);
                question.setSortOrder(1);
                Question savedQuestion = questions.save(question);
                importedQuestions.add(savedQuestion);
                importedTests.add(mapper.test(savedTest, 1));
            } catch (RuntimeException ex) {
                throw new IllegalArgumentException(
                        "CSV row " + record.getRecordNumber() + " error: " + ex.getMessage());
            }
        }
        return new CoreDtos.QuestionImportResponse(
                importedQuestions.stream().map(mapper::question).toList(),
                importedTests);
    }

    private Question buildQuestionFromCsv(CSVRecord record, Test test, int defaultSortOrder) {
        Question q = new Question();
        q.setTest(test);
        String rawType = csv(record, "type", "SINGLE_CHOICE").trim().toUpperCase();
        boolean listeningPart2 = isListeningPart2Type(rawType);
        boolean listeningPart3 = isListeningPart3Type(rawType);
        boolean listeningPart4 = isListeningPart4Type(rawType);
        boolean speakingTemplate = isSpeakingTemplateType(rawType) || hasSpeakingTemplateContent(record);
        boolean grammarTemplate = isGrammarTemplateType(rawType);
        q.setType((listeningPart2 || listeningPart3 || listeningPart4 || speakingTemplate || grammarTemplate)
                ? QuestionType.TEXT
                : parseQuestionType(rawType));
        q.setTopic(cleanTopic(csv(record, "topic", "")));
        q.setAudioUrl(csvAudioUrl(record));
        q.setScriptText(firstNonBlank(csv(record, "script_text", ""), csv(record, "scriptText", "")));
        q.setExplanation(csv(record, "explanation", ""));
        q.setPoints(parseInteger(record, "points", 1));
        q.setSortOrder(parseInteger(record, "sort_order", defaultSortOrder));
        q.setFeatured(parseBoolean(csv(record, "featured", "false")));
        if (listeningPart2) {
            String paragraph = firstNonBlank(q.getScriptText(), q.getExplanation());
            q.setScriptText(paragraph);
            q.setContent(buildListeningPart2Template(record, q));
        } else if (listeningPart3) {
            String paragraph = firstNonBlank(q.getScriptText(), q.getExplanation());
            q.setScriptText(paragraph);
            q.setContent(buildListeningPart3Template(record, q));
        } else if (listeningPart4) {
            String paragraph = firstNonBlank(q.getScriptText(), q.getExplanation());
            q.setScriptText(paragraph);
            q.setContent(buildListeningPart4Template(record, q));
        } else {
            q.setContent(requiredCsv(record, "content"));
        }

        if (q.getType() != QuestionType.TEXT && q.getType() != QuestionType.SPEAKING) {
            int correctIndex = parseInteger(record, "correct_index", 1);
            if (correctIndex < 1 || correctIndex > 4) {
                throw new IllegalArgumentException("correct_index must be from 1 to 4");
            }
            for (int i = 1; i <= 4; i++) {
                String content = csv(record, "answer" + i, "");
                if (!content.isBlank()) {
                    Answer answer = new Answer();
                    answer.setQuestion(q);
                    answer.setContent(content);
                    answer.setCorrect(i == correctIndex);
                    answer.setSortOrder(i);
                    q.getAnswers().add(answer);
                }
            }
        }
        return q;
    }

    private boolean isListeningPart2Type(String rawType) {
        return rawType.equals("LISTENING_PART2")
                || rawType.equals("LISTENING_PERSON")
                || rawType.equals("LISTENING_PEOPLE")
                || rawType.equals("LISTENING_PEOPLE_MATCH")
                || rawType.equals("MATCHING_4")
                || rawType.equals("MATCHING_4_PEOPLE")
                || rawType.equals("PART2_MATCHING")
                || rawType.equals("LISTENING_PART2_MATCHING");
    }

    private boolean isListeningPart3Type(String rawType) {
        return rawType.equals("LISTENING_PART3")
                || rawType.equals("LISTENING_DROPDOWN")
                || rawType.equals("LISTENING_OPINION")
                || rawType.equals("LISTENING_OPINION_MATCH")
                || rawType.equals("OPINION_MATCH")
                || rawType.equals("MAN_WOMAN_BOTH")
                || rawType.equals("LISTENING_PART3_MATCHING");
    }

    private boolean isListeningPart4Type(String rawType) {
        return rawType.equals("LISTENING_PART1")
                || rawType.equals("LISTENING_RADIO")
                || rawType.equals("LISTENING_SINGLE_CHOICE")
                || rawType.equals("LISTENING_AUDIO_SINGLE")
                || rawType.equals("LISTENING_PART4")
                || rawType.equals("LISTENING_AUDIO_MC")
                || rawType.equals("LISTENING_PART4_MC")
                || rawType.equals("LISTENING_DOUBLE_MC");
    }

    private boolean isSpeakingTemplateType(String rawType) {
        return rawType.equals("SPEAKING_PART1")
                || rawType.equals("SPEAKING_PART2")
                || rawType.equals("SPEAKING_PART3")
                || rawType.equals("SPEAKING_PART4");
    }

    private boolean hasSpeakingTemplateContent(CSVRecord record) {
        String content = csv(record, "content", "").trim();
        return content.contains("\"template\":\"SPEAKING_PART1\"")
                || content.contains("\"template\":\"SPEAKING_PART2\"")
                || content.contains("\"template\":\"SPEAKING_PART3\"")
                || content.contains("\"template\":\"SPEAKING_PART4\"");
    }

    private boolean hasSpeakingPart3Columns(CSVRecord record) {
        return !firstNonBlank(csv(record, "urlpic1", ""),
                firstNonBlank(csv(record, "urlPic1", ""), csv(record, "image1", ""))).isBlank()
                || !firstNonBlank(csv(record, "urlpic2", ""),
                        firstNonBlank(csv(record, "urlPic2", ""), csv(record, "image2", ""))).isBlank()
                || !firstNonBlank(csv(record, "question1", ""),
                        firstNonBlank(csv(record, "q1", ""), csv(record, "prompt1", ""))).isBlank();
    }

    private String buildSpeakingPart3QuestionItem(CSVRecord record, int index) {
        String number = String.format("%02d", index + 1);
        String urlpic1 = firstNonBlank(csv(record, "urlpic1", ""),
                firstNonBlank(csv(record, "urlPic1", ""),
                        firstNonBlank(csv(record, "image1", ""),
                                firstNonBlank(csv(record, "image1Url", ""), csv(record, "picture1", "")))));
        String urlpic2 = firstNonBlank(csv(record, "urlpic2", ""),
                firstNonBlank(csv(record, "urlPic2", ""),
                        firstNonBlank(csv(record, "image2", ""),
                                firstNonBlank(csv(record, "image2Url", ""), csv(record, "picture2", "")))));
        if (urlpic1.isBlank()) {
            urlpic1 = "/images/speaking/part3/de" + number + "_1.png";
        }
        if (urlpic2.isBlank()) {
            urlpic2 = "/images/speaking/part3/de" + number + "_2.png";
        }

        String question1 = firstNonBlank(csv(record, "question1", ""),
                firstNonBlank(csv(record, "q1", ""), csv(record, "prompt1", "")));
        String question2 = firstNonBlank(csv(record, "question2", ""),
                firstNonBlank(csv(record, "q2", ""), csv(record, "prompt2", "")));
        String question3 = firstNonBlank(csv(record, "question3", ""),
                firstNonBlank(csv(record, "q3", ""), csv(record, "prompt3", "")));
        String answer1 = firstNonBlank(csv(record, "question1_answer", ""),
                firstNonBlank(csv(record, "q1_answer", ""),
                        firstNonBlank(csv(record, "answer1", ""), csv(record, "sampleAnswer1", ""))));
        String answer2 = firstNonBlank(csv(record, "question2_answer", ""),
                firstNonBlank(csv(record, "q2_answer", ""),
                        firstNonBlank(csv(record, "answer2", ""), csv(record, "sampleAnswer2", ""))));
        String answer3 = firstNonBlank(csv(record, "question3_answer", ""),
                firstNonBlank(csv(record, "q3_answer", ""),
                        firstNonBlank(csv(record, "answer3", ""), csv(record, "sampleAnswer3", ""))));

        if (question1.isBlank()) {
            question1 = "Describe the picture?";
        }
        if (question2.isBlank()) {
            question2 = "Answer the related question.";
        }
        if (question3.isBlank()) {
            question3 = "Give your opinion.";
        }

        return "{"
                + "\"urlpic1\":" + json(urlpic1) + ","
                + "\"urlpic2\":" + json(urlpic2) + ","
                + "\"question1\":" + json(question1) + ","
                + "\"question1_answer\":" + json(answer1) + ","
                + "\"question2\":" + json(question2) + ","
                + "\"question2_answer\":" + json(answer2) + ","
                + "\"question3\":" + json(question3) + ","
                + "\"question3_answer\":" + json(answer3)
                + "}";
    }

    private String buildSpeakingPart3Template(int total, List<String> items) {
        return "{\n"
                + "  \"template\": \"SPEAKING_PART3\",\n"
                + "  \"total\": " + total + ",\n"
                + "  \"questions\": [" + String.join(",", items) + "]\n"
                + "}";
    }

    private boolean isGrammarTemplateType(String rawType) {
        return rawType.equals("GRAMMAR")
                || rawType.equals("GRAMMAR_CHOICE")
                || rawType.equals("GRAMMAR_SINGLE_CHOICE")
                || rawType.equals("GRAMMAR_MATCH")
                || rawType.equals("GRAMMAR_GAP_SELECT")
                || rawType.equals("GRAMMAR_COLLOCATION");
    }

    private String buildListeningPart2Template(CSVRecord record, Question question) {
        String topic = cleanTopic(firstNonBlank(question.getTopic(), csv(record, "content", "")));
        int total = parseInteger(record, "total", 13);
        List<String> options = new ArrayList<>();
        for (int i = 1; i <= 8; i++) {
            String option = csv(record, "answer" + i, "");
            if (!option.isBlank())
                options.add(option);
        }
        if (options.isEmpty()) {
            throw new IllegalArgumentException("Listening Part 2 requires answer1-answer6 options");
        }
        String instructions = firstNonBlank(csv(record, "instructions", ""), csv(record, "content", ""));
        String extraInstruction = csv(record, "explanation", "");
        if (!hasPersonCorrectIndexes(record) && !extraInstruction.isBlank()
                && !instructions.contains(extraInstruction)) {
            instructions = firstNonBlank(instructions,
                    "Four people are discussing their views on " + topic + ". Complete the sentences.")
                    + " " + extraInstruction;
        }
        if (instructions.isBlank()) {
            instructions = "Four people are discussing their views on " + topic
                    + ". Complete the sentences. Use each answer only once. You will not need two of the answers.";
        }
        List<String> correctAnswers = new ArrayList<>();
        for (int i = 1; i <= 4; i++) {
            int answerIndex = parseInteger(record, "correct_index_person" + i, 0);
            if (answerIndex > 0 && answerIndex <= options.size()) {
                correctAnswers.add(options.get(answerIndex - 1));
            }
        }

        return "{\n"
                + "  \"template\": \"LISTENING_PEOPLE_MATCH\",\n"
                + "  \"total\": " + total + ",\n"
                + "  \"topic\": " + json(topic) + ",\n"
                + "  \"instructions\": " + json(instructions) + ",\n"
                + "  \"playsRemaining\": \"2 of 2 plays remaining\",\n"
                + "  \"audioUrl\": " + json(question.getAudioUrl()) + ",\n"
                + "  \"scriptText\": " + json(question.getScriptText()) + ",\n"
                + "  \"options\": " + jsonArray(options) + ",\n"
                + "  \"correctAnswers\": " + jsonArray(correctAnswers) + ",\n"
                + "  \"rows\": [\"Person 1\", \"Person 2\", \"Person 3\", \"Person 4\"]\n"
                + "}";
    }

    private boolean hasPersonCorrectIndexes(CSVRecord record) {
        for (int i = 1; i <= 4; i++) {
            if (!csv(record, "correct_index_person" + i, "").isBlank())
                return true;
        }
        return false;
    }

    private String buildListeningPart3Template(CSVRecord record, Question question) {
        String topic = cleanTopic(firstNonBlank(question.getTopic(), csv(record, "content", "")));
        int total = parseInteger(record, "total", 17);
        List<String> options = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            String option = csv(record, "answer" + i, "");
            if (!option.isBlank())
                options.add(option);
        }
        if (options.isEmpty()) {
            options.add("Man");
            options.add("Woman");
            options.add("Both");
        }

        List<String> statements = new ArrayList<>();
        for (int i = 1; i <= 8; i++) {
            String statement = firstNonBlank(csv(record, "statement" + i, ""), csv(record, "question" + i, ""));
            if (!statement.isBlank())
                statements.add(statement);
        }
        if (statements.isEmpty()) {
            String rawStatements = firstNonBlank(csv(record, "statements", ""), csv(record, "rows", ""));
            if (!rawStatements.isBlank()) {
                for (String statement : rawStatements.split("\\|")) {
                    if (!statement.trim().isBlank())
                        statements.add(statement.trim());
                }
            }
        }
        if (statements.isEmpty()) {
            throw new IllegalArgumentException(
                    "Listening Part 3 requires statement1-statement4 or statements. answer1-answer3 are dropdown choices only");
        }

        String instructions = firstNonBlank(csv(record, "instructions", ""), csv(record, "content", ""));
        if (instructions.isBlank() || statements.contains(instructions.trim())) {
            instructions = "Listen to two colleagues discussing potential changes in the workplace. Read the statements and decide whose opinion matches the best: the man's, the woman's or both. Who expresses which opinion?";
        }

        List<String> correctAnswers = new ArrayList<>();
        for (int i = 1; i <= statements.size(); i++) {
            String direct = firstNonBlank(csv(record, "correct_statement" + i, ""),
                    csv(record, "correct_answer" + i, ""));
            int answerIndex = parseInteger(record, "correct_index_statement" + i, 0);
            if (!direct.isBlank()) {
                correctAnswers.add(direct);
            } else if (answerIndex > 0 && answerIndex <= options.size()) {
                correctAnswers.add(options.get(answerIndex - 1));
            }
        }

        return "{\n"
                + "  \"template\": \"LISTENING_OPINION_MATCH\",\n"
                + "  \"total\": " + total + ",\n"
                + "  \"topic\": " + json(topic) + ",\n"
                + "  \"instructions\": " + json(instructions) + ",\n"
                + "  \"playsRemaining\": \"2 of 2 plays remaining\",\n"
                + "  \"audioUrl\": " + json(question.getAudioUrl()) + ",\n"
                + "  \"scriptText\": " + json(question.getScriptText()) + ",\n"
                + "  \"options\": " + jsonArray(options) + ",\n"
                + "  \"correctAnswers\": " + jsonArray(correctAnswers) + ",\n"
                + "  \"statements\": " + jsonArray(statements) + "\n"
                + "}";
    }

    private String buildListeningPart4Template(CSVRecord record, Question question) {
        boolean part1 = csv(record, "type", "").trim().equalsIgnoreCase("LISTENING_PART1");
        String topic = part1 ? "" : cleanTopic(firstNonBlank(question.getTopic(), csv(record, "content", "")));
        int total = parseInteger(record, "total", 59);
        List<String> groups = new ArrayList<>();

        for (int groupIndex = 1; groupIndex <= 2; groupIndex++) {
            String prompt = firstNonBlank(
                    csv(record, "question" + groupIndex, ""),
                    firstNonBlank(csv(record, "prompt" + groupIndex, ""), csv(record, "q" + groupIndex, "")));
            List<String> options = new ArrayList<>();
            for (int answerIndex = 1; answerIndex <= 4; answerIndex++) {
                String option = firstNonBlank(
                        csv(record, "q" + groupIndex + "_answer" + answerIndex, ""),
                        csv(record, "question" + groupIndex + "_answer" + answerIndex, ""));
                if (!option.isBlank())
                    options.add(option);
            }
            if (prompt.isBlank() && groupIndex == 1) {
                prompt = csv(record, "content", "");
            }
            if (!prompt.isBlank() || !options.isEmpty()) {
                if (prompt.isBlank() || options.size() < 2) {
                    throw new IllegalArgumentException(
                            "Listening Part 4 question" + groupIndex + " requires prompt and at least 2 options");
                }
                groups.add("{\"prompt\":" + json(prompt)
                        + ",\"options\":" + jsonArray(options)
                        + ",\"correctAnswer\":" + json(correctListeningPart4Answer(record, groupIndex, options))
                        + "}");
            }
        }

        if (groups.isEmpty()) {
            throw new IllegalArgumentException(
                    "Listening Part 4 requires question1/q1_answer1-q1_answer3 and question2/q2_answer1-q2_answer3");
        }

        return "{\n"
                + "  \"template\": \"LISTENING_AUDIO_MC\",\n"
                + "  \"total\": " + total + ",\n"
                + "  \"variant\": " + json(part1 ? "PART1" : "") + ",\n"
                + "  \"topic\": " + json(topic) + ",\n"
                + "  \"playsRemaining\": \"2 of 2 plays remaining\",\n"
                + "  \"audioUrl\": " + json(question.getAudioUrl()) + ",\n"
                + "  \"scriptText\": " + json(question.getScriptText()) + ",\n"
                + "  \"groups\": [" + String.join(",", groups) + "]\n"
                + "}";
    }

    private String correctListeningPart4Answer(CSVRecord record, int groupIndex, List<String> options) {
        String direct = firstNonBlank(
                csv(record, "correct_answer" + groupIndex, ""),
                csv(record, "q" + groupIndex + "_correct_answer", ""));
        if (!direct.isBlank())
            return direct;

        int answerIndex = parseInteger(record, "q" + groupIndex + "_correct_index", 0);
        if (answerIndex == 0) {
            answerIndex = parseInteger(record, "correct_index_question" + groupIndex, 0);
        }
        if (answerIndex > 0 && answerIndex <= options.size()) {
            return options.get(answerIndex - 1);
        }
        return "";
    }

    private String cleanTopic(String value) {
        String topic = value == null ? "" : value.trim();
        if (topic.toLowerCase().startsWith("topic:")) {
            topic = topic.substring(6).trim();
        }
        return topic;
    }

    private String jsonArray(List<String> values) {
        return values.stream().map(this::json).toList().toString();
    }

    private String json(String value) {
        if (value == null)
            return "\"\"";
        return "\"" + value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t") + "\"";
    }

    private SkillType parseSkillType(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase();
        try {
            return SkillType.valueOf(normalized);
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException("unknown skill: " + value);
        }
    }

    private TestStatus parseTestStatus(String value) {
        String normalized = value == null || value.isBlank() ? "PUBLISHED" : value.trim().toUpperCase();
        try {
            return TestStatus.valueOf(normalized);
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException("unknown status: " + value);
        }
    }

    private TestMode parseTestMode(String value) {
        String normalized = value == null || value.isBlank() ? "PRACTICE" : value.trim().toUpperCase();
        try {
            return TestMode.valueOf(normalized);
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException("unknown test mode: " + value);
        }
    }

    private Skill skillForType(SkillType type) {
        return skills.findByType(type).orElseGet(() -> {
            Skill skill = new Skill();
            skill.setType(type);
            skill.setName(skillName(type));
            skill.setDescription("");
            return skills.save(skill);
        });
    }

    private String skillName(SkillType type) {
        return switch (type) {
            case LISTENING -> "Listening";
            case SPEAKING -> "Speaking";
            case READING -> "Reading";
            case WRITING -> "Writing";
            case GRAMMAR -> "Grammar";
        };
    }

    private QuestionType parseQuestionType(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase();
        if (isSpeakingTemplateType(normalized)
                || isListeningPart2Type(normalized)
                || isListeningPart3Type(normalized)
                || isListeningPart4Type(normalized)) {
            return QuestionType.TEXT;
        }
        try {
            return QuestionType.valueOf(normalized);
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException("unknown question type: " + value);
        }
    }

    private String csv(CSVRecord record, String name, String defaultValue) {
        if (record.isMapped(name) && record.isSet(name)) {
            return record.get(name);
        }
        String normalizedName = normalizeCsvHeader(name);
        for (Map.Entry<String, String> entry : record.toMap().entrySet()) {
            if (normalizeCsvHeader(entry.getKey()).equals(normalizedName)) {
                return entry.getValue();
            }
        }
        return defaultValue;
    }

    private boolean hasCsvHeader(CSVRecord record, String name) {
        if (record.isMapped(name)) {
            return true;
        }
        String normalizedName = normalizeCsvHeader(name);
        return record.toMap().keySet().stream()
                .anyMatch(header -> normalizeCsvHeader(header).equals(normalizedName));
    }

    private String normalizeCsvHeader(String header) {
        String value = header == null ? "" : header.replace("\uFEFF", "").trim();
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^A-Za-z0-9]", "")
                .toLowerCase();
    }

    private String csvAudioUrl(CSVRecord record) {
        for (String name : List.of(
                "audio_url",
                "audioUrl",
                "audio",
                "audio_link",
                "audioLink",
                "link_audio",
                "linkAudio",
                "link_audio_nghe",
                "linkAudioNghe",
                "Link audio nghe",
                "recording_url",
                "recordingUrl",
                "file_url",
                "fileUrl",
                "url")) {
            String value = csv(record, name, "");
            if (!value.isBlank()) return value;
        }
        return "";
    }

    private String firstNonBlank(String first, String second) {
        return first == null || first.isBlank() ? second : first;
    }

    private String requiredCsv(CSVRecord record, String name) {
        String value = csv(record, name, "");
        if (value.isBlank())
            throw new IllegalArgumentException("missing required column/value: " + name);
        return value;
    }

    private int parseInteger(CSVRecord record, String name, int defaultValue) {
        String value = csv(record, name, String.valueOf(defaultValue));
        if (value == null || value.isBlank())
            return defaultValue;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(name + " must be a number");
        }
    }

    private boolean parseBoolean(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String normalized = value.trim().toLowerCase();
        return normalized.equals("true")
                || normalized.equals("1")
                || normalized.equals("yes")
                || normalized.equals("y")
                || normalized.equals("featured")
                || normalized.equals("noi bat")
                || normalized.equals("nổi bật");
    }

    private void applyQuestion(Question q, CoreDtos.QuestionRequest request) {
        q.setTest(tests.findById(request.testId()).orElseThrow(() -> new ResourceNotFoundException("Test not found")));
        if (request.type() != null)
            q.setType(request.type());
        q.setContent(request.content());
        q.setTopic(request.topic());
        q.setAudioUrl(request.audioUrl());
        q.setScriptText(request.scriptText());
        q.setExplanation(request.explanation());
        if (request.points() != null)
            q.setPoints(request.points());
        if (request.sortOrder() != null)
            q.setSortOrder(request.sortOrder());
        q.setFeatured(Boolean.TRUE.equals(request.featured()));
        if (request.answers() != null) {
            request.answers().forEach(a -> {
                Answer answer = new Answer();
                answer.setQuestion(q);
                answer.setContent(a.content());
                answer.setCorrect(a.correct());
                answer.setSortOrder(a.sortOrder() == null ? 1 : a.sortOrder());
                q.getAnswers().add(answer);
            });
        }
    }

    @Transactional
    public CoreDtos.SubmissionResponse submit(String email, CoreDtos.SubmissionRequest request) {
        User user = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        Test test = tests.findById(request.testId()).orElseThrow(() -> new ResourceNotFoundException("Test not found"));
        Submission submission = new Submission();
        submission.setUser(user);
        submission.setTest(test);
        int score = 0;
        int max = 0;
        for (CoreDtos.SubmitAnswerRequest item : request.answers()) {
            Question q = questions.findById(item.questionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Question not found"));
            if (!Objects.equals(q.getTest().getId(), test.getId())) {
                throw new IllegalArgumentException("Question does not belong to this test");
            }
            max += EXAM_POINT_PER_QUESTION;
            Answer selected = item.answerId() == null ? null : answers.findById(item.answerId()).orElse(null);
            if (selected != null && !Objects.equals(selected.getQuestion().getId(), q.getId())) {
                throw new IllegalArgumentException("Answer does not belong to this question");
            }
            boolean correct = selected != null && selected.isCorrect();
            SubmissionAnswer sa = new SubmissionAnswer();
            sa.setSubmission(submission);
            sa.setQuestion(q);
            sa.setAnswer(selected);
            sa.setTextAnswer(item.textAnswer());
            sa.setCorrect(correct);
            sa.setScore(correct ? EXAM_POINT_PER_QUESTION : 0);
            submission.getAnswers().add(sa);
            score += sa.getScore();
        }
        submission.setTotalScore(score);
        submission.setMaxScore(max);
        Submission saved = submissions.save(submission);
        Progress p = progress.findByUserIdAndSkillId(user.getId(), test.getSkill().getId()).orElseGet(Progress::new);
        p.setUser(user);
        p.setSkill(test.getSkill());
        p.setCompletedTests(p.getCompletedTests() + 1);
        p.setBestScore(Math.max(p.getBestScore(), score));
        progress.save(p);
        return mapper.submission(saved);
    }

    @Transactional
    public CoreDtos.SubmissionAnswerResponse savePracticeScore(String email, CoreDtos.PracticeScoreRequest request) {
        User user = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        Question question = questions.findById(request.questionId())
                .orElseThrow(() -> new ResourceNotFoundException("Question not found"));
        Answer selected = request.answerId() == null ? null : answers.findById(request.answerId()).orElse(null);
        if (selected != null && !Objects.equals(selected.getQuestion().getId(), question.getId())) {
            throw new IllegalArgumentException("Answer does not belong to this question");
        }

        boolean correct = selected != null
                ? selected.isCorrect()
                : Boolean.TRUE.equals(request.correct());
        PracticeScore score = practiceScores.findByUserIdAndQuestionId(user.getId(), question.getId())
                .orElseGet(PracticeScore::new);
        score.setUser(user);
        score.setQuestion(question);
        score.setCorrect(correct);
        score.setScore(correct ? EXAM_POINT_PER_QUESTION : 0);
        practiceScores.save(score);

        String selectedAnswer = selected == null ? null : selected.getContent();
        String correctAnswer = question.getAnswers().stream()
                .filter(Answer::isCorrect)
                .map(Answer::getContent)
                .findFirst()
                .orElse(null);
        return new CoreDtos.SubmissionAnswerResponse(
                score.getId(),
                question.getId(),
                question.getSortOrder(),
                question.getContent(),
                question.getTopic(),
                selectedAnswer,
                request.textAnswer(),
                correctAnswer,
                correct,
                score.getScore(),
                question.getExplanation());
    }

    @Transactional(readOnly = true)
    public List<CoreDtos.SubmissionResponse> myResults(String email) {
        User user = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        return submissions.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(mapper::submission).toList();
    }

    @Transactional(readOnly = true)
    public List<CoreDtos.SubmissionResponse> allResults() {
        return submissions.findAll().stream().map(mapper::submission).toList();
    }

    @Transactional(readOnly = true)
    public List<CoreDtos.LeaderboardRowResponse> leaderboard() {
        Map<Long, LeaderboardAccumulator> scores = new LinkedHashMap<>();
        submissions.leaderboard(RoleName.STUDENT).forEach(row -> {
            LeaderboardAccumulator item = scores.computeIfAbsent(row.getUserId(), id ->
                    new LeaderboardAccumulator(row.getUserId(), row.getFullName(), row.getEmail()));
            item.add(row.getScore(), row.getSubmissions(), row.getLatestSubmissionAt());
        });
        practiceScores.leaderboard(RoleName.STUDENT).forEach(row -> {
            LeaderboardAccumulator item = scores.computeIfAbsent(row.getUserId(), id ->
                    new LeaderboardAccumulator(row.getUserId(), row.getFullName(), row.getEmail()));
            item.add(row.getScore(), row.getSubmissions(), row.getLatestSubmissionAt());
        });

        List<LeaderboardAccumulator> rows = scores.values().stream()
                .filter(row -> row.score > 0)
                .sorted(Comparator
                        .comparingLong(LeaderboardAccumulator::score).reversed()
                        .thenComparingLong(LeaderboardAccumulator::submissions)
                        .thenComparing(LeaderboardAccumulator::latestSubmissionAt,
                                Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(LeaderboardAccumulator::fullName, String.CASE_INSENSITIVE_ORDER))
                .toList();
        List<CoreDtos.LeaderboardRowResponse> result = new ArrayList<>();
        long previousScore = Long.MIN_VALUE;
        int previousRank = 0;
        int index = 0;

        for (LeaderboardAccumulator row : rows) {
            index++;
            long score = row.score();
            int rank = score == previousScore ? previousRank : index;
            previousScore = score;
            previousRank = rank;

            result.add(new CoreDtos.LeaderboardRowResponse(
                    rank,
                    row.userId(),
                    row.fullName(),
                    row.email(),
                    score,
                    score,
                    row.submissions(),
                    row.latestSubmissionAt()));
        }

        return result;
    }

    @Transactional(readOnly = true)
    public CoreDtos.LeaderboardSettingsResponse leaderboardSettings() {
        return leaderboardSettings.findTopByOrderByIdAsc()
                .map(settings -> new CoreDtos.LeaderboardSettingsResponse(settings.getExamDate(), settings.getExamAt()))
                .orElseGet(() -> new CoreDtos.LeaderboardSettingsResponse(null, null));
    }

    @Transactional
    public CoreDtos.LeaderboardSettingsResponse updateLeaderboardSettings(CoreDtos.LeaderboardSettingsRequest request) {
        LeaderboardSettings settings = leaderboardSettings.findTopByOrderByIdAsc()
                .orElseGet(LeaderboardSettings::new);
        settings.setExamAt(request.examAt());
        settings.setExamDate(request.examAt() != null ? request.examAt().toLocalDate() : request.examDate());
        LeaderboardSettings saved = leaderboardSettings.save(settings);
        return new CoreDtos.LeaderboardSettingsResponse(saved.getExamDate(), saved.getExamAt());
    }

    private static final class LeaderboardAccumulator {
        private final Long userId;
        private final String fullName;
        private final String email;
        private long score;
        private long submissions;
        private LocalDateTime latestSubmissionAt;

        private LeaderboardAccumulator(Long userId, String fullName, String email) {
            this.userId = userId;
            this.fullName = fullName;
            this.email = email;
        }

        private void add(Long score, Long submissions, LocalDateTime latestSubmissionAt) {
            this.score += score == null ? 0 : score;
            this.submissions += submissions == null ? 0 : submissions;
            if (latestSubmissionAt != null && (this.latestSubmissionAt == null || latestSubmissionAt.isAfter(this.latestSubmissionAt))) {
                this.latestSubmissionAt = latestSubmissionAt;
            }
        }

        private Long userId() {
            return userId;
        }

        private String fullName() {
            return fullName;
        }

        private String email() {
            return email;
        }

        private long score() {
            return score;
        }

        private long submissions() {
            return submissions;
        }

        private LocalDateTime latestSubmissionAt() {
            return latestSubmissionAt;
        }
    }

    @Transactional(readOnly = true)
    public CoreDtos.SubmissionResponse submission(Long id, String email, boolean admin) {
        Submission submission = submissions.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));
        if (!admin && !submission.getUser().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("Submission belongs to another user");
        }
        return mapper.submission(submission);
    }

    public List<CoreDtos.ProgressResponse> myProgress(String email) {
        User user = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        return progress.findByUserId(user.getId()).stream()
                .map(p -> new CoreDtos.ProgressResponse(p.getSkill().getId(), p.getSkill().getName(),
                        p.getCompletedTests(), p.getBestScore()))
                .toList();
    }

    public CoreDtos.StatisticsResponse statistics() {
        List<Submission> all = submissions.findAll();
        double avg = all.stream()
                .mapToDouble(s -> s.getMaxScore() == 0 ? 0 : (s.getTotalScore() * 100.0 / s.getMaxScore())).average()
                .orElse(0);
        return new CoreDtos.StatisticsResponse(users.count(), tests.count(), submissions.count(), avg);
    }

    public CoreDtos.MediaResponse upload(String email, MultipartFile file) throws Exception {
        User uploader = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        Files.createDirectories(Path.of(uploadDir));
        String stored = UUID.randomUUID() + "-" + file.getOriginalFilename();
        file.transferTo(Path.of(uploadDir, stored));
        MediaFile media = new MediaFile();
        media.setOriginalName(file.getOriginalFilename());
        media.setStoredName(stored);
        media.setContentType(file.getContentType() == null ? "application/octet-stream" : file.getContentType());
        media.setSizeBytes(file.getSize());
        media.setType(media.getContentType().startsWith("image/") ? MediaType.IMAGE
                : media.getContentType().startsWith("audio/") ? MediaType.AUDIO : MediaType.OTHER);
        media.setUploadedBy(uploader);
        return media(mediaFiles.save(media));
    }

    public Resource mediaResource(Long id) throws Exception {
        MediaFile media = mediaFiles.findById(id).orElseThrow(() -> new ResourceNotFoundException("Media not found"));
        return new UrlResource(Path.of(uploadDir, media.getStoredName()).toUri());
    }

    public CoreDtos.MediaResponse media(MediaFile media) {
        return new CoreDtos.MediaResponse(media.getId(), media.getOriginalName(), media.getContentType(),
                media.getSizeBytes(), media.getType());
    }

    public List<CoreDtos.MediaResponse> mediaList() {
        return mediaFiles.findAll().stream().map(this::media).toList();
    }

    public MediaFile mediaEntity(Long id) {
        return mediaFiles.findById(id).orElseThrow(() -> new ResourceNotFoundException("Media not found"));
    }

    public void deleteMedia(Long id) {
        mediaFiles.deleteById(id);
    }
}
