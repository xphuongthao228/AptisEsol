import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  FileText,
  Heart,
  Home,
  Library,
  PenLine,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  Star
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { WritingGuide } from './WritingGuide';
import { WritingForms } from './WritingForms';
import { api, unwrap } from '../../api/client';

type SentenceType = 'opening' | 'body' | 'ending';
type WritingBankView = 'home' | 'bank' | 'sentences' | 'favorites' | 'history';
type AnswerLevel = 'B1' | 'B2' | 'C1';
type SelectedSentences = Record<SentenceType, number | null>;
type Sentence = { text: string; vi: string; level: string; tag: string };
type WritingBankRow = {
  id: string;
  part: string;
  topic: string;
  form: string;
  question: string;
  vi: string;
  targetWords: string;
  section: SentenceType;
  text: string;
  textVi: string;
  level: string;
  tag: string;
};
type WritingHistoryItem = {
  id: string;
  part: string;
  topic: string;
  text: string;
  vi: string;
  words: number;
  createdAt: string;
};
type WritingPrompt = {
  id: string;
  part: string;
  topic: string;
  form: string;
  question: string;
  vi: string;
  targetWords: string;
  sentences: Record<SentenceType, Sentence[]>;
};
type AnswerPromptGroup = {
  key: string;
  setNumber: string;
  part: string;
  topic: string;
  prompts: WritingPrompt[];
};

const sentenceTabs: Array<{ type: SentenceType; label: string; hint: string }> = [
  { type: 'opening', label: 'Mở bài', hint: 'Vào đề tự nhiên' },
  { type: 'body', label: 'Thân bài', hint: 'Lý do, ví dụ, triển khai ý' },
  { type: 'ending', label: 'Kết bài', hint: 'Chốt ý gọn gàng' }
];

const fallbackWritingPrompts: WritingPrompt[] = [
  {
    id: 'profile-free-time',
    part: 'Writing Part 1',
    topic: 'Free time',
    form: 'Complete sentences',
    question: 'Complete the short profile about your free time.',
    vi: 'Hoàn thành phần giới thiệu ngắn về thời gian rảnh của bạn.',
    targetWords: '1-5 từ mỗi câu',
    sentences: {
      opening: [
        { text: 'In my free time, I usually read books.', vi: 'Trong thời gian rảnh, tôi thường đọc sách.', level: 'A1', tag: 'Câu đơn giản' },
        { text: 'After school, I often listen to music.', vi: 'Sau giờ học, tôi thường nghe nhạc.', level: 'A1', tag: 'Dễ nhớ' }
      ],
      body: [
        { text: 'My favourite hobby is playing badminton.', vi: 'Sở thích yêu thích của tôi là chơi cầu lông.', level: 'A1', tag: 'Sở thích' },
        { text: 'I enjoy it because it is relaxing.', vi: 'Tôi thích nó vì nó thư giãn.', level: 'A2', tag: 'Lý do' },
        { text: 'I usually do this activity with my friends.', vi: 'Tôi thường làm hoạt động này với bạn bè.', level: 'A2', tag: 'Chi tiết' }
      ],
      ending: [
        { text: 'It makes me feel happy.', vi: 'Nó làm tôi cảm thấy vui.', level: 'A1', tag: 'Kết ý' },
        { text: 'I want to spend more time on this hobby.', vi: 'Tôi muốn dành nhiều thời gian hơn cho sở thích này.', level: 'A2', tag: 'Mở rộng' }
      ]
    }
  },
  {
    id: 'sports-club',
    part: 'Writing Part 2',
    topic: 'Sports',
    form: 'Why ...?',
    question: 'Why do you want to join the sports club?',
    vi: 'Tại sao bạn muốn tham gia câu lạc bộ thể thao?',
    targetWords: '30-40 từ',
    sentences: {
      opening: [
        { text: 'I would like to join the sports club because I enjoy being active.', vi: 'Tôi muốn tham gia câu lạc bộ thể thao vì tôi thích vận động.', level: 'A2', tag: 'Dễ dùng' },
        { text: 'Joining the sports club sounds exciting and useful for me.', vi: 'Tham gia câu lạc bộ thể thao nghe rất thú vị và hữu ích với tôi.', level: 'B1', tag: 'Tự nhiên' }
      ],
      body: [
        { text: 'It can help me stay healthy and make new friends.', vi: 'Nó có thể giúp tôi khỏe mạnh và có thêm bạn mới.', level: 'A2', tag: 'Lý do' },
        { text: 'For example, I often play football after school, so I want to practise more often.', vi: 'Ví dụ, tôi thường chơi bóng đá sau giờ học, nên tôi muốn luyện tập thường xuyên hơn.', level: 'B1', tag: 'Ví dụ' },
        { text: 'I also think doing sport is a good way to relax after a busy day.', vi: 'Tôi cũng nghĩ chơi thể thao là cách tốt để thư giãn sau một ngày bận rộn.', level: 'B1', tag: 'Mở rộng' }
      ],
      ending: [
        { text: 'I hope I can become a member soon.', vi: 'Tôi hy vọng có thể sớm trở thành thành viên.', level: 'A2', tag: 'Gọn' },
        { text: 'Thank you for giving me the chance to join.', vi: 'Cảm ơn vì đã cho tôi cơ hội tham gia.', level: 'B1', tag: 'Lịch sự' }
      ]
    }
  },
  {
    id: 'travel-holiday',
    part: 'Writing Part 3',
    topic: 'Travel',
    form: 'What ...?',
    question: 'What place would you like to visit on your next holiday?',
    vi: 'Bạn muốn đến nơi nào trong kỳ nghỉ tiếp theo?',
    targetWords: '40-50 từ',
    sentences: {
      opening: [
        { text: 'On my next holiday, I would like to visit Da Nang.', vi: 'Trong kỳ nghỉ tiếp theo, tôi muốn đến Đà Nẵng.', level: 'A2', tag: 'Trực tiếp' },
        { text: 'If I have a chance to travel, I will choose a peaceful beach city.', vi: 'Nếu có cơ hội đi du lịch, tôi sẽ chọn một thành phố biển yên bình.', level: 'B1', tag: 'Tự nhiên' }
      ],
      body: [
        { text: 'The city has beautiful beaches, delicious food and friendly people.', vi: 'Thành phố có bãi biển đẹp, đồ ăn ngon và con người thân thiện.', level: 'A2', tag: 'Liệt kê' },
        { text: 'I want to walk along the beach, try local food and take photos with my friends.', vi: 'Tôi muốn đi dạo trên biển, thử món địa phương và chụp ảnh với bạn bè.', level: 'B1', tag: 'Chi tiết' },
        { text: 'This trip would help me reduce stress and learn more about a new place.', vi: 'Chuyến đi này sẽ giúp tôi giảm căng thẳng và hiểu thêm về một nơi mới.', level: 'B1', tag: 'Lý do' }
      ],
      ending: [
        { text: 'I think it would be a memorable holiday.', vi: 'Tôi nghĩ đó sẽ là một kỳ nghỉ đáng nhớ.', level: 'A2', tag: 'Chốt ý' },
        { text: 'That is why Da Nang is at the top of my travel list.', vi: 'Đó là lý do Đà Nẵng đứng đầu danh sách du lịch của tôi.', level: 'B1', tag: 'Tự nhiên' }
      ]
    }
  },
  {
    id: 'study-online',
    part: 'Writing Part 4',
    topic: 'Study',
    form: 'How ...?',
    question: 'How can online learning help students?',
    vi: 'Học trực tuyến có thể giúp học sinh như thế nào?',
    targetWords: '120-150 từ',
    sentences: {
      opening: [
        { text: 'In my opinion, online learning can be very helpful for students.', vi: 'Theo tôi, học trực tuyến có thể rất hữu ích cho học sinh.', level: 'B1', tag: 'Ý kiến' },
        { text: 'Online learning has become popular because it gives students more flexible ways to study.', vi: 'Học trực tuyến trở nên phổ biến vì nó cho học sinh cách học linh hoạt hơn.', level: 'B2', tag: 'Nâng cao' }
      ],
      body: [
        { text: 'First, students can study at home and save time travelling to class.', vi: 'Thứ nhất, học sinh có thể học ở nhà và tiết kiệm thời gian đi lại.', level: 'B1', tag: 'Luận điểm 1' },
        { text: 'Another advantage is that they can review recorded lessons when they do not understand something.', vi: 'Một lợi ích khác là họ có thể xem lại bài học đã ghi khi chưa hiểu điều gì đó.', level: 'B2', tag: 'Luận điểm 2' },
        { text: 'For example, a busy student can watch a lesson again in the evening and practise at their own speed.', vi: 'Ví dụ, một học sinh bận rộn có thể xem lại bài vào buổi tối và luyện theo tốc độ riêng.', level: 'B2', tag: 'Ví dụ' }
      ],
      ending: [
        { text: 'For these reasons, online learning is a useful choice for many students.', vi: 'Vì những lý do này, học trực tuyến là lựa chọn hữu ích cho nhiều học sinh.', level: 'B1', tag: 'Kết luận' },
        { text: 'However, students still need self-discipline to get the best results.', vi: 'Tuy nhiên, học sinh vẫn cần tính kỷ luật để đạt kết quả tốt nhất.', level: 'B2', tag: 'Cân bằng' }
      ]
    }
  },
  {
    id: 'work-team',
    part: 'Writing Part 4',
    topic: 'Work',
    form: 'Do you agree ...?',
    question: 'Do you agree that teamwork is important at work?',
    vi: 'Bạn có đồng ý rằng làm việc nhóm quan trọng trong công việc không?',
    targetWords: '120-150 từ',
    sentences: {
      opening: [
        { text: 'I agree that teamwork is very important in the workplace.', vi: 'Tôi đồng ý rằng làm việc nhóm rất quan trọng ở nơi làm việc.', level: 'B1', tag: 'Rõ ý' },
        { text: 'From my point of view, good teamwork is one of the keys to success at work.', vi: 'Theo quan điểm của tôi, làm việc nhóm tốt là một trong những chìa khóa thành công trong công việc.', level: 'B2', tag: 'Tự nhiên' }
      ],
      body: [
        { text: 'When people work together, they can share ideas and solve problems faster.', vi: 'Khi mọi người làm việc cùng nhau, họ có thể chia sẻ ý tưởng và giải quyết vấn đề nhanh hơn.', level: 'B1', tag: 'Lý do' },
        { text: 'For instance, one person may be good at planning, while another person may be better at communication.', vi: 'Chẳng hạn, một người có thể giỏi lập kế hoạch, trong khi người khác giỏi giao tiếp hơn.', level: 'B2', tag: 'Ví dụ' },
        { text: 'Teamwork also creates a more positive working environment because people feel supported.', vi: 'Làm việc nhóm cũng tạo ra môi trường làm việc tích cực hơn vì mọi người cảm thấy được hỗ trợ.', level: 'B2', tag: 'Mở rộng' }
      ],
      ending: [
        { text: 'Therefore, companies should encourage employees to work well together.', vi: 'Vì vậy, các công ty nên khuyến khích nhân viên phối hợp tốt với nhau.', level: 'B1', tag: 'Khuyến nghị' },
        { text: 'In conclusion, teamwork can improve both productivity and job satisfaction.', vi: 'Tóm lại, làm việc nhóm có thể cải thiện cả năng suất và sự hài lòng trong công việc.', level: 'B2', tag: 'Kết luận' }
      ]
    }
  }
];

const sentenceOrder: SentenceType[] = ['opening', 'body', 'ending'];
const writingBankStorageKey = 'aptis-writing-bank-prompts';
const writingAnswerBankStorageKey = 'aptis-writing-answer-bank-prompts';
const writingBankSyncChannel = 'aptis-writing-bank-sync';
const initialWritingPrompts: WritingPrompt[] = [];
const initialAnswerPrompts: WritingPrompt[] = [];
const emptyWritingPrompt: WritingPrompt = {
  id: 'empty-writing-bank',
  part: '',
  topic: '',
  form: '',
  question: 'Chưa có dữ liệu',
  vi: '',
  targetWords: '',
  sentences: { opening: [], body: [], ending: [] }
};

function parseWritingPromptCsv(csv: string, fallback: WritingPrompt[] = fallbackWritingPrompts): WritingPrompt[] {
  const rows = parseCsv(csv);
  return parseWritingPromptRows(rows, fallback);
}

function parseWritingPromptRows(rows: string[][], fallback: WritingPrompt[] = fallbackWritingPrompts): WritingPrompt[] {
  const [headers, ...records] = rows;
  if (!headers?.length) return fallback;

  const prompts = new Map<string, WritingPrompt>();
  records.forEach((record) => {
    const row = Object.fromEntries(headers.map((header, index) => [cleanHeader(header), record[index] ?? '']));
    const section = row.section as SentenceType;
    if (!row.id || !isSentenceType(section) || !row.text) return;

    const prompt = prompts.get(row.id) ?? {
      id: row.id,
      part: row.part,
      topic: row.topic,
      form: row.form,
      question: row.question,
      vi: row.vi,
      targetWords: row.targetWords,
      sentences: { opening: [], body: [], ending: [] }
    };

    prompt.sentences[section].push({
      text: row.text,
      vi: row.textVi,
      level: row.level,
      tag: row.tag
    });
    prompts.set(row.id, prompt);
  });

  const parsed = [...prompts.values()].filter((prompt) => sentenceOrder.some((type) => prompt.sentences[type].length));
  return parsed.length ? parsed : fallback;
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = csv.replace(/^\uFEFF/, '');

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function isSentenceType(value: string): value is SentenceType {
  return value === 'opening' || value === 'body' || value === 'ending';
}

function cleanHeader(value: string) {
  return value.replace(/^\uFEFF/, '').trim();
}

function rowsToPrompts(rows: WritingBankRow[], fallback: WritingPrompt[] = []) {
  if (!rows.length) return fallback;
  return parseWritingPromptRows([
    ['id', 'part', 'topic', 'form', 'question', 'vi', 'targetWords', 'section', 'text', 'textVi', 'level', 'tag'],
    ...rows.map((row) => [
      row.id,
      row.part,
      row.topic,
      row.form,
      row.question,
      row.vi,
      row.targetWords,
      row.section,
      row.text,
      row.textVi,
      row.level,
      row.tag
    ])
  ], fallback);
}

function favoriteKey(prompt: WritingPrompt, sentence: WritingPrompt['sentences'][SentenceType][number]) {
  return JSON.stringify([prompt.id, prompt.part, prompt.topic, sentence.text, sentence.level, sentence.tag]);
}

export function WritingBank() {
  const [samplePrompts, setSamplePrompts] = useState<WritingPrompt[]>(() => loadStoredWritingPrompts(writingBankStorageKey) ?? initialWritingPrompts);
  const [answerPrompts, setAnswerPrompts] = useState<WritingPrompt[]>(() => loadStoredAnswerPrompts() ?? initialAnswerPrompts);
  const [activeTab, setActiveTab] = useState<SentenceType>(() => firstAvailableSentenceType((loadStoredWritingPrompts(writingBankStorageKey) ?? initialWritingPrompts)[0]));
  const [activeView, setActiveView] = useState<WritingBankView>('home');
  const [promptIndex, setPromptIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [formPart, setFormPart] = useState('all');
  const [answerPart, setAnswerPart] = useState('Writing Part 1');
  const [answerTopic, setAnswerTopic] = useState('');
  const [answerLevel, setAnswerLevel] = useState<AnswerLevel>('B1');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState('');
  const [favoriteSentences, setFavoriteSentences] = useState<Set<string>>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('writing-bank-favorites') ?? '[]');
      const values = Array.isArray(saved) ? saved.filter((value): value is string => typeof value === 'string') : [];
      return new Set(values.map((value) => {
        // Older favorites stored only the text; retain a single matching answer.
        for (const prompt of [...answerPrompts, ...samplePrompts]) {
          for (const section of sentenceOrder) {
            const sentence = prompt.sentences[section].find((item) => item.text === value);
            if (sentence) return favoriteKey(prompt, sentence);
          }
        }
        return value;
      }));
    } catch {
      return new Set<string>();
    }
  });
  const [writingHistory, setWritingHistory] = useState<WritingHistoryItem[]>([]);
  const [selected, setSelected] = useState<SelectedSentences>({ opening: 0, body: 0, ending: 0 });

  const answerSourcePrompts = answerPrompts;
  const favoriteRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return [...answerPrompts, ...samplePrompts].flatMap((prompt) =>
      sentenceOrder.flatMap((section) => prompt.sentences[section].map((sentence) => ({
        prompt, sentence, key: favoriteKey(prompt, sentence)
      })))
    ).filter(({ prompt, sentence, key }) => favoriteSentences.has(key)
      && (!keyword || `${prompt.part} ${prompt.topic} ${prompt.question} ${sentence.text} ${sentence.vi} ${sentence.level}`.toLowerCase().includes(keyword)));
  }, [answerPrompts, samplePrompts, favoriteSentences, query]);

  useEffect(() => {
    try {
      localStorage.setItem('writing-bank-favorites', JSON.stringify([...favoriteSentences]));
    } catch {
      // Keep favorites available for this session if browser storage is unavailable.
    }
  }, [favoriteSentences]);
  const writingPrompts = activeView === 'sentences' ? answerSourcePrompts : samplePrompts;
  const currentPrompt = writingPrompts[promptIndex] ?? writingPrompts[0] ?? emptyWritingPrompt;
  const allSentences = currentPrompt.sentences;
  const finalText = useMemo(() => sentenceOrder.map((type) => {
    const selectedIndex = selected[type];
    return selectedIndex === null ? '' : allSentences[type][selectedIndex]?.text;
  }).filter(Boolean).join(' '), [allSentences, selected]);
  const finalVi = useMemo(() => sentenceOrder.map((type) => {
    const selectedIndex = selected[type];
    return selectedIndex === null ? '' : allSentences[type][selectedIndex]?.vi;
  }).filter(Boolean).join(' '), [allSentences, selected]);
  const finalWordCount = useMemo(() => wordCount(finalText), [finalText]);
  const filteredPrompts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return writingPrompts.filter((prompt) => {
      const partMatch = prompt.part === currentPrompt.part;
      const searchMatch = !keyword || `${prompt.part} ${prompt.topic} ${prompt.form} ${prompt.question} ${prompt.vi}`.toLowerCase().includes(keyword);
      return partMatch && searchMatch;
    });
  }, [currentPrompt.part, query, writingPrompts]);
  const filteredSentences = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return allSentences[activeTab].map((sentence, index) => ({ sentence, index })).filter(({ sentence }) => {
      const favoriteMatch = !favoriteOnly || favoriteSentences.has(favoriteKey(currentPrompt, sentence));
      const searchMatch = !keyword || `${sentence.text} ${sentence.vi} ${sentence.level} ${sentence.tag}`.toLowerCase().includes(keyword);
      return favoriteMatch && searchMatch;
    });
  }, [activeTab, allSentences, favoriteOnly, favoriteSentences, query]);
  const answerTopicPrompts = useMemo(() => groupAnswerPrompts(answerSourcePrompts, answerPart), [answerPart, answerSourcePrompts]);
  const answerParts = useMemo(() => {
    const parts = answerSourcePrompts.map((prompt) => prompt.part.trim()).filter(Boolean);
    return [...new Set(parts)];
  }, [answerSourcePrompts]);
  const selectedAnswerPrompt = answerTopicPrompts.find((group) => group.key === answerTopic) ?? answerTopicPrompts[0];
  const allAnswerRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return (selectedAnswerPrompt?.prompts ?? [])
      .flatMap((prompt) => sentenceOrder.flatMap((section) => prompt.sentences[section].map((sentence) => ({ prompt, section, sentence }))))
      .filter(({ prompt, sentence }) => !keyword || `${prompt.topic} ${prompt.question} ${sentence.text} ${sentence.vi} ${sentence.tag}`.toLowerCase().includes(keyword));
  }, [query, selectedAnswerPrompt]);
  const answerRows = useMemo(() => {
    const levelRows = allAnswerRows.filter(({ sentence }) => sentence.level.toUpperCase() === answerLevel);
    return levelRows.length ? levelRows : allAnswerRows;
  }, [allAnswerRows, answerLevel]);
  const answerQuestionGroups = useMemo(() => {
    const groups = new Map<string, { prompt: WritingPrompt; rows: typeof answerRows }>();
    answerRows.forEach((row) => {
      const group = groups.get(row.prompt.id) ?? { prompt: row.prompt, rows: [] };
      group.rows.push(row);
      groups.set(row.prompt.id, group);
    });
    return [...groups.values()];
  }, [answerRows]);
  const answerLevelCounts = useMemo(() => {
    const counts: Record<AnswerLevel, number> = { B1: 0, B2: 0, C1: 0 };
    allAnswerRows.forEach(({ sentence }) => {
      const level = sentence.level.toUpperCase() as AnswerLevel;
      if (level in counts) counts[level] += 1;
    });
    return counts;
  }, [allAnswerRows]);

  useEffect(() => {
    void refreshWritingBanks();
    const refresh = () => {
      void refreshWritingBanks();
    };
    const syncStoredAnswers = () => {
      const storedAnswers = loadStoredAnswerPrompts();
      if (storedAnswers === null) return;
      setAnswerPrompts(storedAnswers);
      setAnswerTopic((currentTopic) => groupAnswerPrompts(storedAnswers, answerPart).some((group) => group.key === currentTopic) ? currentTopic : '');
      setAnswerPart((currentPart) => storedAnswers.some((prompt) => prompt.part === currentPart) ? currentPart : storedAnswers[0]?.part ?? currentPart);
    };
    const syncTimer = window.setInterval(syncStoredAnswers, 1000);
    const channel = new BroadcastChannel(writingBankSyncChannel);
    channel.onmessage = (event: MessageEvent<{ storageKey?: string; prompts?: WritingPrompt[] }>) => {
      if (event.data?.storageKey !== writingAnswerBankStorageKey || !Array.isArray(event.data.prompts)) return;
      setAnswerPrompts(event.data.prompts);
      setAnswerTopic('');
      const nextPart = event.data.prompts.find((prompt) => prompt.part === answerPart)?.part ?? event.data.prompts[0]?.part;
      if (nextPart) setAnswerPart(nextPart);
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('writing-bank-updated', refresh);
    return () => {
      window.clearInterval(syncTimer);
      channel.close();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('writing-bank-updated', refresh);
    };
  }, []);

  async function refreshWritingBanks() {
    try {
      const [sampleRows, answerRows] = await Promise.all([
        unwrap<WritingBankRow[]>(api.get('/writing-bank/samples')),
        unwrap<WritingBankRow[]>(api.get('/writing-bank/answers'))
      ]);
      const samples = rowsToPrompts(sampleRows, []);
      const answers = rowsToPrompts(answerRows, []);
      cacheWritingPrompts(writingBankStorageKey, samples);
      cacheWritingPrompts(writingAnswerBankStorageKey, answers);
      setSamplePrompts(samples);
      setAnswerPrompts(answers);
      setPromptIndex((index) => Math.min(index, Math.max(samples.length - 1, 0)));
      const nextAnswerPart = answers.find((prompt) => prompt.part === answerPart)?.part ?? answers[0]?.part;
      if (nextAnswerPart && nextAnswerPart !== answerPart) {
        setAnswerPart(nextAnswerPart);
        setAnswerTopic('');
      }
    } catch (error) {
      console.error(error);
      setSamplePrompts(loadStoredWritingPrompts(writingBankStorageKey) ?? initialWritingPrompts);
      const storedAnswers = loadStoredAnswerPrompts() ?? initialAnswerPrompts;
      setAnswerPrompts(storedAnswers);
      const nextAnswerPart = storedAnswers.find((prompt) => prompt.part === answerPart)?.part ?? storedAnswers[0]?.part;
      if (nextAnswerPart && nextAnswerPart !== answerPart) {
        setAnswerPart(nextAnswerPart);
        setAnswerTopic('');
      }
    }
  }

  function choosePrompt(index: number) {
    const prompt = writingPrompts[index];
    if (activeView === 'sentences') {
      setAnswerPart(prompt?.part ?? answerPart);
      setAnswerTopic('');
      return;
    }
    setPromptIndex(index);
    setSelected({ opening: 0, body: 0, ending: 0 });
    setActiveTab(firstAvailableSentenceType(prompt));
  }

  function copyText(value: string, label: string) {
    if (!value.trim()) return;
    void navigator.clipboard?.writeText(value);
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(''), 1400);
  }

  function createDraft() {
    if (!finalText.trim()) return;
    const now = new Date();
    setWritingHistory((current) => [
      {
        id: `${now.getTime()}-${current.length}`,
        part: currentPrompt.part,
        topic: currentPrompt.topic,
        text: finalText,
        vi: finalVi,
        words: finalWordCount,
        createdAt: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      },
      ...current
    ]);
    setActiveView('history');
  }

  function toggleFavorite(value: string) {
    setFavoriteSentences((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  return (
    <div className="writing-bank-page -mx-4 -my-6 min-h-[calc(100vh-4rem)] bg-[#f6f8fc] text-[#101a3d] sm:-mx-6 sm:-my-8 lg:-mx-10">
      <div className={`writing-bank-layout grid min-h-[calc(100vh-4rem)] w-full lg:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[240px_minmax(0,1fr)] ${sidebarOpen ? '' : 'writing-bank-sidebar-hidden'}`}>
        <aside id="writing-bank-sidebar" hidden={!sidebarOpen} className="border-r border-slate-200 bg-white px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 text-white shadow-soft">
              <PenLine size={27} />
            </span>
            <div>
              <h1 className="text-lg font-black leading-7">Aptis</h1>
              <p className="text-lg font-bold">Lingo</p>
            </div>
          </div>

          <nav className="mt-5 space-y-1 text-[13px] font-extrabold">
            {[
              { icon: Home, label: 'Trang chủ', view: 'home' as const },
              { icon: Library, label: 'Kho mẫu câu', view: 'bank' as const },
              { icon: BookOpen, label: 'Kho đáp án', view: 'sentences' as const },
              { icon: Star, label: 'Yêu thích', view: 'favorites' as const },
              { icon: Clock3, label: 'Lịch sử học', view: 'history' as const }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setActiveView(item.view);
                    setFavoriteOnly(item.view === 'favorites');
                    if (item.view === 'bank') {
                      void refreshWritingBanks();
                      setPromptIndex(0);
                      setActiveTab(firstAvailableSentenceType(samplePrompts[0]));
                    }
                    if (item.view === 'sentences') {
                      void refreshWritingBanks();
                      setPromptIndex(0);
                      setActiveTab(firstAvailableSentenceType(answerSourcePrompts[0]));
                      setAnswerPart(answerParts[0] ?? answerPart);
                      setAnswerTopic('');
                    }
                  }}
                  className={`flex h-10 w-full items-center gap-3 rounded-xl px-4 text-left transition ${
                    activeView === item.view ? 'bg-pink-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  <Icon size={19} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-[13px] font-black">Part Writing</p>
            {['Part 1 Điền từ / cụm từ', 'Part 2 Trả lời câu hỏi', 'Part 3 Trả lời tin nhắn', 'Part 4 Viết email'].map((label, index) => {
              const part = `Writing Part ${index + 1}`;
              const active = activeView === 'sentences' ? answerPart === part : currentPrompt.part === part;
              const disabled = activeView === 'sentences'
                ? !answerSourcePrompts.some((prompt) => prompt.part === part)
                : activeView === 'bank' ? false : !writingPrompts.some((prompt) => prompt.part === part);
              return (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (activeView === 'sentences') {
                      setAnswerPart(part);
                      setAnswerTopic('');
                      return;
                    }
                    if (activeView === 'bank') { setFormPart(String(index + 1)); return; }
                    const nextIndex = writingPrompts.findIndex((prompt) => prompt.part === part);
                    if (nextIndex >= 0) {
                      setFormPart(String(index + 1));
                      if (activeView === 'home') setActiveView('bank');
                      choosePrompt(nextIndex);
                    }
                  }}
                  className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-bold ${
                    active ? 'bg-pink-50 text-rose-600' : disabled ? 'cursor-not-allowed text-slate-300' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText size={17} />
                  <span>
                    <span className="block">{label.split(' ')[0]} {label.split(' ')[1]}</span>
                    <span className="block text-xs font-semibold opacity-80">{label.split(' ').slice(2).join(' ')}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 p-4 2xl:p-5">
          <button type="button" className="writing-bank-sidebar-toggle" aria-controls="writing-bank-sidebar" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(open => !open)}>
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            {sidebarOpen ? 'Ẩn menu' : 'Hiện menu'}
          </button>
          {activeView === 'bank' && <header className="writing-bank-title"><h1>Kho mẫu câu Writing</h1><p>20 form mẫu cốt lõi · Công thức linh hoạt · Có ví dụ và bản dịch</p><Sparkles aria-hidden="true" /></header>}
          {activeView !== 'home' && <div className="mb-4 flex flex-col gap-3 xl:flex-row">
            <label className="writing-bank-search flex h-10 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
              <Search size={21} className="text-slate-500" />
              <input className="writing-bank-search-input w-full text-[13px] font-semibold outline-none placeholder:text-slate-400" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mẫu câu theo từ khóa, chủ đề, tình huống..." />
            </label>
            <button type="button" onClick={() => { setActiveView('favorites'); setFavoriteOnly(true); }} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-5 text-[13px] font-extrabold shadow-sm ${activeView === 'favorites' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white'}`}>
              <Star size={18} className={favoriteOnly ? 'fill-amber-400 text-amber-400' : 'text-amber-400'} /> Yêu thích
            </button>
            <button type="button" onClick={() => { setActiveView('history'); setFavoriteOnly(false); }} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-5 text-[13px] font-extrabold shadow-sm ${activeView === 'history' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white'}`}>
              <Clock3 size={18} /> Lịch sử
            </button>
          </div>}

          {activeView === 'home' ? <WritingGuide /> : activeView === 'bank' ? <WritingForms query={query} requestedPart={formPart} /> : activeView === 'history' ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[13px] font-black text-blue-600">Lịch sử học</p>
                  <h2 className="mt-1 text-lg font-black">Bài đã tạo</h2>
                </div>
                <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">{writingHistory.length} bài</span>
              </div>
              {writingHistory.length ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {writingHistory.map((item) => (
                    <article key={item.id} className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-lg bg-white px-2 py-1 text-xs font-black text-blue-700">{item.part} · {item.topic} · {item.words} từ</span>
                        <span className="text-xs font-bold text-slate-500">{item.createdAt}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-[13px] font-semibold leading-5 text-[#101a3d]">{item.text}</p>
                      <p className="mt-3 text-[13px] italic leading-5 text-slate-500">{item.vi}</p>
                      <button type="button" onClick={() => copyText(item.text, item.id)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-black text-blue-700 shadow-sm">
                        <Copy size={15} /> {copiedLabel === item.id ? 'Đã chép' : 'Chép bài'}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="writing-bank-history-empty rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                  <p className="text-lg font-black text-slate-900">Chưa có bài nào trong lịch sử</p>
                  <p className="mt-2 text-[13px] font-semibold text-slate-500">Bấm “Tạo” ở khung bài mẫu đang ghép để lưu bài vào đây.</p>
                  <button type="button" onClick={() => setActiveView('bank')} className="mt-5 inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-[13px] font-black text-white">
                    Quay lại tạo bài
                  </button>
                </div>
              )}
            </section>
          ) : activeView === 'favorites' ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black">Yêu thích</h2>
                <span className="text-xs font-bold text-slate-500">{favoriteRows.length} câu đã lưu</span>
              </div>
              <div className="space-y-3">
                {favoriteRows.map(({ prompt, sentence, key }) => (
                  <article key={key} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-bold text-rose-600">{prompt.part} · {prompt.topic}</p>
                    <h3 className="mt-3 text-[13px] font-black text-slate-900">{prompt.question}</h3>

                    <p className="mt-3 whitespace-pre-wrap text-[13px] font-semibold leading-5">{sentence.text}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => copyText(sentence.text, key)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-50 px-3 text-xs font-black text-blue-700">
                        <Copy size={15} /> {copiedLabel === key ? 'Đã chép' : 'Chép'}
                      </button>
                      <button type="button" aria-pressed={true} onClick={() => toggleFavorite(key)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-50 px-3 text-xs font-black text-rose-600">
                        <Heart size={15} className="fill-current" /> Bỏ yêu thích
                      </button>
                    </div>
                  </article>
                ))}
                {!favoriteRows.length && <p className="py-10 text-center text-[13px] font-semibold text-slate-500">{query.trim() ? 'Không có câu yêu thích phù hợp với tìm kiếm.' : 'Chưa có câu yêu thích. Bấm “Yêu thích” ở đáp án hoặc câu mẫu để lưu vào đây.'}</p>}
              </div>
            </section>
          ) : activeView === 'sentences' ? (
          <section className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[13px] font-black text-rose-500">Dữ liệu từ admin</p>
                  <h2 className="mt-1 text-lg font-black">Kho đáp án theo chủ đề</h2>
                </div>
                <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{answerTopicPrompts.length} chủ đề · {answerPart}</span>
              </div>
              {answerTopicPrompts.length ? (
                <div className="h-[220px] overflow-y-scroll pr-2 [scrollbar-gutter:stable]">
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {answerTopicPrompts.map((prompt) => (
                    <button
                      key={prompt.key}
                      type="button"
                      onClick={() => setAnswerTopic(prompt.key)}
                      className={`rounded-xl border p-3 text-left transition ${selectedAnswerPrompt?.key === prompt.key ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                    >
                      <span className="block text-[13px] font-black">{formatWritingSetTopic(prompt)}</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-500">
                        {answerPart} · {countAnswersForPrompt(prompt)} đáp án
                      </span>
                    </button>
                  ))}
                  </div>
                </div>
              ) : (
                <div className="writing-bank-sentences-empty rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-[13px] font-bold text-slate-500">Chưa có dữ liệu kho đáp án cho Part đang chọn.</div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[13px] font-black text-rose-500">Chủ đề đang chọn</p>
                  <h2 className="mt-1 text-lg font-black">{selectedAnswerPrompt?.topic || 'Chưa có dữ liệu'}</h2>
                  <p className="mt-1 text-[13px] font-semibold text-slate-500">
                    {answerPart} · {answerRows.length} đáp án{answerLevelCounts[answerLevel] ? ` · ${answerLevel}` : ' · tất cả level'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['B1', 'B2', 'C1'] as AnswerLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setAnswerLevel(level)}
                      className={`h-10 rounded-xl px-4 text-[13px] font-black transition ${answerLevel === level ? 'bg-rose-500 text-white shadow-soft' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      {level} · {answerLevelCounts[level]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {answerQuestionGroups.map(({ prompt, rows }, groupIndex) => (
                  <details key={prompt.id} className="group rounded-xl border border-slate-200 bg-white p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{prompt.part}</span>
                      <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">{prompt.form}</span>
                      <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Câu {getWritingQuestionNumber(prompt.id)}</span>
                      <span className="rounded-lg bg-pink-100 px-2 py-1 text-xs font-black text-rose-600">{rows.length} đáp án</span>
                    </div>
                    <h3 className="text-[13px] font-black text-slate-900">{prompt.question}</h3>
                    {prompt.vi && <p className="mt-1 text-xs font-semibold text-slate-500">{prompt.vi}</p>}
                    </div>
                    <ChevronDown size={20} aria-hidden="true" className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-4 space-y-3">
                      {rows.map(({ sentence }, index) => {
                        const copyLabel = `answer-${groupIndex}-${index}`;
                        return (
                          <div key={`${sentence.level}-${sentence.tag}-${index}`} className="writing-answer-item rounded-xl border border-slate-100 bg-white p-3">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-lg bg-pink-100 px-2 py-1 text-xs font-black text-rose-600">{sentence.level}</span>
                              <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{sentence.tag}</span>
                            </div>
                            <p className="whitespace-pre-wrap text-[13px] font-semibold leading-5 text-[#101a3d]">{sentence.text}</p>
                            {sentence.vi && <p className="mt-1 text-xs font-semibold italic leading-5 text-slate-500">{sentence.vi}</p>}
                            <button type="button" onClick={() => copyText(sentence.text, copyLabel)} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-50 px-3 text-xs font-black text-blue-700">
                      <Copy size={15} /> {copiedLabel === copyLabel ? 'Đã chép' : 'Chép đáp án'}
                            </button>
                            <button type="button" aria-pressed={favoriteSentences.has(favoriteKey(prompt, sentence))} onClick={() => toggleFavorite(favoriteKey(prompt, sentence))} className={`ml-2 mt-3 inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-black ${favoriteSentences.has(favoriteKey(prompt, sentence)) ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                              <Heart size={15} className={favoriteSentences.has(favoriteKey(prompt, sentence)) ? 'fill-current' : ''} /> {favoriteSentences.has(favoriteKey(currentPrompt, sentence)) ? 'Đã yêu thích' : 'Yêu thích'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ))}
                {!answerRows.length && <div className="writing-bank-sentences-empty rounded-xl border border-slate-200 bg-slate-50 px-5 py-12 text-center text-[13px] font-bold text-slate-500">Chưa có đáp án phù hợp với Part, chủ đề và bậc đang chọn.</div>}
              </div>
            </section>
          </section>
          ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_440px]">
            <section className="min-w-0 space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[13px] font-black text-rose-500">Dữ liệu từ admin</p>
                    <h2 className="mt-1 text-lg font-black">Kho đáp án đã import</h2>
                  </div>
                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{filteredPrompts.length} chủ đề · {currentPrompt.part}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredPrompts.map((prompt) => {
                    const realIndex = writingPrompts.findIndex((item) => item.id === prompt.id);
                    const active = currentPrompt.id === prompt.id;
                    return (
                      <button key={prompt.id} type="button" onClick={() => choosePrompt(realIndex)} className={`w-full rounded-xl border p-3 text-left transition ${active ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-wide">{prompt.part}</span>
                          {active && <CheckCircle2 size={17} />}
                        </span>
                        <span className="mt-2 block text-[13px] font-black text-slate-900">{prompt.topic}</span>
                        <span className="mt-1 block text-[13px] font-bold text-slate-800">{prompt.question}</span>
                        <span className="mt-1 block text-xs font-semibold text-slate-500">{prompt.form} · {prompt.targetWords}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[13px] font-black text-rose-500">Đề đang chọn</p>
                    <h2 className="mt-1 text-lg font-black leading-tight">{currentPrompt.question}</h2>
                    <p className="mt-2 text-[13px] font-semibold text-slate-500">{currentPrompt.vi}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[currentPrompt.part, currentPrompt.topic, currentPrompt.form, currentPrompt.targetWords].map((item) => (
                      <span key={item} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{item}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {sentenceTabs.map((tab) => (
                    <button key={tab.type} type="button" onClick={() => setActiveTab(tab.type)} className={`flex min-h-20 items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${activeTab === tab.type ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                      <span>
                        <span className="block text-[13px] font-black">{tab.label}</span>
                        <span className="mt-1 block text-xs font-semibold text-slate-500">{tab.hint}</span>
                      </span>
                      <ChevronDown size={18} />
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><BookOpen size={21} /></span>
                  <div>
                    <h2 className="text-lg font-black">Câu mẫu cho phần {sentenceTabs.find((tab) => tab.type === activeTab)?.label.toLowerCase()}</h2>
                    <p className="text-[13px] font-semibold text-slate-500">Bấm chọn một câu, phần bài mẫu bên phải sẽ cập nhật ngay.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <button type="button" onClick={() => setSelected((current) => ({ ...current, [activeTab]: null }))} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${selected[activeTab] === null ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <span className={`mt-1 h-5 w-5 shrink-0 rounded-full border ${selected[activeTab] === null ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-black leading-5">Để trống</span>
                      <span className="mt-1 block text-xs font-semibold italic leading-5 text-slate-500">Không thêm câu cho phần {sentenceTabs.find((tab) => tab.type === activeTab)?.label.toLowerCase()}.</span>
                      <span className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{currentPrompt.part}</span>
                        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{sentenceTabs.find((tab) => tab.type === activeTab)?.label}</span>
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">Tùy chọn</span>
                      </span>
                    </span>
                  </button>
                  {filteredSentences.map(({ sentence, index }) => {
                    const active = selected[activeTab] === index;
                    const favorite = favoriteSentences.has(favoriteKey(currentPrompt, sentence));
                    return (
                      <button key={sentence.text} type="button" onClick={() => setSelected((current) => ({ ...current, [activeTab]: index }))} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${active ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                        <span className={`mt-1 h-5 w-5 shrink-0 rounded-full border ${active ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-black leading-5">{sentence.text}</span>
                          <span className="mt-1 block text-xs font-semibold italic leading-5 text-slate-500">{sentence.vi}</span>
                          <span className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{currentPrompt.part}</span>
                            <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{sentenceTabs.find((tab) => tab.type === activeTab)?.label}</span>
                            <span className="rounded-lg bg-pink-100 px-2 py-1 text-xs font-black text-rose-600">{sentence.level}</span>
                            <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">{sentence.tag}</span>
                          </span>
                        </span>
                        <span className="flex shrink-0 gap-2">
                          <span role="button" tabIndex={0} className="grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-500 shadow-sm" onClick={(event) => { event.stopPropagation(); copyText(sentence.text, 'sentence'); }} onKeyDown={(event) => { if (event.key === 'Enter') copyText(sentence.text, 'sentence'); }}><Copy size={17} /></span>
                          <span role="button" tabIndex={0} className="grid h-9 w-9 place-items-center rounded-lg bg-white shadow-sm" onClick={(event) => { event.stopPropagation(); toggleFavorite(favoriteKey(currentPrompt, sentence)); }} onKeyDown={(event) => { if (event.key === 'Enter') toggleFavorite(favoriteKey(currentPrompt, sentence)); }}><Heart size={17} className={favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} /></span>
                        </span>
                      </button>
                    );
                  })}
                  {!filteredSentences.length && <div className="writing-bank-sentences-empty rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-[13px] font-bold text-slate-500">Chưa có câu mẫu phù hợp với bộ lọc hiện tại.</div>}
                </div>
              </section>
            </section>

            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-auto">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Sparkles size={21} /></span>
                  <div>
                    <h2 className="text-lg font-black">Bài mẫu đang ghép</h2>
                    <p className="text-xs font-semibold text-slate-500">{finalWordCount} từ</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={createDraft} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[13px] font-black text-white">
                    <Sparkles size={16} /> Tạo
                  </button>
                  <button type="button" onClick={() => copyText(finalText, 'final')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-500 px-4 text-[13px] font-black text-white">
                    <Copy size={16} /> {copiedLabel === 'final' ? 'Đã chép' : 'Chép'}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {sentenceOrder.map((type, index) => {
                  const selectedIndex = selected[type];
                  const sentence = selectedIndex === null ? null : allSentences[type][selectedIndex];
                  const tab = sentenceTabs.find((item) => item.type === type);
                  const colors = ['bg-pink-100 text-rose-600', 'bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-700'];
                  return (
                    <div key={type} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex gap-3">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-black ${colors[index]}`}>{index + 1}</span>
                        <div>
                          <p className="font-black text-slate-900">{tab?.label}</p>
                          <p className="mt-1 text-xs font-black text-rose-500">{currentPrompt.part}</p>
                          <p className="mt-2 text-[13px] font-semibold leading-5">{sentence?.text ?? 'Để trống'}</p>
                          {sentence?.vi && <p className="mt-1 text-xs font-semibold italic leading-5 text-slate-500">{sentence.vi}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-xl bg-blue-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-blue-700" />
                  <p className="font-black text-blue-900">Bài hoàn chỉnh</p>
                </div>
                <p className="text-[13px] font-semibold leading-5">{finalText}</p>
                <p className="mt-4 text-[13px] italic leading-5 text-slate-500">{finalVi}</p>
              </div>
            </aside>
          </div>
          )}
        </main>
      </div>
    </div>
  );
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function countAnswersForPrompt(prompt: WritingPrompt | AnswerPromptGroup): number {
  if ('prompts' in prompt) return countAnswersForGroup(prompt);
  return sentenceOrder.reduce((sum, section) => sum + prompt.sentences[section].length, 0);
}

function countAnswersForGroup(group: AnswerPromptGroup): number {
  return group.prompts.reduce((total, prompt) => total + countAnswersForPrompt(prompt), 0);
}

function formatWritingSetTopic(prompt: WritingPrompt | AnswerPromptGroup) {
  if ('prompts' in prompt) return `Đề ${prompt.setNumber}: ${prompt.topic}`;
  const index = 0;
  const topic = prompt.topic;
  const match = prompt.id.match(/aptis-(\d+)-p\d+-q(\d+)/i);
  if (match) return `Đề ${match[1]} · Câu ${match[2]}: ${prompt.topic}`;
  return prompt.topic;
  return `Bộ đề ${String(index + 1).padStart(2, '0')}: ${topic}`;
}

function groupAnswerPrompts(prompts: WritingPrompt[], part: string): AnswerPromptGroup[] {
  const groups = new Map<string, AnswerPromptGroup>();
  prompts.filter((prompt) => prompt.part === part && prompt.topic.trim()).forEach((prompt) => {
    const setNumber = getWritingSetNumber(prompt.id);
    const key = `${part}::${setNumber}::${prompt.topic.trim().toLowerCase()}`;
    const group = groups.get(key) ?? {
      key,
      setNumber,
      part,
      topic: prompt.topic,
      prompts: []
    };
    group.prompts.push(prompt);
    groups.set(key, group);
  });

  return [...groups.values()].map((group) => ({
    ...group,
    prompts: group.prompts.sort((a, b) => getWritingQuestionNumber(a.id) - getWritingQuestionNumber(b.id))
  }));
}

function getWritingSetNumber(id: string) {
  return id.match(/aptis-(\d+)/i)?.[1] ?? '01';
}

function getWritingQuestionNumber(id: string) {
  return Number(id.match(/-q(\d+)/i)?.[1] ?? 0);
}

function cacheWritingPrompts(storageKey: string, prompts: WritingPrompt[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(prompts));
  } catch {
    // Keep the server result usable when browser storage is unavailable or full.
  }
}

function loadStoredWritingPrompts(storageKey: string) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WritingPrompt[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadStoredAnswerPrompts() {
  return loadStoredWritingPrompts(writingAnswerBankStorageKey);
}

function firstAvailableSentenceType(prompt?: WritingPrompt): SentenceType {
  return sentenceOrder.find((type) => prompt?.sentences[type]?.length) ?? 'opening';
}
