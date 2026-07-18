import { FormEvent, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, Check, Download, Layers, ListChecks, MessageCircle, Mic, Pencil, Play, Plus, Trash2, UploadCloud, Volume2, Wand2 } from 'lucide-react';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { Question, QuestionType, Skill, SkillType, Test, TestMode } from '../../types';

type Tab = 'skills' | 'tests' | 'questions';
type TestStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

const skillTypes: SkillType[] = ['LISTENING', 'SPEAKING', 'READING', 'WRITING', 'GRAMMAR'];
const questionTypes: QuestionType[] = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT', 'AUDIO', 'SPEAKING'];
const statuses: TestStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const testModes: Array<{ value: TestMode; label: string }> = [
  { value: 'PRACTICE', label: 'Luyện tập theo câu hỏi' },
  { value: 'EXAM', label: 'Bộ đề / Đề thi' }
];

export function AdminContent() {
  const [tab, setTab] = useState<Tab>('skills');
  const { data: skills, setData: setSkills } = useApi<Skill[]>(() => unwrap(api.get('/skills')), []);
  const { data: tests, setData: setTests } = useApi<Test[]>(() => unwrap(api.get('/tests')), []);
  const [selectedTestId, setSelectedTestId] = useState('');
  const { data: questions, setData: setQuestions, loading: loadingQuestions } = useApi<Question[]>(
    () => selectedTestId ? unwrap(api.get(`/questions?testId=${selectedTestId}`)) : Promise.resolve([]),
    [selectedTestId]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Quản lý nội dung</h1>
        <p className="mt-1 text-sm text-slate-500">Quản lý kỹ năng, bài luyện, câu hỏi và đáp án từ API backend.</p>
      </div>

      <div className="card flex flex-wrap gap-2 p-2">
        <TabButton active={tab === 'skills'} icon={<Layers size={18} />} label="Kỹ năng" onClick={() => setTab('skills')} />
        <TabButton active={tab === 'tests'} icon={<BookOpen size={18} />} label="Bài luyện" onClick={() => setTab('tests')} />
        <TabButton active={tab === 'questions'} icon={<ListChecks size={18} />} label="Câu hỏi" onClick={() => setTab('questions')} />
      </div>

      {tab === 'skills' && <SkillsPanel skills={skills ?? []} setSkills={setSkills} />}
      {tab === 'tests' && <TestsPanel skills={skills ?? []} tests={tests ?? []} setTests={setTests} />}
      {tab === 'questions' && (
        <QuestionsPanel
          tests={tests ?? []}
          selectedTestId={selectedTestId}
          setSelectedTestId={setSelectedTestId}
          questions={questions ?? []}
          setQuestions={setQuestions}
          loading={loadingQuestions}
        />
      )}
    </div>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${active ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
      {icon}{label}
    </button>
  );
}

function SkillsPanel({ skills, setSkills }: { skills: Skill[]; setSkills: Dispatch<SetStateAction<Skill[] | null>> }) {
  const [editing, setEditing] = useState<Skill | null>(null);
  const [type, setType] = useState<SkillType>('LISTENING');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  function fill(skill: Skill) {
    setEditing(skill);
    setType(skill.type);
    setName(skill.name);
    setDescription(skill.description ?? '');
  }

  function reset() {
    setEditing(null);
    setType('LISTENING');
    setName('');
    setDescription('');
    setErrorMessage('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setErrorMessage('');
    try {
      const payload = { type, name: name.trim(), description: description.trim() };
      if (!payload.name) {
        const message = 'Hãy nhập tên kỹ năng';
        setErrorMessage(message);
        toast.error(message);
        return;
      }
      setSaving(true);
      const saved = editing
        ? await unwrap<Skill>(api.put(`/skills/${editing.id}`, payload))
        : await unwrap<Skill>(api.post('/skills', payload));
      const exists = skills.some((item) => item.id === saved.id);
      setSkills(exists ? skills.map((item) => item.id === saved.id ? saved : item) : [saved, ...skills]);
      reset();
      toast.success(editing || exists ? 'Đã cập nhật kỹ năng' : 'Đã tạo kỹ năng');
    } catch (error: any) {
      const status = error?.response?.status;
      const apiMessage = error?.response?.data?.message;
      const message = status === 403
        ? 'Không lưu được: tài khoản hiện tại không có quyền ADMIN. Hãy đăng nhập bằng tài khoản quản trị.'
        : status === 400
          ? `Không lưu được: ${apiMessage ?? 'dữ liệu chưa hợp lệ'}`
          : `Không lưu được kỹ năng${status ? ` (HTTP ${status})` : ''}. Kiểm tra backend đang chạy và token đăng nhập.`;
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(skill: Skill) {
    if (!window.confirm(`Xóa kỹ năng ${skill.name}?`)) return;
    await api.delete(`/skills/${skill.id}`);
    setSkills(skills.filter((item) => item.id !== skill.id));
    toast.success('Đã xóa kỹ năng');
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <section className="card p-5">
        <h2 className="text-xl font-semibold">{editing ? 'Sửa kỹ năng' : 'Tạo kỹ năng'}</h2>
        <form onSubmit={save} className="mt-5 space-y-4">
          <select className="input" value={type} onChange={(e) => setType(e.target.value as SkillType)}>
            {skillTypes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên kỹ năng" required />
          <textarea className="input min-h-28 py-3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả" />
          {errorMessage && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage}</div>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={saving}><Plus size={18} />{saving ? 'Đang lưu...' : 'Lưu'}</button>
            {editing && <button type="button" className="btn-secondary" onClick={reset}>Hủy</button>}
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Kỹ năng</th><th className="p-4">Type</th><th className="p-4 text-right">Thao tác</th></tr></thead>
          <tbody>
            {skills.map((skill) => (
              <tr className="border-t border-slate-100" key={skill.id}>
                <td className="p-4"><p className="font-semibold">{skill.name}</p><p className="text-slate-500">{skill.description}</p></td>
                <td className="p-4"><span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">{skill.type}</span></td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button className="btn-secondary h-9 px-3" onClick={() => fill(skill)}><Pencil size={16} /></button>
                    <button className="btn-secondary h-9 px-3 text-red-600" onClick={() => remove(skill)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function TestsPanel({ skills, tests, setTests }: { skills: Skill[]; tests: Test[]; setTests: Dispatch<SetStateAction<Test[] | null>> }) {
  const [editing, setEditing] = useState<Test | null>(null);
  const [skillId, setSkillId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [status, setStatus] = useState<TestStatus>('PUBLISHED');
  const [mode, setMode] = useState<TestMode>('PRACTICE');

  function fill(test: Test) {
    setEditing(test);
    setSkillId(String(test.skillId));
    setTitle(test.title);
    setDescription(test.description ?? '');
    setDurationMinutes(test.durationMinutes);
    setStatus(test.status as TestStatus);
    setMode(test.mode ?? 'PRACTICE');
  }

  function reset() {
    setEditing(null);
    setSkillId('');
    setTitle('');
    setDescription('');
    setDurationMinutes(30);
    setStatus('PUBLISHED');
    setMode('PRACTICE');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const payload = { skillId: Number(skillId), title, description, durationMinutes, status, mode };
    const saved = editing
      ? await unwrap<Test>(api.put(`/tests/${editing.id}`, payload))
      : await unwrap<Test>(api.post('/tests', payload));
    setTests(editing ? tests.map((item) => item.id === saved.id ? saved : item) : [saved, ...tests]);
    reset();
    toast.success(editing ? 'Đã cập nhật bài luyện' : 'Đã tạo bài luyện');
  }

  async function remove(test: Test) {
    if (!window.confirm(`Xóa bài ${test.title}?`)) return;
    await api.delete(`/tests/${test.id}`);
    setTests(tests.filter((item) => item.id !== test.id));
    toast.success('Đã xóa bài luyện');
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <section className="card p-5">
        <h2 className="text-xl font-semibold">{editing ? 'Sửa bài luyện' : 'Tạo bài luyện'}</h2>
        <form onSubmit={save} className="mt-5 space-y-4">
          <select className="input" value={skillId} onChange={(e) => setSkillId(e.target.value)} required>
            <option value="">Chọn kỹ năng</option>
            {skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
          </select>
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value as TestMode)}>
            {testModes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên bài luyện" required />
          <textarea className="input min-h-24 py-3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả" />
          <input className="input" type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TestStatus)}>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <div className="flex gap-2">
            <button className="btn-primary flex-1"><Plus size={18} />Lưu</button>
            {editing && <button type="button" className="btn-secondary" onClick={reset}>Hủy</button>}
          </div>
        </form>
      </section>

      <section className="space-y-3">
        {tests.map((test) => (
          <div className="card p-4" key={test.id}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-semibold uppercase text-brand-600">{test.skillName} | {test.status} | {(test.mode ?? 'PRACTICE') === 'EXAM' ? 'BỘ ĐỀ' : 'LUYỆN TẬP'}</p>
                <h3 className="mt-1 font-semibold">{test.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{test.description}</p>
                <p className="mt-2 text-xs text-slate-500">{test.durationMinutes} phút</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary h-9 px-3" onClick={() => fill(test)}><Pencil size={16} /></button>
                <button className="btn-secondary h-9 px-3 text-red-600" onClick={() => remove(test)}><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function QuestionsPanel({ tests, selectedTestId, setSelectedTestId, questions, setQuestions, loading }: {
  tests: Test[];
  selectedTestId: string;
  setSelectedTestId: (value: string) => void;
  questions: Question[];
  setQuestions: Dispatch<SetStateAction<Question[] | null>>;
  loading: boolean;
}) {
  const selectedTest = useMemo(() => tests.find((test) => String(test.id) === selectedTestId), [tests, selectedTestId]);
  const [editing, setEditing] = useState<Question | null>(null);
  const [type, setType] = useState<QuestionType>('SINGLE_CHOICE');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [points, setPoints] = useState(5);
  const [sortOrder, setSortOrder] = useState(1);
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [answer3, setAnswer3] = useState('');
  const [answer4, setAnswer4] = useState('');
  const [correctIndex, setCorrectIndex] = useState(1);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const selectedTemplate = parseTemplateContent(content);
  const selectedTemplateName = selectedTemplate ? getTemplateName(content) : '';
  const allSelected = questions.length > 0 && selectedQuestionIds.length === questions.length;

  function fill(question: Question) {
    setEditing(question);
    setType(question.type);
    setContent(question.content);
    setTopic(question.topic ?? '');
    setAudioUrl(question.audioUrl ?? '');
    setScriptText(question.scriptText ?? '');
    setExplanation(question.explanation ?? '');
    setPoints(question.points);
    setSortOrder(question.sortOrder);
    setAnswer1(question.answers[0]?.content ?? '');
    setAnswer2(question.answers[1]?.content ?? '');
    setAnswer3(question.answers[2]?.content ?? '');
    setAnswer4(question.answers[3]?.content ?? '');
    setCorrectIndex(Math.max(1, question.answers.findIndex((answer) => answer.correct) + 1));
  }

  function reset() {
    setEditing(null);
    setType('SINGLE_CHOICE');
    setContent('');
    setTopic('');
    setAudioUrl('');
    setScriptText('');
    setExplanation('');
    setPoints(5);
    setSortOrder(1);
    setAnswer1('');
    setAnswer2('');
    setAnswer3('');
    setAnswer4('');
    setCorrectIndex(1);
  }

  function setTemplateContent(template: string, data: Record<string, unknown>) {
    setContent(JSON.stringify({ template, ...data }, null, 2));
  }

  function applyTemplate(template: 'listening_mc' | 'listening_opinion' | 'listening_people' | 'reading_gap' | 'reading_order' | 'reading_forum' | 'speaking_picture' | 'speaking_sample' | 'writing_short' | 'writing_chat') {
    reset();
    setType('TEXT');
    setPoints(10);
    if (template === 'listening_mc') {
      setTemplateContent('LISTENING_AUDIO_MC', {
        total: 1,
        topic: '',
        playsRemaining: '',
        audioUrl: '',
        groups: [{ prompt: '', options: [] }]
      });
    }
    if (template === 'listening_opinion') {
      setTemplateContent('LISTENING_OPINION_MATCH', {
        total: 1,
        topic: '',
        instructions: '',
        audioUrl: '',
        options: [],
        statements: []
      });
    }
    if (template === 'listening_people') {
      setTemplateContent('LISTENING_PEOPLE_MATCH', {
        total: 1,
        topic: '',
        instructions: '',
        audioUrl: '',
        options: [],
        rows: []
      });
    }
    if (template === 'reading_gap') {
      setTemplateContent('READING_GAP_FILL', {
        total: 1,
        topic: '',
        instructions: '',
        before: '',
        after: '',
        options: [],
        rows: []
      });
    }
    if (template === 'reading_order') {
      setTemplateContent('READING_SENTENCE_ORDER', {
        total: 1,
        topic: '',
        instructions: '',
        sentences: []
      });
    }
    if (template === 'reading_forum') {
      setTemplateContent('READING_FORUM_MATCH', {
        total: 1,
        topic: '',
        leftTitle: '',
        opinions: [],
        questions: [],
        options: []
      });
    }
    if (template === 'speaking_picture') {
      setTemplateContent('SPEAKING_PICTURE', {
        total: 1,
        title: '',
        imageUrl: '',
        tabs: [],
        prompt: '',
        sample: ''
      });
    }
    if (template === 'speaking_sample') {
      setTemplateContent('SPEAKING_SAMPLE_TABLE', {
        total: 1,
        title: '',
        question: '',
        sample: '',
        explanation: []
      });
    }
    if (template === 'writing_short') {
      setTemplateContent('WRITING_TEXTAREA', { total: 1, title: '', instructions: '', prompts: [] });
    }
    if (template === 'writing_chat') {
      setTemplateContent('WRITING_TEXTAREA', { total: 1, title: '', instructions: '', prompts: [] });
    }
    toast.success('Đã chọn template. Hãy nhập nội dung câu hỏi.');
  }
  function downloadCsvTemplate() {
    const csv = [
      'type,topic,audio_url,script_text,content,explanation,points,sort_order,answer1,answer2,answer3,answer4,answer5,answer6,correct_index_person1,correct_index_person2,correct_index_person3,correct_index_person4',
      '"MATCHING_4_PEOPLE","Protect the environment","https://example.com/audio/listening-part2.mp3","Person A transcript...\n\nPerson B transcript...\n\nPerson C transcript...\n\nPerson D transcript...","Four people are discussing their views on Protect the environment. Complete the sentences. Use each answer only once. You will not need two of the answers.","Person 1: Does not use commercial cleaning products | Person 2: Give away used items | Person 3: Buy environmentally friendly products | Person 4: Reuse containers for storing food",5,1,"Does not use commercial cleaning products","Give away used items","Buy environmentally friendly products","Reuse containers for storing food","Plant trees in the backyard","Use solar panels for electricity",1,2,3,4'
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aptis-question-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(file: File | undefined) {
    if (!selectedTestId) {
      toast.error('Hãy chọn bài luyện trước khi import CSV');
      return;
    }
    if (!file) {
      toast.error('Hãy chọn file CSV');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('File upload phải là file .csv');
      return;
    }

    try {
      let nextQuestions = questions;
      if (questions.length > 0) {
        const replaceExisting = window.confirm(`Bài này đang có ${questions.length} câu hỏi. Bấm OK để xóa câu cũ rồi import lại, hoặc Cancel để import thêm vào cuối.`);
        if (replaceExisting) {
          await Promise.all(questions.map((question) => api.delete(`/questions/${question.id}`)));
          nextQuestions = [];
          setQuestions([]);
          setSelectedQuestionIds([]);
        }
      }
      const form = new FormData();
      form.append('file', file);
      const imported = await unwrap<Question[]>(api.post(`/questions/import-csv?testId=${selectedTestId}`, form));
      setQuestions([...nextQuestions, ...imported]);
      setSelectedQuestionIds([]);
      toast.success(`Đã import ${imported.length} câu hỏi`);
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'Không upload được câu hỏi từ CSV'));
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selectedTestId) {
      toast.error('Hãy chọn bài luyện trước');
      return;
    }
    const rawAnswers = [answer1, answer2, answer3, answer4].filter(Boolean);
    const payload = {
      testId: Number(selectedTestId),
      type,
      content,
      topic,
      audioUrl,
      scriptText,
      explanation,
      points,
      sortOrder,
      answers: type === 'TEXT' || type === 'SPEAKING'
        ? []
        : rawAnswers.map((answer, index) => ({ content: answer, correct: index + 1 === correctIndex, sortOrder: index + 1 }))
    };
    try {
      const saved = editing
        ? await unwrap<Question>(api.put(`/questions/${editing.id}`, payload))
        : await unwrap<Question>(api.post('/questions', payload));
      setQuestions(editing ? questions.map((item) => item.id === saved.id ? saved : item) : [...questions, saved]);
      reset();
      toast.success(editing ? 'Đã cập nhật câu hỏi' : 'Đã tạo câu hỏi');
    } catch (error: any) {
      toast.error(apiErrorMessage(error, editing ? 'Không cập nhật được câu hỏi' : 'Không tạo được câu hỏi'));
    }
  }

  async function remove(question: Question) {
    if (!window.confirm('Xóa câu hỏi này?')) return;
    try {
      await api.delete(`/questions/${question.id}`);
      setQuestions(questions.filter((item) => item.id !== question.id));
      setSelectedQuestionIds(selectedQuestionIds.filter((id) => id !== question.id));
      toast.success('Đã xóa câu hỏi');
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'Không xóa được câu hỏi'));
    }
  }

  function toggleQuestion(questionId: number) {
    setSelectedQuestionIds((ids) => ids.includes(questionId)
      ? ids.filter((id) => id !== questionId)
      : [...ids, questionId]);
  }

  function toggleAllQuestions() {
    setSelectedQuestionIds(allSelected ? [] : questions.map((question) => question.id));
  }

  async function removeSelectedQuestions() {
    if (!selectedQuestionIds.length) {
      toast.error('Hãy chọn câu hỏi cần xóa');
      return;
    }
    if (!window.confirm(`Xóa ${selectedQuestionIds.length} câu hỏi đã chọn?`)) return;

    try {
      await Promise.all(selectedQuestionIds.map((questionId) => api.delete(`/questions/${questionId}`)));
      setQuestions(questions.filter((question) => !selectedQuestionIds.includes(question.id)));
      setSelectedQuestionIds([]);
      toast.success(`Đã xóa ${selectedQuestionIds.length} câu hỏi`);
    } catch (error: any) {
      toast.error(apiErrorMessage(error, 'Không xóa được các câu hỏi đã chọn'));
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[640px_1fr]">
      <section className="card p-5">
        <h2 className="text-xl font-semibold">{editing ? 'Sửa câu hỏi' : 'Tạo câu hỏi'}</h2>
        <div className="mt-5 space-y-4">
          <select className="input" value={selectedTestId} onChange={(e) => { setSelectedTestId(e.target.value); setSelectedQuestionIds([]); reset(); }} required>
            <option value="">Chọn bài luyện</option>
            {tests.map((test) => <option key={test.id} value={test.id}>{test.title}</option>)}
          </select>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700"><Wand2 size={17} />Tạo nhanh bằng template Aptis</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <button type="button" className="btn-secondary h-12 px-4 text-sm" onClick={() => applyTemplate('listening_mc')}>Listening radio</button>
              <button type="button" className="btn-secondary h-12 px-4 text-sm" onClick={() => applyTemplate('listening_opinion')}>Listening dropdown</button>
              <button type="button" className="btn-secondary h-12 px-4 text-sm" onClick={() => applyTemplate('listening_people')}>Listening person</button>
              <button type="button" className="btn-secondary h-12 px-4 text-sm" onClick={() => applyTemplate('reading_gap')}>Reading gap</button>
              <button type="button" className="btn-secondary h-12 px-4 text-sm" onClick={() => applyTemplate('reading_order')}>Reading order</button>
              <button type="button" className="btn-secondary h-12 px-4 text-sm" onClick={() => applyTemplate('reading_forum')}>Reading forum</button>
              <button type="button" className="btn-secondary h-12 px-4 text-sm" onClick={() => applyTemplate('speaking_picture')}>Speaking picture</button>
              <button type="button" className="btn-secondary h-12 px-4 text-sm" onClick={() => applyTemplate('speaking_sample')}>Speaking mẫu</button>
              <button type="button" className="btn-secondary h-12 px-4 text-sm" onClick={() => applyTemplate('writing_short')}>Writing form</button>
              <button type="button" className="btn-secondary h-12 px-4 text-sm" onClick={() => applyTemplate('writing_chat')}>Writing chat</button>
            </div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <div className="mb-3 text-sm font-bold text-slate-700">Tạo hàng loạt bằng CSV</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={downloadCsvTemplate}><Download size={15} />Tải CSV mẫu</button>
              <label className="btn-primary h-9 cursor-pointer px-3 text-xs">
                <UploadCloud size={15} />Upload CSV
                <input className="hidden" type="file" accept=".csv,text/csv" onChange={(e) => importCsv(e.target.files?.[0])} />
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500">Listening Part 2 theo template dùng type MATCHING_4_PEOPLE, answer1-6 và correct_index_person1-4. Nếu bài đã có câu hỏi, upload sẽ hỏi xóa câu cũ trước khi import.</p>
          </div>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic / Chủ đề" />
              <input className="input" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="Link audio nghe" />
            </div>
            <textarea className="input min-h-24 py-3" value={scriptText} onChange={(e) => setScriptText(e.target.value)} placeholder="Script nghe / transcript audio" />
            {selectedTemplate ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-brand-100 bg-blue-50 p-3">
                  <p className="text-sm font-bold text-slate-800">Đã chọn template: {selectedTemplateName}</p>
                  <p className="mt-1 text-xs text-slate-500">Nhập các mục bên dưới, xem trước câu hỏi, rồi bấm Lưu câu hỏi.</p>
                </div>
                <TemplateEditor data={selectedTemplate} onChange={(next) => setContent(JSON.stringify(next, null, 2))} />
                <TemplatePreview data={selectedTemplate} />
                <input type="hidden" value={content} required />
              </div>
            ) : (
              <textarea className="input min-h-28 py-3" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nội dung câu hỏi" required />
            )}
            <textarea className="input min-h-20 py-3" value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Giải thích / gợi ý" />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" type="number" min={1} value={points} onChange={(e) => setPoints(Number(e.target.value))} placeholder="Điểm" />
              <input className="input" type="number" min={1} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} placeholder="Thứ tự" />
            </div>
            {type !== 'TEXT' && type !== 'SPEAKING' && (
              <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                {[answer1, answer2, answer3, answer4].map((value, index) => (
                  <div className="flex gap-2" key={index}>
                    <button type="button" onClick={() => setCorrectIndex(index + 1)} className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border ${correctIndex === index + 1 ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-400'}`}><Check size={16} /></button>
                    <input className="input" value={value} onChange={(e) => [setAnswer1, setAnswer2, setAnswer3, setAnswer4][index](e.target.value)} placeholder={`Đáp án ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={!selectedTestId}><Plus size={18} />Lưu câu hỏi</button>
              {editing && <button type="button" className="btn-secondary" onClick={reset}>Hủy</button>}
            </div>
          </form>
        </div>
      </section>

      <section className="space-y-3">
        <div className="card p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-slate-500">Bài đang chọn</p>
              <h3 className="font-semibold">{selectedTest?.title ?? 'Chưa chọn bài luyện'}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary h-9 px-3 text-xs" onClick={toggleAllQuestions} disabled={!questions.length}>
                {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
              <button type="button" className="btn-secondary h-9 px-3 text-xs text-red-600 disabled:opacity-50" onClick={removeSelectedQuestions} disabled={!selectedQuestionIds.length}>
                <Trash2 size={15} />Xóa đã chọn ({selectedQuestionIds.length})
              </button>
            </div>
          </div>
        </div>
        {loading && <div className="card p-5 text-sm text-slate-500">Đang tải câu hỏi...</div>}
        {questions.map((question) => {
          const template = parseTemplateContent(question.content);
          const templateName = template ? getTemplateName(question.content) : '';
          return (
            <div className={`card p-4 ${selectedQuestionIds.includes(question.id) ? 'border-brand-300 ring-2 ring-brand-100' : ''}`} key={question.id}>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="flex gap-3">
                  <input
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                    type="checkbox"
                    checked={selectedQuestionIds.includes(question.id)}
                    onChange={() => toggleQuestion(question.id)}
                  />
                  <div>
                    <p className="text-xs font-semibold text-brand-600">
                      #{question.sortOrder} | {templateName ? `TEMPLATE: ${templateName}` : question.type} | {question.points} điểm
                    </p>
                    {question.topic && <p className="mt-1 text-xs font-bold uppercase text-slate-500">{formatTopicLabel(question.topic)}</p>}
                    <h3 className="mt-1 font-semibold">{getQuestionPreview(question, templateName)}</h3>
                    {template?.instructions && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{template.instructions}</p>}
                    {(question.audioUrl || template?.audioUrl) && <p className="mt-1 truncate text-xs text-blue-600">Audio: {question.audioUrl || template?.audioUrl}</p>}
                    {(question.scriptText || template?.scriptText) && <p className="mt-1 line-clamp-2 text-xs text-slate-500">Script: {question.scriptText || template?.scriptText}</p>}
                    {!template && (
                      <div className="mt-3 space-y-2">
                        {question.answers.map((answer) => (
                          <p className={`rounded-lg border px-3 py-2 text-sm ${answer.correct ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600'}`} key={answer.id}>{answer.content}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary h-9 px-3" onClick={() => fill(question)}><Pencil size={16} /></button>
                  <button type="button" className="btn-secondary h-9 px-3 text-red-600" onClick={() => remove(question)}><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {selectedTestId && !loading && questions.length === 0 && <div className="card p-5 text-sm text-slate-500">Bài này chưa có câu hỏi.</div>}
      </section>
    </div>
  );
}

function getTemplateName(content: string) {
  try {
    const parsed = JSON.parse(content);
    const names: Record<string, string> = {
      LISTENING_AUDIO_MC: 'Listening radio',
      LISTENING_OPINION_MATCH: 'Listening dropdown',
      LISTENING_PEOPLE_MATCH: 'Listening person',
      READING_GAP_FILL: 'Reading gap',
      READING_SENTENCE_ORDER: 'Reading order',
      READING_FORUM_MATCH: 'Reading forum',
      READING_HEADING_MATCH: 'Reading heading match',
      SPEAKING_PICTURE: 'Speaking picture',
      SPEAKING_PART1: 'Speaking Part 1',
      SPEAKING_PART2: 'Speaking Part 2',
      SPEAKING_PART3: 'Speaking Part 3',
      SPEAKING_PART4: 'Speaking Part 4',
      SPEAKING_SAMPLE_TABLE: 'Speaking mẫu',
      WRITING_CLUB_COLLECTION: 'Writing practice clubs',
      WRITING_TEXTAREA: 'Writing'
    };
    return parsed?.template ? names[parsed.template] ?? parsed.template : '';
  } catch {
    return '';
  }
}

function formatTopicLabel(topic: string) {
  const cleaned = topic.replace(/^topic:\s*/i, '').trim();
  return `Topic: ${cleaned}`;
}

function getQuestionPreview(question: Question, templateName: string) {
  const template = parseTemplateContent(question.content);
  if (!template) return question.content;

  const title = template.topic ?? template.title ?? question.topic ?? '';
  return title ? `${templateName}: ${title}` : templateName;
}

type TemplateData = Record<string, any> & { template: string };

function parseTemplateContent(content: string): TemplateData | null {
  try {
    const parsed = JSON.parse(content);
    return parsed?.template ? parsed : null;
  } catch {
    return null;
  }
}

function getReadingGapParts(row: any) {
  if (typeof row === 'string') {
    const [start = '', end = ''] = row.split('___');
    return [start, end];
  }
  return [row?.questionStart ?? row?.start ?? row?.before ?? '', row?.questionEnd ?? row?.end ?? row?.after ?? ''];
}

function getReadingGapOptions(data: TemplateData, row: any): string[] {
  if (Array.isArray(row?.answerOptions)) return row.answerOptions;
  if (Array.isArray(row?.options)) return row.options;
  return data.options ?? [];
}

function TemplateEditor({ data, onChange }: { data: TemplateData; onChange: (data: TemplateData) => void }) {
  function patch(key: string, value: unknown) {
    onChange({ ...data, [key]: value });
  }

  function list(value: unknown) {
    return Array.isArray(value) ? value.join('\n') : '';
  }

  function listValue(value: string) {
    return value.split('\n').map((item) => item.trim()).filter(Boolean);
  }

  function commonFields(extra?: ReactNode) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid grid-cols-2 gap-3">
          <AdminInput label="Tổng số câu" value={String(data.total ?? '')} onChange={(value) => patch('total', Number(value) || 1)} />
          <AdminInput label="Topic / Title" value={data.topic ?? data.title ?? ''} onChange={(value) => data.title !== undefined ? patch('title', value) : patch('topic', value)} />
        </div>
        {extra}
      </div>
    );
  }

  if (data.template === 'LISTENING_AUDIO_MC') {
    const prompts = (data.groups ?? []).map((group: any) => group.prompt).join('\n');
    const options = (data.groups ?? []).map((group: any) => (group.options ?? []).join(' | ')).join('\n');
    function updateGroups(nextPrompts = prompts, nextOptions = options) {
      const promptRows = listValue(nextPrompts);
      const optionRows = nextOptions.split('\n');
      patch('groups', promptRows.map((prompt, index) => ({ prompt, options: (optionRows[index] ?? '').split('|').map((item: string) => item.trim()).filter(Boolean) })));
    }
    return commonFields(
      <>
        <AdminInput label="Số lần nghe" value={data.playsRemaining ?? ''} onChange={(value) => patch('playsRemaining', value)} />
        <AdminInput label="Link audio nghe" value={data.audioUrl ?? ''} onChange={(value) => patch('audioUrl', value)} />
        <AdminTextarea label="Script / transcript nghe" value={data.scriptText ?? data.script ?? ''} onChange={(value) => patch('scriptText', value)} />
        <AdminTextarea label="Câu hỏi con - mỗi dòng 1 câu" value={prompts} onChange={(value) => updateGroups(value, options)} />
        <AdminTextarea label="Đáp án - mỗi dòng ứng với 1 câu, ngăn cách bằng dấu |" value={options} onChange={(value) => updateGroups(prompts, value)} />
      </>
    );
  }

  if (data.template === 'LISTENING_OPINION_MATCH' || data.template === 'LISTENING_PEOPLE_MATCH') {
    const rowKey = data.template === 'LISTENING_PEOPLE_MATCH' ? 'rows' : 'statements';
    return commonFields(
      <>
        <AdminInput label="Link audio nghe" value={data.audioUrl ?? ''} onChange={(value) => patch('audioUrl', value)} />
        <AdminTextarea label="Script / transcript nghe" value={data.scriptText ?? data.script ?? ''} onChange={(value) => patch('scriptText', value)} />
        <AdminTextarea label="Hướng dẫn" value={data.instructions ?? ''} onChange={(value) => patch('instructions', value)} />
        <AdminTextarea label={data.template === 'LISTENING_PEOPLE_MATCH' ? 'Nhãn dòng: Person 1...' : 'Statements - mỗi dòng 1 ý'} value={list(data[rowKey])} onChange={(value) => patch(rowKey, listValue(value))} />
        <AdminTextarea label="Lựa chọn dropdown - mỗi dòng 1 đáp án" value={list(data.options)} onChange={(value) => patch('options', listValue(value))} />
      </>
    );
  }

  if (data.template === 'READING_GAP_FILL') {
    return commonFields(
      <>
        <AdminTextarea label="Hướng dẫn" value={data.instructions ?? ''} onChange={(value) => patch('instructions', value)} />
        <AdminTextarea label="Nội dung trước câu hỏi" value={data.before ?? ''} onChange={(value) => patch('before', value)} />
        <AdminTextarea label="Dòng câu hỏi gap-fill, dùng ___ làm chỗ trống" value={list(data.rows)} onChange={(value) => patch('rows', listValue(value))} />
        <AdminTextarea label="Lựa chọn dropdown - mỗi dòng 1 đáp án" value={list(data.options)} onChange={(value) => patch('options', listValue(value))} />
        <AdminTextarea label="Nội dung sau câu hỏi" value={data.after ?? ''} onChange={(value) => patch('after', value)} />
      </>
    );
  }

  if (data.template === 'READING_SENTENCE_ORDER') {
    return commonFields(
      <>
        <AdminTextarea label="Hướng dẫn" value={data.instructions ?? ''} onChange={(value) => patch('instructions', value)} />
        <AdminTextarea label="Các câu sắp xếp - mỗi dòng 1 câu" value={list(data.sentences)} onChange={(value) => patch('sentences', listValue(value))} />
      </>
    );
  }

  if (data.template === 'READING_FORUM_MATCH') {
    return commonFields(
      <>
        <AdminTextarea label="Mô tả cột trái" value={data.leftTitle ?? ''} onChange={(value) => patch('leftTitle', value)} />
        <AdminTextarea label="Opinions A-D - mỗi dòng 1 ý" value={list(data.opinions)} onChange={(value) => patch('opinions', listValue(value))} />
        <AdminTextarea label="Câu hỏi cột phải - mỗi dòng 1 câu" value={list(data.questions)} onChange={(value) => patch('questions', listValue(value))} />
        <AdminTextarea label="Lựa chọn dropdown" value={list(data.options)} onChange={(value) => patch('options', listValue(value))} />
      </>
    );
  }

  if (data.template === 'READING_HEADING_MATCH') {
    return commonFields(
      <>
        <AdminTextarea label="Đoạn văn - mỗi dòng 1 đoạn" value={list(data.paragraphs)} onChange={(value) => patch('paragraphs', listValue(value))} />
        <AdminTextarea label="Heading dropdown - mỗi dòng 1 lựa chọn" value={list(data.options)} onChange={(value) => patch('options', listValue(value))} />
        <AdminTextarea label="Đáp án đúng - mỗi dòng ứng với 1 đoạn" value={list(data.correctAnswers)} onChange={(value) => patch('correctAnswers', listValue(value))} />
        <AdminTextarea label="Mẹo làm bài" value={data.tips ?? ''} onChange={(value) => patch('tips', value)} />
      </>
    );
  }

  if (data.template === 'SPEAKING_PICTURE') {
    return commonFields(
      <>
        <AdminInput label="Image URL" value={data.imageUrl ?? ''} onChange={(value) => patch('imageUrl', value)} />
        <AdminTextarea label="Tabs - mỗi dòng 1 tab" value={list(data.tabs)} onChange={(value) => patch('tabs', listValue(value))} />
        <AdminTextarea label="Prompt" value={data.prompt ?? ''} onChange={(value) => patch('prompt', value)} />
        <AdminTextarea label="Sample answer" value={data.sample ?? ''} onChange={(value) => patch('sample', value)} />
      </>
    );
  }

  if (data.template === 'SPEAKING_SAMPLE_TABLE') {
    return commonFields(
      <>
        <AdminTextarea label="Câu hỏi" value={data.question ?? ''} onChange={(value) => patch('question', value)} />
        <AdminTextarea label="Đáp án mẫu" value={data.sample ?? ''} onChange={(value) => patch('sample', value)} />
        <AdminTextarea label="Giải thích - mỗi dòng 1 ý" value={list(data.explanation)} onChange={(value) => patch('explanation', listValue(value))} />
      </>
    );
  }

  if (data.template === 'WRITING_TEXTAREA') {
    return commonFields(
      <>
        <AdminTextarea label="Hướng dẫn" value={data.instructions ?? ''} onChange={(value) => patch('instructions', value)} />
        <AdminTextarea label="Prompts - mỗi dòng 1 ô trả lời" value={list(data.prompts)} onChange={(value) => patch('prompts', listValue(value))} />
      </>
    );
  }

  if (data.template === 'WRITING_CLUB_COLLECTION') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
        Template Writing Practice gồm {data.clubs?.length ?? 0} club. Bạn nên sửa dữ liệu bằng file CSV nguồn rồi upload lại để tránh lệch cấu trúc 4 phần.
      </div>
    );
  }

  return null;
}

function AdminInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function AdminTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
      <textarea className="input min-h-24 py-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TemplatePreview({ data }: { data: TemplateData }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-3 text-sm font-bold text-slate-700">Xem trước câu hỏi</div>
      <div className="max-h-[620px] overflow-auto rounded-lg border border-slate-100 bg-white">
        <AdminTemplateRenderer data={data} />
      </div>
    </div>
  );
}

function AdminTemplateRenderer({ data }: { data: TemplateData }) {
  if (data.template === 'LISTENING_AUDIO_MC') {
    return (
      <PreviewPaper>
        <PreviewQuestionCounter total={data.total} />
        <PreviewAudioBar text={data.playsRemaining} audioUrl={data.audioUrl} />
        <div className="rounded bg-[#eeeeee] p-5">
          <h2 className="mb-5 text-lg font-extrabold">Topic: {data.topic}</h2>
          <div className="space-y-5">
            {(data.groups ?? []).map((group: any, groupIndex: number) => (
              <div key={groupIndex}>
                <p className="mb-3">{group.prompt}</p>
                {(group.options ?? []).map((option: string) => <label className="mb-2 flex items-center gap-2 text-sm" key={option}><input type="radio" readOnly />{option}</label>)}
              </div>
            ))}
          </div>
        </div>
        <PreviewButton />
      </PreviewPaper>
    );
  }

  if (data.template === 'LISTENING_OPINION_MATCH' || data.template === 'LISTENING_PEOPLE_MATCH') {
    const rows = data.template === 'LISTENING_PEOPLE_MATCH' ? data.rows : data.statements;
    return (
      <PreviewPaper>
        <PreviewQuestionCounter total={data.total} />
        <PreviewAudioBar text={data.playsRemaining ?? '2 of 2 plays remaining'} audioUrl={data.audioUrl} />
        <div className="rounded bg-[#eeeeee] p-5">
          <h2 className="mb-4 text-lg font-extrabold">Topic: {data.topic}</h2>
          <p className="mb-5 text-sm">{data.instructions}</p>
          <div className="space-y-3">
            {(rows ?? []).map((row: string, index: number) => <div className="grid gap-2 md:grid-cols-[1fr_190px]" key={row}><span className="text-sm">{data.template === 'LISTENING_PEOPLE_MATCH' ? row : `${index + 1}. ${row}`}</span><PreviewSelect options={data.options ?? []} /></div>)}
          </div>
        </div>
        <PreviewButton />
      </PreviewPaper>
    );
  }

  if (data.template === 'READING_GAP_FILL') {
    return (
      <PreviewPaper>
        <h1 className="mb-4 text-2xl font-extrabold">Reading Question <PreviewNumber /> of {data.total}</h1>
        <p className="mb-4 text-sm">{data.instructions}</p>
        <p className="mb-4 whitespace-pre-line text-sm">{data.before}</p>
        <div className="space-y-3">
          {(data.rows ?? []).map((row: any, index: number) => {
            const parts = getReadingGapParts(row);
            return <div className="rounded border border-slate-300 bg-white p-3 text-sm" key={`${parts[0]}-${index}`}>{parts[0]}<PreviewSelect options={getReadingGapOptions(data, row)} compact />{parts[1]}</div>;
          })}
        </div>
        <p className="mt-5 whitespace-pre-line text-sm">{data.after}</p>
      </PreviewPaper>
    );
  }

  if (data.template === 'READING_SENTENCE_ORDER') {
    return (
      <PreviewPaper>
        <h1 className="mb-3 text-xl font-extrabold">Reading Question <PreviewNumber /> of {data.total}</h1>
        <h2 className="mb-4 text-xl font-bold text-red-600">Topic: {data.topic}</h2>
        <p className="mb-4 text-sm font-semibold">{data.instructions}</p>
        <div className="space-y-2">{(data.sentences ?? []).map((sentence: string) => <div className="rounded border border-slate-300 p-3 text-sm" key={sentence}>{sentence}</div>)}</div>
      </PreviewPaper>
    );
  }

  if (data.template === 'READING_FORUM_MATCH') {
    return (
      <PreviewPaper>
        <h1 className="mb-3 text-2xl font-extrabold">Reading Question 4 (1/{data.total})</h1>
        <h2 className="mb-4 text-xl font-bold text-red-600">Topic: {data.topic}</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <div><p className="mb-3 text-sm font-bold">{data.leftTitle}</p>{(data.opinions ?? []).map((item: string) => <p className="mb-3 text-sm" key={item}>{item}</p>)}</div>
          <div className="space-y-3">{(data.questions ?? []).map((item: string) => <div className="grid grid-cols-[1fr_90px] gap-2 text-sm" key={item}><span>{item}</span><PreviewSelect options={data.options ?? []} compact /></div>)}</div>
        </div>
      </PreviewPaper>
    );
  }

  if (data.template === 'READING_HEADING_MATCH') {
    const options = (data.options ?? []).filter(Boolean);
    return (
      <PreviewPaper>
        <h1 className="mb-3 text-2xl font-extrabold">Reading question 5 (1/{data.total})</h1>
        <h2 className="mb-4 text-xl font-bold text-red-600">TOPIC: {data.topic}</h2>
        <div className="mb-5 flex gap-2">
          <button type="button" className="rounded bg-slate-600 px-3 py-2 text-sm font-semibold text-white">Xem nội dung</button>
          <button type="button" className="rounded bg-slate-600 px-3 py-2 text-sm font-semibold text-white">Xem mẹo</button>
        </div>
        <div className="space-y-3">
          {(data.paragraphs ?? []).map((_paragraph: string, index: number) => (
            <div className="grid grid-cols-[28px_1fr] items-center gap-2" key={index}>
              <span className="text-sm">{index + 1}.</span>
              <PreviewSelect options={options} />
            </div>
          ))}
        </div>
      </PreviewPaper>
    );
  }

  if (data.template === 'SPEAKING_PICTURE') {
    return (
      <PreviewPaper>
        <div className="mx-auto max-w-[620px] rounded-xl bg-white shadow-soft">
          <div className="border-b p-4 font-bold">Speak question <PreviewNumber /> / {data.total}</div>
          <div className="p-4">
            <img className="mx-auto h-56 w-full max-w-[420px] rounded object-cover" src={data.imageUrl} alt="Speaking prompt" />
            <div className="mt-4 grid grid-cols-3 gap-2">{(data.tabs ?? []).map((tab: string) => <button type="button" className="rounded border border-slate-200 py-2 text-xs" key={tab}>{tab}</button>)}</div>
            <div className="mt-4 flex items-center justify-between"><h2 className="font-bold">{data.prompt}</h2><button type="button" className="rounded-full bg-red-500 px-4 py-2 text-xs font-bold text-white"><Mic className="mr-1 inline" size={14} />Record</button></div>
            <div className="mt-4 rounded border bg-slate-50 p-4 text-sm italic text-slate-400">Your speech will appear here...</div>
            <button type="button" className="mt-4 w-full rounded border border-brand-600 py-2 text-sm text-brand-600"><MessageCircle className="mr-1 inline" size={14} />Sample Answer</button>
          </div>
        </div>
      </PreviewPaper>
    );
  }

  if (data.template === 'SPEAKING_SAMPLE_TABLE') {
    return (
      <PreviewPaper>
        <h1 className="mb-4 text-xl font-extrabold">{data.title}</h1>
        <div className="border"><div className="grid grid-cols-[44px_1fr_120px] bg-slate-50 font-bold"><div className="border-r p-2">#</div><div className="border-r p-2">Câu hỏi</div><div className="p-2">Đáp án mẫu</div></div><div className="grid grid-cols-[44px_1fr_120px] border-t"><div className="border-r p-2">1</div><div className="border-r p-2">{data.question}</div><div className="p-2"><button type="button" className="rounded bg-brand-600 px-3 py-2 text-xs text-white">Xem đáp án</button></div></div><div className="border-l-4 border-brand-600 bg-blue-50 p-4 text-sm">{data.sample}</div></div>
      </PreviewPaper>
    );
  }

  if (data.template === 'WRITING_TEXTAREA') {
    return (
      <PreviewPaper>
        <h1 className="mb-4 text-2xl font-extrabold">{data.title}</h1>
        <p className="mb-5 text-sm font-semibold">{data.instructions}</p>
        {(data.prompts ?? []).map((prompt: string) => <div className="mb-5" key={prompt}><p className="mb-2 text-sm">{prompt}</p><textarea className="min-h-20 w-full rounded border border-slate-300" readOnly /><p className="mt-1 text-right text-sm text-slate-500">Word Count: 0</p></div>)}
        <button type="button" className="rounded bg-cyan-500 px-4 py-2 text-sm text-white">Xem đáp án</button>
      </PreviewPaper>
    );
  }

  if (data.template === 'WRITING_CLUB_COLLECTION') {
    const palette = ['bg-amber-400 text-slate-950', 'bg-emerald-700 text-white', 'bg-red-500 text-white', 'bg-sky-500 text-slate-950', 'bg-brand-600 text-white'];
    return (
      <PreviewPaper>
        <h1 className="mb-6 text-center text-3xl font-normal">{data.title ?? 'Writing Practice'}</h1>
        <div className="grid gap-3 md:grid-cols-3">
          {(data.clubs ?? []).slice(0, 12).map((club: any, index: number) => (
            <button type="button" className={`h-10 rounded px-3 text-sm font-semibold ${palette[index % palette.length]}`} key={`${club.clubName}-${index}`}>{club.clubName}</button>
          ))}
        </div>
        {(data.clubs?.length ?? 0) > 12 && <p className="mt-4 text-center text-sm text-slate-500">... và {(data.clubs.length - 12)} club khác</p>}
      </PreviewPaper>
    );
  }

  return null;
}

function PreviewPaper({ children }: { children: ReactNode }) {
  return <div className="min-w-[680px] bg-white p-5 text-slate-950">{children}</div>;
}

function PreviewQuestionCounter({ total }: { total?: number }) {
  return <h1 className="mb-4 text-xl font-extrabold">Question <span className="mx-2 inline-flex min-w-10 justify-center border-b border-red-500">1</span> of {total ?? 1}</h1>;
}

function PreviewAudioBar({ text, audioUrl }: { text?: string; audioUrl?: string }) {
  return (
    <div className="mb-4 flex min-h-12 items-center justify-between gap-4 rounded bg-[#ef2620] px-5 py-2 text-white">
      {audioUrl ? (
        <audio className="h-9 max-w-[360px] flex-1" controls src={audioUrl} />
      ) : (
        <div className="flex items-center gap-4"><Play size={16} fill="currentColor" /><Volume2 size={16} /><div className="h-1.5 w-28 rounded-full bg-white" /></div>
      )}
      <span className="text-xs font-bold">{text ?? '2 of 2 plays remaining'}</span>
    </div>
  );
}

function PreviewNumber() {
  return <span className="inline-flex min-w-14 justify-center rounded border border-slate-300 px-3 py-1 text-base">1</span>;
}

function PreviewSelect({ options, compact }: { options: string[]; compact?: boolean }) {
  return <select className={`rounded border border-slate-300 bg-white px-2 py-2 text-sm ${compact ? 'w-full' : 'w-full'}`} value="" onChange={() => undefined}><option value="">-- Select --</option>{options.map((item) => <option key={item}>{item}</option>)}</select>;
}

function PreviewButton() {
  return <button type="button" className="mt-4 rounded bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Show paragraph</button>;
}

function apiErrorMessage(error: any, fallback: string) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message;
  const errors = error?.response?.data?.errors;

  if (status === 403) {
    return `${fallback}: tài khoản hiện tại không có quyền ADMIN hoặc phiên đăng nhập đã hết hạn. Hãy đăng xuất rồi đăng nhập lại bằng tài khoản admin.`;
  }

  if (errors && typeof errors === 'object') {
    const detail = Object.entries(errors)
      .map(([field, value]) => `${field}: ${String(value)}`)
      .join(', ');
    if (detail) return `${fallback}: ${detail}`;
  }

  if (message) return `${fallback}: ${message}`;
  if (status) return `${fallback} (HTTP ${status})`;
  return fallback;
}
