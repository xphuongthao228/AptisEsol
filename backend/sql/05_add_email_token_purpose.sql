USE aptis_esol;

SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'email_verification_tokens'
    AND COLUMN_NAME = 'purpose'
);

SET @add_column_sql = IF(
  @column_exists = 0,
  'ALTER TABLE email_verification_tokens ADD COLUMN purpose VARCHAR(32) NULL',
  'SELECT 1'
);

PREPARE add_column_stmt FROM @add_column_sql;
EXECUTE add_column_stmt;
DEALLOCATE PREPARE add_column_stmt;

UPDATE email_verification_tokens
SET purpose = 'REGISTRATION'
WHERE purpose IS NULL;

SET @index_exists = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'email_verification_tokens'
    AND INDEX_NAME = 'idx_email_verify_purpose'
);

SET @add_index_sql = IF(
  @index_exists = 0,
  'CREATE INDEX idx_email_verify_purpose ON email_verification_tokens (purpose)',
  'SELECT 1'
);

PREPARE add_index_stmt FROM @add_index_sql;
EXECUTE add_index_stmt;
DEALLOCATE PREPARE add_index_stmt;
