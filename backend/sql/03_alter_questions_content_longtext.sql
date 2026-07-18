USE aptis_esol;

ALTER TABLE questions
  MODIFY COLUMN content LONGTEXT NOT NULL;
