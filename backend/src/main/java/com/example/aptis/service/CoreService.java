package com.example.aptis.service;

import com.example.aptis.dto.AuthDtos;
import com.example.aptis.dto.CoreDtos;
import com.example.aptis.entity.*;
import com.example.aptis.enums.MediaType;
import com.example.aptis.enums.QuestionType;
import com.example.aptis.exception.ResourceNotFoundException;
import com.example.aptis.mapper.DtoMapper;
import com.example.aptis.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CoreService {
    private final UserRepository users;
    private final SkillRepository skills;
    private final TestRepository tests;
    private final QuestionRepository questions;
    private final AnswerRepository answers;
    private final LessonRepository lessons;
    private final PredictionRepository predictions;
    private final SubmissionRepository submissions;
    private final ProgressRepository progress;
    private final MediaFileRepository mediaFiles;
    private final DtoMapper mapper;

    @Value("${app.upload-dir}")
    private String uploadDir;

    @Value("${app.subscription.free-trial-days:2}")
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
        if (request.enabled() != null) user.setEnabled(request.enabled());
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
        LocalDateTime trialExpiresAt = user.getCreatedAt() == null ? null : user.getCreatedAt().plusDays(freeTrialDays);
        LocalDateTime proExpiresAt = user.getProExpiresAt();

        if (trialExpiresAt == null) return proExpiresAt;
        if (proExpiresAt == null) return trialExpiresAt;
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

    private void applyTest(Test test, CoreDtos.TestRequest request) {
        test.setSkill(skills.findById(request.skillId()).orElseThrow(() -> new ResourceNotFoundException("Skill not found")));
        test.setTitle(request.title());
        test.setDescription(request.description());
        if (request.durationMinutes() != null) test.setDurationMinutes(request.durationMinutes());
        if (request.status() != null) test.setStatus(request.status());
        if (request.mode() != null) test.setMode(request.mode());
    }

    public List<CoreDtos.LessonResponse> lessons(com.example.aptis.enums.SkillType skill) {
        List<Lesson> list = skill == null
                ? lessons.findByDeletedAtIsNullOrderByUpdatedAtDesc()
                : lessons.findBySkillAndDeletedAtIsNullOrderByUpdatedAtDesc(skill);
        return list.stream().map(mapper::lesson).toList();
    }

    public CoreDtos.LessonResponse lesson(Long id) {
        Lesson lesson = lessons.findById(id).orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));
        if (lesson.getDeletedAt() != null) throw new ResourceNotFoundException("Lesson not found");
        return mapper.lesson(lesson);
    }

    public CoreDtos.LessonResponse saveLesson(CoreDtos.LessonRequest request) {
        Lesson lesson = new Lesson();
        applyLesson(lesson, request);
        return mapper.lesson(lessons.save(lesson));
    }

    public CoreDtos.LessonResponse updateLesson(Long id, CoreDtos.LessonRequest request) {
        Lesson lesson = lessons.findById(id).orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));
        if (lesson.getDeletedAt() != null) throw new ResourceNotFoundException("Lesson not found");
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
        lesson.setContent(request.content());
        lesson.setStatus(request.status() == null ? com.example.aptis.enums.TestStatus.PUBLISHED : request.status());
    }

    public List<CoreDtos.PredictionResponse> predictions(com.example.aptis.enums.SkillType skill, boolean publishedOnly) {
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
        Prediction prediction = predictions.findById(id).orElseThrow(() -> new ResourceNotFoundException("Prediction not found"));
        if (prediction.getDeletedAt() != null) throw new ResourceNotFoundException("Prediction not found");
        return mapper.prediction(prediction);
    }

    public CoreDtos.PredictionResponse savePrediction(CoreDtos.PredictionRequest request) {
        Prediction prediction = new Prediction();
        applyPrediction(prediction, request);
        return mapper.prediction(predictions.save(prediction));
    }

    public CoreDtos.PredictionResponse updatePrediction(Long id, CoreDtos.PredictionRequest request) {
        Prediction prediction = predictions.findById(id).orElseThrow(() -> new ResourceNotFoundException("Prediction not found"));
        if (prediction.getDeletedAt() != null) throw new ResourceNotFoundException("Prediction not found");
        applyPrediction(prediction, request);
        return mapper.prediction(predictions.save(prediction));
    }

    public void deletePrediction(Long id) {
        Prediction prediction = predictions.findById(id).orElseThrow(() -> new ResourceNotFoundException("Prediction not found"));
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
        prediction.setStatus(request.status() == null ? com.example.aptis.enums.TestStatus.PUBLISHED : request.status());
    }

    public List<CoreDtos.QuestionResponse> questions(Long testId) {
        List<Question> list = testId == null
                ? questions.findByDeletedAtIsNullOrderBySortOrderAsc()
                : questions.findByTestIdAndDeletedAtIsNullOrderBySortOrderAsc(testId);
        return list.stream().map(mapper::question).toList();
    }

    public CoreDtos.QuestionResponse question(Long id) {
        return mapper.question(questions.findWithAnswersById(id).orElseThrow(() -> new ResourceNotFoundException("Question not found")));
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

    public void deleteQuestion(Long id) {
        Question q = questions.findById(id).orElseThrow(() -> new ResourceNotFoundException("Question not found"));
        questions.delete(q);
    }

    @Transactional
    public List<CoreDtos.QuestionResponse> importQuestions(Long testId, MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("CSV file is empty");
        }
        Test test = tests.findById(testId).orElseThrow(() -> new ResourceNotFoundException("Test not found"));
        List<Question> imported = new ArrayList<>();
        List<String> speakingPart3Items = new ArrayList<>();
        Question speakingPart3Question = null;
        int speakingPart3Total = 0;
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)) {
            Iterable<CSVRecord> records = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .setTrim(true)
                    .build()
                    .parse(reader);
            for (CSVRecord record : records) {
                try {
                    Question q = new Question();
                    q.setTest(test);
                    String rawType = csv(record, "type", "SINGLE_CHOICE").trim().toUpperCase();
                    boolean listeningPart2 = isListeningPart2Type(rawType);
                    boolean listeningPart3 = isListeningPart3Type(rawType);
                    boolean listeningPart4 = isListeningPart4Type(rawType);
                    boolean speakingTemplate = isSpeakingTemplateType(rawType);
                    boolean grammarTemplate = isGrammarTemplateType(rawType);
                    q.setType((listeningPart2 || listeningPart3 || listeningPart4 || speakingTemplate || grammarTemplate) ? QuestionType.TEXT : parseQuestionType(rawType));
                    q.setTopic(cleanTopic(csv(record, "topic", "")));
                    q.setAudioUrl(firstNonBlank(csv(record, "audio_url", ""), csv(record, "audioUrl", "")));
                    q.setScriptText(firstNonBlank(csv(record, "script_text", ""), csv(record, "scriptText", "")));
                    q.setExplanation(csv(record, "explanation", ""));
                    q.setPoints(parseInteger(record, "points", 1));
                    q.setSortOrder(parseInteger(record, "sort_order", imported.size() + 1));
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
                    } else if (speakingTemplate) {
                        q.setContent(requiredCsv(record, "content"));
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
                    imported.add(questions.save(q));
                } catch (RuntimeException ex) {
                    throw new IllegalArgumentException("CSV row " + record.getRecordNumber() + " error: " + ex.getMessage());
                }
            }
        }
        if (!speakingPart3Items.isEmpty()) {
            speakingPart3Question.setContent(buildSpeakingPart3Template(
                    speakingPart3Total > 0 ? speakingPart3Total : speakingPart3Items.size(),
                    speakingPart3Items
            ));
            imported.add(questions.save(speakingPart3Question));
        }
        if (imported.isEmpty()) {
            throw new IllegalArgumentException("CSV does not contain any question rows");
        }
        return imported.stream().map(mapper::question).toList();
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

    private boolean hasSpeakingPart3Columns(CSVRecord record) {
        return !firstNonBlank(csv(record, "urlpic1", ""), firstNonBlank(csv(record, "urlPic1", ""), csv(record, "image1", ""))).isBlank()
                || !firstNonBlank(csv(record, "urlpic2", ""), firstNonBlank(csv(record, "urlPic2", ""), csv(record, "image2", ""))).isBlank()
                || !firstNonBlank(csv(record, "question1", ""), firstNonBlank(csv(record, "q1", ""), csv(record, "prompt1", ""))).isBlank();
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
            if (!option.isBlank()) options.add(option);
        }
        if (options.isEmpty()) {
            throw new IllegalArgumentException("Listening Part 2 requires answer1-answer6 options");
        }
        String instructions = firstNonBlank(csv(record, "instructions", ""), csv(record, "content", ""));
        String extraInstruction = csv(record, "explanation", "");
        if (!hasPersonCorrectIndexes(record) && !extraInstruction.isBlank() && !instructions.contains(extraInstruction)) {
            instructions = firstNonBlank(instructions, "Four people are discussing their views on " + topic + ". Complete the sentences.")
                    + " " + extraInstruction;
        }
        if (instructions.isBlank()) {
            instructions = "Four people are discussing their views on " + topic + ". Complete the sentences. Use each answer only once. You will not need two of the answers.";
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
            if (!csv(record, "correct_index_person" + i, "").isBlank()) return true;
        }
        return false;
    }

    private String buildListeningPart3Template(CSVRecord record, Question question) {
        String topic = cleanTopic(firstNonBlank(question.getTopic(), csv(record, "content", "")));
        int total = parseInteger(record, "total", 17);
        List<String> options = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            String option = csv(record, "answer" + i, "");
            if (!option.isBlank()) options.add(option);
        }
        if (options.isEmpty()) {
            options.add("Man");
            options.add("Woman");
            options.add("Both");
        }

        List<String> statements = new ArrayList<>();
        for (int i = 1; i <= 8; i++) {
            String statement = firstNonBlank(csv(record, "statement" + i, ""), csv(record, "question" + i, ""));
            if (!statement.isBlank()) statements.add(statement);
        }
        if (statements.isEmpty()) {
            String rawStatements = firstNonBlank(csv(record, "statements", ""), csv(record, "rows", ""));
            if (!rawStatements.isBlank()) {
                for (String statement : rawStatements.split("\\|")) {
                    if (!statement.trim().isBlank()) statements.add(statement.trim());
                }
            }
        }
        if (statements.isEmpty()) {
            throw new IllegalArgumentException("Listening Part 3 requires statement1-statement4 or statements. answer1-answer3 are dropdown choices only");
        }

        String instructions = firstNonBlank(csv(record, "instructions", ""), csv(record, "content", ""));
        if (instructions.isBlank() || statements.contains(instructions.trim())) {
            instructions = "Listen to two colleagues discussing potential changes in the workplace. Read the statements and decide whose opinion matches the best: the man's, the woman's or both. Who expresses which opinion?";
        }

        List<String> correctAnswers = new ArrayList<>();
        for (int i = 1; i <= statements.size(); i++) {
            String direct = firstNonBlank(csv(record, "correct_statement" + i, ""), csv(record, "correct_answer" + i, ""));
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
                    firstNonBlank(csv(record, "prompt" + groupIndex, ""), csv(record, "q" + groupIndex, ""))
            );
            List<String> options = new ArrayList<>();
            for (int answerIndex = 1; answerIndex <= 4; answerIndex++) {
                String option = firstNonBlank(
                        csv(record, "q" + groupIndex + "_answer" + answerIndex, ""),
                        csv(record, "question" + groupIndex + "_answer" + answerIndex, "")
                );
                if (!option.isBlank()) options.add(option);
            }
            if (prompt.isBlank() && groupIndex == 1) {
                prompt = csv(record, "content", "");
            }
            if (!prompt.isBlank() || !options.isEmpty()) {
                if (prompt.isBlank() || options.size() < 2) {
                    throw new IllegalArgumentException("Listening Part 4 question" + groupIndex + " requires prompt and at least 2 options");
                }
                groups.add("{\"prompt\":" + json(prompt)
                        + ",\"options\":" + jsonArray(options)
                        + ",\"correctAnswer\":" + json(correctListeningPart4Answer(record, groupIndex, options))
                        + "}");
            }
        }

        if (groups.isEmpty()) {
            throw new IllegalArgumentException("Listening Part 4 requires question1/q1_answer1-q1_answer3 and question2/q2_answer1-q2_answer3");
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
                csv(record, "q" + groupIndex + "_correct_answer", "")
        );
        if (!direct.isBlank()) return direct;

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
        if (value == null) return "\"\"";
        return "\"" + value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t") + "\"";
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
        for (Map.Entry<String, String> entry : record.toMap().entrySet()) {
            if (normalizeCsvHeader(entry.getKey()).equalsIgnoreCase(name)) {
                return entry.getValue();
            }
        }
        return defaultValue;
    }

    private String normalizeCsvHeader(String header) {
        return header == null ? "" : header.replace("\uFEFF", "").trim();
    }

    private String firstNonBlank(String first, String second) {
        return first == null || first.isBlank() ? second : first;
    }

    private String requiredCsv(CSVRecord record, String name) {
        String value = csv(record, name, "");
        if (value.isBlank()) throw new IllegalArgumentException("missing required column/value: " + name);
        return value;
    }

    private int parseInteger(CSVRecord record, String name, int defaultValue) {
        String value = csv(record, name, String.valueOf(defaultValue));
        if (value == null || value.isBlank()) return defaultValue;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(name + " must be a number");
        }
    }

    private void applyQuestion(Question q, CoreDtos.QuestionRequest request) {
        q.setTest(tests.findById(request.testId()).orElseThrow(() -> new ResourceNotFoundException("Test not found")));
        if (request.type() != null) q.setType(request.type());
        q.setContent(request.content());
        q.setTopic(request.topic());
        q.setAudioUrl(request.audioUrl());
        q.setScriptText(request.scriptText());
        q.setExplanation(request.explanation());
        if (request.points() != null) q.setPoints(request.points());
        if (request.sortOrder() != null) q.setSortOrder(request.sortOrder());
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
            Question q = questions.findById(item.questionId()).orElseThrow(() -> new ResourceNotFoundException("Question not found"));
            max += q.getPoints();
            Answer selected = item.answerId() == null ? null : answers.findById(item.answerId()).orElse(null);
            boolean correct = selected != null && selected.isCorrect();
            SubmissionAnswer sa = new SubmissionAnswer();
            sa.setSubmission(submission);
            sa.setQuestion(q);
            sa.setAnswer(selected);
            sa.setTextAnswer(item.textAnswer());
            sa.setCorrect(correct);
            sa.setScore(correct ? q.getPoints() : 0);
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
    public CoreDtos.SubmissionResponse submission(Long id) {
        return mapper.submission(submissions.findById(id).orElseThrow(() -> new ResourceNotFoundException("Submission not found")));
    }

    public List<CoreDtos.ProgressResponse> myProgress(String email) {
        User user = users.findByEmailAndDeletedAtIsNull(email).orElseThrow();
        return progress.findByUserId(user.getId()).stream()
                .map(p -> new CoreDtos.ProgressResponse(p.getSkill().getId(), p.getSkill().getName(), p.getCompletedTests(), p.getBestScore()))
                .toList();
    }

    public CoreDtos.StatisticsResponse statistics() {
        List<Submission> all = submissions.findAll();
        double avg = all.stream().mapToDouble(s -> s.getMaxScore() == 0 ? 0 : (s.getTotalScore() * 100.0 / s.getMaxScore())).average().orElse(0);
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
        media.setType(media.getContentType().startsWith("image/") ? MediaType.IMAGE : media.getContentType().startsWith("audio/") ? MediaType.AUDIO : MediaType.OTHER);
        media.setUploadedBy(uploader);
        return media(mediaFiles.save(media));
    }

    public Resource mediaResource(Long id) throws Exception {
        MediaFile media = mediaFiles.findById(id).orElseThrow(() -> new ResourceNotFoundException("Media not found"));
        return new UrlResource(Path.of(uploadDir, media.getStoredName()).toUri());
    }

    public CoreDtos.MediaResponse media(MediaFile media) {
        return new CoreDtos.MediaResponse(media.getId(), media.getOriginalName(), media.getContentType(), media.getSizeBytes(), media.getType());
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
