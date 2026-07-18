USE aptis_esol;

ALTER TABLE skills DROP CHECK chk_skills_type;
ALTER TABLE skills
  ADD CONSTRAINT chk_skills_type
  CHECK (type IN ('LISTENING', 'SPEAKING', 'READING', 'WRITING', 'GRAMMAR'));

INSERT INTO skills (type, name, description, created_at, updated_at)
SELECT 'GRAMMAR', 'Grammar', 'Luyen ngu phap, tu vung va collocation theo dang cau hoi Aptis.', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE type = 'GRAMMAR');
