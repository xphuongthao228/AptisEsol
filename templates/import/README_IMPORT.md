# Huong dan import CSV

## 1. Import bai luyen / bo de

Vao Admin -> Quan ly noi dung -> Bai luyen -> Upload CSV.

Dung file:

- `tests_import.csv`

Cot bat buoc:

- `skill`: LISTENING, SPEAKING, READING, WRITING, GRAMMAR
- `title`: ten bai luyen/bo de

Cot tuy chon:

- `description`
- `duration_minutes`
- `status`: PUBLISHED, DRAFT, ARCHIVED
- `mode`: PRACTICE hoac EXAM

## 2. Import cau hoi vao bai da tao

Vao Admin -> Quan ly noi dung -> Cau hoi -> chon bai -> Upload CSV.

Dung file mau:

- `questions_import_basic.csv`

Neu la cac part rieng nhu Listening Part 2, Speaking Part 3, Reading Part 5, dung cac template part-specific da tao trong project.

## 3. Import bai hoc / tai lieu

Vao Admin -> Quan ly bai hoc -> Upload CSV.

Dung file:

- `lessons_import.csv`
- `materials_import.csv`

Cot bat buoc:

- `skill`: LISTENING, SPEAKING, READING, WRITING, GRAMMAR
- `title`
- `content`

Cot tuy chon:

- `summary`
- `status`: PUBLISHED, DRAFT, ARCHIVED

## 4. Cach dung file local

Dat file vao frontend:

- Anh: `frontend/public/images/...`
- Audio: `frontend/public/audio/...`
- PDF/tai lieu: `frontend/public/documents/...`

Trong CSV, chi dien duong dan public:

- Anh: `/images/speaking/part3/de01_1.png`
- Audio: `/audio/listening/de1/q1.mp3`
- PDF: `/documents/writing/form-writing.pdf`

Luu CSV bang UTF-8 de tranh loi chu tieng Viet.
