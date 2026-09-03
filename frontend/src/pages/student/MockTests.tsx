import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Bell,
  BookOpen,
  Bookmark,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileQuestion,
  FileSearch,
  FileText,
  Flag,
  GraduationCap,
  HeartHandshake,
  HelpCircle,
  Info,
  LayoutDashboard,
  List,
  Lock,
  LogOut,
  Mail,
  Mic,
  Move,
  Pause,
  PlayCircle,
  RotateCcw,
  Search,
  Settings,
  Shuffle,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X,
  type LucideIcon
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { Question, SubscriptionResponse, Test } from '../../types';

type SpeakingScreen = 'select' | 'fullStart' | 'fullResult' | 'start' | 'instructions' | 'prompt' | 'question' | 'part2Prompt' | 'part2Question' | 'part3Prompt' | 'part3Question' | 'part4Prompt' | 'part4Question' | 'complete' | 'readingStart' | 'readingInstructions' | 'readingQuestion' | 'readingCohesion' | 'readingOpinion' | 'readingLong' | 'readingResult' | 'readingReview' | 'listeningStart' | 'listeningInstructions' | 'listeningQuestion' | 'listeningMatching' | 'listeningShort' | 'listeningMonologues' | 'listeningResult' | 'listeningReview' | 'writingInstructions' | 'writingPart' | 'writingResult' | 'grammarStart' | 'grammarInstructions' | 'grammarQuestion' | 'grammarResult';
type Part4Phase = 'prepare' | 'recording';
type MockSkill = 'FULL' | 'LISTENING' | 'SPEAKING' | 'WRITING' | 'READING' | 'GRAMMAR';
type DraftLevel = 'B1' | 'B2';
type SpeakingDraftField = {
  label: string;
  prefix: string;
  b1: readonly string[];
  b2: readonly string[];
};
type SpeakingDraftTemplate = {
  title: string;
  target: string;
  fields: readonly SpeakingDraftField[];
};

type AiWritingScore = {
  overallScore: number;
  cefrLevel: string;
  summary: string;
  criteria: { name: string; score: number; feedback: string }[];
  parts: { title: string; score: number; feedback: string }[];
  corrections: string[];
  suggestedAnswer: string;
};

type AiSpeakingScore = {
  overallScore: number;
  cefrLevel: string;
  summary: string;
  criteria: { name: string; score: number; feedback: string }[];
  parts: { title: string; score: number; feedback: string }[];
  pronunciationTips: string[];
  fluencyTips: string[];
  improvedAnswer: string;
};

type SpeakingScorePartPayload = {
  title: string;
  prompt: string;
  transcript: string;
  audioFileName?: string;
  audioContentType?: string;
  audioSizeBytes?: number;
};

type SpeakingPart4Topic = {
  title: string;
  image?: string;
  questions: string[];
};

type SpeakingTestData = {
  part1: string[];
  part2: string[];
  part2Image: string;
  part3: string[];
  part4: SpeakingPart4Topic;
};

type SidebarLink = {
  to: string;
  label: string;
  icon: LucideIcon;
};

type MockCard = {
  id: string;
  practiceTestId?: number;
  skillTestIds?: Partial<Record<Exclude<MockSkill, 'FULL'>, number>>;
  skill: MockSkill;
  label: string;
  title: string;
  description: string;
  questions: string;
  questionData?: string;
  minutes: string;
  icon: LucideIcon;
  ready: boolean;
  color: string;
  featured?: boolean;
};

type StoredAdminMockTest = {
  id?: string;
  skill?: MockSkill | 'GRAMMAR_VOCABULARY';
  title?: string;
  description?: string;
  questions?: string;
  questionData?: string;
  minutes?: string;
  status?: 'PUBLISHED' | 'DRAFT';
  featured?: boolean;
};

type ApiMockTest = {
  id: number;
  skill: MockSkill | 'GRAMMAR_VOCABULARY';
  title: string;
  description?: string;
  questions?: string;
  questionData?: string;
  minutes?: string;
  status?: 'PUBLISHED' | 'DRAFT';
  featured?: boolean;
};

const FEATURED_MARKER = '[[APTIS_FEATURED_MOCK_TEST]]';
const BOOKMARK_STORAGE_KEY = 'aptis-mock-test-bookmarks';

function normalizeMockSkill(value?: string): MockSkill | null {
  const skill = String(value ?? '').trim().toUpperCase();
  if (skill === 'GRAMMAR_VOCABULARY' || skill === 'GRAMMAR&VOCABULARY' || skill === 'G&V') return 'GRAMMAR';
  return skill in mockCardMeta ? skill as MockSkill : null;
}

type ListeningPart1Question = {
  prompt: string;
  options: string[];
  audioUrl?: string;
  answer?: string;
  correctAnswer?: string;
};

type ListeningMatchingData = {
  prompt: string;
  options: string[];
  speakers: string[];
  answerKey: Record<string, string>;
  audioUrl?: string;
};

type ListeningShortData = {
  topic: string;
  prompt: string;
  statements: string[];
  options: string[];
  answerKey: string[];
  audioUrl?: string;
};

type ListeningMonologueQuestion = {
  prompt: string;
  options: string[];
  answer?: string;
  correctAnswer?: string;
};

type ListeningMonologueData = {
  audioUrl?: string;
  questions: ListeningMonologueQuestion[];
};

type ReadingGapQuestion = {
  prompt?: string;
  questionStart?: string;
  questionEnd?: string;
  options: string[];
  answer: string;
};

type ReadingCohesionQuestion = {
  title: string;
  choices: string[];
  correctOrder: string[];
};

type ReadingOpinionQuestion = {
  people: { label: string; text: string }[];
  questions: string[];
  correctAnswers: string[];
  intro?: string;
  topic?: string;
};

type ReadingLongQuestion = {
  title: string;
  headings: string[];
  paragraphs: string[];
  correctAnswers: string[];
};

type ReadingTestData = {
  gaps: ReadingGapQuestion[];
  cohesion: ReadingCohesionQuestion[];
  opinion: ReadingOpinionQuestion;
  long: ReadingLongQuestion;
};

const emptyReadingTestData: ReadingTestData = {
  gaps: [],
  cohesion: [],
  opinion: { people: [], questions: [], correctAnswers: [] },
  long: { title: '', headings: [], paragraphs: [], correctAnswers: [] }
};

type GrammarQuestionItem = {
  prompt?: string;
  options: string[];
  answer?: string;
  matchRows?: { word: string; answer: string }[];
  definitionRows?: { definition: string; answer: string }[];
  definitionMode?: 'completion' | 'matching';
  sentenceRows?: { before: string; after?: string; answer: string }[];
  collocationRows?: { word: string; answer: string }[];
};

type SkillScoreSummary = {
  correct: number;
  total: number;
  score: number;
  maxScore: number;
  cefr: string;
  rows: { part: string; correct: string; score: string }[];
};

type QuestionListItem = {
  key: string;
  label: string;
  detail: string;
  active: boolean;
  bookmarked: boolean;
  onSelect: () => void;
};

const sidebarLinks: SidebarLink[] = [
  { to: '/app', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/app/lessons', label: 'Bài học', icon: GraduationCap },
  { to: '/app/tests/parts', label: 'Luyện tập', icon: BookOpen },
  { to: '/app/mock-tests', label: 'Đề thi', icon: FileText },
  { to: '/app/mock-tests', label: 'Thi thử', icon: FileCheck },
  { to: '/app/predictions', label: 'Dự đoán đề', icon: FileSearch },
  { to: '/app/renewal', label: 'Gia hạn', icon: CalendarPlus },
  { to: '/app/donate', label: 'Ủng hộ web', icon: HeartHandshake },
  { to: '/app/contact', label: 'Liên hệ', icon: Mail },
  { to: '/app/settings', label: 'Cài đặt', icon: Settings }
];

const skillFilters: { key: MockSkill; label: string }[] = [
  { key: 'FULL', label: 'Full' },
  { key: 'LISTENING', label: 'Listening' },
  { key: 'SPEAKING', label: 'Speaking' },
  { key: 'WRITING', label: 'Writing' },
  { key: 'READING', label: 'Reading' },
  { key: 'GRAMMAR', label: 'Grammar' }
];

const FREE_MOCK_TESTS_PER_SKILL = 2;
const fullRequiredSkills: Array<Exclude<MockSkill, 'FULL'>> = ['SPEAKING', 'LISTENING', 'GRAMMAR', 'READING', 'WRITING'];

const mockCards: MockCard[] = [
  {
    id: 'full-1',
    skill: 'FULL',
    label: 'Full',
    title: 'Full Aptis Mock Test',
    description: 'Làm trọn bộ các kỹ năng trong cùng một phiên thi thử mô phỏng.',
    questions: '5 kỹ năng',
    minutes: '162 phút',
    icon: FileCheck,
    ready: true,
    color: 'bg-indigo-50 text-indigo-700'
  },
  {
    id: 'listening-1',
    skill: 'LISTENING',
    label: 'Listening',
    title: 'Listening Mock Test',
    description: 'Giao diện mô phỏng bài nghe Aptis với audio, lượt nghe và câu hỏi.',
    questions: '17',
    minutes: '40 phút',
    icon: Volume2,
    ready: true,
    color: 'bg-blue-50 text-blue-700'
  },
  {
    id: 'speaking-1',
    skill: 'SPEAKING',
    label: 'Speaking',
    title: 'Speaking Practice Test 1',
    description: 'Mô phỏng bài Speaking với màn hình hướng dẫn, prompt và ghi âm thử.',
    questions: '4',
    minutes: '12 phút',
    icon: Mic,
    ready: true,
    color: 'bg-rose-50 text-rose-700'
  },
  {
    id: 'writing-1',
    skill: 'WRITING',
    label: 'Writing',
    title: 'Writing Mock Test',
    description: 'Giao diện mô phỏng bài viết với khung trả lời và bộ đếm thời gian.',
    questions: '4',
    minutes: '50 phút',
    icon: FileText,
    ready: true,
    color: 'bg-violet-50 text-violet-700'
  },
  {
    id: 'reading-1',
    skill: 'READING',
    label: 'Reading',
    title: 'Reading Mock Test',
    description: 'Giao diện mô phỏng đọc hiểu theo từng phần của bài thi Aptis.',
    questions: '5',
    minutes: '35 phút',
    icon: BookOpen,
    ready: true,
    color: 'bg-emerald-50 text-emerald-700'
  },
  {
    id: 'grammar-1',
    skill: 'GRAMMAR',
    label: 'Grammar',
    title: 'Grammar & Vocabulary Mock Test',
    description: 'Giao diện mô phỏng bài Grammar & Vocabulary với câu hỏi trắc nghiệm và bộ đếm thời gian.',
    questions: '30',
    minutes: '25 phút',
    icon: FileQuestion,
    ready: true,
    color: 'bg-amber-50 text-amber-700'
  }
];

const mockCardMeta: Record<MockSkill, Pick<MockCard, 'icon' | 'color' | 'label'>> = {
  FULL: { icon: FileCheck, color: 'bg-indigo-50 text-indigo-700', label: 'Full' },
  LISTENING: { icon: Volume2, color: 'bg-blue-50 text-blue-700', label: 'Listening' },
  SPEAKING: { icon: Mic, color: 'bg-rose-50 text-rose-700', label: 'Speaking' },
  WRITING: { icon: FileText, color: 'bg-violet-50 text-violet-700', label: 'Writing' },
  READING: { icon: BookOpen, color: 'bg-emerald-50 text-emerald-700', label: 'Reading' },
  GRAMMAR: { icon: FileQuestion, color: 'bg-amber-50 text-amber-700', label: 'Grammar' }
};

function loadPublishedAdminMockCards() {
  if (typeof window === 'undefined') return [];
  try {
    const saved = window.localStorage.getItem('aptis-admin-mock-tests');
    if (!saved) return [];
    const parsed = JSON.parse(saved) as StoredAdminMockTest[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is StoredAdminMockTest & { title: string } =>
        Boolean(normalizeMockSkill(item.skill) && item.title?.trim() && item.status !== 'DRAFT')
      )
      .map<MockCard>((item) => {
        const skill = normalizeMockSkill(item.skill) ?? 'GRAMMAR';
        const meta = mockCardMeta[skill];
        const description = item.description?.trim() ?? '';
        return {
          id: item.id ? `admin-${item.id}` : `admin-${item.skill}-${item.title}`,
          skill,
          label: meta.label,
          title: item.title.trim(),
          description: cleanFeaturedMarker(description) || 'Đề thi thử do admin thêm.',
          questions: item.questions?.trim() || 'Chưa rõ',
          questionData: (item as StoredAdminMockTest & { questionData?: string }).questionData?.trim(),
          minutes: item.minutes?.trim() || 'Chưa rõ',
          icon: meta.icon,
          ready: true,
          color: meta.color,
          featured: Boolean(item.featured || hasFeaturedMarker(description))
        };
      });
  } catch {
    return [];
  }
}

function loadStoredFeaturedMap() {
  if (typeof window === 'undefined') return {};
  try {
    const saved = window.localStorage.getItem('aptis-admin-mock-tests-featured');
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, boolean> : {};
  } catch {
    return {};
  }
}

function loadMockBookmarks() {
  if (typeof window === 'undefined') return [];
  try {
    const saved = window.localStorage.getItem(BOOKMARK_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function storedFeaturedValue(card: MockCard, featuredMap: Record<string, boolean>) {
  const cardId = card.id.replace(/^api-/, '').replace(/^admin-/, '');
  const title = card.title.trim().toLowerCase();
  if (featuredMap[`id:${cardId}`] || featuredMap[`skill-title:${card.skill}|${title}`] || featuredMap[`title:${title}`]) {
    return true;
  }

  return Object.entries(featuredMap).some(([key, featured]) => {
    if (!featured) return false;
    const [id = '', skill = '', title = ''] = key.split('|');
    return id === cardId || (skill === card.skill && title === card.title.trim().toLowerCase());
  });
}

function apiMockTestToCard(item: ApiMockTest): MockCard | null {
  const skill = normalizeMockSkill(item.skill);
  if (!skill || !item.title?.trim()) return null;
  const meta = mockCardMeta[skill];
  const description = item.description?.trim() ?? '';
  return {
    id: `api-${item.id}`,
    skill,
    label: meta.label,
    title: item.title.trim(),
    description: cleanFeaturedMarker(description) || 'Đề thi thử do admin thêm.',
    questions: item.questions?.trim() || 'Chưa rõ',
    questionData: item.questionData?.trim(),
    minutes: item.minutes?.trim() || 'Chưa rõ',
    icon: meta.icon,
    ready: true,
    color: meta.color,
    featured: Boolean(item.featured || hasFeaturedMarker(description))
  };
}

function isRemovedMockTest(card: Pick<MockCard, 'id'>) {
  return card.id.startsWith('api-') || card.id.startsWith('admin-');
}

function apiExamTestToCard(item: Test): MockCard | null {
  if ((item.mode ?? 'PRACTICE') !== 'EXAM' || item.status !== 'PUBLISHED' || !item.title?.trim()) return null;
  const skill = normalizeExamSkill(item.skillName);
  if (!skill) return null;
  const meta = mockCardMeta[skill];
  const questionCount = item.questionCount ?? 0;
  const displayQuestionCount = skill === 'WRITING' && questionCount > 0 ? 4 : questionCount;
  return {
    id: `test-${item.id}`,
    practiceTestId: item.id,
    skill,
    label: meta.label,
    title: item.title.trim(),
    description: item.description?.trim() || 'Đề thi thử được import trong ngân hàng câu hỏi.',
    questions: displayQuestionCount ? `${displayQuestionCount}` : 'Chưa rõ',
    minutes: `${item.durationMinutes || 0} phút`,
    icon: meta.icon,
    ready: questionCount > 0,
    color: meta.color,
    featured: Boolean(item.featured)
  };
}

async function apiExamTestsToCards(items: Test[]) {
  const baseCards = items
    .map(apiExamTestToCard)
    .filter((card): card is MockCard => Boolean(card));
  const cards = await Promise.all(items.map(async (item) => {
    const card = apiExamTestToCard(item);
    if (!card) return [];
    if (card.skill !== 'WRITING' || !card.practiceTestId || !card.ready) return [card];

    try {
      const rows = await unwrap<Question[]>(api.get(`/questions?testId=${card.practiceTestId}`));
      return writingExamCardsFromQuestions(card, rows);
    } catch {
      return [card];
    }
  }));

  return [...createFullExamCards(baseCards), ...cards.flat()];
}

function createFullExamCards(cards: MockCard[]) {
  const groups = new Map<string, MockCard[]>();
  cards.forEach((card) => {
    if (card.skill === 'FULL' || !card.practiceTestId || !card.ready) return;
    const key = normalizeFullTestTitle(card.title);
    if (!key) return;
    groups.set(key, [...(groups.get(key) ?? []), card]);
  });

  return [...groups.values()].flatMap((group) => {
    const bySkill = new Map(group.map((card) => [card.skill, card]));
    if (!fullRequiredSkills.every((skill) => bySkill.has(skill))) return [];

    const skillTestIds = fullRequiredSkills.reduce<Partial<Record<Exclude<MockSkill, 'FULL'>, number>>>((result, skill) => {
      const id = bySkill.get(skill)?.practiceTestId;
      if (id) result[skill] = id;
      return result;
    }, {});
    const first = group[0];
    const totalMinutes = group.reduce((sum, card) => sum + Number.parseInt(card.minutes, 10), 0);
    return [{
      id: `test-full-${Object.values(skillTestIds).join('-')}`,
      skill: 'FULL' as const,
      skillTestIds,
      label: mockCardMeta.FULL.label,
      title: first.title,
      description: first.description || 'Đề full test gồm Speaking, Listening, Grammar, Reading và Writing.',
      questions: '5 kỹ năng',
      minutes: `${totalMinutes || 162} phút`,
      icon: mockCardMeta.FULL.icon,
      ready: true,
      color: mockCardMeta.FULL.color,
      featured: group.some((card) => card.featured)
    }];
  });
}

function normalizeFullTestTitle(title: string) {
  const normalized = removeVietnameseMarks(title)
    .toLowerCase()
    .replace(/\b(listening|speaking|reading|writing|grammar|vocabulary|full|mock|practice|thi thu|de thi)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || removeVietnameseMarks(title).toLowerCase().trim();
}

function fullSkillTestIdsFromExamTests(tests: Test[]) {
  const cards = tests
    .map(apiExamTestToCard)
    .filter((card): card is MockCard => Boolean(card && card.skill !== 'FULL' && card.practiceTestId && card.ready))
    .sort((first, second) => Number(second.featured) - Number(first.featured) || first.practiceTestId! - second.practiceTestId!);

  return fullRequiredSkills.reduce<Partial<Record<Exclude<MockSkill, 'FULL'>, number>>>((result, skill) => {
    const card = cards.find((item) => item.skill === skill);
    if (card?.practiceTestId) result[skill] = card.practiceTestId;
    return result;
  }, {});
}

function writingExamCardsFromQuestions(card: MockCard, questions: Question[]) {
  const cards = [...questions]
    .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0))
    .flatMap((question) => writingExamCardsFromQuestion(card, question));

  return cards.length ? cards : [card];
}

function writingExamCardsFromQuestion(card: MockCard, question: Question) {
  try {
    const data = JSON.parse(question.content);
    if (data?.template !== 'WRITING_CLUB_COLLECTION' || !Array.isArray(data.clubs)) return [];

    return data.clubs.map((club: Record<string, unknown>, clubIndex: number) => {
      const clubName = String(club.clubName ?? data.title ?? question.topic ?? card.title).trim() || card.title;
      const questionData = JSON.stringify({
        ...data,
        total: 1,
        title: clubName,
        clubs: [club]
      });

      return {
        ...card,
        id: `${card.id}-q${question.id}-club${clubIndex}`,
        title: clubName,
        description: card.title,
        questions: '4',
        questionData,
        ready: true,
        featured: Boolean(card.featured || question.featured)
      };
    });
  } catch {
    return [];
  }
}

function normalizeExamSkill(value?: string): Exclude<MockSkill, 'FULL'> | null {
  const normalized = removeVietnameseMarks(String(value ?? '')).toUpperCase();
  if (normalized.includes('LISTENING') || normalized.includes('NGHE')) return 'LISTENING';
  if (normalized.includes('SPEAKING') || normalized.includes('NOI')) return 'SPEAKING';
  if (normalized.includes('READING') || normalized.includes('DOC')) return 'READING';
  if (normalized.includes('WRITING') || normalized.includes('VIET')) return 'WRITING';
  if (normalized.includes('GRAMMAR') || normalized.includes('NGU PHAP')) return 'GRAMMAR';
  return null;
}

function removeVietnameseMarks(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function hasFeaturedMarker(value?: string) {
  return Boolean(value?.includes(FEATURED_MARKER));
}

function cleanFeaturedMarker(value?: string) {
  return (value ?? '').split(FEATURED_MARKER).join('').trim();
}

function mergeStoredFeatured(cards: MockCard[]) {
  const storedCards = loadPublishedAdminMockCards();
  const featuredMap = loadStoredFeaturedMap();

  return cards.map((card) => {
    const stored = storedCards.find((item) => {
      const storedId = item.id.replace(/^admin-/, '');
      const cardId = card.id.replace(/^api-/, '');
      return storedId === cardId
        || (item.skill === card.skill && item.title.trim().toLowerCase() === card.title.trim().toLowerCase());
    });
    return stored?.featured || storedFeaturedValue(card, featuredMap) ? { ...card, featured: true } : card;
  });
}

function mergeMockCardsByIdentity(cards: MockCard[]) {
  const merged = new Map<string, MockCard>();
  const byTitle = new Map<string, MockCard>();
  cards.forEach((card) => {
    const id = card.id.replace(/^(api|admin|test)-/, '');
    const key = `${card.skill}|${card.title.trim().toLowerCase()}|${id}`;
    const titleKey = `${card.skill}|${card.title.trim().toLowerCase()}`;
    const currentByTitle = byTitle.get(titleKey);
    byTitle.set(titleKey, currentByTitle ? preferredMockCard(currentByTitle, card) : card);

    const current = merged.get(key);
    merged.set(key, current ? preferredMockCard(current, card) : card);
  });

  return [...byTitle.values()];
}

function preferredMockCard(current: MockCard, next: MockCard) {
  const currentHasUploadedData = Boolean(current.questionData?.trim());
  const nextHasUploadedData = Boolean(next.questionData?.trim());
  if (nextHasUploadedData && !currentHasUploadedData) return { ...current, ...next };
  if (currentHasUploadedData && !nextHasUploadedData) {
    return { ...next, ...current, featured: Boolean(current.featured || next.featured) };
  }

  const currentIsMockUpload = current.id.startsWith('api-') || current.id.startsWith('admin-');
  const nextIsMockUpload = next.id.startsWith('api-') || next.id.startsWith('admin-');
  if (nextIsMockUpload && !currentIsMockUpload) return { ...current, ...next };
  if (currentIsMockUpload && !nextIsMockUpload) {
    return { ...next, ...current, featured: Boolean(current.featured || next.featured) };
  }

  return { ...current, ...next, featured: Boolean(current.featured || next.featured) };
}

function compareMockCards(left: MockCard, right: MockCard) {
  const featuredCompare = Number(Boolean(right.featured)) - Number(Boolean(left.featured));
  if (featuredCompare !== 0) return featuredCompare;

  const leftNumber = getMockCardOrderNumber(left);
  const rightNumber = getMockCardOrderNumber(right);
  if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) return leftNumber - rightNumber;
  if (leftNumber !== null && rightNumber === null) return -1;
  if (leftNumber === null && rightNumber !== null) return 1;

  return left.title.localeCompare(right.title, 'vi', { numeric: true, sensitivity: 'base' });
}

function getMockCardOrderNumber(card: MockCard) {
  const value = `${card.title} ${card.description}`;
  const patterns = [
    /\bpractice\s*test\s*(\d+)\b/i,
    /\bmock\s*test\s*(\d+)\b/i,
    /\btest\s*(\d+)\b/i,
    /#\s*0*(\d+)\b/i,
    /\b(?:de|d?)\s*0*(\d+)\b/i
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }
  return null;
}

function parseQuestionDataArray(questionData?: string) {
  if (!questionData?.trim()) return [];
  try {
    const parsed = JSON.parse(questionData);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const normalized = normalizeQuestionDataObject(parsed as Record<string, unknown>);
      return normalized.length > 0 ? normalized : [parsed];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [item];
      const normalized = normalizeQuestionDataObject(item as Record<string, unknown>);
      return normalized.length > 0 ? normalized : [item];
    });
  } catch {
    return [];
  }
}

function questionToMockData(question: Question, skill: MockSkill) {
  const metadata: Record<string, unknown> = { skill };
  if (question.topic?.trim()) metadata.topic = question.topic;
  if (question.audioUrl?.trim()) metadata.audioUrl = question.audioUrl;
  if (question.scriptText?.trim()) metadata.scriptText = question.scriptText;
  if (question.explanation?.trim()) metadata.explanation = question.explanation;
  if (question.answers?.length) metadata.answers = question.answers;

  try {
    const parsed = JSON.parse(question.content);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { ...parsed, ...metadata }
      : { ...metadata, prompt: String(parsed ?? question.content) };
  } catch {
    return {
      ...metadata,
      prompt: question.content
    };
  }
}

function normalizeQuestionDataObject(data: Record<string, unknown>) {
  if (data.template !== 'WRITING_CLUB_COLLECTION') {
    const directSkill = normalizeMockSkill(String(data.skill ?? ''));
    if (directSkill && Array.isArray(data.parts)) {
      return normalizeQuestionSection(data.parts, directSkill);
    }

    const skillSections: Array<[MockSkill, string[]]> = [
      ['SPEAKING', ['speaking']],
      ['LISTENING', ['listening']],
      ['GRAMMAR', ['grammar', 'grammarVocabulary', 'grammar_vocabulary']],
      ['READING', ['reading']],
      ['WRITING', ['writing']]
    ];
    return skillSections.flatMap(([skill, keys]) =>
      keys.flatMap((key) => normalizeQuestionSection(data[key], skill))
    );
  }

  const clubs = Array.isArray(data.clubs) ? data.clubs : [];
  return clubs.flatMap((club) => {
    if (!club || typeof club !== 'object') return [];
    const clubRow = club as Record<string, unknown>;
    const parts = Array.isArray(clubRow.parts) ? clubRow.parts : [];
    return parts
      .filter((part): part is Record<string, unknown> => Boolean(part && typeof part === 'object'))
      .map((part, index) => ({
        ...part,
        skill: 'WRITING',
        part: index + 1,
        clubName: String(clubRow.clubName ?? '').trim(),
        heading: String(part.instructions ?? part.heading ?? part.title ?? '').trim(),
        prompt: String(part.mainText ?? part.prompt ?? part.context ?? '').trim(),
        questions: Array.isArray(part.prompts) ? part.prompts : part.questions
      }));
  });
}

function normalizeQuestionSection(value: unknown, skill: MockSkill, inheritedPart = ''): Record<string, unknown>[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => normalizeQuestionSection(item, skill, inheritedPart));
  if (typeof value !== 'object') return [];

  const row = value as Record<string, unknown>;
  const rowPart = String(row.part ?? inheritedPart ?? '').trim();
  if (Array.isArray(row.parts)) {
    return normalizeQuestionSection(row.parts, skill, rowPart);
  }

  if (Array.isArray(row.questions) && (rowPart || row.skill || row.topic || row.audioUrl || row.audio_url || row.template)) {
    const parentFields = {
      skill: row.skill ?? skill,
      ...(rowPart ? { part: rowPart } : {}),
      ...(row.topic ? { topic: row.topic } : {}),
      ...(row.title ? { title: row.title } : {}),
      ...(row.instructions ? { instructions: row.instructions } : {}),
      ...(row.audioUrl ? { audioUrl: row.audioUrl } : {}),
      ...(row.audio_url ? { audio_url: row.audio_url } : {}),
      ...(row.scriptText ? { scriptText: row.scriptText } : {}),
      ...(row.script_text ? { script_text: row.script_text } : {}),
      ...(row.explanation ? { explanation: row.explanation } : {})
    };
    return row.questions.flatMap((question) => {
      if (!question || typeof question !== 'object') return [];
      return normalizeQuestionSection({ ...parentFields, ...(question as Record<string, unknown>) }, skill, rowPart);
    });
  }

  const partRows = Object.entries(row).filter(([key, child]) =>
    /^part\s*\d+$/i.test(key) && Boolean(child && typeof child === 'object')
  );
  if (partRows.length > 0) {
    return partRows.flatMap(([key, child]) =>
      normalizeQuestionSection(child, skill, key.replace(/\D+/g, ''))
    );
  }

  const sectionRows = Object.entries(row).filter(([key, child]) =>
    /^q\d+(?:_\d+)?$/i.test(key) && Boolean(child && typeof child === 'object')
  );
  if (sectionRows.length > 0) {
    return sectionRows.flatMap(([key, child]) =>
      normalizeQuestionSection(child, skill, inheritedPart).map((item) => ({
        ...item,
        section: item.section ?? key
      }))
    );
  }

  return [{
    ...row,
    skill: row.skill ?? skill,
    ...(rowPart && !row.part ? { part: rowPart } : {})
  }];
}

function getSpeakingTestDataFromCard(card?: MockCard | null): SpeakingTestData {
  const rows = parseQuestionDataArray(card?.questionData)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .filter((item) => {
      const skill = String(item.skill ?? '').toUpperCase();
      const template = String(item.template ?? '').toUpperCase();
      return !skill || skill === 'SPEAKING' || template.startsWith('SPEAKING_') || card?.skill === 'SPEAKING';
    });

  const part1 = rows.filter((item) => getSpeakingPart(item) === '1').flatMap((item) => speakingQuestionsFromItem(item));
  const part2Rows = rows.filter((item) => getSpeakingPart(item) === '2');
  const part2Row = part2Rows[0];
  const part2 = part2Row ? speakingQuestionsFromItem(part2Row) : [];
  const part2Image = part2Row ? speakingImageFromItem(part2Row, 1) : '';
  const part3 = rows.filter((item) => getSpeakingPart(item) === '3').flatMap((item) => speakingQuestionsFromItem(item));
  const part4Row = rows.find((item) => getSpeakingPart(item) === '4');
  const part4Questions = part4Row ? speakingQuestionsFromItem(part4Row) : [];
  const part4Title = String(part4Row?.title ?? part4Row?.topic ?? part4Row?.prompt ?? '').trim();
  const part4Image = part4Row ? speakingImageFromItem(part4Row, 1) : '';

  return {
    part1: part1.length > 0 ? part1 : speakingQuestions,
    part2: part2.length > 0 ? part2 : part2Questions,
    part2Image: part2Image || part2ImageUrls[0],
    part3: part3.length > 0 ? part3 : part3Questions,
    part4: {
      title: part4Title || part4Topic.title,
      image: part4Image || part4Topic.image,
      questions: part4Questions.length > 0 ? part4Questions : part4Topic.questions
    }
  };
}

function speakingImageFromItem(item: Record<string, unknown>, imageNumber?: 1 | 2): string {
  const directKeys = imageNumber === 2
    ? ['imageUrl2', 'image2Url', 'urlpic2', 'urlPic2', 'image2', 'picture2']
    : ['imageUrl', 'image1Url', 'urlpic1', 'urlPic1', 'image', 'image1', 'picture', 'picture1'];

  for (const key of directKeys) {
    const value = String(item[key] ?? '').trim();
    if (value) return value;
  }

  const nestedItems = [
    ...(Array.isArray(item.questions) ? item.questions : []),
    ...(Array.isArray(item.items) ? item.items : []),
    ...(Array.isArray(item.prompts) ? item.prompts : [])
  ];
  for (const nested of nestedItems) {
    if (!nested || typeof nested !== 'object') continue;
    const value: string = speakingImageFromItem(nested as Record<string, unknown>, imageNumber);
    if (value) return value;
  }

  return '';
}

function getSpeakingPart(item: Record<string, unknown>) {
  const part = String(item.part ?? '').trim();
  if (part) return part.replace(/^part\s*/i, '');

  const template = String(item.template ?? '').trim().toUpperCase();
  if (template === 'SPEAKING_PART1') return '1';
  if (template === 'SPEAKING_PART2') return '2';
  if (template === 'SPEAKING_PART3') return '3';
  if (template === 'SPEAKING_PART4') return '4';

  const searchableText = `${item.topic ?? ''} ${item.title ?? ''} ${item.prompt ?? ''}`.toLowerCase();
  const partMatch = searchableText.match(/\bpart\s*([1-4])\b/);
  if (partMatch?.[1]) return partMatch[1];
  return '';
}

function speakingQuestionsFromItem(item: Record<string, unknown>) {
  const items = Array.isArray(item.items) ? item.items : [];
  const questionItems = Array.isArray(item.questions) ? item.questions : [];
  const promptItems = Array.isArray(item.prompts) ? item.prompts : [];
  const objectQuestions = [...items, ...questionItems, ...promptItems].flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const row = value as Record<string, unknown>;
    return [
      row.question,
      row.prompt,
      row.question1,
      row.question2,
      row.question3
    ].map((text) => String(text ?? '').trim()).filter(Boolean);
  });
  if (objectQuestions.length > 0) return objectQuestions;

  const directQuestions = asStringArray(item.questions);
  if (directQuestions.length > 0) return directQuestions;

  const prompts = asStringArray(item.prompts);
  if (prompts.length > 0) return prompts;

  const itemQuestions = items.flatMap((value) => {
    if (value && typeof value === 'object') {
      const row = value as Record<string, unknown>;
      return [
        row.question,
        row.prompt,
        row.question1,
        row.question2,
        row.question3
      ].map((text) => String(text ?? '').trim()).filter(Boolean);
    }
    return [String(value ?? '').trim()].filter(Boolean);
  });
  if (itemQuestions.length > 0) return itemQuestions;

  return [
    item.question,
    item.prompt,
    item.question1,
    item.question2,
    item.question3
  ].map((value) => String(value ?? '').trim()).filter(Boolean);
}

function listeningQuestionsFromCard(card?: MockCard | null): ListeningPart1Question[] {
  const rows = parseQuestionDataArray(card?.questionData);
  return rows
    .filter((item): item is Record<string, unknown> => item && typeof item === 'object')
    .filter((item) => {
      const skill = String(item.skill ?? '').toUpperCase();
      const template = String(item.template ?? '').trim().toUpperCase();
      const part = String(item.part ?? '').trim().toLowerCase();
      const section = String(item.section ?? '').trim().toLowerCase();

      // Support both the normalized schema (part: 1) and the imported Aptis
      // Listening schema where questions 1-13 are marked as section: q1_13.
      const isPart1 = part
        ? part === '1' || part === 'part1'
        : !section || section === 'q1_13';

      return (!skill || skill === 'LISTENING') && isPart1 && !['LISTENING_PEOPLE_MATCH', 'LISTENING_OPINION_MATCH'].includes(template);
    })
    .reduce<ListeningPart1Question[]>((questions, item) => {
      const options = listeningOptionsFromItem(item);
      const prompt = String(item.prompt ?? item.question ?? item.content ?? item.topic ?? '').trim();
      if (!prompt || options.length === 0) return questions;
      questions.push({
        prompt,
        options,
        audioUrl: listeningAudioUrlsFromItem(item)[0] || undefined,
        answer: String(item.answer ?? '').trim() || undefined,
        correctAnswer: listeningCorrectAnswerFromItem(item) || undefined
      });
      return questions;
    }, [])
    .slice(0, 13);
}

function getListeningMatchingDataFromCard(card?: MockCard | null): ListeningMatchingData {
  const rows = parseQuestionDataArray(card?.questionData)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .filter((item) => {
      const skill = String(item.skill ?? '').toUpperCase();
      const template = String(item.template ?? '').trim().toUpperCase();
      const part = String(item.part ?? '').trim().toLowerCase().replace(/^part\s*/, '');
      const section = String(item.section ?? '').trim().toLowerCase();
      return (!skill || skill === 'LISTENING') && (template === 'LISTENING_PEOPLE_MATCH' || part === '2' || section === 'q14');
    });

  const row = rows[0];
  if (!row) {
    return {
      prompt: 'Protect the environment',
      options: listeningMatchingOptions,
      speakers: ['Speaker A ...', 'Speaker B ...', 'Speaker C ...', 'Speaker D ...'],
      answerKey: listeningMatchingAnswerKey
    };
  }

  const options = asStringArray(row.options).length > 0 ? asStringArray(row.options) : listeningOptionsFromItem(row);
  const speakers = asStringArray(row.rows).length > 0 ? asStringArray(row.rows) : ['Speaker A', 'Speaker B', 'Speaker C', 'Speaker D'];
  const correctAnswers = asStringArray(row.correctAnswers);
  const answerKey = speakers.reduce<Record<string, string>>((result, speaker, index) => {
    result[speaker] = correctAnswers[index] ?? '';
    return result;
  }, {});

  return {
    prompt: String(row.topic ?? row.prompt ?? row.content ?? 'Protect the environment').trim(),
    options: options.length > 0 ? options : listeningMatchingOptions,
    speakers,
    answerKey,
    audioUrl: listeningAudioUrlsFromItem(row)[0] || undefined
  };
}

function getListeningShortDataFromCard(card?: MockCard | null): ListeningShortData {
  const rows = parseQuestionDataArray(card?.questionData)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .filter((item) => {
      const skill = String(item.skill ?? '').toUpperCase();
      const template = String(item.template ?? '').trim().toUpperCase();
      const part = String(item.part ?? '').trim().toLowerCase().replace(/^part\s*/, '');
      const section = String(item.section ?? '').trim().toLowerCase();
      return (!skill || skill === 'LISTENING') && (template === 'LISTENING_OPINION_MATCH' || part === '3' || section === 'q15');
    });

  const row = rows[0];
  if (!row) {
    return {
      topic: 'There is too much information on the Internet',
      prompt: 'Who expresses which opinion?',
      statements: listeningShortStatements,
      options: listeningSpeakerOptions,
      answerKey: listeningShortAnswerKey
    };
  }

  const statements = asStringArray(row.statements).length > 0
    ? asStringArray(row.statements)
    : splitLines(String(row.content ?? row.prompt ?? '')).filter(Boolean);
  const options = asStringArray(row.options).length > 0 ? asStringArray(row.options) : listeningOptionsFromItem(row);
  const correctAnswers = asStringArray(row.correctAnswers);
  const directCorrectAnswer = listeningCorrectAnswerFromItem(row);

  return {
    topic: String(row.topic ?? row.title ?? 'Listening Part 3').trim(),
    prompt: String(row.instructions ?? (statements.length > 1 ? 'Who expresses which opinion?' : '')).trim(),
    statements: statements.length > 0 ? statements : listeningShortStatements,
    options: options.length > 0 ? options : listeningSpeakerOptions,
    answerKey: correctAnswers.length > 0 ? correctAnswers : directCorrectAnswer ? [directCorrectAnswer] : listeningShortAnswerKey,
    audioUrl: listeningAudioUrlsFromItem(row)[0] || undefined
  };
}

function getListeningMonologuesFromCard(card?: MockCard | null): ListeningMonologueData[] {
  const rows = parseQuestionDataArray(card?.questionData)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .filter((item, rowIndex) => {
      const skill = String(item.skill ?? '').toUpperCase();
      const template = String(item.template ?? '').trim().toUpperCase();
      const variant = String(item.variant ?? '').trim().toUpperCase();
      const part = String(item.part ?? '').trim().toLowerCase().replace(/^part\s*/, '');
      const section = String(item.section ?? '').trim().toLowerCase();
      const isPart4Template = template === 'LISTENING_AUDIO_MC' && variant !== 'PART1' && !['q1_13', 'q14', 'q15'].includes(section);
      return (!skill || skill === 'LISTENING') && (part === '4' || section === 'q16' || section === 'q17' || (isPart4Template && rowIndex >= 15));
    });

  const monologues = rows.reduce<ListeningMonologueData[]>((result, row) => {
    const groups = Array.isArray(row.groups) ? row.groups : [];
    const questions = groups.flatMap((group) => {
      if (!group || typeof group !== 'object') return [];
      const groupRow = group as Record<string, unknown>;
      const prompt = String(groupRow.prompt ?? groupRow.question ?? '').trim();
      const options = asStringArray(groupRow.options).length > 0 ? asStringArray(groupRow.options) : listeningOptionsFromItem(groupRow);
      if (!prompt || options.length === 0) return [];
      return [{
        prompt,
        options,
        answer: String(groupRow.answer ?? '').trim() || undefined,
        correctAnswer: String(groupRow.correctAnswer ?? '').trim() || undefined
      }];
    });

    if (questions.length > 0) {
      result.push({
        audioUrl: listeningAudioUrlsFromItem(row)[0] || undefined,
        questions
      });
      return result;
    }

    const prompt = String(row.prompt ?? row.question ?? row.content ?? '').trim();
    const options = listeningOptionsFromItem(row);
    if (!prompt || options.length === 0) return result;

    result.push({
      audioUrl: listeningAudioUrlsFromItem(row)[0] || undefined,
      questions: [{
        prompt,
        options,
        answer: String(row.answer ?? '').trim() || undefined,
        correctAnswer: listeningCorrectAnswerFromItem(row) || undefined
      }]
    });
    return result;
  }, []);

  return monologues.length > 0 ? monologues : listeningMonologues.map((recording) => ({ ...recording, audioUrl: undefined }));
}

function getListeningMonologueAnswerKey(monologues: ListeningMonologueData[]) {
  return monologues.reduce<Record<string, string>>((result, recording, recordingIndex) => {
    recording.questions.forEach((question, questionIndex) => {
      result[`${recordingIndex}-${questionIndex}`] = question.correctAnswer ?? question.answer ?? listeningMonologueAnswerKey[`${recordingIndex}-${questionIndex}`] ?? '';
    });
    return result;
  }, {});
}

function listeningOptionsFromItem(item: Record<string, unknown>) {
  if (Array.isArray(item.options)) return item.options.map(String).map((option) => option.trim()).filter(Boolean);

  if (Array.isArray(item.answers)) {
    return item.answers
      .map((answer) => {
        if (answer && typeof answer === 'object') {
          const row = answer as Record<string, unknown>;
          return String(row.content ?? row.text ?? row.label ?? row.answer ?? '').trim();
        }
        return String(answer ?? '').trim();
      })
      .filter(Boolean);
  }

  return [
    item.optionA,
    item.optionB,
    item.optionC,
    item.optionD,
    item.answer1,
    item.answer2,
    item.answer3,
    item.answer4,
    item.answer5,
    item.answer6
  ].map((option) => String(option ?? '').trim()).filter(Boolean);
}

function listeningCorrectAnswerFromItem(item: Record<string, unknown>) {
  const direct = String(item.correctAnswer ?? item.answer ?? '').trim();
  if (direct) return direct;

  const correctIndex = Number.parseInt(String(item.correctIndex ?? item.correct_index ?? '').trim(), 10);
  if (Number.isFinite(correctIndex) && correctIndex > 0) {
    const indexedAnswer = String(item[`answer${correctIndex}`] ?? '').trim();
    if (indexedAnswer) return indexedAnswer;
  }

  if (!Array.isArray(item.answers)) return '';
  const correct = item.answers.find((answer) => Boolean(answer && typeof answer === 'object' && (answer as Record<string, unknown>).correct));
  if (!correct || typeof correct !== 'object') return '';
  const row = correct as Record<string, unknown>;
  return String(row.content ?? row.text ?? row.label ?? row.answer ?? '').trim();
}

function listeningAudioUrlsFromItem(item: Record<string, unknown>, depth = 0): string[] {
  if (depth > 3) return [];

  const directKeys = [
    'audioUrl',
    'audio_url',
    'audio',
    'audioLink',
    'audio_link',
    'linkAudio',
    'link_audio',
    'linkAudioNghe',
    'link_audio_nghe',
    'recordingUrl',
    'recording_url',
    'url',
    'fileUrl',
    'file_url',
    'src',
    'source',
    'audioFile',
    'audio_file'
  ];

  const urls = directKeys
    .map((key) => stringValue(item[key]))
    .filter(Boolean);

  const arrayKeys = ['audioUrls', 'audio_urls', 'audios', 'files'];
  arrayKeys.forEach((key) => {
    const value = item[key];
    if (!Array.isArray(value)) return;
    value.forEach((entry) => {
      if (entry && typeof entry === 'object') {
        urls.push(...listeningAudioUrlsFromItem(entry as Record<string, unknown>, depth + 1));
      } else {
        const url = stringValue(entry);
        if (url) urls.push(url);
      }
    });
  });

  const nestedKeys = ['data', 'questionData', 'media'];
  nestedKeys.forEach((key) => {
    const value = item[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      urls.push(...listeningAudioUrlsFromItem(value as Record<string, unknown>, depth + 1));
    }
  });

  const nestedArrayKeys = ['questions', 'items', 'prompts', 'records', 'children'];
  nestedArrayKeys.forEach((key) => {
    const value = item[key];
    if (!Array.isArray(value)) return;
    value.forEach((entry) => {
      if (entry && typeof entry === 'object') {
        urls.push(...listeningAudioUrlsFromItem(entry as Record<string, unknown>, depth + 1));
      }
    });
  });

  return Array.from(new Set(urls.map((url) => normalizeAudioUrl(url)).filter(Boolean)));
}

function stringValue(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  return '';
}

function splitLines(value: string) {
  return value
    .split(/\r?\n|[;|]/)
    .map((line) => line.replace(/^\s*(?:\d+[\).:-]?|[-*])\s*/, '').trim())
    .filter(Boolean);
}

function listeningAudioByPartFromCard(card?: MockCard | null) {
  const rows = parseQuestionDataArray(card?.questionData);
  return rows.reduce<Record<string, string>>((result, item, rowIndex) => {
    if (!item || typeof item !== 'object') return result;

    const row = item as Record<string, unknown>;
    const skill = String(row.skill ?? '').toUpperCase();
    if (skill && skill !== 'LISTENING') return result;

    const audioUrls = listeningAudioUrlsFromItem(row);
    if (audioUrls.length === 0) return result;

    const rawPart = String(row.part ?? '').trim().toLowerCase();
    const section = String(row.section ?? '').trim().toLowerCase();
    const template = String(row.template ?? '').trim().toUpperCase();
    const variant = String(row.variant ?? '').trim().toUpperCase();
    let key = rawPart ? rawPart.replace('part', '') : '';

    // Map the source Listening sections to the four Aptis UI parts.
    if (!key) {
      if (section === 'q14') key = '2';
      else if (section === 'q15') key = '3';
      else if (section === 'q16') key = '4-0';
      else if (section === 'q17') key = '4-1';
      else if (section === 'q1_13') key = '1';
      else if (template === 'LISTENING_PEOPLE_MATCH') key = '2';
      else if (template === 'LISTENING_OPINION_MATCH') key = '3';
      else if (template === 'LISTENING_AUDIO_MC' && variant !== 'PART1' && rowIndex >= 15) key = `4-${rowIndex - 15}`;
    }

    if (key === '4') {
      const recordingIndex = Object.keys(result).filter((itemKey) => /^4-\d+$/.test(itemKey)).length;
      result[`4-${recordingIndex}`] = audioUrls[0];
      if (!result['4']) result['4'] = audioUrls[0];
    } else if (key) {
      result[key] = audioUrls[0];
    }
    if (key === '4' && audioUrls.length > 1) {
      audioUrls.forEach((audioUrl, index) => {
        result[`4-${index}`] = audioUrl;
      });
    }

    // Backward compatibility for older Part 4 data that expected a single key.
    if (section === 'q16' && !result['4']) result['4'] = audioUrls[0];

    return result;
  }, {});
}

function grammarQuestionsFromCard(card?: MockCard | null): GrammarQuestionItem[] {
  const rows = parseQuestionDataArray(card?.questionData)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .filter((item) => {
      const skill = String(item.skill ?? '').toUpperCase();
      return !skill || skill === 'GRAMMAR' || skill === 'GRAMMAR_VOCABULARY';
    });

  const questions = rows.reduce<GrammarQuestionItem[]>((questions, item) => {
    const prompt = String(item.prompt ?? item.question ?? '').trim();
    const options = Array.isArray(item.options) ? item.options.map(String).map((option) => option.trim()).filter(Boolean) : [];
    const answer = String(item.answer ?? item.correctAnswer ?? '').trim() || options[0] || undefined;
    const part = Number(item.part ?? 1);
    const type = String(item.type ?? '').toLowerCase();
    const questionStart = String(item.questionStart ?? '').trim();
    const questionEnd = String(item.questionEnd ?? '').trim();

    if (!prompt || options.length === 0 || !answer) return questions;

    if (part === 1 || type.includes('grammar')) {
      questions.push({ prompt, options, answer });
      return questions;
    }

    if (part === 3 || type.includes('definition')) {
      questions.push({
        options,
        definitionMode: 'matching' as const,
        definitionRows: [{ definition: prompt, answer }]
      });
      return questions;
    }

    if (part === 4 || questionStart || questionEnd) {
      questions.push({
        options,
        sentenceRows: [{
          before: questionStart || prompt.split(/_{2,}/)[0] || prompt,
          after: questionEnd || prompt.split(/_{2,}/).slice(1).join(' ').trim(),
          answer
        }]
      });
      return questions;
    }

    if (part === 6) {
      questions.push({ options, collocationRows: [{ word: prompt, answer }] });
      return questions;
    }

    questions.push({ options, matchRows: [{ word: prompt, answer }] });
    return questions;
  }, []);

  return questions.length > 0 ? questions : grammarQuestions;
}

function getReadingTestDataFromCard(card?: MockCard | null): ReadingTestData {
  const rows = parseQuestionDataArray(card?.questionData)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .filter((item) => {
      const skill = String(item.skill ?? '').toUpperCase();
      const template = String(item.template ?? '').toUpperCase();
      if (template.startsWith('READING_')) return true;
      if (card?.skill === 'READING' && getReadingPart(item)) return true;
      return !skill || skill === 'READING';
    });

  const gapRows = rows.filter((item) => getReadingPart(item) === '1');
  const gaps = gapRows.flatMap((item) => readingGapRowsFromItem(item))
    .filter((item) => item.options.length > 0 && (item.prompt || item.questionStart || item.questionEnd));

  const cohesionRows = rows.filter((item) => ['2', '3'].includes(getReadingPart(item))
    || String(item.template ?? '').trim().toUpperCase() === 'READING_SENTENCE_ORDER');
  const cohesion = cohesionRows.map((row, index) => {
    const correctOrder = readingCorrectOrderFromItem(row);
    const choices = readingDisplayOrderFromItem(row, correctOrder);
    return {
      title: String(row?.topic ?? `Part ${index + 2}`).trim(),
      choices,
      correctOrder
    };
  }).filter((item) => item.correctOrder.length > 0);

  const part4Rows = rows.filter((item) => getReadingPart(item) === '4');
  const context = readingForumContextFromRows(part4Rows);
  const forumQuestions = part4Rows.flatMap((item) => asStringArray(item.questions).length > 0
    ? asStringArray(item.questions)
    : [String(item.prompt ?? item.question ?? '').trim()].filter(Boolean));
  const forumAnswers = part4Rows.flatMap((item) => asStringArray(item.correctAnswers).length > 0
    ? asStringArray(item.correctAnswers)
    : [String(item.answer ?? item.correctAnswer ?? '').trim()].filter(Boolean));
  const forumIntroText = context.find((line) => !/^<strong>[A-D]:/i.test(line))
    ?? String(part4Rows[0]?.leftTitle ?? '').trim();
  const forumIntro = forumIntroText || undefined;
  const opinion = {
    people: peopleFromReadingContext(context),
    questions: forumQuestions,
    correctAnswers: forumAnswers,
    intro: forumIntro,
    topic: String(part4Rows[0]?.topic ?? '').trim() || undefined
  };

  const part5Row = rows.find((item) => getReadingPart(item) === '5');
  const longOptions = asStringArray(part5Row?.options);
  const paragraphs = asStringArray(part5Row?.paragraphs);
  const longCorrectAnswers = asStringArray(part5Row?.correctAnswers).length > 0
    ? asStringArray(part5Row?.correctAnswers).map((answer) => resolveOptionLabel(String(answer), longOptions)).filter(Boolean)
    : paragraphs.map((_, index) => longOptions[index] ?? '');
  const long = {
    title: String(part5Row?.topic ?? 'Long Reading').trim(),
    headings: rotateChoices(longOptions),
    paragraphs,
    correctAnswers: longCorrectAnswers
  };

  return {
    gaps,
    cohesion,
    opinion: opinion.people.length > 0 && opinion.questions.length > 0 ? opinion : emptyReadingTestData.opinion,
    long: long.headings.length > 0 && long.paragraphs.length > 0 ? long : emptyReadingTestData.long
  };
}

function getReadingPart(item: Record<string, unknown>) {
  const part = String(item.part ?? '').trim();
  if (part) return part.replace(/^part\s*/i, '');

  const template = String(item.template ?? '').trim().toUpperCase();
  if (template === 'READING_GAP_FILL') return '1';
  if (template === 'READING_SENTENCE_ORDER') {
    const topic = String(item.topic ?? item.title ?? '').toLowerCase();
    return topic.includes('part 3') ? '3' : '2';
  }
  if (template === 'READING_FORUM_MATCH') return '4';
  if (template === 'READING_HEADING_MATCH') return '5';

  const searchableText = removeVietnameseMarks([
    item.topic,
    item.title,
    item.instructions,
    item.prompt,
    item.question
  ].map((value) => String(value ?? '')).join(' ')).toLowerCase();
  if (searchableText.includes('gap') || searchableText.includes('fits in each gap')) return '1';
  if (searchableText.includes('right order') || searchableText.includes('sentence order') || searchableText.includes('sap xep')) {
    return searchableText.includes('part 3') ? '3' : '2';
  }
  if (searchableText.includes('forum') || searchableText.includes('opinion matching')) return '4';
  if (searchableText.includes('heading') || searchableText.includes('long reading')) return '5';

  return '';
}

function readingGapRowsFromItem(item: Record<string, unknown>): ReadingGapQuestion[] {
  const nestedRows = Array.isArray(item.rows) ? item.rows : [];
  if (nestedRows.length > 0) {
    const sharedOptions = asStringArray(item.answerOptions).length > 0 ? asStringArray(item.answerOptions) : asStringArray(item.options);
    const correctAnswers = asStringArray(item.correctAnswers);
    return nestedRows
      .map((row, index) => {
        if (row && typeof row === 'object') {
          const rowData = row as Record<string, unknown>;
          return {
            prompt: String(rowData.prompt ?? '').trim() || undefined,
            questionStart: String(rowData.questionStart ?? '').trim() || undefined,
            questionEnd: String(rowData.questionEnd ?? '').trim() || undefined,
            options: asStringArray(rowData.answerOptions).length > 0 ? asStringArray(rowData.answerOptions) : asStringArray(rowData.options).length > 0 ? asStringArray(rowData.options) : sharedOptions,
            answer: String(rowData.correctAnswer ?? rowData.answer ?? correctAnswers[index] ?? '').trim()
          };
        }

        const parts = String(row ?? '').split(/_{2,}/);
        return {
          prompt: String(row ?? '').trim() || undefined,
          questionStart: (parts[0] ?? '').trim(),
          questionEnd: parts.slice(1).join('___').trim(),
          options: sharedOptions,
          answer: correctAnswers[index] ?? ''
        };
      });
  }

  return [{
    prompt: String(item.prompt ?? '').trim() || undefined,
    questionStart: String(item.questionStart ?? '').trim() || undefined,
    questionEnd: String(item.questionEnd ?? '').trim() || undefined,
    options: asStringArray(item.answerOptions).length > 0 ? asStringArray(item.answerOptions) : asStringArray(item.options),
    answer: String(item.answer ?? item.correctAnswer ?? '').trim()
  }];
}

function readingCorrectOrderFromItem(item?: Record<string, unknown>) {
  const correctSentences = asStringArray(item?.correctSentences);
  if (correctSentences.length > 0) return correctSentences;

  const sentences = asStringArray(item?.sentences);
  if (sentences.length > 0) return sentences;

  const items = Array.isArray(item?.items) ? item?.items : [];
  return items.map((item) => {
    if (item && typeof item === 'object') return String((item as Record<string, unknown>).text ?? '').trim();
    return String(item ?? '').trim();
  }).filter(Boolean);
}

function readingDisplayOrderFromItem(item: Record<string, unknown> | undefined, correctOrder: string[]) {
  const displaySentences = asStringArray(item?.displaySentences);
  if (displaySentences.length > 0) return displaySentences;

  const sentences = asStringArray(item?.sentences);
  if (sentences.length > 0) return sentences;

  return rotateChoices(correctOrder);
}

function readingForumContextFromRows(rows: Record<string, unknown>[]) {
  const context = asStringArray(rows[0]?.context);
  if (context.length > 0) return context;

  const leftTitle = String(rows[0]?.leftTitle ?? '').trim();
  return [
    leftTitle,
    ...asStringArray(rows[0]?.opinions)
  ].filter(Boolean);
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}

function rotateChoices(values: string[]) {
  if (values.length <= 1) return values;
  const split = Math.ceil(values.length / 2);
  return [...values.slice(split), ...values.slice(0, split)];
}

function resolveOptionLabel(value: string, options: string[]) {
  const answer = value.trim();
  if (!answer) return '';
  const exactMatch = options.find((option) => sameAnswer(option, answer));
  if (exactMatch) return exactMatch;

  if (/^[A-Z]$/i.test(answer)) {
    const optionIndex = answer.toUpperCase().charCodeAt(0) - 65;
    return options[optionIndex] ?? answer;
  }

  const numberedMatch = answer.match(/^(\d+)[).:-]?\s*(.*)$/);
  if (numberedMatch?.[2]) {
    const label = numberedMatch[2].trim();
    return options.find((option) => sameAnswer(option, label)) ?? label;
  }

  return answer;
}

function peopleFromReadingContext(context: string[]) {
  return context.reduce<{ label: string; text: string }[]>((people, line) => {
    const match = line.match(/^<strong>([A-D]):<\/strong>\s*(.*)$/i);
    if (!match) return people;
    people.push({ label: match[1].toUpperCase(), text: match[2] });
    return people;
  }, []);
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, '').trim();
}

const speakingMockTests = [
  { id: 1, title: 'Speaking Practice Test 1', subtitle: 'Part 1 of 4', questions: 4, minutes: 12 }
];

const grammarQuestions: GrammarQuestionItem[] = [
  { prompt: 'My father, ___ is a dentist, told me not to drink sugary drinks.', options: ['who', 'which', 'that'], answer: 'who' },
  { prompt: 'If I ___ more time, I would learn another language.', options: ['have', 'had', 'will have'], answer: 'had' },
  { prompt: 'She has lived in this city ___ 2019.', options: ['for', 'since', 'during'], answer: 'since' },
  { prompt: 'The train was delayed, ___ we arrived late.', options: ['because', 'so', 'although'], answer: 'so' },
  { prompt: 'I am interested ___ learning about other cultures.', options: ['in', 'on', 'at'], answer: 'in' },
  { prompt: 'This is the best film I have ___ seen.', options: ['ever', 'never', 'yet'], answer: 'ever' },
  { prompt: 'Could you tell me where ___?', options: ['is the station', 'the station is', 'does the station'], answer: 'the station is' },
  { prompt: 'They ___ dinner when I called them.', options: ['have', 'were having', 'are having'], answer: 'were having' },
  { prompt: 'You should ___ your homework before watching TV.', options: ['finish', 'to finish', 'finishing'], answer: 'finish' },
  { prompt: 'The room was ___ small for all the guests.', options: ['too', 'enough', 'such'], answer: 'too' },
  { prompt: 'I have never been to Canada, ___ I would like to go.', options: ['but', 'or', 'because'], answer: 'but' },
  { prompt: 'The book ___ I borrowed was very useful.', options: ['where', 'which', 'who'], answer: 'which' },
  { prompt: 'She speaks English ___ than her brother.', options: ['good', 'better', 'best'], answer: 'better' },
  { prompt: 'We need to leave now, ___ we will miss the bus.', options: ['otherwise', 'however', 'despite'], answer: 'otherwise' },
  { prompt: 'There are ___ apples in the fridge.', options: ['a few', 'much', 'any'], answer: 'a few' },
  { prompt: 'He is responsible ___ managing the team.', options: ['for', 'to', 'with'], answer: 'for' },
  { prompt: 'I wish I ___ play the piano.', options: ['can', 'could', 'will'], answer: 'could' },
  { prompt: 'The meeting has been ___ until Friday.', options: ['put off', 'put on', 'put out'], answer: 'put off' },
  { prompt: 'She asked me ___ I was from.', options: ['where', 'what', 'when'], answer: 'where' },
  { prompt: 'I prefer tea ___ coffee.', options: ['than', 'to', 'from'], answer: 'to' },
  { prompt: 'The exam was not as difficult ___ I expected.', options: ['as', 'than', 'like'], answer: 'as' },
  { prompt: 'They have already ___ the tickets.', options: ['buy', 'bought', 'buying'], answer: 'bought' },
  { prompt: 'Please speak more ___; I cannot hear you.', options: ['loud', 'loudly', 'louder'], answer: 'loudly' },
  { prompt: 'The restaurant ___ we had lunch was very busy.', options: ['where', 'which', 'who'], answer: 'where' },
  { prompt: 'I am looking forward ___ from you soon.', options: ['hear', 'to hearing', 'hearing'], answer: 'to hearing' },
  {
    options: ['make', 'select', 'shut', 'develop', 'look after', 'repair', 'begin'],
    matchRows: [
      { word: 'create', answer: 'make' },
      { word: 'choose', answer: 'select' },
      { word: 'close', answer: 'shut' },
      { word: 'improve', answer: 'develop' },
      { word: 'care', answer: 'look after' }
    ]
  },
  {
    options: ['argue', 'train', 'receive', 'repay', 'agree', 'borrow', 'return'],
    definitionMode: 'completion',
    definitionRows: [
      { definition: 'To oppose someone is to...', answer: 'argue' },
      { definition: 'To teach someone is to...', answer: 'train' },
      { definition: 'To accept something is to...', answer: 'receive' },
      { definition: 'To get something is to...', answer: 'receive' },
      { definition: 'To pay someone is to...', answer: 'repay' }
    ]
  },
  {
    options: ['passionate', 'curious', 'artificial', 'unclear', 'smooth', 'ordinary', 'empty'],
    definitionMode: 'matching',
    definitionRows: [
      { definition: 'Having a lot of strong emotion.', answer: 'passionate' },
      { definition: 'Wanting to know or learn something.', answer: 'curious' },
      { definition: 'Not natural or real.', answer: 'artificial' },
      { definition: 'Not clear and difficult to understand or see.', answer: 'unclear' },
      { definition: 'Having a flat, even surface.', answer: 'smooth' }
    ]
  },
  {
    options: ['corridor', 'discipline', 'wardrobe', 'fringe', 'museum', 'garden', 'traffic'],
    sentenceRows: [
      { before: 'He had to walk down a long dark', after: 'to get to his room.', answer: 'corridor' },
      { before: 'The teacher should maintain', after: 'in the classroom to make the lesson effective.', answer: 'discipline' },
      { before: 'She opened the', after: 'and took a coat out of it.', answer: 'wardrobe' },
      { before: 'You should cut your', after: 'regularly otherwise your hair will get in your eyes.', answer: 'fringe' },
      { before: 'The local', after: 'has an exhibit about the history of this area.', answer: 'museum' }
    ]
  },
  {
    options: ['idea', 'track', 'road', 'pace', 'chores', 'painting', 'training'],
    collocationRows: [
      { word: 'abstract', answer: 'idea' },
      { word: 'athletics', answer: 'track' },
      { word: 'congested', answer: 'road' },
      { word: 'frantic', answer: 'pace' },
      { word: 'housework', answer: 'chores' }
    ]
  }
];

const speakingQuestions = [
  'Please tell me about your family.',
  'What do you usually do in your free time?',
  'Tell me about a place in your city that you like.'
];
const speakingSampleAnswers = [
  'I live with my parents and my younger sister. We are quite close, and we usually have dinner together in the evening. My parents are supportive, and my sister is friendly and funny.',
  'In my free time, I usually listen to music, watch short English videos, or go out for coffee with my friends. I also try to practise English speaking for a few minutes every day.',
  'One place I like in my city is a small park near my house. It is quiet, clean, and has many trees. I often go there to walk, relax, and clear my mind after studying.'
];

const speakingInstructionsSpeechText = 'Aptis General Speaking Test Instructions. Speaking. You will answer some questions about yourself and then do three short speaking tasks. Listen to the instructions and questions, then speak clearly into your microphone after you hear the signal. Each part of the test will appear automatically. The test will take about 12 minutes. When you click on the Next button, the test will begin.';
const promptSpeechText = 'Part One. In this part, I am going to ask you three short questions about yourself and your interests. You will have 30 seconds to reply to each question. Begin speaking when you hear this sound.';
const part2PromptSpeechText = "Part Two. In this part, I'm going to ask you to describe a picture. Then I will ask you two questions about it. You will have 45 seconds for each response. Begin speaking when you hear this sound.";
const part3PromptSpeechText = "Part Three. In this part, I'm going to ask you to compare two pictures, and I will then ask you two questions about them. You will have 45 seconds for each response. Begin speaking when you hear this sound.";
const part4PromptSpeechText = 'Part Four. In this part, you will discuss a topic. You will have 60 seconds to prepare and 120 seconds to speak. Begin speaking when you hear this sound.';

function playSpeakingBeep() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return Promise.resolve();

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.25, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.28);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.3);

  return new Promise<void>((resolve) => {
    oscillator.onended = () => {
      audioContext.close().catch(() => undefined);
      resolve();
    };
  });
}

const fallbackReadingTestData: ReadingTestData = {
  gaps: [
    { questionStart: "I didn't ", questionEnd: ' it.', options: ['see', 'watch', 'look', 'view'], answer: 'see' },
    { questionStart: 'I buy some food at the ', questionEnd: '.', options: ['shop', 'store', 'market', 'restaurant'], answer: 'store' },
    { questionStart: 'I ate ', questionEnd: '.', options: ['lunch', 'breakfast', 'dinner', 'meal'], answer: 'lunch' },
    { questionStart: 'I ', questionEnd: ' a program on TV.', options: ['watched', 'saw', 'looked', 'read'], answer: 'watched' }
  ],
  cohesion: [
    {
      title: 'Tom Harper',
      choices: [
        'he almost left the magazine, but then he decided to create some unusual new characters',
        'the characters he imagined were one of the most famous in the world',
        'this popularity made Tom Harper rich and successful.',
        'he soon wrote regularly for the magazine, but he was not satisfied',
        'When he was young, he began writing short stories for a magazine'
      ],
      correctOrder: [
        'the characters he imagined were one of the most famous in the world',
        'this popularity made Tom Harper rich and successful.',
        'he almost left the magazine, but then he decided to create some unusual new characters',
        'When he was young, he began writing short stories for a magazine',
        'he soon wrote regularly for the magazine, but he was not satisfied'
      ]
    },
    {
      title: 'A scientist',
      choices: [
        'These were so advanced that he soon became famous all over the world',
        'As a child, he moved to a special school because he was so clever',
        'Princeton University in the USA offered him a job because he was so famous.',
        'His best friend in his new class was a girl named Lavime',
        'She later became his wife and helped him with his earliest scientific discoveries'
      ],
      correctOrder: [
        'Princeton University in the USA offered him a job because he was so famous.',
        'These were so advanced that he soon became famous all over the world',
        'His best friend in his new class was a girl named Lavime',
        'As a child, he moved to a special school because he was so clever'
      ]
    }
  ],
  opinion: {
    topic: 'Flying and air travel',
    people: [
      {
        label: 'A',
        text: 'I was a businessman so I had to fly many times a week. I had to go to other countries to be able to sign wine trading contracts with them. I felt very tired every time I have to fly. Now, my sister and I, whenever we have free time, take the train together and we enjoy that time very much because I can travel while sightseeing and relax without any stress.'
      },
      {
        label: 'B',
        text: 'My family and siblings live quite far from me. So I often have to fly to visit them every month when I have time. We really appreciate the time we spend together and we are happy to be able to meet each other and share our new story. I know that traveling by plane too much is not good for the environment so I often shop online or go to work by bike instead of going by car or I reuse plastic bags and paper bags. In addition, I sometimes volunteer to clean up trash in the neighborhood.'
      },
      {
        label: 'C',
        text: 'I have a dream that I work as a tour guide. So I understand that I will have to fly to other countries. In my personal opinion, airplanes are currently too cheap compared to the damage they cause to the environment, so I believe we should add taxes to airline ticket prices to make people choose to use other means of transport before they think about flying. I believe that people are also very happy when they can contribute to protecting the environment.'
      },
      {
        label: 'D',
        text: 'If I have to go somewhere I will choose other means of public transport, not the plane. Every time I go on a plane I feel extremely tired and I just hope time passes quickly so I can get off that plane. However, due to the specific nature of my job, I have to film in many different locations, so sometimes I cannot avoid having to take this public transportation.'
      }
    ],
    questions: [
      'try to protect the environment',
      'Sometimes cannot avoid flying because of filming work',
      'Find flying tiring and try to avoid it',
      'suggest making flights more expensive',
      'want to work in other countries',
      'like relaxing while they travel',
      'visit relatives regularly'
    ],
    correctAnswers: ['B', 'D', 'A', 'C', 'C', 'A', 'B']
  },
  long: {
    title: 'Charles Dicken',
    headings: [
      'A global writer',
      'Difficult language',
      'A famous tragedy',
      'A lasting legacy',
      'Early success',
      'Protecting his reputation',
      'Remembering Dickens'
    ],
    paragraphs: [
      "The popularity of Dickens's works in our time remains a global phenomenon. Although he wrote his novels in the 19th century, his works have had a global impact. In addition, these masterpieces helped connect Renaissance drama to the multimedia revolution. Many readers find the characters and themes surprisingly modern.",
      "Shakespeare's plays are difficult to understand and sometimes require the reader to struggle or think twice to figure out the character's thoughts. Sometimes the dialogue tends to be emotional without any connection to the context of the story. There are many passages that are a confusing mess of single words and old classical vocabulary.",
      "Hamlet is a Renaissance tragedy written by Shakespeare. The play is very long and has plot twists that keep the reader guessing. Dickens had a special interest in the work. He told his daughter to keep an eye on Hamlet. For Dickens' novels, he sometimes created serial editions, with new chapters released monthly, keeping readers eagerly awaiting the next issue.",
      "Dickens' legacy is undeniable. His works have been translated and used in over 100 countries and are studied by most schoolchildren in the world. It has even been said that Dickens' legacy belongs not to one era but to all times. It is easy to see that Dickens lives on in society and culture through his language and through his enduring influence on education and the media.",
      "Dickens achieved success at a young age. His first novel, The Pickwick Papers, was published when he was only 24 and became a bestseller. His success increased throughout the 1590s. He was honored as a member of the Lord Chamber Men - those lucky enough to perform for the Queen of England on many occasions. Alongside his novels and plays, he also published many poems in his own style.",
      "As Dickens's reputation grew, the question arose whether to preserve his legacy and make it live on. Dickens himself was always keen to make his mark and to maintain his uniqueness. He even attempted to break the dominance of the popular comedies of the time with a series of dramatic plays.",
      "To mark the 400th anniversary of Dickens' death, there will be a number of events to help readers, and especially students, better understand his works. There will be videos detailing the content of each of his works to help people excitedly explore the pinnacle of language and the meaning his works bring to our daily lives."
    ],
    correctAnswers: [
      'A global writer',
      'Difficult language',
      'A famous tragedy',
      'A lasting legacy',
      'Early success',
      'Protecting his reputation',
      'Remembering Dickens'
    ]
  }
};

function shouldBeepBeforeSpeakingTimer(screen: SpeakingScreen) {
  return screen === 'question' || screen === 'part2Question' || screen === 'part3Question' || screen === 'part4Question';
}

const part2Questions = [
  'Describe the picture.',
  'What do you think the people are talking about?',
  'Do you like eating with friends? Why or why not?'
];
const part2ImageUrls = [
  '/images/speaking/part2/1.png',
  '/images/speaking/part2/2.png',
  '/images/speaking/part2/3.png'
];
const part2SampleAnswers = [
  'In the picture, I can see several people sitting around a table and having a meal together. They look relaxed and happy. It seems like they are friends or family members enjoying food and conversation.',
  'I think they are talking about their day, their work, or something funny that happened recently. Because they are smiling, the conversation is probably friendly and casual.',
  'Yes, I like eating with friends because it makes the meal more enjoyable. We can share stories, laugh together, and feel less stressed after a busy day.'
];
const part3Questions = [
  'Compare the pictures.',
  'What are the advantages of travelling by car?',
  'Do you prefer travelling alone or with other people? Why?'
];
const part3SampleAnswers = [
  'Both pictures show ways of travelling. In the first picture, people are travelling by car, which may be more private and flexible. In the second picture, people are travelling by train, which may be more comfortable for long distances.',
  'Travelling by car is convenient because you can choose your own route and stop whenever you want. It is also useful when you travel with family or carry a lot of luggage.',
  'I prefer travelling with other people because it is more fun and safer. We can talk during the journey, share costs, and help each other if there is a problem.'
];
const part4Topic = {
  title: 'Receiving a gift',
  image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80',
  questions: [
    'Tell me about the last gift you received. Who gave it to you, and what was the occasion?',
    'Do you prefer receiving handmade gifts or gifts bought in a shop? Why?',
    'Are you planning to give a gift to anyone soon? Tell me about it.'
  ]
};
const part4SampleAnswer = 'The last gift I received was a book from my friend on my birthday. I liked it because it showed that my friend understood my interests. I usually prefer thoughtful gifts, whether they are handmade or bought in a shop, because the meaning is more important than the price. I am planning to give my mother a small present soon, maybe some flowers or a nice scarf, to thank her for always supporting me.';
const listeningPart1Questions: ListeningPart1Question[] = [
  {
    prompt: 'A person calls a friend about his new car. How much does the small car cost him?',
    options: ['3250 pounds', '3550 pounds', '4250 pounds']
  },
  {
    prompt: 'A woman asks about a train ticket. What time does the next train leave?',
    options: ['8:15', '8:30', '8:45']
  },
  {
    prompt: 'A man is booking a table. How many people will come to dinner?',
    options: ['Three', 'Four', 'Five']
  },
  {
    prompt: 'A student phones the library. Which book does she need?',
    options: ['A history book', 'A grammar book', 'A science book']
  },
  {
    prompt: 'A customer asks about a jacket. What colour does he choose?',
    options: ['Black', 'Blue', 'Green']
  },
  {
    prompt: 'A woman talks about her weekend. Where did she go?',
    options: ['To the beach', 'To the cinema', 'To the museum']
  },
  {
    prompt: 'A man calls a repair shop. What is broken?',
    options: ['His phone', 'His laptop', 'His watch']
  },
  {
    prompt: 'Two friends talk about a party. What should Anna bring?',
    options: ['Drinks', 'Music', 'Snacks']
  },
  {
    prompt: 'A teacher gives an announcement. When is the test?',
    options: ['Monday', 'Wednesday', 'Friday']
  },
  {
    prompt: 'A woman is at a hotel. What does she ask for?',
    options: ['A map', 'A towel', 'A taxi']
  },
  {
    prompt: 'A man leaves a message. Why is he late?',
    options: ['Traffic', 'Bad weather', 'A meeting']
  },
  {
    prompt: 'A customer is buying flowers. Who are they for?',
    options: ['His mother', 'His teacher', 'His friend']
  },
  {
    prompt: 'Two people discuss exercise. What sport will they try?',
    options: ['Swimming', 'Tennis', 'Cycling']
  }
];
const listeningPart1AnswerKey = ['3250 pounds', '8:30', 'Four', 'A grammar book', 'Blue', 'To the museum', 'His laptop', 'Snacks', 'Wednesday', 'A taxi', 'Traffic', 'His mother', 'Cycling'];
const listeningMatchingOptions = [
  'enjoys meeting new people',
  'wants to learn a new skill',
  'prefers working alone',
  'needs more time to practise',
  'has already done this activity before',
  'is worried about the cost'
];
const listeningMatchingAnswerKey: Record<string, string> = {
  'Speaker A ...': 'wants to learn a new skill',
  'Speaker B ...': 'enjoys meeting new people',
  'Speaker C ...': 'needs more time to practise',
  'Speaker D ...': 'has already done this activity before'
};
const listeningShortStatements = [
  'There is too much information on the Internet',
  'Finding information on the Internet requires skills',
  'The use of the Internet affects the way we think',
  'The Internet makes young people less patient.'
];
const listeningSpeakerOptions = ['Man', 'Woman', 'Both', 'Neither'];
const listeningShortAnswerKey = ['Woman', 'Man', 'Both', 'Woman'];
const listeningMonologues = [
  {
    questions: [
      {
        prompt: 'What does the announcer say about the new novel?',
        options: ['It is different from his earlier works', 'It is romantic and soft', 'It is less famous than his earlier works']
      },
      {
        prompt: 'What does the announcer say the writer should do in the future?',
        options: ['The writer should continue to write this genre', 'The writer should go back to his original genre', 'He should listen to critics before writing his next work']
      }
    ]
  },
  {
    questions: [
      {
        prompt: 'What does the expert say being professional is all about?',
        options: ['To maintain a positive attitude.', 'To create a good working environment.', 'To make a good impression.']
      },
      {
        prompt: 'What does the expert say about the definition of professionalism?',
        options: ['It is the same as 40 years ago.', 'Our definition of it is changing.', 'It will not change anymore.']
      }
    ]
  }
];
const listeningMonologueAnswerKey: Record<string, string> = {
  '0-0': 'It is different from his earlier works',
  '0-1': 'The writer should go back to his original genre',
  '1-0': 'To make a good impression.',
  '1-1': 'Our definition of it is changing.'
};
const writingParts = [
  {
    title: 'Part 1',
    heading: 'You are joining a Art Club. Fill out the form. Write short answers (1-5 words) for each message',
    prompt: '',
    questions: ['Do you enjoy drawing or painting?', 'What kind of art do you like?', 'When did you last visit an exhibition?', 'Who is your favourite artist?', 'What do you usually do in your free time?'],
    helper: 'Words'
  },
  {
    title: 'Part 2',
    heading: 'You are a new member of an online club.',
    prompt: 'Write a message to other members. Tell them about yourself and ask one question.',
    questions: [],
    helper: 'Write 20-30 words.'
  },
  {
    title: 'Part 3',
    heading: 'You are speaking to fellow members of the Art Club in a group chat. Respond to them in full sentences (30-40 words per answer).',
    prompt: '',
    questions: [
      'Tell me a thing that you have had for a long time.',
      'Should I take a course at my local college? Please, give me some advice.',
      'Street art is becoming popular. However, some people criticize that it is bad. What is your opinion?'
    ],
    helper: 'Words'
  },
  {
    title: 'Part 4',
    heading: 'Write a short email (about 50 words) to your friend, and a longer email (120-150 words) to the president of the club.',
    prompt: 'Dear all members,\nThe Art Club is organizing a talk to the public to attract more attention. We are going to invite an artist to give a talk to the members. As a member of our club, could you give us an artist to join our talk and what topic should they share to gain more attention? Especially, we would like to have more both young and elderly members.',
    questions: [],
    helper: 'Write 40-50 words.'
  }
];
type WritingPartData = typeof writingParts[number] & {
  sampleAnswers?: string[];
  emailPrompts?: Record<string, string>;
};

function writingPartsFromCard(card?: MockCard | null): WritingPartData[] {
  const rows = parseQuestionDataArray(card?.questionData)
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .filter((item) => {
      const skill = String(item.skill ?? '').toUpperCase();
      return !skill || skill === 'WRITING';
    });

  if (rows.length === 0) return writingParts;

  const nextParts: WritingPartData[] = writingParts.map((part) => ({
    ...part,
    questions: [...part.questions]
  }));
  const grouped = new Map<number, Record<string, unknown>[]>();

  rows.forEach((row, fallbackIndex) => {
    const rawPart = row.part ?? row.questionPart ?? fallbackIndex + 1;
    const parsedPart = Number(rawPart);
    const partIndex = Number.isFinite(parsedPart)
      ? Math.min(3, Math.max(0, parsedPart - 1))
      : Math.min(3, Math.max(0, fallbackIndex));
    grouped.set(partIndex, [...(grouped.get(partIndex) ?? []), row]);
  });

  grouped.forEach((partRows, partIndex) => {
    const current = nextParts[partIndex] ?? writingParts[partIndex] ?? writingParts[0];
    const first = partRows[0] ?? {};
    const clubName = String(first.clubName ?? card?.description?.replace(/^Bộ đề\s*#\d+\s*-\s*/i, '').replace(/\.$/, '') ?? '').trim();
    const rowQuestions = partRows.flatMap((row) => {
      if (Array.isArray(row.questions)) return row.questions.map(String);
      return [
        row.question,
        row.question1,
        row.question2,
        row.question3,
        row.question4,
        row.question5,
        row.prompt
      ].map((value) => String(value ?? ''));
    }).map((question) => question.trim()).filter(Boolean);
    const sampleAnswers = partRows
      .map((row) => String(row.sampleAnswer ?? row.answer ?? '').trim())
      .filter(Boolean);
    const heading = String(first.heading ?? first.instructions ?? first.title ?? '').trim();
    const context = String(first.context ?? first.mainText ?? '').trim();
    const prompt = String(first.prompt ?? first.content ?? '').trim();
    const emailPrompts = partIndex === 3 && rowQuestions.length > 0
      ? { friend: rowQuestions[0] ?? '', president: rowQuestions[1] ?? '' }
      : current.emailPrompts;

    nextParts[partIndex] = {
      ...current,
      heading: heading || (clubName ? current.heading.replace(/(?:an?|the)\s+[^.]+ club/i, `the ${clubName}`) : current.heading),
      prompt: partIndex === 3 ? context || prompt || current.prompt : prompt || current.prompt,
      questions: (partIndex === 0 || partIndex === 2) && rowQuestions.length > 0 ? rowQuestions : current.questions,
      helper: String(first.helper ?? first.wordLimit ?? '').trim() || current.helper,
      sampleAnswers: sampleAnswers.length > 0 ? sampleAnswers : current.sampleAnswers,
      emailPrompts
    };
  });

  return nextParts;
}

const speakingScreens: SpeakingScreen[] = ['select', 'fullStart', 'fullResult', 'start', 'instructions', 'prompt', 'question', 'part2Prompt', 'part2Question', 'part3Prompt', 'part3Question', 'part4Prompt', 'part4Question', 'complete', 'readingStart', 'readingInstructions', 'readingQuestion', 'readingCohesion', 'readingOpinion', 'readingLong', 'readingResult', 'readingReview', 'listeningStart', 'listeningInstructions', 'listeningQuestion', 'listeningMatching', 'listeningShort', 'listeningMonologues', 'listeningResult', 'listeningReview', 'writingInstructions', 'writingPart', 'writingResult', 'grammarStart', 'grammarInstructions', 'grammarQuestion', 'grammarResult'];
const mockSkills: MockSkill[] = ['FULL', 'LISTENING', 'SPEAKING', 'WRITING', 'READING', 'GRAMMAR'];

function readScreen(value: string | null): SpeakingScreen {
  return speakingScreens.includes(value as SpeakingScreen) ? (value as SpeakingScreen) : 'select';
}

function readSkill(value: string | null): MockSkill {
  return mockSkills.includes(value as MockSkill) ? (value as MockSkill) : 'FULL';
}

function skillFromAssessmentScreen(screen: SpeakingScreen): MockSkill | null {
  if (screen === 'fullStart' || screen === 'fullResult') return 'FULL';
  if (screen === 'readingStart' || screen === 'readingInstructions' || screen === 'readingQuestion' || screen === 'readingCohesion' || screen === 'readingOpinion' || screen === 'readingLong' || screen === 'readingResult' || screen === 'readingReview') return 'READING';
  if (screen === 'listeningStart' || screen === 'listeningInstructions' || screen === 'listeningQuestion' || screen === 'listeningMatching' || screen === 'listeningShort' || screen === 'listeningMonologues' || screen === 'listeningResult' || screen === 'listeningReview') return 'LISTENING';
  if (screen === 'writingInstructions' || screen === 'writingPart' || screen === 'writingResult') return 'WRITING';
  if (screen === 'grammarStart' || screen === 'grammarInstructions' || screen === 'grammarQuestion' || screen === 'grammarResult') return 'GRAMMAR';
  if (screen === 'start' || screen === 'instructions' || screen === 'prompt' || screen === 'question' || screen === 'part2Prompt' || screen === 'part2Question' || screen === 'part3Prompt' || screen === 'part3Question' || screen === 'part4Prompt' || screen === 'part4Question' || screen === 'complete') return 'SPEAKING';
  return null;
}

function readTestId(value: string | null) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) return null;
  return numberValue;
}

function readQuestionIndex(value: string | null) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue)) return 0;
  return Math.min(Math.max(numberValue, 0), speakingQuestions.length - 1);
}

function readPart2QuestionIndex(value: string | null) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue)) return 0;
  return Math.min(Math.max(numberValue, 0), part2Questions.length - 1);
}

function readPart3QuestionIndex(value: string | null) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue)) return 0;
  return Math.min(Math.max(numberValue, 0), part3Questions.length - 1);
}

function readPart4Phase(value: string | null): Part4Phase {
  return value === 'recording' ? 'recording' : 'prepare';
}

function readListeningQuestionIndex(value: string | null) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue)) return 0;
  return Math.min(Math.max(numberValue, 0), listeningPart1Questions.length - 1);
}

function readListeningRecordingIndex(value: string | null) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue)) return 0;
  return Math.min(Math.max(numberValue, 0), listeningMonologues.length - 1);
}

function readWritingPartIndex(value: string | null) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue)) return 0;
  return Math.min(Math.max(numberValue, 0), writingParts.length - 1);
}

function readGrammarQuestionIndex(value: string | null) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue)) return 0;
  return Math.min(Math.max(numberValue, 0), grammarQuestions.length - 1);
}

function formatReadingTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function limitWords(value: string, maxWords: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return words.slice(0, maxWords).join(' ');
}

function normalizeAudioUrl(value?: string) {
  const cleaned = String(value ?? '').trim().replace(/^["']|["']$/g, '');
  if (!cleaned) return '';

  const apiBaseUrl = String(api.defaults.baseURL ?? '').replace(/\/+$/, '');
  const apiOrigin = apiBaseUrl.replace(/\/api$/i, '');

  if (/^https?:\/\//i.test(cleaned)) {
    try {
      const url = new URL(cleaned);
      const host = url.hostname.toLowerCase();
      if ((host === 'aptiskey.com' || host === 'www.aptiskey.com') && apiBaseUrl) {
        return `${apiBaseUrl}/media/proxy-audio?url=${encodeURIComponent(cleaned)}`;
      }
    } catch {
      return cleaned;
    }
    return cleaned;
  }
  if (/^(blob:|data:)/i.test(cleaned)) return cleaned;
  if (!apiOrigin) return cleaned;

  if (cleaned.startsWith('/api/')) return `${apiOrigin}${cleaned}`;
  if (cleaned.startsWith('api/')) return `${apiOrigin}/${cleaned}`;
  if (cleaned.startsWith('/media/')) return `${apiOrigin}/api${cleaned}`;
  if (cleaned.startsWith('media/')) return `${apiOrigin}/api/${cleaned}`;
  if (cleaned.startsWith('/')) return `${apiOrigin}${cleaned}`;
  return cleaned;
}

function audioPlaybackUrls(value?: string) {
  const cleaned = String(value ?? '').trim().replace(/^["']|["']$/g, '');
  const normalized = normalizeAudioUrl(cleaned);
  const urls = [normalized];

  if (/^https?:\/\//i.test(cleaned) && cleaned !== normalized) {
    urls.push(cleaned);
  }

  return Array.from(new Set(urls.filter(Boolean)));
}

function useAudioPlayer(audioUrl?: string) {
  const playableAudioUrls = audioPlaybackUrls(audioUrl);
  const playableAudioUrlKey = playableAudioUrls.join('|');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);

  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
    setPlayCount(0);
  }, [playableAudioUrlKey]);

  useEffect(() => () => {
    audioRef.current?.pause();
  }, []);

  async function toggleAudio() {
    if (playableAudioUrls.length === 0) {
      toast.error('Chưa có file nghe cho câu này.');
      return;
    }

    try {
      if (playing) {
        audioRef.current?.pause();
        setPlaying(false);
        return;
      }

      if (playCount >= 2) {
        toast.error('Bạn chỉ được nghe tối đa 2 lần cho mỗi file nghe.');
        return;
      }

      let lastError: unknown = null;
      for (const playableAudioUrl of playableAudioUrls) {
        const audio = new Audio(playableAudioUrl);
        audio.preload = 'auto';
        audio.onended = () => setPlaying(false);
        audio.onerror = () => setPlaying(false);

        try {
          audioRef.current?.pause();
          audioRef.current = audio;
          await audio.play();
          setPlayCount((count) => count + 1);
          setPlaying(true);
          return;
        } catch (error) {
          lastError = error;
          audio.pause();
          audioRef.current = null;
        }
      }

      throw lastError;
    } catch {
      setPlaying(false);
      toast.error('Không phát được file nghe. Kiểm tra lại link audioUrl hoặc quyền truy cập file.');
    }
  }

  return { playing, playCount, playsLeft: Math.max(0, 2 - playCount), toggleAudio };
}

function sameAnswer(user?: string, answer?: string) {
  return (user ?? '').trim().toLowerCase() === (answer ?? '').trim().toLowerCase();
}

function scoreFromCorrect(correct: number, total: number, maxScore: number) {
  if (total <= 0) return 0;
  return Math.round((correct / total) * maxScore);
}

function clampScore50(score: number) {
  return Math.min(50, Math.max(0, Math.round(Number.isFinite(score) ? score : 0)));
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function correctToAptis25(correct: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(25, Math.max(0, Math.round((correct / total) * 25)));
}

function cefrFromAptisTotal(totalScore: number) {
  if (totalScore > 180) return 'C2';
  if (totalScore >= 160) return 'C1';
  if (totalScore >= 120) return 'B2';
  if (totalScore >= 80) return 'B1';
  if (totalScore >= 40) return 'A2';
  return 'A1';
}

function cefrFromReadingCorrect25(correctOutOf25: number) {
  if (correctOutOf25 >= 23) return 'C';
  if (correctOutOf25 >= 19) return 'B2';
  if (correctOutOf25 >= 13) return 'B1';
  if (correctOutOf25 >= 8) return 'A2';
  return 'A1';
}

function cefrFromListeningCorrect25(correctOutOf25: number) {
  if (correctOutOf25 >= 21) return 'C';
  if (correctOutOf25 >= 17) return 'B2';
  if (correctOutOf25 >= 12) return 'B1';
  if (correctOutOf25 >= 8) return 'A2';
  return 'A1';
}

function scoreGrammarAnswers(answers: Record<number, string>, questions: GrammarQuestionItem[] = grammarQuestions): SkillScoreSummary {
  const counts = questions.map((question, index) => {
    const answer = answers[index];
    if (question.answer) return sameAnswer(answer, question.answer) ? 1 : 0;
    const selections = parseGrammarMatchingAnswer(answer);
    const rows = question.matchRows ?? question.definitionRows ?? question.sentenceRows ?? question.collocationRows ?? [];
    return rows.filter((row) => {
      const key = 'word' in row ? row.word : 'definition' in row ? row.definition : row.before;
      return sameAnswer(selections[key], row.answer);
    }).length;
  });
  const correct = counts.reduce((sum, value) => sum + value, 0);
  const grammarCount = questions.filter((question) => !question.matchRows && !question.definitionRows && !question.sentenceRows && !question.collocationRows).length;
  const vocabularyCount = Math.max(0, questions.length - grammarCount);
  const grammarCorrect = counts.slice(0, grammarCount).reduce((sum, value) => sum + value, 0);
  const vocabularyCorrect = counts.slice(grammarCount).reduce((sum, value) => sum + value, 0);
  const rows = [
    { part: 'Grammar multiple choice', correct: `${grammarCorrect}/${grammarCount}`, score: `${scoreFromCorrect(grammarCorrect, grammarCount, Math.round((grammarCount / Math.max(1, questions.length)) * 50))}/50` },
    { part: 'Vocabulary & matching', correct: `${vocabularyCorrect}/${vocabularyCount}`, score: `${scoreFromCorrect(vocabularyCorrect, vocabularyCount, Math.round((vocabularyCount / Math.max(1, questions.length)) * 50))}/50` }
  ];
  return { correct, total: questions.length, score: scoreFromCorrect(correct, questions.length, 50), maxScore: 50, cefr: 'Không xếp CEFR', rows };
}

function scoreListeningAnswers(
  part1Answers: Record<number, string>,
  matchingAnswers: Record<string, string>,
  shortAnswers: Record<number, string>,
  monologueAnswers: Record<string, string>,
  part1AnswerKey: string[] = listeningPart1AnswerKey,
  matchingAnswerKey: Record<string, string> = listeningMatchingAnswerKey,
  shortAnswerKey: string[] = listeningShortAnswerKey,
  monologueAnswerKey: Record<string, string> = listeningMonologueAnswerKey
): SkillScoreSummary {
  const part1Correct = part1AnswerKey.filter((answer, index) => sameAnswer(part1Answers[index], answer)).length;
  const matchingCorrect = Object.entries(matchingAnswerKey).filter(([speaker, answer]) => sameAnswer(matchingAnswers[speaker], answer)).length;
  const shortCorrect = shortAnswerKey.filter((answer, index) => sameAnswer(shortAnswers[index], answer)).length;
  const monologueCorrect = Object.entries(monologueAnswerKey).filter(([key, answer]) => sameAnswer(monologueAnswers[key], answer)).length;
  const monologueTotal = Object.keys(monologueAnswerKey).length || 4;
  const rows = [
    { part: 'Part 1 - Word Recognition', correct: `${part1Correct}/${part1AnswerKey.length}`, score: `${scoreFromCorrect(part1Correct, part1AnswerKey.length, 26)}/26` },
    { part: 'Part 2 - Matching Information', correct: `${matchingCorrect}/${Object.keys(matchingAnswerKey).length || 4}`, score: `${scoreFromCorrect(matchingCorrect, Object.keys(matchingAnswerKey).length || 4, 8)}/8` },
    { part: 'Part 3 - Short Conversations', correct: `${shortCorrect}/${shortAnswerKey.length || 4}`, score: `${scoreFromCorrect(shortCorrect, shortAnswerKey.length || 4, 8)}/8` },
    { part: 'Part 4 - Monologues', correct: `${monologueCorrect}/${monologueTotal}`, score: `${scoreFromCorrect(monologueCorrect, monologueTotal, 8)}/8` }
  ];
  const correct = part1Correct + matchingCorrect + shortCorrect + monologueCorrect;
  const matchingTotal = Object.keys(matchingAnswerKey).length || 4;
  const shortTotal = shortAnswerKey.length || 4;
  const total = part1AnswerKey.length + matchingTotal + shortTotal + monologueTotal;
  const score = scoreFromCorrect(part1Correct, part1AnswerKey.length, 26) + scoreFromCorrect(matchingCorrect, matchingTotal, 8) + scoreFromCorrect(shortCorrect, shortTotal, 8) + scoreFromCorrect(monologueCorrect, monologueTotal, 8);
  return { correct, total, score: clampScore50(score), maxScore: 50, cefr: cefrFromListeningCorrect25(correctToAptis25(correct, total)), rows };
}

function scoreReadingAnswers(
  gapAnswers: Record<number, string>,
  cohesionAnswers: Record<number, string[]>,
  opinionAnswers: Record<number, string>,
  longAnswers: Record<number, string>,
  data: ReadingTestData = fallbackReadingTestData
): SkillScoreSummary {
  const gapCorrect = data.gaps.filter((question, index) => sameAnswer(gapAnswers[index], question.answer)).length;
  const cohesionCorrect = data.cohesion.reduce((sum, question, index) => {
    const userAnswers = cohesionAnswers[index] ?? [];
    return sum + question.correctOrder.filter((answer, answerIndex) => sameAnswer(userAnswers[answerIndex], answer)).length;
  }, 0);
  const opinionCorrect = data.opinion.correctAnswers.filter((answer, index) => sameAnswer(opinionAnswers[index], answer)).length;
  const longCorrect = data.long.correctAnswers.filter((answer, index) => sameAnswer(longAnswers[index], answer)).length;
  const gapTotal = data.gaps.length;
  const cohesionTotal = data.cohesion.reduce((sum, question) => sum + question.correctOrder.length, 0);
  const opinionTotal = data.opinion.correctAnswers.length;
  const longTotal = data.long.correctAnswers.length;
  const rows = [
    { part: 'Part 1 - Gap Fill', correct: `${gapCorrect}/${gapTotal}`, score: `${scoreFromCorrect(gapCorrect, gapTotal, 7)}/7` },
    { part: 'Part 2 + 3 - Text Cohesion', correct: `${cohesionCorrect}/${cohesionTotal}`, score: `${scoreFromCorrect(cohesionCorrect, cohesionTotal, 17)}/17` },
    { part: 'Part 4 - Opinion Matching', correct: `${opinionCorrect}/${opinionTotal}`, score: `${scoreFromCorrect(opinionCorrect, opinionTotal, 13)}/13` },
    { part: 'Part 5 - Long Reading', correct: `${longCorrect}/${longTotal}`, score: `${scoreFromCorrect(longCorrect, longTotal, 13)}/13` }
  ];
  const correct = gapCorrect + cohesionCorrect + opinionCorrect + longCorrect;
  const score = rows.reduce((sum, row) => sum + Number(row.score.split('/')[0]), 0);
  const total = gapTotal + cohesionTotal + opinionTotal + longTotal;
  const aptisCorrect = correctToAptis25(correct, total);
  return { correct, total, score: clampScore50(score), maxScore: 50, cefr: cefrFromReadingCorrect25(aptisCorrect), rows };
}

export function MockTests() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTestId = readTestId(searchParams.get('testId'));
  const [screen, setScreen] = useState<SpeakingScreen>(() => readScreen(searchParams.get('screen')));
  const [answerRevealOpen, setAnswerRevealOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<MockSkill>(() => readSkill(searchParams.get('skill')));
  const [selectedTest, setSelectedTest] = useState(speakingMockTests[0]);
  const [questionIndex, setQuestionIndex] = useState(() => readQuestionIndex(searchParams.get('question')));
  const [part2QuestionIndex, setPart2QuestionIndex] = useState(() => readPart2QuestionIndex(searchParams.get('part2Question')));
  const [part3QuestionIndex, setPart3QuestionIndex] = useState(() => readPart3QuestionIndex(searchParams.get('part3Question')));
  const [recordingSeconds, setRecordingSeconds] = useState(30);
  const [readingSeconds, setReadingSeconds] = useState(35 * 60);
  const [readingCohesionIndex, setReadingCohesionIndex] = useState(0);
  const [readingGapAnswers, setReadingGapAnswers] = useState<Record<number, string>>({});
  const [readingCohesionAnswers, setReadingCohesionAnswers] = useState<Record<number, string[]>>({});
  const [readingOpinionAnswers, setReadingOpinionAnswers] = useState<Record<number, string>>({});
  const [readingLongAnswers, setReadingLongAnswers] = useState<Record<number, string>>({});
  const [listeningQuestionIndex, setListeningQuestionIndex] = useState(() => readListeningQuestionIndex(searchParams.get('listeningQuestion')));
  const [listeningSeconds, setListeningSeconds] = useState(40 * 60);
  const [listeningAnswers, setListeningAnswers] = useState<Record<number, string>>({});
  const [listeningMatchingAnswers, setListeningMatchingAnswers] = useState<Record<string, string>>({});
  const [listeningShortAnswers, setListeningShortAnswers] = useState<Record<number, string>>({});
  const [listeningMonologueIndex, setListeningMonologueIndex] = useState(() => readListeningRecordingIndex(searchParams.get('listeningRecording')));
  const [listeningMonologueAnswers, setListeningMonologueAnswers] = useState<Record<string, string>>({});
  const [writingPartIndex, setWritingPartIndex] = useState(() => readWritingPartIndex(searchParams.get('writingPart')));
  const [writingSeconds, setWritingSeconds] = useState(50 * 60);
  const [writingAnswers, setWritingAnswers] = useState<Record<number, string>>({});
  const [writingShortAnswers, setWritingShortAnswers] = useState<Record<number, string>>({});
  const [writingThreeAnswers, setWritingThreeAnswers] = useState<Record<number, string>>({});
  const [writingEmailAnswers, setWritingEmailAnswers] = useState<Record<string, string>>({});
  const [writingScore, setWritingScore] = useState<AiWritingScore | null>(null);
  const [writingScoreError, setWritingScoreError] = useState('');
  const [writingScoreLoading, setWritingScoreLoading] = useState(false);
  const [speakingTranscripts, setSpeakingTranscripts] = useState<Record<string, string>>({});
  const [speakingScore, setSpeakingScore] = useState<AiSpeakingScore | null>(null);
  const [speakingScoreError, setSpeakingScoreError] = useState('');
  const [speakingScoreLoading, setSpeakingScoreLoading] = useState(false);
  const [grammarQuestionIndex, setGrammarQuestionIndex] = useState(() => readGrammarQuestionIndex(searchParams.get('grammarQuestion')));
  const [grammarSeconds, setGrammarSeconds] = useState(25 * 60);
  const [grammarAnswers, setGrammarAnswers] = useState<Record<number, string>>({});
  const [isFullMock, setIsFullMock] = useState(() => searchParams.get('full') === '1');
  const [selectedMockCard, setSelectedMockCard] = useState<MockCard | null>(null);
  const [selectedMockCardLoading, setSelectedMockCardLoading] = useState(false);
  const [part4Phase, setPart4Phase] = useState<Part4Phase>(() => readPart4Phase(searchParams.get('part4Phase')));
  const [speechReady, setSpeechReady] = useState(true);
  const [speakingSoundEnabled, setSpeakingSoundEnabled] = useState(true);
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const [speakingRecordings, setSpeakingRecordings] = useState<Record<string, Blob>>({});
  const [speakingDraftOpen, setSpeakingDraftOpen] = useState(false);
  const [speakingDraftText, setSpeakingDraftText] = useState('');
  const [speakingDraftLevel, setSpeakingDraftLevel] = useState<DraftLevel>('B1');
  const [bookmarks, setBookmarks] = useState<string[]>(() => loadMockBookmarks());
  const [questionListOpen, setQuestionListOpen] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<{ stop: () => void } | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activeRecordingKeyRef = useRef<string | null>(null);
  const speakingSoundEnabledRef = useRef(true);
  const activeSpeakingData = useMemo(() => getSpeakingTestDataFromCard(selectedMockCard), [selectedMockCard]);

  useEffect(() => {
    if (!accessToken) {
      setSubscription(null);
      return;
    }

    let mounted = true;
    unwrap<SubscriptionResponse>(api.get('/payments/subscription/me'))
      .then((data) => {
        if (mounted) setSubscription(data);
      })
      .catch(() => {
        if (mounted) setSubscription(null);
      });

    return () => {
      mounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    setAnswerRevealOpen(false);
    setSpeakingDraftOpen(false);
  }, [screen, questionIndex, part2QuestionIndex, part3QuestionIndex, listeningQuestionIndex, listeningMonologueIndex, readingCohesionIndex, writingPartIndex, grammarQuestionIndex]);

  useEffect(() => {
    window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    const openQuestionList = () => setQuestionListOpen(true);
    window.addEventListener('aptis-open-question-list', openQuestionList);
    return () => window.removeEventListener('aptis-open-question-list', openQuestionList);
  }, []);

  function bookmarkKey(section: string, question: string | number) {
    return `${selectedMockCard?.id ?? 'built-in'}:${section}:${question}`;
  }

  function isBookmarked(key: string) {
    return bookmarks.includes(key);
  }

  function toggleBookmark(key: string) {
    const active = bookmarks.includes(key);
    toast.success(active ? 'Đã bỏ bookmark câu này.' : 'Đã bookmark câu này.');
    setBookmarks((currentBookmarks) => currentBookmarks.includes(key)
      ? currentBookmarks.filter((item) => item !== key)
      : [...currentBookmarks, key]);
  }

  function insertSpeakingDraft(text: string) {
    setSpeakingDraftText((current) => {
      const cleaned = text.trim();
      if (!cleaned) return current;
      return current.trim() ? `${current.trim()}\n\n${cleaned}` : cleaned;
    });
  }

  function stopSpeakingRecording() {
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    activeRecordingKeyRef.current = null;
    setMicrophoneLevel(0);
  }

  function startSpeechRecognition(recordingKey: string) {
    const SpeechRecognitionClass = (window as typeof window & {
      SpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((event: unknown) => void) | null;
        onerror: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((event: unknown) => void) | null;
        onerror: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
    }).SpeechRecognition ?? (window as typeof window & {
      webkitSpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((event: unknown) => void) | null;
        onerror: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
    }).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: unknown) => {
      const resultEvent = event as { results: ArrayLike<ArrayLike<{ transcript: string }>> };
      const text = Array.from(resultEvent.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      setSpeakingTranscripts((current) => ({ ...current, [recordingKey]: text }));
    };
    recognition.onerror = () => undefined;
    try {
      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch {
      speechRecognitionRef.current = null;
    }
  }

  async function startSpeakingRecording(recordingKey: string) {
    if (activeRecordingKeyRef.current === recordingKey && mediaRecorderRef.current?.state === 'recording') return;
    stopSpeakingRecording();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioContext = AudioContextClass ? new AudioContextClass() : null;
      const analyser = audioContext?.createAnalyser();

      recordingChunksRef.current = [];
      activeRecordingKeyRef.current = recordingKey;
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setSpeakingRecordings((current) => ({ ...current, [recordingKey]: blob }));
        recordingChunksRef.current = [];
      };
      recorder.start();
      startSpeechRecognition(recordingKey);

      if (audioContext && analyser) {
        audioContextRef.current = audioContext;
        analyser.fftSize = 128;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setMicrophoneLevel(Math.min(1, average / 120));
          animationFrameRef.current = window.requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không chấm được Speaking.';
      setSpeakingScoreError(message);
      toast.error(message);
      setMicrophoneLevel(0);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams();

    if (screen === 'select') {
      params.set('skill', selectedSkill);
    } else {
      params.set('screen', screen);
      params.set('skill', skillFromAssessmentScreen(screen) ?? selectedSkill);
      const activeTestId = selectedMockCard?.practiceTestId ?? urlTestId;
      if (activeTestId) {
        params.set('testId', String(activeTestId));
      }
      if (isFullMock) {
        params.set('full', '1');
      }
      if (screen === 'question' || screen === 'complete') {
        params.set('question', String(questionIndex));
      }
      if (screen === 'part2Question') {
        params.set('part2Question', String(part2QuestionIndex));
      }
      if (screen === 'part3Question') {
        params.set('part3Question', String(part3QuestionIndex));
      }
      if (screen === 'part4Question') {
        params.set('part4Phase', part4Phase);
      }
      if (screen === 'listeningQuestion') {
        params.set('listeningQuestion', String(listeningQuestionIndex));
      }
      if (screen === 'listeningMonologues') {
        params.set('listeningRecording', String(listeningMonologueIndex));
      }
      if (screen === 'writingPart') {
        params.set('writingPart', String(writingPartIndex));
      }
      if (screen === 'grammarQuestion') {
        params.set('grammarQuestion', String(grammarQuestionIndex));
      }
    }

    setSearchParams(params, { replace: screen === 'select' });
  }, [grammarQuestionIndex, isFullMock, listeningMonologueIndex, listeningQuestionIndex, part2QuestionIndex, part3QuestionIndex, part4Phase, questionIndex, screen, selectedMockCard?.practiceTestId, selectedSkill, setSearchParams, urlTestId, writingPartIndex]);

  useEffect(() => {
    const syncFromBrowserHistory = () => {
      const params = new URLSearchParams(window.location.search);
      const nextTestId = readTestId(params.get('testId'));
      setScreen(readScreen(params.get('screen')));
      setSelectedSkill(readSkill(params.get('skill')));
      setSelectedMockCard((current) => current?.practiceTestId === nextTestId ? current : null);
      setIsFullMock(params.get('full') === '1');
      setQuestionIndex(readQuestionIndex(params.get('question')));
      setPart2QuestionIndex(readPart2QuestionIndex(params.get('part2Question')));
      setPart3QuestionIndex(readPart3QuestionIndex(params.get('part3Question')));
      setListeningQuestionIndex(readListeningQuestionIndex(params.get('listeningQuestion')));
      setListeningMonologueIndex(readListeningRecordingIndex(params.get('listeningRecording')));
      setWritingPartIndex(readWritingPartIndex(params.get('writingPart')));
      setGrammarQuestionIndex(readGrammarQuestionIndex(params.get('grammarQuestion')));
      setPart4Phase(readPart4Phase(params.get('part4Phase')));
    };

    window.addEventListener('popstate', syncFromBrowserHistory);
    return () => window.removeEventListener('popstate', syncFromBrowserHistory);
  }, []);

  useEffect(() => {
    const isAssessmentScreen = screen !== 'select';
    const selectedTestId = urlTestId;
    const targetSkill = skillFromAssessmentScreen(screen) ?? selectedSkill;
    if (!isAssessmentScreen || selectedMockCard || (!selectedTestId && targetSkill === 'FULL')) return;

    let cancelled = false;

    async function restoreSelectedAssessment() {
      setSelectedMockCardLoading(true);
      try {
        let card: MockCard | null = null;

        if (selectedTestId) {
          card = apiExamTestToCard(await unwrap<Test>(api.get(`/tests/${selectedTestId}`)));
        } else {
          const tests = await unwrap<Test[]>(api.get('/tests'));
          const examCards = await apiExamTestsToCards(tests);
          card = examCards.find((item) => item.skill === targetSkill && item.ready) ?? null;
        }

        if (!card) return;

        const hydratedCard = await hydrateAssessmentCard(card);
        if (cancelled) return;

        setSelectedMockCard(hydratedCard);
        setSelectedSkill((hydratedCard ?? card).skill);
      } catch {
        if (!cancelled) toast.error('Không tải được đề đã import.');
      } finally {
        if (!cancelled) setSelectedMockCardLoading(false);
      }
    }

    restoreSelectedAssessment();

    return () => {
      cancelled = true;
    };
  }, [screen, selectedMockCard, selectedSkill, urlTestId]);

  useEffect(() => {
    speakingSoundEnabledRef.current = speakingSoundEnabled;
    if (!speakingSoundEnabled) {
      window.speechSynthesis?.cancel();
      setSpeechReady(true);
    }
  }, [speakingSoundEnabled]);

  useEffect(() => {
    if (screen === 'question' || screen === 'part2Question' || screen === 'part3Question') {
      setRecordingSeconds(screen === 'question' ? 30 : 45);
    }
  }, [part2QuestionIndex, part3QuestionIndex, questionIndex, screen]);

  useEffect(() => {
    if (screen === 'part4Question') {
      setRecordingSeconds(part4Phase === 'prepare' ? 60 : 120);
    }
  }, [part4Phase, screen]);

  useEffect(() => {
    if (screen === 'readingQuestion') {
      setReadingSeconds(35 * 60);
    }
  }, [screen]);

  useEffect(() => {
    if (screen === 'listeningQuestion') {
      setListeningSeconds(40 * 60);
    }
  }, [screen]);

  useEffect(() => {
    if (screen !== 'readingQuestion' || readingSeconds <= 0) return;

    const intervalId = window.setInterval(() => {
      setReadingSeconds((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [readingSeconds, screen]);

  useEffect(() => {
    if ((screen !== 'listeningQuestion' && screen !== 'listeningMatching' && screen !== 'listeningShort' && screen !== 'listeningMonologues') || listeningSeconds <= 0) return;

    const intervalId = window.setInterval(() => {
      setListeningSeconds((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [listeningSeconds, screen]);

  useEffect(() => {
    if (screen !== 'writingPart' || writingSeconds <= 0) return;

    const intervalId = window.setInterval(() => {
      setWritingSeconds((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [screen, writingSeconds]);

  useEffect(() => {
    if (screen === 'grammarQuestion') {
      setGrammarSeconds(25 * 60);
    }
  }, [screen]);

  useEffect(() => {
    if (screen !== 'grammarQuestion' || grammarSeconds <= 0) return;

    const intervalId = window.setInterval(() => {
      setGrammarSeconds((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [grammarSeconds, screen]);

  useEffect(() => {
    if (screen !== 'instructions' && screen !== 'prompt' && screen !== 'question' && screen !== 'part2Prompt' && screen !== 'part2Question' && screen !== 'part3Prompt' && screen !== 'part3Question' && screen !== 'part4Prompt' && screen !== 'part4Question') {
      setSpeechReady(true);
      window.speechSynthesis?.cancel();
      return;
    }

    if (screen === 'part4Question' && part4Phase !== 'recording') {
      setSpeechReady(true);
      window.speechSynthesis?.cancel();
      return;
    }

    if (!speakingSoundEnabled) {
      setSpeechReady(true);
      window.speechSynthesis?.cancel();
      return;
    }

    const textToRead = screen === 'instructions'
      ? speakingInstructionsSpeechText
      : screen === 'prompt'
        ? promptSpeechText
        : screen === 'part2Prompt'
          ? part2PromptSpeechText
          : screen === 'part3Prompt'
            ? part3PromptSpeechText
            : screen === 'part4Prompt'
              ? part4PromptSpeechText
              : screen === 'part2Question'
                ? activeSpeakingData.part2[part2QuestionIndex]
                : screen === 'part3Question'
                  ? activeSpeakingData.part3[part3QuestionIndex]
                  : screen === 'part4Question'
                    ? `Topic. ${activeSpeakingData.part4.title}. ${activeSpeakingData.part4.questions.join(' ')}`
                    : activeSpeakingData.part1[questionIndex];
    setSpeechReady(false);
    if (screen === 'question') setRecordingSeconds(30);
    if (screen === 'part2Question') setRecordingSeconds(45);
    if (screen === 'part3Question') setRecordingSeconds(45);
    if (screen === 'part4Question') setRecordingSeconds(120);

    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setSpeechReady(true);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    utterance.onend = () => {
      if (!speakingSoundEnabledRef.current) {
        setSpeechReady(true);
        return;
      }
      if (shouldBeepBeforeSpeakingTimer(screen)) {
        playSpeakingBeep().finally(() => setSpeechReady(true));
        return;
      }
      setSpeechReady(true);
    };
    utterance.onerror = () => setSpeechReady(true);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return () => window.speechSynthesis.cancel();
  }, [activeSpeakingData, part2QuestionIndex, part3QuestionIndex, part4Phase, questionIndex, screen, speakingSoundEnabled]);

  useEffect(() => {
    if ((screen !== 'question' && screen !== 'part2Question' && screen !== 'part3Question' && screen !== 'part4Question') || !speechReady) return;

    if (recordingSeconds <= 0) {
      const timeoutId = window.setTimeout(() => {
        goNext();
      }, 700);
      return () => window.clearTimeout(timeoutId);
    }

    const intervalId = window.setInterval(() => {
      setRecordingSeconds((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [recordingSeconds, screen, speechReady]);

  useEffect(() => {
    const shouldRecord =
      speechReady &&
      recordingSeconds > 0 &&
      (screen === 'question' ||
        screen === 'part2Question' ||
        screen === 'part3Question' ||
        (screen === 'part4Question' && part4Phase === 'recording'));

    if (!shouldRecord) {
      stopSpeakingRecording();
      return;
    }

    const recordingKey = screen === 'question'
      ? `part1-${questionIndex}`
      : screen === 'part2Question'
        ? `part2-${part2QuestionIndex}`
        : screen === 'part3Question'
          ? `part3-${part3QuestionIndex}`
          : 'part4';

    startSpeakingRecording(recordingKey);
    return () => {
      stopSpeakingRecording();
    };
  }, [part2QuestionIndex, part3QuestionIndex, part4Phase, questionIndex, recordingSeconds > 0, screen, speechReady]);

  useEffect(() => {
    if ((screen !== 'part2Prompt' && screen !== 'part3Prompt' && screen !== 'part4Prompt') || !speechReady) return;

    const timeoutId = window.setTimeout(() => {
      if (screen === 'part2Prompt') setScreen('part2Question');
      if (screen === 'part3Prompt') setScreen('part3Question');
      if (screen === 'part4Prompt') {
        setPart4Phase('prepare');
        setRecordingSeconds(60);
        setScreen('part4Question');
        setSpeechReady(true);
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [screen, speechReady, speakingSoundEnabled]);

  function requireLoginToStart() {
    if (accessToken) return true;

    toast.error('Bạn cần đăng nhập để học bài.', { id: 'login-required' });
    return false;
  }

  function requireProToStart(_card?: MockCard) {
    return true;
  }

  async function hydrateAssessmentCard(card?: MockCard) {
    if (!card || card.questionData?.trim()) return card ?? null;
    if (card.skill === 'FULL') {
      try {
        const skillTestIds = card.skillTestIds && Object.keys(card.skillTestIds).length > 0
          ? card.skillTestIds
          : fullSkillTestIdsFromExamTests(await unwrap<Test[]>(api.get('/tests')));
        const skillEntries = Object.entries(skillTestIds) as Array<[Exclude<MockSkill, 'FULL'>, number]>;
        if (skillEntries.length === 0) return card;
        const groups = await Promise.all(skillEntries.map(async ([skill, testId]) => ({
          skill,
          questions: await unwrap<Question[]>(api.get(`/questions?testId=${testId}`))
        })));
        const questionData = JSON.stringify(groups.flatMap(({ skill, questions }) =>
          [...questions]
            .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0))
            .map((question) => questionToMockData(question, skill))
        ));
        return { ...card, skillTestIds, questionData };
      } catch {
        toast.error('Không tải được dữ liệu full test.');
        return card;
      }
    }
    if (!card.practiceTestId) return card;
    try {
      const questions = await unwrap<Question[]>(api.get(`/questions?testId=${card.practiceTestId}`));
      const orderedQuestions = [...questions].sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0));
      const questionData = orderedQuestions.length === 1
        ? JSON.stringify(questionToMockData(orderedQuestions[0], card.skill))
        : JSON.stringify(orderedQuestions.map((question) => questionToMockData(question, card.skill)));
      return { ...card, questionData };
    } catch {
      toast.error('Không tải được dữ liệu đề thi thử.');
      return card ?? null;
    }
  }

  async function openSpeakingTest(card?: MockCard) {
    if (!requireLoginToStart()) return;
    if (!requireProToStart(card)) return;
    const hydratedCard = await hydrateAssessmentCard(card);
    setSelectedMockCard(hydratedCard);
    setIsFullMock(false);
    setSelectedTest(speakingMockTests[0]);
    setSelectedSkill('SPEAKING');
    setQuestionIndex(0);
    setPart2QuestionIndex(0);
    setPart3QuestionIndex(0);
    setPart4Phase('prepare');
    setScreen('start');
  }

  async function openReadingTest(card?: MockCard) {
    if (!requireLoginToStart()) return;
    if (!requireProToStart(card)) return;
    const hydratedCard = await hydrateAssessmentCard(card);
    setSelectedMockCard(hydratedCard);
    setIsFullMock(false);
    setSelectedSkill('READING');
    setReadingCohesionIndex(0);
    setReadingGapAnswers({});
    setReadingCohesionAnswers({});
    setReadingOpinionAnswers({});
    setReadingLongAnswers({});
    setReadingSeconds(35 * 60);
    setScreen('readingStart');
  }

  async function openListeningTest(card?: MockCard) {
    if (!requireLoginToStart()) return;
    if (!requireProToStart(card)) return;
    const hydratedCard = await hydrateAssessmentCard(card);
    setSelectedMockCard(hydratedCard);
    setIsFullMock(false);
    setSelectedSkill('LISTENING');
    setListeningQuestionIndex(0);
    setListeningAnswers({});
    setListeningMatchingAnswers({});
    setListeningShortAnswers({});
    setListeningMonologueIndex(0);
    setListeningMonologueAnswers({});
    setScreen('listeningStart');
  }

  async function openWritingTest(card?: MockCard) {
    if (!requireLoginToStart()) return;
    if (!requireProToStart(card)) return;
    const hydratedCard = await hydrateAssessmentCard(card);
    setSelectedMockCard(hydratedCard);
    setIsFullMock(false);
    setSelectedSkill('WRITING');
    setWritingPartIndex(0);
    setWritingSeconds(50 * 60);
    setWritingAnswers({});
    setWritingShortAnswers({});
    setWritingThreeAnswers({});
    setWritingEmailAnswers({});
    setWritingScore(null);
    setWritingScoreError('');
    setScreen('writingInstructions');
  }

  async function openGrammarTest(card?: MockCard) {
    if (!requireLoginToStart()) return;
    if (!requireProToStart(card)) return;
    const hydratedCard = await hydrateAssessmentCard(card);
    setSelectedMockCard(hydratedCard);
    setIsFullMock(false);
    setSelectedSkill('GRAMMAR');
    setGrammarQuestionIndex(0);
    setGrammarSeconds(25 * 60);
    setGrammarAnswers({});
    setScreen('grammarStart');
  }

  async function openFullTest(card?: MockCard) {
    if (!requireLoginToStart()) return;
    if (!requireProToStart(card)) return;
    const hydratedCard = await hydrateAssessmentCard(card ?? selectedMockCard ?? undefined);
    setSelectedMockCard(hydratedCard);
    setIsFullMock(true);
    setSelectedSkill('FULL');
    resetSpeakingSection();
    resetListeningSection();
    resetGrammarSection();
    resetReadingSection();
    resetWritingSection();
    setScreen('fullStart');
  }

  function resetSpeakingSection() {
    setSelectedTest(speakingMockTests[0]);
    setQuestionIndex(0);
    setPart2QuestionIndex(0);
    setPart3QuestionIndex(0);
    setPart4Phase('prepare');
    setRecordingSeconds(30);
    setSpeakingRecordings({});
    setSpeakingTranscripts({});
    setSpeakingScore(null);
    setSpeakingScoreError('');
    setSpeakingScoreLoading(false);
  }

  function resetListeningSection() {
    setListeningQuestionIndex(0);
    setListeningSeconds(40 * 60);
    setListeningAnswers({});
    setListeningMatchingAnswers({});
    setListeningShortAnswers({});
    setListeningMonologueIndex(0);
    setListeningMonologueAnswers({});
  }

  function resetGrammarSection() {
    setGrammarQuestionIndex(0);
    setGrammarSeconds(25 * 60);
    setGrammarAnswers({});
  }

  function resetReadingSection() {
    setReadingCohesionIndex(0);
    setReadingSeconds(35 * 60);
    setReadingGapAnswers({});
    setReadingCohesionAnswers({});
    setReadingOpinionAnswers({});
    setReadingLongAnswers({});
  }

  function resetWritingSection() {
    setWritingPartIndex(0);
    setWritingSeconds(50 * 60);
    setWritingAnswers({});
    setWritingShortAnswers({});
    setWritingThreeAnswers({});
    setWritingEmailAnswers({});
    setWritingScore(null);
    setWritingScoreError('');
    setWritingScoreLoading(false);
  }

  function buildWritingScorePayload() {
    return {
      parts: [
        {
          title: activeWritingParts[0].title,
          prompt: activeWritingParts[0].heading,
          answer: activeWritingParts[0].questions
            .map((question, index) => `${index + 1}. ${question}\n${writingShortAnswers[index] ?? ''}`)
            .join('\n\n')
        },
        {
          title: activeWritingParts[1].title,
          prompt: `${activeWritingParts[1].heading}\n${activeWritingParts[1].prompt}`,
          answer: writingAnswers[1] ?? ''
        },
        {
          title: activeWritingParts[2].title,
          prompt: activeWritingParts[2].heading,
          answer: activeWritingParts[2].questions
            .map((question, index) => `${index + 1}. ${question}\n${writingThreeAnswers[index] ?? ''}`)
            .join('\n\n')
        },
        {
          title: activeWritingParts[3].title,
          prompt: `${activeWritingParts[3].heading}\n${activeWritingParts[3].prompt}`,
          answer: [
            `Email to friend:\n${writingEmailAnswers.friend ?? ''}`,
            `Email to president:\n${writingEmailAnswers.president ?? ''}`
          ].join('\n\n')
        }
      ]
    };
  }

  async function submitWritingForAi(nextScreen?: SpeakingScreen) {
    const payload = buildWritingScorePayload();

    setWritingScoreLoading(true);
    setWritingScoreError('');
    setWritingScore(null);
    setScreen('writingResult');

    try {
      const result = await unwrap<AiWritingScore>(api.post('/ai/writing/score', payload));
      setWritingScore(result);
      if (nextScreen) setScreen(nextScreen);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không chấm được bài Writing.';
      const fallback = buildWritingFallbackScore(payload.parts, message);
      setWritingScore(fallback);
      setWritingScoreError('');
      toast.error(message);
      if (nextScreen) setScreen(nextScreen);
    } finally {
      setWritingScoreLoading(false);
    }
  }

  function buildWritingFallbackScore(parts: Array<{ title: string; prompt: string; answer: string }>, reason: string): AiWritingScore {
    const partFeedback = parts.map((part) => {
      const words = wordCount(part.answer);
      const score = words === 0 ? 0 : words < 20 ? 8 : words < 60 ? 16 : words < 120 ? 24 : words < 200 ? 30 : 34;
      return {
        title: part.title,
        score,
        feedback: words === 0
          ? 'Chưa có câu trả lời nên phần này tạm tính 0 điểm.'
          : `Có ${words} từ. AI chưa trả kết quả chi tiết, nên đây chỉ là điểm tạm theo độ đầy đủ của câu trả lời.`
      };
    });
    const answeredParts = partFeedback.filter((part) => part.score > 0).length;
    const overallScore = partFeedback.length
      ? clampScore50(partFeedback.reduce((sum, part) => sum + part.score, 0) / partFeedback.length)
      : 0;

    return {
      overallScore,
      cefrLevel: overallScore >= 40 ? 'B2' : overallScore >= 28 ? 'B1' : overallScore >= 16 ? 'A2' : 'A1',
      summary: `AI Writing chưa chấm được lúc này (${reason}). Kết quả này là điểm tạm để bài thi full không bị đứng; bạn có thể thử chấm lại sau.`,
      criteria: [
        { name: 'Task achievement', score: answeredParts === parts.length ? 5 : answeredParts > 0 ? 3 : 0, feedback: `${answeredParts}/${parts.length} phần có nội dung trả lời.` },
        { name: 'Grammar', score: 0, feedback: 'Chưa đánh giá được ngữ pháp vì AI chưa trả kết quả.' },
        { name: 'Vocabulary', score: 0, feedback: 'Chưa đánh giá được từ vựng vì AI chưa trả kết quả.' },
        { name: 'Coherence', score: 0, feedback: 'Chưa đánh giá được mạch lạc vì AI chưa trả kết quả.' },
        { name: 'Tone/register', score: 0, feedback: 'Chưa đánh giá được văn phong vì AI chưa trả kết quả.' }
      ],
      parts: partFeedback,
      corrections: ['Bạn có thể thử chấm lại sau hoặc rút gọn câu trả lời nếu nội dung quá dài.'],
      suggestedAnswer: 'Khi AI hoạt động lại, nộp lại bài Writing để nhận nhận xét chi tiết, lỗi cần sửa và bài gợi ý.'
    };
  }

  function buildSpeakingScorePayload() {
    const transcriptForAi = (key: string) => {
      if (!speakingRecordings[key]) return '[NO_AUDIO_FILE_SUBMITTED]';
      const transcript = speakingTranscripts[key]?.trim() ?? '';
      return transcript || '[AUDIO_FILE_RECORDED_BUT_TRANSCRIPTION_UNAVAILABLE]';
    };

    const audioFileForAi = (key: string, fileName: string) => {
      const blob = speakingRecordings[key] ?? new Blob([], { type: 'audio/webm' });
      return new File([blob], fileName, { type: blob.type || 'audio/webm' });
    };

    const items = [
        ...activeSpeakingData.part1.map((question, index) => ({
          key: `part1-${index}`,
          title: `Speaking Part 1 - Question ${index + 1}`,
          prompt: question,
          transcript: transcriptForAi(`part1-${index}`)
        })),
        ...activeSpeakingData.part2.map((question, index) => ({
          key: `part2-${index}`,
          title: `Speaking Part 2 - Question ${index + 1}`,
          prompt: question,
          transcript: transcriptForAi(`part2-${index}`)
        })),
        ...activeSpeakingData.part3.map((question, index) => ({
          key: `part3-${index}`,
          title: `Speaking Part 3 - Question ${index + 1}`,
          prompt: question,
          transcript: transcriptForAi(`part3-${index}`)
        })),
        {
          key: 'part4',
          title: 'Speaking Part 4',
          prompt: `${activeSpeakingData.part4.title}\n${activeSpeakingData.part4.questions.join('\n')}`,
          transcript: transcriptForAi('part4')
        }
      ];

    const parts: SpeakingScorePartPayload[] = items.map((item) => {
      const recording = speakingRecordings[item.key];
      const fileName = `${item.key}.webm`;
      return {
        title: item.title,
        prompt: item.prompt,
        transcript: item.transcript,
        audioFileName: recording ? fileName : '',
        audioContentType: recording?.type ?? '',
        audioSizeBytes: recording?.size ?? 0
      };
    });

    const formData = new FormData();
    formData.append('payload', JSON.stringify({ parts }));
    items.forEach((item) => formData.append('files', audioFileForAi(item.key, `${item.key}.webm`)));

    return { formData, parts };
  }

  async function submitSpeakingForAi(nextScreen?: SpeakingScreen) {
    const payload = buildSpeakingScorePayload();

    setSpeakingScoreLoading(true);
    setSpeakingScoreError('');
    setSpeakingScore(null);
    setScreen('complete');

    try {
      const result = await unwrap<AiSpeakingScore>(api.post('/ai/speaking/score-audio', payload.formData));
      setSpeakingScore(result);
      if (nextScreen) setScreen(nextScreen);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không chấm được Speaking.';
      const fallback = buildSpeakingFallbackScore(payload.parts);
      setSpeakingScore(fallback);
      setSpeakingScoreError('');
      if (!nextScreen) {
        toast.error(message.includes('Cannot deserialize') ? 'AI Speaking đang tạm bận. Bạn thử chấm lại sau ít phút nhé.' : message);
      }
      if (nextScreen) setScreen(nextScreen);
    } finally {
      setSpeakingScoreLoading(false);
    }
  }

  function buildSpeakingFallbackScore(parts: SpeakingScorePartPayload[]): AiSpeakingScore {
    const partFeedback = parts.map((part) => {
      const missing = part.audioSizeBytes === 0 || part.transcript === '[NO_AUDIO_FILE_SUBMITTED]' || part.transcript.trim().length === 0;
      const unavailable = part.transcript === '[AUDIO_FILE_RECORDED_BUT_TRANSCRIPTION_UNAVAILABLE]';
      return {
        title: part.title,
        score: missing ? 0 : unavailable ? 1 : 2,
        feedback: missing
          ? 'Phần này chưa có file ghi âm nên tính 0 điểm.'
          : unavailable
            ? 'Có file ghi âm nhưng trình duyệt chưa lấy được nội dung nói, nên phần này chỉ được điểm rất thấp.'
            : 'Có dữ liệu nói nhưng AI chưa chấm chi tiết được. Bạn có thể thử chấm lại sau.'
      };
    });
    const overallScore = partFeedback.length
      ? Math.round(partFeedback.reduce((sum, part) => sum + part.score, 0) / partFeedback.length)
      : 0;
    return {
      overallScore,
      cefrLevel: overallScore < 4 ? 'Below A1' : 'A1',
      summary: 'Chưa có đủ dữ liệu hoặc AI chưa chấm được lúc này. Phần không có file ghi âm được tính 0; phần có file nhưng không lấy được transcript được tính điểm rất thấp.',
      criteria: [
        { name: 'Task response', score: 0, feedback: 'Chưa có đủ nội dung nói rõ ràng để đánh giá mức độ trả lời đúng câu hỏi.' },
        { name: 'Grammar', score: 0, feedback: 'Chưa có transcript rõ để đánh giá ngữ pháp.' },
        { name: 'Vocabulary', score: 0, feedback: 'Chưa có transcript rõ để đánh giá từ vựng.' },
        { name: 'Fluency', score: 0, feedback: 'Chưa có dữ liệu nói đủ rõ để đánh giá độ trôi chảy.' },
        { name: 'Pronunciation proxy', score: 0, feedback: 'Pronunciation cannot be reliably assessed from transcript alone.' }
      ],
      parts: partFeedback,
      pronunciationTips: ['Kiểm tra quyền microphone.', 'Nói gần microphone hơn và tránh tiếng ồn.', 'Dùng Chrome hoặc Edge để nhận diện giọng nói tốt hơn.'],
      fluencyTips: ['Trả lời trực tiếp câu hỏi.', 'Thêm một lý do và một ví dụ.', 'Dùng because, for example, in my opinion để nối ý.'],
      improvedAnswer: 'I think it is important to answer the question directly, give one clear reason, and add a short example from personal experience.'
    };
  }

  function startFullSpeaking() {
    resetSpeakingSection();
    setScreen('start');
  }

  function toggleSpeakingSound() {
    setSpeakingSoundEnabled((enabled) => {
      if (enabled) {
        window.speechSynthesis?.cancel();
        setSpeechReady(true);
      }
      return !enabled;
    });
  }

  function goNext() {
    if (screen === 'instructions' && !speechReady) return;
    if (screen === 'instructions') setScreen('prompt');
    if (screen === 'prompt' && !speechReady) return;
    if (screen === 'prompt') setScreen('question');
    if (screen === 'question' && !speechReady) return;
    if (screen === 'question') {
      if (questionIndex < activeSpeakingData.part1.length - 1) {
        setQuestionIndex((value) => value + 1);
      } else {
        setPart2QuestionIndex(0);
        setScreen('part2Prompt');
      }
    }
    if (screen === 'part2Question' && !speechReady) return;
    if (screen === 'part2Question') {
      if (part2QuestionIndex < activeSpeakingData.part2.length - 1) {
        setPart2QuestionIndex((value) => value + 1);
      } else {
        setPart3QuestionIndex(0);
        setScreen('part3Prompt');
      }
    }
    if (screen === 'part3Question' && !speechReady) return;
    if (screen === 'part3Question') {
      if (part3QuestionIndex < activeSpeakingData.part3.length - 1) {
        setPart3QuestionIndex((value) => value + 1);
      } else {
        setPart4Phase('prepare');
        setScreen('part4Prompt');
      }
    }
    if (screen === 'part4Question') {
      if (part4Phase === 'prepare') {
        setSpeechReady(false);
        setPart4Phase('recording');
        setRecordingSeconds(120);
      } else {
        if (isFullMock) {
          resetListeningSection();
          submitSpeakingForAi('listeningStart');
        } else {
          submitSpeakingForAi();
        }
      }
    }
  }

  function goPrevious() {
    if (screen === 'instructions') setScreen('start');
    if (screen === 'prompt') setScreen('instructions');
    if (screen === 'question') {
      if (questionIndex > 0) setQuestionIndex((value) => value - 1);
      else setScreen('prompt');
    }
    if (screen === 'complete') {
      setQuestionIndex(activeSpeakingData.part1.length - 1);
      setScreen('question');
    }
  }

  const activeReadingData = useMemo(() => getReadingTestDataFromCard(selectedMockCard), [selectedMockCard]);
  const readingSummary = scoreReadingAnswers(readingGapAnswers, readingCohesionAnswers, readingOpinionAnswers, readingLongAnswers, activeReadingData);
  const activeListeningPart1Questions = useMemo(() => {
    const fromAdmin = listeningQuestionsFromCard(selectedMockCard);
    return (fromAdmin.length > 0 ? fromAdmin : listeningPart1Questions).slice(0, 13);
  }, [selectedMockCard]);
  const activeListeningPart1AnswerKey = useMemo(() => activeListeningPart1Questions.map((question, index) => question.answer ?? question.correctAnswer ?? listeningPart1AnswerKey[index] ?? ''), [activeListeningPart1Questions]);
  const activeListeningMatchingData = useMemo(() => getListeningMatchingDataFromCard(selectedMockCard), [selectedMockCard]);
  const activeListeningShortData = useMemo(() => getListeningShortDataFromCard(selectedMockCard), [selectedMockCard]);
  const activeListeningMonologues = useMemo(() => getListeningMonologuesFromCard(selectedMockCard), [selectedMockCard]);
  const activeListeningMonologueAnswerKey = useMemo(() => getListeningMonologueAnswerKey(activeListeningMonologues), [activeListeningMonologues]);
  const activeListeningAudioByPart = useMemo(() => listeningAudioByPartFromCard(selectedMockCard), [selectedMockCard]);
  const listeningSummary = scoreListeningAnswers(listeningAnswers, listeningMatchingAnswers, listeningShortAnswers, listeningMonologueAnswers, activeListeningPart1AnswerKey, activeListeningMatchingData.answerKey, activeListeningShortData.answerKey, activeListeningMonologueAnswerKey);
  const activeGrammarQuestions = useMemo(() => grammarQuestionsFromCard(selectedMockCard), [selectedMockCard]);
  const grammarSummary = scoreGrammarAnswers(grammarAnswers, activeGrammarQuestions);
  const activeWritingParts = useMemo(() => writingPartsFromCard(selectedMockCard), [selectedMockCard]);
  const fullTotalScore = clampScore50(readingSummary.score) + clampScore50(listeningSummary.score) + clampScore50(speakingScore?.overallScore ?? 0) + clampScore50(writingScore?.overallScore ?? 0);
  const questionListItems = buildCurrentQuestionListItems();

  function questionItem(key: string, label: string, detail: string, active: boolean, onSelect: () => void): QuestionListItem {
    return {
      key,
      label,
      detail,
      active,
      bookmarked: isBookmarked(key),
      onSelect
    };
  }

  function buildCurrentQuestionListItems(): QuestionListItem[] {
    if (screen.startsWith('listening')) {
      return [
        ...activeListeningPart1Questions.map((_, index) => questionItem(
          bookmarkKey('listening-part1', index + 1),
          `Part 1 - Question ${index + 1}`,
          'Word Recognition',
          screen === 'listeningQuestion' && listeningQuestionIndex === index,
          () => {
            setListeningQuestionIndex(index);
            setScreen('listeningQuestion');
          }
        )),
        questionItem(bookmarkKey('listening-part2', 1), 'Part 2', 'Matching Information', screen === 'listeningMatching', () => setScreen('listeningMatching')),
        questionItem(bookmarkKey('listening-part3', 1), 'Part 3', 'Short Conversations', screen === 'listeningShort', () => setScreen('listeningShort')),
        ...activeListeningMonologues.map((_, index) => questionItem(
          bookmarkKey('listening-part4', index + 1),
          `Part 4 - Recording ${index + 1}`,
          'Monologues',
          screen === 'listeningMonologues' && listeningMonologueIndex === index,
          () => {
            setListeningMonologueIndex(index);
            setScreen('listeningMonologues');
          }
        ))
      ];
    }

    if (screen.startsWith('reading')) {
      return [
        questionItem(bookmarkKey('reading-part1', 1), 'Part 1', 'Gap Fill', screen === 'readingQuestion', () => setScreen('readingQuestion')),
        ...activeReadingData.cohesion.map((_, index) => questionItem(
          bookmarkKey('reading-part2-3', index + 1),
          `Part 2 + 3 - Question ${index + 1}`,
          'Text Cohesion',
          screen === 'readingCohesion' && readingCohesionIndex === index,
          () => {
            setReadingCohesionIndex(index);
            setScreen('readingCohesion');
          }
        )),
        questionItem(bookmarkKey('reading-part4', 1), 'Part 4', 'Opinion Matching', screen === 'readingOpinion', () => setScreen('readingOpinion')),
        questionItem(bookmarkKey('reading-part5', 1), 'Part 5', 'Long Reading', screen === 'readingLong', () => setScreen('readingLong'))
      ];
    }

    if (screen.startsWith('writing')) {
      return activeWritingParts.map((part, index) => questionItem(
        bookmarkKey('writing', index + 1),
        `Part ${index + 1}`,
        part.title,
        screen === 'writingPart' && writingPartIndex === index,
        () => {
          setWritingPartIndex(index);
          setScreen('writingPart');
        }
      ));
    }

    if (screen.startsWith('grammar')) {
      return activeGrammarQuestions.map((_, index) => questionItem(
        bookmarkKey('grammar', index + 1),
        `Question ${index + 1}`,
        'Grammar & Vocabulary',
        screen === 'grammarQuestion' && grammarQuestionIndex === index,
        () => {
          setGrammarQuestionIndex(index);
          setScreen('grammarQuestion');
        }
      ));
    }

    return [
      ...activeSpeakingData.part1.map((question, index) => questionItem(`speaking:part1:${index + 1}`, `Part 1 - Question ${index + 1}`, question, screen === 'question' && questionIndex === index, () => {
        setQuestionIndex(index);
        setScreen('question');
      })),
      ...activeSpeakingData.part2.map((question, index) => questionItem(`speaking:part2:${index + 1}`, `Part 2 - Question ${index + 1}`, question, screen === 'part2Question' && part2QuestionIndex === index, () => {
        setPart2QuestionIndex(index);
        setScreen('part2Question');
      })),
      ...activeSpeakingData.part3.map((question, index) => questionItem(`speaking:part3:${index + 1}`, `Part 3 - Question ${index + 1}`, question, screen === 'part3Question' && part3QuestionIndex === index, () => {
        setPart3QuestionIndex(index);
        setScreen('part3Question');
      })),
      questionItem('speaking:part4:1', 'Part 4', activeSpeakingData.part4.title, screen === 'part4Question' || screen === 'part4Prompt', () => {
        setPart4Phase('prepare');
        setScreen('part4Question');
      })
    ];
  }

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-[#040817]">
      {screen === 'select' ? (
        <MockSelectLayout>
          <MockSelect
            selectedSkill={selectedSkill}
            onSkillChange={setSelectedSkill}
            onOpenSpeaking={openSpeakingTest}
            onOpenReading={openReadingTest}
            onOpenListening={openListeningTest}
            onOpenWriting={openWritingTest}
            onOpenGrammar={openGrammarTest}
            onOpenFull={openFullTest}
            proActive={Boolean(subscription?.proActive)}
            authenticated={Boolean(accessToken)}
          />
        </MockSelectLayout>
      ) : (
        <div className="min-h-screen bg-white">
          {(screen === 'readingStart' || screen === 'readingInstructions' || screen === 'readingQuestion' || screen === 'readingCohesion' || screen === 'readingOpinion' || screen === 'readingLong') && (
            <ReadingTopbar
              title={screen === 'readingLong' ? 'Part 5 - Long Reading' : screen === 'readingOpinion' ? 'Part 4 - Opinion Matching' : screen === 'readingCohesion' ? 'Part 2 + 3 - Text Cohesion' : 'Part 1 - Gap Fill'}
              onExit={() => setScreen('select')}
            />
          )}
          {(screen === 'listeningStart' || screen === 'listeningInstructions' || screen === 'listeningQuestion' || screen === 'listeningMatching' || screen === 'listeningShort' || screen === 'listeningMonologues') && (
            <ListeningTopbar title={screen === 'listeningMonologues' ? 'Part 4 - Monologues' : screen === 'listeningShort' ? 'Part 3 - Short Conversations' : screen === 'listeningMatching' ? 'Part 2 - Matching Information' : screen === 'listeningStart' ? 'Part 1 of 4' : 'Part 1 - Word Recognition'} onExit={() => setScreen('select')} />
          )}
          {(screen === 'writingInstructions' || screen === 'writingPart') && (
            <WritingTopbar title={screen === 'writingPart' ? writingPartIndex === 0 ? 'Part 1 - Short Answers' : writingPartIndex === 2 ? 'Part 3 - Three Questions' : writingPartIndex === 3 ? 'Part 4 - Informal & Formal Email' : activeWritingParts[writingPartIndex].title : 'Aptis General Writing Instructions'} onExit={() => setScreen('select')} />
          )}
          {(screen === 'grammarStart' || screen === 'grammarInstructions' || screen === 'grammarQuestion' || screen === 'grammarResult') && (
            <GrammarTopbar onExit={() => setScreen('select')} />
          )}
          {screen === 'fullStart' && (
            <FullTopbar onExit={() => setScreen('select')} />
          )}
          {screen === 'fullResult' && (
            <FullTopbar onExit={() => setScreen('select')} />
          )}
          {screen !== 'fullStart' && screen !== 'fullResult' && screen !== 'writingInstructions' && screen !== 'writingPart' && screen !== 'writingResult' && screen !== 'listeningStart' && screen !== 'listeningInstructions' && screen !== 'listeningQuestion' && screen !== 'listeningMatching' && screen !== 'listeningShort' && screen !== 'listeningMonologues' && screen !== 'listeningResult' && screen !== 'listeningReview' && screen !== 'readingStart' && screen !== 'readingInstructions' && screen !== 'readingQuestion' && screen !== 'readingCohesion' && screen !== 'readingOpinion' && screen !== 'readingLong' && screen !== 'readingResult' && screen !== 'readingReview' && screen !== 'grammarStart' && screen !== 'grammarInstructions' && screen !== 'grammarQuestion' && screen !== 'grammarResult' && (
            <SpeakingTopbarWithAudio
              part={screen === 'part4Prompt' || screen === 'part4Question' ? 4 : screen === 'part3Prompt' || screen === 'part3Question' ? 3 : screen === 'part2Prompt' || screen === 'part2Question' ? 2 : 1}
              soundEnabled={speakingSoundEnabled}
              onExit={() => setScreen('select')}
              onToggleSound={toggleSpeakingSound}
            />
          )}
          {screen === 'fullStart' && <FullStart mockCard={selectedMockCard} onStart={startFullSpeaking} />}
          {screen === 'readingStart' && <ReadingStart mockCard={selectedMockCard} data={activeReadingData} loading={selectedMockCardLoading} onStart={() => setScreen('readingInstructions')} />}
          {screen === 'readingInstructions' && <ReadingInstructions />}
          {screen === 'readingQuestion' && <ReadingQuestion data={activeReadingData.gaps} answers={readingGapAnswers} bookmarkActive={isBookmarked(bookmarkKey('reading-part1', 1))} showAnswer={answerRevealOpen} timeRemaining={formatReadingTime(readingSeconds)} onAnswer={(index, answer) => setReadingGapAnswers((currentAnswers) => ({ ...currentAnswers, [index]: answer }))} onToggleBookmark={() => toggleBookmark(bookmarkKey('reading-part1', 1))} />}
          {screen === 'readingCohesion' && <ReadingCohesion data={activeReadingData.cohesion[readingCohesionIndex] ?? activeReadingData.cohesion[0]} answers={readingCohesionAnswers[readingCohesionIndex] ?? []} bookmarkActive={isBookmarked(bookmarkKey('reading-part2-3', readingCohesionIndex + 1))} questionIndex={readingCohesionIndex} total={activeReadingData.cohesion.length} showAnswer={answerRevealOpen} timeRemaining={formatReadingTime(readingSeconds)} onAnswer={(answers) => setReadingCohesionAnswers((currentAnswers) => ({ ...currentAnswers, [readingCohesionIndex]: answers }))} onToggleBookmark={() => toggleBookmark(bookmarkKey('reading-part2-3', readingCohesionIndex + 1))} />}
          {screen === 'readingOpinion' && <ReadingOpinion data={activeReadingData.opinion} answers={readingOpinionAnswers} bookmarkActive={isBookmarked(bookmarkKey('reading-part4', 1))} showAnswer={answerRevealOpen} timeRemaining={formatReadingTime(readingSeconds)} onAnswer={(index, answer) => setReadingOpinionAnswers((currentAnswers) => ({ ...currentAnswers, [index]: answer }))} onToggleBookmark={() => toggleBookmark(bookmarkKey('reading-part4', 1))} />}
          {screen === 'readingLong' && <ReadingLong data={activeReadingData.long} answers={readingLongAnswers} bookmarkActive={isBookmarked(bookmarkKey('reading-part5', 1))} showAnswer={answerRevealOpen} timeRemaining={formatReadingTime(readingSeconds)} onAnswer={(index, answer) => setReadingLongAnswers((currentAnswers) => ({ ...currentAnswers, [index]: answer }))} onToggleBookmark={() => toggleBookmark(bookmarkKey('reading-part5', 1))} />}
          {screen === 'fullResult' && (
            <FullResult
              grammar={grammarSummary}
              listening={listeningSummary}
              reading={readingSummary}
              speaking={speakingScore}
              totalScore={fullTotalScore}
              writing={writingScore}
              onExit={() => setScreen('select')}
              onRetry={openFullTest}
            />
          )}
          {screen === 'readingResult' && (
            <ReadingResult
              summary={readingSummary}
              onExit={() => setScreen('select')}
              onReview={() => setScreen('readingReview')}
              onRetry={() => {
                resetReadingSection();
                setScreen('readingStart');
              }}
            />
          )}
          {screen === 'readingReview' && (
            <ReadingReview
              cohesionAnswers={readingCohesionAnswers}
              data={activeReadingData}
              gapAnswers={readingGapAnswers}
              longAnswers={readingLongAnswers}
              opinionAnswers={readingOpinionAnswers}
              onBack={() => setScreen('readingResult')}
            />
          )}
          {screen === 'writingInstructions' && <WritingInstructions />}
          {screen === 'writingPart' && (
            <WritingPart
              answer={writingAnswers[writingPartIndex] ?? ''}
              bookmarkActive={isBookmarked(bookmarkKey('writing', writingPartIndex + 1))}
              emailAnswers={writingEmailAnswers}
              part={activeWritingParts[writingPartIndex]}
              partIndex={writingPartIndex}
              showAnswer={answerRevealOpen}
              shortAnswers={writingShortAnswers}
              threeAnswers={writingThreeAnswers}
              timeRemaining={formatReadingTime(writingSeconds)}
              onAnswer={(answer) => setWritingAnswers((currentAnswers) => ({ ...currentAnswers, [writingPartIndex]: answer }))}
              onToggleBookmark={() => toggleBookmark(bookmarkKey('writing', writingPartIndex + 1))}
              onEmailAnswer={(key, answer) => setWritingEmailAnswers((currentAnswers) => ({ ...currentAnswers, [key]: answer }))}
              onShortAnswer={(index, answer) => setWritingShortAnswers((currentAnswers) => ({ ...currentAnswers, [index]: answer }))}
              onThreeAnswer={(index, answer) => setWritingThreeAnswers((currentAnswers) => ({ ...currentAnswers, [index]: answer }))}
            />
          )}
          {screen === 'writingResult' && (
            <WritingCheckingResult
              error={writingScoreError}
              loading={writingScoreLoading}
              onExit={() => setScreen('select')}
              onRetry={() => {
                resetWritingSection();
                setScreen('writingInstructions');
              }}
              result={writingScore}
            />
          )}
          {screen === 'grammarStart' && <GrammarStart onStart={() => setScreen('grammarInstructions')} />}
          {screen === 'grammarInstructions' && <GrammarInstructions />}
          {screen === 'grammarQuestion' && (
            <GrammarQuestion
              answer={grammarAnswers[grammarQuestionIndex]}
              bookmarkActive={isBookmarked(bookmarkKey('grammar', grammarQuestionIndex + 1))}
              index={grammarQuestionIndex}
              question={activeGrammarQuestions[grammarQuestionIndex] ?? activeGrammarQuestions[0]}
              showAnswer={answerRevealOpen}
              timeRemaining={formatReadingTime(grammarSeconds)}
              total={activeGrammarQuestions.length}
              onAnswer={(answer) => setGrammarAnswers((currentAnswers) => ({ ...currentAnswers, [grammarQuestionIndex]: answer }))}
              onToggleBookmark={() => toggleBookmark(bookmarkKey('grammar', grammarQuestionIndex + 1))}
            />
          )}
          {screen === 'grammarResult' && (
            <GrammarResult
              summary={grammarSummary}
              onExit={() => setScreen('select')}
              onRetry={() => {
                resetGrammarSection();
                setScreen('grammarStart');
              }}
            />
          )}
          {screen === 'listeningStart' && <ListeningStart onStart={() => setScreen('listeningInstructions')} />}
          {screen === 'listeningInstructions' && <ListeningInstructions />}
          {screen === 'listeningQuestion' && (
            <ListeningQuestion
              answer={listeningAnswers[listeningQuestionIndex]}
              bookmarkActive={isBookmarked(bookmarkKey('listening-part1', listeningQuestionIndex + 1))}
              correctAnswer={activeListeningPart1AnswerKey[listeningQuestionIndex]}
              index={listeningQuestionIndex}
              question={activeListeningPart1Questions[listeningQuestionIndex]}
              showAnswer={answerRevealOpen}
              timeRemaining={formatReadingTime(listeningSeconds)}
              total={activeListeningPart1Questions.length}
              onAnswer={(answer) => setListeningAnswers((currentAnswers) => ({ ...currentAnswers, [listeningQuestionIndex]: answer }))}
              onToggleBookmark={() => toggleBookmark(bookmarkKey('listening-part1', listeningQuestionIndex + 1))}
            />
          )}
          {screen === 'listeningMatching' && (
            <ListeningMatching
              audioUrl={activeListeningAudioByPart['2']}
              answers={listeningMatchingAnswers}
              bookmarkActive={isBookmarked(bookmarkKey('listening-part2', 1))}
              data={activeListeningMatchingData}
              showAnswer={answerRevealOpen}
              timeRemaining={formatReadingTime(listeningSeconds)}
              onAnswer={(speaker, answer) => setListeningMatchingAnswers((currentAnswers) => ({ ...currentAnswers, [speaker]: answer }))}
              onToggleBookmark={() => toggleBookmark(bookmarkKey('listening-part2', 1))}
            />
          )}
          {screen === 'listeningShort' && (
            <ListeningShortConversations
              audioUrl={activeListeningAudioByPart['3']}
              answers={listeningShortAnswers}
              bookmarkActive={isBookmarked(bookmarkKey('listening-part3', 1))}
              data={activeListeningShortData}
              showAnswer={answerRevealOpen}
              timeRemaining={formatReadingTime(listeningSeconds)}
              onAnswer={(index, answer) => setListeningShortAnswers((currentAnswers) => ({ ...currentAnswers, [index]: answer }))}
              onToggleBookmark={() => toggleBookmark(bookmarkKey('listening-part3', 1))}
            />
          )}
          {screen === 'listeningMonologues' && (
            <ListeningMonologues
              audioUrl={activeListeningMonologues[listeningMonologueIndex]?.audioUrl ?? activeListeningAudioByPart[`4-${listeningMonologueIndex}`] ?? activeListeningAudioByPart['4']}
              answers={listeningMonologueAnswers}
              bookmarkActive={isBookmarked(bookmarkKey('listening-part4', listeningMonologueIndex + 1))}
              index={listeningMonologueIndex}
              recording={activeListeningMonologues[listeningMonologueIndex] ?? activeListeningMonologues[0]}
              showAnswer={answerRevealOpen}
              timeRemaining={formatReadingTime(listeningSeconds)}
              onAnswer={(questionIndex, answer) => setListeningMonologueAnswers((currentAnswers) => ({ ...currentAnswers, [`${listeningMonologueIndex}-${questionIndex}`]: answer }))}
              onToggleBookmark={() => toggleBookmark(bookmarkKey('listening-part4', listeningMonologueIndex + 1))}
            />
          )}
          {screen === 'listeningResult' && (
            <ListeningResult
              summary={listeningSummary}
              onExit={() => setScreen('select')}
              onReview={() => setScreen('listeningReview')}
              onRetry={() => {
                resetListeningSection();
                setScreen('listeningStart');
              }}
            />
          )}
          {screen === 'listeningReview' && (
            <ListeningReview
              part1AnswerKey={activeListeningPart1AnswerKey}
              matchingAnswers={listeningMatchingAnswers}
              monologueAnswers={listeningMonologueAnswers}
              monologueAnswerKey={activeListeningMonologueAnswerKey}
              monologues={activeListeningMonologues}
              part1Answers={listeningAnswers}
              part1Questions={activeListeningPart1Questions}
              shortAnswers={listeningShortAnswers}
              onBack={() => setScreen('listeningResult')}
            />
          )}
          {screen === 'start' && <SpeakingStart test={selectedTest} onStart={() => setScreen('instructions')} />}
          {screen === 'instructions' && <SpeakingInstructions />}
          {screen === 'prompt' && <SpeakingPrompt part={1} />}
          {screen === 'part2Prompt' && <SpeakingPrompt part={2} />}
          {screen === 'part3Prompt' && <SpeakingPrompt part={3} />}
          {screen === 'part4Prompt' && <SpeakingPrompt part={4} />}
          {screen === 'question' && (
            <SpeakingQuestion
              question={activeSpeakingData.part1[questionIndex]}
              index={questionIndex}
              total={activeSpeakingData.part1.length}
              seconds={recordingSeconds}
              showAnswer={answerRevealOpen}
              isReading={!speechReady}
              microphoneLevel={microphoneLevel}
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              onFinish={goNext}
            />
          )}
          {screen === 'part2Question' && (
            <Part2Question
              question={activeSpeakingData.part2[part2QuestionIndex]}
              imageUrl={activeSpeakingData.part2Image}
              index={part2QuestionIndex}
              total={activeSpeakingData.part2.length}
              seconds={recordingSeconds}
              showAnswer={answerRevealOpen}
              isReading={!speechReady}
              microphoneLevel={microphoneLevel}
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              onOpenDraft={() => setSpeakingDraftOpen(true)}
              onFinish={goNext}
            />
          )}
          {screen === 'part3Question' && (
            <Part3Question
              question={activeSpeakingData.part3[part3QuestionIndex]}
              index={part3QuestionIndex}
              total={activeSpeakingData.part3.length}
              seconds={recordingSeconds}
              showAnswer={answerRevealOpen}
              isReading={!speechReady}
              microphoneLevel={microphoneLevel}
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              onOpenDraft={() => setSpeakingDraftOpen(true)}
              onFinish={goNext}
            />
          )}
          {screen === 'part4Question' && (
            <Part4Question
              topic={activeSpeakingData.part4}
              phase={part4Phase}
              seconds={recordingSeconds}
              showAnswer={answerRevealOpen}
              isReading={!speechReady && part4Phase === 'recording'}
              microphoneLevel={microphoneLevel}
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              onOpenDraft={() => setSpeakingDraftOpen(true)}
              onFinish={goNext}
            />
          )}
          {speakingDraftOpen && ['part2Question', 'part3Question', 'part4Question'].includes(screen) && (
            <SpeakingDraftPanel
              level={speakingDraftLevel}
              part={screen === 'part2Question' ? 2 : screen === 'part3Question' ? 3 : 4}
              question={screen === 'part2Question' ? activeSpeakingData.part2[part2QuestionIndex] : screen === 'part3Question' ? activeSpeakingData.part3[part3QuestionIndex] : activeSpeakingData.part4.title}
              questionIndex={screen === 'part2Question' ? part2QuestionIndex : screen === 'part3Question' ? part3QuestionIndex : 0}
              text={speakingDraftText}
              onClose={() => setSpeakingDraftOpen(false)}
              onInsert={insertSpeakingDraft}
              onLevelChange={setSpeakingDraftLevel}
              onTextChange={setSpeakingDraftText}
            />
          )}
          {screen === 'complete' && (
            <SpeakingComplete
              error={speakingScoreError}
              loading={speakingScoreLoading}
              onExit={() => setScreen('select')}
              onRetry={() => {
                resetSpeakingSection();
                setScreen('instructions');
              }}
              onScore={submitSpeakingForAi}
              result={speakingScore}
            />
          )}

          {screen !== 'fullStart' && screen !== 'fullResult' && screen !== 'start' && screen !== 'writingInstructions' && screen !== 'writingPart' && screen !== 'writingResult' && screen !== 'listeningStart' && screen !== 'listeningInstructions' && screen !== 'listeningQuestion' && screen !== 'listeningMatching' && screen !== 'listeningShort' && screen !== 'listeningMonologues' && screen !== 'listeningResult' && screen !== 'listeningReview' && screen !== 'readingStart' && screen !== 'readingInstructions' && screen !== 'readingQuestion' && screen !== 'readingCohesion' && screen !== 'readingOpinion' && screen !== 'readingLong' && screen !== 'readingResult' && screen !== 'readingReview' && screen !== 'grammarStart' && screen !== 'grammarInstructions' && screen !== 'grammarQuestion' && screen !== 'grammarResult' && screen !== 'question' && screen !== 'part2Question' && screen !== 'part3Question' && screen !== 'part4Question' && (
            <SpeakingFooter
              canPrevious
              canNext={(screen !== 'instructions' && screen !== 'prompt' && screen !== 'part2Prompt' && screen !== 'part3Prompt' && screen !== 'part4Prompt') || speechReady}
              showNext={screen !== 'complete' && screen !== 'part2Prompt' && screen !== 'part3Prompt' && screen !== 'part4Prompt'}
              nextLabel="Next"
              onPrevious={goPrevious}
              onNext={goNext}
            />
          )}
          {screen === 'readingInstructions' && (
            <ReadingFooter
              onPrevious={() => setScreen('readingStart')}
              onNext={() => setScreen('readingQuestion')}
            />
          )}
          {screen === 'writingInstructions' && (
            <ReadingFooter
              onPrevious={() => setScreen('select')}
              onNext={() => {
                setWritingPartIndex(0);
                setWritingSeconds(50 * 60);
                setScreen('writingPart');
              }}
            />
          )}
          {screen === 'grammarInstructions' && (
            <ReadingFooter
              onPrevious={() => setScreen('grammarStart')}
              onNext={() => {
                setGrammarQuestionIndex(0);
                setGrammarSeconds(25 * 60);
                setScreen('grammarQuestion');
              }}
            />
          )}
          {screen === 'grammarQuestion' && (
            <ReadingFooter
              answerOpen={answerRevealOpen}
              showAnswer
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              onPrevious={() => {
                if (grammarQuestionIndex > 0) setGrammarQuestionIndex((value) => value - 1);
                else setScreen('grammarInstructions');
              }}
              onNext={() => {
                if (grammarQuestionIndex < activeGrammarQuestions.length - 1) {
                  setGrammarQuestionIndex((value) => value + 1);
                } else if (isFullMock) {
                  resetReadingSection();
                  setScreen('readingStart');
                } else {
                  setScreen('grammarResult');
                }
              }}
            />
          )}
          {screen === 'writingPart' && (
            <ReadingFooter
              answerOpen={answerRevealOpen}
              nextDisabled={writingScoreLoading}
              showAnswer
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              nextLabel={writingPartIndex === activeWritingParts.length - 1 ? writingScoreLoading ? 'Scoring...' : 'Submit' : 'Next'}
              onPrevious={() => {
                if (writingPartIndex > 0) setWritingPartIndex((value) => value - 1);
                else setScreen('writingInstructions');
              }}
              onNext={() => {
                if (writingPartIndex < activeWritingParts.length - 1) setWritingPartIndex((value) => value + 1);
                else submitWritingForAi(isFullMock ? 'fullResult' : undefined);
              }}
            />
          )}
          {screen === 'listeningInstructions' && (
            <ReadingFooter
              onPrevious={() => setScreen('listeningStart')}
              onNext={() => {
                setListeningQuestionIndex(0);
                setScreen('listeningQuestion');
              }}
            />
          )}
          {screen === 'listeningQuestion' && (
            <ReadingFooter
              answerOpen={answerRevealOpen}
              showAnswer
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              onPrevious={() => {
                if (listeningQuestionIndex > 0) setListeningQuestionIndex((value) => value - 1);
                else setScreen('listeningInstructions');
              }}
              onNext={() => {
                if (listeningQuestionIndex < activeListeningPart1Questions.length - 1) setListeningQuestionIndex((value) => value + 1);
                else setScreen('listeningMatching');
              }}
            />
          )}
          {screen === 'listeningMatching' && (
            <ReadingFooter
              answerOpen={answerRevealOpen}
              showAnswer
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              onPrevious={() => {
                setListeningQuestionIndex(activeListeningPart1Questions.length - 1);
                setScreen('listeningQuestion');
              }}
              onNext={() => setScreen('listeningShort')}
            />
          )}
          {screen === 'listeningShort' && (
            <ReadingFooter
              answerOpen={answerRevealOpen}
              showAnswer
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              onPrevious={() => setScreen('listeningMatching')}
              onNext={() => {
                setListeningMonologueIndex(0);
                setScreen('listeningMonologues');
              }}
            />
          )}
          {screen === 'listeningMonologues' && (
            <ReadingFooter
              answerOpen={answerRevealOpen}
              showAnswer
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              onPrevious={() => {
                if (listeningMonologueIndex > 0) setListeningMonologueIndex((value) => value - 1);
                else setScreen('listeningShort');
              }}
              onNext={() => {
                if (listeningMonologueIndex < activeListeningMonologues.length - 1) {
                  setListeningMonologueIndex((value) => value + 1);
                } else if (isFullMock) {
                  resetGrammarSection();
                  setScreen('grammarStart');
                } else {
                  setScreen('listeningResult');
                }
              }}
            />
          )}
          {screen === 'readingQuestion' && (
            <ReadingFooter
              answerOpen={answerRevealOpen}
              showAnswer
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              onPrevious={() => setScreen('readingInstructions')}
              onNext={() => {
                setReadingCohesionIndex(0);
                setScreen('readingCohesion');
              }}
            />
          )}
          {screen === 'readingCohesion' && (
            <ReadingFooter
              answerOpen={answerRevealOpen}
              showAnswer
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              onPrevious={() => {
                if (readingCohesionIndex > 0) setReadingCohesionIndex((value) => value - 1);
                else setScreen('readingQuestion');
              }}
              onNext={() => {
                if (readingCohesionIndex < activeReadingData.cohesion.length - 1) setReadingCohesionIndex((value) => value + 1);
                else setScreen('readingOpinion');
              }}
            />
          )}
          {screen === 'readingOpinion' && (
            <ReadingFooter
              answerOpen={answerRevealOpen}
              showAnswer
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              onPrevious={() => {
                setReadingCohesionIndex(Math.max(0, activeReadingData.cohesion.length - 1));
                setScreen('readingCohesion');
              }}
              onNext={() => setScreen('readingLong')}
            />
          )}
          {screen === 'readingLong' && (
            <ReadingFooter
              answerOpen={answerRevealOpen}
              showAnswer
              onToggleAnswer={() => setAnswerRevealOpen((value) => !value)}
              onPrevious={() => setScreen('readingOpinion')}
              onNext={() => {
                if (isFullMock) {
                  resetWritingSection();
                  setScreen('writingInstructions');
                } else {
                  setScreen('readingResult');
                }
              }}
            />
          )}
        </div>
      )}
      {questionListOpen && (
        <QuestionListPanel
          items={questionListItems}
          onClose={() => setQuestionListOpen(false)}
        />
      )}
    </div>
  );
}

function MockSelectLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <div className="mx-auto max-w-[1180px]">
        {children}
      </div>
    </div>
  );
}

function MockSelect({ selectedSkill, onSkillChange, onOpenSpeaking, onOpenReading, onOpenListening, onOpenWriting, onOpenGrammar, onOpenFull, proActive, authenticated }: { selectedSkill: MockSkill; onSkillChange: (skill: MockSkill) => void; onOpenSpeaking: (card: MockCard) => void; onOpenReading: (card: MockCard) => void; onOpenListening: (card: MockCard) => void; onOpenWriting: (card: MockCard) => void; onOpenGrammar: (card: MockCard) => void; onOpenFull: (card: MockCard) => void; proActive: boolean; authenticated: boolean }) {
  const [adminCards, setAdminCards] = useState<MockCard[]>(() => loadPublishedAdminMockCards());
  const [creatingRandom, setCreatingRandom] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const reloadAdminCards = () => {
      Promise.all([
        unwrap<ApiMockTest[]>(api.get('/mock-tests')),
        unwrap<Test[]>(api.get('/tests')).catch(() => [])
      ])
        .then(async ([mockTests, tests]) => {
          const mockCards = mockTests.map(apiMockTestToCard).filter((card): card is MockCard => Boolean(card));
          const examCards = await apiExamTestsToCards(tests);
          const localCards = loadPublishedAdminMockCards();
          const cards = mergeMockCardsByIdentity(mergeStoredFeatured([...mockCards, ...examCards, ...localCards]));
          setAdminCards(cards);
        })
        .catch(() => setAdminCards(loadPublishedAdminMockCards()));
    };
    reloadAdminCards();
    window.addEventListener('focus', reloadAdminCards);
    window.addEventListener('storage', reloadAdminCards);
    window.addEventListener('aptis-admin-mock-tests-updated', reloadAdminCards);
    return () => {
      window.removeEventListener('focus', reloadAdminCards);
      window.removeEventListener('storage', reloadAdminCards);
      window.removeEventListener('aptis-admin-mock-tests-updated', reloadAdminCards);
    };
  }, []);

  const visibleCards = adminCards
    .filter((card) => card.skill === selectedSkill)
    .sort(compareMockCards);

  function createRandomMockTest() {
    if (!authenticated) {
      toast.error('Bạn cần đăng nhập để chọn đề thi thử random.', { id: 'login-required' });
      navigate('/login');
      return;
    }

    const randomCard = visibleCards.length ? visibleCards[Math.floor(Math.random() * visibleCards.length)] : undefined;
    if (!randomCard) {
      toast.error('Chưa có đề thi thử phù hợp để random.');
      return;
    }

    setCreatingRandom(true);
    window.setTimeout(() => {
      toast.success('Đã chọn đề thi thử random.');
      if (selectedSkill === 'FULL') onOpenFull(randomCard);
      if (selectedSkill === 'SPEAKING') onOpenSpeaking(randomCard);
      if (selectedSkill === 'READING') onOpenReading(randomCard);
      if (selectedSkill === 'LISTENING') onOpenListening(randomCard);
      if (selectedSkill === 'WRITING') onOpenWriting(randomCard);
      if (selectedSkill === 'GRAMMAR') onOpenGrammar(randomCard);
      setCreatingRandom(false);
    }, 250);
  }

  return (
    <section>
      <div className="rounded-2xl border border-brand-100 bg-white p-7 text-navy shadow-soft md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-extrabold text-brand-700">
              <FileCheck size={18} />
              Thi thử Aptis
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight">Chọn kỹ năng thi thử</h1>
            <p className="mt-3 max-w-2xl text-lg font-medium leading-8 text-slate-700">
              Thi thử mô phỏng giao diện assessment. Chọn Full hoặc từng kỹ năng để vào đúng kiểu bài.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-sky-50 p-5 md:w-[300px]">
            <p className="text-sm font-bold text-slate-600">Kỹ năng đang chọn</p>
            <p className="mt-3 text-3xl font-extrabold">{skillFilters.find((item) => item.key === selectedSkill)?.label}</p>
            <button type="button" onClick={createRandomMockTest} disabled={creatingRandom} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-emerald-700 disabled:opacity-70">
              {creatingRandom ? <RotateCcw className="animate-spin" size={17} /> : <Shuffle size={17} />}
              {creatingRandom ? 'Đang tạo...' : 'Đề thi thử random'}
            </button>
            <p className="mt-3 text-xs font-bold leading-5 text-slate-600">
              Random từ các đề thi thử đã xuất bản và mở bằng giao diện assessment.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {skillFilters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => onSkillChange(filter.key)}
            className={`h-12 rounded-xl border px-6 text-sm font-extrabold transition ${
              selectedSkill === filter.key
                ? 'border-brand-600 bg-brand-600 text-white shadow-lift shadow-brand-600/20'
                : 'border-brand-100 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map((card, index) => (
          <MockSkillCard
            key={card.id}
            card={card}
            proLocked={!proActive && index >= FREE_MOCK_TESTS_PER_SKILL}
            onOpenSpeaking={onOpenSpeaking}
            onOpenReading={onOpenReading}
            onOpenListening={onOpenListening}
            onOpenWriting={onOpenWriting}
            onOpenGrammar={onOpenGrammar}
            onOpenFull={onOpenFull}
          />
        ))}
      </div>
      {visibleCards.length === 0 && (
        <div className="mt-7 rounded-2xl border border-dashed border-brand-100 bg-white p-8 text-center text-sm font-bold text-slate-600">
          Chưa có đề thi thử đang hiển thị cho kỹ năng này.
        </div>
      )}
    </section>
  );
}

function MockSkillCard({
  card,
  proLocked,
  onOpenSpeaking,
  onOpenReading,
  onOpenListening,
  onOpenWriting,
  onOpenGrammar,
  onOpenFull
}: {
  card: MockCard;
  proLocked: boolean;
  onOpenSpeaking: (card: MockCard) => void;
  onOpenReading: (card: MockCard) => void;
  onOpenListening: (card: MockCard) => void;
  onOpenWriting: (card: MockCard) => void;
  onOpenGrammar: (card: MockCard) => void;
  onOpenFull: (card: MockCard) => void;
}) {
  const navigate = useNavigate();
  const Icon = card.icon;
  const openCard = card.skill === 'SPEAKING' ? onOpenSpeaking : card.skill === 'READING' ? onOpenReading : card.skill === 'LISTENING' ? onOpenListening : card.skill === 'WRITING' ? onOpenWriting : card.skill === 'GRAMMAR' ? onOpenGrammar : card.skill === 'FULL' ? onOpenFull : undefined;
  const handleOpen = () => {
    if (!card.ready) return;
    if (proLocked) {
      toast.error('Bạn cần nâng cấp tài khoản để làm bài thi thử này.', { id: 'upgrade-required' });
      window.setTimeout(() => navigate('/app/renewal'), 900);
      return;
    }
    openCard?.(card);
  };

  return (
    <article className={`rounded-[24px] border bg-white p-6 shadow-soft ${card.featured ? 'border-amber-400 ring-4 ring-amber-100' : 'border-brand-100'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-14 w-14 place-items-center rounded-2xl ${card.color}`}>
          <Icon size={23} />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {card.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-700">
              <Star size={13} className="fill-amber-400 text-amber-500" /> Quan trảng
            </span>
          )}
          {proLocked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-700">
              <Lock size={13} /> Pro
            </span>
          )}
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-extrabold text-slate-700">{card.label}</span>
        </div>
      </div>

      <h2 className="mt-6 text-xl font-extrabold text-navy">{card.title}</h2>
      <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{card.description}</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <InfoBox icon={<FileQuestion size={17} />} label="Câu hỏi" value={card.questions} />
        <InfoBox icon={<Clock size={17} />} label="Thời gian" value={card.minutes} />
      </div>

      <button
        type="button"
        onClick={handleOpen}
        disabled={!card.ready}
        className={`mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition ${
          proLocked ? 'bg-red-600 text-white hover:bg-red-700' : card.ready ? 'bg-brand-600 text-white hover:bg-brand-700' : 'cursor-not-allowed bg-sky-100 text-slate-500'
        }`}
      >
        {proLocked ? 'Mở khóa Pro' : card.ready ? 'Vào đề' : 'Sắp có'}
        <ArrowRight size={18} />
      </button>
    </article>
  );
}

function InfoBox({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-sky-50 p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-extrabold text-navy">{value}</p>
    </div>
  );
}

function BookmarkButton({
  active,
  height = 44,
  iconSize = 18,
  fontSize = 17,
  padding = '0 16px',
  onToggle
}: {
  active: boolean;
  height?: number;
  iconSize?: number;
  fontSize?: number;
  padding?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      title={active ? 'B? bookmark câu này' : 'Bookmark câu này'}
      style={{
        height,
        display: 'inline-flex',
        alignItems: 'center',
        gap: iconSize >= 22 ? 12 : 10,
        borderRadius: iconSize >= 22 ? 16 : 14,
        border: active ? '1px solid #7c3aed' : '1px solid #dce3ee',
        backgroundColor: active ? '#f3efff' : '#ffffff',
        padding,
        color: active ? '#2b075c' : '#020817',
        fontSize,
        fontWeight: active ? 800 : 500
      }}
    >
      <Bookmark size={iconSize} fill={active ? '#2b075c' : 'none'} />
      {active ? 'Bookmarked' : 'Bookmark'}
    </button>
  );
}

function QuestionListPanel({ items, onClose }: { items: QuestionListItem[]; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        backgroundColor: 'rgba(15, 23, 42, 0.32)',
        display: 'flex',
        justifyContent: 'flex-start'
      }}
      onClick={onClose}
    >
      <aside
        style={{
          width: 'min(420px, 100%)',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '18px 0 36px rgba(15, 23, 42, 0.18)',
          padding: '24px',
          overflowY: 'auto'
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13, fontWeight: 800, textTransform: 'uppercase' }}>Question navigator</p>
            <h2 style={{ margin: '5px 0 0', color: '#020817', fontSize: 24, fontWeight: 900 }}>Danh sách câu hỏi</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 42,
              height: 42,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '50%',
              border: '1px solid #dce3ee',
              backgroundColor: '#ffffff',
              color: '#475569'
            }}
            aria-label="Đóng danh sách câu hỏi"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                item.onSelect();
                onClose();
              }}
              style={{
                width: '100%',
                minHeight: 66,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                gap: 14,
                borderRadius: 14,
                border: item.active ? '2px solid #2b075c' : '1px solid #dce3ee',
                backgroundColor: item.active ? '#f3efff' : '#ffffff',
                padding: '12px 14px',
                textAlign: 'left',
                color: '#020817'
              }}
            >
              <span>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 900 }}>{item.label}</span>
                <span style={{ display: 'block', marginTop: 4, color: '#64748b', fontSize: 13, fontWeight: 600, lineHeight: '18px' }}>{item.detail}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {item.bookmarked && <Bookmark size={18} fill="#2b075c" color="#2b075c" />}
                {item.active && <span style={{ borderRadius: 999, backgroundColor: '#2b075c', padding: '5px 9px', color: '#ffffff', fontSize: 12, fontWeight: 900 }}>Đang làm</span>}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function SpeakingTopbar({ part, soundEnabled, onExit, onToggleSound }: { part: number; soundEnabled: boolean; onExit: () => void; onToggleSound: () => void }) {
  const SoundIcon = soundEnabled ? Volume2 : VolumeX;
  return (
    <header className="mock-test-topbar h-[74px] px-7 text-white shadow-soft" style={{ backgroundColor: '#2b075c' }}>
      <div className="flex h-full items-center justify-between">
        <div className="mock-speaking-title translate-y-2">
          <p className="text-base font-semibold text-[#d9c7f3]">Speaking</p>
          <h1 className="text-xl font-extrabold leading-6 text-white">Part {part} of 4</h1>
        </div>
        <div className="mock-speaking-topbar-actions flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSound}
            className="mock-topbar-action inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-extrabold text-white hover:bg-white/25"
            title={soundEnabled ? 'Tắt âm thanh đọc đề' : 'Bật âm thanh đọc đề'}
          >
            <SoundIcon size={19} />
            <span className="mock-topbar-button-label">{soundEnabled ? 'Âm thanh' : 'Đã tắt âm'}</span>
          </button>
        <button type="button" onClick={onExit} title="Thoát" className="mock-topbar-action inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-5 text-lg font-extrabold text-white hover:bg-white/25">
          <LogOut size={21} />
          <span className="mock-topbar-button-label">Thoát</span>
        </button>
        </div>
      </div>
    </header>
  );
}

function SpeakingTopbarWithAudio({ part, soundEnabled, onExit, onToggleSound }: { part: number; soundEnabled: boolean; onExit: () => void; onToggleSound: () => void }) {
  const SoundIcon = soundEnabled ? Volume2 : VolumeX;

  return (
    <header className="mock-test-topbar h-[74px] px-7 text-white shadow-soft" style={{ backgroundColor: '#2b075c' }}>
      <div className="flex h-full items-center justify-between">
        <div className="mock-speaking-title translate-y-2">
          <p className="text-base font-semibold text-[#d9c7f3]">Speaking</p>
          <h1 className="text-xl font-extrabold leading-6 text-white">Part {part} of 4</h1>
        </div>
        <div className="mock-speaking-topbar-actions flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSound}
            className="mock-topbar-action inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-extrabold text-white hover:bg-white/25"
            title={soundEnabled ? 'Mute speaking audio' : 'Unmute speaking audio'}
          >
            <SoundIcon size={19} />
            <span className="mock-topbar-button-label">{soundEnabled ? 'Sound on' : 'Muted'}</span>
          </button>
          <button type="button" onClick={onExit} title="Exit" className="mock-topbar-action inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-5 text-lg font-extrabold text-white hover:bg-white/25">
            <LogOut size={21} />
            <span className="mock-topbar-button-label">Exit</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function ReadingTopbar({ title, onExit }: { title: string; onExit: () => void }) {
  return (
    <header className="mock-test-topbar h-[74px] px-7 text-white shadow-soft" style={{ backgroundColor: '#2b075c' }}>
      <div className="flex h-full items-center justify-between">
        <div>
          <p className="text-base font-semibold text-[#d9c7f3]">Reading</p>
          <h1 className="text-xl font-extrabold leading-6 text-white">{title}</h1>
        </div>
        <button type="button" onClick={onExit} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-5 text-lg font-extrabold text-white hover:bg-white/25">
          <LogOut size={21} />
          Thoát
        </button>
      </div>
    </header>
  );
}

function ListeningTopbar({ title, onExit }: { title: string; onExit: () => void }) {
  return (
    <header className="mock-test-topbar h-[66px] px-7 text-white shadow-soft" style={{ backgroundColor: '#2b075c' }}>
      <div className="flex h-full items-center justify-between">
        <div>
          <p className="text-base font-semibold text-[#d9c7f3]">Listening</p>
          <h1 className="text-xl font-extrabold leading-6 text-white">{title}</h1>
        </div>
        <button type="button" onClick={onExit} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-5 text-lg font-extrabold text-white hover:bg-white/25">
          <LogOut size={21} />
          Thoát
        </button>
      </div>
    </header>
  );
}

function WritingTopbar({ title, onExit }: { title: string; onExit: () => void }) {
  return (
    <header className="mock-test-topbar h-[68px] px-6 text-white shadow-soft" style={{ backgroundColor: '#2b075c' }}>
      <div className="flex h-full items-center justify-between">
        <div>
          <p className="text-base font-medium text-[#d9c7f3]">Writing</p>
          <h1 className="text-[17px] font-extrabold leading-6 text-white">{title}</h1>
        </div>
        <button type="button" onClick={onExit} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-5 text-lg font-extrabold text-white hover:bg-white/25">
          <LogOut size={21} />
          Thoát
        </button>
      </div>
    </header>
  );
}

function GrammarTopbar({ onExit }: { onExit: () => void }) {
  return (
    <header className="mock-test-topbar h-[68px] px-6 text-white shadow-soft" style={{ backgroundColor: '#2b075c' }}>
      <div className="flex h-full items-center justify-between">
        <div>
          <p className="text-base font-medium text-[#d9c7f3]">Grammar & Vocabulary</p>
          <h1 className="text-[17px] font-extrabold leading-6 text-white">Grammar & Vocabulary - Full Practice</h1>
        </div>
        <button type="button" onClick={onExit} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-5 text-lg font-extrabold text-white hover:bg-white/25">
          <LogOut size={21} />
          Thoát
        </button>
      </div>
    </header>
  );
}

function FullTopbar({ onExit }: { onExit: () => void }) {
  return (
    <header className="h-[68px] px-6 text-white shadow-soft" style={{ backgroundColor: '#2b075c' }}>
      <div className="flex h-full items-center justify-between">
        <div>
          <p className="text-base font-medium text-[#d9c7f3]">Full Mock Test</p>
          <h1 className="text-[17px] font-extrabold leading-6 text-white">Aptis Full Practice</h1>
        </div>
        <button type="button" onClick={onExit} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-5 text-lg font-extrabold text-white hover:bg-white/25">
          <ArrowLeft size={21} />
          Quay lại danh sách
        </button>
      </div>
    </header>
  );
}

function FullStart({ mockCard, onStart }: { mockCard?: MockCard | null; onStart: () => void }) {
  const sections = [
    { name: 'Speaking', detail: '4 parts · 12 min' },
    { name: 'Listening', detail: '4 parts · 40 min' },
    { name: 'Grammar & Vocabulary', detail: '30 questions · 25 min' },
    { name: 'Reading', detail: '5 parts · 35 min' },
    { name: 'Writing', detail: '4 parts · 50 min' }
  ];

  return (
    <main className="min-h-[calc(100vh-68px)] bg-white px-6 py-12 sm:px-[68px]">
      <section className="max-w-[760px]">
        <p className="text-lg font-medium text-slate-600">Aptis General Practice Test</p>
        <h2 className="mt-3 text-[28px] font-extrabold leading-9 text-navy">{mockCard?.title ?? 'Full Aptis Mock Test'}</h2>
        <p className="mt-2 max-w-[620px] text-lg leading-8 text-slate-600">
          {mockCard?.description ?? 'Làm lần lượt 5 bài thi thử trong cùng một phiên: Nói, Nghe, Grammar & Vocabulary, Đọc, Viết.'}
        </p>

        <div className="mt-8 grid max-w-[480px] grid-cols-2 gap-12">
          <div>
            <p className="text-base font-medium text-slate-600">Number of Sections</p>
            <p className="mt-2 text-lg font-extrabold text-navy">{mockCard?.questions ?? '5 bài'}</p>
          </div>
          <div>
            <p className="text-base font-medium text-slate-600">Time Allowed</p>
            <p className="mt-2 text-lg font-extrabold text-navy">{mockCard?.minutes ?? '162 phút'}</p>
          </div>
        </div>

        <div className="mt-8 max-w-[640px] rounded-2xl border border-brand-100 bg-sky-50 p-4">
          {sections.map((section, index) => (
            <div key={section.name} className={`flex items-center gap-4 py-3 ${index === sections.length - 1 ? '' : 'border-b border-brand-100'}`}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#2b075c] text-sm font-extrabold text-white">{index + 1}</span>
              <div>
                <p className="font-extrabold text-navy">{section.name}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{section.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 max-w-[520px]">
          <MicTestPanel />
        </div>

        <button type="button" onClick={onStart} className="mt-8 h-[46px] rounded-xl px-7 text-lg font-semibold text-white hover:opacity-95" style={{ backgroundColor: '#2b075c' }}>
          Start Assessment
        </button>
      </section>
    </main>
  );
}

function GrammarStart({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-[calc(100vh-68px)] bg-white px-6 py-12 sm:px-[68px]">
      <section className="max-w-[620px]">
        <p className="text-lg font-medium text-slate-600">Aptis General Practice Test</p>
        <h2 className="mt-3 text-[26px] font-extrabold leading-8 text-navy">Grammar & Vocabulary Practice Test</h2>
        <p className="mt-2 text-lg text-slate-600">Grammar & Vocabulary - Full Practice</p>

        <div className="mt-8 grid max-w-[360px] grid-cols-2 gap-12 sm:gap-20">
          <div>
            <p className="text-base font-medium text-slate-600">Number of Questions</p>
            <p className="mt-2 text-lg font-extrabold text-navy">30</p>
          </div>
          <div>
            <p className="text-base font-medium text-slate-600">Time Allowed</p>
            <p className="mt-2 text-lg font-extrabold text-navy">25 min</p>
          </div>
        </div>

        <button type="button" onClick={onStart} className="mt-8 h-[46px] rounded-xl px-7 text-lg font-semibold text-white hover:opacity-95" style={{ backgroundColor: '#2b075c' }}>
          Start Assessment
        </button>
      </section>
    </main>
  );
}

function GrammarInstructions() {
  return (
    <main
      className="mock-speaking-main"
      style={{
        minHeight: 'calc(100vh - 68px)',
        backgroundColor: '#ffffff',
        padding: '44px 24px 132px'
      }}
    >
      <section style={{ maxWidth: 980, marginLeft: 66 }}>
        <h2 style={{ color: '#000000', fontSize: 24, lineHeight: '32px', fontWeight: 900, margin: 0 }}>Aptis General Grammar & Vocabulary Instructions</h2>
        <h3 style={{ color: '#000000', fontSize: 20, lineHeight: '28px', fontWeight: 900, margin: '28px 0 0' }}>Grammar & Vocabulary</h3>
        <div style={{ color: '#020817', fontSize: 19, lineHeight: '36px', marginTop: 8 }}>
          <p style={{ margin: 0 }}>The test has 30 questions.</p>
          <p style={{ margin: 0 }}>You have 25 minutes to complete the test.</p>
          <p style={{ margin: '28px 0 0' }}>When you click on the 'Next' button, the test will begin.</p>
        </div>
      </section>
    </main>
  );
}

function GrammarQuestion({ answer, bookmarkActive, index, question, showAnswer, timeRemaining, total, onAnswer, onToggleBookmark }: { answer?: string; bookmarkActive: boolean; index: number; question: GrammarQuestionItem; showAnswer?: boolean; timeRemaining: string; total: number; onAnswer: (answer: string) => void; onToggleBookmark: () => void }) {
  const matchingSelections = parseGrammarMatchingAnswer(answer);
  const updateMatchingAnswer = (word: string, value: string) => {
    onAnswer(JSON.stringify({ ...matchingSelections, [word]: value }));
  };

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 68px)',
        backgroundColor: '#f1f1f1',
        padding: '38px 24px 132px'
      }}
    >
      <section style={{ maxWidth: 830, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'start', gap: 28 }}>
          <div>
            <h2 style={{ color: '#020817', fontSize: 17, lineHeight: '24px', fontWeight: 900, margin: 0 }}>Grammar & Vocabulary</h2>
            <p style={{ color: '#020817', fontSize: 17, lineHeight: '24px', margin: 0 }}>Question {index + 1} of {total}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12 }}>
            <BookmarkButton active={bookmarkActive} onToggle={onToggleBookmark} padding="0 18px" />
            <button
              type="button"
              style={{
                width: 42,
                height: 42,
                display: 'grid',
                placeItems: 'center',
                border: '1px solid #e2e8f0',
                borderRadius: 999,
                backgroundColor: '#ffffff',
                color: '#64748b'
              }}
            >
              <Pause size={18} />
            </button>
          </div>

          <div style={{ minWidth: 170, textAlign: 'center', paddingTop: 2 }}>
            <p style={{ color: '#000000', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 31, lineHeight: '38px', fontWeight: 900, letterSpacing: 0, margin: 0 }}>{timeRemaining}</p>
            <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>Time remaining</p>
            <div style={{ height: 4, width: 162, borderRadius: 999, backgroundColor: '#2b075c', margin: '8px auto 0' }} />
          </div>
        </div>

        <article
          style={{
            marginTop: 34,
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            backgroundColor: '#ffffff',
            padding: question.matchRows ? '26px 26px 28px' : 26,
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)'
          }}
        >
          {question.collocationRows ? (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, borderRadius: 999, backgroundColor: '#f1eaff', color: '#2b075c', padding: '0 10px', fontSize: 15 }}>
                Collocation Matching
              </span>
              <p style={{ color: '#1f2937', fontSize: 17, lineHeight: '27px', margin: '14px 0 24px' }}>
                Select a word from each drop-down list on the right that is most often used with each word on the left.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '104px 145px 28px 180px', alignItems: 'center', gap: 10, color: '#a1a8b3', fontSize: 15, marginBottom: 18 }}>
                <span>Example</span>
                <span style={grammarExampleBoxStyle}>big</span>
                <span style={{ textAlign: 'center' }}>+</span>
                <span style={grammarExampleBoxStyle}>house</span>
              </div>

              <div style={{ height: 1, backgroundColor: '#e2e8f0', margin: '0 0 20px' }} />

              <div style={{ display: 'grid', gap: 16 }}>
                {question.collocationRows.map((row) => (
                  <div key={row.word} style={{ display: 'grid', gridTemplateColumns: '180px 28px 252px', alignItems: 'center', gap: 10 }}>
                    <div style={grammarWordBoxStyle}>{row.word}</div>
                    <span style={{ color: '#64748b', textAlign: 'center', fontSize: 18 }}>+</span>
                    <select
                      value={matchingSelections[row.word] ?? ''}
                      onChange={(event) => updateMatchingAnswer(row.word, event.target.value)}
                      style={grammarSynonymSelectStyle}
                    >
                      <option value="">Select...</option>
                      {question.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </>
          ) : question.sentenceRows ? (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, borderRadius: 999, backgroundColor: '#f1eaff', color: '#2b075c', padding: '0 10px', fontSize: 15 }}>
                Sentence Gap Fill
              </span>
              <p style={{ color: '#1f2937', fontSize: 17, lineHeight: '27px', margin: '14px 0 24px' }}>
                Select a word from each drop-down list on the right that has the same or a very similar meaning to each word on the left.
              </p>

              <div style={{ display: 'grid', gap: 14 }}>
                {question.sentenceRows.map((row) => (
                  <div key={`${row.before}-${row.after}`} style={{ color: '#020817', fontSize: 17, lineHeight: '46px' }}>
                    <span>{row.before}</span>
                    <select
                      value={matchingSelections[row.before] ?? ''}
                      onChange={(event) => updateMatchingAnswer(row.before, event.target.value)}
                      style={grammarSentenceSelectStyle}
                    >
                      <option value="">Select...</option>
                      {question.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {row.after && <span>{row.after}</span>}
                  </div>
                ))}
              </div>
            </>
          ) : question.definitionRows ? (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, borderRadius: 999, backgroundColor: '#f1eaff', color: '#2b075c', padding: '0 10px', fontSize: 15 }}>
                {question.definitionMode === 'matching' ? 'Definition Matching' : 'Definition Completion'}
              </span>
              <p style={{ color: '#1f2937', fontSize: 17, lineHeight: '27px', margin: '14px 0 26px' }}>
                Complete each definition using a word from the drop-down list.
              </p>

              <div style={{ display: 'grid', gap: 14 }}>
                {question.definitionRows.map((row) => (
                  <div key={row.definition} style={{ display: 'grid', gridTemplateColumns: question.definitionMode === 'matching' ? '1fr 252px' : '1fr 48px 252px', alignItems: 'center', gap: 14 }}>
                    <div style={grammarDefinitionBoxStyle}>{row.definition}</div>
                    {question.definitionMode !== 'matching' && (
                      <span style={{ color: '#64748b', fontSize: 18, textAlign: 'center' }}>is to</span>
                    )}
                    <select
                      value={matchingSelections[row.definition] ?? ''}
                      onChange={(event) => updateMatchingAnswer(row.definition, event.target.value)}
                      style={grammarSynonymSelectStyle}
                    >
                      <option value="">Select...</option>
                      {question.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </>
          ) : question.matchRows ? (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, borderRadius: 999, backgroundColor: '#f1eaff', color: '#2b075c', padding: '0 10px', fontSize: 15 }}>
                Synonym Matching
              </span>
              <p style={{ color: '#1f2937', fontSize: 17, lineHeight: '27px', margin: '14px 0 24px' }}>
                Select a word from each drop-down list on the right that has the same or very similar meaning to each word on the left.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '104px 145px 28px 180px', alignItems: 'center', gap: 10, color: '#a1a8b3', fontSize: 15, marginBottom: 18 }}>
                <span>Example</span>
                <span style={grammarExampleBoxStyle}>big</span>
                <span style={{ textAlign: 'center' }}>=</span>
                <span style={grammarExampleBoxStyle}>large</span>
              </div>

              <div style={{ height: 1, backgroundColor: '#e2e8f0', margin: '0 0 20px' }} />

              <div style={{ display: 'grid', gap: 16 }}>
                {question.matchRows.map((row) => (
                  <div key={row.word} style={{ display: 'grid', gridTemplateColumns: '180px 28px 252px', alignItems: 'center', gap: 10 }}>
                    <div style={grammarWordBoxStyle}>{row.word}</div>
                    <span style={{ color: '#64748b', textAlign: 'center', fontSize: 18 }}>=</span>
                    <select
                      value={matchingSelections[row.word] ?? ''}
                      onChange={(event) => updateMatchingAnswer(row.word, event.target.value)}
                      style={grammarSynonymSelectStyle}
                    >
                      <option value="">Select...</option>
                      {question.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, borderRadius: 999, backgroundColor: '#f1eaff', color: '#2b075c', padding: '0 10px', fontSize: 15 }}>
                Multiple Choice
              </span>
              <h3 style={{ color: '#020817', fontSize: 17, lineHeight: '26px', fontWeight: 900, margin: '12px 0 28px' }}>{question.prompt}</h3>

              <div style={{ overflow: 'hidden', border: '1px solid #dfe3ea', borderRadius: 12 }}>
                {question.options.map((option, optionIndex) => {
                  const letter = String.fromCharCode(65 + optionIndex);
                  const selected = answer === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onAnswer(option)}
                      style={{
                        width: '100%',
                        minHeight: 59,
                        display: 'grid',
                        gridTemplateColumns: '62px 1fr',
                        alignItems: 'stretch',
                        border: 0,
                        borderTop: optionIndex === 0 ? 0 : '1px solid #dfe3ea',
                        backgroundColor: selected ? '#f6f1ff' : '#ffffff',
                        color: '#020817',
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ display: 'grid', placeItems: 'center', borderRight: '1px solid #dfe3ea', fontSize: 22, fontWeight: 900, color: selected ? '#2b075c' : '#020817' }}>{letter}</span>
                      <span style={{ display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: 17 }}>{option}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )} 
          {showAnswer && (
            <InlineAnswer>
              <GrammarAnswerContent question={question} />
            </InlineAnswer>
          )}
        </article>
      </section>
    </main>
  );
}

function parseGrammarMatchingAnswer(answer?: string): Record<string, string> {
  if (!answer) return {};
  try {
    const parsed = JSON.parse(answer);
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

const grammarExampleBoxStyle = {
  height: 42,
  display: 'flex',
  alignItems: 'center',
  border: '1px solid #e2e8f0',
  borderRadius: 5,
  backgroundColor: '#f8fafc',
  color: '#8b95a1',
  padding: '0 16px',
  fontSize: 17
};

const grammarWordBoxStyle = {
  height: 42,
  display: 'flex',
  alignItems: 'center',
  border: '1px solid #cfd7e3',
  borderRadius: 4,
  backgroundColor: '#ffffff',
  color: '#020817',
  padding: '0 14px',
  fontSize: 17,
  fontWeight: 500
};

const grammarDefinitionBoxStyle = {
  height: 42,
  display: 'flex',
  alignItems: 'center',
  border: '1px solid #cfd7e3',
  borderRadius: 4,
  backgroundColor: '#ffffff',
  color: '#020817',
  padding: '0 14px',
  fontSize: 17,
  fontWeight: 500
};

const grammarSynonymSelectStyle = {
  height: 44,
  border: '1px solid #dfe3ea',
  borderRadius: 12,
  backgroundColor: '#ffffff',
  color: '#020817',
  padding: '0 16px',
  fontSize: 16,
  outline: 'none'
};

const grammarSentenceSelectStyle = {
  width: 252,
  height: 44,
  border: '1px solid #dfe3ea',
  borderRadius: 12,
  backgroundColor: '#ffffff',
  color: '#020817',
  padding: '0 16px',
  margin: '0 10px',
  fontSize: 16,
  outline: 'none'
};

function WritingInstructions() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 68px)',
        backgroundColor: '#ffffff',
        padding: '44px 24px 132px'
      }}
    >
      <section style={{ maxWidth: 980, marginLeft: 63 }}>
        <h2 style={{ color: '#000000', fontSize: 24, lineHeight: '32px', fontWeight: 900, margin: 0 }}>Aptis General Writing Instructions</h2>
        <h3 style={{ color: '#000000', fontSize: 20, lineHeight: '28px', fontWeight: 900, margin: '18px 0 0' }}>Writing</h3>
        <div style={{ color: '#020817', fontSize: 17, lineHeight: '28px', marginTop: 10 }}>
          <p style={{ margin: 0 }}>The test has four parts and takes up to 50 minutes.</p>
          <p style={{ margin: '2px 0 0' }}>Recommended times: Part One: 6 min / Part Two: 12 min / Part Three: 17 min / Part Four: 15 min</p>
          <p style={{ margin: '30px 0 0' }}>When you click on the 'Next' button, the test will begin.</p>
        </div>
      </section>
    </main>
  );
}

function WritingPart({
  answer,
  bookmarkActive,
  emailAnswers,
  part,
  partIndex,
  showAnswer,
  shortAnswers,
  threeAnswers,
  timeRemaining,
  onAnswer,
  onEmailAnswer,
  onShortAnswer,
  onThreeAnswer,
  onToggleBookmark
}: {
  answer: string;
  bookmarkActive: boolean;
  emailAnswers: Record<string, string>;
  part: WritingPartData;
  partIndex: number;
  showAnswer?: boolean;
  shortAnswers: Record<number, string>;
  threeAnswers: Record<number, string>;
  timeRemaining: string;
  onAnswer: (answer: string) => void;
  onEmailAnswer: (key: string, answer: string) => void;
  onShortAnswer: (index: number, answer: string) => void;
  onThreeAnswer: (index: number, answer: string) => void;
  onToggleBookmark: () => void;
}) {
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const isShortAnswerPart = partIndex === 0;
  const isThreeQuestionsPart = partIndex === 2;
  const isEmailPart = partIndex === 3;
  const friendEmail = emailAnswers.friend ?? '';
  const presidentEmail = emailAnswers.president ?? '';
  const friendWordCount = friendEmail.trim() ? friendEmail.trim().split(/\s+/).length : 0;
  const presidentWordCount = presidentEmail.trim() ? presidentEmail.trim().split(/\s+/).length : 0;

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 68px)',
        backgroundColor: '#f1f1f1',
        padding: '38px 24px 132px'
      }}
    >
      <section style={{ width: 'min(828px, 100%)', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: 56 }}>
          <div>
            <p style={{ color: '#020817', fontSize: 18, fontWeight: 900, margin: 0 }}>Writing - Part {partIndex + 1}</p>
            <h2 style={{ color: '#020817', fontSize: isShortAnswerPart || isThreeQuestionsPart || isEmailPart ? 17 : 28, fontWeight: 900, lineHeight: isShortAnswerPart || isThreeQuestionsPart || isEmailPart ? '23px' : '34px', margin: '4px 0 0', maxWidth: isEmailPart ? 620 : isThreeQuestionsPart ? 470 : 450 }}>{part.heading}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <BookmarkButton active={bookmarkActive} onToggle={onToggleBookmark} />
            <button type="button" style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: '50%', border: '1px solid #dce3ee', backgroundColor: '#ffffff', color: '#64748b' }}>
              <Pause size={18} />
            </button>
            <div style={{ minWidth: 170, textAlign: 'center' }}>
              <p style={{ color: '#000000', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: 1, margin: 0 }}>{timeRemaining}</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0 0' }}>Time remaining</p>
              <div style={{ height: 4, borderRadius: 999, backgroundColor: '#2b075c', margin: '8px auto 0', width: 164 }} />
            </div>
          </div>
        </div>

        {isEmailPart ? (
          <div style={{ display: 'grid', gap: 32, marginTop: 34 }}>
            <article style={{ borderRadius: 12, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '22px 24px' }}>
              {part.prompt.split('\n').map((line) => (
                <p key={line} style={{ color: '#020817', fontSize: 17, lineHeight: '27px', margin: line === 'Dear all members,' ? '0 0 4px' : 0 }}>{line}</p>
              ))}
            </article>

            <WritingEmailBox
              count={friendWordCount}
              limit={75}
              prompt={part.emailPrompts?.friend || 'Write an email to your friend. Write about your feelings and what you plan to do about the situation. Write about 50 words. Recommended time: 10 minutes.'}
              value={friendEmail}
              onChange={(value) => onEmailAnswer('friend', limitWords(value, 75))}
            />
            {showAnswer && (
              <InlineAnswer>
                <WritingAnswerContent part={part} partIndex={partIndex} />
              </InlineAnswer>
            )}
            <WritingEmailBox
              count={presidentWordCount}
              limit={225}
              prompt={part.emailPrompts?.president || 'Write an email to the president of the club. Write about your feelings and what you think the club should do about the situation. Write 120-150 words. Recommended time: 20 minutes.'}
              value={presidentEmail}
              onChange={(value) => onEmailAnswer('president', limitWords(value, 225))}
              tall
            />
            {showAnswer && (
              <InlineAnswer>
                <WritingAnswerContent part={part} partIndex={partIndex} />
              </InlineAnswer>
            )}
          </div>
        ) : isShortAnswerPart || isThreeQuestionsPart ? (
          <div style={{ display: 'grid', gap: 20, marginTop: 34 }}>
            {part.questions.map((question, index) => {
              const value = isThreeQuestionsPart ? threeAnswers[index] ?? '' : shortAnswers[index] ?? '';
              const questionWordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
              const limit = isThreeQuestionsPart ? 60 : 10;
              return (
                <article key={question} style={{ borderRadius: 12, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '22px 22px 20px' }}>
                  <p style={{ color: '#020817', fontSize: 17, lineHeight: '24px', fontWeight: 500, margin: 0 }}>{index + 1}. {question}</p>
                  <textarea
                    value={value}
                    onChange={(event) => {
                      const nextValue = limitWords(event.target.value, limit);
                      if (isThreeQuestionsPart) onThreeAnswer(index, nextValue);
                      else onShortAnswer(index, nextValue);
                    }}
                    placeholder={isThreeQuestionsPart ? 'Write your answer here (30-40 words)...' : 'Type your answer...'}
                    style={{
                      width: '100%',
                      minHeight: isThreeQuestionsPart ? 112 : 74,
                      resize: 'vertical',
                      border: '1px solid #dce3ee',
                      borderRadius: 12,
                      outline: 'none',
                      padding: '14px 14px',
                      color: '#020817',
                      fontSize: 16,
                      lineHeight: '24px',
                      backgroundColor: '#ffffff',
                      marginTop: 16
                    }}
                  />
                  <p style={{ color: '#64748b', fontSize: 15, textAlign: 'right', margin: '10px 0 0' }}>
                    Words <span style={{ color: '#020817', fontWeight: 900 }}>{questionWordCount}</span> / {limit}
                  </p>
                  {showAnswer && (
                    <InlineAnswer>
                      {(part as { sampleAnswers?: string[] }).sampleAnswers?.[index] ?? 'Chưa có đáp án mẫu'}
                    </InlineAnswer>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <article style={{ marginTop: 38, borderRadius: 16, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: 28, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
            <p style={{ color: '#020817', fontSize: 17, lineHeight: '28px', margin: 0 }}>{part.prompt}</p>

            {part.questions.length > 0 && (
              <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
                {part.questions.map((question, index) => (
                  <p key={question} style={{ color: '#020817', fontSize: 16, lineHeight: '24px', margin: 0 }}>
                    {index + 1}. {question}
                  </p>
                ))}
              </div>
            )}

            <div style={{ marginTop: 24, borderRadius: 14, border: '1px solid #dce3ee', overflow: 'hidden' }}>
            <textarea
              value={answer}
              onChange={(event) => onAnswer(partIndex === 1 ? limitWords(event.target.value, 45) : event.target.value)}
              placeholder="Type your answer here..."
              style={{
                width: '100%',
                minHeight: partIndex === 0 ? 190 : 260,
                resize: 'vertical',
                border: 0,
                outline: 'none',
                padding: 18,
                color: '#020817',
                fontSize: 17,
                lineHeight: '28px',
                backgroundColor: '#ffffff'
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', backgroundColor: '#f8fafc', padding: '12px 16px' }}>
              <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>{part.helper}</p>
              <p style={{ color: '#020817', fontSize: 14, fontWeight: 800, margin: 0 }}>{wordCount}{partIndex === 1 ? ' / 45' : ''} words</p>
            </div>
          </div>
          {showAnswer && (
            <InlineAnswer>
              <WritingAnswerContent part={part} partIndex={partIndex} />
            </InlineAnswer>
          )}
        </article>
        )}
      </section>
    </main>
  );
}

function WritingResult({ onExit, onRetry }: { onExit: () => void; onRetry: () => void }) {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f7f7fc', padding: '72px 24px' }}>
      <section style={{ width: 'min(760px, 100%)', margin: '0 auto', textAlign: 'center' }}>
        <article style={{ borderRadius: 18, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '44px 36px', boxShadow: '0 10px 28px rgba(15,23,42,0.06)' }}>
          <h1 style={{ color: '#111827', fontSize: 30, fontWeight: 900, margin: 0 }}>Đang chấm bài Writing</h1>
          <p style={{ color: '#64748b', fontSize: 17, lineHeight: '28px', margin: '14px auto 0', maxWidth: 520 }}>
            Bài viết của bạn đã được lưu. Hệ thống sẽ hiển thị kết quả Writing sau khi hoàn tất chấm bài.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32 }}>
            <button type="button" onClick={onExit} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 12, border: '1px solid #e12816', backgroundColor: '#ffffff', padding: '0 18px', color: '#e12816', fontSize: 16, fontWeight: 700 }}>
              <ArrowLeft size={18} />
              Thoát
            </button>
            <button type="button" onClick={onRetry} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, border: 0, borderRadius: 12, backgroundColor: '#d81e0c', padding: '0 18px', color: '#ffffff', fontSize: 16, fontWeight: 800 }}>
              <RotateCcw size={18} />
              Làm lại
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}

function WritingCheckingResult({ error, loading: _loading, onExit, onRetry, result }: { error: string; loading: boolean; onExit: () => void; onRetry: () => void; result: AiWritingScore | null }) {
  if (error) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#f7f7fc', padding: '72px 24px' }}>
        <section style={{ width: 'min(760px, 100%)', margin: '0 auto' }}>
          <article style={{ borderRadius: 18, border: '1px solid #fecaca', backgroundColor: '#ffffff', padding: '42px 36px', boxShadow: '0 10px 28px rgba(15,23,42,0.06)', textAlign: 'center' }}>
            <AlertCircle size={74} color="#dc2626" style={{ margin: '0 auto' }} />
            <h1 style={{ color: '#111827', fontSize: 30, fontWeight: 900, margin: '24px 0 0' }}>Chưa chấm được Writing</h1>
            <p style={{ color: '#64748b', fontSize: 17, lineHeight: '28px', margin: '12px auto 0', maxWidth: 600 }}>{error}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 34 }}>
              <button type="button" onClick={onExit} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 12, border: '1px solid #e12816', backgroundColor: '#ffffff', padding: '0 18px', color: '#e12816', fontSize: 16, fontWeight: 700 }}>
                <ArrowLeft size={18} />
                Thoát
              </button>
              <button type="button" onClick={onRetry} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, border: 0, borderRadius: 12, backgroundColor: '#d81e0c', padding: '0 18px', color: '#ffffff', fontSize: 16, fontWeight: 800 }}>
                <RotateCcw size={18} />
                Làm lại
              </button>
            </div>
          </article>
        </section>
      </main>
    );
  }

  if (result) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#f7f7fc', padding: '72px 24px' }}>
        <section style={{ width: 'min(920px, 100%)', margin: '0 auto' }}>
          <article style={{ borderRadius: 18, border: '1px solid #bbf7d0', backgroundColor: '#ffffff', padding: '42px 36px', boxShadow: '0 10px 28px rgba(15,23,42,0.06)' }}>
            <div style={{ textAlign: 'center' }}>
              <CheckCircle2 size={74} color="#16a34a" style={{ margin: '0 auto' }} />
              <h1 style={{ color: '#111827', fontSize: 30, fontWeight: 900, margin: '24px 0 0' }}>Ket qua Writing AI</h1>
              <p style={{ color: '#64748b', fontSize: 17, lineHeight: '28px', margin: '12px auto 0', maxWidth: 650 }}>{result.summary}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginTop: 28 }}>
              <div style={{ borderRadius: 14, border: '1px solid #dce3ee', backgroundColor: '#f8fafc', padding: 18 }}>
                <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Overall score</p>
                <p style={{ color: '#111827', fontSize: 28, fontWeight: 900, margin: '8px 0 0' }}>{result.overallScore}/50</p>
              </div>
              <div style={{ borderRadius: 14, border: '1px solid #dce3ee', backgroundColor: '#f8fafc', padding: 18 }}>
                <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>CEFR</p>
                <p style={{ color: '#111827', fontSize: 28, fontWeight: 900, margin: '8px 0 0' }}>{result.cefrLevel}</p>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
              {result.parts?.map((part) => (
                <div key={part.title} style={{ borderRadius: 14, border: '1px solid #e2e8f0', backgroundColor: '#ffffff', padding: 16 }}>
                  <p style={{ color: '#111827', fontSize: 15, fontWeight: 900, margin: 0 }}>{part.title} - {part.score}/50</p>
                  <p style={{ color: '#64748b', fontSize: 14, lineHeight: '22px', margin: '6px 0 0' }}>{part.feedback}</p>
                </div>
              ))}
            </div>
            {result.criteria?.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h2 style={{ color: '#111827', fontSize: 20, fontWeight: 900, margin: '0 0 12px' }}>Nhận xét theo tiêu chí</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  {result.criteria.map((item) => (
                    <div key={item.name} style={{ borderRadius: 14, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: 16 }}>
                      <p style={{ color: '#111827', fontSize: 15, fontWeight: 900, margin: 0 }}>{item.name} - {item.score}/10</p>
                      <p style={{ color: '#64748b', fontSize: 14, lineHeight: '22px', margin: '6px 0 0' }}>{item.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.corrections?.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h2 style={{ color: '#111827', fontSize: 20, fontWeight: 900, margin: '0 0 12px' }}>Lỗi cần sửa</h2>
                <div style={{ display: 'grid', gap: 10 }}>
                  {result.corrections.map((correction, index) => (
                    <div key={`${correction}-${index}`} style={{ borderRadius: 14, border: '1px solid #fed7aa', backgroundColor: '#fff7ed', padding: 16 }}>
                      <p style={{ color: '#9a3412', fontSize: 14, fontWeight: 900, margin: 0 }}>Lời {index + 1}</p>
                      <p style={{ color: '#7c2d12', fontSize: 14, lineHeight: '23px', margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{correction}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.suggestedAnswer?.trim() && (
              <div style={{ marginTop: 24, borderRadius: 14, border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', padding: 18 }}>
                <h2 style={{ color: '#111827', fontSize: 20, fontWeight: 900, margin: 0 }}>Bài gợi ý sau khi sửa</h2>
                <p style={{ color: '#1e3a8a', fontSize: 15, lineHeight: '25px', margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>{result.suggestedAnswer}</p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 34 }}>
              <button type="button" onClick={onExit} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 12, border: '1px solid #e12816', backgroundColor: '#ffffff', padding: '0 18px', color: '#e12816', fontSize: 16, fontWeight: 700 }}>
                <ArrowLeft size={18} />
                Thoát
              </button>
              <button type="button" onClick={onRetry} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, border: 0, borderRadius: 12, backgroundColor: '#d81e0c', padding: '0 18px', color: '#ffffff', fontSize: 16, fontWeight: 800 }}>
                <RotateCcw size={18} />
                Làm lại
              </button>
            </div>
          </article>
        </section>
      </main>
    );
  }

  const steps = [
    { title: 'Đã nộp bài', detail: '4 phần Writing' },
    { title: 'Đang xử lý', detail: 'Chấm tự động' },
    { title: 'Kết quả', detail: 'Sẽ hiển thị sau' }
  ];

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f7f7fc', padding: '72px 24px' }}>
      <section style={{ width: 'min(860px, 100%)', margin: '0 auto' }}>
        <article style={{ borderRadius: 18, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '42px 36px', boxShadow: '0 10px 28px rgba(15,23,42,0.06)', textAlign: 'center' }}>
          <div style={{ width: 82, height: 82, borderRadius: '50%', border: '7px solid #ede9fe', borderTopColor: '#2b075c', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
          <h1 style={{ color: '#111827', fontSize: 30, fontWeight: 900, margin: '24px 0 0' }}>Đang chấm bài Writing</h1>
          <p style={{ color: '#64748b', fontSize: 17, lineHeight: '28px', margin: '12px auto 0', maxWidth: 560 }}>
            Bài viết của bạn đã được lưu. Hệ thống đang phân tích nội dung, từ vựng, ngữ pháp và độ hoàn thành yêu cầu.
          </p>
          <p style={{ color: '#dc2626', fontSize: 15, fontWeight: 800, lineHeight: '24px', margin: '12px auto 0', maxWidth: 560 }}>
            Đang chấm bài, vui lòng không thao tác gì cho đến khi có kết quả.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 30 }}>
            {steps.map((item, index) => (
              <div key={item.title} style={{ borderRadius: 14, backgroundColor: index === 1 ? '#f3efff' : '#f8fafc', border: '1px solid #e2e8f0', padding: '18px 14px' }}>
                <p style={{ color: index === 1 ? '#2b075c' : '#111827', fontSize: 16, fontWeight: 900, margin: 0 }}>{item.title}</p>
                <p style={{ color: '#64748b', fontSize: 14, margin: '8px 0 0' }}>{item.detail}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 34 }}>
            <button type="button" onClick={onExit} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 12, border: '1px solid #e12816', backgroundColor: '#ffffff', padding: '0 18px', color: '#e12816', fontSize: 16, fontWeight: 700 }}>
              <ArrowLeft size={18} />
              Thoát
            </button>
            <button type="button" onClick={onRetry} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, border: 0, borderRadius: 12, backgroundColor: '#d81e0c', padding: '0 18px', color: '#ffffff', fontSize: 16, fontWeight: 800 }}>
              <RotateCcw size={18} />
              Làm lại
            </button>
          </div>
        </article>
        <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      </section>
    </main>
  );
}

function WritingEmailBox({
  count,
  limit,
  prompt,
  tall = false,
  value,
  onChange
}: {
  count: number;
  limit: number;
  prompt: string;
  tall?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <article>
      <p style={{ color: '#020817', fontSize: 17, lineHeight: '26px', fontWeight: 900, margin: '0 0 16px' }}>{prompt}</p>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type your answer here"
        style={{
          width: '100%',
          minHeight: tall ? 246 : 158,
          resize: 'vertical',
          border: '1px solid #dce3ee',
          borderRadius: 12,
          outline: 'none',
          padding: '14px 14px',
          color: '#020817',
          fontSize: 16,
          lineHeight: '26px',
          backgroundColor: '#ffffff'
        }}
      />
      <p style={{ color: '#64748b', fontSize: 15, textAlign: 'right', margin: '10px 0 0' }}>
        Words <span style={{ color: '#020817', fontWeight: 900 }}>{count}</span> / {limit}
      </p>
    </article>
  );
}

function ListeningStart({ onStart }: { onStart: () => void }) {
  async function checkSound() {
    try {
      await playSpeakingBeep();
    } catch {
      toast.error('Không phát được âm thanh kiểm tra. Hãy kiểm tra loa/trình duyệt.');
    }
  }

  return (
    <main className="min-h-[calc(100vh-66px)] bg-white px-6 py-12 sm:px-[90px]">
      <section className="max-w-[560px]">
        <p className="text-lg font-medium text-slate-600">Aptis General Practice Test</p>
        <h2 className="mt-3 text-[26px] font-extrabold leading-8 text-navy">Listening Practice Test</h2>
        <p className="mt-2 text-lg text-slate-600">Listening - Full Practice</p>

        <div className="mt-8 grid max-w-[360px] grid-cols-2 gap-20">
          <Meta label="Number of Questions" value="17" />
          <Meta label="Time Allowed" value="50 min" />
        </div>

        <h3 className="mt-8 text-xl font-extrabold text-navy">Assessment Description</h3>

        <div className="mt-7 rounded-2xl border border-brand-100 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <p className="text-xl font-extrabold text-navy">Kiểm tra âm thanh</p>
          <button type="button" onClick={checkSound} className="mt-5 inline-flex h-12 items-center gap-3 rounded-xl border border-[#f92918] bg-white px-5 text-lg font-medium text-[#e41d10] hover:bg-red-50">
            <Volume2 size={22} />
            Kiểm tra âm thanh
          </button>
        </div>

        <button type="button" onClick={onStart} className="mt-7 h-[50px] rounded-xl px-8 text-lg font-semibold text-white hover:opacity-95" style={{ backgroundColor: '#2b075c' }}>
          Start Assessment
        </button>
      </section>
    </main>
  );
}

function ListeningInstructions() {
  return (
    <main className="min-h-[calc(100vh-66px)] bg-white px-6 pb-28 pt-12 sm:px-[90px]">
      <section className="max-w-[760px]">
        <h2 className="text-[24px] font-extrabold leading-8 text-black">Aptis General Listening Instructions</h2>
        <h3 className="mt-7 text-xl font-extrabold text-black">Listening</h3>
        <div className="mt-4 space-y-2 text-[17px] leading-7 text-black">
          <p>You will listen to seventeen recordings.</p>
          <p>Click on the PLAY button to listen to each recording.</p>
          <p>You can listen to each recording TWO TIMES ONLY.</p>
          <p>You have 40 minutes to complete the test.</p>
          <p className="pt-7">When you click on the 'Next' button, the test will begin.</p>
        </div>
      </section>
    </main>
  );
}

function ListeningQuestion({
  answer,
  bookmarkActive,
  correctAnswer,
  index,
  question,
  showAnswer,
  timeRemaining,
  total,
  onAnswer,
  onToggleBookmark
}: {
  answer?: string;
  bookmarkActive: boolean;
  correctAnswer?: string;
  index: number;
  question: ListeningPart1Question;
  showAnswer?: boolean;
  timeRemaining: string;
  total: number;
  onAnswer: (answer: string) => void;
  onToggleBookmark: () => void;
}) {
  const labels = ['A', 'B', 'C'];
  const { playing, playsLeft, toggleAudio } = useAudioPlayer(question.audioUrl);

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 66px)',
        backgroundColor: '#f1f1f1',
        padding: '40px 24px 132px'
      }}
    >
      <section style={{ width: 'min(830px, 100%)', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: 56 }}>
          <div>
            <p style={{ color: '#020817', fontSize: 18, fontWeight: 900, margin: 0 }}>Listening - Part 1</p>
            <h2 style={{ color: '#020817', fontSize: 17, fontWeight: 500, lineHeight: 1.2, margin: '4px 0 0' }}>Question {index + 1} of {total}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <BookmarkButton active={bookmarkActive} onToggle={onToggleBookmark} />
            <button
              type="button"
              style={{
                width: 44,
                height: 44,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                border: '1px solid #dce3ee',
                backgroundColor: '#ffffff',
                color: '#64748b'
              }}
            >
              <Pause size={18} />
            </button>
            <div style={{ minWidth: 170, textAlign: 'center' }}>
              <p style={{ color: '#000000', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: 1, margin: 0 }}>{timeRemaining}</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0 0' }}>Time remaining</p>
              <div style={{ height: 4, borderRadius: 999, backgroundColor: '#2b075c', margin: '8px auto 0', width: 164 }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 58 }}>
          <p style={{ color: '#020817', fontSize: 17, lineHeight: '26px', margin: 0 }}>{question.prompt}</p>
          <button
            type="button"
            onClick={toggleAudio}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: 0,
              backgroundColor: 'transparent',
              color: '#020817',
              fontSize: 17,
              fontWeight: 500,
              marginTop: 16,
              padding: 0,
              textDecoration: 'underline'
            }}
          >
            <PlayCircle size={18} />
            {playing ? 'Stop' : 'Play'}
            {!playing && <span style={{ color: '#64748b', fontSize: 14 }}>({playsLeft} lượt)</span>}
          </button>

          <div
            style={{
              marginTop: 28,
              border: '1px solid #dce3ee',
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)'
            }}
          >
            {question.options.map((option, optionIndex) => {
              const selected = answer === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onAnswer(option)}
                  style={{
                    width: '100%',
                    minHeight: 60,
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr',
                    alignItems: 'stretch',
                    border: 0,
                    borderTop: optionIndex === 0 ? 0 : '1px solid #e2e8f0',
                    backgroundColor: selected ? '#f2ecff' : '#ffffff',
                    color: '#020817',
                    padding: 0,
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      borderRight: '1px solid #e2e8f0',
                      color: selected ? '#2b075c' : '#020817',
                      fontSize: 22,
                      fontWeight: 800
                    }}
                  >
                    {labels[optionIndex]}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 16, fontWeight: selected ? 800 : 400 }}>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
          {showAnswer && (
            <InlineAnswer>
              {correctAnswer ?? (question as { answer?: string; correctAnswer?: string }).answer ?? (question as { answer?: string; correctAnswer?: string }).correctAnswer ?? 'Chưa có đáp án mẫu'}
            </InlineAnswer>
          )}
        </div>
      </section>
    </main>
  );
}

function ListeningMatching({
  audioUrl,
  answers,
  bookmarkActive,
  data,
  showAnswer,
  timeRemaining,
  onAnswer,
  onToggleBookmark
}: {
  audioUrl?: string;
  answers: Record<string, string>;
  bookmarkActive: boolean;
  data: ListeningMatchingData;
  showAnswer?: boolean;
  timeRemaining: string;
  onAnswer: (speaker: string, answer: string) => void;
  onToggleBookmark: () => void;
}) {
  const speakers = data.speakers.length > 0 ? data.speakers : ['Speaker A ...', 'Speaker B ...', 'Speaker C ...', 'Speaker D ...'];
  const options = data.options.length > 0 ? data.options : listeningMatchingOptions;
  const { playing, playsLeft, toggleAudio } = useAudioPlayer(audioUrl || data.audioUrl);

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 66px)',
        backgroundColor: '#f1f1f1',
        padding: '38px 24px 132px'
      }}
    >
      <section style={{ width: 'min(820px, 100%)', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: 56 }}>
          <div>
            <p style={{ color: '#020817', fontSize: 18, fontWeight: 900, margin: 0 }}>Listening - Part 2</p>
            <h2 style={{ color: '#020817', fontSize: 17, fontWeight: 500, lineHeight: 1.2, margin: '4px 0 0' }}>Question 1 of 1</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <BookmarkButton active={bookmarkActive} onToggle={onToggleBookmark} />
            <button
              type="button"
              style={{
                width: 44,
                height: 44,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                border: '1px solid #dce3ee',
                backgroundColor: '#ffffff',
                color: '#64748b'
              }}
            >
              <Pause size={18} />
            </button>
            <div style={{ minWidth: 170, textAlign: 'center' }}>
              <p style={{ color: '#000000', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: 1, margin: 0 }}>{timeRemaining}</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0 0' }}>Time remaining</p>
              <div style={{ height: 4, borderRadius: 999, backgroundColor: '#2b075c', margin: '8px auto 0', width: 124 }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 58 }}>
          <p style={{ color: '#020817', fontSize: 17, lineHeight: '26px', margin: 0 }}>
            {data.prompt}
          </p>
          <button
            type="button"
            onClick={toggleAudio}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: 0,
              backgroundColor: 'transparent',
              color: '#020817',
              fontSize: 17,
              fontWeight: 500,
              marginTop: 16,
              padding: 0,
              textDecoration: 'underline'
            }}
          >
            <PlayCircle size={18} />
            {playing ? 'Stop' : 'Play'}
            {!playing && <span style={{ color: '#64748b', fontSize: 14 }}>({playsLeft} lượt)</span>}
          </button>

          <div style={{ display: 'grid', gap: 14, marginTop: 26, width: 'min(695px, 100%)' }}>
            {speakers.map((speaker) => (
              <label
                key={speaker}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '116px 1fr',
                  alignItems: 'center',
                  gap: 18,
                  color: '#020817',
                  fontSize: 17,
                  fontWeight: 400
                }}
              >
                <span>{speaker}</span>
                <select
                  value={answers[speaker] ?? ''}
                  onChange={(event) => onAnswer(speaker, event.target.value)}
                  style={{
                    height: 40,
                    width: '100%',
                    borderRadius: 5,
                    border: '1px solid #dce3ee',
                    backgroundColor: '#ffffff',
                    padding: '0 12px',
                    color: '#020817',
                    fontSize: 16,
                    outline: 'none'
                  }}
                >
                  <option value=""></option>
                  {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {showAnswer && (
                  <span style={{ gridColumn: '2', color: '#1e3a8a', fontSize: 14, lineHeight: '20px' }}>
                    <b>Đáp án:</b> {data.answerKey[speaker] ?? 'Chưa có đáp án mẫu'}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function ListeningShortConversations({
  audioUrl,
  answers,
  bookmarkActive,
  data,
  showAnswer,
  timeRemaining,
  onAnswer,
  onToggleBookmark
}: {
  audioUrl?: string;
  answers: Record<number, string>;
  bookmarkActive: boolean;
  data: ListeningShortData;
  showAnswer?: boolean;
  timeRemaining: string;
  onAnswer: (index: number, answer: string) => void;
  onToggleBookmark: () => void;
}) {
  const statements = data.statements.length > 0 ? data.statements : listeningShortStatements;
  const options = data.options.length > 0 ? data.options : listeningSpeakerOptions;
  const { playing, playsLeft, toggleAudio } = useAudioPlayer(audioUrl || data.audioUrl);

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 66px)',
        backgroundColor: '#f1f1f1',
        padding: '38px 24px 132px'
      }}
    >
      <section style={{ width: 'min(820px, 100%)', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: 56 }}>
          <div>
            <p style={{ color: '#020817', fontSize: 18, fontWeight: 900, margin: 0 }}>Listening - Part 3</p>
            <h2 style={{ color: '#020817', fontSize: 17, fontWeight: 500, lineHeight: 1.2, margin: '4px 0 0' }}>Question 1 of 1</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <BookmarkButton active={bookmarkActive} onToggle={onToggleBookmark} />
            <button
              type="button"
              style={{
                width: 44,
                height: 44,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                border: '1px solid #dce3ee',
                backgroundColor: '#ffffff',
                color: '#64748b'
              }}
            >
              <Pause size={18} />
            </button>
            <div style={{ minWidth: 170, textAlign: 'center' }}>
              <p style={{ color: '#000000', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: 1, margin: 0 }}>{timeRemaining}</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0 0' }}>Time remaining</p>
              <div style={{ height: 4, borderRadius: 999, backgroundColor: '#2b075c', margin: '8px auto 0', width: 108 }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 52 }}>
          {data.topic && <p style={{ color: '#020817', fontSize: 19, lineHeight: '28px', margin: 0 }}>{data.topic}</p>}
          <button
            type="button"
            onClick={toggleAudio}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: 0,
              backgroundColor: 'transparent',
              color: '#020817',
              fontSize: 17,
              fontWeight: 500,
              marginTop: 20,
              padding: 0,
              textDecoration: 'underline'
            }}
          >
            <PlayCircle size={18} />
            {playing ? 'Stop' : 'Play'}
            {!playing && <span style={{ color: '#64748b', fontSize: 14 }}>({playsLeft} lượt)</span>}
          </button>

          {data.prompt && <p style={{ color: '#020817', fontSize: 17, lineHeight: '26px', margin: '44px 0 30px' }}>{data.prompt}</p>}

          <div style={{ display: 'grid', gap: 28, width: 'min(650px, 100%)' }}>
            {statements.map((statement, statementIndex) => (
              <label
                key={statement}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 128px',
                  alignItems: 'center',
                  gap: 16,
                  color: '#020817',
                  fontSize: 19,
                  lineHeight: '28px',
                  fontWeight: 400
                }}
              >
                <span>{statementIndex + 1}. {statement}</span>
                <select
                  value={answers[statementIndex] ?? ''}
                  onChange={(event) => onAnswer(statementIndex, event.target.value)}
                  style={{
                    height: 40,
                    width: 128,
                    borderRadius: 12,
                    border: '1px solid #dce3ee',
                    backgroundColor: '#ffffff',
                    padding: '0 12px',
                    color: '#020817',
                    fontSize: 15,
                    outline: 'none'
                  }}
                >
                  <option value=""></option>
                  {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {showAnswer && (
                  <span style={{ gridColumn: '1 / -1', color: '#1e3a8a', fontSize: 14, lineHeight: '20px' }}>
                    <b>Đáp án:</b> {data.answerKey[statementIndex] ?? 'Chưa có đáp án mẫu'}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function ListeningMonologues({
  audioUrl,
  answers,
  bookmarkActive,
  index,
  recording,
  showAnswer,
  timeRemaining,
  onAnswer,
  onToggleBookmark
}: {
  audioUrl?: string;
  answers: Record<string, string>;
  bookmarkActive: boolean;
  index: number;
  recording: ListeningMonologueData;
  showAnswer?: boolean;
  timeRemaining: string;
  onAnswer: (questionIndex: number, answer: string) => void;
  onToggleBookmark: () => void;
}) {
  const labels = ['A', 'B', 'C'];
  const currentRecording = recording ?? listeningMonologues[index] ?? listeningMonologues[0];
  const { playing, playsLeft, toggleAudio } = useAudioPlayer(audioUrl || currentRecording.audioUrl);

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 66px)',
        backgroundColor: '#f1f1f1',
        padding: '38px 24px 132px'
      }}
    >
      <section style={{ width: 'min(828px, 100%)', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: 56 }}>
          <div>
            <p style={{ color: '#020817', fontSize: 18, fontWeight: 900, margin: 0 }}>Listening - Part 4</p>
            <h2 style={{ color: '#020817', fontSize: 17, fontWeight: 500, lineHeight: 1.2, margin: '4px 0 0' }}>Recording {index + 1}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <BookmarkButton active={bookmarkActive} onToggle={onToggleBookmark} />
            <button
              type="button"
              style={{
                width: 44,
                height: 44,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                border: '1px solid #dce3ee',
                backgroundColor: '#ffffff',
                color: '#64748b'
              }}
            >
              <Pause size={18} />
            </button>
            <div style={{ minWidth: 170, textAlign: 'center' }}>
              <p style={{ color: '#000000', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: 1, margin: 0 }}>{timeRemaining}</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0 0' }}>Time remaining</p>
              <div style={{ height: 4, borderRadius: 999, backgroundColor: '#2b075c', margin: '8px auto 0', width: 96 }} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleAudio}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: 0,
            backgroundColor: 'transparent',
            color: '#020817',
            fontSize: 17,
            fontWeight: 500,
            marginTop: 70,
            padding: 0,
            textDecoration: 'underline'
          }}
        >
          <PlayCircle size={18} />
          {playing ? 'Stop' : 'Play'}
          {!playing && <span style={{ color: '#64748b', fontSize: 14 }}>({playsLeft} lượt)</span>}
        </button>

        <div style={{ display: 'grid', gap: 36, marginTop: 26 }}>
          {currentRecording.questions.map((question, questionIndex) => (
            <div key={question.prompt}>
              <p style={{ color: '#020817', fontSize: 17, lineHeight: '26px', fontWeight: 900, margin: '0 0 14px' }}>
                {questionIndex + 1}. {question.prompt}
              </p>
              <div
                style={{
                  border: '1px solid #dce3ee',
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 2px rgba(15,23,42,0.04)'
                }}
              >
                {question.options.map((option, optionIndex) => {
                  const answerKey = `${index}-${questionIndex}`;
                  const selected = answers[answerKey] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onAnswer(questionIndex, option)}
                      style={{
                        width: '100%',
                        minHeight: 60,
                        display: 'grid',
                        gridTemplateColumns: '64px 1fr',
                        alignItems: 'stretch',
                        border: 0,
                        borderTop: optionIndex === 0 ? 0 : '1px solid #e2e8f0',
                        backgroundColor: selected ? '#f2ecff' : '#ffffff',
                        color: '#020817',
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <span
                        style={{
                          display: 'grid',
                          placeItems: 'center',
                          borderRight: '1px solid #e2e8f0',
                          color: selected ? '#2b075c' : '#020817',
                          fontSize: 22,
                          fontWeight: 800
                        }}
                      >
                        {labels[optionIndex]}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 16, fontWeight: selected ? 800 : 400 }}>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
              {showAnswer && (
                <InlineAnswer>
                  {(question as { answer?: string; correctAnswer?: string }).correctAnswer ?? (question as { answer?: string; correctAnswer?: string }).answer ?? listeningMonologueAnswerKey[`${index}-${questionIndex}`] ?? 'Chưa có đáp án mẫu'}
                </InlineAnswer>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function ReadingStart({ data, mockCard, loading, onStart }: { data: ReadingTestData; mockCard: MockCard | null; loading?: boolean; onStart: () => void }) {
  const hasGaps = data.gaps.length > 0;
  const hasOpinion = data.opinion.people.length > 0 && data.opinion.questions.length > 0;
  const hasLong = data.long.headings.length > 0 && data.long.paragraphs.length > 0;
  const questionCount = Number(hasGaps) + data.cohesion.length + Number(hasOpinion) + Number(hasLong);
  const canStart = !loading && questionCount > 0;
  return (
    <main className="min-h-[calc(100vh-74px)] bg-white px-6 py-14 sm:px-[74px]">
      <section className="max-w-[620px]">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#f0eef7] px-4 py-2 text-sm font-extrabold text-[#2b075c]">
          <BookOpen size={18} />
          Reading - Gap Fill
        </div>

        <p className="mt-8 text-lg font-medium text-slate-600">Aptis General Practice Test</p>
        <h2 className="mt-3 text-[32px] font-extrabold leading-10 text-navy">{mockCard?.title ?? 'Reading Practice Test'}</h2>
        <p className="mt-3 text-xl font-medium text-slate-600">{mockCard?.description ?? 'Đề Reading'}</p>

        <div className="mt-8 grid max-w-[460px] grid-cols-2 gap-4">
          <div className="rounded-2xl border border-brand-100 bg-sky-50 p-5">
            <p className="text-sm font-semibold text-slate-600">Number of Questions</p>
            <p className="mt-3 text-2xl font-extrabold text-navy">{loading ? '...' : questionCount}</p>
          </div>
          <div className="rounded-2xl border border-brand-100 bg-sky-50 p-5">
            <p className="text-sm font-semibold text-slate-600">Time Allowed</p>
            <p className="mt-3 text-2xl font-extrabold text-navy">{mockCard?.minutes || '35 min'}</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-brand-100 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.06)]">
          <p className="text-base font-extrabold text-navy">Part 1 - Gap Fill</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Read the short texts and choose the correct words to complete each gap.
          </p>
        </div>

        {!loading && questionCount === 0 && (
          <p className="mt-4 text-sm font-semibold text-red-700">Đề này chưa có dữ liệu câu hỏi Reading để làm bài.</p>
        )}

        <button type="button" disabled={!canStart} onClick={onStart} className="mt-8 inline-flex h-[52px] items-center justify-center gap-3 rounded-xl px-8 text-lg font-semibold text-white shadow-lift shadow-[#2b075c]/20 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60" style={{ backgroundColor: '#2b075c' }}>
          {loading ? 'Đang tải đề...' : 'Start Assessment'}
          <ArrowRight size={20} />
        </button>
      </section>
    </main>
  );
}

function ReadingInstructions() {
  return (
    <main className="min-h-[calc(100vh-74px)] bg-white px-6 pb-28 pt-14 sm:px-[100px]">
      <section className="max-w-[760px]">
        <h2 className="text-[26px] font-extrabold leading-8 text-black">Aptis General Reading Instructions</h2>
        <h3 className="mt-10 text-[22px] font-extrabold text-black">Reading</h3>
        <div className="mt-5 space-y-5 text-[21px] leading-8 text-[#020817]">
          <p>The test has five parts.</p>
          <p>You have 35 minutes to complete the test.</p>
          <p className="pt-5">When you click on the 'Next' button, the test will begin.</p>
        </div>
      </section>
    </main>
  );
}

function ReadingQuestion({ data, answers, bookmarkActive, showAnswer, timeRemaining, onAnswer, onToggleBookmark }: { data: ReadingGapQuestion[]; answers: Record<number, string>; bookmarkActive: boolean; showAnswer?: boolean; timeRemaining: string; onAnswer: (index: number, answer: string) => void; onToggleBookmark: () => void }) {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 74px)',
        backgroundColor: '#f1f1f1',
        padding: '40px 24px 132px'
      }}
    >
      <section style={{ width: 'min(920px, 100%)', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: 56 }}>
          <div>
            <p style={{ color: '#020817', fontSize: 20, fontWeight: 500, margin: 0 }}>Reading</p>
            <h2 style={{ color: '#020817', fontSize: 38, fontWeight: 900, lineHeight: 1.1, margin: '8px 0 0' }}>Question 1 of 5</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            <BookmarkButton active={bookmarkActive} height={52} iconSize={22} fontSize={20} padding="0 20px" onToggle={onToggleBookmark} />
            <button
              style={{
                width: 52,
                height: 52,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                border: '1px solid #dce3ee',
                backgroundColor: '#ffffff',
                color: '#64748b'
              }}
            >
              <Pause size={20} />
            </button>
            <div style={{ minWidth: 184, textAlign: 'center' }}>
              <p style={{ color: '#000000', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 34, fontWeight: 900, lineHeight: 1, letterSpacing: 1, margin: 0 }}>{timeRemaining}</p>
              <p style={{ color: '#64748b', fontSize: 14, margin: '8px 0 0' }}>Time remaining</p>
              <div style={{ height: 4, borderRadius: 999, backgroundColor: '#2b075c', marginTop: 8 }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 56 }}>
          <p style={{ color: '#000000', fontSize: 22, lineHeight: '32px', fontWeight: 900, margin: 0 }}>
            Choose the word that fits in each gap.
          </p>

          <div style={{ color: '#000000', fontSize: 22, lineHeight: '44px', marginTop: 42 }}>
            {data.length === 0 ? (
              <EmptyImportedPart />
            ) : data.map((question, index) => {
              const promptParts = question.prompt?.split('___') ?? [];
              const before = question.questionStart ?? promptParts[0] ?? '';
              const after = question.questionEnd ?? promptParts.slice(1).join('___') ?? '';
              return (
                <div key={`${index}-${question.answer}`}>
                  <p>
                    {index + 1}. {before}
                    <ReadingGapSelect value={answers[index] ?? ''} options={question.options} onChange={(answer) => onAnswer(index, answer)} />
                    {after}
                  </p>
                  {showAnswer && <InlineAnswer>{question.answer}</InlineAnswer>}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function EmptyReadingScreen({ title, timeRemaining, bookmarkActive, onToggleBookmark }: { title: string; timeRemaining: string; bookmarkActive: boolean; onToggleBookmark: () => void }) {
  return (
    <main style={{ minHeight: 'calc(100vh - 74px)', backgroundColor: '#f1f1f1', padding: '36px 24px 132px' }}>
      <section style={{ width: 'min(830px, 100%)', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: 56 }}>
          <div>
            <p style={{ color: '#020817', fontSize: 18, fontWeight: 800, margin: 0 }}>Reading</p>
            <h2 style={{ color: '#020817', fontSize: 36, fontWeight: 900, lineHeight: 1.1, margin: '8px 0 0' }}>{title}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <BookmarkButton active={bookmarkActive} onToggle={onToggleBookmark} />
            <div style={{ minWidth: 170, textAlign: 'center' }}>
              <p style={{ color: '#000000', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: 1, margin: 0 }}>{timeRemaining}</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0 0' }}>Time remaining</p>
              <div style={{ height: 4, borderRadius: 999, backgroundColor: '#2b075c', marginTop: 8 }} />
            </div>
          </div>
        </div>
        <EmptyImportedPart />
      </section>
    </main>
  );
}

function EmptyImportedPart() {
  return (
    <div style={{ marginTop: 28, borderRadius: 14, border: '1px dashed #cbd5e1', backgroundColor: '#ffffff', padding: '22px 24px', color: '#475569', fontSize: 16, fontWeight: 700, lineHeight: '26px' }}>
      Phần này chưa có dữ liệu trong đề import.
    </div>
  );
}

function ReadingCohesion({ data, answers, bookmarkActive, questionIndex, total, showAnswer, timeRemaining, onAnswer, onToggleBookmark }: { data?: ReadingCohesionQuestion; answers: string[]; bookmarkActive: boolean; questionIndex: number; total: number; showAnswer?: boolean; timeRemaining: string; onAnswer: (answers: string[]) => void; onToggleBookmark: () => void }) {
  if (!data) return <EmptyReadingScreen title="Part 2 + 3 - Text Cohesion" timeRemaining={timeRemaining} bookmarkActive={bookmarkActive} onToggleBookmark={onToggleBookmark} />;
  const choices = data.choices;
  const correctAnswers = data.correctOrder;
  const slots = Array.from({ length: correctAnswers.length }, (_, index) => answers[index] || null);

  function dropChoice(slotIndex: number, choice: string) {
    const nextSlots = slots.map((slot) => (slot === choice ? null : slot));
    nextSlots[slotIndex] = choice;
    onAnswer(nextSlots.map((slot) => slot ?? ''));
  }

  function returnChoice(choice: string) {
    onAnswer(slots.map((slot) => (slot === choice ? '' : slot ?? '')));
  }

  const availableChoices = choices.filter((choice) => !slots.includes(choice));

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 74px)',
        backgroundColor: '#f1f1f1',
        padding: '36px 24px 132px'
      }}
    >
      <section style={{ width: 'min(830px, 100%)', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: 56 }}>
          <div>
            <p style={{ color: '#020817', fontSize: 18, fontWeight: 800, margin: 0 }}>Reading</p>
            <h2 style={{ color: '#020817', fontSize: 36, fontWeight: 900, lineHeight: 1.1, margin: '8px 0 0' }}>Question {questionIndex + 1} of {total}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <BookmarkButton active={bookmarkActive} onToggle={onToggleBookmark} />
            <button
              style={{
                width: 44,
                height: 44,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                border: '1px solid #dce3ee',
                backgroundColor: '#ffffff',
                color: '#64748b'
              }}
            >
              <Pause size={18} />
            </button>
            <div style={{ minWidth: 170, textAlign: 'center' }}>
              <p style={{ color: '#000000', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: 1, margin: 0 }}>{timeRemaining}</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0 0' }}>Time remaining</p>
              <div style={{ height: 4, borderRadius: 999, backgroundColor: '#2b075c', marginTop: 8 }} />
            </div>
          </div>
        </div>

        <p style={{ color: '#000000', fontSize: 17, lineHeight: '26px', fontWeight: 900, margin: '34px 0 8px' }}>
          The sentences below make a complete text. Put them in the correct order.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1px 0.9fr',
            gap: 32,
            border: '1px solid #dce3ee',
            backgroundColor: '#ffffff',
            borderRadius: 14,
            padding: '18px',
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)'
          }}
        >
          <div>
            <h3 style={{ color: '#020817', fontSize: 21, fontWeight: 900, margin: '4px 0 16px' }}>{data.title}</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {correctAnswers.map((_, index) => {
                const number = index + 1;
                return (
                <div key={number}>
                  <CohesionSlot
                    number={number}
                    filled={slots[number - 1] ?? undefined}
                    onDropChoice={(choice) => dropChoice(number - 1, choice)}
                  />
                  {showAnswer && <InlineAnswer>{correctAnswers[number - 1] ?? 'Chưa có đáp án mẫu'}</InlineAnswer>}
                </div>
              );})}
            </div>
          </div>

          <div style={{ width: 1, backgroundColor: '#e5e7eb' }} />

          <div
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              event.preventDefault();
              const choice = event.dataTransfer.getData('text/plain');
              if (choice) returnChoice(choice);
            }}
            style={{
              display: 'grid',
              alignContent: 'start',
              gap: 14,
              minHeight: 430,
              paddingTop: 14,
              borderRadius: 12
            }}
          >
            {availableChoices.map((choice) => (
              <div
                key={choice}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', choice);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '18px 1fr',
                  gap: 10,
                  alignItems: 'start',
                  minHeight: 74,
                  borderRadius: 12,
                  border: '1px solid #dce3ee',
                  backgroundColor: '#ffffff',
                  padding: '14px 16px',
                  color: '#020817',
                  fontSize: 16,
                  lineHeight: '22px',
                  cursor: 'grab'
                }}
              >
                <span style={{ color: '#64748b', fontSize: 20, lineHeight: '20px' }}>-</span>
                <span>{choice}</span>
              </div>
            ))}
            {availableChoices.length === 0 && (
              <div
                style={{
                  minHeight: 74,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 12,
                  border: '2px dashed #dce3ee',
                  color: '#94a3b8',
                  fontSize: 15,
                  fontWeight: 700,
                  textAlign: 'center',
                  padding: 16
                }}
              >
                Kéo câu từ ô bên trái về đây
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function CohesionSlot({ number, filled, onDropChoice }: { number: number; filled?: string; onDropChoice: (choice: string) => void }) {
  return (
    <div
      draggable={Boolean(filled)}
      onDragStart={(event) => {
        if (!filled) return;
        event.dataTransfer.setData('text/plain', filled);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        const choice = event.dataTransfer.getData('text/plain');
        if (choice) onDropChoice(choice);
      }}
      style={{
        minHeight: 64,
        display: 'grid',
        gridTemplateColumns: '28px 1fr',
        alignItems: 'center',
        gap: 16,
        borderRadius: 12,
        border: filled ? '1px solid #dce3ee' : '2px dashed #e5e7eb',
        backgroundColor: '#ffffff',
        padding: '12px 10px',
        cursor: filled ? 'grab' : 'copy'
      }}
    >
      <span style={{ color: '#334155', fontSize: 14, fontWeight: 700 }}>{number}</span>
      <span style={{ color: filled ? '#020817' : '#94a3b8', fontSize: 16, lineHeight: '22px' }}>
        {filled ?? 'Kéo câu vào dây'}
      </span>
    </div>
  );
}

function ReadingOpinion({ data, answers, bookmarkActive, showAnswer, timeRemaining, onAnswer, onToggleBookmark }: { data: ReadingOpinionQuestion; answers: Record<number, string>; bookmarkActive: boolean; showAnswer?: boolean; timeRemaining: string; onAnswer: (index: number, answer: string) => void; onToggleBookmark: () => void }) {
  const people = data.people;
  const questions = data.questions;
  const correctAnswers = data.correctAnswers;
  return (
    <main style={{ minHeight: 'calc(100vh - 74px)', backgroundColor: '#f1f1f1', padding: '36px 24px 132px' }}>
      <section style={{ width: 'min(920px, 100%)', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: 56 }}>
          <div>
            <p style={{ color: '#020817', fontSize: 20, fontWeight: 800, margin: 0 }}>Reading</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <BookmarkButton active={bookmarkActive} height={46} onToggle={onToggleBookmark} />
            <button style={{ width: 46, height: 46, display: 'grid', placeItems: 'center', borderRadius: '50%', border: '1px solid #dce3ee', backgroundColor: '#ffffff', color: '#64748b' }}>
              <Pause size={18} />
            </button>
            <div style={{ minWidth: 180, textAlign: 'center' }}>
              <p style={{ color: '#000000', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 32, fontWeight: 900, lineHeight: 1, letterSpacing: 1, margin: 0 }}>{timeRemaining}</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0 0' }}>Time remaining</p>
              <div style={{ height: 4, width: 86, borderRadius: 999, backgroundColor: '#2b075c', margin: '8px auto 0' }} />
            </div>
          </div>
        </div>

        <p style={{ color: '#000000', fontSize: 22, lineHeight: '30px', fontWeight: 900, margin: '34px 0 30px' }}>
          {data.intro ? stripHtml(data.intro) : `Four people respond to the topic${data.topic ? `: ${data.topic}` : ''}. Read the texts and then answer the questions below.`}
        </p>

        {people.length === 0 || questions.length === 0 ? <EmptyImportedPart /> : <article style={{ borderRadius: 14, backgroundColor: '#ffffff', padding: '28px 30px', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
          {people.map((person) => (
            <section key={person.label} style={{ marginBottom: person.label === 'D' ? 0 : 26 }}>
              <h3 style={{ color: '#020817', fontSize: 19, fontWeight: 900, margin: '0 0 8px' }}>{person.label}</h3>
              <p style={{ color: '#020817', fontSize: 18, lineHeight: '29px', margin: 0 }}>{person.text}</p>
            </section>
          ))}
        </article>}

        {people.length > 0 && questions.length > 0 && <article style={{ marginTop: 26, borderRadius: 14, backgroundColor: '#ffffff', padding: '28px 30px', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'grid', gap: 18 }}>
            {questions.map((question, index) => (
              <div key={question} style={{ display: 'grid', gridTemplateColumns: '1fr 156px', alignItems: 'center', gap: 24 }}>
                <p style={{ color: '#020817', fontSize: 17, lineHeight: '24px', fontWeight: 700, margin: 0 }}>
                  {index + 1}. {question}
                </p>
                <select value={answers[index] ?? ''} onChange={(event) => onAnswer(index, event.target.value)} style={{ height: 52, borderRadius: 14, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '0 16px', color: '#475569', fontSize: 18, outline: 'none' }}>
                  <option value=""></option>
                  {people.map((person) => person.label).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {showAnswer && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <InlineAnswer>{correctAnswers[index]}</InlineAnswer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </article>}
      </section>
    </main>
  );
}

function ReadingLong({ data, answers, bookmarkActive, showAnswer, timeRemaining, onAnswer, onToggleBookmark }: { data: ReadingLongQuestion; answers: Record<number, string>; bookmarkActive: boolean; showAnswer?: boolean; timeRemaining: string; onAnswer: (index: number, answer: string) => void; onToggleBookmark: () => void }) {
  const headings = data.headings;
  const paragraphs = data.paragraphs;
  const correctAnswers = data.correctAnswers;
  return (
    <main style={{ minHeight: 'calc(100vh - 74px)', backgroundColor: '#f1f1f1', padding: '36px 24px 132px' }}>
      <section style={{ width: 'min(830px, 100%)', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: 56 }}>
          <div>
            <p style={{ color: '#020817', fontSize: 17, fontWeight: 800, margin: 0 }}>Reading</p>
            <p style={{ color: '#64748b', fontSize: 16, margin: '4px 0 0' }}>7 paragraphs · 7 headings</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <BookmarkButton active={bookmarkActive} height={46} onToggle={onToggleBookmark} />
            <button style={{ width: 46, height: 46, display: 'grid', placeItems: 'center', borderRadius: '50%', border: '1px solid #dce3ee', backgroundColor: '#ffffff', color: '#64748b' }}>
              <Pause size={18} />
            </button>
            <div style={{ minWidth: 180, textAlign: 'center' }}>
              <p style={{ color: '#000000', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 32, fontWeight: 900, lineHeight: 1, letterSpacing: 1, margin: 0 }}>{timeRemaining}</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0 0' }}>Time remaining</p>
              <div style={{ height: 4, width: 58, borderRadius: 999, backgroundColor: '#2b075c', marginTop: 8 }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 40, borderRadius: 14, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '18px 20px' }}>
          <p style={{ color: '#020817', fontSize: 17, lineHeight: '26px', fontWeight: 900, margin: 0 }}>
            Read the passage quickly. Choose a heading for each numbered paragraph from the drop-down box.
          </p>
        </div>

        <h2 style={{ color: '#020817', fontSize: 30, fontWeight: 900, margin: '20px 0 28px' }}>{data.title}</h2>

        <div style={{ display: 'grid', gap: 28 }}>
          {paragraphs.length === 0 ? <EmptyImportedPart /> : paragraphs.map((paragraph, index) => (
            <article key={index} style={{ borderRadius: 14, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '24px 22px 24px 62px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 22, top: 38, color: '#020817', fontSize: 16, fontWeight: 900 }}>{index + 1}.</span>
              <select value={answers[index] ?? ''} onChange={(event) => onAnswer(index, event.target.value)} style={{ width: 'min(432px, 100%)', height: 48, borderRadius: 14, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '0 20px', color: '#64748b', fontSize: 16, fontStyle: 'italic', outline: 'none' }}>
                <option value="">Choose a heading...</option>
                {headings.map((heading) => (
                  <option key={heading} value={heading}>{heading}</option>
                ))}
              </select>
              <p style={{ color: '#020817', fontSize: 17, lineHeight: '28px', margin: '16px 0 0' }}>{paragraph}</p>
              {showAnswer && <InlineAnswer>{correctAnswers[index]}</InlineAnswer>}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function ReadingResult({ summary, onExit, onReview, onRetry }: { summary: SkillScoreSummary; onExit: () => void; onReview: () => void; onRetry: () => void }) {
  const aptisCorrect = correctToAptis25(summary.correct, summary.total);

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f7f7fc', padding: '32px 24px 72px' }}>
      <section style={{ width: 'min(864px, 100%)', margin: '0 auto' }}>
        <article style={{ borderRadius: 18, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '42px 36px 36px', textAlign: 'center', boxShadow: '0 10px 28px rgba(15,23,42,0.06)' }}>
          <h1 style={{ color: '#111827', fontSize: 30, fontWeight: 900, margin: 0 }}>Kết quả Reading</h1>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 26, maxWidth: 430, margin: '34px auto 0' }}>
            <ResultStat value={`${summary.score}/50`} label="Điểm" tone="red" />
            <ResultStat value={summary.cefr} label="Trình độ" tone="red" />
            <ResultStat value={`${summary.correct}/${summary.total}`} label="Số câu đúng" tone="black" />
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: '16px 0 0' }}>
            CEFR Reading xét theo số câu đúng quy đổi Aptis: {aptisCorrect}/25.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 36 }}>
            <button type="button" onClick={onExit} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 12, border: '1px solid #e12816', backgroundColor: '#ffffff', padding: '0 18px', color: '#e12816', fontSize: 16, fontWeight: 700 }}>
              <ArrowLeft size={18} />
              Thoát
            </button>
            <button type="button" onClick={onReview} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, border: 0, borderRadius: 12, backgroundColor: '#f8fafc', padding: '0 18px', color: '#111827', fontSize: 16, fontWeight: 700 }}>
              <Eye size={18} />
              Xem lại từng câu?
            </button>
            <button type="button" onClick={onRetry} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, border: 0, borderRadius: 12, backgroundColor: '#d81e0c', padding: '0 18px', color: '#ffffff', fontSize: 16, fontWeight: 800 }}>
              <RotateCcw size={18} />
              Làm lại
            </button>
          </div>
        </article>

        <article style={{ marginTop: 28, borderRadius: 18, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '28px', boxShadow: '0 10px 28px rgba(15,23,42,0.04)' }}>
          <h2 style={{ color: '#111827', fontSize: 23, fontWeight: 900, margin: '0 0 18px' }}>Chi tiết bài làm</h2>
          <div>
            {summary.rows.map((row, index) => (
              <div key={row.part} style={{ display: 'grid', gridTemplateColumns: '1fr 128px 84px', alignItems: 'center', gap: 18, padding: '16px 0', borderTop: index > 0 ? '1px solid #e5e7eb' : 0 }}>
                <p style={{ color: '#111827', fontSize: 16, fontWeight: 600, margin: 0 }}>{row.part}</p>
                <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
                  Số câu đúng: <span style={{ color: '#111827', fontWeight: 900 }}>{row.correct}</span>
                </p>
                <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
                  Điểm: <span style={{ color: '#d81e0c', fontWeight: 900 }}>{row.score}</span>
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function ListeningResult({ summary, onExit, onReview, onRetry }: { summary: SkillScoreSummary; onExit: () => void; onReview: () => void; onRetry: () => void }) {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#ffffff', padding: '4px 24px 72px' }}>
      <section style={{ width: 'min(864px, 100%)', margin: '0 auto' }}>
        <article style={{ borderRadius: 14, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '38px 36px 36px', textAlign: 'center' }}>
          <h1 style={{ color: '#111827', fontSize: 28, fontWeight: 900, margin: 0 }}>Kết quả Listening</h1>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 26, maxWidth: 430, margin: '34px auto 0' }}>
            <ResultStat value={`${summary.score}/50`} label="Điểm" tone="red" />
            <ResultStat value={summary.cefr} label="Trình độ" tone="red" />
            <ResultStat value={`${summary.correct}/${summary.total}`} label="Số câu đúng" tone="black" />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 36 }}>
            <button type="button" onClick={onExit} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 12, border: '1px solid #e12816', backgroundColor: '#ffffff', padding: '0 18px', color: '#e12816', fontSize: 16, fontWeight: 700 }}>
              <ArrowLeft size={18} />
              Thoát
            </button>
            <button type="button" onClick={onReview} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, border: 0, borderRadius: 12, backgroundColor: '#f8fafc', padding: '0 18px', color: '#111827', fontSize: 16, fontWeight: 700 }}>
              <Eye size={18} />
              Xem lại từng câu?
            </button>
            <button type="button" onClick={onRetry} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, border: 0, borderRadius: 12, backgroundColor: '#d81e0c', padding: '0 18px', color: '#ffffff', fontSize: 16, fontWeight: 800 }}>
              <RotateCcw size={18} />
              Làm lại
            </button>
          </div>
        </article>

        <article style={{ marginTop: 28, borderRadius: 14, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '28px' }}>
          <h2 style={{ color: '#111827', fontSize: 23, fontWeight: 900, margin: '0 0 18px' }}>Chi tiết bài làm</h2>
          <div>
            {summary.rows.map((row, index) => (
              <div key={row.part} style={{ display: 'grid', gridTemplateColumns: '1fr 128px 84px', alignItems: 'center', gap: 18, padding: '16px 0', borderTop: index > 0 ? '1px solid #e5e7eb' : 0 }}>
                <p style={{ color: '#111827', fontSize: 16, fontWeight: 600, margin: 0 }}>{row.part}</p>
                <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
                  Số câu đúng: <span style={{ color: '#111827', fontWeight: 900 }}>{row.correct}</span>
                </p>
                <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
                  Điểm: <span style={{ color: '#d81e0c', fontWeight: 900 }}>{row.score}</span>
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function ListeningReview({
  part1AnswerKey,
  matchingAnswers,
  monologueAnswers,
  monologueAnswerKey,
  monologues,
  part1Answers,
  part1Questions,
  shortAnswers,
  onBack
}: {
  part1AnswerKey: string[];
  matchingAnswers: Record<string, string>;
  monologueAnswers: Record<string, string>;
  monologueAnswerKey: Record<string, string>;
  monologues: ListeningMonologueData[];
  part1Answers: Record<number, string>;
  part1Questions: ListeningPart1Question[];
  shortAnswers: Record<number, string>;
  onBack: () => void;
}) {
  const matchingCorrectAnswers: Record<string, string> = {
    'Speaker A ...': 'wants to learn a new skill',
    'Speaker B ...': 'enjoys meeting new people',
    'Speaker C ...': 'needs more time to practise',
    'Speaker D ...': 'has already done this activity before'
  };
  const shortCorrectAnswers = ['Woman', 'Man', 'Both', 'Woman'];
  const groups = [
    {
      title: 'Part 1 - Word Recognition',
      rows: part1Questions.map((question, index) => ({
        question: question.prompt,
        user: part1Answers[index] || 'Chưa chọn',
        answer: part1AnswerKey[index]
      }))
    },
    {
      title: 'Part 2 - Matching Information',
      rows: ['Speaker A ...', 'Speaker B ...', 'Speaker C ...', 'Speaker D ...'].map((speaker) => ({
        question: speaker,
        user: matchingAnswers[speaker] || 'Chưa chọn',
        answer: matchingCorrectAnswers[speaker]
      }))
    },
    {
      title: 'Part 3 - Short Conversations',
      rows: listeningShortStatements.map((statement, index) => ({
        question: statement,
        user: shortAnswers[index] || 'Chưa chọn',
        answer: shortCorrectAnswers[index]
      }))
    },
    {
      title: 'Part 4 - Monologues',
      rows: monologues.flatMap((recording, recordingIndex) =>
        recording.questions.map((question, questionIndex) => {
          const key = `${recordingIndex}-${questionIndex}`;
          return {
            question: `Recording ${recordingIndex + 1}: ${question.prompt}`,
            user: monologueAnswers[key] || 'Chưa chọn',
            answer: monologueAnswerKey[key]
          };
        })
      )
    }
  ];

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f7f7fc', padding: '32px 24px 72px' }}>
      <section style={{ width: 'min(980px, 100%)', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
          <div>
            <h1 style={{ color: '#111827', fontSize: 30, fontWeight: 900, margin: 0 }}>Xem lại từng câu Listening</h1>
            <p style={{ color: '#64748b', fontSize: 16, margin: '8px 0 0' }}>Đối chiếu đáp án bạn đã chọn với đáp án đúng.</p>
          </div>
          <button type="button" onClick={onBack} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 12, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '0 18px', color: '#111827', fontSize: 16, fontWeight: 700 }}>
            <ArrowLeft size={18} />
            Quay lại kết quả
          </button>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          {groups.map((group) => (
            <article key={group.title} style={{ borderRadius: 18, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: 24, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
              <h2 style={{ color: '#111827', fontSize: 21, fontWeight: 900, margin: '0 0 16px' }}>{group.title}</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {group.rows.map((row, index) => {
                  return (
                    <div key={`${group.title}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 180px', gap: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#f8fafc', padding: '14px 16px' }}>
                      <p style={{ color: '#111827', fontSize: 15, lineHeight: '22px', fontWeight: 700, margin: 0 }}>{index + 1}. {row.question}</p>
                      <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
                        Bạn chọn: <span style={{ color: '#111827', fontWeight: 700 }}>{row.user}</span>
                      </p>
                      <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
                        Đáp án: <span style={{ color: '#111827', fontWeight: 700 }}>{row.answer}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function GrammarResult({ summary, onExit, onRetry }: { summary: SkillScoreSummary; onExit: () => void; onRetry: () => void }) {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f7f7fc', padding: '42px 24px 84px' }}>
      <section style={{ width: 'min(860px, 100%)', margin: '0 auto' }}>
        <article style={{ borderRadius: 18, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '38px 34px', textAlign: 'center', boxShadow: '0 10px 28px rgba(15,23,42,0.06)' }}>
          <CheckCircle2 size={68} color="#16a34a" style={{ margin: '0 auto' }} />
          <h1 style={{ color: '#111827', fontSize: 30, fontWeight: 900, margin: '20px 0 0' }}>Kết quả Grammar & Vocabulary</h1>
          <p style={{ color: '#64748b', fontSize: 16, lineHeight: '26px', margin: '10px auto 0', maxWidth: 650 }}>
            Phần này tính theo số câu đúng trên thang 50 và được báo cáo riêng, không cộng vào tổng điểm 4 kỹ năng Aptis.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 26, maxWidth: 480, margin: '32px auto 0' }}>
            <ResultStat value={`${summary.score}/50`} label="Điểm" tone="red" />
            <ResultStat value={summary.cefr} label="Báo cáo riêng" tone="red" />
            <ResultStat value={`${summary.correct}/${summary.total}`} label="Số câu đúng" tone="black" />
          </div>
          <div style={{ marginTop: 30, display: 'grid', gap: 12, textAlign: 'left' }}>
            {summary.rows.map((row) => (
              <div key={row.part} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', alignItems: 'center', gap: 12, borderRadius: 14, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '16px 18px' }}>
                <p style={{ color: '#111827', fontSize: 16, fontWeight: 900, margin: 0 }}>{row.part}</p>
                <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>Đúng: <b>{row.correct}</b></p>
                <p style={{ color: '#d81e0c', fontSize: 15, margin: 0 }}>Điểm: <b>{row.score}</b></p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32 }}>
            <button type="button" onClick={onExit} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 12, border: '1px solid #e12816', backgroundColor: '#ffffff', padding: '0 18px', color: '#e12816', fontSize: 16, fontWeight: 700 }}>
              <ArrowLeft size={18} />
              Thoát
            </button>
            <button type="button" onClick={onRetry} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, border: 0, borderRadius: 12, backgroundColor: '#d81e0c', padding: '0 18px', color: '#ffffff', fontSize: 16, fontWeight: 800 }}>
              <RotateCcw size={18} />
              Làm lại
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}

function FullResult({
  grammar,
  listening,
  reading,
  speaking,
  totalScore,
  writing,
  onExit,
  onRetry
}: {
  grammar: SkillScoreSummary;
  listening: SkillScoreSummary;
  reading: SkillScoreSummary;
  speaking: AiSpeakingScore | null;
  totalScore: number;
  writing: AiWritingScore | null;
  onExit: () => void;
  onRetry: () => void;
}) {
  const readingAptisCorrect = correctToAptis25(reading.correct, reading.total);
  const skillRows = [
    { skill: 'Reading', score: clampScore50(reading.score), cefr: reading.cefr, note: `${reading.correct}/${reading.total} câu đúng, quy đổi ${readingAptisCorrect}/25` },
    { skill: 'Listening', score: listening.score, cefr: listening.cefr, note: `${listening.correct}/${listening.total} câu đúng` },
    { skill: 'Speaking', score: clampScore50(speaking?.overallScore ?? 0), cefr: speaking?.cefrLevel ?? 'A1', note: speaking ? 'Chấm bằng AI' : 'Chưa có kết quả AI' },
    { skill: 'Writing', score: clampScore50(writing?.overallScore ?? 0), cefr: writing?.cefrLevel ?? 'A1', note: writing ? 'Chấm bằng AI' : 'Chưa có kết quả AI' }
  ];
  const overallCefr = cefrFromAptisTotal(totalScore);

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f7f7fc', padding: '42px 24px 84px' }}>
      <section style={{ width: 'min(980px, 100%)', margin: '0 auto' }}>
        <article style={{ borderRadius: 18, border: '1px solid #bbf7d0', backgroundColor: '#ffffff', padding: '38px 34px', boxShadow: '0 12px 30px rgba(15,23,42,0.08)' }}>
          <div style={{ textAlign: 'center' }}>
            <CheckCircle2 size={70} color="#16a34a" style={{ margin: '0 auto' }} />
            <h1 style={{ color: '#111827', fontSize: 30, fontWeight: 900, margin: '20px 0 0' }}>Kết quả Full Aptis Mock Test</h1>
            <p style={{ color: '#64748b', fontSize: 16, lineHeight: '26px', margin: '10px auto 0', maxWidth: 700 }}>
              Tổng điểm Aptis tính 4 kỹ năng Reading, Listening, Speaking và Writing. Grammar & Vocabulary được báo cáo riêng theo thang 50.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginTop: 30 }}>
            <FullResultStat label="Tổng điểm 4 kỹ năng" value={`${totalScore}/200`} />
            <FullResultStat label="CEFR tổng thể" value={overallCefr} />
            <FullResultStat label="Grammar & Vocabulary" value={`${grammar.score}/50`} />
          </div>

          <div style={{ marginTop: 28, display: 'grid', gap: 12 }}>
            {skillRows.map((row) => (
              <div key={row.skill} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 220px', alignItems: 'center', gap: 14, borderRadius: 14, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '16px 18px' }}>
                <p style={{ color: '#111827', fontSize: 16, fontWeight: 900, margin: 0 }}>{row.skill}</p>
                <p style={{ color: '#2b075c', fontSize: 18, fontWeight: 900, margin: 0 }}>{row.score}/50</p>
                <p style={{ color: '#047857', fontSize: 16, fontWeight: 900, margin: 0 }}>{row.cefr}</p>
                <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>{row.note}</p>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 220px', alignItems: 'center', gap: 14, borderRadius: 14, border: '1px solid #fcd34d', backgroundColor: '#fffbeb', padding: '16px 18px' }}>
              <p style={{ color: '#111827', fontSize: 16, fontWeight: 900, margin: 0 }}>Grammar & Vocabulary</p>
              <p style={{ color: '#92400e', fontSize: 18, fontWeight: 900, margin: 0 }}>{grammar.score}/50</p>
              <p style={{ color: '#92400e', fontSize: 16, fontWeight: 900, margin: 0 }}>{grammar.cefr}</p>
              <p style={{ color: '#92400e', fontSize: 14, margin: 0 }}>Không cầng vào từng 200</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32 }}>
            <button type="button" onClick={onExit} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 12, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '0 18px', color: '#111827', fontSize: 16, fontWeight: 700 }}>
              <ArrowLeft size={18} />
              Thoát
            </button>
            <button type="button" onClick={onRetry} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, border: 0, borderRadius: 12, backgroundColor: '#2b075c', padding: '0 18px', color: '#ffffff', fontSize: 16, fontWeight: 800 }}>
              <RotateCcw size={18} />
              Làm lại Full Test
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}

function FullResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderRadius: 14, border: '1px solid #dce3ee', backgroundColor: '#f8fafc', padding: 18, textAlign: 'center' }}>
      <p style={{ color: '#111827', fontSize: 28, fontWeight: 900, margin: 0 }}>{value}</p>
      <p style={{ color: '#64748b', fontSize: 14, margin: '8px 0 0' }}>{label}</p>
    </div>
  );
}

function ResultStat({ value, label, tone }: { value: string; label: string; tone: 'red' | 'black' }) {
  return (
    <div>
      <p style={{ color: tone === 'red' ? '#d81e0c' : '#000000', fontSize: 42, lineHeight: 1, fontWeight: 900, margin: 0 }}>{value}</p>
      <p style={{ color: '#737373', fontSize: 16, margin: '10px 0 0' }}>{label}</p>
    </div>
  );
}

function ReadingReview({
  cohesionAnswers,
  data,
  gapAnswers,
  longAnswers,
  opinionAnswers,
  onBack
}: {
  cohesionAnswers: Record<number, string[]>;
  data: ReadingTestData;
  gapAnswers: Record<number, string>;
  longAnswers: Record<number, string>;
  opinionAnswers: Record<number, string>;
  onBack: () => void;
}) {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f7f7fc', padding: '32px 24px 72px' }}>
      <section style={{ width: 'min(980px, 100%)', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
          <div>
            <h1 style={{ color: '#111827', fontSize: 30, fontWeight: 900, margin: 0 }}>Xem lại từng câu Reading</h1>
            <p style={{ color: '#64748b', fontSize: 16, margin: '8px 0 0' }}>Đối chiếu câu đã làm với đáp án đúng.</p>
          </div>
          <button type="button" onClick={onBack} style={{ height: 44, display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 12, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: '0 18px', color: '#111827', fontSize: 16, fontWeight: 700 }}>
            <ArrowLeft size={18} />
            Quay lại kết quả
          </button>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <ReadingAnswerSection title="Part 1 - Gap Fill">
            {data.gaps.map((question, index) => {
              const user = gapAnswers[index] || 'Chưa chọn';
              return (
                <ReadingAnswerRow
                  key={`${question.answer}-${index}`}
                  answer={question.answer}
                  correct={sameAnswer(user, question.answer)}
                  index={index}
                  question={formatGapPrompt(question)}
                  user={user}
                />
              );
            })}
          </ReadingAnswerSection>

          <ReadingAnswerSection title="Part 2 + 3 - Text Cohesion">
            {data.cohesion.map((question, questionIndex) => (
              <div key={question.title} style={{ display: 'grid', gap: 10 }}>
                <h3 style={{ color: '#111827', fontSize: 18, fontWeight: 900, margin: questionIndex === 0 ? '0 0 2px' : '10px 0 2px' }}>{question.title}</h3>
                {question.correctOrder.map((answer, sentenceIndex) => {
                  const user = cohesionAnswers[questionIndex]?.[sentenceIndex] || 'Chưa xếp';
                  return (
                    <ReadingAnswerRow
                      key={`${question.title}-${sentenceIndex}`}
                      answer={answer}
                      correct={sameAnswer(user, answer)}
                      index={sentenceIndex}
                      question={`Vị trí ${sentenceIndex + 1}`}
                      user={user}
                      wide
                    />
                  );
                })}
              </div>
            ))}
          </ReadingAnswerSection>

          <ReadingAnswerSection title="Part 4 - Opinion Matching">
            {data.opinion.questions.map((question, index) => {
              const answer = data.opinion.correctAnswers[index] ?? '';
              const user = opinionAnswers[index] || 'Chưa chọn';
              return (
                <ReadingAnswerRow
                  key={`${question}-${index}`}
                  answer={answer}
                  correct={sameAnswer(user, answer)}
                  index={index}
                  question={question}
                  user={user}
                />
              );
            })}
          </ReadingAnswerSection>

          <ReadingAnswerSection title="Part 5 - Long Reading">
            {data.long.correctAnswers.map((answer, index) => {
              const correctAnswer = resolveOptionLabel(answer, data.long.headings);
              const user = longAnswers[index] || 'Chưa chọn';
              return (
                <ReadingAnswerRow
                  key={`${correctAnswer}-${index}`}
                  answer={correctAnswer}
                  correct={sameAnswer(user, correctAnswer)}
                  index={index}
                  question={`Paragraph ${index + 1}`}
                  user={user}
                />
              );
            })}
          </ReadingAnswerSection>
        </div>
      </section>
    </main>
  );
}

function formatGapPrompt(question: ReadingGapQuestion) {
  if (question.prompt?.trim()) return question.prompt;
  return `${question.questionStart ?? ''}___${question.questionEnd ?? ''}`.trim();
}

function ReadingAnswerSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <article style={{ borderRadius: 18, border: '1px solid #dce3ee', backgroundColor: '#ffffff', padding: 24, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
      <h2 style={{ color: '#111827', fontSize: 21, fontWeight: 900, margin: '0 0 16px' }}>{title}</h2>
      <div style={{ display: 'grid', gap: 10 }}>{children}</div>
    </article>
  );
}

function ReadingAnswerRow({
  answer,
  correct,
  index,
  question,
  user,
  wide = false
}: {
  answer: string;
  correct: boolean;
  index: number;
  question: string;
  user: string;
  wide?: boolean;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: wide ? '110px minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(220px, 1fr) minmax(180px, 0.75fr) minmax(180px, 0.75fr)', gap: 14, alignItems: 'start', borderRadius: 12, backgroundColor: '#f8fafc', padding: '14px 16px' }}>
      <p style={{ color: '#111827', fontSize: 15, lineHeight: '22px', fontWeight: 800, margin: 0 }}>{index + 1}. {question}</p>
      <p style={{ color: '#64748b', fontSize: 14, lineHeight: '22px', margin: 0 }}>
        Bạn chọn: <span style={{ color: correct ? '#047857' : '#d81e0c', fontWeight: 900 }}>{user}</span>
      </p>
      <p style={{ color: '#64748b', fontSize: 14, lineHeight: '22px', margin: 0 }}>
        Đáp án: <span style={{ color: '#047857', fontWeight: 900 }}>{answer}</span>
      </p>
    </div>
  );
}

function GapSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{
        height: 38,
        minWidth: 150,
        borderRadius: 6,
        border: '1px solid #dce3ee',
        backgroundColor: '#ffffff',
        padding: '0 18px',
        margin: '0 8px',
        color: '#475569',
        fontSize: 18,
        outline: 'none'
      }}
    >
      <option value=""></option>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}

function ReadingGapSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <span style={{ position: 'relative', display: 'inline-block', margin: '0 8px', verticalAlign: 'middle' }}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          height: 38,
          minWidth: 150,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          borderRadius: 6,
          border: '1px solid #dce3ee',
          backgroundColor: '#ffffff',
          padding: '0 14px 0 18px',
          color: value ? '#020817' : '#475569',
          fontSize: 18,
          lineHeight: '38px',
          cursor: 'pointer'
        }}
      >
        <span>{value || '-'}</span>
        <span style={{ color: '#64748b', fontSize: 16, lineHeight: 1 }}>v</span>
      </button>
      {open && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 42,
            zIndex: 120,
            width: '100%',
            overflow: 'hidden',
            borderRadius: 8,
            border: '1px solid #dce3ee',
            backgroundColor: '#ffffff',
            boxShadow: '0 12px 24px rgba(15,23,42,0.16)'
          }}
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              style={{
                width: '100%',
                height: 38,
                display: 'block',
                border: 0,
                borderTop: option === options[0] ? 0 : '1px solid #eef2f7',
                backgroundColor: option === value ? '#f3efff' : '#ffffff',
                padding: '0 16px',
                color: '#020817',
                fontSize: 16,
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              {option}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

function AnswerList({ items }: { items: Array<string | number> }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((item, index) => (
        <p key={`${item}-${index}`} style={{ margin: 0 }}>
          <b>{index + 1}.</b> {item || 'Chưa có đáp án mẫu'}
        </p>
      ))}
    </div>
  );
}

function AnswerPairs({ items }: { items: Array<{ label: string; answer: string }> }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((item) => (
        <p key={item.label} style={{ margin: 0 }}>
          <b>{item.label}:</b> {item.answer || 'Chưa có đáp án mẫu'}
        </p>
      ))}
    </div>
  );
}

function InlineAnswer({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginTop: 10, borderRadius: 10, border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', padding: '10px 12px', color: '#1e3a8a', fontSize: 14, lineHeight: '22px' }}>
      <b>Đáp án: </b>{children}
    </div>
  );
}

function GrammarAnswerContent({ question }: { question: GrammarQuestionItem }) {
  if (question.answer) return <AnswerList items={[question.answer]} />;

  const rows = question.matchRows ?? question.definitionRows ?? question.sentenceRows ?? question.collocationRows ?? [];
  if (rows.length) {
    return <AnswerPairs items={rows.map((row) => {
      const labeledRow = row as { word?: string; definition?: string; before?: string; answer: string };
      return { label: labeledRow.word ?? labeledRow.definition ?? labeledRow.before ?? 'Đáp án', answer: labeledRow.answer };
    })} />;
  }

  return <>Chưa có đáp án mẫu cho câu này.</>;
}

function WritingAnswerContent({ part, partIndex }: { part: WritingPartData; partIndex: number }) {
  const sampleAnswers = (part as { sampleAnswers?: string[] }).sampleAnswers ?? [];
  if (sampleAnswers.length) return <AnswerList items={sampleAnswers} />;

  if (partIndex === 0) {
    return <AnswerList items={part.questions.map(() => 'Chưa có đáp án mẫu')} />;
  }

  return <>Chưa có đáp án mẫu cho phần Writing này.</>;
}

function ReadingFooter({ answerOpen = false, showAnswer = false, nextDisabled = false, nextLabel = 'Next', onOpenQuestionList, onPrevious, onNext, onToggleAnswer }: { answerOpen?: boolean; showAnswer?: boolean; nextDisabled?: boolean; nextLabel?: string; onOpenQuestionList?: () => void; onPrevious: () => void; onNext: () => void; onToggleAnswer?: () => void }) {
  return (
    <footer
      className="mock-reading-footer"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        borderTop: '3px solid #2b075c',
        backgroundColor: '#ffffff',
        padding: '12px 20px'
      }}
    >
      <div
        className="mock-reading-footer-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 16
        }}
      >
        <div className="mock-reading-footer-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
          {showAnswer && (
            <button type="button" onClick={onToggleAnswer} style={sideActionStyle}>
              <Eye size={17} />
              {answerOpen ? 'Ẩn đáp án' : 'Hiện đáp án'}
            </button>
          )}
          <button type="button" style={sideActionStyle}>
            <Flag size={17} />
            Báo lại
          </button>
        </div>

        <div className="mock-reading-footer-tools" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <UtilityIcon icon={<List size={21} />} label="Danh sách câu hỏi" onClick={onOpenQuestionList} />
          <UtilityIcon icon={<Info size={21} />} />
          <UtilityIcon icon={<Move size={20} />} />
        </div>

        <div className="mock-reading-footer-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
          <UtilityIcon icon={<LogOut size={21} />} />
          <button
            type="button"
            onClick={onPrevious}
            style={{
              height: 50,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              borderRadius: 12,
              border: '1px solid #020817',
              backgroundColor: '#ffffff',
              padding: '0 24px',
              color: '#020817',
              fontSize: 18,
              fontWeight: 500
            }}
          >
            <ArrowLeft size={22} />
            Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            style={{
              height: 50,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              borderRadius: 12,
              border: 0,
              backgroundColor: nextDisabled ? '#cbd5e1' : '#2b075c',
              padding: '0 32px',
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 800,
              cursor: nextDisabled ? 'not-allowed' : 'pointer'
            }}
          >
            {nextLabel}
            <ArrowRight size={22} />
          </button>
        </div>
      </div>
    </footer>
  );
}

function SpeakingStart({ test, onStart }: { test: typeof speakingMockTests[number]; onStart: () => void }) {
  return (
    <main className="min-h-[calc(100vh-74px)] bg-white px-6 py-14 sm:px-[100px]">
      <section className="max-w-[560px]">
        <p className="text-lg font-medium text-slate-600">Aptis General Practice Test</p>
        <h2 className="mt-3 text-[26px] font-extrabold leading-8 text-navy">{test.title}</h2>
        <p className="mt-2 text-lg text-slate-600">Speaking - Full Practice</p>

        <div className="mt-8 grid max-w-[360px] grid-cols-2 gap-20">
          <Meta label="Number of Questions" value={String(test.questions)} />
          <Meta label="Time Allowed" value={`${test.minutes} min`} />
        </div>

        <h3 className="mt-8 text-xl font-extrabold text-navy">Assessment Description</h3>

        <div className="mt-8 rounded-2xl border border-brand-100 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <MicTestPanel />
        </div>

        <button type="button" onClick={onStart} className="mt-8 h-[50px] rounded-xl px-8 text-lg font-semibold text-white hover:opacity-95" style={{ backgroundColor: '#2b075c' }}>
          Start Assessment
        </button>
      </section>
    </main>
  );
}

function SpeakingInstructions() {
  return (
    <main
      className="mock-speaking-main"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f1f1f1',
        padding: '60px 24px 108px'
      }}
    >
      <section
        className="mock-speaking-grid"
        style={{
          width: 'min(960px, 100%)',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: '60px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
        }}
      >
        <h2 style={{ color: '#020817', fontSize: 26, fontWeight: 800, lineHeight: '32px', margin: 0 }}>
          Aptis General Speaking Test Instructions
        </h2>
        <h3 style={{ color: '#020817', fontSize: 20, fontWeight: 800, margin: '28px 0 0' }}>Speaking</h3>
        <div style={{ color: '#26324a', fontSize: 18, lineHeight: '28px', marginTop: 20 }}>
          <p style={{ margin: '0 0 20px' }}>You will answer some questions about yourself and then do three short speaking tasks.</p>
          <p style={{ margin: '0 0 20px' }}>Listen to the instructions and questions, then speak clearly into your microphone after you hear the signal.</p>
          <p style={{ margin: '0 0 20px' }}>For this mock test, the system reads each question before the beep. Answer fully with details, reasons, or examples.</p>
          <p style={{ margin: '0 0 20px' }}>Each part of the test will appear automatically.</p>
          <p style={{ margin: '0 0 20px' }}>The test will take about 12 minutes.</p>
          <p style={{ margin: 0 }}>When you click on the 'Next' button, the test will begin.</p>
        </div>
      </section>
    </main>
  );
}

function SpeakingPrompt({ part }: { part: 1 | 2 | 3 | 4 }) {
  const promptText = part === 1
    ? 'Part One - In this part, I am going to ask you three short questions about yourself and your interests. You will have 30 seconds to reply to each question.'
    : part === 2
      ? "Part Two - In this part, I'm going to ask you to describe a picture. Then I will ask you two questions about it. You will have 45 seconds for each response."
      : part === 3
        ? "Part Three - In this part, I'm going to ask you to compare two pictures, and I will then ask you two questions about them. You will have 45 seconds for each response."
        : 'Part Four - In this part, you will discuss a topic. You will have 60 seconds to prepare and 120 seconds to speak.';

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 74px)',
        backgroundColor: '#f1f1f1',
        padding: '60px 24px 108px'
      }}
    >
      <section
        className="mock-speaking-grid"
        style={{
          width: 'min(960px, 100%)',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: '60px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
        }}
      >
        <h2 style={{ color: '#020817', fontSize: 26, fontWeight: 800, lineHeight: '32px', margin: 0 }}>Prompt</h2>
        <div style={{ color: '#26324a', fontSize: 18, lineHeight: '28px', marginTop: 32, maxWidth: 760 }}>
          <p style={{ margin: '0 0 32px' }}>{promptText}</p>
          <p style={{ margin: '0 0 16px' }}>The system will read the question first.</p>
          <p style={{ margin: 0 }}>Begin speaking after you hear the beep.</p>
        </div>
      </section>
    </main>
  );
}

function SpeakingQuestion({ question, index, total, seconds, showAnswer, isReading, microphoneLevel, onToggleAnswer, onFinish }: { question: string; index: number; total: number; seconds: number; showAnswer?: boolean; isReading: boolean; microphoneLevel: number; onToggleAnswer: () => void; onFinish: () => void }) {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 74px)',
        backgroundColor: '#f1f1f1',
        padding: '40px 24px 112px',
        position: 'relative'
      }}
    >
      <section
        style={{
          width: 'min(1400px, 100%)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 276px',
          gap: 30,
          alignItems: 'start'
        }}
      >
        <div
          className="mock-speaking-card"
          style={{
            minHeight: 500,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: '40px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
          }}
        >
          <p style={{ color: '#7a8393', fontSize: 16, fontWeight: 500, margin: 0 }}>Speaking</p>
          <h2 style={{ color: '#020817', fontSize: 18, fontWeight: 800, margin: '10px 0 0' }}>Question {index + 1} of {total}</h2>
          <p style={{ color: '#26324a', fontSize: 18, lineHeight: '28px', margin: '34px 0 0' }}>{question}</p>
          <AutoScoredRecordingNote />
          {showAnswer && <SpeakingSampleAnswer text={speakingSampleAnswers[index]} />}
        </div>

        <aside className="mock-speaking-recorder">
          <div
            style={{
              minHeight: 324,
              backgroundColor: '#ffffff',
              borderRadius: 18,
              padding: '32px 24px',
              textAlign: 'center',
              boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)'
            }}
          >
            <p style={{ color: isReading || seconds === 0 ? '#2b075c' : '#ef1d1d', fontSize: 18, fontWeight: 800, margin: 0 }}>
              {isReading ? 'Reading...' : seconds === 0 ? 'Finished' : 'Recording...'}
            </p>
            <div
              style={{
                width: 166,
                height: 166,
                borderRadius: '50%',
                border: '5px solid #2b075c',
                margin: '28px auto 0',
                display: 'grid',
                placeItems: 'center',
                color: '#2b075c'
              }}
            >
              <div>
                <Mic size={24} color="#ef1d1d" style={{ margin: '0 auto 8px' }} />
                <p style={{ color: '#2b075c', fontSize: 42, fontWeight: 900, lineHeight: 1, margin: 0 }}>{isReading ? '...' : `${seconds}s`}</p>
              </div>
            </div>
            <RecordingWaveform level={isReading || seconds === 0 ? 0 : microphoneLevel} />
          </div>
          <button
            type="button"
            onClick={onFinish}
            disabled={isReading}
            style={{
              width: '100%',
              height: 50,
              marginTop: 20,
              border: 0,
              borderRadius: 14,
              backgroundColor: isReading ? '#dedbe5' : '#2b075c',
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 800,
              cursor: isReading ? 'not-allowed' : 'pointer'
            }}
          >
            Finish Recording
          </button>
        </aside>
      </section>

      <div className="mock-speaking-side-actions" style={speakingSideActionsStyle}>
        <button type="button" onClick={onToggleAnswer} style={sideActionStyle}>
          <Eye size={17} />
          {showAnswer ? 'Ẩn đáp án' : 'Hiện đáp án'}
        </button>
        <button type="button" style={sideActionStyle}>
          <Flag size={17} />
          Báo lại
        </button>
      </div>
    </main>
  );
}

function Part2Question({ question, imageUrl, index, total, seconds, showAnswer, isReading, microphoneLevel, onToggleAnswer, onOpenDraft, onFinish }: { question: string; imageUrl: string; index: number; total: number; seconds: number; showAnswer?: boolean; isReading: boolean; microphoneLevel: number; onToggleAnswer: () => void; onOpenDraft: () => void; onFinish: () => void }) {
  return (
    <main
      className="mock-speaking-main"
      style={{
        minHeight: 'calc(100vh - 74px)',
        backgroundColor: '#f1f1f1',
        padding: '40px 24px 112px',
        position: 'relative'
      }}
    >
      <section
        className="mock-speaking-grid"
        style={{
          width: 'min(1400px, 100%)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 276px',
          gap: 30,
          alignItems: 'start'
        }}
      >
        <div
          className="mock-speaking-card"
          style={{
            minHeight: 580,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: '40px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
          }}
        >
          <p style={{ color: '#7a8393', fontSize: 16, fontWeight: 500, margin: 0 }}>Speaking</p>
          <h2 style={{ color: '#020817', fontSize: 18, fontWeight: 800, margin: '10px 0 0' }}>Question {index + 1} of {total}</h2>
          <img
            src={imageUrl}
            alt={`Speaking Part 2 prompt ${index + 1}`}
            style={{
              display: 'block',
              width: 'min(560px, 100%)',
              height: 374,
              objectFit: 'cover',
              borderRadius: 12,
              marginTop: 30
            }}
          />
          <p style={{ color: '#26324a', fontSize: 18, lineHeight: '28px', margin: '22px 0 0' }}>{question}</p>
          <AutoScoredRecordingNote />
          {showAnswer && <SpeakingSampleAnswer text={part2SampleAnswers[index]} />}
        </div>

        <aside className="mock-speaking-recorder">
          <div
            style={{
              minHeight: 324,
              backgroundColor: '#ffffff',
              borderRadius: 18,
              padding: '32px 24px',
              textAlign: 'center',
              boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)'
            }}
          >
            <p style={{ color: isReading || seconds === 0 ? '#2b075c' : '#ef1d1d', fontSize: 18, fontWeight: 800, margin: 0 }}>
              {isReading ? 'Reading...' : seconds === 0 ? 'Finished' : 'Recording...'}
            </p>
            <div
              style={{
                width: 166,
                height: 166,
                borderRadius: '50%',
                border: '5px solid #2b075c',
                margin: '28px auto 0',
                display: 'grid',
                placeItems: 'center',
                color: '#2b075c'
              }}
            >
              <div>
                <Mic size={24} color="#ef1d1d" style={{ margin: '0 auto 8px' }} />
                <p style={{ color: '#2b075c', fontSize: 42, fontWeight: 900, lineHeight: 1, margin: 0 }}>{isReading ? '...' : `${seconds}s`}</p>
              </div>
            </div>
            <RecordingWaveform level={isReading || seconds === 0 ? 0 : microphoneLevel} />
          </div>
          <button
            type="button"
            onClick={onFinish}
            disabled={isReading}
            style={{
              width: '100%',
              height: 50,
              marginTop: 20,
              border: 0,
              borderRadius: 14,
              backgroundColor: isReading ? '#dedbe5' : '#2b075c',
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 800,
              cursor: isReading ? 'not-allowed' : 'pointer'
            }}
          >
            Finish Recording
          </button>
        </aside>
      </section>

      <div className="mock-speaking-side-actions" style={speakingSideActionsStyle}>
        <button type="button" onClick={onOpenDraft} style={sideActionStyle}>
          <FileText size={17} />
          Nháp
        </button>
        <button type="button" onClick={onToggleAnswer} style={sideActionStyle}>
          <Eye size={17} />
          {showAnswer ? 'Ẩn đáp án' : 'Hiện đáp án'}
        </button>
        <button type="button" style={sideActionStyle}>
          <Flag size={17} />
          Báo lại
        </button>
      </div>
    </main>
  );
}

function Part3Question({ question, index, total, seconds, showAnswer, isReading, microphoneLevel, onToggleAnswer, onOpenDraft, onFinish }: { question: string; index: number; total: number; seconds: number; showAnswer?: boolean; isReading: boolean; microphoneLevel: number; onToggleAnswer: () => void; onOpenDraft: () => void; onFinish: () => void }) {
  return (
    <main
      className="mock-speaking-main"
      style={{
        minHeight: 'calc(100vh - 74px)',
        backgroundColor: '#f1f1f1',
        padding: '40px 24px 112px',
        position: 'relative'
      }}
    >
      <section
        className="mock-speaking-grid"
        style={{
          width: 'min(1400px, 100%)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 276px',
          gap: 30,
          alignItems: 'start'
        }}
      >
        <div
          className="mock-speaking-card"
          style={{
            minHeight: 500,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: '40px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
          }}
        >
          <p style={{ color: '#7a8393', fontSize: 16, fontWeight: 500, margin: 0 }}>Speaking</p>
          <h2 style={{ color: '#020817', fontSize: 18, fontWeight: 800, margin: '10px 0 0' }}>Question {index + 1} of {total}</h2>
          <div
            className="mock-speaking-image-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 20,
              marginTop: 30,
              width: 'min(1016px, 100%)'
            }}
          >
            <img
              src="/images/speaking/part3/de01_1.png"
              alt="People travelling by car"
              style={{ width: '100%', height: 280, objectFit: 'cover', borderRadius: 12, display: 'block' }}
            />
            <img
              src="/images/speaking/part3/de01_2.png"
              alt="People travelling by train"
              style={{ width: '100%', height: 280, objectFit: 'cover', borderRadius: 12, display: 'block' }}
            />
          </div>
          <p style={{ color: '#26324a', fontSize: 18, lineHeight: '28px', margin: '22px 0 0' }}>{question}</p>
          <AutoScoredRecordingNote />
          {showAnswer && <SpeakingSampleAnswer text={part3SampleAnswers[index]} />}
        </div>

        <aside className="mock-speaking-recorder">
          <div
            style={{
              minHeight: 324,
              backgroundColor: '#ffffff',
              borderRadius: 18,
              padding: '32px 24px',
              textAlign: 'center',
              boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)'
            }}
          >
            <p style={{ color: isReading || seconds === 0 ? '#2b075c' : '#ef1d1d', fontSize: 18, fontWeight: 800, margin: 0 }}>
              {isReading ? 'Reading...' : seconds === 0 ? 'Finished' : 'Recording...'}
            </p>
            <div
              style={{
                width: 166,
                height: 166,
                borderRadius: '50%',
                border: '5px solid #2b075c',
                margin: '28px auto 0',
                display: 'grid',
                placeItems: 'center',
                color: '#2b075c'
              }}
            >
              <div>
                <Mic size={24} color="#ef1d1d" style={{ margin: '0 auto 8px' }} />
                <p style={{ color: '#2b075c', fontSize: 42, fontWeight: 900, lineHeight: 1, margin: 0 }}>{isReading ? '...' : `${seconds}s`}</p>
              </div>
            </div>
            <RecordingWaveform level={isReading || seconds === 0 ? 0 : microphoneLevel} />
          </div>
          <button
            type="button"
            onClick={onFinish}
            disabled={isReading}
            style={{
              width: '100%',
              height: 50,
              marginTop: 20,
              border: 0,
              borderRadius: 14,
              backgroundColor: isReading ? '#dedbe5' : '#2b075c',
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 800,
              cursor: isReading ? 'not-allowed' : 'pointer'
            }}
          >
            Finish Recording
          </button>
        </aside>
      </section>

      <div className="mock-speaking-side-actions" style={speakingSideActionsStyle}>
        <button type="button" onClick={onOpenDraft} style={sideActionStyle}>
          <FileText size={17} />
          Nháp
        </button>
        <button type="button" onClick={onToggleAnswer} style={sideActionStyle}>
          <Eye size={17} />
          {showAnswer ? 'Ẩn đáp án' : 'Hiện đáp án'}
        </button>
        <button type="button" style={sideActionStyle}>
          <Flag size={17} />
          Báo lại
        </button>
      </div>
    </main>
  );
}

function Part4Question({ topic, phase, seconds, showAnswer, isReading, microphoneLevel, onToggleAnswer, onOpenDraft, onFinish }: { topic: SpeakingPart4Topic; phase: Part4Phase; seconds: number; showAnswer?: boolean; isReading: boolean; microphoneLevel: number; onToggleAnswer: () => void; onOpenDraft: () => void; onFinish: () => void }) {
  const isPreparing = phase === 'prepare';

  return (
    <main
      className="mock-speaking-main"
      style={{
        minHeight: 'calc(100vh - 74px)',
        backgroundColor: '#f1f1f1',
        padding: '40px 24px 112px',
        position: 'relative'
      }}
    >
      <section
        className="mock-speaking-grid"
        style={{
          width: 'min(1400px, 100%)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 276px',
          gap: 30,
          alignItems: 'start'
        }}
      >
        <div
          className="mock-speaking-card"
          style={{
            minHeight: 650,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: '40px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
          }}
        >
          <p style={{ color: '#7a8393', fontSize: 16, fontWeight: 500, margin: 0 }}>Speaking</p>
          <h2 style={{ color: '#020817', fontSize: 18, fontWeight: 800, margin: '10px 0 0' }}>Part 4 of 4</h2>

          <div
            style={{
              marginTop: 32,
              width: 'min(1016px, 100%)',
              borderRadius: 14,
              backgroundColor: '#f8fafc',
              padding: '26px 26px 24px'
            }}
          >
            <h3 style={{ color: '#020817', fontSize: 22, fontWeight: 900, margin: 0 }}>Topic: {topic.title}</h3>
            {topic.image && (
              <img
                src={topic.image}
                alt={topic.title}
                style={{
                  display: 'block',
                  width: 'min(560px, 100%)',
                  height: 280,
                  objectFit: 'cover',
                  borderRadius: 12,
                  marginTop: 20
                }}
              />
            )}
            <div style={{ marginTop: 20, color: '#26324a', fontSize: 18, lineHeight: '32px' }}>
              {topic.questions.map((question) => (
                <p key={question} style={{ margin: 0 }}>&middot; {question}</p>
              ))}
            </div>
            <p style={{ color: '#020817', fontSize: 19, lineHeight: '28px', fontWeight: 900, margin: '18px 0 0' }}>
              {isPreparing
                ? 'You now have one minute to think about your answers. You can make notes if you wish.'
                : 'You now have two minutes to speak.'}
            </p>
            {!isPreparing && <AutoScoredRecordingNote />}
            {showAnswer && <SpeakingSampleAnswer text={part4SampleAnswer} />}
          </div>
        </div>

        <aside className="mock-speaking-recorder">
          {isPreparing ? (
            <div
              style={{
                minHeight: 324,
                backgroundColor: '#ffffff',
                borderRadius: 18,
                padding: '72px 24px 32px',
                textAlign: 'center',
                boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)'
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  margin: '0 auto',
                  display: 'grid',
                  placeItems: 'center',
                  backgroundColor: '#f0eef5',
                  color: '#2b075c'
                }}
              >
                <Volume2 size={34} />
              </div>
              <h3 style={{ color: '#2b075c', fontSize: 18, fontWeight: 900, margin: '24px 0 0' }}>Instructions...</h3>
              <p style={{ color: '#7a8393', fontSize: 16, lineHeight: '24px', margin: '12px auto 0', maxWidth: 190 }}>
                Chuẩn bị còn {seconds}s
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  minHeight: 324,
                  backgroundColor: '#ffffff',
                  borderRadius: 18,
                  padding: '32px 24px',
                  textAlign: 'center',
                  boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)'
                }}
              >
                <p style={{ color: isReading || seconds === 0 ? '#2b075c' : '#ef1d1d', fontSize: 18, fontWeight: 800, margin: 0 }}>
                  {isReading ? 'Reading...' : seconds === 0 ? 'Finished' : 'Recording...'}
                </p>
                <div
                  style={{
                    width: 166,
                    height: 166,
                    borderRadius: '50%',
                    border: '5px solid #2b075c',
                    margin: '28px auto 0',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#2b075c'
                  }}
                >
                  <div>
                    <Mic size={24} color="#ef1d1d" style={{ margin: '0 auto 8px' }} />
                    <p style={{ color: '#2b075c', fontSize: 42, fontWeight: 900, lineHeight: 1, margin: 0 }}>{isReading ? '...' : `${seconds}s`}</p>
                  </div>
                </div>
                <RecordingWaveform level={isReading || seconds === 0 ? 0 : microphoneLevel} />
              </div>
              <button
                type="button"
                onClick={onFinish}
                disabled={isReading}
                style={{
                  width: '100%',
                  height: 50,
                  marginTop: 20,
                  border: 0,
                  borderRadius: 14,
                  backgroundColor: isReading ? '#dedbe5' : '#2b075c',
                  color: '#ffffff',
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: isReading ? 'not-allowed' : 'pointer'
                }}
              >
                Finish Recording
              </button>
            </>
          )}
        </aside>
      </section>

      <div className="mock-speaking-side-actions" style={speakingSideActionsStyle}>
        <button type="button" onClick={onOpenDraft} style={sideActionStyle}>
          <FileText size={17} />
          Nháp
        </button>
        <button type="button" onClick={onToggleAnswer} style={sideActionStyle}>
          <Eye size={17} />
          {showAnswer ? 'Ẩn đáp án' : 'Hiện đáp án'}
        </button>
        <button type="button" style={sideActionStyle}>
          <Flag size={17} />
          Báo lại
        </button>
      </div>
    </main>
  );
}

const speakingDraftTemplates: Record<string, SpeakingDraftTemplate> = {
  '2-0': {
    title: 'Dạng bài miêu tả ảnh',
    target: 'Mục tiêu: 4-6 câu, khoảng 40-45 giây.',
    fields: [
      { label: 'Mở đầu', prefix: 'In this picture I can see', b1: ['a group of friends', 'several people', 'some young people'], b2: ['a group of friends spending time together', 'several people enjoying a meal together', 'some young people in a relaxed social setting'] },
      { label: 'Ở đâu', prefix: 'They are', b1: ['at an outdoor restaurant', 'in a cafe', 'around a table'], b2: ['sitting at an outdoor restaurant', 'gathered around a table in a cafe', 'having lunch in a bright outdoor space'] },
      { label: 'Đang làm gì', prefix: 'They are', b1: ['talking and laughing', 'eating lunch together', 'having a good time'], b2: ['talking and laughing while they eat lunch', 'sharing food and enjoying a friendly conversation', 'smiling as they spend time together'] },
      { label: 'Chi tiết', prefix: 'I can also see', b1: ['food and drinks on the table', 'a red umbrella', 'many green plants'], b2: ['food and drinks on the table, which makes the scene feel lively', 'a red umbrella and some plants in the background', 'bright colours that make the place look comfortable'] },
      { label: 'Cảm xúc', prefix: 'Overall, they look', b1: ['happy and relaxed', 'friendly and comfortable', 'excited'], b2: ['happy and relaxed, so it seems like they are enjoying the moment', 'comfortable with each other, which suggests they are close friends', 'cheerful because the atmosphere looks warm and friendly'] }
    ]
  },
  '2-1': {
    title: 'Dạng bài suy đoán nội dung nói chuyện',
    target: 'Mục tiêu: 3-5 câu, khoảng 40-45 giây.',
    fields: [
      { label: 'Trả lời trực tiếp', prefix: 'I think they are talking about', b1: ['their food', 'their weekend plans', 'something funny'], b2: ['their meal and what they want to do later', 'their weekend plans or a funny story', 'something enjoyable that happened recently'] },
      { label: 'Lý do 1', prefix: 'I say this because', b1: ['they are smiling', 'they look relaxed', 'they are sitting together'], b2: ['they are smiling and looking at each other', 'their body language looks very relaxed', 'they seem comfortable with each other'] },
      { label: 'Lý do 2', prefix: 'Also, I can see', b1: ['food on the table', 'drinks in front of them', 'a friendly atmosphere'], b2: ['food and drinks on the table, so the topic may be casual', 'a friendly atmosphere around them', 'people leaning forward as if they are interested in the conversation'] },
      { label: 'Suy đoán thêm', prefix: 'Maybe they are', b1: ['celebrating something', 'planning another meeting', 'sharing news'], b2: ['celebrating something special together', 'planning what to do after lunch', 'sharing personal news or telling jokes'] },
      { label: 'Kết ý', prefix: 'Overall, the conversation seems', b1: ['friendly and relaxed', 'fun and positive', 'casual'], b2: ['friendly and relaxed rather than serious', 'positive because everyone looks comfortable', 'casual, like a normal conversation between friends'] }
    ]
  },
  '2-2': {
    title: 'Dạng bài ý kiến cá nhân',
    target: 'Mục tiêu: 4-5 câu, khoảng 40-45 giây.',
    fields: [
      { label: 'Trả lại chính', prefix: 'Yes, I like eating with friends because', b1: ['it is fun', 'I can talk with them', 'it helps me relax'], b2: ['it makes the meal more enjoyable', 'we can talk and share stories', 'it helps me relax after a busy day'] },
      { label: 'Chi tiết', prefix: 'When we eat together, we can', b1: ['laugh a lot', 'share food', 'talk about our day'], b2: ['laugh together and share our problems', 'try different dishes and enjoy the atmosphere', 'talk about our day and feel closer'] },
      { label: 'Ví dụ cá nhân', prefix: 'For example, I often', b1: ['have dinner with my friends', 'go to a cafe with my classmates', 'eat out at weekends'], b2: ['have dinner with my friends after studying', 'go to a cafe with my classmates at weekends', 'eat out with close friends when we have free time'] },
      { label: 'Cảm xúc', prefix: 'It makes me feel', b1: ['happy', 'comfortable', 'less stressed'], b2: ['happier and less stressed', 'more connected to my friends', 'comfortable because I can be myself'] },
      { label: 'Kết ý', prefix: 'So I think eating with friends is', b1: ['a good way to relax', 'better than eating alone', 'very enjoyable'], b2: ['a good way to relax and build relationships', 'more enjoyable than eating alone', 'important because it creates good memories'] }
    ]
  },
  '3-0': {
    title: 'Dạng bài so sánh 2 ảnh',
    target: 'Mục tiêu: 6-8 câu, khoảng 45 giây.',
    fields: [
      { label: 'Mở đầu chung', prefix: 'These two pictures both show', b1: ['people travelling', 'different ways of travelling', 'people on a journey'], b2: ['people travelling in two different ways', 'two different travel situations', 'different experiences during a journey'] },
      { label: 'ảnh 1 - ai / cái gì', prefix: 'First I can see', b1: ['a man and a woman inside a car', 'two people in a car', 'a couple travelling by car'], b2: ['a man and a woman sitting inside a car', 'two people enjoying a comfortable car journey', 'a couple travelling together in a private car'] },
      { label: 'ảnh 1 - dang làm gì', prefix: 'They are', b1: ['smiling and looking very relaxed', 'talking and enjoying the trip', 'sitting comfortably'], b2: ['smiling and looking very relaxed while they travel', 'talking together and enjoying the journey', 'sitting comfortably, which makes the trip seem pleasant'] },
      { label: 'ảnh 1 - chi tiết', prefix: 'I can also see', b1: ['warm afternoon light through the window', 'sunlight inside the car', 'a bright view outside'], b2: ['warm afternoon light coming through the window', 'soft sunlight inside the car, which creates a calm mood', 'a bright view outside, so the journey looks peaceful'] },
      { label: 'ảnh 2 - ai / cái gì', prefix: 'The second picture shows', b1: ['a group of four people on a train', 'some people travelling by train', 'friends sitting on a train'], b2: ['a group of four people sitting together on a train', 'some passengers travelling by train in a shared space', 'friends enjoying a train journey together'] },
      { label: 'ảnh 2 - dang làm gì', prefix: 'They are', b1: ['talking and drinking coffee together', 'chatting with each other', 'relaxing during the journey'], b2: ['talking and drinking coffee together during the journey', 'having a conversation while they travel by train', 'relaxing together, which makes the journey feel social'] },
      { label: 'ảnh 2 - chi tiết', prefix: 'Around them I notice', b1: ['green fields through the large window', 'large windows and green fields', 'a nice view outside'], b2: ['green fields through the large window', 'large windows with green fields outside, which makes the trip look scenic', 'a beautiful countryside view outside the train'] },
      { label: 'Nhận xét chung', prefix: 'So the two pictures', b1: ['show two very different journeys', 'show different ways to travel', 'are both about travelling but in different places'], b2: ['show two very different journey experiences', 'compare private travel with a more social train journey', 'suggest that travelling can be relaxing in different ways'] }
    ]
  },
  '3-1': {
    title: 'Dạng bài nêu ưu điểm',
    target: 'Mục tiêu: 4-5 câu, khoảng 45 giây.',
    fields: [
      { label: 'Trả lại chính', prefix: 'Travelling by car is convenient because', b1: ['you can choose the route', 'you can stop anywhere', 'it is private'], b2: ['you can choose your own route and schedule', 'you can stop whenever you want', 'it gives you more privacy and flexibility'] },
      { label: 'Ưu điểm 1', prefix: 'Another advantage is that', b1: ['you can carry more things', 'it is good for families', 'you feel comfortable'], b2: ['you can carry more luggage without worrying too much', 'it is very useful for families or small groups', 'you can feel more comfortable during the journey'] },
      { label: 'Ví dụ', prefix: 'For example, if I travel with my family, we can', b1: ['bring food and bags', 'stop for photos', 'listen to music'], b2: ['bring food and bags more easily', 'stop to take photos or rest on the way', 'listen to music and talk freely in the car'] },
      { label: 'Điểm cần cân bằng', prefix: 'However, it can be', b1: ['expensive', 'tiring', 'slow in traffic'], b2: ['expensive if the distance is long', 'tiring for the driver', 'slow and stressful when there is heavy traffic'] },
      { label: 'Kết ý', prefix: 'Overall, I think travelling by car is', b1: ['comfortable and flexible', 'good for short trips', 'useful for many people'], b2: ['comfortable and flexible, especially for family trips', 'a good choice for short or medium journeys', 'useful when people want more freedom'] }
    ]
  },
  '3-2': {
    title: 'Dạng bài nêu số thích',
    target: 'Mục tiêu: 4-5 câu, khoảng 45 giây.',
    fields: [
      { label: 'Chọn ý', prefix: 'I prefer travelling', b1: ['with other people', 'with my friends', 'with my family'], b2: ['with other people rather than alone', 'with my close friends', 'with my family because it feels safer'] },
      { label: 'Lý do 1', prefix: 'The main reason is that', b1: ['it is more fun', 'I feel safer', 'we can talk together'], b2: ['the journey becomes more fun and memorable', 'I feel safer when someone is with me', 'we can talk and help each other during the trip'] },
      { label: 'Lý do 2', prefix: 'Also, we can', b1: ['share costs', 'take photos', 'help each other'], b2: ['share the costs of transport and food', 'take photos and enjoy the experience together', 'help each other if there is a problem'] },
      { label: 'Ví dụ cá nhân', prefix: 'For example, last time I travelled with friends, we', b1: ['had a lot of fun', 'talked all the way', 'shared many memories'], b2: ['had a lot of fun and took many photos', 'talked all the way, so the trip felt shorter', 'created many good memories together'] },
      { label: 'Kết ý', prefix: 'That is why I think travelling with others is', b1: ['better for me', 'more enjoyable', 'a good choice'], b2: ['better for me because I enjoy company', 'more enjoyable and less stressful', 'a good choice for most journeys'] }
    ]
  },
  '4-0': {
    title: 'Dạng bài trả lời chủ đề',
    target: 'Mục tiêu: 5-7 ý, khoảng 2 phút.',
    fields: [
      { label: 'Mở ý', prefix: 'I would like to talk about', b1: ['receiving a gift', 'a special gift I got', 'a present from my friend'], b2: ['a memorable gift I received', 'a gift that was meaningful to me', 'an occasion when someone gave me a thoughtful present'] },
      { label: 'Chi tiết', prefix: 'It was', b1: ['a book from my friend', 'a small present on my birthday', 'something simple but useful'], b2: ['a book from my friend on my birthday', 'a small but thoughtful present', 'something simple, but it matched my interests very well'] },
      { label: 'Lý do', prefix: 'I liked it because', b1: ['it was useful', 'it made me happy', 'my friend remembered me'], b2: ['it showed that my friend understood me', 'it was both useful and personal', 'it reminded me of our friendship'] },
      { label: 'Ý kiến', prefix: 'In my opinion, gifts should be', b1: ['meaningful', 'useful', 'given with care'], b2: ['meaningful rather than expensive', 'chosen carefully for the person who receives them', 'a way to show care and attention'] },
      { label: 'Kết bài', prefix: 'Overall, I think', b1: ['a good gift can make people feel loved', 'small gifts can be very special', 'the meaning is more important than the price'], b2: ['a good gift can make people feel appreciated', 'even a small gift can become special if it has meaning', 'the thought behind a gift matters more than its price'] }
    ]
  }
} as const;

function SpeakingDraftPanel({ part, question, questionIndex, level, text, onClose, onInsert, onLevelChange, onTextChange }: { part: 2 | 3 | 4; question: string; questionIndex: number; level: DraftLevel; text: string; onClose: () => void; onInsert: (text: string) => void; onLevelChange: (level: DraftLevel) => void; onTextChange: (text: string) => void }) {
  const template = getSpeakingDraftTemplate(part, questionIndex, question);
  const [choices, setChoices] = useState<Record<number, string>>(() => Object.fromEntries(template.fields.map((field, index) => [index, field[level.toLowerCase() as Lowercase<DraftLevel>][0]])));
  const selectedText = buildSpeakingDraft(template.fields, choices, level);
  const notes = text
    .split(/[.\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

  function updateChoice(index: number, value: string) {
    setChoices((current) => ({ ...current, [index]: value }));
  }

  function changeLevel(nextLevel: DraftLevel) {
    onLevelChange(nextLevel);
    setChoices(Object.fromEntries(template.fields.map((field, index) => [index, field[nextLevel.toLowerCase() as Lowercase<DraftLevel>][0]])));
  }

  useEffect(() => {
    setChoices(Object.fromEntries(template.fields.map((field, index) => [index, field[level.toLowerCase() as Lowercase<DraftLevel>][0]])));
  }, [level, part, question, questionIndex, template]);

  return (
    <aside className="mock-speaking-draft-panel fixed bottom-20 right-3 top-[86px] z-40 flex w-[min(760px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border border-brand-100 bg-white shadow-2xl shadow-slate-900/18">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-brand-100 px-4">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-[#2b075c]" />
          <h2 className="text-base font-extrabold text-[#2b075c]">Nháp</h2>
        </div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-sky-100 hover:text-slate-700" aria-label="Đóng nháp">
          <X size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-brand-100 p-4">
          <textarea
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            className="min-h-[118px] w-full resize-y rounded-xl border border-brand-100 bg-sky-50 p-3 text-sm leading-6 text-navy outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            placeholder="Gõ ý tưởng của bạn ở đây..."
          />
          {notes.length > 0 && (
            <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50 p-3">
              <p className="mb-2 text-xs font-extrabold uppercase text-[#2b075c]">Gợi ý nhìn khi nói</p>
              <div className="flex flex-wrap gap-2">
                {notes.map((note, index) => (
                  <span key={`${note}-${index}`} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-soft">{note}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 bg-[#f7f4fb] p-4">
          <div className="rounded-xl border border-violet-100 bg-white p-3 text-sm font-semibold text-slate-700">
            <span className="mr-2 font-extrabold text-[#2b075c]">Câu hiện tại:</span>
            {question}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-extrabold uppercase text-[#2b075c]"><Sparkles size={16} /> {template.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">{template.target}</p>
            </div>
            <div className="grid grid-cols-2 rounded-xl border border-brand-100 bg-white p-1">
              {(['B1', 'B2'] as DraftLevel[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => changeLevel(item)}
                  className={`h-9 rounded-lg px-4 text-sm font-extrabold ${level === item ? 'bg-[#2b075c] text-white' : 'text-slate-600 hover:bg-sky-50'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {template.fields.map((field, index) => {
              const options = field[level.toLowerCase() as Lowercase<DraftLevel>];
              return (
                <label key={field.label} className="block rounded-xl border border-brand-100 bg-white p-3 shadow-soft">
                  <span className="mb-2 block text-sm font-extrabold text-[#2b075c]">{index + 1}. {field.label}</span>
                  <span className="flex flex-wrap items-center gap-2 text-sm leading-7 text-navy">
                    <span>{field.prefix}</span>
                    <select
                      value={choices[index] ?? options[0]}
                      onChange={(event) => updateChoice(index, event.target.value)}
                      className="min-h-9 max-w-full rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-navy outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    >
                      {options.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <span>.</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-950">
            <p className="mb-2 text-xs font-extrabold uppercase text-emerald-700">Đoạn số chèn</p>
            {selectedText}
          </div>
        </div>
      </div>

      <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-brand-100 bg-white p-3">
        <button type="button" onClick={() => onTextChange('')} className="h-11 rounded-xl border border-brand-100 text-sm font-extrabold text-slate-700 hover:bg-sky-50">
          Xóa nháp
        </button>
        <button type="button" onClick={() => onInsert(selectedText)} className="h-11 rounded-xl bg-[#2b075c] text-sm font-extrabold text-white hover:opacity-95">
          Chèn vào nháp
        </button>
      </footer>
    </aside>
  );
}

function buildSpeakingDraft(fields: readonly SpeakingDraftField[], choices: Record<number, string>, level: DraftLevel) {
  return fields
    .map((field, index) => {
      const options = field[level.toLowerCase() as Lowercase<DraftLevel>];
      return `${field.prefix} ${choices[index] ?? options[0]}.`;
    })
    .join(' ');
}

function getSpeakingDraftTemplate(part: 2 | 3 | 4, questionIndex: number, question: string) {
  const normalizedQuestion = question.toLowerCase();

  if (part === 2) {
    if (/describe|picture|photo/.test(normalizedQuestion)) return speakingDraftTemplates['2-0'];
    if (/talking about|talk about|people.*talk|what.*talk/.test(normalizedQuestion)) return speakingDraftTemplates['2-1'];
    if (/do you like|why or why not|your opinion|would you like/.test(normalizedQuestion)) return speakingDraftTemplates['2-2'];
  }

  if (part === 3) {
    if (/compare|similar|different|pictures/.test(normalizedQuestion)) return speakingDraftTemplates['3-0'];
    if (/advantage|benefit|good thing|travelling by car|traveling by car/.test(normalizedQuestion)) return speakingDraftTemplates['3-1'];
    if (/prefer|alone|with other people|rather/.test(normalizedQuestion)) return speakingDraftTemplates['3-2'];
  }

  return speakingDraftTemplates[`${part}-${questionIndex}`] ?? speakingDraftTemplates[`${part}-0`];
}

const sideActionStyle = {
  height: 38,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  borderRadius: 999,
  border: '1px solid #0f477e',
  backgroundColor: '#ffffff',
  color: '#0f477e',
  padding: '0 16px',
  fontSize: 15,
  fontWeight: 700,
  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.12)'
} as const;

const speakingSideActionsStyle = {
  position: 'fixed',
  left: 'max(72px, calc((100vw - 1400px) / 2 + 24px))',
  bottom: 62,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 12
} as const;

function AutoScoredRecordingNote() {
  return (
    <div style={{ marginTop: 24, borderRadius: 12, border: '1px solid #dce3ee', backgroundColor: '#f8fafc', padding: '14px 16px', color: '#64748b', fontSize: 15, lineHeight: '22px', fontWeight: 700 }}>
      Bài nói sẽ được ghi âm và tự chấm sau khi bạn hoàn thành phần Speaking. Hệ thống sẽ đọc câu hỏi trước tiếng tít; sau tiếng tít, hãy trả lời đầy đủ bằng câu hoàn chỉnh, lý do và ví dụ.
    </div>
  );
}

function SpeakingSampleAnswer({ text }: { text?: string }) {
  return (
    <div style={{ marginTop: 18, borderRadius: 14, border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', padding: '16px 18px', color: '#14532d', fontSize: 16, lineHeight: '26px' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 900, letterSpacing: 0.4, textTransform: 'uppercase', color: '#047857' }}>Đáp án mẫu</p>
      <p style={{ margin: 0, fontWeight: 600 }}>{text || 'Chưa có đáp án mẫu cho câu này.'}</p>
    </div>
  );
}

function TranscriptBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label style={{ display: 'block', marginTop: 28 }}>
      <span style={{ display: 'block', color: '#475569', fontSize: 14, fontWeight: 800, marginBottom: 8 }}>
        Transcript để AI chấm
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Sau khi nói xong, nhập lại ý chính hoặc transcript câu trả lời của bạn tại đây..."
        style={{
          width: '100%',
          minHeight: 118,
          border: '1px solid #cbd5e1',
          borderRadius: 12,
          padding: 14,
          color: '#0f172a',
          fontSize: 15,
          lineHeight: '24px',
          outline: 'none',
          resize: 'vertical',
          backgroundColor: '#f8fafc'
        }}
      />
    </label>
  );
}

function RecordingWaveform({ level }: { level: number }) {
  const bars = Array.from({ length: 22 });
  const normalizedLevel = Math.max(0, Math.min(level, 1));

  return (
    <div
      style={{
        height: 34,
        marginTop: 28,
        display: 'flex',
        alignItems: 'end',
        justifyContent: 'center',
        gap: 4
      }}
      aria-label="Microphone level"
    >
      {bars.map((_, index) => {
        const wave = Math.sin(index * 1.45) * 0.5 + 0.5;
        const height = 4 + Math.round((normalizedLevel * 26 * (0.4 + wave)) / 1.4);
        return (
          <span
            key={index}
            style={{
              width: 4,
              height,
              borderRadius: 999,
              backgroundColor: '#ef4444',
              opacity: normalizedLevel > 0.03 ? 1 : 0.55,
              transition: 'height 80ms ease-out, opacity 120ms ease-out'
            }}
          />
        );
      })}
    </div>
  );
}

function MicTestPanel({ compact = false }: { compact?: boolean }) {
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState('Bấm để kiểm tra mic trước khi thi Speaking.');
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  function stopTest() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setTesting(false);
    setLevel(0);
    setStatus('Đã dừng kiểm tra mic.');
  }

  async function startTest() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Trình duyệt này chưa hỗ trợ kiểm tra microphone.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioContext = AudioContextClass ? new AudioContextClass() : null;
      const analyser = audioContext?.createAnalyser();

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      setTesting(true);
      setStatus('Mic đang hoạt động. Hãy nói thử và nhìn vạch sóng.');

      if (!audioContext || !analyser) return;

      analyser.fftSize = 128;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setLevel(Math.min(1, average / 120));
        animationFrameRef.current = window.requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      setTesting(false);
      setLevel(0);
      setStatus('Không mở được microphone. Hãy cấp quyền mic trong trình duyệt rồi thử lại.');
    }
  }

  useEffect(() => stopTest, []);

  return (
    <div className={`rounded-2xl border border-brand-100 bg-white ${compact ? 'p-3' : 'p-5'} shadow-[0_1px_3px_rgba(15,23,42,0.08)]`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`${compact ? 'text-sm' : 'text-xl'} font-extrabold text-navy`}>Kiểm tra Microphone</p>
          <p className={`${compact ? 'mt-1 text-xs' : 'mt-2 text-sm'} font-semibold leading-5 text-slate-600`}>{status}</p>
        </div>
        <span className={`grid ${compact ? 'h-9 w-9' : 'h-11 w-11'} shrink-0 place-items-center rounded-xl bg-[#f0eef7] text-[#2b075c]`}>
          <Mic size={compact ? 18 : 22} />
        </span>
      </div>

      <div className={`${compact ? 'mt-3' : 'mt-5'} rounded-xl border border-slate-200 bg-sky-50 px-3 py-3`}>
        <RecordingWaveform level={level} />
      </div>

      <button
        type="button"
        onClick={testing ? stopTest : startTest}
        className={`${compact ? 'mt-3 h-10 text-sm' : 'mt-5 h-12 text-lg'} inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[#f92918] bg-white px-5 font-bold text-[#e41d10] transition hover:bg-red-50`}
      >
        <Mic size={compact ? 18 : 22} />
        {testing ? 'Dừng kiểm tra mic' : 'Kiểm tra microphone'}
      </button>
    </div>
  );
}

function SpeakingComplete({ error, loading, onExit, onRetry, onScore, result }: {
  error: string;
  loading: boolean;
  onExit: () => void;
  onRetry: () => void;
  onScore: () => void;
  result: AiSpeakingScore | null;
}) {
  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#f1f1f1] px-6 py-20">
      <section className="mx-auto max-w-[840px] rounded-2xl bg-white px-8 py-10 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#f0eef5] text-[#2b075c]">
          <Mic size={30} />
        </div>
        <div className="text-center">
          <h2 className="mt-6 text-[26px] font-extrabold leading-8 text-navy">Speaking AI Result</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">Lingo scores from your recorded speaking answers.</p>
        </div>
        {!result && !loading && !error && <p className="mt-8 text-center text-sm font-semibold text-slate-500">Preparing your Speaking score...</p>}
        {loading && (
          <>
            <div className="mx-auto mt-8 h-2 w-full max-w-[360px] overflow-hidden rounded-full bg-sky-100">
              <div className="h-full w-2/3 rounded-full bg-[#2b075c]" />
            </div>
            <p className="mt-5 text-center text-sm font-semibold text-slate-500">Analyzing fluency, grammar and response quality...</p>
            <p className="mt-2 text-center text-sm font-extrabold text-red-600">Đang chấm bài, vui lòng không thao tác gì cho đến khi có kết quả.</p>
          </>
        )}
        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {result && (
          <div className="mt-8 space-y-5">
            <div className="rounded-xl border border-brand-100 bg-sky-50 p-5">
              <p className="text-sm font-bold uppercase text-slate-600">Overall</p>
              <div className="mt-2 flex flex-wrap items-end gap-4">
                <span className="text-4xl font-black text-[#2b075c]">{result.overallScore}/50</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-extrabold text-emerald-700">{result.cefrLevel}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-700">{result.summary}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {result.criteria.map((item) => (
                <div key={item.name} className="rounded-xl border border-brand-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-extrabold text-navy">{item.name}</h3>
                    <span className="font-black text-[#2b075c]">{item.score}/10</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.feedback}</p>
                </div>
              ))}
            </div>
            {result.parts.length > 0 && (
              <div className="rounded-xl border border-brand-100 p-5">
                <p className="text-sm font-extrabold uppercase text-slate-600">Part feedback</p>
                <div className="mt-3 grid gap-3">
                  {result.parts.map((part) => (
                    <div key={part.title} className="rounded-lg bg-sky-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-extrabold text-navy">{part.title}</h3>
                        <span className="font-black text-[#2b075c]">{part.score}/50</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{part.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-extrabold uppercase text-emerald-700">Bài chỉnh lại</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-emerald-950">
                {result.improvedAnswer || 'Chưa có bài chỉnh lại cho phần này.'}
              </p>
            </div>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onRetry} className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-extrabold text-slate-700 hover:bg-sky-50">Practice again</button>
          <button type="button" onClick={onExit} className="h-11 rounded-xl bg-[#071426] px-5 text-sm font-extrabold text-white hover:bg-slate-800">Exit</button>
        </div>
      </section>
    </main>
  );
}

function SpeakingFooter({ canPrevious, canNext = true, showNext, nextLabel, onOpenQuestionList, onPrevious, onNext }: { canPrevious: boolean; canNext?: boolean; showNext: boolean; nextLabel: string; onOpenQuestionList?: () => void; onPrevious: () => void; onNext: () => void }) {
  return (
    <footer
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        borderTop: '3px solid #2b075c',
        backgroundColor: '#ffffff',
        padding: '12px 32px'
      }}
    >
      <div
        style={{
          width: 'min(1240px, 100%)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <UtilityIcon icon={<List size={21} />} label="Danh sách câu hỏi" onClick={onOpenQuestionList} />
          <UtilityIcon icon={<Info size={21} />} />
          <UtilityIcon icon={<Move size={20} />} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <UtilityIcon icon={<LogOut size={21} />} />
          {canPrevious && (
            <button
              type="button"
              onClick={onPrevious}
              style={{
                height: 50,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                borderRadius: 12,
                border: '1px solid #020817',
                backgroundColor: '#ffffff',
                padding: '0 24px',
                color: '#020817',
                fontSize: 18,
                fontWeight: 500
              }}
            >
              <ArrowLeft size={22} />
              Previous
            </button>
          )}
          {showNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={!canNext}
              style={{
                height: 50,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                borderRadius: 12,
                border: 0,
                backgroundColor: canNext ? '#2b075c' : '#dedbe5',
                padding: '0 32px',
                color: '#ffffff',
                fontSize: 18,
                fontWeight: 800,
                cursor: canNext ? 'pointer' : 'not-allowed'
              }}
            >
              {nextLabel}
              <ArrowRight size={22} />
            </button>
          )}
        </div>

        <div />
      </div>
    </footer>
  );
}

function UtilityIcon({ icon, label, onClick }: { icon: ReactNode; label?: string; onClick?: () => void }) {
  const handleClick = onClick ?? (label === 'Danh sách câu hỏi'
    ? () => window.dispatchEvent(new Event('aptis-open-question-list'))
    : undefined);

  return (
    <button type="button" aria-label={label} title={label} onClick={handleClick} className="grid h-11 w-11 place-items-center rounded-full border border-[#d8e1ee] bg-white text-[#60708a] hover:bg-sky-50">
      {icon}
    </button>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-base font-medium text-[#7a8393]">{label}</p>
      <p className="mt-2 text-lg font-extrabold text-black">{value}</p>
    </div>
  );
}

