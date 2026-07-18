CREATE DATABASE IF NOT EXISTS aptis_esol CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE aptis_esol;

CREATE TABLE IF NOT EXISTS roles (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(40) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT chk_roles_name CHECK (name IN ('ADMIN', 'STUDENT'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(160) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    email_verified TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    token VARCHAR(80) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT fk_email_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skills (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    type VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT chk_skills_type CHECK (type IN ('LISTENING', 'SPEAKING', 'READING', 'WRITING', 'GRAMMAR'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    skill_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    duration_minutes INT NOT NULL DEFAULT 30,
    status VARCHAR(40) NOT NULL DEFAULT 'PUBLISHED',
    mode VARCHAR(20) NOT NULL DEFAULT 'PRACTICE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT fk_tests_skill FOREIGN KEY (skill_id) REFERENCES skills(id),
    CONSTRAINT chk_tests_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT chk_tests_mode CHECK (mode IN ('PRACTICE', 'EXAM'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    test_id BIGINT NOT NULL,
    type VARCHAR(40) NOT NULL DEFAULT 'SINGLE_CHOICE',
    content LONGTEXT NOT NULL,
    topic VARCHAR(255),
    audio_url TEXT,
    script_text TEXT,
    explanation TEXT,
    points INT NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT fk_questions_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    CONSTRAINT chk_questions_type CHECK (type IN ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT', 'AUDIO', 'SPEAKING'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS answers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    question_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    correct TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS submissions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    test_id BIGINT NOT NULL,
    total_score INT NOT NULL DEFAULT 0,
    max_score INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT fk_submissions_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_submissions_test FOREIGN KEY (test_id) REFERENCES tests(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS submission_answers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    submission_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    answer_id BIGINT NULL,
    text_answer TEXT,
    correct TINYINT(1) NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT fk_submission_answers_submission FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_answers_question FOREIGN KEY (question_id) REFERENCES questions(id),
    CONSTRAINT fk_submission_answers_answer FOREIGN KEY (answer_id) REFERENCES answers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS progress (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    skill_id BIGINT NOT NULL,
    completed_tests INT NOT NULL DEFAULT 0,
    best_score INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_progress_skill FOREIGN KEY (skill_id) REFERENCES skills(id),
    CONSTRAINT uk_progress_user_skill UNIQUE (user_id, skill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media_files (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    uploaded_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT fk_media_files_user FOREIGN KEY (uploaded_by) REFERENCES users(id),
    CONSTRAINT chk_media_files_type CHECK (type IN ('IMAGE', 'AUDIO', 'OTHER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    revoked TINYINT(1) NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_email_verify_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verify_user ON email_verification_tokens(user_id);
CREATE INDEX idx_tests_skill_id ON tests(skill_id);
CREATE INDEX idx_tests_status ON tests(status);
CREATE INDEX idx_tests_mode ON tests(mode);
CREATE INDEX idx_questions_test_id ON questions(test_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_test_id ON submissions(test_id);
CREATE INDEX idx_submission_answers_submission_id ON submission_answers(submission_id);
CREATE INDEX idx_progress_user_id ON progress(user_id);
CREATE INDEX idx_progress_skill_id ON progress(skill_id);
CREATE INDEX idx_media_files_type ON media_files(type);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

INSERT IGNORE INTO roles (name) VALUES ('ADMIN'), ('STUDENT');

INSERT IGNORE INTO skills (type, name, description)
VALUES
    ('LISTENING', 'Listening', 'Luyen nghe Aptis voi cau hoi tinh huong thuc te.'),
    ('SPEAKING', 'Speaking', 'Luyen noi theo tung part voi goi y cham diem.'),
    ('READING', 'Reading', 'Doc hieu, sap xep cau va dien tu.'),
    ('WRITING', 'Writing', 'Viet email, note va essay ngan.'),
    ('GRAMMAR', 'Grammar', 'Luyen ngu phap, tu vung va collocation theo dang cau hoi Aptis.');

INSERT INTO tests (skill_id, title, description, duration_minutes, status, mode)
SELECT id, CONCAT(name, ' Practice Set 1'), CONCAT('Bo luyen tap dau tien cho ky nang ', name),
       CASE WHEN type = 'SPEAKING' THEN 12 ELSE 30 END, 'PUBLISHED', 'PRACTICE'
FROM skills
WHERE NOT EXISTS (SELECT 1 FROM tests);

INSERT INTO questions (test_id, type, content, explanation, points, sort_order)
SELECT t.id,
       CASE WHEN s.type IN ('WRITING', 'SPEAKING') THEN 'TEXT' ELSE 'SINGLE_CHOICE' END,
       CASE s.type
           WHEN 'LISTENING' THEN 'Listen to the conversation. What does the speaker need?'
       WHEN 'SPEAKING' THEN 'Describe a place in your city that you like. Give reasons.'
       WHEN 'READING' THEN 'Choose the best sentence to complete the short message.'
       WHEN 'GRAMMAR' THEN 'Choose the option that correctly completes each sentence.'
       ELSE 'Write an email to a friend inviting them to an English study session.'
       END,
       'Tap trung vao tu khoa va muc dich giao tiep.',
       5,
       1
FROM tests t
JOIN skills s ON s.id = t.skill_id
WHERE NOT EXISTS (SELECT 1 FROM questions);

INSERT INTO answers (question_id, content, correct, sort_order)
SELECT q.id, 'The speaker is asking for directions.', 1, 1
FROM questions q
WHERE q.type = 'SINGLE_CHOICE' AND NOT EXISTS (SELECT 1 FROM answers);

INSERT INTO answers (question_id, content, correct, sort_order)
SELECT q.id, 'The speaker is ordering food.', 0, 2
FROM questions q
WHERE q.type = 'SINGLE_CHOICE' AND NOT EXISTS (
    SELECT 1 FROM answers a WHERE a.question_id = q.id AND a.sort_order = 2
);

INSERT INTO answers (question_id, content, correct, sort_order)
SELECT q.id, 'The speaker is booking a hotel.', 0, 3
FROM questions q
WHERE q.type = 'SINGLE_CHOICE' AND NOT EXISTS (
    SELECT 1 FROM answers a WHERE a.question_id = q.id AND a.sort_order = 3
);
