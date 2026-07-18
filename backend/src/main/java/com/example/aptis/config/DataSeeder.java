package com.example.aptis.config;

import com.example.aptis.entity.*;
import com.example.aptis.enums.QuestionType;
import com.example.aptis.enums.RoleName;
import com.example.aptis.enums.SkillType;
import com.example.aptis.enums.TestMode;
import com.example.aptis.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class DataSeeder {
    private final RoleRepository roles;
    private final UserRepository users;
    private final SkillRepository skills;
    private final TestRepository tests;
    private final QuestionRepository questions;
    private final PasswordEncoder encoder;

    @Value("${app.seed.admin-email:admin@aptis.com}")
    private String seedAdminEmail;

    @Value("${app.seed.admin-password:}")
    private String seedAdminPassword;

    @Value("${app.seed.student-email:student@aptis.com}")
    private String seedStudentEmail;

    @Value("${app.seed.student-password:}")
    private String seedStudentPassword;

    @Bean
    CommandLineRunner seed() {
        return args -> {
            Role adminRole = roles.findByName(RoleName.ADMIN).orElseGet(() -> {
                Role r = new Role();
                r.setName(RoleName.ADMIN);
                return roles.save(r);
            });
            Role studentRole = roles.findByName(RoleName.STUDENT).orElseGet(() -> {
                Role r = new Role();
                r.setName(RoleName.STUDENT);
                return roles.save(r);
            });

            if (hasText(seedAdminPassword) && !users.existsByEmail(seedAdminEmail)) {
                User admin = new User();
                admin.setEmail(seedAdminEmail);
                admin.setFullName("Aptis Admin");
                admin.setPassword(encoder.encode(seedAdminPassword));
                admin.setEmailVerified(true);
                admin.getRoles().add(adminRole);
                users.save(admin);
            } else {
                users.findByEmailAndDeletedAtIsNull(seedAdminEmail).ifPresent(user -> {
                    user.setEmailVerified(true);
                    users.save(user);
                });
            }
            if (hasText(seedStudentPassword) && !users.existsByEmail(seedStudentEmail)) {
                User student = new User();
                student.setEmail(seedStudentEmail);
                student.setFullName("Nguyen Student");
                student.setPassword(encoder.encode(seedStudentPassword));
                student.setEmailVerified(true);
                student.getRoles().add(studentRole);
                users.save(student);
            } else {
                users.findByEmailAndDeletedAtIsNull(seedStudentEmail).ifPresent(user -> {
                    user.setEmailVerified(true);
                    users.save(user);
                });
            }

            createSkill(SkillType.LISTENING, "Listening", "Luyen nghe Aptis voi cau hoi tinh huong thuc te.");
            createSkill(SkillType.SPEAKING, "Speaking", "Luyen noi theo tung part voi goi y cham diem.");
            createSkill(SkillType.READING, "Reading", "Doc hieu, sap xep cau va dien tu.");
            createSkill(SkillType.WRITING, "Writing", "Viet email, note va essay ngan.");
            createSkill(SkillType.GRAMMAR, "Grammar", "Luyen ngu phap, tu vung va collocation theo dang cau hoi Aptis.");

            if (tests.count() == 0) {
                skills.findAll().forEach(skill -> {
                    Test test = new Test();
                    test.setSkill(skill);
                    test.setTitle(skill.getName() + " Practice Set 1");
                    test.setDescription("Bo luyen tap dau tien cho ky nang " + skill.getName());
                    test.setDurationMinutes(skill.getType() == SkillType.SPEAKING ? 12 : 30);
                    test.setMode(TestMode.PRACTICE);
                    tests.save(test);

                    Question q = new Question();
                    q.setTest(test);
                    q.setType(skill.getType() == SkillType.WRITING || skill.getType() == SkillType.SPEAKING ? QuestionType.TEXT : QuestionType.SINGLE_CHOICE);
                    q.setContent(sampleQuestion(skill.getType()));
                    q.setExplanation("Tap trung vao tu khoa va muc dich giao tiep.");
                    q.setPoints(5);
                    if (q.getType() == QuestionType.SINGLE_CHOICE) {
                        addAnswer(q, "The speaker is asking for directions.", true, 1);
                        addAnswer(q, "The speaker is ordering food.", false, 2);
                        addAnswer(q, "The speaker is booking a hotel.", false, 3);
                    }
                    questions.save(q);
                });
            }
        };
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private void createSkill(SkillType type, String name, String description) {
        skills.findByType(type).orElseGet(() -> {
            Skill s = new Skill();
            s.setType(type);
            s.setName(name);
            s.setDescription(description);
            return skills.save(s);
        });
    }

    private String sampleQuestion(SkillType type) {
        return switch (type) {
            case LISTENING -> "Listen to the conversation. What does the speaker need?";
            case SPEAKING -> "Describe a place in your city that you like. Give reasons.";
            case READING -> "Choose the best sentence to complete the short message.";
            case WRITING -> "Write an email to a friend inviting them to an English study session.";
            case GRAMMAR -> "Choose the option that correctly completes each sentence.";
        };
    }

    private void addAnswer(Question question, String content, boolean correct, int order) {
        Answer answer = new Answer();
        answer.setQuestion(question);
        answer.setContent(content);
        answer.setCorrect(correct);
        answer.setSortOrder(order);
        question.getAnswers().add(answer);
    }
}
