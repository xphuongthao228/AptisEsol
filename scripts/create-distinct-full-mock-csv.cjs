const fs = require('fs');
const path = require('path');

const sourcePath = process.argv[2] || 'C:/Users/LENOVO/Downloads/25_aptis_full_tests_RESHUFFLED_speaking/25_aptis_full_tests_speaking_reshuffled.csv';
const outputPath = process.argv[3] || path.resolve(__dirname, '../generated/aptis_full_tests_25_distinct_mock_import.csv');

const speakingPart4Topics = [
  {
    topic: 'Describe a time when you helped someone.',
    questions: [
      'Describe a time when you helped someone.',
      'How did you feel about helping them?',
      'Do you think people should do more to help others in their community? Why?'
    ]
  },
  {
    topic: 'Talk about a time you received a gift.',
    questions: [
      'Talk about a time you received a gift.',
      'How did you feel when it happened?',
      "Do positive experiences have a strong effect on people's motivation? Why?"
    ]
  },
  {
    topic: 'Talk about a time you were in a hurry.',
    questions: [
      'Talk about a time you were in a hurry.',
      'How did you feel about the experience?',
      "Do you think experiences like this are important in people's lives? Why or why not?"
    ]
  },
  {
    topic: "Talk about a time you wanted something but couldn't get it.",
    questions: [
      "Talk about a time you wanted something but couldn't get it.",
      'How did you feel at that time?',
      'Do you think people today buy too many things they do not really need? Why?'
    ]
  },
  {
    topic: 'Describe an important decision you made.',
    questions: [
      'Describe an important decision you made.',
      'Why was this decision important to you?',
      'Do you think young people should make important decisions by themselves? Why?'
    ]
  },
  {
    topic: 'Talk about a place where you felt relaxed.',
    questions: [
      'Talk about a place where you felt relaxed.',
      'What did you do there?',
      'Why do people need quiet places in their lives?'
    ]
  },
  {
    topic: 'Describe a person who taught you something useful.',
    questions: [
      'Describe a person who taught you something useful.',
      'What did you learn from this person?',
      'Are teachers more important today than in the past? Why?'
    ]
  },
  {
    topic: 'Talk about a journey that you remember well.',
    questions: [
      'Talk about a journey that you remember well.',
      'What made this journey memorable?',
      'Do you think travelling changes the way people think? Why?'
    ]
  },
  {
    topic: 'Describe a time when you learned from a mistake.',
    questions: [
      'Describe a time when you learned from a mistake.',
      'What did you do after making the mistake?',
      'Why is it useful for people to talk about their mistakes?'
    ]
  },
  {
    topic: 'Talk about a celebration you enjoyed.',
    questions: [
      'Talk about a celebration you enjoyed.',
      'Who did you celebrate with?',
      'Do celebrations help families and friends become closer? Why?'
    ]
  },
  {
    topic: 'Describe a skill you would like to improve.',
    questions: [
      'Describe a skill you would like to improve.',
      'What will you do to improve it?',
      'Should schools spend more time teaching practical skills? Why?'
    ]
  },
  {
    topic: 'Talk about a time when you had to wait.',
    questions: [
      'Talk about a time when you had to wait.',
      'How did you feel while waiting?',
      'Are people less patient now than before? Why?'
    ]
  },
  {
    topic: 'Describe something you bought and liked.',
    questions: [
      'Describe something you bought and liked.',
      'Why was it useful or special?',
      'Do advertisements influence what people buy? Why?'
    ]
  },
  {
    topic: 'Talk about a day when the weather changed your plans.',
    questions: [
      'Talk about a day when the weather changed your plans.',
      'What did you do instead?',
      'How important is weather information in daily life?'
    ]
  },
  {
    topic: 'Describe a time when you worked in a team.',
    questions: [
      'Describe a time when you worked in a team.',
      'What was your role in the team?',
      'Is teamwork always better than working alone? Why?'
    ]
  },
  {
    topic: 'Talk about a book, film, or programme you remember.',
    questions: [
      'Talk about a book, film, or programme you remember.',
      'What did you like about it?',
      'Do stories help people understand other cultures? Why?'
    ]
  },
  {
    topic: 'Describe a time when you were proud of yourself.',
    questions: [
      'Describe a time when you were proud of yourself.',
      'Who did you tell about it?',
      'Why is confidence important when people try new things?'
    ]
  },
  {
    topic: 'Talk about a useful piece of advice you received.',
    questions: [
      'Talk about a useful piece of advice you received.',
      'Who gave you this advice?',
      'Do people usually follow advice from older people? Why?'
    ]
  },
  {
    topic: 'Describe a time when technology helped you.',
    questions: [
      'Describe a time when technology helped you.',
      'What problem did it solve?',
      'Has technology made people more independent? Why?'
    ]
  },
  {
    topic: 'Talk about an activity you do to stay healthy.',
    questions: [
      'Talk about an activity you do to stay healthy.',
      'How often do you do it?',
      'Should governments encourage people to live healthier lives? Why?'
    ]
  },
  {
    topic: 'Describe a time when you met someone new.',
    questions: [
      'Describe a time when you met someone new.',
      'What did you talk about?',
      'Is it easy to make new friends as an adult? Why?'
    ]
  },
  {
    topic: 'Talk about a time when you changed your opinion.',
    questions: [
      'Talk about a time when you changed your opinion.',
      'What made you change your mind?',
      'Should people be willing to change their opinions? Why?'
    ]
  },
  {
    topic: 'Describe a public place you like visiting.',
    questions: [
      'Describe a public place you like visiting.',
      'What do people usually do there?',
      'Why are public spaces important in cities?'
    ]
  },
  {
    topic: 'Talk about a time when you saved money for something.',
    questions: [
      'Talk about a time when you saved money for something.',
      'Was it difficult to save enough money?',
      'Should children learn how to manage money at school? Why?'
    ]
  },
  {
    topic: 'Describe a time when you solved a problem.',
    questions: [
      'Describe a time when you solved a problem.',
      'How did you find the solution?',
      'Do people solve problems better alone or with others? Why?'
    ]
  }
];

const grammarThemes = [
  'online learning',
  'city transport',
  'healthy habits',
  'environmental protection',
  'international travel',
  'workplace communication',
  'sports events',
  'family routines',
  'digital banking',
  'public libraries',
  'food culture',
  'community projects',
  'film production',
  'weather changes',
  'student life',
  'small businesses',
  'home design',
  'volunteer work',
  'music festivals',
  'science museums',
  'career planning',
  'local tourism',
  'wildlife conservation',
  'social media',
  'future technology'
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift();
  return rows
    .filter((items) => items.some((item) => String(item).trim()))
    .map((items) => Object.fromEntries(headers.map((header, index) => [header, items[index] ?? ''])));
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function cleanObject(value) {
  if (Array.isArray(value)) {
    return value.map(cleanObject);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const cleaned = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (entry === null || entry === undefined || entry === '') return;
    cleaned[key] = cleanObject(entry);
  });
  return cleaned;
}

function parseJsonMaybe(value) {
  const text = String(value ?? '').trim();
  if (!text || (!text.startsWith('{') && !text.startsWith('['))) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function flattenQuestion(question) {
  const contentData = parseJsonMaybe(question.content);
  if (contentData && !Array.isArray(contentData) && typeof contentData === 'object') {
    return cleanObject({
      ...contentData,
      ...question,
      content: undefined
    });
  }
  return cleanObject(question);
}

function uniqueGrammarQuestions(testIndex) {
  const theme = grammarThemes[testIndex % grammarThemes.length];
  const capitalTheme = theme.charAt(0).toUpperCase() + theme.slice(1);
  const prompts = [
    [`By next year, the ${theme} project _______ much larger.`, ['will have become', 'became', 'becomes'], 'will have become'],
    [`If more people supported ${theme}, the community _______ more benefits.`, ['would see', 'will see', 'saw'], 'would see'],
    [`The report about ${theme} _______ by the team yesterday.`, ['was finished', 'finished', 'has finishing'], 'was finished'],
    [`Students have discussed ${theme} _______ the beginning of the course.`, ['since', 'for', 'during'], 'since'],
    [`The manager asked us _______ the ${theme} plan carefully.`, ['to review', 'review', 'reviewing'], 'to review'],
    [`There is _______ information about ${theme} online that learners can compare sources.`, ['so much', 'so many', 'too many'], 'so much'],
    [`The new policy will be useful _______ people follow it consistently.`, ['if', 'unless', 'although'], 'if'],
    [`I prefer articles _______ explain ${theme} with clear examples.`, ['that', 'who', 'where'], 'that'],
    [`The presentation was _______ interesting that everyone asked questions.`, ['so', 'such', 'too'], 'so'],
    [`If we had planned earlier, we _______ fewer problems with ${theme}.`, ['would have had', 'will have', 'had'], 'would have had'],
    [`Many visitors said the ${theme} exhibition was worth _______.`, ['seeing', 'to see', 'see'], 'seeing'],
    [`The team is responsible _______ updating the ${theme} schedule.`, ['for', 'to', 'with'], 'for'],
    [`Neither the students nor the teacher _______ against the ${theme} idea.`, ['was', 'were', 'are'], 'was'],
    [`The ${theme} app is easier to use than the one we tried _______.`, ['before', 'ago', 'since'], 'before'],
    [`She suggested _______ a survey before changing the ${theme} plan.`, ['doing', 'to do', 'do'], 'doing'],
    [`The results were not as positive _______ we expected.`, ['as', 'than', 'like'], 'as'],
    [`The organizer, _______ speech was very short, introduced the ${theme} activity.`, ['whose', 'which', 'who'], 'whose'],
    [`We need to decide whether _______ the ${theme} workshop this month.`, ['to join', 'joining', 'join'], 'to join'],
    [`The more people practise, _______ confident they become.`, ['the more', 'more', 'most'], 'the more'],
    [`I have never seen such a practical guide to ${theme} _______.`, ['before', 'already', 'yet'], 'before'],
    [`${capitalTheme} is becoming a major topic in modern society.`, ['issue', 'ticket', 'receipt'], 'issue'],
    [`The speaker gave a clear _______ of why ${theme} matters.`, ['explanation', 'complaint', 'reservation'], 'explanation'],
    [`Good planning can reduce the _______ of mistakes.`, ['risk', 'price', 'shape'], 'risk'],
    [`People often need reliable _______ before making decisions.`, ['evidence', 'furniture', 'luggage'], 'evidence'],
    [`The project created a strong _______ between local groups.`, ['connection', 'temperature', 'shortcut'], 'connection'],
    [`A useful ${theme} service should be simple and _______.`, ['accessible', 'ancient', 'crowded'], 'accessible'],
    [`The committee made several _______ to improve the plan.`, ['recommendations', 'celebrations', 'decorations'], 'recommendations'],
    [`Public interest in ${theme} has increased _______ in recent years.`, ['significantly', 'silently', 'rarely'], 'significantly'],
    [`Clear communication is _______ for the success of the activity.`, ['essential', 'empty', 'ordinary'], 'essential'],
    [`The final decision depends on the available _______.`, ['resources', 'memories', 'messages'], 'resources']
  ];

  return prompts.map(([prompt, options, correctAnswer], index) => ({
    type: 'TEXT',
    template: 'GRAMMAR_CHOICE',
    skill: 'GRAMMAR',
    part: index < 20 ? 1 : 2,
    topic: `${capitalTheme} - Grammar ${index + 1}`,
    prompt,
    options,
    correctAnswer,
    points: 1,
    sort_order: index + 1
  }));
}

function rewriteSpeakingPart4(section, testIndex) {
  const topic = speakingPart4Topics[testIndex];
  const part4 = section.parts?.find((part) => String(part.part) === '4');
  if (!part4) return;

  part4.questions = [{
    type: 'SPEAKING_PART4',
    template: 'SPEAKING_PART4',
    skill: 'SPEAKING',
    part: 4,
    topic: topic.topic,
    title: 'Speaking Part 4',
    instructions: 'Answer all 3 questions on the same topic. You have 1 minute to prepare and 2 minutes to speak.',
    questions: [{
      question: topic.questions[0],
      question1: topic.questions[0],
      question2: topic.questions[1],
      question3: topic.questions[2]
    }],
    questionsPerSet: 3,
    explanation: 'Speaking Part 4 unique topic',
    points: 10,
    sort_order: 13
  }];
}

function normalizeQuestionData(rawQuestionData, testIndex) {
  const data = JSON.parse(rawQuestionData);
  return data.map((section) => {
    const normalized = cleanObject({
      ...section,
      parts: Array.isArray(section.parts)
        ? section.parts.map((part) => ({
            ...part,
            questions: Array.isArray(part.questions)
              ? part.questions.map(flattenQuestion)
              : []
          }))
        : []
    });

    if (normalized.skill === 'SPEAKING') {
      rewriteSpeakingPart4(normalized, testIndex);
    }

    if (normalized.skill === 'GRAMMAR') {
      normalized.parts = [{ part: 1, questions: uniqueGrammarQuestions(testIndex) }];
      normalized.minutes = 25;
    }

    return normalized;
  });
}

function main() {
  const rows = parseCsv(fs.readFileSync(sourcePath, 'utf8'));
  const outputRows = rows.slice(0, 25).map((row, index) => {
    const number = String(index + 1).padStart(2, '0');
    const questionData = normalizeQuestionData(row.questionData, index);
    return {
      ...row,
      id: row.id || `aptis-full-${number}`,
      skill: 'FULL',
      title: `Aptis Full Test ${number}`,
      description: `Full Aptis test ${number}: bộ đề riêng, dữ liệu lấy trực tiếp từ questionData import.`,
      questions: '5 kỹ năng',
      questionData: JSON.stringify(questionData),
      minutes: '162 phút',
      status: 'PUBLISHED',
      description: `Full Aptis test ${number}: distinct imported questionData for all skills.`,
      questions: '5 skills',
      minutes: '162 phut',
      featured: row.featured || 'False'
    };
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const headers = ['id', 'skill', 'title', 'description', 'questions', 'questionData', 'minutes', 'status', 'featured', 'updatedAt'];
  const csv = [
    headers.join(','),
    ...outputRows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
  ].join('\r\n');
  fs.writeFileSync(outputPath, csv, 'utf8');

  console.log(`Wrote ${outputRows.length} rows`);
  console.log(outputPath);
}

main();
