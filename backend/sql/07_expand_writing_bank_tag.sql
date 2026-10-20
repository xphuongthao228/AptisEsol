-- application.yml uses ddl-auto=update; Hibernate also applies this change on startup.
-- Run manually only for environments that manage schema updates separately.
ALTER TABLE writing_bank_entries
    MODIFY COLUMN question LONGTEXT NOT NULL,
    MODIFY COLUMN vi LONGTEXT NULL,
    MODIFY COLUMN text LONGTEXT NOT NULL,
    MODIFY COLUMN text_vi LONGTEXT NULL,
    MODIFY COLUMN tag LONGTEXT NULL;
