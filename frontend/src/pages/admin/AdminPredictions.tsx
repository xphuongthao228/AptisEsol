import { CheckSquare, Copy, Download, FileSearch, Layers, Link2, Pencil, Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
import type { Question, SkillType, Test } from '../../types';

type PredictionStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

type AdminPrediction = {
  id: number;
  skill: SkillType;
  title: string;
  summary: string;
  content: string;
  tags: string;
  priority: number;
  status: PredictionStatus;
  updatedAt: string;
};

type PredictionForm = {
  id: number | null;
  skill: SkillType;
  title: string;
  summary: string;
  content: string;
  tags: string;
  priority: number;
  status: PredictionStatus;
};

const emptyForm: PredictionForm = {
  id: null,
  skill: 'LISTENING',
  title: '',
  summary: '',
  content: '',
  tags: '',
  priority: 1,
  status: 'PUBLISHED'
};

const skillLabels: Record<SkillType, string> = {
  LISTENING: 'Listening',
  SPEAKING: 'Speaking',
  READING: 'Reading',
  WRITING: 'Writing',
  GRAMMAR: 'Grammar'
};

type PredictionSectionSkill = Extract<SkillType, 'LISTENING' | 'SPEAKING' | 'READING' | 'WRITING'>;

const predictionSections: PredictionSectionSkill[] = ['LISTENING', 'SPEAKING', 'READING', 'WRITING'];

const sectionLabels: Record<PredictionSectionSkill, string> = {
  LISTENING: 'Listening',
  SPEAKING: 'Speaking',
  READING: 'Reading',
  WRITING: 'Writing'
};

const QUESTION_LINKS_START = '[[QUESTION_LINKS]]';
const QUESTION_LINKS_END = '[[/QUESTION_LINKS]]';

type PredictionQuestionLink = {
  testId: number;
  questionId: number;
  label: string;
  section?: PredictionSectionSkill;
  part?: PredictionPart;
};

type PredictionPart = 1 | 2 | 3 | 4;

const predictionParts: PredictionPart[] = [1, 2, 3, 4];

function apiErrorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message ?? error?.response?.data?.errors?.[0] ?? error?.message;
  const status = error?.response?.status;
  return message ? `${fallback}: ${message}` : `${fallback}${status ? ` (HTTP ${status})` : ''}`;
}

function questionLinkLabel(question: Question, index: number) {
  const topic = question.topic?.trim();
  if (topic) return `Câu ${index + 1}: ${topic}`;

  const text = stripQuestionContent(question.content);
  return `Câu ${index + 1}: ${text || `ID ${question.id}`}`;
}

function stripQuestionContent(content: string) {
  const value = content?.trim() ?? '';
  if (!value) return '';
  try {
    const parsed = JSON.parse(value);
    const candidates = [
      parsed.title,
      parsed.topic,
      parsed.prompt,
      parsed.question,
      Array.isArray(parsed.questions) ? parsed.questions[0]?.question ?? parsed.questions[0]?.prompt : ''
    ];
    const found = candidates.find((item) => typeof item === 'string' && item.trim());
    if (found) return String(found).trim();
  } catch {
    // Plain text question.
  }
  return value.replace(/\s+/g, ' ').slice(0, 90);
}

function absoluteQuestionUrl(testId: number, questionId: number) {
  const path = `/app/tests/${testId}?questionId=${questionId}`;
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

function upsertQuestionLinksBlock(content: string, links: PredictionQuestionLink[]) {
  const block = [
    QUESTION_LINKS_START,
    JSON.stringify(links, null, 2),
    QUESTION_LINKS_END
  ].join('\n');

  const pattern = new RegExp(`${escapeRegExp(QUESTION_LINKS_START)}[\\s\\S]*?${escapeRegExp(QUESTION_LINKS_END)}`, 'm');
  const trimmed = content.trim();
  if (pattern.test(trimmed)) return trimmed.replace(pattern, block);
  return trimmed ? `${trimmed}\n\n${block}` : block;
}

function parseQuestionLinksBlock(content: string): PredictionQuestionLink[] {
  const pattern = new RegExp(`${escapeRegExp(QUESTION_LINKS_START)}([\\s\\S]*?)${escapeRegExp(QUESTION_LINKS_END)}`, 'm');
  const match = content.match(pattern);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[1].trim());
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => Number(item?.testId) && Number(item?.questionId))
      .map((item) => {
        const section = predictionSections.includes(item.section) ? item.section : undefined;
        return {
          testId: Number(item.testId),
          questionId: Number(item.questionId),
          label: String(item.label ?? '').trim(),
          ...(section ? { section } : {}),
          ...(isPredictionPart(item.part) ? { part: Number(item.part) as PredictionPart } : {})
        };
      });
  } catch {
    return [];
  }
}

function addCompositeTemplate(content: string) {
  const template = [
    '## Listening',
    '### Part 1',
    '- Dang bai / topic:',
    '- Ghi chu on tap:',
    '### Part 2',
    '- Dang bai / topic:',
    '- Ghi chu on tap:',
    '### Part 3',
    '- Dang bai / topic:',
    '- Ghi chu on tap:',
    '### Part 4',
    '- Dang bai / topic:',
    '- Ghi chu on tap:',
    '',
    '## Speaking',
    '### Part 1',
    '- Cau hoi / topic:',
    '- Ghi chu on tap:',
    '### Part 2',
    '- Tranh / topic:',
    '- Ghi chu on tap:',
    '### Part 3',
    '- So sanh tranh / topic:',
    '- Ghi chu on tap:',
    '### Part 4',
    '- Topic thao luan:',
    '- Ghi chu on tap:',
    '',
    '## Reading',
    '### Part 1',
    '- Dang bai / topic:',
    '- Ghi chu on tap:',
    '### Part 2',
    '- Dang bai / topic:',
    '- Ghi chu on tap:',
    '### Part 3',
    '- Dang bai / topic:',
    '- Ghi chu on tap:',
    '### Part 4',
    '- Dang bai / topic:',
    '- Ghi chu on tap:',
    '',
    '## Writing',
    '### Part 1',
    '- Task / topic:',
    '- Ghi chu on tap:',
    '### Part 2',
    '- Task / topic:',
    '- Ghi chu on tap:',
    '### Part 3',
    '- Task / topic:',
    '- Ghi chu on tap:',
    '### Part 4',
    '- Task / topic:',
    '- Ghi chu on tap:'
  ].join('\n');

  const trimmed = content.trim();
  return trimmed ? `${trimmed}\n\n${template}` : template;
}
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPredictionPart(value: unknown) {
  return predictionParts.includes(Number(value) as PredictionPart);
}

function parsePredictionContent(content: string): { text: string; links: PredictionQuestionLink[] } {
  const pattern = new RegExp(`${escapeRegExp(QUESTION_LINKS_START)}([\\s\\S]*?)${escapeRegExp(QUESTION_LINKS_END)}`, 'm');
  return {
    text: content.replace(pattern, '').trim(),
    links: parseQuestionLinksBlock(content)
  };
}

function downloadPredictionWord(item: AdminPrediction) {
  const parsed = parsePredictionContent(item.content);
  const html = buildPredictionWordHtml(item, parsed);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${slugifyFileName(item.title || 'du-doan-de')}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function buildPredictionWordHtml(item: AdminPrediction, parsed: { text: string; links: PredictionQuestionLink[] }) {
  const groupedLinks = groupLinksBySection(parsed.links);
  const ungroupedLinks = parsed.links.filter((link) => !link.section);
  const updatedAt = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('vi-VN') : '';
  const linkSections = predictionSections.map((section) => {
    const sectionLinks = groupedLinks[section];
    if (sectionLinks.length === 0) return '';
    const partHtml = predictionParts.map((part) => {
      const links = sectionLinks.filter((link) => link.part === part);
      if (links.length === 0) return '';
      return `<h3>Part ${part}</h3><ul>${links.map((link) => `<li><a href="${questionHref(link)}">${escapeHtml(link.label || `Cau hoi ${link.questionId}`)}</a></li>`).join('')}</ul>`;
    }).join('');
    const generalLinks = sectionLinks.filter((link) => !link.part);
    const generalHtml = generalLinks.length > 0
      ? `<ul>${generalLinks.map((link) => `<li><a href="${questionHref(link)}">${escapeHtml(link.label || `Cau hoi ${link.questionId}`)}</a></li>`).join('')}</ul>`
      : '';
    return `<h2>${sectionLabels[section]}</h2>${partHtml}${generalHtml}`;
  }).join('');
  const ungroupedHtml = ungroupedLinks.length > 0
    ? `<h2>Cau hoi chung</h2><ul>${ungroupedLinks.map((link) => `<li><a href="${questionHref(link)}">${escapeHtml(link.label || `Cau hoi ${link.questionId}`)}</a></li>`).join('')}</ul>`
    : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(item.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; line-height: 1.55; }
    h1 { color: #2b075c; font-size: 26px; margin: 0 0 8px; }
    h2 { color: #2b075c; font-size: 20px; margin: 24px 0 8px; }
    h3 { color: #0f477e; font-size: 16px; margin: 14px 0 6px; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 18px; }
    .summary { background: #f8fafc; border: 1px solid #dce3ee; padding: 12px; margin: 14px 0; }
    p { margin: 0 0 10px; }
    li { margin: 4px 0; }
    a { color: #0f477e; }
  </style>
</head>
<body>
  <h1>${escapeHtml(item.title)}</h1>
  <div class="meta">Ky nang: ${escapeHtml(skillLabels[item.skill])}${updatedAt ? ` | Cap nhat: ${escapeHtml(updatedAt)}` : ''}</div>
  ${item.summary ? `<div class="summary">${escapeParagraphs(item.summary)}</div>` : ''}
  ${parsed.text ? `<h2>Noi dung du doan</h2>${escapeParagraphs(parsed.text)}` : ''}
  ${parsed.links.length > 0 ? `<h2>Cau hoi duoc du doan</h2>${linkSections}${ungroupedHtml}` : ''}
</body>
</html>`;
}

function groupLinksBySection(links: PredictionQuestionLink[]) {
  return predictionSections.reduce((acc, section) => {
    acc[section] = links.filter((link) => link.section === section);
    return acc;
  }, {} as Record<PredictionSectionSkill, PredictionQuestionLink[]>);
}

function questionHref(link: PredictionQuestionLink) {
  const path = `/app/tests/${link.testId}?questionId=${link.questionId}`;
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

function linkKey(link: PredictionQuestionLink) {
  return `${link.testId}:${link.questionId}:${link.section ?? ''}:${link.part ?? ''}`;
}

function escapeParagraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugifyFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'du-doan-de';
}

export function AdminPredictions() {
  const [items, setItems] = useState<AdminPrediction[]>([]);
  const [form, setForm] = useState<PredictionForm>(emptyForm);
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<number | ''>('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [selectedSection, setSelectedSection] = useState<PredictionSectionSkill>('LISTENING');
  const [selectedPart, setSelectedPart] = useState<PredictionPart>(1);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPredictions();
    loadTests();
  }, []);

  useEffect(() => {
    if (!selectedTestId) {
      setQuestions([]);
      setSelectedQuestionIds([]);
      return;
    }
    loadQuestions(selectedTestId);
  }, [selectedTestId]);

  async function loadPredictions() {
    try {
      setLoading(true);
      setItems(await unwrap<AdminPrediction[]>(api.get('/predictions')));
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không tải được danh sách dự đoán đề'));
    } finally {
      setLoading(false);
    }
  }

  async function loadTests() {
    try {
      setTests(await unwrap<Test[]>(api.get('/tests')));
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không tải được danh sách bài/câu hỏi'));
    }
  }

  async function loadQuestions(testId: number) {
    try {
      const data = await unwrap<Question[]>(api.get(`/questions?testId=${testId}`));
      setQuestions(data);
      setSelectedQuestionIds((current) => current.filter((questionId) => data.some((question) => question.id === questionId)));
    } catch (error) {
      setQuestions([]);
      toast.error(apiErrorMessage(error, 'Không tải được câu hỏi'));
    }
  }

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) =>
      [item.title, item.summary, item.content, item.tags, skillLabels[item.skill]]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [items, query]);

  const currentQuestionLinks = useMemo(() => parseQuestionLinksBlock(form.content), [form.content]);

  function resetForm() {
    setForm(emptyForm);
  }

  async function savePrediction() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung dự đoán');
      return;
    }

    const payload = {
      skill: form.skill,
      title: form.title.trim(),
      summary: form.summary.trim(),
      content: form.content.trim(),
      tags: form.tags.trim(),
      priority: Number(form.priority) || 1,
      status: form.status
    };

    try {
      setSaving(true);
      const saved = form.id
        ? await unwrap<AdminPrediction>(api.put(`/predictions/${form.id}`, payload))
        : await unwrap<AdminPrediction>(api.post('/predictions', payload));

      setItems((current) => form.id
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current]);
      setForm(emptyForm);
      toast.success(form.id ? 'Đã cập nhật dự đoán đề' : 'Đã tạo dự đoán đề mới');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không lưu được dự đoán đề'));
    } finally {
      setSaving(false);
    }
  }

  function editPrediction(item: AdminPrediction) {
    setForm({
      id: item.id,
      skill: item.skill,
      title: item.title,
      summary: item.summary ?? '',
      content: item.content,
      tags: item.tags ?? '',
      priority: item.priority ?? 1,
      status: item.status
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function duplicatePrediction(item: AdminPrediction) {
    setForm({
      id: null,
      skill: item.skill,
      title: `${item.title} - Bản sao`,
      summary: item.summary ?? '',
      content: item.content,
      tags: item.tags ?? '',
      priority: item.priority ?? 1,
      status: item.status
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Da copy du doan sang form tao moi, bao gom ca link cau hoi');
  }

  function toggleQuestion(questionId: number) {
    setSelectedQuestionIds((current) => current.includes(questionId)
      ? current.filter((id) => id !== questionId)
      : [...current, questionId]);
  }

  function insertQuestionLinks() {
    if (!selectedTestId || selectedQuestionIds.length === 0) {
      toast.error('Vui lòng chọn bài và ít nhất một câu hỏi');
      return;
    }

    const selectedQuestions = questions.filter((question) => selectedQuestionIds.includes(question.id));
    const links: PredictionQuestionLink[] = selectedQuestions.map((question, index) => ({
      testId: Number(selectedTestId),
      questionId: question.id,
      label: questionLinkLabel(question, index),
      section: selectedSection,
      part: selectedPart
    }));
    const existingLinks = parseQuestionLinksBlock(form.content);
    const existingKeys = new Set(existingLinks.map(linkKey));
    const newLinks = links.filter((link) => !existingKeys.has(linkKey(link)));

    if (newLinks.length === 0) {
      toast.error('Cac cau hoi da duoc gan trong du doan nay');
      return;
    }

    const mergedLinks = [...existingLinks, ...newLinks];

    setForm((current) => ({
      ...current,
      content: upsertQuestionLinksBlock(current.content, mergedLinks)
    }));
    setSelectedQuestionIds([]);
    toast.success(`Da them ${newLinks.length} cau hoi vao ${sectionLabels[selectedSection]} Part ${selectedPart}`);
  }

  function removeQuestionLink(index: number) {
    const links = parseQuestionLinksBlock(form.content);
    const nextLinks = links.filter((_, linkIndex) => linkIndex !== index);
    setForm((current) => ({
      ...current,
      content: upsertQuestionLinksBlock(current.content, nextLinks)
    }));
    toast.success('Da xoa cau hoi khoi du doan');
  }

  function insertCompositeTemplate() {
    setForm((current) => ({
      ...current,
      content: addCompositeTemplate(current.content)
    }));
    toast.success('Da them khung du doan 4 ky nang, moi ky nang 4 part');
  }

  async function copyQuestionLink(question: Question) {
    if (!selectedTestId) return;
    const url = absoluteQuestionUrl(Number(selectedTestId), question.id);
    await navigator.clipboard.writeText(url);
    toast.success('Đã copy link câu hỏi');
  }

  async function deletePrediction(id: number) {
    if (!confirm('Xóa dự đoán đề này?')) return;
    try {
      await unwrap(api.delete(`/predictions/${id}`));
      setItems((current) => current.filter((item) => item.id !== id));
      if (form.id === id) setForm(emptyForm);
      toast.success('Đã xóa dự đoán đề');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không xóa được dự đoán đề'));
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-600">Admin</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Quản lý dự đoán đề</h1>
        <p className="mt-2 text-slate-500">Tạo nội dung dự đoán đề, sắp xếp ưu tiên và hiển thị cho học viên.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[460px_1fr]">
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <FileSearch size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{form.id ? 'Sửa dự đoán' : 'Tạo dự đoán'}</h2>
              <p className="text-sm text-slate-500">Học viên chỉ thấy mục đang hiện.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-2 sm:col-span-1">
                <span className="text-sm font-bold text-slate-600">Kỹ năng</span>
                <select className="input" value={form.skill} onChange={(event) => setForm((current) => ({ ...current, skill: event.target.value as SkillType }))}>
                  {Object.entries(skillLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="space-y-2 sm:col-span-1">
                <span className="text-sm font-bold text-slate-600">Trạng thái</span>
                <select className="input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PredictionStatus }))}>
                  <option value="PUBLISHED">Đang hiện</option>
                  <option value="DRAFT">Bản nháp</option>
                  <option value="ARCHIVED">Lưu trữ</option>
                </select>
              </label>
              <label className="space-y-2 sm:col-span-1">
                <span className="text-sm font-bold text-slate-600">Ưu tiên</span>
                <input className="input" type="number" min={1} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: Number(event.target.value) }))} />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Tiêu đề</span>
              <input className="input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="VD: Chủ đề Speaking dễ gặp tuần này" />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Mô tả ngắn</span>
              <textarea className="input min-h-[80px]" value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} placeholder="Tóm tắt dự đoán..." />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Nội dung dự đoán</span>
              <textarea className="input min-h-[170px]" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="Nhập nội dung chi tiết..." />
            </label>
            <button type="button" className="btn-secondary w-full justify-center" onClick={insertCompositeTemplate}>
              <Layers size={18} />
              Tạo khung 4 kỹ năng
            </button>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-700">
                <Link2 size={17} />
                Chọn câu hỏi để tạo link
              </div>
              <label className="mb-3 block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Gắn vào mục</span>
                <select className="input bg-white" value={selectedSection} onChange={(event) => setSelectedSection(event.target.value as PredictionSectionSkill)}>
                  {predictionSections.map((section) => (
                    <option key={section} value={section}>{sectionLabels[section]}</option>
                  ))}
                </select>
              </label>
              <label className="mb-3 block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Part</span>
                <select className="input bg-white" value={selectedPart} onChange={(event) => setSelectedPart(Number(event.target.value) as PredictionPart)}>
                  {predictionParts.map((part) => (
                    <option key={part} value={part}>Part {part}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Bài luyện</span>
                <select className="input bg-white" value={selectedTestId} onChange={(event) => setSelectedTestId(event.target.value ? Number(event.target.value) : '')}>
                  <option value="">Chọn bài có câu hỏi</option>
                  {tests.map((test) => (
                    <option key={test.id} value={test.id}>
                      {test.title} ({test.skillName})
                    </option>
                  ))}
                </select>
              </label>
              {selectedTestId ? (
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                  {questions.length > 0 ? questions.map((question, index) => (
                    <div key={question.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg p-2 hover:bg-slate-50">
                      <input type="checkbox" checked={selectedQuestionIds.includes(question.id)} onChange={() => toggleQuestion(question.id)} />
                      <button type="button" className="min-w-0 text-left text-sm font-semibold text-slate-700" onClick={() => toggleQuestion(question.id)}>
                        <span className="block truncate">{questionLinkLabel(question, index)}</span>
                        <span className="block truncate text-xs font-medium text-slate-400">{question.topic || question.content}</span>
                      </button>
                      <button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-brand-700" onClick={() => copyQuestionLink(question)} title="Copy link câu hỏi">
                        <Copy size={15} />
                      </button>
                    </div>
                  )) : (
                    <p className="p-3 text-sm font-semibold text-slate-400">Bài này chưa có câu hỏi.</p>
                  )}
                </div>
              ) : null}
              <button type="button" className="btn-secondary mt-3 w-full justify-center" onClick={insertQuestionLinks} disabled={!selectedTestId || selectedQuestionIds.length === 0}>
                <CheckSquare size={18} />
                Them cau hoi vao {sectionLabels[selectedSection]} Part {selectedPart}
              </button>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Cau hoi dang gan</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{currentQuestionLinks.length}</span>
                </div>
                {currentQuestionLinks.length > 0 ? (
                  <div className="max-h-52 space-y-2 overflow-y-auto">
                    {currentQuestionLinks.map((link, index) => (
                      <div key={`${linkKey(link)}:${index}`} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-slate-100 p-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-700">{link.label || `Cau hoi ${link.questionId}`}</p>
                          <p className="text-xs font-medium text-slate-400">
                            {link.section ? sectionLabels[link.section] : 'Chung'}{link.part ? ` - Part ${link.part}` : ''} - Bai #{link.testId}, cau #{link.questionId}
                          </p>
                        </div>
                        <button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-red-200 hover:text-red-600" onClick={() => removeQuestionLink(index)} title="Xoa cau hoi khoi du doan">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 p-3 text-sm font-semibold text-slate-400">Chua gan cau hoi nao.</p>
                )}
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-600">Tag</span>
              <input className="input" value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="VD: writing,email,part 4" />
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <button type="button" className="btn-primary justify-center" onClick={savePrediction} disabled={saving}>
                {form.id ? <Save size={18} /> : <Plus size={18} />}
                {saving ? 'Đang lưu...' : form.id ? 'Cập nhật' : 'Lưu dự đoán'}
              </button>
              <button type="button" className="btn-secondary justify-center" onClick={resetForm}>
                <RotateCcw size={18} />
                Làm mới
              </button>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-extrabold">Danh sách dự đoán</h2>
                <p className="text-sm text-slate-500">{items.length} mục dự đoán</p>
              </div>
              <label className="flex h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-400 lg:max-w-[320px]">
                <Search size={18} />
                <input className="w-full bg-transparent text-sm text-slate-700 outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm dự đoán..." />
              </label>
            </div>
          </div>

          <div className="max-h-[720px] space-y-3 overflow-y-auto p-5">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 p-10 text-center font-bold text-slate-500">Đang tải dự đoán...</div>
            ) : filteredItems.length > 0 ? filteredItems.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">{skillLabels[item.skill]}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{item.status}</span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Ưu tiên {item.priority}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-extrabold text-slate-950">{item.title}</h3>
                    {item.summary ? <p className="mt-1 text-sm text-slate-500">{item.summary}</p> : null}
                    {item.tags ? <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{item.tags}</p> : null}
                    <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-slate-600">{item.content}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:border-brand-200 hover:text-brand-700" onClick={() => downloadPredictionWord(item)} title="Export Word">
                      <Download size={18} />
                    </button>
                    <button type="button" className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:border-brand-200 hover:text-brand-700" onClick={() => duplicatePrediction(item)} title="Copy sang dự đoán mới">
                      <Copy size={18} />
                    </button>
                    <button type="button" className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:border-brand-200 hover:text-brand-700" onClick={() => editPrediction(item)}>
                      <Pencil size={18} />
                    </button>
                    <button type="button" className="rounded-xl border border-slate-200 p-3 text-slate-600 hover:border-red-200 hover:text-red-600" onClick={() => deletePrediction(item.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </article>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center font-bold text-slate-500">Chưa có dự đoán đề nào.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
