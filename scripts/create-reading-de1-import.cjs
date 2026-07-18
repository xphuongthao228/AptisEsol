const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "templates", "AptisKey", "BoDe", "BoDeRead", "de1.txt");
const outputPath = path.join(root, "templates", "reading_de1_import.csv");

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function compactJson(value) {
  return JSON.stringify(value);
}

function pickByIndex(items, indexes) {
  return indexes.map((index) => items[index].text);
}

function row({ topic, content, points, sortOrder }) {
  return [
    "TEXT",
    topic,
    "",
    "",
    compactJson(content),
    "",
    points,
    sortOrder,
    "",
    "",
    "",
    "",
    "",
  ].map(csvEscape).join(",");
}

const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const q2Correct = data.question2Content.map((item) => item.text);
const q2Display = pickByIndex(data.question2Content, [3, 0, 4, 2, 1]);
const q3Correct = data.question3Content.map((item) => item.text);
const q3Display = pickByIndex(data.question3Content, [3, 1, 0, 2, 4]);
const headingOptions = data.options.filter(Boolean);

const rows = [
  row({
    topic: "Reading Question 1",
    points: 5,
    sortOrder: 1,
    content: {
      template: "READING_GAP_FILL",
      total: 5,
      instructions: "Choose the word that fits in the gap. The first one is done for you.",
      before: "Hey Lewis,",
      after: "Love,\nHelen",
      rows: data.questions1,
      correctAnswers: data.questions1.map((item) => item.correctAnswer),
    },
  }),
  row({
    topic: data.question2Topic,
    points: 5,
    sortOrder: 2,
    content: {
      template: "READING_SENTENCE_ORDER",
      total: 5,
      topic: data.question2Topic,
      instructions: "Put the sentences below in the right order (Sắp xếp câu theo thứ tự đúng).",
      sentences: q2Display,
      displaySentences: q2Display,
      correctSentences: q2Correct,
    },
  }),
  row({
    topic: data.question3Topic,
    points: 5,
    sortOrder: 3,
    content: {
      template: "READING_SENTENCE_ORDER",
      total: 5,
      topic: data.question3Topic,
      instructions: "Put the sentences below in the right order (Sắp xếp câu theo thứ tự đúng).",
      sentences: q3Display,
      displaySentences: q3Display,
      correctSentences: q3Correct,
    },
  }),
  row({
    topic: data.question4Topic,
    points: 7,
    sortOrder: 4,
    content: {
      template: "READING_FORUM_MATCH",
      total: 5,
      topic: data.question4Topic,
      leftTitle: data.question4Text[0],
      rightTitle: "Read the four opinions posted in the forum. Then, answer the questions.",
      opinions: data.question4Text.slice(1),
      questions: data.question4Content.map((item) => item.question),
      options: ["A", "B", "C", "D"],
      correctAnswers: data.correctAnswersQuestion4 || data.question4Content.map((item) => item.answer),
    },
  }),
  row({
    topic: data.question5Topic,
    points: 7,
    sortOrder: 5,
    content: {
      template: "READING_HEADING_MATCH",
      total: 5,
      topic: data.question5Topic,
      instructions: "Read the text. Match the headings to the paragraphs (Hãy đọc nội dung và chọn tiêu đề cho từng đoạn văn).",
      options: headingOptions,
      paragraphs: data.paragraph_question5,
      correctAnswers: headingOptions,
      tips: data.meohoc.join("\n\n"),
    },
  }),
];

const header = [
  "type",
  "topic",
  "audio_url",
  "script_text",
  "content",
  "explanation",
  "points",
  "sort_order",
  "answer1",
  "answer2",
  "answer3",
  "answer4",
  "correct_index",
].map(csvEscape).join(",");

fs.writeFileSync(outputPath, `${header}\n${rows.join("\n")}\n`, "utf8");
console.log(`Created ${path.relative(root, outputPath)}`);
