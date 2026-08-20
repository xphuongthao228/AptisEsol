USE aptis_esol;

-- Tim cac cau Listening Part 1 dang thieu script.
SELECT
  q.id,
  q.sort_order,
  t.title AS test_title,
  q.content,
  q.audio_url
FROM questions q
JOIN tests t ON t.id = q.test_id
JOIN skills s ON s.id = t.skill_id
WHERE s.type = 'LISTENING'
  AND q.sort_order BETWEEN 1 AND 13
  AND q.deleted_at IS NULL
  AND t.deleted_at IS NULL
  AND (q.script_text IS NULL OR TRIM(q.script_text) = '')
ORDER BY t.id, q.sort_order;

-- Sau khi co transcript dung cua audio, bo comment va thay noi dung ben duoi.
-- Nen update theo q.id lay tu cau SELECT o tren de tranh nham bo de.
--
-- UPDATE questions
-- SET script_text = 'Transcript cau 1...'
-- WHERE id = 1;
--
-- UPDATE questions
-- SET script_text = 'Transcript cau 2...'
-- WHERE id = 2;
