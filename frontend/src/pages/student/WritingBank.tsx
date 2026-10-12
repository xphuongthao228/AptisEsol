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
  Search,
  Sparkles,
  Star
} from 'lucide-react';
import { useMemo, useState } from 'react';
import writingBankCsv from '../../data/writing-bank.csv?raw';

type SentenceType = 'opening' | 'body' | 'ending';
type WritingBankView = 'home' | 'bank' | 'sentences' | 'favorites' | 'history';
type SelectedSentences = Record<SentenceType, number | null>;
type Sentence = { text: string; vi: string; level: string; tag: string };
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
const writingPrompts = parseWritingPromptCsv(writingBankCsv);

function parseWritingPromptCsv(csv: string): WritingPrompt[] {
  const rows = csv.trim().split(/\r?\n/).filter(Boolean).map(parseCsvLine);
  const [headers, ...records] = rows;
  if (!headers?.length) return fallbackWritingPrompts;

  const prompts = new Map<string, WritingPrompt>();
  records.forEach((record) => {
    const row = Object.fromEntries(headers.map((header, index) => [header, record[index] ?? '']));
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

  const parsed = [...prompts.values()].filter((prompt) => sentenceOrder.every((type) => prompt.sentences[type].length));
  return parsed.length ? parsed : fallbackWritingPrompts;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }

  values.push(value.trim());
  return values;
}

function isSentenceType(value: string): value is SentenceType {
  return value === 'opening' || value === 'body' || value === 'ending';
}

export function WritingBank() {
  const [activeTab, setActiveTab] = useState<SentenceType>('opening');
  const [activeView, setActiveView] = useState<WritingBankView>('bank');
  const [promptIndex, setPromptIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState('');
  const [favoriteSentences, setFavoriteSentences] = useState<Set<string>>(() => new Set());
  const [writingHistory, setWritingHistory] = useState<WritingHistoryItem[]>([]);
  const [selected, setSelected] = useState<SelectedSentences>({ opening: 0, body: 0, ending: 0 });

  const currentPrompt = writingPrompts[promptIndex];
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
  }, [currentPrompt.part, query]);
  const filteredSentences = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return allSentences[activeTab].map((sentence, index) => ({ sentence, index })).filter(({ sentence }) => {
      const favoriteMatch = !favoriteOnly || favoriteSentences.has(sentence.text);
      const searchMatch = !keyword || `${sentence.text} ${sentence.vi} ${sentence.level} ${sentence.tag}`.toLowerCase().includes(keyword);
      return favoriteMatch && searchMatch;
    });
  }, [activeTab, allSentences, favoriteOnly, favoriteSentences, query]);

  function choosePrompt(index: number) {
    setPromptIndex(index);
    setSelected({ opening: 0, body: 0, ending: 0 });
    setActiveTab('opening');
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
      <div className="grid min-h-[calc(100vh-4rem)] w-full lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-r border-slate-200 bg-white px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 text-white shadow-soft">
              <PenLine size={27} />
            </span>
            <div>
              <h1 className="text-2xl font-black leading-7">Aptis</h1>
              <p className="text-xl font-bold">Lingo</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2 text-sm font-extrabold">
            {[
              { icon: Home, label: 'Trang chủ', view: 'home' as const },
              { icon: Library, label: 'Kho mẫu câu', view: 'bank' as const },
              { icon: BookOpen, label: 'Mẫu câu', view: 'sentences' as const },
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
                  }}
                  className={`flex h-12 w-full items-center gap-3 rounded-xl px-4 text-left transition ${
                    activeView === item.view ? 'bg-pink-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  <Icon size={19} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-black">Part Writing</p>
            {['Part 1 Điền từ / cụm từ', 'Part 2 Trả lời câu hỏi', 'Part 3 Trả lời tin nhắn', 'Part 4 Viết email'].map((label, index) => {
              const active = currentPrompt.part === `Writing Part ${index + 1}`;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    const nextIndex = writingPrompts.findIndex((prompt) => prompt.part === `Writing Part ${index + 1}`);
                    if (nextIndex >= 0) choosePrompt(nextIndex);
                  }}
                  className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold ${
                    active ? 'bg-pink-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50'
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

        <main className="min-w-0 p-5 2xl:p-6">
          <div className="mb-5 flex flex-col gap-3 xl:flex-row">
            <label className="writing-bank-search flex h-12 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
              <Search size={21} className="text-slate-500" />
              <input className="writing-bank-search-input w-full text-sm font-semibold outline-none placeholder:text-slate-400" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm đề, chủ đề, mẫu câu..." />
            </label>
            <button type="button" onClick={() => { setActiveView('favorites'); setFavoriteOnly(true); }} className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-extrabold shadow-sm ${activeView === 'favorites' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white'}`}>
              <Star size={18} className={favoriteOnly ? 'fill-amber-400 text-amber-400' : 'text-amber-400'} /> Yêu thích
            </button>
            <button type="button" onClick={() => { setActiveView('history'); setFavoriteOnly(false); }} className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-extrabold shadow-sm ${activeView === 'history' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white'}`}>
              <Clock3 size={18} /> Lịch sử
            </button>
          </div>

          {activeView === 'history' ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-blue-600">Lịch sử học</p>
                  <h2 className="mt-1 text-2xl font-black">Bài đã tạo</h2>
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
                      <p className="text-sm font-semibold leading-6 text-[#101a3d]">{item.text}</p>
                      <p className="mt-3 text-sm italic leading-6 text-slate-500">{item.vi}</p>
                      <button type="button" onClick={() => copyText(item.text, item.id)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-black text-blue-700 shadow-sm">
                        <Copy size={15} /> {copiedLabel === item.id ? 'Đã chép' : 'Chép bài'}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="writing-bank-history-empty rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                  <p className="text-lg font-black text-slate-900">Chưa có bài nào trong lịch sử</p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Bấm “Tạo” ở khung bài mẫu đang ghép để lưu bài vào đây.</p>
                  <button type="button" onClick={() => setActiveView('bank')} className="mt-5 inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white">
                    Quay lại tạo bài
                  </button>
                </div>
              )}
            </section>
          ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_440px]">
            <section className="min-w-0 space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-rose-500">Dữ liệu từ CSV</p>
                    <h2 className="mt-1 text-xl font-black">Chủ đề Writing đã import</h2>
                  </div>
                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{filteredPrompts.length} chủ đề · {currentPrompt.part}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredPrompts.map((prompt) => {
                    const realIndex = writingPrompts.findIndex((item) => item.id === prompt.id);
                    const active = currentPrompt.id === prompt.id;
                    return (
                      <button key={prompt.id} type="button" onClick={() => choosePrompt(realIndex)} className={`w-full rounded-xl border p-4 text-left transition ${active ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-wide">{prompt.part}</span>
                          {active && <CheckCircle2 size={17} />}
                        </span>
                        <span className="mt-2 block text-base font-black text-slate-900">{prompt.topic}</span>
                        <span className="mt-1 block text-sm font-bold text-slate-800">{prompt.question}</span>
                        <span className="mt-1 block text-xs font-semibold text-slate-500">{prompt.form} · {prompt.targetWords}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-black text-rose-500">Đề đang chọn</p>
                    <h2 className="mt-1 text-2xl font-black leading-tight">{currentPrompt.question}</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{currentPrompt.vi}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[currentPrompt.part, currentPrompt.topic, currentPrompt.form, currentPrompt.targetWords].map((item) => (
                      <span key={item} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{item}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {sentenceTabs.map((tab) => (
                    <button key={tab.type} type="button" onClick={() => setActiveTab(tab.type)} className={`flex min-h-20 items-center justify-between gap-3 rounded-xl border p-4 text-left transition ${activeTab === tab.type ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                      <span>
                        <span className="block text-sm font-black">{tab.label}</span>
                        <span className="mt-1 block text-xs font-semibold text-slate-500">{tab.hint}</span>
                      </span>
                      <ChevronDown size={18} />
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><BookOpen size={21} /></span>
                  <div>
                    <h2 className="text-xl font-black">Câu mẫu cho phần {sentenceTabs.find((tab) => tab.type === activeTab)?.label.toLowerCase()}</h2>
                    <p className="text-sm font-semibold text-slate-500">Bấm chọn một câu, phần bài mẫu bên phải sẽ cập nhật ngay.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <button type="button" onClick={() => setSelected((current) => ({ ...current, [activeTab]: null }))} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${selected[activeTab] === null ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <span className={`mt-1 h-5 w-5 shrink-0 rounded-full border ${selected[activeTab] === null ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black leading-6">Để trống</span>
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
                    const favorite = favoriteSentences.has(sentence.text);
                    return (
                      <button key={sentence.text} type="button" onClick={() => setSelected((current) => ({ ...current, [activeTab]: index }))} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${active ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                        <span className={`mt-1 h-5 w-5 shrink-0 rounded-full border ${active ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black leading-6">{sentence.text}</span>
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
                          <span role="button" tabIndex={0} className="grid h-9 w-9 place-items-center rounded-lg bg-white shadow-sm" onClick={(event) => { event.stopPropagation(); toggleFavorite(sentence.text); }} onKeyDown={(event) => { if (event.key === 'Enter') toggleFavorite(sentence.text); }}><Heart size={17} className={favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} /></span>
                        </span>
                      </button>
                    );
                  })}
                  {!filteredSentences.length && <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">Chưa có câu mẫu phù hợp với bộ lọc hiện tại.</div>}
                </div>
              </section>
            </section>

            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-auto">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Sparkles size={21} /></span>
                  <div>
                    <h2 className="text-lg font-black">Bài mẫu đang ghép</h2>
                    <p className="text-xs font-semibold text-slate-500">{finalWordCount} từ</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={createDraft} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white">
                    <Sparkles size={16} /> Tạo
                  </button>
                  <button type="button" onClick={() => copyText(finalText, 'final')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-500 px-4 text-sm font-black text-white">
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
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${colors[index]}`}>{index + 1}</span>
                        <div>
                          <p className="font-black text-slate-900">{tab?.label}</p>
                          <p className="mt-1 text-xs font-black text-rose-500">{currentPrompt.part}</p>
                          <p className="mt-2 text-sm font-semibold leading-6">{sentence?.text ?? 'Để trống'}</p>
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
                <p className="text-sm font-semibold leading-6">{finalText}</p>
                <p className="mt-4 text-sm italic leading-6 text-slate-500">{finalVi}</p>
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
