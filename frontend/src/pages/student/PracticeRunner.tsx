import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Fragment } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, CalendarPlus, CheckSquare, ChevronDown, Clock, Eraser, FileSearch, HelpCircle, Highlighter, LayoutDashboard, ListChecks, LogOut, MessageCircle, Mic, Play, RotateCcw, Search, Settings, Star, TrendingUp, Volume2 } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useAuthStore } from '../../store/authStore';
import type { Answer, Question, Submission, Test } from '../../types';
import { repairMojibake } from '../../utils/textRepair';

const examLinks = [
  { to: '/app', label: 'Trang ch\u1ee7', icon: LayoutDashboard, active: false },
  { to: '/app/tests', label: 'Luy\u1ec7n t\u1eadp', icon: BookOpen, active: true },
  { to: '/app/exams', label: '\u0110\u1ec1 thi', icon: ListChecks, active: false },
  { to: '/app/mock-tests', label: 'Thi th\u1eed', icon: FileSearch, active: false },
  { to: '/app/predictions', label: 'D\u1ef1 \u0111o\u00e1n \u0111\u1ec1', icon: FileSearch, active: false },
  { to: '/app/renewal', label: 'Gia h\u1ea1n', icon: CalendarPlus, active: false },
  { to: '/app/settings', label: 'C\u00e0i \u0111\u1eb7t', icon: Settings, active: false }
];

function localSpeakingImage(part: 'part2' | 'part3', fileName: string) {
  return `/images/speaking/${part}/${fileName}`;
}

function localSpeakingPart3Image(questionIndex: number, side: 1 | 2) {
  return localSpeakingImage('part3', `de${String(questionIndex + 1).padStart(2, '0')}_${side}.png`);
}

function normalizeLocalSpeakingPath(path: string) {
  const part3Numbered = path.match(/^speaking\/part3\/(\d+)_(1|2)\.png$/i);
  if (part3Numbered) {
    return `speaking/part3/de${part3Numbered[1].padStart(2, '0')}_${part3Numbered[2]}.png`;
  }
  return path;
}

function resolveLocalSpeakingImage(rawValue: unknown, fallbackPath: string) {
  const raw = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!raw) return fallbackPath;

  const speakingPath = raw.match(/(?:^|\/)(speaking\/part[23]\/[^?#]+)/i)?.[1];
  if (speakingPath) return `/images/${normalizeLocalSpeakingPath(speakingPath)}`;

  const localSpeakingPath = raw.match(/(?:^|\/)images\/(speaking\/part[23]\/[^?#]+)/i)?.[1];
  if (localSpeakingPath) return `/images/${normalizeLocalSpeakingPath(localSpeakingPath)}`;

  if (/^https?:\/\//i.test(raw)) return fallbackPath;

  return raw;
}

function pickTextValue(source: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return fallback;
}

function getReturnTarget(state: unknown) {
  if (!state || typeof state !== 'object' || !('returnTo' in state)) return null;
  const target = (state as { returnTo?: unknown }).returnTo;
  if (typeof target !== 'string') return null;
  return target.startsWith('/app/') ? target : null;
}

export function PracticeRunner() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isExamSetMode = location.pathname.startsWith('/app/exams/');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [listeningReviewOpen, setListeningReviewOpen] = useState(false);
  const [listeningReviewGroup, setListeningReviewGroup] = useState<ListeningReviewGroup>('1-13');
  const [readingReviewOpen, setReadingReviewOpen] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const { data: test } = useApi<Test>(() => unwrap(api.get(`/tests/${id}`)), [id]);
  const { data: questions, loading } = useApi<Question[]>(() => unwrap(api.get(`/questions?testId=${id}`)), [id]);
  const activeQuestion = questions?.[currentIndex];
  const templateData = activeQuestion ? parseTemplate(activeQuestion.content) : null;
  const totalQuestions = questions?.length ?? 0;
  const fallbackTemplateData = activeQuestion
    ? buildListeningPart2FallbackTemplate(activeQuestion, test, totalQuestions)
      ?? buildListeningPart3FallbackTemplate(activeQuestion, test, totalQuestions)
      ?? buildListeningPart4FallbackTemplate(activeQuestion, test, totalQuestions)
    : null;
  const renderTemplateData = templateData ?? fallbackTemplateData;
  const mergedTemplateData = useMemo(
    () => mergeSameSpeakingTemplateData(renderTemplateData, questions ?? [], test),
    [renderTemplateData, questions, test]
  );
  const classicTemplate = isClassicAptisTemplate(mergedTemplateData);
  const selfCheckingTemplate = isSelfCheckingTemplate(mergedTemplateData);
  const fullListeningExam = useMemo(() => isFullListeningExam(test, questions ?? []), [test, questions]);
  const listeningReview = useMemo(() => buildListeningExamReview(test, questions ?? [], answers), [test, questions, answers]);
  const fullReadingExam = useMemo(() => isExamSetMode && isFullReadingExam(test, questions ?? []), [isExamSetMode, test, questions]);
  const readingReview = useMemo(() => buildReadingExamReview(test, questions ?? [], answers), [test, questions, answers]);
  const canCheckCurrent = !fullReadingExam || currentIndex >= totalQuestions - 1;
  const showClassicCheckButton = (!fullListeningExam && !fullReadingExam) || currentIndex >= totalQuestions - 1;
  const activeChecked = activeQuestion ? checkedAnswers[activeQuestion.id] : undefined;
  const sharedAudioUrl = useMemo(() => getSharedAudioUrl(questions ?? []), [questions]);
  const audioUrl = activeQuestion ? getQuestionAudioUrl(activeQuestion, mergedTemplateData, sharedAudioUrl) : '';
  const scriptText = activeQuestion ? getQuestionScriptText(activeQuestion, mergedTemplateData) : '';
  const topicTitle = cleanUserFacingTopic(activeQuestion?.topic || test?.title || 'Luyện thi Aptis');
  const progress = useMemo(() => totalQuestions ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0, [currentIndex, totalQuestions]);
  const requestedQuestionId = Number(searchParams.get('questionId'));
  const requestedClubIndex = Number(searchParams.get('clubIndex'));
  const activeSavedAnswer = useMemo<Record<string, string>>(() => {
    if (!activeQuestion) return {};
    try {
      return answers[activeQuestion.id] ? JSON.parse(answers[activeQuestion.id]) : {};
    } catch {
      return {};
    }
  }, [activeQuestion, answers]);
  const isWritingClubQuestion = mergedTemplateData?.template === 'WRITING_CLUB_COLLECTION';
  const isSpeakingPart1Question = mergedTemplateData?.template === 'SPEAKING_PART1';
  const isSpeakingPart2Question = mergedTemplateData?.template === 'SPEAKING_PART2';
  const isSpeakingPart3Question = mergedTemplateData?.template === 'SPEAKING_PART3';
  const isSpeakingPart4Question = mergedTemplateData?.template === 'SPEAKING_PART4';
  const writingPartIndex = Math.min(3, Math.max(0, Number(activeSavedAnswer.writingPartIndex ?? 0)));
  const speakingPart1Mode = activeSavedAnswer.speakingPart1Mode ?? 'intro';
  const speakingPart1Index = Math.max(0, Number(activeSavedAnswer.speakingPart1Index ?? 0));
  const speakingPart1Total = Array.isArray(mergedTemplateData?.questions) ? mergedTemplateData.questions.length : 0;
  const speakingPart2Mode = activeSavedAnswer.speakingPart2Mode ?? 'intro';
  const speakingPart2Index = Math.max(0, Number(activeSavedAnswer.speakingPart2Index ?? 0));
  const speakingPart2Total = Array.isArray(mergedTemplateData?.questions) ? mergedTemplateData.questions.length : 0;
  const speakingPart3Mode = activeSavedAnswer.speakingPart3Mode ?? 'intro';
  const speakingPart3Index = Math.max(0, Number(activeSavedAnswer.speakingPart3Index ?? 0));
  const speakingPart3Total = Array.isArray(mergedTemplateData?.questions) ? mergedTemplateData.questions.length : 0;
  const speakingPart4Mode = activeSavedAnswer.speakingPart4Mode ?? 'intro';
  const speakingPart4Index = Math.max(0, Number(activeSavedAnswer.speakingPart4Index ?? 0));
  const speakingPart4Total = Array.isArray(mergedTemplateData?.questions) ? mergedTemplateData.questions.length : 0;
  const canGoBack = isWritingClubQuestion
    ? writingPartIndex > 0
    : isSpeakingPart1Question && speakingPart1Mode === 'practice'
      ? speakingPart1Index > 0
      : isSpeakingPart2Question && speakingPart2Mode === 'practice'
        ? speakingPart2Index > 0
        : isSpeakingPart3Question && speakingPart3Mode === 'practice'
          ? speakingPart3Index > 0
          : isSpeakingPart4Question && speakingPart4Mode === 'practice'
            ? true
            : isSpeakingPart4Question
              ? speakingPart4Mode !== 'intro'
          : currentIndex > 0;
  const canGoNext = isWritingClubQuestion
    ? writingPartIndex < 3
    : isSpeakingPart1Question && speakingPart1Mode === 'practice'
      ? speakingPart1Index < speakingPart1Total - 1
      : isSpeakingPart2Question && speakingPart2Mode === 'practice'
        ? speakingPart2Index < speakingPart2Total - 1
        : isSpeakingPart3Question && speakingPart3Mode === 'practice'
          ? speakingPart3Index < speakingPart3Total - 1
          : isSpeakingPart4Question && speakingPart4Mode === 'practice'
            ? speakingPart4Index < speakingPart4Total - 1
            : isSpeakingPart4Question
              ? false
          : currentIndex < totalQuestions - 1;
  const templateOwnsHeader = isSpeakingPart1Question || isSpeakingPart2Question || isSpeakingPart3Question || isSpeakingPart4Question;
  const returnTarget = getReturnTarget(location.state);
  const isMockTestRunner = isExamSetMode || test?.mode === 'EXAM';
  const exitTarget = returnTarget ?? (isMockTestRunner ? '/app/mock-tests' : '/app/tests/parts');
  const exitLabel = isMockTestRunner ? 'Thoát về thi thử' : 'Thoát về luyện tập theo part';

  useEffect(() => {
    if (!questions?.length || !requestedQuestionId) return;
    const index = questions.findIndex((question) => question.id === requestedQuestionId);
    if (index >= 0) setCurrentIndex(index);
  }, [questions, requestedQuestionId]);

  useEffect(() => {
    if (!requestedQuestionId || !activeQuestion || activeQuestion.id !== requestedQuestionId) return;
    if (!mergedTemplateData?.template?.startsWith('SPEAKING_PART')) return;

    const targetIndex = findSpeakingQuestionIndexBySourceId(mergedTemplateData, requestedQuestionId);
    const state = speakingPracticeStateForTemplate(mergedTemplateData.template, targetIndex);
    if (!state) return;

    setAnswers((current) => {
      let savedAnswer: Record<string, string> = {};
      try {
        savedAnswer = current[activeQuestion.id] ? JSON.parse(current[activeQuestion.id]) : {};
      } catch {
        savedAnswer = {};
      }

      if (Object.entries(state).every(([key, value]) => savedAnswer[key] === value)) {
        return current;
      }

      return {
        ...current,
        [activeQuestion.id]: JSON.stringify({ ...savedAnswer, ...state })
      };
    });
  }, [activeQuestion, mergedTemplateData, requestedQuestionId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      testId: Number(id),
      answers: (questions ?? []).map((q) => ({
        questionId: q.id,
        answerId: q.answers.length ? Number(answers[q.id]) : null,
        textAnswer: q.answers.length ? null : answers[q.id] ?? ''
      }))
    };
    const result = await unwrap<Submission>(api.post('/submissions', payload));
    toast.success(`Đã nộp bài: ${result.totalScore}/${result.maxScore}`);
    navigate('/app/history');
  }

  function goNext() {
    if (isWritingClubQuestion) {
      setWritingPartIndex(writingPartIndex + 1);
      return;
    }
    if (isSpeakingPart1Question && speakingPart1Mode === 'practice') {
      setSpeakingPart1Index(speakingPart1Index + 1);
      return;
    }
    if (isSpeakingPart2Question && speakingPart2Mode === 'practice') {
      setSpeakingPart2Index(speakingPart2Index + 1);
      return;
    }
    if (isSpeakingPart3Question && speakingPart3Mode === 'practice') {
      setSpeakingPart3Index(speakingPart3Index + 1);
      return;
    }
    if (isSpeakingPart4Question && speakingPart4Mode === 'practice') {
      setSpeakingPart4Index(speakingPart4Index + 1);
      return;
    }
    if (isSpeakingPart4Question) return;
    if (!totalQuestions || currentIndex >= totalQuestions - 1) return;
    setCurrentIndex((index) => index + 1);
  }

  function goBack() {
    if (isWritingClubQuestion) {
      setWritingPartIndex(writingPartIndex - 1);
      return;
    }
    if (isSpeakingPart1Question && speakingPart1Mode === 'practice') {
      setSpeakingPart1Index(speakingPart1Index - 1);
      return;
    }
    if (isSpeakingPart2Question && speakingPart2Mode === 'practice') {
      setSpeakingPart2Index(speakingPart2Index - 1);
      return;
    }
    if (isSpeakingPart3Question && speakingPart3Mode === 'practice') {
      setSpeakingPart3Index(speakingPart3Index - 1);
      return;
    }
    if (isSpeakingPart4Question && speakingPart4Mode === 'practice' && speakingPart4Index > 0) {
      setSpeakingPart4Index(speakingPart4Index - 1);
      return;
    }
    if (isSpeakingPart4Question && speakingPart4Mode !== 'intro') {
      if (!activeQuestion) return;
      setAnswers((current) => {
        let savedAnswer: Record<string, string> = {};
        try {
          savedAnswer = current[activeQuestion.id] ? JSON.parse(current[activeQuestion.id]) : {};
        } catch {
          savedAnswer = {};
        }
        return {
          ...current,
          [activeQuestion.id]: JSON.stringify({ ...savedAnswer, speakingPart4Mode: 'intro', speakingPart4OpenAnswer: '' })
        };
      });
      return;
    }
    if (currentIndex === 0) return;
    setCurrentIndex((index) => index - 1);
  }

  function setWritingPartIndex(nextPart: number) {
    if (!activeQuestion) return;
    const next = Math.min(3, Math.max(0, nextPart));
    setAnswers((current) => {
      let savedAnswer: Record<string, string> = {};
      try {
        savedAnswer = current[activeQuestion.id] ? JSON.parse(current[activeQuestion.id]) : {};
      } catch {
        savedAnswer = {};
      }
      return {
        ...current,
        [activeQuestion.id]: JSON.stringify({ ...savedAnswer, writingPartIndex: String(next) })
      };
    });
  }

  function setSpeakingPart1Index(nextQuestion: number) {
    if (!activeQuestion || !speakingPart1Total) return;
    const next = Math.min(speakingPart1Total - 1, Math.max(0, nextQuestion));
    setAnswers((current) => {
      let savedAnswer: Record<string, string> = {};
      try {
        savedAnswer = current[activeQuestion.id] ? JSON.parse(current[activeQuestion.id]) : {};
      } catch {
        savedAnswer = {};
      }
      return {
        ...current,
        [activeQuestion.id]: JSON.stringify({ ...savedAnswer, speakingPart1Mode: 'practice', speakingPart1Index: String(next) })
      };
    });
  }

  function setSpeakingPart2Index(nextQuestion: number) {
    if (!activeQuestion || !speakingPart2Total) return;
    const next = Math.min(speakingPart2Total - 1, Math.max(0, nextQuestion));
    setAnswers((current) => {
      let savedAnswer: Record<string, string> = {};
      try {
        savedAnswer = current[activeQuestion.id] ? JSON.parse(current[activeQuestion.id]) : {};
      } catch {
        savedAnswer = {};
      }
      return {
        ...current,
        [activeQuestion.id]: JSON.stringify({ ...savedAnswer, speakingPart2Mode: 'practice', speakingPart2Index: String(next) })
      };
    });
  }

  function setSpeakingPart3Index(nextQuestion: number) {
    if (!activeQuestion || !speakingPart3Total) return;
    const next = Math.min(speakingPart3Total - 1, Math.max(0, nextQuestion));
    setAnswers((current) => {
      let savedAnswer: Record<string, string> = {};
      try {
        savedAnswer = current[activeQuestion.id] ? JSON.parse(current[activeQuestion.id]) : {};
      } catch {
        savedAnswer = {};
      }
      return {
        ...current,
        [activeQuestion.id]: JSON.stringify({ ...savedAnswer, speakingPart3Mode: 'practice', speakingPart3Index: String(next) })
      };
    });
  }

  function setSpeakingPart4Index(nextQuestion: number) {
    if (!activeQuestion || !speakingPart4Total) return;
    const next = Math.min(speakingPart4Total - 1, Math.max(0, nextQuestion));
    setAnswers((current) => {
      let savedAnswer: Record<string, string> = {};
      try {
        savedAnswer = current[activeQuestion.id] ? JSON.parse(current[activeQuestion.id]) : {};
      } catch {
        savedAnswer = {};
      }
      return {
        ...current,
        [activeQuestion.id]: JSON.stringify({ ...savedAnswer, speakingPart4Mode: 'practice', speakingPart4Index: String(next), speakingPart4ShowSample: 'false' })
      };
    });
  }

  function checkCurrentQuestion() {
    if (!activeQuestion) return;

    if (fullListeningExam) {
      if (currentIndex < totalQuestions - 1) {
        toast.error('Bạn làm tới câu 17 rồi bấm Kiểm tra để xem điểm cả đề thi thử.');
        return;
      }
      const nextChecked = { ...checkedAnswers };
      (questions ?? []).forEach((question) => {
        nextChecked[question.id] = true;
      });
      setCheckedAnswers(nextChecked);
      setListeningReviewGroup('1-13');
      setListeningReviewOpen(true);
      return;
    }

    if (fullReadingExam) {
      if (currentIndex < totalQuestions - 1) {
        toast.error(`Bạn làm tới câu ${totalQuestions} rồi bấm Kiểm tra để xem kết quả cả đề thi thử.`);
        return;
      }
      const nextChecked = { ...checkedAnswers };
      (questions ?? []).forEach((question) => {
        nextChecked[question.id] = true;
      });
      setCheckedAnswers(nextChecked);
      setReadingReviewOpen(true);
      return;
    }

    const value = getCurrentAnswerValueForCheck(mergedTemplateData, answers[activeQuestion.id]);
    if (!value) {
      toast.error('Bạn hãy chọn hoặc nhập câu trả lời trước.');
      return;
    }

    const templateResult = evaluateTemplateAnswer(mergedTemplateData, value);
    if (templateResult !== null) {
      setCheckedAnswers({ ...checkedAnswers, [activeQuestion.id]: templateResult });
      toast[templateResult ? 'success' : 'error'](templateResult ? 'Chính xác!' : 'Chưa đúng, xem lại các lựa chọn.');
      return;
    }

    if (!activeQuestion.answers.length) {
      setCheckedAnswers({ ...checkedAnswers, [activeQuestion.id]: true });
      toast.success('Đã lưu câu trả lời. Câu tự luận cần giáo viên hoặc đáp án mẫu để đối chiếu.');
      return;
    }

    const selectedAnswer = activeQuestion.answers.find((answer) => String(answer.id) === value);
    const isCorrect = Boolean(selectedAnswer?.correct);
    setCheckedAnswers({ ...checkedAnswers, [activeQuestion.id]: isCorrect });
    toast[isCorrect ? 'success' : 'error'](isCorrect ? 'Chính xác!' : 'Chưa đúng, xem lại đáp án đúng.');
  }

  function getCurrentAnswerValueForCheck(data: TemplateData | null, value?: string) {
    if (value) return value;
    if (data?.template === 'READING_SENTENCE_ORDER') {
      const displaySentences = getReadingOrderDisplaySentences(data);
      if (displaySentences.length) return JSON.stringify({ order: displaySentences });
    }
    return value ?? '';
  }

  function resetCurrentQuestion() {
    if (!activeQuestion) return;
    const { [activeQuestion.id]: _oldAnswer, ...nextAnswers } = answers;
    const { [activeQuestion.id]: _oldChecked, ...nextChecked } = checkedAnswers;
    setAnswers(nextAnswers);
    setCheckedAnswers(nextChecked);
  }

  function exitRunner() {
    navigate(exitTarget);
  }

  if (!loading && questions && questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] text-navy">
        <main className="min-h-screen">
          <header className="sticky top-0 z-20 border-b border-brand-100 bg-white">
            <div className="flex h-10 items-center justify-between px-4 sm:px-5">
              <Link to="/" className="text-base font-extrabold text-brand-600 transition hover:text-brand-700">LingoMaster</Link>
              <button type="button" onClick={exitRunner} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-100 bg-white px-3 text-xs font-extrabold text-slate-700 shadow-soft hover:border-brand-200 hover:text-brand-700">
                <LogOut size={15} />Thoát
              </button>
            </div>
          </header>
          <section className="mx-auto flex min-h-[calc(100vh-40px)] max-w-3xl flex-col items-center justify-center px-5 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-brand-600 shadow-soft">
              <FileSearch size={28} />
            </div>
            <h1 className="mt-6 text-3xl font-extrabold tracking-normal text-navy">Bài này chưa có câu hỏi</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
              Đề thi thử <span className="font-extrabold text-brand-600">{repairMojibake(test?.title ?? 'này')}</span> đang trống. Hãy import câu hỏi trong Admin hoặc chọn đề khác để luyện.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => navigate(exitTarget)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-extrabold text-white shadow-soft hover:bg-brand-700">
                <ArrowLeft size={17} />Quay lại
              </button>
              <Link to={isMockTestRunner ? '/app/mock-tests' : '/app/tests/parts'} className="inline-flex h-11 items-center gap-2 rounded-xl border border-brand-100 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-soft hover:border-brand-200 hover:text-brand-700">
                {isMockTestRunner ? 'Thi thử' : 'Luyện tập theo part'}
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (classicTemplate) {
    return (
      <div className="min-h-screen bg-white text-navy">
        <main className="min-h-screen">
          <AppTopbar exitLabel={exitLabel} onExit={exitRunner} />
        <form onSubmit={submit} className="pb-24">
          {loading && <div className="mx-auto max-w-[1460px] p-8">Đang tải câu hỏi...</div>}
          {activeQuestion?.featured && !templateOwnsHeader && <FeaturedQuestionCallout />}
          {activeQuestion && mergedTemplateData && (
            <AptisTemplateRenderer
              data={mergedTemplateData}
              questionId={activeQuestion.id}
              currentNumber={currentIndex + 1}
              totalQuestions={totalQuestions}
              featured={activeQuestion.featured}
              initialClubIndex={Number.isFinite(requestedClubIndex) ? requestedClubIndex : undefined}
              checked={activeChecked}
              value={answers[activeQuestion.id] ?? ''}
              onChange={(value) => setAnswers({ ...answers, [activeQuestion.id]: value })}
            />
          )}
          <RunnerBottomBar
            currentIndex={currentIndex}
            totalQuestions={totalQuestions}
            onBack={goBack}
            onReset={resetCurrentQuestion}
            onCheck={checkCurrentQuestion}
            onNext={goNext}
            showCheck={showClassicCheckButton}
          />
        </form>
        {listeningReviewOpen && (
          <ListeningExamReviewModal
            review={listeningReview}
            activeGroup={listeningReviewGroup}
            onGroupChange={setListeningReviewGroup}
            onClose={() => setListeningReviewOpen(false)}
          />
        )}
        {readingReviewOpen && (
          <ReadingExamReviewModal
            review={readingReview}
            onClose={() => setReadingReviewOpen(false)}
          />
        )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-navy">

      <main className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-brand-100 bg-white">
          <div className="flex h-10 items-center justify-between px-4 sm:px-5">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-base font-extrabold text-brand-600 transition hover:text-brand-700">LingoMaster</Link>
              <div className="hidden h-7 w-px bg-sky-200 sm:block" />
              <div className="hidden items-center gap-1.5 text-sm font-bold text-brand-600 sm:flex"><Clock size={18} />Còn 12:45</div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={exitRunner} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-100 bg-white px-3 text-xs font-extrabold text-slate-700 shadow-soft hover:border-brand-200 hover:text-brand-700">
                <LogOut size={15} />Thoát
              </button>
              <div className="hidden h-8 w-full max-w-[240px] items-center gap-2 rounded-full bg-[#f0f3fd] px-3 text-xs text-slate-600 sm:flex">
                <Search size={16} />
                <span className="hidden sm:inline">Tìm tài liệu...</span>
              </div>
            </div>
          </div>
        </header>

        <form onSubmit={submit}>
          <div className="px-4 pb-16 pt-2 sm:px-5">
            {!templateOwnsHeader && (
            <div className="mb-2 flex flex-col justify-between gap-2 lg:flex-row lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">Đọc hiểu</span>
                  {activeQuestion?.featured && <FeaturedQuestionBadge />}
                </div>
                <h1 className="mt-1 text-xl font-extrabold tracking-normal sm:text-2xl">Câu {currentIndex + 1} / {totalQuestions}</h1>
                {topicTitle && (
                  <p className="mt-0.5 text-xs sm:text-sm">{isExamSetMode ? 'Đề thi thử' : 'Chủ đề'}: <span className="font-extrabold text-brand-600">{topicTitle}</span></p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <span className="h-2 w-8 rounded-full bg-green-700" />
                  <span className="h-2 w-8 rounded-full bg-green-700" />
                  <span className="h-2 w-8 rounded-full bg-brand-600" />
                  <span className="h-2 w-8 rounded-full bg-blue-100" />
                </div>
                <span className="text-sm font-bold">{progress}% hoàn thành</span>
              </div>
            </div>
            )}

            {test?.skillName?.toLowerCase().includes('speaking') && !mergedTemplateData?.template?.startsWith('SPEAKING') && (
              <div className="mb-8 rounded-[18px] border border-red-100 bg-red-50 p-4 shadow-soft">
                <SpeakingRecordButton />
              </div>
            )}

            {totalQuestions > 0 && !classicTemplate && !isWritingClubQuestion && !isSpeakingPart1Question && !isSpeakingPart2Question && !isSpeakingPart3Question && !isSpeakingPart4Question && (
              <QuestionNavigator
                total={totalQuestions}
                currentIndex={currentIndex}
                answeredIds={answers}
                checkedIds={checkedAnswers}
                questions={questions ?? []}
                onSelect={setCurrentIndex}
              />
            )}

            {audioUrl && !mergedTemplateData && (
              <QuestionAudioPlayer audioUrl={audioUrl} scriptText={scriptText} />
            )}

            {scriptText && mergedTemplateData && !classicTemplate && (
              <QuestionScriptBox scriptText={scriptText} />
            )}

            {loading && <div className="rounded-[18px] border border-brand-100 bg-white p-7">Đang tải câu hỏi...</div>}

            {activeQuestion?.featured && !templateOwnsHeader && <FeaturedQuestionCallout />}

            {activeQuestion && mergedTemplateData && (
              <AptisTemplateRenderer
                data={mergedTemplateData}
                questionId={activeQuestion.id}
                currentNumber={currentIndex + 1}
                totalQuestions={totalQuestions}
                featured={activeQuestion.featured}
                initialClubIndex={Number.isFinite(requestedClubIndex) ? requestedClubIndex : undefined}
                checked={activeChecked}
                value={answers[activeQuestion.id] ?? ''}
                onChange={(value) => setAnswers({ ...answers, [activeQuestion.id]: value })}
              />
            )}

            {activeQuestion && mergedTemplateData && activeChecked !== undefined && !selfCheckingTemplate && (
              <QuestionFeedback isCorrect={activeChecked} textOnly={!activeQuestion.answers.length} />
            )}

            {activeQuestion && !mergedTemplateData && (
              <section className="mx-auto max-w-[1180px] space-y-2">
                  <div className="rounded-xl border border-slate-300 bg-white p-3 shadow-soft">
                    <div className="flex gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-brand-600"><HelpCircle size={18} /></div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-extrabold">{activeQuestion.answers.length ? 'Chọn đáp án đúng' : 'Trả lời tự luận'}</h2>
                          {activeQuestion.featured && <FeaturedQuestionBadge />}
                        </div>
                        <HighlightableText
                          storageId={`question-${activeQuestion.id}-content`}
                          text={repairMojibake(activeQuestion.content)}
                          className="mt-1 text-sm leading-5 text-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  {activeQuestion.answers.length > 0 ? (
                    <div className="space-y-2">
                      {activeQuestion.answers.map((answer, index) => (
                        <label className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-2 text-sm shadow-soft transition ${getAnswerClassName({ answer, selectedValue: answers[activeQuestion.id], checked: activeChecked })}`} key={answer.id}>
                          <input className="h-4 w-4" type="radio" name={`q-${activeQuestion.id}`} value={answer.id} onChange={(e) => setAnswers({ ...answers, [activeQuestion.id]: e.target.value })} />
                          <span className="flex-1">{repairMojibake(answer.content)}</span>
                          <AnswerStatusBadge answer={answer} selectedValue={answers[activeQuestion.id]} checked={activeChecked} />
                          <span className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 text-xs text-slate-500">{index + 1}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea className="min-h-[170px] w-full rounded-[14px] border border-slate-300 bg-white p-4 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" placeholder="Nhập câu trả lời..." onChange={(e) => setAnswers({ ...answers, [activeQuestion.id]: e.target.value })} />
                  )}
                  {activeChecked !== undefined && <QuestionFeedback isCorrect={activeChecked} textOnly={!activeQuestion.answers.length} />}
                  <ListeningScriptReview scriptText={scriptText} checked={activeChecked} highlightTerms={getQuestionAnswerHighlightTerms(activeQuestion, answers[activeQuestion.id])} />
              </section>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-300 bg-white/95 px-3 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={goBack} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-slate-700 disabled:opacity-50 sm:justify-start" disabled={!canGoBack}><ArrowLeft size={18} />Quay lại</button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button type="button" className="btn-secondary hidden h-9 px-3 text-xs outline-none focus:ring-2 focus:ring-brand-200 sm:inline-flex" onClick={resetCurrentQuestion}><RotateCcw size={16} />Làm lại</button>
                <button type="button" onClick={checkCurrentQuestion} disabled={!canCheckCurrent} className="inline-flex h-9 items-center gap-2 rounded-lg bg-green-700 px-4 text-xs font-extrabold text-white outline-none focus:ring-2 focus:ring-green-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"><CheckSquare size={16} />Kiểm tra</button>
                <button type="button" className="btn-primary h-9 px-4 text-xs outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-50" onClick={goNext} disabled={!canGoNext}>Kế tiếp <ArrowRight size={16} /></button>
              </div>
            </div>
          </div>
        </form>
        {readingReviewOpen && (
          <ReadingExamReviewModal
            review={readingReview}
            onClose={() => setReadingReviewOpen(false)}
          />
        )}
      </main>
    </div>
  );
}

function ExamNav({ icon, label, active, to }: { icon: ReactNode; label: string; active?: boolean; to?: string }) {
  const className = `flex h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition ${active ? 'bg-brand-600 text-white shadow-lift shadow-brand-600/20' : 'text-white/80 hover:bg-[#334155] hover:text-white'}`;

  if (to) {
    return <Link to={to} className={className}>{icon}<span className="truncate">{label}</span></Link>;
  }

  return <div className={className}>{icon}<span className="truncate">{label}</span></div>;
}

function isActiveExamNav(to: string, pathname: string) {
  if (to === '/app') return pathname === '/app';
  if (to === '/app/tests') return pathname.startsWith('/app/tests');
  if (to === '/app/exams') return pathname.startsWith('/app/exams');
  return pathname.startsWith(to);
}

function AppTopbar({ exitLabel, onExit }: { exitLabel: string; onExit: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-brand-100 bg-white">
      <div className="flex h-12 items-center justify-between px-5 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-extrabold text-brand-600 transition hover:text-brand-700">LingoMaster</Link>
          <div className="hidden h-9 w-px bg-sky-200 sm:block" />
          <div className="hidden items-center gap-2 font-bold text-brand-600 sm:flex"><Clock size={22} />Còn 12:45</div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onExit} title={exitLabel} className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 shadow-soft shadow-red-100 transition hover:border-red-300 hover:bg-red-600 hover:text-white focus:outline-none focus:ring-4 focus:ring-red-100">
            <LogOut size={17} />Thoát
          </button>
          <div className="hidden h-9 w-full max-w-[280px] items-center gap-3 rounded-full bg-[#f0f3fd] px-4 text-sm text-slate-600 sm:flex">
            <Search size={19} />
            <span className="hidden sm:inline">Tìm tài liệu...</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function RunnerBottomBar({ currentIndex, totalQuestions, onBack, onReset, onCheck, onNext, showCheck = true }: {
  currentIndex: number;
  totalQuestions: number;
  onBack: () => void;
  onReset: () => void;
  onCheck: () => void;
  onNext: () => void;
  showCheck?: boolean;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-300 bg-white/95 px-3 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onBack} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-slate-700 disabled:opacity-50 sm:justify-start" disabled={currentIndex === 0}>
            <ArrowLeft />Quay lại
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button type="button" className="btn-secondary hidden h-9 px-3 text-xs outline-none focus:ring-2 focus:ring-brand-200 sm:inline-flex" onClick={onReset}>
            <RotateCcw size={16} />Làm lại</button>
          {showCheck && (
            <button type="button" onClick={onCheck} className="inline-flex h-9 items-center gap-2 rounded-lg bg-green-700 px-4 text-xs font-extrabold text-white outline-none focus:ring-2 focus:ring-green-200">
              <CheckSquare size={16} />Kiểm tra</button>
          )}
          <button type="button" className="btn-primary h-9 px-4 text-xs outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-50" onClick={onNext} disabled={currentIndex >= totalQuestions - 1}>
            Kế tiếp <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function getAnswerClassName({ answer, selectedValue, checked }: {
  answer: Answer;
  selectedValue?: string;
  checked?: boolean;
}) {
  const selected = selectedValue === String(answer.id);

  if (checked !== undefined) {
    if (answer.correct) return 'border-green-600 bg-green-100 text-green-950 ring-4 ring-green-200';
    if (selected && !answer.correct) return 'border-red-600 bg-red-100 text-red-950 ring-4 ring-red-200';
    return 'border-brand-100 bg-sky-50 opacity-60';
  }

  return selected ? 'border-brand-600 ring-2 ring-brand-100' : 'border-slate-300 hover:border-brand-300';
}

function AnswerStatusBadge({ answer, selectedValue, checked }: {
  answer: Answer;
  selectedValue?: string;
  checked?: boolean;
}) {
  if (checked === undefined) return null;

  const selected = selectedValue === String(answer.id);
  if (answer.correct) {
    return <span className="rounded-full bg-green-700 px-4 py-2 text-sm font-extrabold text-white">Đáp án đúng</span>;
  }
  if (selected) {
    return <span className="rounded-full bg-red-600 px-4 py-2 text-sm font-extrabold text-white">Bạn chọn sai</span>;
  }
  return null;
}

function QuestionFeedback({ isCorrect, textOnly }: { isCorrect: boolean; textOnly?: boolean }) {
  if (textOnly) {
    return (
      <div className="rounded-[16px] border border-blue-200 bg-blue-50 px-6 py-4 text-blue-800 shadow-soft">
        <p className="font-extrabold">Đã ghi nhận câu trả lời</p>
        <p className="mt-1 text-sm">Câu tự luận hoặc speaking cần đối chiếu với đáp án mẫu/giáo viên, nên hệ thống chưa tự chấm đúng sai.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-[18px] border-2 px-7 py-5 shadow-soft ${isCorrect ? 'border-green-600 bg-green-100 text-green-950' : 'border-red-600 bg-red-100 text-red-950'}`}>
      <p className="text-xl font-extrabold">{isCorrect ? 'Đúng rồi!' : 'Chưa đúng'}</p>
      <p className="mt-1 text-sm">{isCorrect ? 'Bạn có thể bấm Kế tiếp để làm câu sau.' : 'Đáp án đúng đã được tô màu xanh, đáp án bạn chọn sai được tô màu đỏ.'}</p>
    </div>
  );
}

function QuestionAudioPlayer({ audioUrl, scriptText }: { audioUrl: string; scriptText?: string }) {
  const normalizedAudioUrl = normalizeAudioUrl(audioUrl);

  return (
    <section className="sticky top-14 z-10 mx-auto mb-2 max-w-[1180px] rounded-xl border border-blue-200 bg-white/95 px-3 py-1.5 shadow-soft backdrop-blur">
      <div className="mb-1 flex items-center gap-2 font-extrabold text-navy">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-brand-600"><Volume2 size={16} /></span>
        <span className="text-xs">Nghe audio câu hỏi</span>
      </div>
      <audio
        className="h-7 w-full"
        controls
        controlsList="nodownload noplaybackrate"
        preload="metadata"
        src={normalizedAudioUrl}
        onContextMenu={(event) => event.preventDefault()}
      />
      <QuestionScriptBox scriptText={scriptText} compact />
    </section>
  );
}
function getQuestionAudioUrl(question: Question, templateData: TemplateData | null, fallbackAudioUrl = '') {
  if (question.audioUrl) return normalizeAudioUrl(question.audioUrl);
  if (templateData?.audioUrl) return normalizeAudioUrl(String(templateData.audioUrl));
  return normalizeAudioUrl(findAudioUrl(`${question.content ?? ''} ${question.explanation ?? ''}`) || fallbackAudioUrl);
}

function normalizeAudioUrl(value?: string) {
  return (value ?? '').trim().replace(/^["']|["']$/g, '');
}

function getSharedAudioUrl(questions: Question[]) {
  for (const question of questions) {
    const templateData = parseTemplate(question.content);
    const audioUrl = getQuestionAudioUrl(question, templateData);
    if (audioUrl) return audioUrl;
  }
  return '';
}

function getQuestionScriptText(question: Question, templateData: TemplateData | null) {
  const directScript = firstTextValue(
    question.scriptText,
    templateData?.scriptText,
    templateData?.script_text,
    templateData?.script,
    templateData?.transcript,
    templateData?.transcriptText
  );
  if (directScript) return directScript;

  const explanationScript = extractScriptFromText(question.explanation);
  if (explanationScript) return explanationScript;

  const fallbackExplanation = repairMojibake(question.explanation ?? '').trim();
  const hasListeningAudio = Boolean(
    normalizeAudioUrl(question.audioUrl)
    || normalizeAudioUrl(String(templateData?.audioUrl ?? ''))
    || findAudioUrl(`${question.content ?? ''} ${question.explanation ?? ''}`)
  );
  if (hasListeningAudio && fallbackExplanation) return fallbackExplanation;

  return '';
}

function firstTextValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return repairMojibake(value.trim());
  }
  return '';
}

function extractScriptFromText(value?: string) {
  const text = repairMojibake(value ?? '').trim();
  if (!text) return '';

  const labeledScript = text.match(/(?:^|\n)\s*(?:script|transcript|audio script|listening script)\s*:\s*([\s\S]+)$/i);
  if (labeledScript?.[1]?.trim()) return labeledScript[1].trim();

  return '';
}

function QuestionScriptBox({ scriptText, compact }: { scriptText?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const text = repairMojibake(scriptText ?? '').trim();

  return (
    <div className={`${compact ? 'mt-3' : 'mx-auto mb-5 max-w-[1180px] rounded-[16px] border border-blue-200 bg-white p-4 shadow-soft'}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand-200 bg-blue-50 px-3 text-xs font-extrabold text-brand-700 hover:bg-blue-100"
      >
        <BookOpen size={18} />{open ? 'Ẩn đoạn văn' : 'Hiện đoạn văn'}
      </button>
      {open && (
        <div className={`mt-3 whitespace-pre-line rounded-xl border p-3 text-sm leading-6 ${text ? 'border-brand-100 bg-sky-50 text-slate-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          {text || 'Câu này chưa có đoạn văn. Admin cần nhập transcript vào cột script_text hoặc scriptText khi import câu hỏi.'}
        </div>
      )}
    </div>
  );
}

function ListeningScriptReview({ scriptText, checked, showAnswers, highlightTerms = [] }: {
  scriptText?: string;
  checked?: boolean;
  showAnswers?: boolean;
  highlightTerms?: string[];
}) {
  const text = repairMojibake(scriptText ?? '').trim();
  if (!text || (checked === undefined && !showAnswers)) return null;

  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-navy shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-black ${checked === false ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
          {checked === false ? '×' : '✓'}
        </span>
        <div>
          <p className={`font-extrabold ${checked === false ? 'text-red-600' : 'text-green-700'}`}>
            {checked === false ? 'Chưa đúng, xem transcript để nghe lại ý chính.' : 'Đã hiện transcript để bạn đối chiếu.'}
          </p>
          <p className="font-extrabold text-brand-700">Giải thích / Transcript:</p>
        </div>
      </div>
      <div className="whitespace-pre-line rounded-lg border border-blue-100 bg-white/80 p-3 text-slate-800">
        <HighlightAnswerTerms text={text} terms={highlightTerms} />
      </div>
    </div>
  );
}

function getQuestionAnswerHighlightTerms(question: Question, selectedValue?: string) {
  const selected = question.answers.find((answer) => String(answer.id) === selectedValue)?.content;
  const correct = question.answers.filter((answer) => answer.correct).map((answer) => answer.content);
  return cleanHighlightTerms([selected, ...correct]);
}

function getTemplateListeningHighlightTerms(data: TemplateData, saved: Record<string, string>) {
  if (data.template === 'LISTENING_AUDIO_MC') {
    return cleanHighlightTerms([
      ...(data.groups ?? []).flatMap((group: any, index: number) => [group.correctAnswer, saved[`g${index}`]])
    ]);
  }

  if (data.template === 'LISTENING_OPINION_MATCH' || data.template === 'LISTENING_PEOPLE_MATCH') {
    const rows = data.template === 'LISTENING_PEOPLE_MATCH' ? data.rows : data.statements;
    return cleanHighlightTerms([
      ...(data.correctAnswers ?? []),
      ...(rows ?? []).map((_row: string, index: number) => saved[`r${index}`])
    ]);
  }

  return [];
}

function cleanHighlightTerms(values: Array<unknown>) {
  return Array.from(new Set(values
    .map((value) => repairMojibake(String(value ?? '')).trim())
    .filter((value) => value.length >= 2 && !/^(not answered|chưa chọn|\(không chọn\))$/i.test(value))))
    .sort((left, right) => right.length - left.length);
}

function HighlightAnswerTerms({ text, terms }: { text: string; terms: string[] }) {
  const cleanTerms = cleanHighlightTerms(terms);
  if (!cleanTerms.length) return <>{text}</>;

  const pattern = new RegExp(`(${cleanTerms.map(escapeRegExp).join('|')})`, 'ig');
  return (
    <>
      {text.split(pattern).map((part, index) => (
        cleanTerms.some((term) => term.toLowerCase() === part.toLowerCase())
          ? <mark key={`${part}-${index}`} className="rounded bg-yellow-200 px-0.5 font-black text-slate-950">{part}</mark>
          : <Fragment key={`${part}-${index}`}>{part}</Fragment>
      ))}
    </>
  );
}

function findAudioUrl(text: string) {
  const directAudio = text.match(/https?:\/\/[^\s"'<>]+?\.(?:mp3|wav|ogg|m4a|aac)(?:\?[^\s"'<>]*)?/i);
  if (directAudio?.[0]) return directAudio[0];

  const mediaApi = text.match(/https?:\/\/[^\s"'<>]*\/api\/media\/\d+/i);
  if (mediaApi?.[0]) return mediaApi[0];

  const relativeMediaApi = text.match(/\/api\/media\/\d+/i);
  if (relativeMediaApi?.[0]) return relativeMediaApi[0];

  return '';
}

function FeaturedQuestionBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-gradient-to-r from-amber-100 to-yellow-50 px-3 py-1.5 text-xs font-black text-amber-800 shadow-soft ring-2 ring-amber-100">
      <Star size={15} className="fill-amber-400 text-amber-500" />
      Câu nổi bật
    </span>
  );
}

function isFeaturedTemplateItem(item: Record<string, unknown>) {
  const value = item.featured ?? item.important ?? item.isFeatured ?? item.isImportant;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'y', 'featured', 'important', 'quan trong', 'quan trảng'].includes(value.trim().toLowerCase());
  }
  return false;
}

function FeaturedQuestionCallout() {
  return (
    <div className="mx-auto mb-3 max-w-[1180px] rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-100 via-yellow-50 to-white px-4 py-3 text-amber-900 shadow-[0_10px_24px_rgba(245,158,11,0.18)]">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-400 text-white shadow-soft">
          <Star size={22} className="fill-white" />
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-wide">Câu nổi bật</p>
          <p className="text-sm font-semibold text-amber-800">Admin đã đánh dấu câu này cần chú ý hơn.</p>
        </div>
      </div>
    </div>
  );
}

function QuestionNavigator({ total, currentIndex, answeredIds, checkedIds, questions, onSelect }: {
  total: number;
  currentIndex: number;
  answeredIds: Record<number, string>;
  checkedIds: Record<number, boolean>;
  questions: Question[];
  onSelect: (index: number) => void;
}) {
  return (
    <div className="mb-2 rounded-lg border border-brand-100 bg-white px-3 py-1 shadow-soft">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold">Chọn câu hỏi</h2>
          <p className="hidden text-xs text-slate-600 md:block">Bấm số câu để chuyển nhanh.</p>
        </div>
        <span className="text-xs font-bold text-brand-600">{currentIndex + 1}/{total}</span>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {questions.map((question, index) => {
          const active = index === currentIndex;
          const answered = Boolean(answeredIds[question.id]);
          const checked = checkedIds[question.id];
          const featured = Boolean(question.featured);
          return (
            <button
              type="button"
              key={question.id}
              onClick={() => onSelect(index)}
              title={featured ? 'Câu nổi bật' : undefined}
              aria-label={featured ? `Câu ${index + 1} nổi bật` : `Câu ${index + 1}`}
              className={`relative grid ${featured ? 'h-7 min-w-7' : 'h-6 min-w-6'} place-items-center rounded-md border text-[10px] font-extrabold transition ${
                active
                  ? featured
                    ? 'border-amber-400 bg-brand-600 text-white shadow-soft ring-2 ring-amber-400 ring-offset-1'
                    : 'border-brand-600 bg-brand-600 text-white shadow-soft'
                  : checked === true
                    ? 'border-green-300 bg-green-100 text-green-800'
                    : checked === false
                      ? 'border-red-300 bg-red-100 text-red-700'
                  : answered
                    ? featured
                      ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-[0_0_0_2px_rgba(251,191,36,0.35)]'
                      : 'border-green-200 bg-green-50 text-green-700'
                    : featured
                      ? 'border-amber-400 bg-amber-100 text-amber-900 shadow-[0_0_0_2px_rgba(251,191,36,0.35)] hover:border-amber-500'
                      : 'border-brand-100 bg-sky-50 text-slate-700 hover:border-brand-300'
              }`}
            >
              {featured && (
                <Star
                  size={12}
                  className={`absolute -right-1.5 -top-1.5 rounded-full ${active ? 'fill-amber-300 text-amber-300' : 'fill-amber-500 text-amber-500'}`}
                />
              )}
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type TemplateData = Record<string, any> & { template: string };
type TextHighlight = {
  id: string;
  start: number;
  end: number;
  color: string;
};

const HIGHLIGHT_COLOR = '#fde68a';
const HIGHLIGHT_STORAGE_PREFIX = 'aptis-reading-highlights';

function loadTextHighlights(storageKey: string): TextHighlight[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => Number.isFinite(item?.start) && Number.isFinite(item?.end) && item.end > item.start)
      .map((item) => ({
        id: String(item.id ?? `${item.start}-${item.end}`),
        start: Number(item.start),
        end: Number(item.end),
        color: typeof item.color === 'string' ? item.color : HIGHLIGHT_COLOR
      }));
  } catch {
    return [];
  }
}

function saveTextHighlights(storageKey: string, highlights: TextHighlight[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(highlights));
}

function getSelectionTextRange(root: HTMLElement): Pick<TextHighlight, 'start' | 'end'> | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  if (!selection.anchorNode || !selection.focusNode) return null;
  if (!root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null;

  const range = selection.getRangeAt(0);
  const start = textOffsetInRoot(root, range.startContainer, range.startOffset);
  const end = textOffsetInRoot(root, range.endContainer, range.endOffset);
  const normalizedStart = Math.max(0, Math.min(start, end));
  const normalizedEnd = Math.max(0, Math.max(start, end));
  if (normalizedEnd <= normalizedStart) return null;
  return { start: normalizedStart, end: normalizedEnd };
}

function textOffsetInRoot(root: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(root);
  try {
    range.setEnd(node, offset);
    return range.toString().length;
  } finally {
    range.detach();
  }
}

function applyTextHighlights(root: HTMLElement, highlights: TextHighlight[]) {
  if (!highlights.length) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Array<{ node: Text; start: number; end: number }> = [];
  let cursor = 0;
  let current = walker.nextNode();
  while (current) {
    const node = current as Text;
    const length = node.data.length;
    textNodes.push({ node, start: cursor, end: cursor + length });
    cursor += length;
    current = walker.nextNode();
  }

  const normalizedHighlights = highlights
    .filter((item) => item.end > item.start)
    .sort((first, second) => first.start - second.start);

  textNodes.forEach(({ node, start, end }) => {
    const matches = normalizedHighlights
      .map((highlight) => ({
        ...highlight,
        start: Math.max(highlight.start, start),
        end: Math.min(highlight.end, end)
      }))
      .filter((highlight) => highlight.end > highlight.start);
    if (!matches.length || !node.parentNode) return;

    const fragment = document.createDocumentFragment();
    let localCursor = 0;
    matches.forEach((highlight) => {
      const localStart = highlight.start - start;
      const localEnd = highlight.end - start;
      if (localStart > localCursor) {
        fragment.appendChild(document.createTextNode(node.data.slice(localCursor, localStart)));
      }
      const mark = document.createElement('mark');
      mark.className = 'rounded-sm px-0.5 text-navy';
      mark.style.backgroundColor = highlight.color;
      mark.appendChild(document.createTextNode(node.data.slice(localStart, localEnd)));
      fragment.appendChild(mark);
      localCursor = localEnd;
    });
    if (localCursor < node.data.length) {
      fragment.appendChild(document.createTextNode(node.data.slice(localCursor)));
    }
    node.parentNode.replaceChild(fragment, node);
  });
}

function mergeTextHighlights(highlights: TextHighlight[]) {
  const sorted = highlights
    .filter((item) => item.end > item.start)
    .sort((first, second) => first.start - second.start);
  return sorted.reduce<TextHighlight[]>((merged, item) => {
    const previous = merged[merged.length - 1];
    if (!previous || item.start > previous.end) {
      merged.push(item);
      return merged;
    }
    previous.end = Math.max(previous.end, item.end);
    return merged;
  }, []);
}

function HighlightableText({ storageId, text, html, className = '' }: {
  storageId: string;
  text?: string;
  html?: string;
  className?: string;
}) {
  const storageKey = `${HIGHLIGHT_STORAGE_PREFIX}:${storageId}`;
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [highlights, setHighlights] = useState<TextHighlight[]>(() => loadTextHighlights(storageKey));
  const [pendingRange, setPendingRange] = useState<Pick<TextHighlight, 'start' | 'end'> | null>(null);
  const hasContent = Boolean((html ?? text ?? '').trim());

  useEffect(() => {
    setHighlights(loadTextHighlights(storageKey));
    setPendingRange(null);
  }, [storageKey]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    if (html !== undefined) {
      root.innerHTML = repairMojibake(html);
    } else {
      root.textContent = repairMojibake(text ?? '');
    }
    applyTextHighlights(root, highlights);
  }, [html, text, highlights]);

  function rememberSelection() {
    const root = contentRef.current;
    if (!root) return;
    setPendingRange(getSelectionTextRange(root));
  }

  function addHighlight() {
    if (!pendingRange) {
      toast.error('Bạn hãy bôi den do?n ch? cần ghi nh? trước.');
      return;
    }
    const next = mergeTextHighlights([
      ...highlights.filter((item) => !(item.start === pendingRange.start && item.end === pendingRange.end)),
      { id: `${Date.now()}-${pendingRange.start}-${pendingRange.end}`, ...pendingRange, color: HIGHLIGHT_COLOR }
    ]);
    setHighlights(next);
    saveTextHighlights(storageKey, next);
    setPendingRange(null);
    window.getSelection()?.removeAllRanges();
  }

  function clearHighlights() {
    setHighlights([]);
    saveTextHighlights(storageKey, []);
    setPendingRange(null);
  }

  if (!hasContent) return null;

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-extrabold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={addHighlight}
          disabled={!pendingRange}
          title="Bôi đen đoạn chữ rồi bấm để tô sáng"
        >
          <Highlighter size={14} />Tô sáng
        </button>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-100 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={clearHighlights}
          disabled={!highlights.length}
          title="Xóa các đoạn đã tô sáng trong vùng này"
        >
          <Eraser size={14} />Xóa
        </button>
      </div>
      <div
        ref={contentRef}
        className="select-text"
        onMouseUp={rememberSelection}
        onKeyUp={rememberSelection}
        onTouchEnd={rememberSelection}
      />
    </div>
  );
}
type ListeningReviewGroup = '1-13' | '14' | '15' | '16-17';
const EXAM_POINT_PER_QUESTION = 2;

type ListeningReviewItem = {
  group: ListeningReviewGroup;
  questionNo: string;
  yourAnswer: string;
  correctAnswer: string;
  correct: boolean;
};

type ListeningExamReview = {
  score: number;
  maxScore: number;
  grade: string;
  items: ListeningReviewItem[];
};

type ReadingReviewItem = {
  part: number;
  questionNo: string;
  yourAnswer: string;
  correctAnswer: string;
  correct: boolean;
};

type ReadingExamReview = {
  score: number;
  maxScore: number;
  items: ReadingReviewItem[];
};

function getRenderableTemplateData(question: Question, test: Test | null, totalQuestions: number): TemplateData | null {
  return parseTemplate(question.content)
    ?? buildListeningPart2FallbackTemplate(question, test, totalQuestions)
    ?? buildListeningPart3FallbackTemplate(question, test, totalQuestions)
    ?? buildListeningPart4FallbackTemplate(question, test, totalQuestions);
}

function mergeSameSpeakingTemplateData(data: TemplateData | null, questions: Question[], test: Test | null): TemplateData | null {
  if (!data?.template?.startsWith('SPEAKING_PART')) return data;

  const mergedQuestions = questions.flatMap((question) => {
    const itemData = getRenderableTemplateData(question, test, questions.length);
    if (itemData?.template !== data.template) return [];
    if (Array.isArray(itemData.questions) && itemData.questions.length) {
      return itemData.questions.map((item: Record<string, unknown>, itemIndex: number) => ({
        ...item,
        __sourceQuestionId: question.id,
        __sourceItemIndex: itemIndex,
        featured: Boolean(isFeaturedTemplateItem(item) || (question.featured && itemIndex === 0))
      }));
    }
    const singleQuestion = speakingSingleQuestionFromTemplate(itemData);
    return singleQuestion ? [{ ...singleQuestion, __sourceQuestionId: question.id, __sourceItemIndex: 0, featured: Boolean(isFeaturedTemplateItem(singleQuestion) || question.featured) }] : [];
  });

  if (!mergedQuestions.length) return data;
  return {
    ...data,
    total: mergedQuestions.length,
    questions: mergedQuestions
  };
}

function findSpeakingQuestionIndexBySourceId(data: TemplateData, sourceQuestionId: number) {
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const index = questions.findIndex((item: Record<string, unknown>) => Number(item.__sourceQuestionId) === sourceQuestionId);
  return index >= 0 ? index : 0;
}

function speakingPracticeStateForTemplate(template: string, index: number): Record<string, string> | null {
  const safeIndex = String(Math.max(0, index));
  if (template === 'SPEAKING_PART1') {
    return { speakingPart1Mode: 'practice', speakingPart1Index: safeIndex, speakingPart1OpenAnswer: '' };
  }
  if (template === 'SPEAKING_PART2') {
    return { speakingPart2Mode: 'practice', speakingPart2Index: safeIndex, speakingPart2Tab: '0', speakingPart2ShowSample: 'false' };
  }
  if (template === 'SPEAKING_PART3') {
    return { speakingPart3Mode: 'practice', speakingPart3Index: safeIndex, speakingPart3Tab: '0', speakingPart3ShowSample: 'false' };
  }
  if (template === 'SPEAKING_PART4') {
    return { speakingPart4Mode: 'practice', speakingPart4Index: safeIndex, speakingPart4ShowSample: 'false', speakingPart4OpenAnswer: '' };
  }
  return null;
}

function speakingSingleQuestionFromTemplate(data: TemplateData | null) {
  if (!data?.template?.startsWith('SPEAKING_PART')) return null;
  const { template: _template, total: _total, title: _title, part: _part, ...rest } = data;
  const hasSpeakingPrompt = Object.keys(rest).some((key) =>
    /^(question|q|prompt|urlpic|urlPic|image|picture|answer|sample)/i.test(key)
  );
  return hasSpeakingPrompt ? rest : null;
}

function isFullListeningExam(test: Test | null, questions: Question[]) {
  if (questions.length !== 17) return false;
  const skillText = `${test?.skillName ?? ''} ${test?.title ?? ''}`.toLowerCase();
  const looksListening = /listening|nghe|lis/.test(skillText)
    || questions.some((question) => /listening|audio|mp3|plays remaining/i.test(`${question.topic} ${question.content} ${question.audioUrl}`));
  if (!looksListening) return false;
  return questions.every((question) => isClassicAptisTemplate(getRenderableTemplateData(question, test, questions.length)));
}

function isFullReadingExam(test: Test | null, questions: Question[]) {
  if (questions.length !== 5) return false;
  const skillText = `${test?.skillName ?? ''} ${test?.title ?? ''}`.toLowerCase();
  const readingTemplates = ['READING_GAP_FILL', 'READING_SENTENCE_ORDER', 'READING_FORUM_MATCH', 'READING_HEADING_MATCH'];
  const looksReading = /reading|read|đọc|doc/.test(skillText)
    || questions.some((question) => {
      const data = getRenderableTemplateData(question, test, questions.length);
      return readingTemplates.includes(data?.template ?? '');
    });
  if (!looksReading) return false;
  return questions.every((question) => {
    const data = getRenderableTemplateData(question, test, questions.length);
    return readingTemplates.includes(data?.template ?? '');
  });
}

function buildListeningExamReview(test: Test | null, questions: Question[], answers: Record<number, string>): ListeningExamReview {
  const items: ListeningReviewItem[] = [];
  const totalQuestions = questions.length;

  questions.forEach((question, questionIndex) => {
    const data = getRenderableTemplateData(question, test, totalQuestions);
    const saved = parseSavedAnswer(answers[question.id]);
    const group = getListeningReviewGroup(questionIndex);

    if (data?.template === 'LISTENING_AUDIO_MC') {
      (data.groups ?? []).forEach((item: any, groupIndex: number) => {
        const yourAnswer = saved[`g${groupIndex}`] || 'Not answered';
        const correctAnswer = String(item.correctAnswer ?? '');
        const questionNo = group === '1-13'
          ? String(questionIndex + 1)
          : `${questionIndex + 1}.${groupIndex + 1}`;

        items.push({
          group,
          questionNo,
          yourAnswer,
          correctAnswer,
          correct: Boolean(correctAnswer) && sameAnswer(yourAnswer, correctAnswer)
        });
      });
      return;
    }

    if (data?.template === 'LISTENING_PEOPLE_MATCH' || data?.template === 'LISTENING_OPINION_MATCH') {
      const rows = data.template === 'LISTENING_PEOPLE_MATCH' ? data.rows : data.statements;
      (rows ?? []).forEach((row: string, rowIndex: number) => {
        const yourAnswer = saved[`r${rowIndex}`] || 'Not answered';
        const correctAnswer = String(data.correctAnswers?.[rowIndex] ?? '');

        items.push({
          group,
          questionNo: stripLeadingIndex(String(row || rowIndex + 1)),
          yourAnswer,
          correctAnswer,
          correct: Boolean(correctAnswer) && sameAnswer(yourAnswer, correctAnswer)
        });
      });
    }
  });

  const score = items.filter((item) => item.correct).length;
  return {
    score,
    maxScore: 42,
    grade: getListeningCefr(score),
    items
  };
}

function buildReadingExamReview(test: Test | null, questions: Question[], answers: Record<number, string>): ReadingExamReview {
  const items: ReadingReviewItem[] = [];
  const totalQuestions = questions.length;

  questions.forEach((question, questionIndex) => {
    const data = getRenderableTemplateData(question, test, totalQuestions);
    const saved = parseSavedAnswer(answers[question.id]);

    if (data?.template === 'READING_GAP_FILL') {
      const correctAnswers = getReadingGapCorrectAnswers(data);
      correctAnswers.forEach((correctAnswer, index) => {
        const yourAnswer = saved[`gap${index}`] || 'Not answered';
        items.push({
          part: questionIndex + 1,
          questionNo: `${questionIndex + 1}.${index + 1}`,
          yourAnswer,
          correctAnswer,
          correct: sameAnswer(yourAnswer, correctAnswer)
        });
      });
      return;
    }

    if (data?.template === 'READING_SENTENCE_ORDER') {
      const correctOrder = getReadingOrderCorrectSentences(data);
      const displaySentences = getReadingOrderDisplaySentences(data);
      const selectedOrder = Array.isArray((saved as any).order) ? (saved as any).order as string[] : displaySentences;
      correctOrder.forEach((correctAnswer, index) => {
        const yourAnswer = selectedOrder[index] || 'Not answered';
        items.push({
          part: questionIndex + 1,
          questionNo: `${questionIndex + 1}.${index + 1}`,
          yourAnswer,
          correctAnswer,
          correct: yourAnswer === correctAnswer
        });
      });
      return;
    }

    if (data?.template === 'READING_FORUM_MATCH') {
      (data.correctAnswers ?? []).forEach((correctAnswer: string, index: number) => {
        const yourAnswer = saved[`forum${index}`] || 'Not answered';
        items.push({
          part: questionIndex + 1,
          questionNo: `${questionIndex + 1}.${index + 1}`,
          yourAnswer,
          correctAnswer,
          correct: sameAnswer(yourAnswer, correctAnswer)
        });
      });
      return;
    }

    if (data?.template === 'READING_HEADING_MATCH') {
      (data.correctAnswers ?? []).forEach((correctAnswer: string, index: number) => {
        const yourAnswer = saved[`heading${index}`] || 'Not answered';
        items.push({
          part: questionIndex + 1,
          questionNo: `${questionIndex + 1}.${index + 1}`,
          yourAnswer,
          correctAnswer,
          correct: sameAnswer(yourAnswer, correctAnswer)
        });
      });
    }
  });

  const correctCount = items.filter((item) => item.correct).length;
  return {
    score: correctCount * EXAM_POINT_PER_QUESTION,
    maxScore: items.length * EXAM_POINT_PER_QUESTION,
    items
  };
}

function getListeningReviewGroup(index: number): ListeningReviewGroup {
  if (index <= 12) return '1-13';
  if (index === 13) return '14';
  if (index === 14) return '15';
  return '16-17';
}

function getListeningCefr(score: number) {
  if (score <= 10) return 'A1';
  if (score <= 18) return 'A2';
  if (score <= 27) return 'B1';
  if (score <= 35) return 'B2';
  return 'C';
}

function parseSavedAnswer(value?: string) {
  try {
    return value ? JSON.parse(value) as Record<string, string> : {};
  } catch {
    return {};
  }
}

function sameAnswer(first: string, second: string) {
  return first.trim().toLowerCase() === second.trim().toLowerCase();
}

function ListeningExamReviewModal({ review, activeGroup, onGroupChange, onClose }: {
  review: ListeningExamReview;
  activeGroup: ListeningReviewGroup;
  onGroupChange: (group: ListeningReviewGroup) => void;
  onClose: () => void;
}) {
  const groupItems = review.items.filter((item) => item.group === activeGroup);
  const groupScore = groupItems.filter((item) => item.correct).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-8">
      <section className="w-full max-w-[980px] rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-brand-100 px-6 py-4">
          <h2 className="text-lg font-bold text-navy">Test and Answer Review listening keys</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-2xl text-slate-600 hover:bg-sky-100">x</button>
        </div>
        <div className="px-6 py-5 text-center">
          <p className="text-2xl font-extrabold text-green-700">Total Score: {review.score} / {review.maxScore}</p>
          <p className="mt-1 text-2xl font-extrabold text-brand-600">Your grade: {review.grade}</p>
          <div className="mt-3 flex justify-center gap-2">
            {(['1-13', '14', '15', '16-17'] as ListeningReviewGroup[]).map((group) => (
              <button
                type="button"
                key={group}
                onClick={() => onGroupChange(group)}
                className={`h-9 rounded-md border px-4 text-sm font-semibold ${activeGroup === group ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-600 bg-white text-brand-600 hover:bg-blue-50'}`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>
        <div className="px-6 pb-8">
          <h3 className="mb-2 text-2xl font-bold">Question {activeGroup}</h3>
          <p className="mb-4 text-sm">Score: {groupScore} / {groupItems.length}</p>
          <div className="overflow-hidden rounded-lg border border-brand-100">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-white">
                  <th className="px-4 py-3 font-extrabold">Question No.</th>
                  <th className="px-4 py-3 font-extrabold">Your Answer</th>
                  <th className="px-4 py-3 font-extrabold">Correct Answer</th>
                </tr>
              </thead>
              <tbody>
                {groupItems.map((item, index) => (
                  <tr className={index % 2 === 0 ? 'bg-sky-100' : 'bg-white'} key={`${item.group}-${item.questionNo}-${index}`}>
                    <td className="px-4 py-3">{item.questionNo}</td>
                    <td className={`px-4 py-3 font-bold ${item.correct ? 'text-green-700' : 'text-red-600'}`}>{item.yourAnswer}</td>
                    <td className="px-4 py-3 font-bold text-green-700">{item.correctAnswer || '-'}</td>
                  </tr>
                ))}
                {!groupItems.length && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-600" colSpan={3}>Chưa có dữ liệu câu hỏi trong nhóm này.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReadingExamReviewModal({ review, onClose }: {
  review: ReadingExamReview;
  onClose: () => void;
}) {
  const parts = useMemo(
    () => Array.from(new Set(review.items.map((item) => item.part))).sort((first, second) => first - second),
    [review.items]
  );
  const [activePart, setActivePart] = useState(parts[0] ?? 1);

  useEffect(() => {
    if (parts.length && !parts.includes(activePart)) {
      setActivePart(parts[0]);
    }
  }, [activePart, parts]);

  const partItems = review.items.filter((item) => item.part === activePart);
  const partScore = partItems.filter((item) => item.correct).length * EXAM_POINT_PER_QUESTION;
  const partMaxScore = partItems.length * EXAM_POINT_PER_QUESTION;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-8">
      <section className="w-full max-w-[980px] rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-brand-100 px-6 py-4">
          <h2 className="text-lg font-bold text-navy">Test and Answer Review reading keys</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-2xl text-slate-600 hover:bg-sky-100">x</button>
        </div>
        <div className="px-6 py-5 text-center">
          <p className="text-2xl font-extrabold text-green-700">Total Score: {review.score} / {review.maxScore}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {parts.map((part) => (
              <button
                type="button"
                key={part}
                onClick={() => setActivePart(part)}
                className={`h-9 rounded-md border px-4 text-sm font-semibold ${activePart === part ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-600 bg-white text-brand-600 hover:bg-blue-50'}`}
              >
                Part {part}
              </button>
            ))}
          </div>
        </div>
        <div className="px-6 pb-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-navy">Part {activePart}</h3>
              <p className="mt-1 text-sm text-slate-700">Score: {partScore} / {partMaxScore}</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-brand-700">
              {partItems.length} câu
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-brand-100">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-white">
                  <th className="px-4 py-3 font-extrabold">Question No.</th>
                  <th className="px-4 py-3 font-extrabold">Your Answer</th>
                  <th className="px-4 py-3 font-extrabold">Correct Answer</th>
                </tr>
              </thead>
              <tbody>
                {partItems.map((item, index) => (
                  <tr className={index % 2 === 0 ? 'bg-sky-100' : 'bg-white'} key={`${item.questionNo}-${index}`}>
                    <td className="px-4 py-3">{item.questionNo}</td>
                    <td className={`px-4 py-3 font-bold ${item.correct ? 'text-green-700' : 'text-red-600'}`}>{item.yourAnswer}</td>
                    <td className="px-4 py-3 font-bold text-green-700">{item.correctAnswer || '-'}</td>
                  </tr>
                ))}
                {!partItems.length && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-600" colSpan={3}>Chưa có dữ liệu đáp án để chấm.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function buildListeningPart2FallbackTemplate(question: Question, test: Test | null, totalQuestions: number): TemplateData | null {
  if (parseTemplate(question.content)) return null;
  if (!isListeningPart2FallbackQuestion(question, test, totalQuestions)) return null;

  const options = [...question.answers]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((answer) => repairMojibake(answer.content))
    .filter(Boolean);

  const correctAnswers = parsePersonCorrectAnswers(question.explanation, options);
  const topic = cleanAptisTopic(question.topic || test?.title || 'Aptis Listening Part 2');

  return {
    template: 'LISTENING_PEOPLE_MATCH',
    total: totalQuestions || 13,
    topic,
    instructions: repairMojibake(question.content),
    playsRemaining: '2 of 2 plays remaining',
    audioUrl: getQuestionAudioUrl(question, null),
    scriptText: question.scriptText,
    options,
    correctAnswers,
    rows: ['Person 1', 'Person 2', 'Person 3', 'Person 4']
  };
}

function isListeningPart2FallbackQuestion(question: Question, test: Test | null, totalQuestions: number) {
  if (question.answers.length < 4) return false;

  const text = `${test?.title ?? ''} ${test?.skillName ?? ''} ${question.topic ?? ''} ${question.content ?? ''} ${question.explanation ?? ''}`.toLowerCase();
  const looksLikePart2 = totalQuestions === 13 || /(?:lis|listening).{0,16}part\s*2|part\s*2/.test(text);
  const looksLikePeopleMatch = /four people|person\s*[1-4]|person\s*[a-d]|complete the sentences|use each answer only once/.test(text);

  return looksLikePart2 && looksLikePeopleMatch;
}

function buildListeningPart3FallbackTemplate(question: Question, test: Test | null, totalQuestions: number): TemplateData | null {
  if (parseTemplate(question.content)) return null;
  if (!isListeningPart3FallbackQuestion(question, test, totalQuestions)) return null;

  const rawOptions = [...question.answers]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((answer) => repairMojibake(answer.content))
    .filter(Boolean);
  const options = rawOptions.length ? rawOptions : ['Man', 'Woman', 'Both'];
  const statements = splitStatementRows(repairMojibake(question.content));

  return {
    template: 'LISTENING_OPINION_MATCH',
    total: totalQuestions || 17,
    topic: cleanAptisTopic(question.topic || test?.title || 'Aptis Listening Part 3'),
    instructions: statements.length > 1 ? defaultListeningPart3Instructions() : repairMojibake(question.content),
    playsRemaining: '2 of 2 plays remaining',
    audioUrl: getQuestionAudioUrl(question, null),
    scriptText: question.scriptText,
    options,
    correctAnswers: [],
    statements: statements.length ? statements : [question.content]
  };
}

function isListeningPart3FallbackQuestion(question: Question, test: Test | null, totalQuestions: number) {
  const text = `${test?.title ?? ''} ${test?.skillName ?? ''} ${question.topic ?? ''} ${question.content ?? ''}`.toLowerCase();
  const looksLikePart3 = totalQuestions === 17 || /(?:lis|listening).{0,16}part\s*3|part\s*3/.test(text);
  const optionText = question.answers.map((answer) => repairMojibake(answer.content).toLowerCase()).join(' ');
  const hasOpinionOptions = /man/.test(optionText) && /woman/.test(optionText) && /both/.test(optionText);
  const looksLikeOpinionMatch = /two colleagues|man's|woman's|whose opinion|who expresses|man\s*\/\s*woman|woman\s*\/\s*both/.test(text);

  return looksLikePart3 && (hasOpinionOptions || looksLikeOpinionMatch);
}

function buildListeningPart4FallbackTemplate(question: Question, test: Test | null, totalQuestions: number): TemplateData | null {
  if (parseTemplate(question.content)) return null;
  if (!isListeningPart4FallbackQuestion(question, test, totalQuestions)) return null;

  const options = [...question.answers]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((answer) => repairMojibake(answer.content))
    .filter(Boolean);
  const groups = options.length
    ? [{ prompt: stripPart4Content(repairMojibake(question.content)), options, correctAnswer: repairMojibake(question.answers.find((answer) => answer.correct)?.content ?? '') }]
    : [{
        prompt: 'Chưa có câu hỏi con. Hãy điền question1, q1_answer1-3, question2, q2_answer1-3 trong file CSV rồi import lại.',
        options: [],
        correctAnswer: ''
      }];

  return {
    template: 'LISTENING_AUDIO_MC',
    total: totalQuestions || 59,
    topic: cleanAptisTopic(question.topic || test?.title || 'Aptis Listening Part 4'),
    playsRemaining: '2 of 2 plays remaining',
    audioUrl: getQuestionAudioUrl(question, null),
    scriptText: question.scriptText,
    groups
  };
}

function isListeningPart4FallbackQuestion(question: Question, test: Test | null, totalQuestions: number) {
  const text = `${test?.title ?? ''} ${test?.skillName ?? ''} ${question.topic ?? ''} ${question.content ?? ''}`.toLowerCase();
  return totalQuestions === 59 || /(?:lis|listening).{0,16}part\s*4|part\s*4|listening part 4/.test(text);
}

function stripPart4Content(value: string) {
  return value.replace(/^listening\s+part\s+4\s*-\s*/i, '').trim();
}

function splitStatementRows(value: string) {
  return value
    .split(/\r?\n|\|/)
    .map((item) => item.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
}

function defaultListeningPart3Instructions() {
  return "Listen to two colleagues discussing potential changes in the workplace. Read the statements and decide whose opinion matches the best: the man's, the woman's or both. Who expresses which opinion?";
}

function parsePersonCorrectAnswers(explanation: string, options: string[]) {
  if (!explanation) return [];

  const answers: string[] = [];
  const pattern = /person\s*[1-4]\s*:\s*([^|;\n]+)/gi;
  let match = pattern.exec(explanation);
  while (match) {
    const value = match[1].trim();
    const option = options.find((item) => item.toLowerCase() === value.toLowerCase()) ?? value;
    answers.push(option);
    match = pattern.exec(explanation);
  }

  return answers.length >= 4 ? answers.slice(0, 4) : [];
}

function cleanAptisTopic(value: string) {
  return repairMojibake(value).replace(/^topic:\s*/i, '').trim();
}

function cleanUserFacingTopic(value?: string | null) {
  const cleaned = repairMojibake(value ?? '').replace(/^topic:\s*/i, '').trim();
  return isTechnicalTopicName(cleaned) ? '' : cleaned;
}

function displayWritingClubName(value: string | undefined, index: number) {
  const cleaned = cleanUserFacingTopic(value);
  return cleaned || `Chủ đề ${index + 1}`;
}

function isTechnicalTopicName(value: string) {
  return /^[a-z]+(?:_[a-z0-9]+)+$/i.test(value.trim());
}

function stripLeadingIndex(value: string) {
  return value.replace(/^\s*\d+[\).]\s*/, '').trim();
}

function parseTemplate(content: string): TemplateData | null {
  try {
    const parsed = JSON.parse(content);
    return parsed?.template ? repairTemplateData(parsed) : null;
  } catch {
    return null;
  }
}

function repairTemplateData<T>(value: T): T {
  if (typeof value === 'string') return repairMojibake(value) as T;
  if (Array.isArray(value)) return value.map((item) => repairTemplateData(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, repairTemplateData(item)])
    ) as T;
  }
  return value;
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

function getReadingGapCorrectAnswers(data: TemplateData): string[] {
  if (Array.isArray(data.correctAnswers) && data.correctAnswers.length) return data.correctAnswers;
  return (data.rows ?? [])
    .map((row: any) => row?.correctAnswer ?? row?.correct ?? '')
    .filter(Boolean);
}

function isGrammarTemplate(data: TemplateData | null) {
  return ['GRAMMAR_CHOICE', 'GRAMMAR_MATCH', 'GRAMMAR_GAP_SELECT'].includes(data?.template ?? '');
}

function getGrammarCorrectAnswers(data: TemplateData): string[] {
  if (data.template === 'GRAMMAR_CHOICE') return [data.correctAnswer ?? ''].filter(Boolean);
  if (Array.isArray(data.correctAnswers) && data.correctAnswers.length) return data.correctAnswers;
  return (data.rows ?? [])
    .map((row: any) => row?.correctAnswer ?? row?.correct ?? '')
    .filter(Boolean);
}

function getReadingOrderDisplaySentences(data: TemplateData): string[] {
  if (Array.isArray(data.displaySentences) && data.displaySentences.length) return data.displaySentences;
  return data.sentences ?? [];
}

function getReadingOrderCorrectSentences(data: TemplateData): string[] {
  if (Array.isArray(data.correctSentences) && data.correctSentences.length) return data.correctSentences;
  if (Array.isArray(data.correctOrder) && data.correctOrder.length) return data.correctOrder;
  return data.sentences ?? [];
}

function getReadingOrderTranslation(sentence: string, data: TemplateData) {
  const key = normalizeTranslationKey(sentence);
  const aiTranslated = data.aiTranslations?.[key] ?? data.aiTranslations?.[sentence];
  if (typeof aiTranslated === 'string' && aiTranslated.trim()) return aiTranslated.trim();

  const templateTranslations = data.translations ?? data.translationMap ?? data.vietnameseTranslations ?? data.viTranslations;
  if (Array.isArray(templateTranslations)) {
    const correctOrder = getReadingOrderCorrectSentences(data);
    const index = correctOrder.findIndex((item) => normalizeReadingOrderSentence(item) === key);
    const translated = index >= 0 ? templateTranslations[index] : '';
    if (translated) return String(translated);
  }
  if (templateTranslations && typeof templateTranslations === 'object') {
    const translated = templateTranslations[sentence] ?? templateTranslations[key] ?? templateTranslations[normalizeTranslationKey(sentence)];
    if (translated) return String(translated);
  }

  const translations: Record<string, string> = {
    'the first american woman in space': 'Người phụ nữ Mỹ đầu tiên bay vào vũ trụ',
    'her father was a skilled worker and her mother was a teacher': 'Bố cô là một công nhân lành nghề và mẹ cô là giáo viên.',
    'with the support from parents, mae went to university to study science': 'Với sự ủng hộ từ cha mẹ, Mae đã vào đại học để học ngành Khoa học.',
    'her degree allows her to get a seat on the training course in the usa': 'Tấm bằng đại học giúp cô được nhận vào khóa huấn luyện tại Hoa Kỳ.',
    'this is about space and it helps her to become a member of a research team': 'Khóa học này liên quan đến không gian và giúp cô trở thành thành viên của một nhóm nghiên cứu.',
    'as a part of this group, she traveled in space and did a lot of experiments there': 'Là một phần của nhóm này, cô đã du hành vào vũ trụ và thực hiện nhiều thí nghiệm tại đó.',
    'some of those were about growing plants and some animals in a spaceship': 'Một số thí nghiệm liên quan đến việc trồng cây và nuôi động vật trong tàu vũ trụ.',
    'a waiter assisted me in finding a table and handed me the menu': 'Một nhân viên phục vụ giúp tôi tìm bàn và đưa thực đơn cho tôi.',
    'i arrived at the shop early in the morning, but it was crowded with people': 'Tôi đến quán từ sáng sớm nhưng quán rất đông người.',
    'the menu was not as good as expected and quite pricey, so i decided to order a sandwich': 'Thực đơn không ngon như mong đợi và khá đắt, nên tôi quyết định gọi một chiếc sandwich.',
    'the sandwich was both delicious and beautifully presented': 'Chiếc sandwich vừa ngon vừa được trình bày đẹp mắt.',
    'i might return to try different types of drinks next time': 'Có thể lần sau tôi sẽ quay lại để thử các loại đồ uống khác.',
    'when he was young, he began writing short stories for a magazine': 'Khi còn trẻ, anh ấy bắt đầu viết truyện ngắn cho một tạp chí.',
    'he soon wrote regularly for the magazine, but he was not satisfied': 'Anh ấy nhanh chóng viết thường xuyên cho tạp chí, nhưng vẫn chưa hài lòng.',
    'he almost left the magazine, but then he decided to create some unusual new characters': 'Anh ấy gần như rời tạp chí, nhưng sau đó quyết định tạo ra vài nhân vật mới khác thường.',
    'the characters he imagined were one of the most famous in the world': 'Những nhân vật anh ấy tưởng tượng đã trở thành một trong những nhân vật nổi tiếng nhất thế giới.',
    'this popularity made tom harper rich and successful': 'Sự nổi tiếng này giúp Tom Harper giàu có và thành công.',
    'old movies were very different from today\'s movies': 'Phim ngày xưa rất khác so với phim ngày nay.',
    'that\'s because the movies were only in black and white, and sometimes without sound': 'Đó là vì phim thời đó chỉ có màu đen trắng và đôi khi không có âm thanh.',
    'not only did these technological limitations exist, the movies were also low budget': 'Không chỉ có những hạn chế về công nghệ, các bộ phim còn có kinh phí thấp.',
    'due to the lack of money, actors also had few opportunities to earn money through acting': 'Do thiếu tiền, diễn viên cũng có ít cơ hội kiếm tiền nhờ diễn xuất.',
    'now things have changed, actors and filmmakers can earn thousands of dollars from film production': 'Ngày nay mọi thứ đã thay đổi, diễn viên và nhà làm phim có thể kiếm hàng nghìn đô la từ việc sản xuất phim.'
  };
  return translations[key] ?? roughTranslateReadingOrderSentence(sentence);
}

function normalizeReadingOrderSentence(sentence: string) {
  return normalizeTranslationKey(sentence);
}

function normalizeTranslationKey(value: string) {
  return stripHtml(value).toLowerCase().replace(/^[\s-]+/, '').replace(/[.!?]+$/, '').replace(/\s+/g, ' ').trim();
}

function getReadingOrderKeywords(sentence: string, data: TemplateData) {
  const explicit = Array.isArray(data.keywords) ? data.keywords.map(String) : [];
  const common = [
    'support from parents',
    'degree',
    'training course',
    'research team',
    'did a lot of experiments',
    'growing plants',
    'animals',
    'waiter',
    'menu',
    'crowded with people',
    'pricey',
    'sandwich',
    'delicious',
    'beautifully presented',
    'magazine',
    'not satisfied',
    'unusual new characters',
    'famous in the world',
    'popularity',
    'rich and successful',
    'old movies',
    'today\'s movies',
    'black and white',
    'without sound',
    'technological limitations',
    'low budget',
    'lack of money',
    'few opportunities',
    'earn money',
    'acting',
    'filmmakers',
    'thousands of dollars',
    'film production'
  ];
  const lowerSentence = sentence.toLowerCase();
  const fallback = extractReadingOrderKeywordPhrases(sentence);
  return [...explicit, ...common, ...fallback]
    .filter((keyword) => lowerSentence.includes(keyword.toLowerCase()))
    .filter((keyword, index, list) => list.findIndex((item) => item.toLowerCase() === keyword.toLowerCase()) === index);
}

function extractReadingOrderKeywordPhrases(sentence: string) {
  const stopwords = new Set([
    'a', 'an', 'and', 'are', 'as', 'be', 'because', 'but', 'by', 'can', 'did', 'do', 'due', 'for', 'from',
    'had', 'has', 'have', 'he', 'her', 'his', 'i', 'in', 'is', 'it', 'me', 'not', 'of', 'on', 'only',
    'or', 'she', 'so', 'sometimes', 'that', 'the', 'then', 'there', 'these', 'they', 'this', 'to',
    'was', 'were', 'with', 'without'
  ]);
  return sentence
    .replace(/[^\w'\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4 && !stopwords.has(word.toLowerCase()))
    .slice(0, 4);
}

function roughTranslateReadingOrderSentence(sentence: string) {
  const clean = sentence.replace(/^[\s-]+/, '').trim();
  const phraseMap: Array<[RegExp, string]> = [
    [/\bold movies\b/ig, 'phim ngày xưa'],
    [/\btoday's movies\b/ig, 'phim ngày nay'],
    [/\bblack and white\b/ig, 'đen trắng'],
    [/\bwithout sound\b/ig, 'không có âm thanh'],
    [/\btechnological limitations\b/ig, 'hạn chế về công nghệ'],
    [/\blow budget\b/ig, 'kinh phí thấp'],
    [/\black of money\b/ig, 'thiếu tiền'],
    [/\bfew opportunities\b/ig, 'ít cơ hội'],
    [/\bearn money\b/ig, 'kiếm tiền'],
    [/\bfilm production\b/ig, 'sản xuất phim'],
    [/\bresearch team\b/ig, 'nhóm nghiên cứu'],
    [/\btraining course\b/ig, 'khóa huấn luyện'],
    [/\bsupport from parents\b/ig, 'sự ủng hộ từ cha mẹ'],
    [/\ba skilled worker\b/ig, 'một công nhân lành nghề'],
    [/\ba teacher\b/ig, 'một giáo viên'],
    [/\bin space\b/ig, 'trong vũ trụ'],
    [/\bspaceship\b/ig, 'tàu vũ trụ'],
    [/\bgrowing plants\b/ig, 'trồng cây'],
    [/\bunusual new characters\b/ig, 'những nhân vật mới khác thường'],
    [/\bfamous in the world\b/ig, 'nổi tiếng trên thế giới'],
    [/\brich and successful\b/ig, 'giàu có và thành công'],
    [/\ba waiter\b/ig, 'một nhân viên phục vụ'],
    [/\bfinding a table\b/ig, 'tìm một bàn'],
    [/\bthe menu\b/ig, 'thực đơn'],
    [/\bcrowded with people\b/ig, 'đông người'],
    [/\bquite pricey\b/ig, 'khá đắt'],
    [/\ba sandwich\b/ig, 'một chiếc sandwich'],
    [/\bdifferent types of drinks\b/ig, 'các loại đồ uống khác nhau'],
    [/\bnext time\b/ig, 'lần sau']
  ];
  let translated = clean;
  for (const [pattern, replacement] of phraseMap) translated = translated.replace(pattern, replacement);

  const wordMap: Record<string, string> = {
    a: 'một',
    an: 'một',
    the: '',
    i: 'tôi',
    he: 'anh ấy',
    she: 'cô ấy',
    they: 'họ',
    this: 'điều này',
    these: 'những điều này',
    that: 'điều đó',
    because: 'bởi vì',
    but: 'nhưng',
    and: 'và',
    so: 'nên',
    from: 'từ',
    with: 'với',
    in: 'trong',
    on: 'trên',
    to: 'để',
    for: 'cho',
    of: 'của',
    was: 'đã',
    were: 'đã',
    is: 'là',
    are: 'là',
    had: 'có',
    have: 'có',
    can: 'có thể',
    began: 'bắt đầu',
    wrote: 'viết',
    decided: 'quyết định',
    create: 'tạo ra',
    changed: 'thay đổi',
    actors: 'diễn viên',
    filmmakers: 'nhà làm phim',
    movies: 'phim',
    movie: 'phim',
    magazine: 'tạp chí',
    characters: 'nhân vật',
    popularity: 'sự nổi tiếng',
    successful: 'thành công',
    young: 'trẻ',
    soon: 'sớm',
    regularly: 'thường xuyên',
    satisfied: 'hài lòng',
    almost: 'gần như',
    left: 'rời đi',
    imagined: 'tưởng tượng',
    world: 'thế giới',
    arrived: 'đến',
    shop: 'quán',
    early: 'sớm',
    morning: 'buổi sáng',
    menu: 'thực đơn',
    expected: 'mong đợi',
    ordered: 'gọi món',
    delicious: 'ngon',
    beautifully: 'đẹp mắt',
    presented: 'trình bày',
    return: 'quay lại',
    try: 'thử',
    drinks: 'đồ uống',
    sound: 'âm thanh',
    money: 'tiền',
    opportunities: 'cơ hội',
    acting: 'diễn xuất',
    production: 'sản xuất',
    dollars: 'đô la'
  };

  const rough = translated
    .replace(/[^\s]+/g, (token) => {
      if (/[À-ỹ]/.test(token)) return token;
      const match = token.match(/^([A-Za-z']+)([^A-Za-z']*)$/);
      if (!match) return token;
      const lower = match[1].toLowerCase();
      const replacement = wordMap[lower];
      return replacement !== undefined ? `${replacement}${match[2]}` : token;
    })
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();

  if (rough && rough !== clean && hasMostlyVietnameseText(rough)) return `Tạm dịch: ${rough}`;
  return 'Tạm dịch: Nội dung này chưa có bản dịch tiếng Việt đầy đủ.';
}

function HighlightKeywords({ sentence, data }: { sentence: string; data: TemplateData }) {
  const keywords = getReadingOrderKeywords(sentence, data).sort((left, right) => right.length - left.length);
  if (!keywords.length) return <>{sentence}</>;

  const pattern = new RegExp(`(${keywords.map(escapeRegExp).join('|')})`, 'ig');
  return (
    <>
      {sentence.split(pattern).map((part, index) => (
        keywords.some((keyword) => keyword.toLowerCase() === part.toLowerCase())
          ? <strong key={`${part}-${index}`} className="font-black text-slate-950">{part}</strong>
          : <Fragment key={`${part}-${index}`}>{part}</Fragment>
      ))}
    </>
  );
}

function HighlightForumKeywords({ text, keywords }: { text: string; keywords: string[] }) {
  const cleanText = stripHtml(text);
  const normalizedKeywords = Array.from(new Set(keywords.filter((keyword) => keyword.trim().length >= 3)))
    .sort((left, right) => right.length - left.length);
  if (!normalizedKeywords.length) return <>{cleanText}</>;

  const pattern = new RegExp(`(${normalizedKeywords.map(escapeRegExp).join('|')})`, 'ig');
  return (
    <>
      {cleanText.split(pattern).map((part, index) => (
        normalizedKeywords.some((keyword) => keyword.toLowerCase() === part.toLowerCase())
          ? <strong key={`${part}-${index}`} className="rounded bg-yellow-100 px-0.5 font-black text-slate-950">{part}</strong>
          : <Fragment key={`${part}-${index}`}>{part}</Fragment>
      ))}
    </>
  );
}

function getForumTranslation(text: string, data: TemplateData) {
  const clean = stripHtml(text).replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  const templateTranslations = data.translations ?? data.translationMap ?? data.vietnameseTranslations ?? data.viTranslations;
  if (Array.isArray(templateTranslations)) {
    const sourceTexts = [data.leftTitle, ...(data.opinions ?? []), ...(data.questions ?? [])].map((item) => normalizeTranslationKey(String(item ?? '')));
    const index = sourceTexts.findIndex((item) => item === normalizeTranslationKey(clean));
    const indexed = index >= 0 ? templateTranslations[index] : '';
    if (typeof indexed === 'string' && indexed.trim()) return indexed.trim();

    const direct = templateTranslations.find((item: any) => normalizeTranslationKey(String(item?.source ?? item?.en ?? item?.text ?? '')) === normalizeTranslationKey(clean));
    if (direct) {
      return String(direct.vi ?? direct.translation ?? direct.vn ?? direct.value ?? '').trim();
    }
  }
  if (templateTranslations && typeof templateTranslations === 'object') {
    const direct = templateTranslations[clean] ?? templateTranslations[text] ?? templateTranslations[normalizeTranslationKey(clean)];
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
  }

  const staticTranslation = getStaticForumTranslation(clean, data);
  if (staticTranslation) return staticTranslation;

  return roughTranslateForumText(clean);
}

function getForumAnswerKeywords(question: string, correctAnswer: string, data: TemplateData) {
  const correctOpinion = getForumOpinionByAnswer(correctAnswer, data);
  const questionWords = meaningfulEnglishWords(question);
  const opinionWords = meaningfulEnglishWords(correctOpinion);
  const overlap = questionWords.filter((word) => opinionWords.includes(word));
  const explicit = extractForumKeywordPhrases(question)
    .concat(extractForumKeywordPhrases(correctOpinion));
  return Array.from(new Set([...overlap, ...explicit]));
}

function getForumOpinionByAnswer(answer: string, data: TemplateData) {
  const options = data.options ?? [];
  const index = options.findIndex((option: string) => sameAnswer(option, answer));
  return index >= 0 ? String(data.opinions?.[index] ?? '') : '';
}

function meaningfulEnglishWords(text: string) {
  const stopWords = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'about', 'have', 'has', 'had',
    'was', 'were', 'are', 'is', 'be', 'been', 'being', 'will', 'would', 'could', 'should',
    'who', 'which', 'what', 'when', 'where', 'why', 'how', 'not', 'but', 'you', 'your',
    'they', 'their', 'them', 'his', 'her', 'him', 'she', 'he', 'people', 'person'
  ]);
  return stripHtml(text)
    .toLowerCase()
    .match(/[a-z][a-z'-]{2,}/g)
    ?.filter((word) => !stopWords.has(word))
    ?? [];
}

function extractForumKeywordPhrases(text: string) {
  return Array.from(stripHtml(text).matchAll(/\b[A-Z][A-Za-z'-]*(?:\s+[A-Z][A-Za-z'-]*){0,3}\b/g))
    .map((match) => match[0].trim())
    .filter((phrase) => phrase.length >= 3);
}

function getStaticForumTranslation(text: string, data?: TemplateData) {
  const key = normalizeForumStaticKey(text);
  const rawTranslations: Record<string, string> = {
    'here is the perspective of four people on the above topic. please read the content and answer the question': 'Dưới đây là quan điểm của bốn người về chủ đề trên. Hãy đọc nội dung và trả lời câu hỏi.',

    'who finds todays games harder than before': 'Ai thấy các trò chơi ngày nay khó hơn trước?',
    'who enjoyed playing with friends in childhood': 'Ai thích chơi với bạn bè khi còn nhỏ?',
    'who enjoys playing with their children': 'Ai thích chơi cùng con của mình?',
    'who waited and hoped to go outside': 'Ai đã chờ đợi và mong được ra ngoài?',
    'who prefers modern games': 'Ai thích các trò chơi hiện đại hơn?',
    'who enjoyed arts as a child': 'Ai thích nghệ thuật khi còn nhỏ?',
    'who enjoyed reading books as a child': 'Ai thích đọc sách khi còn nhỏ?',

    'who finds extreme sport unimportant': 'Ai cho rằng thể thao mạo hiểm không quan trọng?',
    'who finds training before participating is important': 'Ai cho rằng việc tập luyện trước khi tham gia là quan trọng?',
    'who still likes extreme sports after playing once': 'Ai vẫn thích thể thao mạo hiểm sau khi đã thử một lần?',
    'who wants to play more extreme sport': 'Ai muốn chơi thêm nhiều môn thể thao mạo hiểm hơn?',
    'who likes traditional sports like swimming': 'Ai thích các môn thể thao truyền thống như bơi lội?',
    'who enjoys nature': 'Ai thích thiên nhiên?',
    'who always avoids playing extreme sport': 'Ai luôn tránh chơi thể thao mạo hiểm?',
    'who enjoys being outdoors when doing extreme sports': 'Ai thích ở ngoài trời khi chơi thể thao mạo hiểm?',
    'who believes extreme sports are not important': 'Ai tin rằng thể thao mạo hiểm không quan trọng?',
    'who once tried an extreme sport and enjoyed it': 'Ai từng thử một môn thể thao mạo hiểm và thích nó?',
    'who wishes to do more extreme sports in the future': 'Ai muốn chơi thêm thể thao mạo hiểm trong tương lai?',
    'who thinks preparation is necessary before doing extreme sports': 'Ai nghĩ rằng cần chuẩn bị trước khi chơi thể thao mạo hiểm?',
    'who always avoids extreme sports': 'Ai luôn tránh các môn thể thao mạo hiểm?',
    'who usually does ordinary sports': 'Ai thường chơi các môn thể thao thông thường?',

    'who experienced bad weather': 'Ai gặp thời tiết xấu?',
    'who loved one of the performances': 'Ai thích một trong các màn biểu diễn?',
    'who thought it was too expensive': 'Ai cho rằng nó quá đắt?',
    'who found the traffic difficult': 'Ai thấy việc đi lại/giao thông khó khăn?',
    'who liked the final performance of the show': 'Ai thích màn biểu diễn cuối cùng của chương trình?',
    'who didnt like the festival overall': 'Ai nhìn chung không thích lễ hội?',
    'who liked the location': 'Ai thích địa điểm?',
    'who enjoyed the music throughout all the festival': 'Ai thích âm nhạc trong suốt lễ hội?',
    'who only liked the last day': 'Ai chỉ thích ngày cuối cùng?',
    'who was disappointed with the weather': 'Ai thất vọng vì thời tiết?',
    'who met old friends again': 'Ai gặp lại bạn cũ?',
    'who thought the location was not good': 'Ai cho rằng địa điểm không tốt?',
    'who liked the last performance of the show': 'Ai thích màn biểu diễn cuối cùng của chương trình?',
    'who was disappointed with the festival': 'Ai thất vọng về lễ hội?',
    'who liked to meet old friends': 'Ai thích gặp lại bạn cũ?',
    'who enjoyed the music at the event': 'Ai thích âm nhạc tại sự kiện?',
    'who didnt like the venue': 'Ai không thích địa điểm tổ chức?',

    'who wants to enhance their future career': 'Ai muốn phát triển sự nghiệp tương lai?',
    'who helps support charity work with money': 'Ai hỗ trợ hoạt động từ thiện bằng tiền?',
    'who thinks it should help the local community': 'Ai nghĩ rằng nên giúp đỡ cộng đồng địa phương?',
    'who thinks volunteering helps improve physical health': 'Ai nghĩ rằng hoạt động tình nguyện giúp cải thiện sức khỏe thể chất?',
    'who thinks it can improve knowledge about culture': 'Ai nghĩ rằng điều đó có thể nâng cao hiểu biết về văn hóa?',
    'who thinks it is a way to travel': 'Ai nghĩ rằng đó là một cách để đi du lịch?',
    'who wants to make new friends': 'Ai muốn kết bạn mới?',

    'who did not want to change to other careers': 'Ai không muốn đổi sang nghề khác?',
    'who thinks it was hard to get the first job': 'Ai nghĩ rằng rất khó để có được công việc đầu tiên?',
    'who enjoys working in a flexible work environment': 'Ai thích làm việc trong môi trường linh hoạt?',
    'who enjoyed doing things with their hands': 'Ai thích làm những việc bằng tay?',
    'who thinks their training was too long': 'Ai nghĩ rằng quá trình đào tạo của mình quá dài?',
    'who enjoyed working when training': 'Ai thích làm việc trong thời gian đào tạo?',
    'who thinks they benefited from working for free': 'Ai nghĩ rằng mình được lợi từ việc làm không lương?',
    'who likes working with their hands': 'Ai thích làm việc bằng tay?',
    'who enjoys working during their training': 'Ai thích làm việc trong quá trình đào tạo?',
    'who thinks it is very hard to get your first job': 'Ai nghĩ rằng rất khó để có công việc đầu tiên?',
    'who did not want to choose another job': 'Ai không muốn chọn công việc khác?',
    'who enjoys working in a flexible working environment': 'Ai thích làm việc trong môi trường làm việc linh hoạt?',

    'who now enjoys productivity apps': 'Ai hiện thích dùng các ứng dụng năng suất?',
    'who loved outdoor play as a child': 'Ai hồi nhỏ thích chơi ngoài trời?',
    'who enjoys family time with board games': 'Ai thích thời gian bên gia đình với các trò chơi bàn cờ?',
    'who loved organizing pretend offices as a child': 'Ai hồi nhỏ thích tổ chức trò chơi văn phòng giả lập?',
    'who finds modern schedules more flexible': 'Ai thấy lịch làm việc hiện đại linh hoạt hơn?',
    'who loved reading about careers as a child': 'Ai hồi nhỏ thích đọc về các nghề nghiệp?',
    'who now prefers mindfulness practices': 'Ai hiện thích các bài tập chánh niệm hơn?',

    'who finds modern tools more accessible': 'Ai thấy các công cụ hiện đại dễ tiếp cận hơn?',
    'who now enjoys app development': 'Ai hiện thích phát triển ứng dụng?',
    'who loved playing with toy robots as a child': 'Ai hồi nhỏ thích chơi robot đồ chơi?',
    'who loved watching tech shows as a child': 'Ai hồi nhỏ thích xem các chương trình công nghệ?',
    'who now prefers online learning': 'Ai hiện thích học trực tuyến hơn?',
    'who enjoys coding with family': 'Ai thích lập trình cùng gia đình?',
    'who loved science magazines as a child': 'Ai hồi nhỏ thích tạp chí khoa học?',
    'who now enjoys 3d modeling': 'Ai hiện thích mô hình hóa 3D?',
    'who finds modern platforms user friendly': 'Ai thấy các nền tảng hiện đại thân thiện với người dùng?',
    'who loved playing with programmable toys as a child': 'Ai hồi nhỏ thích chơi đồ chơi lập trình được?',
    'who loved exploring early computers as a child': 'Ai hồi nhỏ thích khám phá máy tính đời đầu?',
    'who enjoys creating tech projects with family': 'Ai thích tạo dự án công nghệ cùng gia đình?',
    'who loved reading about inventions as a child': 'Ai hồi nhỏ thích đọc về các phát minh?',
    'who now prefers tech podcasts': 'Ai hiện thích podcast công nghệ hơn?',

    'who now enjoys graphic design': 'Ai hiện thích thiết kế đồ họa?',
    'who loved camping as a child': 'Ai hồi nhỏ thích cắm trại?',
    'who finds modern books more engaging': 'Ai thấy sách hiện đại hấp dẫn hơn?',
    'who loved drawing as a child': 'Ai hồi nhỏ thích vẽ?',
    'who now prefers museum visits': 'Ai hiện thích đi bảo tàng hơn?',
    'who enjoys storytelling with family': 'Ai thích kể chuyện cùng gia đình?',
    'who loved bike riding as a child': 'Ai hồi nhỏ thích đi xe đạp?',

    'who now enjoys video games': 'Ai hiện thích trò chơi điện tử?',
    'who enjoys podcasting with friends': 'Ai thích làm podcast cùng bạn bè?',
    'who loved swimming as a child': 'Ai hồi nhỏ thích bơi?',
    'who loved puzzles as a child': 'Ai hồi nhỏ thích trò ghép hình?',
    'who now prefers yoga': 'Ai hiện thích yoga hơn?',
    'who loved kite flying as a child': 'Ai hồi nhỏ thích thả diều?',
    'who finds modern apps easier to use': 'Ai thấy các ứng dụng hiện đại dễ sử dụng hơn?',

    'before diving into any extreme sport, i truly believe its crucial to undergo proper training. while these activities can be thrilling, they also carry risks if youre not well-prepared. ive witnessed people injuring themselves simply because they didnt take the necessary precautions. thats why i always make sure to complete a training program and familiarize myself with the safety guidelines before trying something new. with the right preparation, extreme sports can be an amazing experience': 'Trước khi tham gia bất kỳ môn thể thao mạo hiểm nào, tôi thực sự tin rằng việc được huấn luyện đúng cách là rất quan trọng. Những hoạt động này có thể rất thú vị, nhưng cũng tiềm ẩn rủi ro nếu bạn không chuẩn bị kỹ. Tôi từng chứng kiến nhiều người bị chấn thương chỉ vì họ không thực hiện các biện pháp phòng ngừa cần thiết. Vì vậy, tôi luôn đảm bảo hoàn thành một chương trình huấn luyện và làm quen với các hướng dẫn an toàn trước khi thử điều gì mới. Với sự chuẩn bị đúng đắn, thể thao mạo hiểm có thể là một trải nghiệm tuyệt vời.',
    'ive always had a fondness for more traditional sports such as swimming, running, and tennis. theyre enjoyable and easy to incorporate into a routine. however, a few months ago, i had the chance to go bungee jumping during a vacation, and it turned out to be an unforgettable experience. i didnt anticipate having so much fun! while i still prefer regular sports for daily exercise, i now feel much more open to trying extreme sports occasionally for the thrill': 'Tôi luôn yêu thích các môn thể thao truyền thống hơn như bơi lội, chạy bộ và quần vợt. Chúng thú vị và dễ đưa vào thói quen hằng ngày. Tuy nhiên, vài tháng trước, tôi có cơ hội thử nhảy bungee trong một kỳ nghỉ, và đó hóa ra là một trải nghiệm khó quên. Tôi không ngờ mình lại vui đến vậy! Dù tôi vẫn thích các môn thể thao thông thường để tập luyện hằng ngày hơn, bây giờ tôi cởi mở hơn nhiều với việc thỉnh thoảng thử thể thao mạo hiểm để tìm cảm giác mạnh.',
    'what i appreciate most about extreme sports is the unique way they allow me to connect with nature. activities like rock climbing and mountain biking enable me to explore stunning landscapes while also pushing my physical and mental limits. its an escape from the everyday routine, and it makes me feel truly alive. if i had more time and resources, i would love to engage in these sports more frequently, particularly in wild, remote locations': 'Điều tôi thích nhất ở thể thao mạo hiểm là cách đặc biệt mà chúng giúp tôi kết nối với thiên nhiên. Những hoạt động như leo núi đá và đạp xe địa hình cho phép tôi khám phá những cảnh quan tuyệt đẹp, đồng thời thử thách giới hạn thể chất và tinh thần của bản thân. Đó là cách thoát khỏi thói quen hằng ngày và khiến tôi cảm thấy thực sự sống động. Nếu có nhiều thời gian và điều kiện hơn, tôi rất muốn tham gia các môn này thường xuyên hơn, đặc biệt ở những nơi hoang dã và xa xôi.',
    'i understand that some people find extreme sports exhilarating, but theyve never been significant to me. in fact, i try to avoid them whenever i can. im not fond of the idea of placing myself in risky situations just for the sake of excitement. there are many safer alternatives to staying active and enjoying life. id much rather take a peaceful walk or do some yoga than jump out of an airplane or scale a mountain. its simply not my cup of tea': 'Tôi hiểu rằng một số người thấy thể thao mạo hiểm rất phấn khích, nhưng chúng chưa bao giờ quan trọng với tôi. Thực tế, tôi cố gắng tránh chúng bất cứ khi nào có thể. Tôi không thích ý tưởng đặt bản thân vào những tình huống rủi ro chỉ để tìm cảm giác mạnh. Có nhiều cách an toàn hơn để duy trì vận động và tận hưởng cuộc sống. Tôi thà đi bộ thư giãn hoặc tập yoga còn hơn nhảy khỏi máy bay hay leo núi. Đơn giản là nó không hợp với tôi.'
    ,
    'a in the past, i really liked playing board games. now, to limit the children from using computers, i often spend time playing with them. however, i have struggled with them because the games nowadays have more characters and rules, making us think a lot every time we play. despite this, my children and i still like it and have a good time together': 'A: Trước đây, tôi rất thích chơi các trò chơi bàn cờ. Bây giờ, để hạn chế trẻ em sử dụng máy tính, tôi thường dành thời gian chơi cùng các con. Tuy nhiên, tôi gặp khó khăn với các trò chơi này vì trò chơi ngày nay có nhiều nhân vật và luật chơi hơn, khiến chúng tôi phải suy nghĩ rất nhiều mỗi lần chơi. Dù vậy, các con tôi và tôi vẫn thích chúng và có khoảng thời gian vui vẻ bên nhau.',
    'b when i was a child, i often played soccer with other children of the same age. we usually played in the schoolyard and sometimes in the open spaces of the neighborhood. we divided into small teams and chased the ball until we were all tired': 'B: Khi còn nhỏ, tôi thường chơi bóng đá với những đứa trẻ cùng tuổi. Chúng tôi thường chơi ở sân trường và đôi khi ở những khoảng đất trống trong khu phố. Chúng tôi chia thành các đội nhỏ và đuổi theo quả bóng cho đến khi tất cả đều mệt.',
    'c when i was a child, i didnt like going out to play, so i chose reading books as a form of entertainment. the stories described in the pages of books helped me discover my own world. later, when i grew up, i started liking modern games with eye-catching interfaces, which help me relax and increase my creativity': 'C: Khi còn nhỏ, tôi không thích ra ngoài chơi, nên tôi chọn đọc sách như một hình thức giải trí. Những câu chuyện trong các trang sách giúp tôi khám phá thế giới riêng của mình. Sau này khi lớn lên, tôi bắt đầu thích các trò chơi hiện đại có giao diện bắt mắt, vì chúng giúp tôi thư giãn và tăng khả năng sáng tạo.',
    'd when i was a child, i really liked outdoor activities. i remember that on bad weather days, i was always by the window, glued to it, looking outside and praying for the rain to stop. at those times, my mother often gave me paper and a box of crayons. i really enjoyed that drawing activity and often drew at home when the weather was bad': 'D: Khi còn nhỏ, tôi rất thích các hoạt động ngoài trời. Tôi nhớ rằng vào những ngày thời tiết xấu, tôi luôn đứng bên cửa sổ, dán mắt nhìn ra ngoài và cầu cho mưa tạnh. Những lúc đó, mẹ thường đưa cho tôi giấy và một hộp bút màu. Tôi rất thích hoạt động vẽ tranh đó và thường vẽ ở nhà khi thời tiết xấu.'
  };

  const translations = Object.fromEntries(
    Object.entries(rawTranslations).map(([source, translation]) => [normalizeForumStaticKey(source), translation])
  );
  return translations[key] ?? getStaticForumOpinionTranslation(text, data);
}

function getStaticForumOpinionTranslation(text: string, data?: TemplateData) {
  const topicKey = getForumTopicKey(data?.topic ?? '');
  const label = getForumOpinionLabel(text);
  if (!topicKey || !label) return '';

  const translations: Record<string, Record<string, string>> = {
    games: {
      A: 'A: Trước đây, tôi rất thích chơi các trò chơi bàn cờ. Bây giờ, để hạn chế trẻ em sử dụng máy tính, tôi thường dành thời gian chơi cùng các con. Tuy nhiên, tôi gặp khó khăn với các trò chơi này vì trò chơi ngày nay có nhiều nhân vật và luật chơi hơn, khiến chúng tôi phải suy nghĩ rất nhiều mỗi lần chơi. Dù vậy, các con tôi và tôi vẫn thích chúng và có khoảng thời gian vui vẻ bên nhau.',
      B: 'B: Khi còn nhỏ, tôi thường chơi bóng đá với những đứa trẻ cùng tuổi. Chúng tôi thường chơi ở sân trường và đôi khi ở những khoảng đất trống trong khu phố. Chúng tôi chia thành các đội nhỏ và đuổi theo quả bóng cho đến khi tất cả đều mệt.',
      C: 'C: Khi còn nhỏ, tôi không thích ra ngoài chơi, nên tôi chọn đọc sách như một hình thức giải trí. Những câu chuyện trong các trang sách giúp tôi khám phá thế giới riêng của mình. Sau này khi lớn lên, tôi bắt đầu thích các trò chơi hiện đại có giao diện bắt mắt, vì chúng giúp tôi thư giãn và tăng khả năng sáng tạo.',
      D: 'D: Khi còn nhỏ, tôi rất thích các hoạt động ngoài trời. Tôi nhớ rằng vào những ngày thời tiết xấu, tôi luôn đứng bên cửa sổ, dán mắt nhìn ra ngoài và cầu cho mưa tạnh. Những lúc đó, mẹ thường đưa cho tôi giấy và một hộp bút màu. Tôi rất thích hoạt động vẽ tranh đó và thường vẽ ở nhà khi thời tiết xấu.'
    },
    'extreme-1': {
      A: 'A: Trước khi tham gia bất kỳ môn thể thao mạo hiểm nào, tôi thực sự tin rằng việc được huấn luyện đúng cách là rất quan trọng. Những hoạt động này có thể rất thú vị, nhưng cũng tiềm ẩn rủi ro nếu bạn không chuẩn bị kỹ. Tôi từng chứng kiến nhiều người bị chấn thương chỉ vì họ không thực hiện các biện pháp phòng ngừa cần thiết. Vì vậy, tôi luôn đảm bảo hoàn thành một chương trình huấn luyện và làm quen với các hướng dẫn an toàn trước khi thử điều gì mới. Với sự chuẩn bị đúng đắn, thể thao mạo hiểm có thể là một trải nghiệm tuyệt vời.',
      B: 'B: Tôi luôn yêu thích các môn thể thao truyền thống hơn như bơi lội, chạy bộ và quần vợt. Chúng thú vị và dễ đưa vào thói quen hằng ngày. Tuy nhiên, vài tháng trước, tôi có cơ hội thử nhảy bungee trong một kỳ nghỉ, và đó hóa ra là một trải nghiệm khó quên. Tôi không ngờ mình lại vui đến vậy! Dù tôi vẫn thích các môn thể thao thông thường để tập luyện hằng ngày hơn, bây giờ tôi cởi mở hơn nhiều với việc thỉnh thoảng thử thể thao mạo hiểm để tìm cảm giác mạnh.',
      C: 'C: Điều tôi thích nhất ở thể thao mạo hiểm là cách đặc biệt mà chúng giúp tôi kết nối với thiên nhiên. Những hoạt động như leo núi đá và đạp xe địa hình cho phép tôi khám phá những cảnh quan tuyệt đẹp, đồng thời thử thách giới hạn thể chất và tinh thần của bản thân. Đó là cách thoát khỏi thói quen hằng ngày và khiến tôi cảm thấy thực sự sống động. Nếu có nhiều thời gian và điều kiện hơn, tôi rất muốn tham gia các môn này thường xuyên hơn, đặc biệt ở những nơi hoang dã và xa xôi.',
      D: 'D: Tôi hiểu rằng một số người thấy thể thao mạo hiểm rất phấn khích, nhưng chúng chưa bao giờ quan trọng với tôi. Thực tế, tôi cố gắng tránh chúng bất cứ khi nào có thể. Tôi không thích ý tưởng đặt bản thân vào những tình huống rủi ro chỉ để tìm cảm giác mạnh. Có nhiều cách an toàn hơn để duy trì vận động và tận hưởng cuộc sống. Tôi thà đi bộ thư giãn hoặc tập yoga còn hơn nhảy khỏi máy bay hay leo núi. Đơn giản là nó không hợp với tôi.'
    },
    'extreme-2': {
      A: 'A: Với tôi, điều quan trọng nhất trong thể thao mạo hiểm là chuẩn bị thật kỹ. Nhiều người nghĩ nó chỉ liên quan đến sự phấn khích và lòng can đảm, nhưng tôi không nhìn nhận như vậy. Nếu không được huấn luyện đúng cách, bạn rất dễ bị thương hoặc thậm chí khiến người khác gặp rủi ro. Tôi từng tham gia một khóa leo núi đá và mất nhiều tuần học cách dùng thiết bị chính xác. Sau đó, lần leo thực tế thú vị hơn nhiều vì tôi cảm thấy tự tin. Tôi tin rằng luyện tập không chỉ giúp bạn an toàn mà còn khiến trải nghiệm thoải mái và đáng giá hơn.',
      B: 'B: Tôi luôn thích các môn thể thao truyền thống như bơi lội và chạy bộ vì chúng giúp tôi khỏe mạnh mà không quá rủi ro. Dù vậy, tôi tò mò cảm giác chơi thể thao mạo hiểm sẽ như thế nào, nên năm ngoái tôi thử nhảy bungee trong kỳ nghỉ. Ban đầu tôi rất lo lắng, nhưng khi nhảy xuống, cảm giác thật tuyệt vời. Đó là kiểu phấn khích tôi chưa từng trải qua. Dù thế, tôi vẫn bơi mỗi tuần vì an toàn và thực tế hơn, nhưng tôi thừa nhận thể thao mạo hiểm rất đáng thử ít nhất một lần.',
      C: 'C: Thành thật mà nói, tôi không thật sự hiểu vì sao mọi người thích thể thao mạo hiểm. Chúng có vẻ nguy hiểm và không cần thiết với tôi. Tôi chưa từng thử và cũng không có ý định thử. Một vài người bạn rủ tôi đi trượt tuyết hoặc dù lượn, nhưng tôi luôn từ chối. Không phải tôi ghét thể thao; thật ra tôi thích đạp xe và quần vợt, nhưng tôi không thấy lý do gì để mạo hiểm sức khỏe chỉ vì vài giây phấn khích. Theo tôi, thể thao mạo hiểm không cần thiết để hạnh phúc, nên tôi tránh chúng bất cứ khi nào có thể.',
      D: 'D: Điều tôi yêu thích nhất ở thể thao mạo hiểm là chúng thường diễn ra ở những khung cảnh thiên nhiên tuyệt đẹp. Mùa hè năm ngoái, tôi chèo kayak trên một dòng sông hoang sơ, và phong cảnh thật ngoạn mục. Tôi cũng thử đạp xe địa hình qua rừng và rất thích cảm giác không khí trong lành cùng sự tự do. Với tôi, không chỉ là môn thể thao, mà còn là cảm giác được bao quanh bởi núi non, cây cối và sông suối. Đôi khi tôi ước mình có thêm thời gian và tiền bạc để tham gia những hoạt động này thường xuyên hơn. Thể thao mạo hiểm tiếp thêm năng lượng và khiến tôi cảm thấy gần gũi với thiên nhiên.'
    },
    'music-1': {
      A: 'A: Tôi ở lại lễ hội đến tận khoảnh khắc cuối cùng và cực kỳ thích màn kết thúc hoành tráng. Sân khấu bừng sáng với ánh đèn rực rỡ và pháo hoa, tạo nên bầu không khí khó quên. Dù việc di chuyển đến đó khá vất vả vì kẹt xe và xe buýt đông, nhưng khi tôi đến nơi, mọi bất tiện đều tan biến. Cuối cùng, màn biểu diễn cuối cùng khiến mọi khó khăn đều xứng đáng.',
      B: 'B: Bình thường tôi tránh các lễ hội, nhưng lần này tôi quyết định thử tham gia. Không may là tôi đã không có khoảng thời gian vui vẻ. Chất lượng âm thanh kém, lịch trình sự kiện khá lộn xộn, và tệ hơn nữa là trời bắt đầu mưa rất to. Mặt đất lầy lội khiến mọi thứ còn khó chịu hơn. Thành thật mà nói, tôi không nghĩ lễ hội này đáng công. Điểm sáng duy nhất với tôi là công viên đẹp nơi tổ chức lễ hội.',
      C: 'C: Tôi rất thích bầu không khí sôi động do âm nhạc tạo ra. Một ban nhạc trong đêm mở màn tuyệt vời đến mức tôi không thể không hát theo. Tuy nhiên, mọi thứ khá đắt. Vé đắt, đồ ăn và đồ uống cũng bị tính giá quá cao. Cuối cùng tôi đã tiêu nhiều hơn dự định. Dù các màn biểu diễn rất hay, tôi hy vọng ban tổ chức sẽ giảm giá vào năm sau.',
      D: 'D: Với tôi, phần đáng nhớ nhất của lễ hội là địa điểm. Công viên bên sông rất rộng và đẹp, có nhiều chỗ để ngồi nghỉ giữa các màn biểu diễn. Tôi đã ăn một bữa trưa ngon ở đó, dù hơi đắt. Một vài tiết mục khá thú vị, nhưng tôi không ở lại toàn bộ sự kiện. Nhìn chung, chính địa điểm là điều để lại ấn tượng lớn nhất với tôi.'
    },
    'music-2': {
      A: 'A: Tôi đã đến lễ hội, nhưng ngày đầu tiên tôi không thích lắm. Nó hơi nhàm chán và không thật sự thú vị. Dù vậy, sân khấu sáng rực với đèn và pháo hoa, còn bầu không khí chung thì khó quên. Âm nhạc khiến tâm trạng tôi tốt hơn và làm tôi thật sự vui. Điều thú vị là đến ngày cuối cùng, mọi thứ có vẻ khác hẳn, tôi bắt đầu thích nó hơn nhiều. Cuối cùng, tôi rất vui vì đã quyết định đi.',
      B: 'B: Tôi đã đến lễ hội này hằng năm và tất nhiên năm nay cũng tham gia. Nhưng thật lòng, tôi không thích âm nhạc ở đó, và thời tiết làm mọi chuyện tệ hơn. Trời mưa liên tục, khiến mặt đất lầy lội và khó chịu cho mọi người. Sau trải nghiệm này, tôi nghĩ năm sau mình sẽ không đi nữa.',
      C: 'C: Tôi cực kỳ thích năng lượng của âm nhạc và tận hưởng toàn bộ chương trình từ đầu đến cuối. Dù trời có mưa một chút, điều đó không làm tôi phiền. Điều duy nhất tôi không thích là vé quá đắt; tôi đã tiêu nhiều hơn dự định. Dù vậy, tôi vẫn có khoảng thời gian rất vui và hy vọng ban tổ chức sẽ cân nhắc giảm giá trong tương lai.',
      D: 'D: Tôi là một trong những nhạc công biểu diễn vào ngày đầu tiên của lễ hội, và tôi cũng gặp vài ban nhạc quen ở đó. Dù chỉ chơi vài bài, tôi vẫn ở lại đến khi sự kiện kết thúc. Tiền công không cao, nhưng tôi thật sự vui vì được gặp lại bạn bè. Tuy nhiên, tôi vẫn nghĩ về quãng đường di chuyển xa vì địa điểm khá xa trung tâm thành phố.'
    },
    'music-3': {
      A: 'A: Đây là lần đầu tiên tôi tham dự Music Festival, và thật lòng mà nói thời tiết không ủng hộ chút nào. Trời mưa to trong hai ngày đầu, khiến việc tận hưởng các hoạt động ngoài trời trở nên khó khăn. Tôi thậm chí vẫn bị ướt trong lều. Nhưng tôi không để điều đó phá hỏng trải nghiệm. Vào ngày cuối cùng, trời quang đãng và các màn biểu diễn thật sự tuyệt vời, đặc biệt là tiết mục cuối buổi tối. Ngày cuối đó khiến mọi thứ trở nên xứng đáng, và tôi ra về với nhiều kỷ niệm đẹp dù thời tiết xấu.',
      B: 'B: Tôi đã đến lễ hội này vài lần trước đây; những lần trước chất lượng khá tốt, nhưng lần này thì hoàn toàn khác. Chất lượng âm thanh không tốt, và cả sự kiện có cảm giác thiếu tổ chức. Không có đủ tiện nghi, nhân viên cũng có vẻ không chuẩn bị tốt để xử lý đám đông. Tôi thậm chí không thể tương tác với ban nhạc. Tôi không nghĩ mình sẽ quay lại vào năm sau. Đơn giản là nó không còn đáng tiền hay đáng thời gian nữa.',
      C: 'C: Lễ hội năm nay có một trong những đội hình biểu diễn hay nhất mà tôi từng thấy. Tôi cực kỳ thích năng lượng của các màn trình diễn, và âm nhạc rất đúng gu trong suốt cuối tuần. Tuy nhiên, tôi phải nói rằng giá vé quá cao, đặc biệt với sinh viên. Tôi trả gần gấp đôi so với hai năm trước, và dù tôi thích âm nhạc, tôi không chắc nó đáng với số tiền bỏ ra. Nếu năm sau họ không giảm giá, nhiều người có thể sẽ bỏ qua.',
      D: 'D: Chúng tôi biểu diễn trong một ban nhạc và hoàn thành tiết mục vào buổi sáng. Tuy nhiên, tôi ở lại lễ hội để gặp vài người bạn cũ trong ban nhạc. Chúng tôi nói chuyện rất nhiều. Dù vậy, tôi không thích địa điểm tổ chức. Nó quá đông và không được tổ chức tốt. Đường đến khu lều cũng bị ùn tắc. Tôi nghĩ năm sau họ nên chọn địa điểm tốt hơn.'
    },
    technology: {
      A: 'A: Khi còn nhỏ, tôi thích chơi những trò chơi máy tính đơn giản do bố lập trình cho tôi. Ngày nay, tôi dạy các con lập trình bằng những nền tảng dễ dùng như Scratch. Những công cụ này khiến việc học lập trình trở nên thú vị, dù tôi vẫn dành thời gian giúp các con hiểu logic phía sau. Cùng nhau lập trình giúp phát triển cả sự sáng tạo và tinh thần làm việc nhóm.',
      B: 'B: Khi còn nhỏ, tôi rất thích dành thời gian cùng bạn bè lắp ráp và điều khiển robot đồ chơi. Tôi sẽ không bao giờ quên cảm giác hào hứng khi làm chúng chuyển động. Những trải nghiệm đó đã khơi dậy niềm đam mê công nghệ của tôi, và tôi vẫn nhớ về những khoảnh khắc khám phá ấy một cách trìu mến.',
      C: 'C: Khi còn nhỏ, tôi bị cuốn hút bởi các tạp chí khoa học về robot và máy tính. Những bài viết đó nuôi dưỡng sự tò mò của tôi. Bây giờ, tôi phát triển ứng dụng di động, tạo ra các công cụ phục vụ đời sống hằng ngày. Nhờ phần mềm hiện đại, quá trình phát triển đã nhanh hơn, nhưng niềm vui đổi mới vẫn còn nguyên.',
      D: 'D: Hồi nhỏ, vào những ngày mưa, tôi thường cùng anh chị em xem các chương trình TV về thiết bị và phát minh. Chúng tôi háo hức chờ từng tập mới. Ngày nay, tôi thích học các khóa trực tuyến để cập nhật kiến thức về AI và blockchain. Chúng linh hoạt và là cách tuyệt vời để bắt kịp thế giới công nghệ thay đổi nhanh chóng.'
    },
    'technology-2': {
      A: 'A: Khi còn nhỏ, tôi thích cùng bố mẹ lắp các mạch điện đơn giản bằng bộ dụng cụ cơ bản. Ngày nay, tôi hợp tác với anh em họ làm các dự án công nghệ bằng nền tảng lập trình kéo thả. Những công cụ này làm quá trình phát triển dễ hơn, nhưng tôi luôn dành thời gian kiểm tra kỹ sản phẩm. Đó là một cách tuyệt vời để nuôi dưỡng sáng tạo và làm việc cùng nhau.',
      B: 'B: Khi còn nhỏ, tôi chơi với các đồ chơi lập trình được như thú cưng robot cùng bạn bè. Tôi vẫn nhớ cảm giác hào hứng khi lập trình chuyển động cho chúng. Những món đồ chơi ấy đã khơi dậy sự quan tâm của tôi đến logic và sự tò mò, và tôi vẫn trân trọng những trải nghiệm công nghệ đầu đời đó.',
      C: 'C: Khi lớn lên, tôi bị cuốn hút bởi sách viết về các nhà phát minh và những sáng tạo đổi mới của họ. Những câu chuyện đó truyền cảm hứng cho trí tưởng tượng của tôi. Ngày nay, tôi thiết kế nguyên mẫu bằng phần mềm mô hình hóa 3D. Công cụ bây giờ chính xác hơn nhiều, nhưng niềm vui tạo ra điều mới vẫn giống cảm giác hào hứng từ những cuốn sách tuổi thơ.',
      D: 'D: Tôi đã dành nhiều giờ khi còn nhỏ để khám phá chiếc máy tính cũ của gia đình và học các lệnh cơ bản. Những ngày mưa thường là lúc tôi ở trong nhà và thử nghiệm các phần mềm khác nhau. Hiện nay, tôi cập nhật các đổi mới mới nhất bằng cách nghe podcast công nghệ. Chúng không chỉ giải trí mà còn giúp tôi kết nối với thế giới công nghệ luôn phát triển.'
    },
    balance: {
      A: 'A: Khi còn nhỏ, tôi thích chơi trò chơi bàn cờ với bố mẹ sau những ngày làm việc bận rộn của họ. Bây giờ, tôi được chia sẻ trải nghiệm đó với chính các con mình, và tuần làm việc bốn ngày giúp chúng tôi có nhiều thời gian bên nhau hơn. Lịch trình linh hoạt rất hữu ích, nhưng tôi luôn lên kế hoạch trước để cân bằng giữa công việc và gia đình. Đó là những khoảnh khắc tạo nên kỷ niệm lâu dài.',
      B: 'B: Khi còn nhỏ, tôi thường dựng những văn phòng giả lập với bạn bè, dùng điện thoại đồ chơi và sổ tay. Tôi thích đóng vai “sếp” và tổ chức các nhiệm vụ của chúng tôi. Những trò chơi tưởng tượng đó dạy tôi nhiều bài học quý giá về tổ chức và lãnh đạo, và tôi vẫn bật cười khi nghĩ về những cuộc họp “nghiêm túc” ngày ấy.',
      C: 'C: Khi còn nhỏ, tôi say mê đọc sách về nhiều nghề nghiệp khác nhau và mơ về sự nghiệp tương lai của mình. Những cuốn sách đó truyền cảm hứng cho tham vọng của tôi. Ngày nay, tôi dựa vào các ứng dụng năng suất để theo dõi công việc trong tuần làm việc bốn ngày. Dù các ứng dụng giúp công việc hiệu quả hơn, cảm giác hào hứng khi tổ chức và lập kế hoạch vẫn như xưa.',
      D: 'D: Khi còn nhỏ, tôi dành vô số buổi tối chơi đuổi bắt với bạn bè trong khu phố. Tuy nhiên, vào những ngày mưa, tôi thường thấy buồn chán khi phải ở trong nhà. Bây giờ, sau giờ làm, tôi thực hành chánh niệm để thư giãn và nạp lại năng lượng. Điều này đặc biệt hữu ích với tuần làm việc ngắn hơn vì nó giúp tôi tập trung và tỉnh táo hơn.'
    },
    memories: {
      A: 'A: Khi còn nhỏ, tôi thích ngồi bên lò sưởi nghe ông kể chuyện dân gian. Giọng kể của ông khiến từng nhân vật trở nên sống động, và những buổi tối ấy luôn thật kỳ diệu, dạy tôi sức mạnh của trí tưởng tượng. Ngày nay, tôi chia sẻ niềm vui đó với các cháu bằng cách đọc sách truyện tương tác trên máy tính bảng. Hình ảnh động và âm thanh làm câu chuyện sinh động hơn, nhưng tôi luôn chọn nội dung phù hợp với lứa tuổi của các cháu. Với tôi, kết hợp truyền thống cũ với công nghệ hiện đại là cách đẹp để giữ việc kể chuyện sống mãi qua các thế hệ.',
      B: 'B: Khi còn nhỏ, tôi thường đạp xe quanh làng với bạn bè hầu như mỗi buổi chiều. Tôi vẫn nhớ cảm giác gió lướt qua mặt, sự hào hứng khi đua xe với nhau và cảm giác tự do thuần khiết mà nó mang lại. Những chuyến đi đơn giản ấy không chỉ vui mà còn dạy tôi cảm giác độc lập và phiêu lưu. Ngày nay, hơi buồn khi thấy nhiều trẻ em dành nhiều thời gian trong nhà, dán mắt vào màn hình thay vì khám phá bên ngoài. Nghĩ lại, tôi nhận ra những khoảnh khắc ấy đã giúp tôi yêu thiên nhiên và trân trọng tình bạn lâu dài.',
      C: 'C: Khi còn nhỏ, tôi có thể dành hàng giờ vẽ động vật, cây cối và phong cảnh bằng hộp bút màu và bút chì. Tôi thích chơi với màu sắc và hình khối rực rỡ, và luôn tự hào khoe tranh với gia đình. Một sở thích tuổi thơ đơn giản dần trở thành niềm đam mê suốt đời. Bây giờ, tôi là nhà thiết kế đồ họa, tạo tác phẩm kỹ thuật số cho nhiều khách hàng. Các công cụ thiết kế hiện đại giúp tôi thể hiện ý tưởng chính xác hơn, nhưng niềm vui sáng tạo vẫn giống như ngày xưa.',
      D: 'D: Khi lớn lên, tôi thích đi cắm trại cùng gia đình ở vùng quê. Chúng tôi dựng lều, nấu những bữa ăn đơn giản trên lửa và ngắm sao suốt đêm. Những khoảnh khắc đó khiến tôi cảm thấy gắn bó sâu sắc với thiên nhiên và để lại những ký ức khó quên. Đôi khi mưa làm hỏng kế hoạch và tôi thấy hơi buồn khi phải ở trong nhà. Ngày nay, những chuyến khám phá của tôi chuyển sang hình thức khác: tôi thích đi bảo tàng và triển lãm. Khám phá lịch sử qua hiện vật và câu chuyện cho tôi cảm giác tò mò và ngạc nhiên tương tự, chỉ yên tĩnh và thoải mái hơn.'
    },
    free: {
      A: 'A: Khi còn là thiếu niên, tôi thích ghi âm những câu chuyện ngắn bằng máy ghi băng cũ cùng anh em họ. Chúng tôi dành hàng giờ nghĩ ý tưởng và diễn lại chỉ để vui. Ngày nay, chúng tôi làm podcast bằng các ứng dụng hiện đại giúp việc chỉnh sửa và đăng tải dễ dàng, thú vị hơn. Dù công nghệ đã đơn giản hóa quá trình này, chúng tôi vẫn dành nhiều thời gian lên kế hoạch kỹ cho từng tập. Với tôi, podcast là một cách sáng tạo để bày tỏ ý tưởng và kết nối sâu hơn với mọi người.',
      B: 'B: Khi còn nhỏ, tôi dành nhiều buổi chiều nắng để thả diều trong công viên cùng anh chị em. Nhìn cánh diều bay cao lên bầu trời luôn khiến tôi hạnh phúc và hào hứng. Những khoảnh khắc đơn giản nhưng ý nghĩa đó dạy tôi sự kiên nhẫn và phối hợp. Đến giờ, mỗi khi thấy trẻ em thả diều, những ký ức ấm áp lại ùa về. Những ngày vô tư ấy sẽ luôn là một trong những kỷ niệm tuổi thơ yêu thích của tôi.',
      C: 'C: Khi còn nhỏ, tôi rất thích chơi ghép hình cùng gia đình. Việc cẩn thận đặt từng mảnh vào đúng vị trí vừa vui vừa thỏa mãn. Bây giờ khi lớn hơn, tôi thường chơi các trò chơi điện tử chiến thuật, giống như phiên bản hiện đại của trò ghép hình. Chúng không chỉ giải trí mà còn giúp tôi tập trung và suy nghĩ phản biện. Với tôi, những trò chơi này mang lại cùng cảm giác thử thách và thành tựu như trò ghép hình ngày trước, chỉ năng động và tương tác hơn.',
      D: 'D: Tôi lớn lên gần một hồ nước đẹp, và bơi ở đó cùng bạn bè là một trong những điều tôi thích nhất. Đó là cách tuyệt vời để dành thời gian ngoài trời, dù những ngày mưa đôi khi khiến tôi buồn chán ở nhà. Ngày nay, tôi tập yoga để thư giãn và nạp lại năng lượng sau những giờ làm việc dài. Yoga giúp tôi bình tĩnh, cân bằng và tập trung. Nó đã trở thành một phần quan trọng trong thói quen của tôi và là cách tốt để chăm sóc cả cơ thể lẫn tinh thần.'
    },
    job: {
      A: 'A: Khi mới tốt nghiệp, tôi không chắc mình nên làm gì, nên tôi tham gia vài chương trình tình nguyện với các công ty và tổ chức khác nhau để lấy kinh nghiệm. Tôi rất thích làm tình nguyện vì nó giúp tôi quyết định con đường nghề nghiệp và đem lại nhiều bài học quý giá. Tôi cũng tin rằng mình đã tạo ra sự khác biệt thông qua công việc đó.',
      B: 'B: Khi còn đi học, tôi đã biết mình muốn trở thành giáo viên, nên tôi không cần thử các công việc khác. Tôi quyết định học ngành giáo dục ở đại học, ngành này miễn phí ở đất nước tôi. Mùa hè năm ngoái, tôi thực tập ở các trường địa phương, và điều đó cực kỳ hữu ích cho sự nghiệp tương lai.',
      C: 'C: Khi còn trẻ, tôi từng giúp người hàng xóm làm thợ sửa ống nước với những việc đơn giản như đo ống, tháo ốc và dùng dụng cụ. Việc học loại công việc đó đến với tôi rất tự nhiên, nên sau này tôi học hai năm ở đại học để trở thành thợ điện. Bây giờ, tôi biết có các khóa học ngắn hơn trong lĩnh vực này và tiếc vì đã không chọn chúng thay thế.',
      D: 'D: Sau khi tốt nghiệp, tôi thấy rất khó kiếm việc. Tôi nộp đơn cho nhiều công ty nhưng không nơi nào nhận vì tôi thiếu kinh nghiệm. Cuối cùng, tôi tìm được việc ở một công ty trò chơi cho phép làm việc tại nhà. Điều đó không ảnh hưởng lịch sinh hoạt hằng ngày của tôi; tôi làm ban đêm trong khi đồng nghiệp làm ban ngày, và cách sắp xếp đó rất phù hợp với tôi.'
    },
    volunteering: {
      A: 'A: Tôi rất bận và hiếm khi có thời gian rảnh, nên ngay cả dành vài giờ làm tình nguyện cũng khá khó. Tôi sẽ phải xin nghỉ nửa ngày làm việc. Tôi thấy nhiều người cần giúp đỡ và họ thật sự cần hỗ trợ tài chính thêm. Đó là điều tôi có thể giúp vì tôi có mức lương tốt. Quyên góp hằng tháng không phải vấn đề với tôi; đó là cách tôi thể hiện sự ủng hộ và đóng góp.',
      B: 'B: Một số người thích làm tình nguyện ở nước ngoài, nhưng thật lòng tôi cảm thấy phần lớn họ quan tâm đến du lịch hơn. Tôi tin rằng chúng ta nên dùng thời gian ý nghĩa hơn. Mỗi thị trấn đều có nhiều người cần giúp đỡ. Hoàn cảnh của họ khó khăn và họ thiếu điều kiện để cải thiện chất lượng cuộc sống. Họ là những người đã đóng góp nhiều cho đất nước. Chia sẻ câu chuyện với họ giúp chúng ta hiểu sự khác biệt giữa các thế hệ. Chúng ta cũng có thể mở rộng hiểu biết về lịch sử, truyền thống và văn hóa địa phương qua trải nghiệm của họ.',
      C: 'C: Tôi tin rằng có nhiều cách để thể hiện lòng tốt thông qua hoạt động tình nguyện. Hiện tôi đã nghỉ hưu và đang giúp xây nhà cho người cần hỗ trợ. Tôi làm việc với một tổ chức tình nguyện có kế hoạch rõ ràng và chuẩn bị tốt. Qua công việc này, tôi có cơ hội trải nghiệm nhiều nền văn hóa nước ngoài khác nhau. Chúng tôi thường được cử đến nhiều quốc gia để thực hiện dự án, vì vậy đây cũng là cách tuyệt vời để du lịch trong khi vẫn làm điều có ý nghĩa. Công việc này cần lao động thể chất, giúp cải thiện sức khỏe, điều mà một số người chỉ nhận ra sau một thời gian.',
      D: 'D: Mẹ bảo tôi làm tình nguyện tại địa phương vì bà là thành viên của tổ chức đó, nhưng tôi không hứng thú lắm. Tôi thích làm tình nguyện ở nước ngoài hơn vì có thể phát triển kỹ năng mềm, điều sẽ có lợi cho sự nghiệp tương lai. Ngoài ra, gặp gỡ người mới giúp tôi mở rộng mạng lưới và xây dựng các mối quan hệ giá trị để dùng sau này trong đời sống nghề nghiệp.'
    },
    career: {
      A: 'A: Sau khi tốt nghiệp, tôi muốn dành chút thời gian để tìm ra điều mình thật sự muốn. Tôi bắt đầu tìm việc tạm thời, nhưng khá khó vì hầu hết công ty không tuyển người thiếu kinh nghiệm. Cuối cùng, một công ty trò chơi liên hệ với tôi và tôi đồng ý làm cho họ. Công việc theo hình thức kết hợp, nên đôi khi tôi làm buổi tối, nhưng tôi thấy ổn với điều đó.',
      B: 'B: Tôi vào đại học ngay sau khi học xong trung học. Tôi luôn muốn trở thành giáo viên, nên không cần khám phá các lựa chọn nghề nghiệp khác. Ba tháng trước, tôi thực tập tại một trường địa phương. Đó là trải nghiệm mở mang tầm mắt, dù khối lượng công việc nặng hơn tôi mong đợi. Tuy nhiên, tôi tin rằng nó rất đáng giá.',
      C: 'C: Khi tốt nghiệp, tôi thật sự không biết mình muốn làm gì. Một số người khuyên tôi đi làm ngay, nhưng tôi muốn có kinh nghiệm thực tế trước. Vì vậy tôi ứng tuyển vào nhiều vị trí tình nguyện khác nhau. Dù không kiếm được tiền, tôi có cơ hội thử nhiều loại công việc. Nhìn lại, tôi thấy hài lòng với quyết định của mình vì những kiến thức quý giá đã có được.',
      D: 'D: Khi còn trẻ, tôi sống gần một thợ sửa ống nước và đôi khi làm việc cùng cô ấy. Cô ấy giao cho tôi những việc đơn giản như kiểm tra rò rỉ đường ống hoặc siết ốc. Vì vậy sau này, việc vào đại học để trở thành thợ điện với tôi khá tự nhiên. Bây giờ, khi thấy các khóa học điện trực tuyến ngắn hạn, tôi ước mình đã chọn chúng thay vì học đại học.'
    }
  };

  return translations[topicKey]?.[label] ?? '';
}

function normalizeForumStaticKey(value: string) {
  return stripHtml(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getForumOpinionLabel(text: string) {
  return stripHtml(text).trim().match(/^([A-D])\s*:/i)?.[1]?.toUpperCase() ?? '';
}

function getForumTopicKey(topic: string) {
  const key = normalizeForumStaticKey(topic);
  if (key.includes('games from childhood')) return 'games';
  if (key.includes('extreme sports') && key.includes('2')) return 'extreme-2';
  if (key.includes('extreme sports')) return 'extreme-1';
  if (key.includes('music festival') && key.includes('3')) return 'music-3';
  if (key.includes('music festival') && key.includes('2')) return 'music-2';
  if (key.includes('music festival')) return 'music-1';
  if (key.includes('technology in childhood') && key.includes('2')) return 'technology-2';
  if (key.includes('technology in childhood')) return 'technology';
  if (key.includes('work and life balance')) return 'balance';
  if (key.includes('childhood memories')) return 'memories';
  if (key.includes('free time activity')) return 'free';
  if (key.includes('job and trainning') || key.includes('job and training')) return 'job';
  if (key.includes('volunteering')) return 'volunteering';
  if (key.includes('career')) return 'career';
  return '';
}

function roughTranslateForumText(text: string) {
  const wordMap: Record<string, string> = {
    agree: 'đồng ý',
    disagrees: 'không đồng ý',
    disagree: 'không đồng ý',
    thinks: 'nghĩ rằng',
    thought: 'nghĩ',
    believes: 'tin rằng',
    says: 'nói rằng',
    said: 'đã nói',
    likes: 'thích',
    liked: 'đã thích',
    prefer: 'thích hơn',
    prefers: 'thích hơn',
    important: 'quan trọng',
    expensive: 'đắt',
    cheap: 'rẻ',
    difficult: 'khó',
    easy: 'dễ',
    useful: 'hữu ích',
    good: 'tốt',
    bad: 'không tốt',
    better: 'tốt hơn',
    best: 'tốt nhất',
    problem: 'vấn đề',
    problems: 'các vấn đề',
    solution: 'giải pháp',
    reason: 'lý do',
    because: 'bởi vì',
    money: 'tiền',
    time: 'thời gian',
    work: 'công việc',
    school: 'trường học',
    students: 'học sinh',
    children: 'trẻ em',
    parents: 'phụ huynh',
    friends: 'bạn bè',
    family: 'gia đình',
    city: 'thành phố',
    home: 'nhà',
    travel: 'du lịch',
    sport: 'thể thao',
    music: 'âm nhạc',
    food: 'đồ ăn',
    movie: 'bộ phim',
    movies: 'các bộ phim',
    book: 'sách',
    books: 'các sách',
    online: 'trực tuyến',
    internet: 'internet',
    computer: 'máy tính',
    technology: 'công nghệ',
    environment: 'môi trường',
    healthy: 'lành mạnh',
    health: 'sức khỏe'
  };

  const translated = text
    .replace(/[^\s]+/g, (token) => {
      if (/[À-ỹ]/.test(token)) return token;
      const match = token.match(/^([A-Za-z']+)([^A-Za-z']*)$/);
      if (!match) return token;
      const replacement = wordMap[match[1].toLowerCase()];
      return replacement ? `${replacement}${match[2]}` : token;
    })
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();

  if (translated && translated !== text && hasMostlyVietnameseText(translated)) return `Tạm dịch: ${translated}`;
  return 'Tạm dịch: Nội dung này chưa có bản dịch tiếng Việt đầy đủ.';
}

function hasMostlyVietnameseText(value: string) {
  const englishWords = value.match(/\b[a-z]{3,}\b/gi) ?? [];
  const vietnameseSignals = value.match(/[À-ỹ]|đ|Đ/g) ?? [];
  return vietnameseSignals.length >= 2 && englishWords.length <= 5;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function displayTemplateTopic(data: TemplateData) {
  const topic = cleanDisplayTopic(data.topic);
  if (topic && !isGenericTemplateTopic(topic)) return topic;
  return inferTemplateTopic(data);
}

function cleanDisplayTopic(value?: string) {
  return repairMojibake(value ?? '').replace(/^topic:\s*/i, '').trim();
}

function isGenericTemplateTopic(value: string) {
  return /^(reading|listening|grammar|writing|speaking)\s+(question|part)\s*\d+$/i.test(value.trim()) || isTechnicalTopicName(value);
}

function inferTemplateTopic(data: TemplateData) {
  const contentCandidates = [
    data.title,
    data.prompt,
    data.leftTitle,
    ...(Array.isArray(data.correctSentences) ? data.correctSentences : []),
    ...(Array.isArray(data.sentences) ? data.sentences : []),
    ...(Array.isArray(data.displaySentences) ? data.displaySentences : []),
    ...(Array.isArray(data.paragraphs) ? data.paragraphs : []),
    ...(Array.isArray(data.opinions) ? data.opinions : []),
    ...(Array.isArray(data.questions) ? data.questions : []),
    data.instructions
  ]
    .map((value) => cleanDisplayTopic(String(value ?? '')))
    .filter(Boolean);

  for (const candidate of contentCandidates) {
    const inferred = inferTopicFromText(candidate);
    if (inferred) return inferred;
  }

  return fallbackTopicFromContent(contentCandidates);
}

function inferTopicFromText(value: string) {
  const text = stripHtml(value).replace(/\s+/g, ' ').trim();
  const explicit = text.match(/\b(?:about|on|regarding|views on|topic is)\s+([A-Za-z][A-Za-z\s-]{2,60}?)(?:[.,;:]|\s+with\b|\s+and\b|$)/i);
  if (explicit?.[1]) return toTitleCase(cleanInferredTopic(explicit[1]));

  const nouns = text.match(/\b(?:workshop|meeting|event|club|course|project|festival|competition|survey|program|programme)\s+(?:about|on|for)\s+([A-Za-z][A-Za-z\s-]{2,60}?)(?:[.,;:]|$)/i);
  if (nouns?.[1]) return toTitleCase(cleanInferredTopic(nouns[1]));

  return '';
}

function fallbackTopicFromContent(candidates: string[]) {
  const candidate = candidates
    .map((value) => stripHtml(value).replace(/\s+/g, ' ').trim())
    .find((value) => value && !isGenericInstruction(value) && !isGenericTemplateTopic(value));
  if (!candidate) return '';
  return summarizeTopic(candidate);
}

function isGenericInstruction(value: string) {
  return /^(put|choose|read|listen|match|select|complete|answer)\b/i.test(value)
    || /sentences below|right order|correct answer|first sentence is done/i.test(value);
}

function summarizeTopic(value: string) {
  const cleaned = value
    .replace(/^[A-Z]\.\s*/, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[.!?].*$/, '')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 8).join(' ');
  return toTitleCase(words || cleaned);
}

function stripHtml(value: string) {
  return repairMojibake(value).replace(/<[^>]*>/g, ' ');
}

function cleanInferredTopic(value: string) {
  return value
    .replace(/\b(?:the|a|an)\s+$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(value: string) {
  return value.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function evaluateTemplateAnswer(data: TemplateData | null, value: string) {
  let saved: Record<string, string>;
  try {
    saved = JSON.parse(value);
  } catch {
    return false;
  }
  if (data?.template === 'LISTENING_AUDIO_MC' && data.groups?.some((group: any) => group.correctAnswer)) {
    return data.groups.every((group: any, index: number) => !group.correctAnswer || saved[`g${index}`] === group.correctAnswer);
  }
  if (data?.template === 'READING_GAP_FILL') {
    const correctAnswers = getReadingGapCorrectAnswers(data);
    if (!correctAnswers.length) return null;
    return correctAnswers.every((answer, index) => saved[`gap${index}`] === answer);
  }
  if (data?.template === 'READING_SENTENCE_ORDER') {
    const displaySentences = getReadingOrderDisplaySentences(data);
    const order = Array.isArray(saved.order) ? saved.order : displaySentences;
    const correctOrder = getReadingOrderCorrectSentences(data);
    if (!correctOrder.length) return null;
    return order.length === correctOrder.length && correctOrder.every((sentence, index) => order[index] === sentence);
  }
  if (data?.template === 'READING_FORUM_MATCH') {
    if (!data.correctAnswers?.length) return null;
    return data.correctAnswers.every((answer: string, index: number) => saved[`forum${index}`] === answer);
  }
  if (data?.template === 'READING_HEADING_MATCH') {
    if (!data.correctAnswers?.length) return null;
    return data.correctAnswers.every((answer: string, index: number) => saved[`heading${index}`] === answer);
  }
  if (data?.template === 'GRAMMAR_CHOICE') {
    return Boolean(data.correctAnswer) && saved.choice === data.correctAnswer;
  }
  if (data?.template === 'GRAMMAR_MATCH' || data?.template === 'GRAMMAR_GAP_SELECT') {
    const correctAnswers = getGrammarCorrectAnswers(data);
    if (!correctAnswers.length) return null;
    return correctAnswers.every((answer, index) => saved[`grammar${index}`] === answer);
  }
  if (!data?.correctAnswers?.length) return null;
  return data.correctAnswers.every((answer: string, index: number) => saved[`r${index}`] === answer);
}

function isSelfCheckingTemplate(data: TemplateData | null) {
  return [
    'LISTENING_AUDIO_MC',
    'LISTENING_OPINION_MATCH',
    'LISTENING_PEOPLE_MATCH',
    'READING_GAP_FILL',
    'READING_SENTENCE_ORDER',
    'READING_FORUM_MATCH',
    'READING_HEADING_MATCH',
    'GRAMMAR_CHOICE',
    'GRAMMAR_MATCH',
    'GRAMMAR_GAP_SELECT'
  ].includes(data?.template ?? '');
}

function isClassicAptisTemplate(data: TemplateData | null) {
  return data?.template === 'LISTENING_AUDIO_MC'
    || data?.template === 'LISTENING_OPINION_MATCH'
    || data?.template === 'LISTENING_PEOPLE_MATCH';
}

function AptisTemplateRenderer({ data, questionId, currentNumber, totalQuestions, featured, initialClubIndex, checked, value, onChange }: {
  data: TemplateData;
  questionId: number;
  currentNumber?: number;
  totalQuestions?: number;
  featured?: boolean;
  initialClubIndex?: number;
  checked?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [dragSentence, setDragSentence] = useState('');
  const saved = useMemo<Record<string, string>>(() => {
    try {
      return value ? JSON.parse(value) : {};
    } catch {
      return {};
    }
  }, [value]);

  function setAnswer(key: string, next: string) {
    onChange(JSON.stringify({ ...saved, [key]: next }));
  }

  function patchAnswers(next: Record<string, string>) {
    onChange(JSON.stringify({ ...saved, ...next }));
  }

  const displayTotal = totalQuestions && totalQuestions > 0 ? totalQuestions : data.total;

  if (data.template === 'SPEAKING_PART1') {
    return (
      <SpeakingPart1Renderer
        data={data}
        saved={saved}
        setAnswer={setAnswer}
        patchAnswers={patchAnswers}
      />
    );
  }

  if (data.template === 'SPEAKING_PART2') {
    return (
      <SpeakingPart2Renderer
        data={data}
        saved={saved}
        setAnswer={setAnswer}
        patchAnswers={patchAnswers}
      />
    );
  }

  if (data.template === 'SPEAKING_PART3') {
    return (
      <SpeakingPart3Renderer
        data={data}
        saved={saved}
        setAnswer={setAnswer}
        patchAnswers={patchAnswers}
      />
    );
  }

  if (data.template === 'SPEAKING_PART4') {
    return (
      <SpeakingPart4Renderer
        data={data}
        saved={saved}
        setAnswer={setAnswer}
        patchAnswers={patchAnswers}
      />
    );
  }

  if (isGrammarTemplate(data)) {
    const revealAnswers = checked !== undefined || showAnswers;
    const correctAnswers = getGrammarCorrectAnswers(data);
    return (
      <AptisPaper narrow>
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-navy">
            <span className="text-brand-600">{'<'}</span>
            Question {data.questionNumber ?? currentNumber ?? 1} of {displayTotal ?? 30}
          </h1>
          {featured && <div className="mt-2"><FeaturedQuestionBadge /></div>}
          {data.instructions && <p className="mt-2 text-sm text-slate-700">{data.instructions}</p>}
        </div>

        {data.template === 'GRAMMAR_CHOICE' && (
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="mb-5 text-lg font-semibold text-navy">{data.prompt}</p>
            <div className="flex flex-wrap gap-3">
              {(data.options ?? []).map((option: string) => {
                const selected = saved.choice === option;
                const correct = data.correctAnswer === option;
                const statusClass = revealAnswers
                  ? correct
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : selected
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-brand-100 bg-white text-slate-700'
                  : selected
                    ? 'border-brand-600 bg-blue-50 text-brand-700'
                    : 'border-brand-100 bg-white text-slate-700';
                return (
                  <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-base transition ${statusClass}`} key={option}>
                    <input type="radio" checked={selected} onChange={() => setAnswer('choice', option)} />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {data.template === 'GRAMMAR_MATCH' && (
          <div className="space-y-3">
            {(data.rows ?? []).map((row: any, index: number) => {
              const selected = saved[`grammar${index}`] ?? '';
              const correct = correctAnswers[index] ?? '';
              const status = revealAnswers && correct
                ? selected === correct ? 'correct' : selected ? 'wrong' : 'answer'
                : undefined;
              return (
                <div className="grid items-center gap-4 rounded-2xl bg-white px-6 py-4 shadow-soft md:grid-cols-[240px_minmax(280px,1fr)_180px]" key={`${row.label}-${index}`}>
                  <span className="font-semibold text-navy">{row.label}</span>
                  <TemplateSelect value={selected} options={data.options ?? []} onChange={(next) => setAnswer(`grammar${index}`, next)} status={status} />
                  {revealAnswers && correct && (
                    <span className={`rounded-lg px-3 py-2 text-sm font-extrabold ${selected === correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {selected === correct ? 'Đúng' : `Đáp án: ${correct}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {data.template === 'GRAMMAR_GAP_SELECT' && (
          <div className="space-y-3">
            {(data.rows ?? []).map((row: any, index: number) => {
              const selected = saved[`grammar${index}`] ?? '';
              const correct = correctAnswers[index] ?? '';
              const status = revealAnswers && correct
                ? selected === correct ? 'correct' : selected ? 'wrong' : 'answer'
                : undefined;
              return (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-soft" key={`${row.start}-${index}`}>
                  <span>{row.start}</span>
                  <TemplateSelect value={selected} options={data.options ?? []} onChange={(next) => setAnswer(`grammar${index}`, next)} compact status={status} />
                  <span>{row.end}</span>
                  {revealAnswers && correct && (
                    <span className={`rounded-lg px-3 py-1.5 text-sm font-extrabold ${selected === correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {selected === correct ? 'Đúng' : `Đáp án: ${correct}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="rounded-lg bg-green-700 px-4 py-2 text-sm font-extrabold text-white shadow-soft hover:bg-green-800" onClick={() => setShowAnswers((value) => !value)}>
            {showAnswers ? 'Ẩn đáp án' : 'Xem đáp án'}
          </button>
        </div>
      </AptisPaper>
    );
  }

  if (data.template === 'LISTENING_AUDIO_MC') {
    const revealStatus = checked !== undefined || showAnswers;
    const topic = displayTemplateTopic(data);
    return (
      <AptisPaper classic>
        <QuestionCounter current={currentNumber} featured={featured} total={displayTotal} />
        <AudioBar text={data.playsRemaining} audioUrl={data.audioUrl} />
        <div className="rounded-2xl bg-[#eeeeee] px-4 py-5 sm:rounded-lg sm:px-5 sm:py-4">
          {topic && <h2 className="mb-4 text-base font-extrabold">Topic: {topic}</h2>}
          <div className="space-y-4">
            {(data.groups ?? []).map((group: any, groupIndex: number) => (
              <div key={groupIndex}>
                <p className="mb-1.5 text-[14px]">{group.prompt}</p>
                {(group.options ?? []).length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    File CSV hiện chưa có đáp án cho câu này, nên chưa thể hiện radio giống mẫu.
                  </div>
                ) : (
                <div className="space-y-2 sm:space-y-1.5">
                  {(group.options ?? []).map((option: string) => {
                    const selected = saved[`g${groupIndex}`] === option;
                    const isCorrect = group.correctAnswer === option;
                    const statusClass = revealStatus && group.correctAnswer
                      ? isCorrect
                        ? 'border-green-500 bg-green-50 text-green-800'
                        : selected
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-transparent'
                      : 'border-transparent';
                    return (
                    <label className={`flex min-h-10 w-full items-center gap-3 rounded-lg border px-3 py-1.5 text-[15px] sm:min-h-0 sm:w-fit sm:gap-2.5 sm:rounded-md sm:px-2 sm:py-0.5 sm:text-[14px] ${statusClass}`} key={option}>
                      <input className="h-4 w-4 shrink-0" type="radio" name={`${questionId}-${groupIndex}`} checked={saved[`g${groupIndex}`] === option} onChange={() => setAnswer(`g${groupIndex}`, option)} />
                      <span>{option}</span>
                      {showAnswers && isCorrect && <span className="text-xs font-bold text-green-700">Đáp án</span>}
                    </label>
                  );})}
                </div>
                )}
                {showAnswers && group.correctAnswer && (
                  <div className="mt-2 inline-flex rounded-lg bg-green-100 px-3 py-1.5 text-xs font-extrabold text-green-700">
                    {groupIndex + 1} là {group.correctAnswer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button type="button" className="h-11 rounded-xl bg-green-700 px-3 text-sm font-extrabold text-white shadow-soft hover:bg-green-800 sm:h-9 sm:rounded-lg sm:px-4" onClick={() => setShowAnswers((value) => !value)}>
            {showAnswers ? 'Ẩn đáp án' : 'Xem đáp án'}
          </button>
          <button type="button" className="h-11 rounded-xl bg-brand-600 px-3 text-sm font-extrabold text-white shadow-soft hover:bg-brand-700 sm:h-9 sm:rounded-lg sm:px-4" onClick={() => setShowScript((value) => !value)}>
            {showScript ? 'Ẩn đoạn văn' : 'Hiện đoạn văn'}
          </button>
        </div>
        <ListeningScriptReview scriptText={data.scriptText} checked={checked} showAnswers={showAnswers} highlightTerms={getTemplateListeningHighlightTerms(data, saved)} />
        {showScript && (
          <div className={`mt-3 whitespace-pre-line rounded border p-4 text-sm leading-6 ${data.scriptText ? 'border-slate-300 bg-sky-50 text-slate-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            {repairMojibake(data.scriptText ?? '').trim()
              ? <HighlightAnswerTerms text={repairMojibake(data.scriptText ?? '').trim()} terms={getTemplateListeningHighlightTerms(data, saved)} />
              : 'Câu này chưa có đoạn văn. Admin cần nhập transcript vào cột script_text hoặc scriptText khi import câu hỏi.'}
          </div>
        )}
      </AptisPaper>
    );
  }

  if (data.template === 'LISTENING_OPINION_MATCH' || data.template === 'LISTENING_PEOPLE_MATCH') {
    const rows = data.template === 'LISTENING_PEOPLE_MATCH' ? data.rows : data.statements;
    const revealAnswers = checked !== undefined || showAnswers;
    const topic = displayTemplateTopic(data);
    return (
      <AptisPaper classic>
        <QuestionCounter current={currentNumber} featured={featured} total={displayTotal} />
        <AudioBar text={data.playsRemaining ?? '2 of 2 plays remaining'} audioUrl={data.audioUrl} />
        <div className="rounded-lg bg-[#eeeeee] px-8 py-8">
          {topic && <h2 className="mb-6 text-xl font-extrabold">Topic: {topic}</h2>}
          {data.instructions && <p className="mb-7 max-w-6xl text-[15px] leading-7">{data.instructions}</p>}
          <div className="space-y-3">
            {(rows ?? []).map((row: string, index: number) => {
              const selected = saved[`r${index}`] ?? '';
              const correct = data.correctAnswers?.[index] ?? '';
              const status = revealAnswers && correct
                ? selected === correct ? 'correct' : selected ? 'wrong' : 'answer'
                : undefined;
              return (
                <div className={`grid items-center gap-3 rounded-md px-3 py-2 transition ${revealAnswers && correct ? 'bg-white/60' : ''} ${data.template === 'LISTENING_PEOPLE_MATCH' ? 'grid-cols-[96px_1fr]' : 'md:grid-cols-[minmax(360px,1fr)_280px_210px]'}`} key={row}>
                  <span className="text-[15px] leading-6">{data.template === 'LISTENING_PEOPLE_MATCH' ? row : `${index + 1}. ${stripLeadingIndex(row)}`}</span>
                  <TemplateSelect value={selected} options={data.options ?? []} onChange={(next) => setAnswer(`r${index}`, next)} wide={data.template === 'LISTENING_PEOPLE_MATCH'} status={status} />
                  {revealAnswers && correct && (
                    <div className={`rounded-lg px-3 py-2 text-xs font-extrabold ${selected === correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {selected === correct ? 'Đúng' : 'Sai'} · {correct}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className="h-10 rounded-lg bg-green-700 px-4 text-sm font-extrabold text-white shadow-soft hover:bg-green-800" onClick={() => setShowAnswers((value) => !value)}>
            {showAnswers ? 'Ẩn đáp án' : 'Xem đáp án'}
          </button>
          <button type="button" className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-extrabold text-white shadow-soft hover:bg-brand-700" onClick={() => setShowScript((value) => !value)}>
            {showScript ? 'Ẩn đoạn văn' : 'Hiện đoạn văn'}
          </button>
        </div>
        {showAnswers && data.correctAnswers?.length > 0 && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <h3 className="mb-3 font-extrabold text-green-800">Đáp án của câu</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.correctAnswers.map((answer: string, index: number) => (
                <div className="rounded-md bg-white px-3 py-2 text-sm font-bold text-navy shadow-soft" key={`${answer}-${index}`}>
                  {index + 1} là <span className="text-green-700">{answer}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <ListeningScriptReview scriptText={data.scriptText} checked={checked} showAnswers={showAnswers} highlightTerms={getTemplateListeningHighlightTerms(data, saved)} />
        {showScript && (
          <div className={`mt-4 whitespace-pre-line rounded border p-5 leading-7 ${data.scriptText ? 'border-slate-300 bg-sky-50 text-slate-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            {repairMojibake(data.scriptText ?? '').trim()
              ? <HighlightAnswerTerms text={repairMojibake(data.scriptText ?? '').trim()} terms={getTemplateListeningHighlightTerms(data, saved)} />
              : 'Câu này chưa có đoạn văn. Admin cần nhập transcript vào cột script_text hoặc scriptText khi import câu hỏi.'}
          </div>
        )}
      </AptisPaper>
    );
  }

  if (data.template === 'READING_GAP_FILL') {
    const rows = data.rows ?? [];
    const correctAnswers = getReadingGapCorrectAnswers(data);
    const revealStatus = checked !== undefined || showAnswers;
    const topic = displayTemplateTopic(data);
    return (
      <AptisPaper narrow>
        <h1 className="mb-2 text-2xl font-extrabold">Reading Question <span className="mx-2 inline-flex min-w-10 justify-center border-b border-slate-900">{currentNumber ?? 1}</span> of {displayTotal}</h1>
        {topic && <h2 className="mb-3 text-lg font-bold text-red-600">Topic: {topic}</h2>}
        <p className="mb-3 text-sm">{data.instructions}</p>
        {data.before && (
          <HighlightableText
            storageId={`question-${questionId}-reading-gap-before`}
            text={data.before}
            className="mb-4 whitespace-pre-line text-sm"
          />
        )}
        <div className="space-y-2.5">
          {rows.map((row: any, index: number) => {
            const parts = getReadingGapParts(row);
            const selected = saved[`gap${index}`] ?? '';
            const correct = correctAnswers[index] ?? '';
            const status = revealStatus && correct
              ? selected === correct ? 'correct' : selected ? 'wrong' : 'answer'
              : undefined;
            return (
              <div className="rounded border border-slate-300 bg-white px-4 py-2.5 text-[15px] shadow-soft" key={`${parts[0]}-${index}`}>
                <span>{parts[0]}</span>
                <TemplateSelect value={selected} options={getReadingGapOptions(data, row)} onChange={(next) => setAnswer(`gap${index}`, next)} compact status={status} />
                <span>{parts[1]}</span>
              </div>
            );
          })}
        </div>
        {data.after && (
          <HighlightableText
            storageId={`question-${questionId}-reading-gap-after`}
            text={data.after}
            className="mt-5 whitespace-pre-line text-sm"
          />
        )}
        {showAnswers && correctAnswers.length > 0 && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3">
            <h3 className="mb-2 font-extrabold text-green-800">Đáp án</h3>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {correctAnswers.map((answer, index) => (
                <div className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-navy shadow-soft" key={`${answer}-${index}`}>
                  {index + 1}. <span className="text-green-700">{answer}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {correctAnswers.length > 0 && (
          <button type="button" className="mt-4 rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowAnswers((value) => !value)}>
            {showAnswers ? 'Ẩn đáp án' : 'Xem đáp án'}
          </button>
        )}
      </AptisPaper>
    );
  }

  if (data.template === 'READING_SENTENCE_ORDER') {
    const displaySentences = getReadingOrderDisplaySentences(data);
    const correctOrder = getReadingOrderCorrectSentences(data);
    const selectedOrder = Array.isArray((saved as any).order) ? (saved as any).order as string[] : [];
    const slotCount = Math.max(correctOrder.length, displaySentences.length);
    const currentOrder = Array.from({ length: slotCount }, (_, index) => selectedOrder[index] ?? '');
    const unselectedSentences = displaySentences.filter((sentence) => !currentOrder.includes(sentence));
    const score = currentOrder.filter((sentence, index) => sentence && sentence === correctOrder[index]).length * EXAM_POINT_PER_QUESTION;
    const maxScore = correctOrder.length * EXAM_POINT_PER_QUESTION;
    const topic = displayTemplateTopic(data);
    function saveOrder(nextOrder: string[]) {
      onChange(JSON.stringify({ ...saved, order: nextOrder }));
    }
    function placeSentence(sentence: string, targetIndex: number) {
      if (!sentence || targetIndex < 0 || targetIndex >= slotCount) return;
      const nextOrder = [...currentOrder];
      const sourceIndex = nextOrder.indexOf(sentence);
      if (sourceIndex >= 0) nextOrder[sourceIndex] = '';
      const replacedSentence = nextOrder[targetIndex];
      nextOrder[targetIndex] = sentence;
      if (replacedSentence && sourceIndex >= 0 && sourceIndex !== targetIndex) nextOrder[sourceIndex] = replacedSentence;
      saveOrder(nextOrder);
    }
    function addToNextEmpty(sentence: string) {
      const emptyIndex = currentOrder.findIndex((item) => !item);
      placeSentence(sentence, emptyIndex >= 0 ? emptyIndex : slotCount - 1);
    }
    function clearSlot(index: number) {
      const nextOrder = [...currentOrder];
      nextOrder[index] = '';
      saveOrder(nextOrder);
    }
    return (
      <AptisPaper narrow compact>
        <div className="mx-auto max-w-[1040px]">
        <h1 className="mb-2 text-sm font-black leading-5 text-slate-950 sm:text-base">
          {data.instructions || 'The sentences below make a complete text. Put them in the correct order.'}
        </h1>
        <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-soft">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.9fr]">
            <section className="p-3 sm:p-4 lg:border-r lg:border-slate-200">
              <h2 className="mb-2 text-base font-black text-slate-950">{topic || `Reading Question ${currentNumber ?? 1}`}</h2>
              <div className="space-y-2">
                {currentOrder.map((sentence, index) => {
                  const wrong = checked !== undefined && sentence && sentence !== correctOrder[index];
                  const correct = checked !== undefined && sentence && sentence === correctOrder[index];
                  return (
                    <button
                      type="button"
                      key={`slot-${index}`}
                      className={`grid min-h-[46px] w-full grid-cols-[28px_1fr] items-center gap-2 rounded-[8px] border-2 border-dashed px-3 text-left transition ${
                        correct
                          ? 'border-emerald-400 bg-emerald-50'
                          : wrong
                            ? 'border-red-300 bg-red-50'
                            : sentence
                              ? 'border-brand-200 bg-sky-50'
                              : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50'
                      }`}
                      onClick={() => sentence && clearSlot(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const source = event.dataTransfer.getData('text/plain') || dragSentence;
                        placeSentence(source, index);
                        setDragSentence('');
                      }}
                    >
                      <span className="text-sm font-black text-slate-700">{index + 1}</span>
                      {sentence ? (
                        <span
                          role="button"
                          tabIndex={0}
                          draggable
                          className="cursor-grab text-xs font-semibold leading-4 text-slate-900 active:cursor-grabbing"
                          onClick={(event) => event.stopPropagation()}
                          onDragStart={(event) => {
                            setDragSentence(sentence);
                            event.dataTransfer.setData('text/plain', sentence);
                            event.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => setDragSentence('')}
                        >
                          <HighlightableText storageId={`question-${questionId}-order-slot-${index}`} text={sentence} />
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">Kéo câu vào đây</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-2 bg-slate-50 p-3 sm:p-4">
              {unselectedSentences.map((sentence, index) => (
                <button
                  type="button"
                  key={`${sentence}-${index}`}
                  draggable
                  className="grid min-h-[46px] w-full cursor-grab grid-cols-[16px_1fr] items-start gap-2 rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium leading-4 text-slate-800 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 active:cursor-grabbing"
                  onClick={() => addToNextEmpty(sentence)}
                  onDragStart={(event) => {
                    setDragSentence(sentence);
                    event.dataTransfer.setData('text/plain', sentence);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => setDragSentence('')}
                >
                  <span className="text-slate-500">-</span>
                  <HighlightableText storageId={`question-${questionId}-order-choice-${index}`} text={sentence} />
                </button>
              ))}
              {!unselectedSentences.length && (
                <div className="grid min-h-[46px] place-items-center rounded-[8px] border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-400">
                  Đã đưa hết câu sang cột trái
                </div>
              )}
            </section>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="h-8 rounded bg-green-700 px-3 text-xs font-semibold text-white" onClick={() => setShowAnswers((value) => !value)}>
            {showAnswers ? 'Ẩn đáp án' : 'Xem đáp án'}
          </button>
          <button type="button" className="h-8 rounded bg-slate-700 px-3 text-xs font-semibold text-white" onClick={() => onChange(JSON.stringify({ ...saved, order: [] }))}>
            Chọn lại thứ tự
          </button>
        </div>
        {checked !== undefined && (
          <div className="mt-3 rounded-[8px] border border-blue-200 bg-blue-50 px-4 py-3 text-[12px] leading-5 text-slate-900 shadow-soft">
            <div className="mb-2 flex items-center gap-2 text-red-600">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-red-100 text-xs font-black">×</span>
              <span className="font-bold">Review your answers above.</span>
            </div>
            <p className="mb-2 font-black text-brand-700">Giải thích / Transcript:</p>
            <div className="space-y-2">
              {correctOrder.map((sentence, index) => {
                const translation = getReadingOrderTranslation(sentence, data);
                return (
                  <div key={`${sentence}-${index}`}>
                    <p className="font-semibold">
                      {index + 1}. <HighlightKeywords sentence={sentence} data={data} />
                    </p>
                    <p className="text-slate-700">{translation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {showAnswers && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
            <div className="max-h-[86vh] w-full max-w-5xl overflow-auto rounded-lg bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-brand-100 px-5 py-4">
                <h3 className="text-lg font-bold">Test and Answer Review Question {currentNumber ?? 1}</h3>
                <button type="button" className="text-3xl leading-none text-slate-600 hover:text-navy" onClick={() => setShowAnswers(false)}>×</button>
              </div>
              <div className="p-5">
                <p className="mb-5 text-center text-2xl font-extrabold text-green-700">Your score: {score} / {maxScore}</p>
                <div className="grid border border-slate-300 text-center md:grid-cols-2">
                  <div className="border-b border-slate-300 p-3 font-extrabold md:border-r">Your Answer</div>
                  <div className="border-b border-slate-300 p-3 font-extrabold">Correct Answer</div>
                  {correctOrder.map((sentence, index) => (
                    <div className="contents" key={`${sentence}-${index}`}>
                      <div className="border-b border-brand-100 p-3 text-red-600 md:border-r">{currentOrder[index] || 'Chưa chọn'}</div>
                      <div className="border-b border-brand-100 p-3 text-green-700">{sentence}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </AptisPaper>
    );
  }

  if (data.template === 'READING_FORUM_MATCH') {
    const correctAnswers = data.correctAnswers ?? [];
    const topic = displayTemplateTopic(data);
    return (
      <AptisPaper>
        <h1 className="mb-3 text-3xl font-extrabold">Reading Question 4 ({currentNumber ?? 1}/{displayTotal})</h1>
        {topic && <h2 className="mb-4 text-xl font-bold text-red-600">Topic: {topic}</h2>}
        <div className="grid gap-6 text-[15px] leading-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section>
            <HighlightableText
              storageId={`question-${questionId}-forum-title`}
              html={data.leftTitle ?? ''}
              className="mb-3 font-extrabold leading-6"
            />
            <div className="space-y-3 leading-6">
              {(data.opinions ?? []).map((opinion: string, index: number) => (
                <HighlightableText
                  key={`${opinion}-${index}`}
                  storageId={`question-${questionId}-forum-opinion-${index}`}
                  html={opinion}
                />
              ))}
            </div>
          </section>
          <section>
            <p className="mb-3 font-extrabold leading-6">Read the four opinions posted in the forum, and proceed to answer the questions.</p>
            <div className="space-y-2.5">
              {(data.questions ?? []).map((question: string, index: number) => {
                const selected = saved[`forum${index}`] ?? '';
                const correct = correctAnswers[index] ?? '';
                const status = checked !== undefined && correct
                  ? selected === correct ? 'correct' : selected ? 'wrong' : 'answer'
                  : undefined;
                return (
                <div className="grid items-center gap-3 md:grid-cols-[1fr_96px]" key={question}>
                  <span>{question}</span>
                  <TemplateSelect value={selected} options={data.options ?? []} onChange={(next) => setAnswer(`forum${index}`, next)} compact status={status} />
                </div>
              );})}
            </div>
          </section>
        </div>
        {checked !== undefined && (
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-navy shadow-soft">
            <div className="mb-4 flex items-start gap-3">
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${checked ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {checked ? '✓' : '×'}
              </span>
              <div>
                <p className={`font-extrabold ${checked ? 'text-green-700' : 'text-red-600'}`}>
                  {checked ? 'Chính xác. Xem lại keyword và bản dịch bên dưới.' : 'Review your answers above.'}
                </p>
                <p className="mt-1 font-extrabold text-brand-700">Giải thích / Transcript:</p>
              </div>
            </div>

            {data.leftTitle && (
              <div className="mb-4 rounded-lg border border-blue-100 bg-white/70 p-3">
                <p className="font-extrabold text-slate-900">
                  <HighlightForumKeywords text={data.leftTitle} keywords={extractForumKeywordPhrases(data.leftTitle)} />
                </p>
                <p className="mt-1 text-slate-600">{getForumTranslation(data.leftTitle, data)}</p>
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              {(data.opinions ?? []).map((opinion: string, index: number) => {
                const option = data.options?.[index] ?? String.fromCharCode(65 + index);
                const relatedQuestions: Array<{ question: string; questionIndex: number; correct: string }> = (data.questions ?? [])
                  .map((question: string, questionIndex: number) => ({ question, questionIndex, correct: correctAnswers[questionIndex] ?? '' }))
                  .filter((item: { question: string; questionIndex: number; correct: string }) => sameAnswer(item.correct, option));
                const keywords = Array.from(new Set([
                  ...extractForumKeywordPhrases(opinion),
                  ...relatedQuestions.flatMap((item) => getForumAnswerKeywords(item.question, option, data))
                ]));

                return (
                  <div className="rounded-lg border border-blue-100 bg-white p-3" key={`${opinion}-${index}`}>
                    <p className="font-extrabold text-brand-700">Đoạn {option}</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      <HighlightForumKeywords text={opinion} keywords={keywords} />
                    </p>
                    <p className="mt-1 text-slate-600">{getForumTranslation(opinion, data)}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 space-y-3">
              {(data.questions ?? []).map((question: string, index: number) => {
                const selected = saved[`forum${index}`] || '(không chọn)';
                const correct = correctAnswers[index] ?? '';
                const ok = sameAnswer(selected, correct);
                const keywords = getForumAnswerKeywords(question, correct, data);
                return (
                  <div className="rounded-lg border border-blue-100 bg-white p-3" key={`${question}-${index}`}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-950">
                          {index + 1}. <HighlightForumKeywords text={question} keywords={keywords} />
                        </p>
                        <p className="mt-1 text-slate-600">{getForumTranslation(question, data)}</p>
                      </div>
                      <div className="shrink-0 rounded-lg bg-sky-50 px-3 py-2 text-xs font-extrabold">
                        <span className={ok ? 'text-green-700' : 'text-red-600'}>Bạn chọn: {selected}</span>
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="text-green-700">Đáp án: {correct}</span>
                      </div>
                    </div>
                    {correct && (
                      <p className="mt-2 text-slate-600">
                        Đoạn đúng: <span className="font-semibold text-slate-900">{stripHtml(getForumOpinionByAnswer(correct, data))}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-4">
          <button type="button" className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowAnswers((value) => !value)}>
            {showAnswers ? 'Ẩn đáp án' : 'Xem đáp án'}
          </button>
        </div>
        {showAnswers && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
            <div className="max-h-[86vh] w-full max-w-4xl overflow-auto rounded-lg bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-brand-100 px-5 py-4">
                <h3 className="text-lg font-bold">Test and Answer Review Question 4</h3>
                <button type="button" className="text-3xl leading-none text-slate-600 hover:text-navy" onClick={() => setShowAnswers(false)}>×</button>
              </div>
              <div className="p-5">
                <h4 className="mb-6 text-center text-3xl font-extrabold text-navy">Correct answer compare</h4>
                <div className="grid border border-slate-300 text-center md:grid-cols-[1.5fr_0.8fr_0.8fr]">
                  <div className="border-b border-slate-300 p-3 font-extrabold">Question</div>
                  <div className="border-b border-slate-300 p-3 font-extrabold">Your Answer</div>
                  <div className="border-b border-slate-300 p-3 font-extrabold">Correct Answer</div>
                  {(data.questions ?? []).map((question: string, index: number) => {
                    const selected = saved[`forum${index}`] || '(không chọn)';
                    const correct = correctAnswers[index] ?? '';
                    const ok = selected === correct;
                    return (
                      <div className="contents" key={`${question}-${index}`}>
                        <div className="border-b border-brand-100 bg-sky-50 p-3">{question}</div>
                        <div className={`border-b border-brand-100 bg-sky-50 p-3 ${ok ? 'text-green-700' : 'text-red-600'}`}>{selected}</div>
                        <div className="border-b border-brand-100 bg-sky-50 p-3 text-green-700">{correct}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </AptisPaper>
    );
  }

  if (data.template === 'READING_HEADING_MATCH') {
    const paragraphs = data.paragraphs ?? [];
    const options = (data.options ?? []).filter(Boolean);
    const correctAnswers = data.correctAnswers ?? options.slice(0, paragraphs.length);
    const score = correctAnswers.filter((answer: string, index: number) => (saved[`heading${index}`] ?? '') === answer).length * EXAM_POINT_PER_QUESTION;
    const maxScore = correctAnswers.length * EXAM_POINT_PER_QUESTION;
    const topic = displayTemplateTopic(data);
    return (
      <AptisPaper narrow>
        <h1 className="mb-4 text-4xl font-extrabold">Reading question 5 ({currentNumber ?? 1}/{displayTotal})</h1>
        {topic && <h2 className="mb-5 text-2xl font-bold text-red-600">TOPIC: {topic}</h2>}
        <div className="mb-6 flex flex-wrap gap-2">
          <button type="button" className="rounded bg-slate-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowScript((value) => !value)}>
            {showScript ? '?n nội dung' : 'Xem nội dung'}
          </button>
          {data.tips && (
            <button type="button" className="rounded bg-slate-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowTips((value) => !value)}>
              {showTips ? '?n mẹo' : 'Xem mẹo'}
            </button>
          )}
        </div>
        {showTips && data.tips && (
          <div className="mb-5 whitespace-pre-line rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            {data.tips}
          </div>
        )}
        <div className="space-y-3">
          {paragraphs.map((paragraph: string, index: number) => {
            const selected = saved[`heading${index}`] ?? '';
            const correct = correctAnswers[index] ?? '';
            const statusClass = checked !== undefined && correct
              ? selected === correct
                ? 'border-green-500 bg-green-50 text-green-800'
                : selected
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-blue-300 bg-blue-50'
              : 'border-slate-300 bg-white';
            return (
              <div className="grid items-start gap-3 md:grid-cols-[36px_1fr]" key={index}>
                <span className="pt-3 text-base">{index + 1}.</span>
                <div>
                  <select
                    className={`h-11 w-full rounded-md border px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${statusClass}`}
                    value={selected}
                    onChange={(event) => setAnswer(`heading${index}`, event.target.value)}
                  >
                    <option value=""></option>
                    {options.map((option: string) => <option value={option} key={option}>{option}</option>)}
                  </select>
                  {showScript && (
                    <HighlightableText
                      storageId={`question-${questionId}-heading-paragraph-${index}`}
                      text={paragraph}
                      className="mt-2 rounded-lg border border-brand-100 bg-sky-50 px-3 py-2 text-sm leading-6 text-slate-700"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5">
          <button type="button" className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowAnswers((value) => !value)}>
            Xem đáp án
          </button>
        </div>
        {showAnswers && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
            <div className="max-h-[86vh] w-full max-w-4xl overflow-auto rounded-lg bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-brand-100 px-5 py-4">
                <h3 className="text-lg font-bold">Test and Answer Review Question 5</h3>
                <button type="button" className="text-3xl leading-none text-slate-600 hover:text-navy" onClick={() => setShowAnswers(false)}>×</button>
              </div>
              <div className="p-5">
                <h4 className="mb-3 text-center text-3xl font-extrabold text-navy">Correct answer compare</h4>
                <p className="mb-5 text-center font-extrabold text-navy">Your score: {score} / {maxScore}</p>
                <div className="grid border border-slate-300 text-center md:grid-cols-[0.5fr_1fr_1.6fr]">
                  <div className="border-b border-slate-300 p-3 font-extrabold">Question</div>
                  <div className="border-b border-slate-300 p-3 font-extrabold">Your Answer</div>
                  <div className="border-b border-slate-300 p-3 font-extrabold">Correct Answer</div>
                  {correctAnswers.map((answer: string, index: number) => {
                    const selected = saved[`heading${index}`] || '(không chọn)';
                    const ok = selected === answer;
                    return (
                      <div className="contents" key={`${answer}-${index}`}>
                        <div className="border-b border-brand-100 bg-sky-50 p-3">{index + 1}</div>
                        <div className={`border-b border-brand-100 bg-sky-50 p-3 ${ok ? 'text-green-700' : 'text-red-600'}`}>{selected}</div>
                        <div className="border-b border-brand-100 bg-sky-50 p-3 text-green-700">{answer}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </AptisPaper>
    );
  }

  if (data.template === 'SPEAKING_PICTURE') {
    return (
      <AptisPaper narrow>
        <div className="mx-auto max-w-[760px] overflow-hidden rounded-2xl bg-white shadow-soft">
          <div className="flex items-center gap-4 border-b border-brand-100 px-7 py-5">
            <b>Speak question</b><InlineNumber value={currentNumber ?? 1} /> <b>/ {displayTotal}</b>
          </div>
          <div className="p-7">
            <div className="rounded-xl border border-brand-100 bg-white p-4">
              <img className="mx-auto h-[300px] w-full max-w-[480px] object-cover" src={data.imageUrl} alt="Speaking prompt" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {(data.tabs ?? []).map((tab: string, index: number) => <button type="button" className={`h-10 rounded-lg border text-sm ${index === 0 ? 'border-brand-600 text-brand-600' : 'border-brand-100 text-slate-600'}`} key={tab}>{tab}</button>)}
            </div>
            <div className="mt-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">{data.prompt}</h2>
              <SpeakingRecordButton compact />
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-600">Your answer</p>
            <textarea className="mt-2 min-h-20 w-full rounded-xl border border-brand-100 bg-sky-50 p-4 italic text-slate-600" placeholder="Your speech will appear here..." value={saved.speech ?? ''} onChange={(event) => setAnswer('speech', event.target.value)} />
            <button type="button" className="mt-8 h-10 w-full rounded-lg border border-brand-600 text-sm font-semibold text-brand-600"><MessageCircle className="mr-2 inline" size={15} />Sample Answer</button>
          </div>
        </div>
      </AptisPaper>
    );
  }

  if (data.template === 'SPEAKING_SAMPLE_TABLE') {
    return (
      <AptisPaper narrow>
        <h1 className="mb-6 flex items-center gap-3 text-2xl font-extrabold"><ListChecks className="text-brand-600" />{data.title}</h1>
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-5 shadow-soft">
          <SpeakingRecordButton />
        </div>
        <div className="overflow-hidden rounded border border-slate-300 bg-white">
          <div className="grid grid-cols-[50px_1fr_170px] bg-sky-50 font-bold">
            <div className="border-r p-3">#</div><div className="border-r p-3">Câu hỏi</div><div className="p-3">Đáp án mẫu</div>
          </div>
          <div className="grid grid-cols-[50px_1fr_170px] border-t">
            <div className="border-r p-3 font-bold">1</div>
            <div className="border-r p-3">{data.question}</div>
            <div className="p-3"><button type="button" className="rounded bg-brand-600 px-4 py-2 text-sm font-bold text-white">Xem đáp án</button></div>
          </div>
          <div className="border-l-4 border-brand-600 bg-blue-50 p-5 leading-7">
            <p className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-600">Đáp án mẫu</p>
            <p>{data.sample}</p>
            <b className="mt-6 block">Giải thích:</b>
            <ul className="mt-2 list-disc pl-6">
              {(data.explanation ?? []).map((item: string) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </AptisPaper>
    );
  }

  if (data.template === 'WRITING_CLUB_COLLECTION') {
    return (
      <WritingClubCollectionRenderer
        data={data}
        saved={saved}
        initialClubIndex={initialClubIndex}
        setAnswer={setAnswer}
        patchAnswers={patchAnswers}
        showAnswers={showAnswers}
        setShowAnswers={setShowAnswers}
      />
    );
  }

  if (data.template === 'WRITING_CLUB_COLLECTION_OLD') {
    const clubs = data.clubs ?? [];
    const selectedClubIndex = Number(saved.selectedClubIndex ?? initialClubIndex ?? -1);
    const partIndex = Number(saved.writingPartIndex ?? 0);
    const club = clubs[selectedClubIndex];
    const palette = ['bg-amber-400 text-navy', 'bg-emerald-700 text-white', 'bg-red-500 text-white', 'bg-sky-500 text-navy', 'bg-brand-600 text-white'];
    const iconNames = ['??', '??', '??', '¦', '??', '??', '??', '??', '??', '??', '??', '??', '?', '??', '??', '??', '??', '??', '?', '?', '?', '??'];
    const sampleHtml = (html?: string) => ({ __html: (html ?? '').replace(/\n/g, '<br />') });
    const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

    function updateWriting(key: string, next: string) {
      setAnswer(`${selectedClubIndex}-${partIndex}-${key}`, next);
    }

    function getWriting(key: string) {
      return saved[`${selectedClubIndex}-${partIndex}-${key}`] ?? '';
    }

    if (!club) {
      return (
        <AptisPaper narrow>
          <h1 className="mb-8 text-center text-4xl font-normal">Writing Practice</h1>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clubs.map((item: any, index: number) => (
              <button
                type="button"
                className={`h-12 rounded-md px-5 text-lg font-medium shadow-soft transition hover:-translate-y-0.5 hover:shadow-md ${palette[index % palette.length]}`}
                key={`${item.clubName}-${index}`}
                onClick={() => patchAnswers({ selectedClubIndex: String(index), writingPartIndex: '0' })}
              >
                <span className="mr-4 inline-block w-6 text-center">{iconNames[index % iconNames.length]}</span>
                {displayWritingClubName(item.clubName, index)}
              </button>
            ))}
          </div>
        </AptisPaper>
      );
    }

    const part1 = club.parts?.[0] ?? {};
    const part2 = club.parts?.[1] ?? {};
    const part3 = club.parts?.[2] ?? {};
    const part4 = club.parts?.[3] ?? {};
    const partTitle = partIndex === 3 ? 'Email Writing' : displayWritingClubName(club.clubName, selectedClubIndex);

    return (
      <AptisPaper narrow>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => patchAnswers({ selectedClubIndex: '-1', writingPartIndex: '0' })}>Quay lại danh sách</button>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((index) => (
              <button
                type="button"
                className={`rounded px-4 py-2 text-sm font-bold ${partIndex === index ? 'bg-brand-600 text-white' : 'bg-sky-100 text-slate-700 hover:bg-sky-200'}`}
                key={index}
                onClick={() => setAnswer('writingPartIndex', String(index))}
              >
                Câu {index + 1}
              </button>
            ))}
          </div>
        </div>

        <h1 className="mb-6 text-4xl font-normal">Question {partIndex + 1} of 4 - {partTitle}</h1>

        {partIndex === 0 && (
          <>
            <p className="mb-6 font-semibold">{part1.instructions}</p>
            <div className="space-y-7">
              {(part1.prompts ?? []).map((prompt: string, index: number) => (
                <label className="block" key={prompt}>
                  <span className="mb-2 block">{prompt}</span>
                  <input className="h-10 w-full rounded border border-slate-300 px-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" value={getWriting(`p1-${index}`)} onChange={(event) => updateWriting(`p1-${index}`, event.target.value)} />
                </label>
              ))}
            </div>
          </>
        )}

        {partIndex === 1 && (
          <>
            <p className="mb-6 font-semibold">{part2.instructions}</p>
            <label className="block">
              <span className="mb-2 block">{part2.prompts?.[0]}</span>
              <textarea className="min-h-40 w-full rounded border border-slate-300 p-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" value={getWriting('p2')} onChange={(event) => updateWriting('p2', event.target.value)} />
              <span className="mt-2 block text-right text-slate-700">Word Count: {wordCount(getWriting('p2'))}</span>
            </label>
          </>
        )}

        {partIndex === 2 && (
          <>
            <p className="mb-6 font-semibold">{part3.instructions}</p>
            <div className="space-y-8">
              {(part3.prompts ?? []).map((prompt: string, index: number) => {
                const text = getWriting(`p3-${index}`);
                return (
                  <label className="block" key={prompt}>
                    <span className="mb-2 block">{prompt}</span>
                    <textarea className="min-h-24 w-full rounded border border-slate-300 p-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" value={text} onChange={(event) => updateWriting(`p3-${index}`, event.target.value)} />
                    <span className="mt-2 block text-right text-slate-700">Word Count: {wordCount(text)}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}

        {partIndex === 3 && (
          <>
            <p className="mb-4 font-semibold">{part4.instructions}</p>
            <p className="mb-4 leading-7">{part4.mainText}</p>
            {(part4.prompts ?? []).map((prompt: string, index: number) => {
              const text = getWriting(`p4-${index}`);
              return (
                <label className="mb-8 block" key={prompt}>
                  <span className="mb-2 block font-semibold">{prompt}</span>
                  <textarea className="min-h-28 w-full rounded border border-slate-300 p-3 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" value={text} onChange={(event) => updateWriting(`p4-${index}`, event.target.value)} />
                  <span className="mt-2 block text-right text-slate-700">Word Count: {wordCount(text)}</span>
                </label>
              );
            })}
          </>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="rounded bg-cyan-500 px-5 py-3 font-semibold text-white" onClick={() => setShowAnswers((value) => !value)}>
            {showAnswers ? 'Ẩn đáp án mẫu' : 'Đáp án mẫu'}
          </button>
          <button type="button" className="rounded bg-sky-200 px-5 py-3 font-semibold text-slate-700 disabled:opacity-50" disabled={partIndex === 0} onClick={() => setAnswer('writingPartIndex', String(Math.max(0, partIndex - 1)))}>Câu trước</button>
          <button type="button" className="rounded bg-brand-600 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={partIndex === 3} onClick={() => setAnswer('writingPartIndex', String(Math.min(3, partIndex + 1)))}>Câu tiếp</button>
        </div>

        {showAnswers && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-950">
            {partIndex === 0 && (part1.sampleAnswers ?? []).map((answer: string, index: number) => <p key={`${answer}-${index}`}><b>{index + 1}.</b> {answer}</p>)}
            {partIndex === 1 && <p>{part2.sampleAnswers?.[0]}</p>}
            {partIndex === 2 && (part3.sampleAnswers ?? []).map((answer: string, index: number) => <p className="mb-3" key={`${answer}-${index}`}><b>{index + 1}.</b> {answer}</p>)}
            {partIndex === 3 && (part4.sampleAnswers ?? []).map((answer: string, index: number) => <div className="mb-5" key={index} dangerouslySetInnerHTML={sampleHtml(answer)} />)}
          </div>
        )}
      </AptisPaper>
    );
  }

  if (data.template === 'WRITING_TEXTAREA') {
    return (
      <AptisPaper narrow>
        <h1 className="mb-5 text-4xl font-extrabold">{data.title}</h1>
        <p className="mb-7 font-semibold">{data.instructions}</p>
        <div className="space-y-8">
          {(data.prompts ?? []).map((prompt: string, index: number) => {
            const text = saved[`writing${index}`] ?? '';
            const count = text.trim() ? text.trim().split(/\s+/).length : 0;
            return (
              <div key={prompt}>
                <p className="mb-3">{prompt}</p>
                <textarea className="min-h-24 w-full rounded border border-slate-300 bg-white p-4" value={text} onChange={(event) => setAnswer(`writing${index}`, event.target.value)} />
                <p className="mt-2 text-right text-slate-700">Word Count: {count}</p>
              </div>
            );
          })}
        </div>
        <button type="button" className="mt-6 rounded bg-cyan-500 px-5 py-3 font-semibold text-white">Xem đáp án</button>
      </AptisPaper>
    );
  }

  return <div className="rounded-xl border border-brand-100 bg-white p-6">Template chưa được hỗ trợ.</div>;
}

function SpeakingPart1Renderer({ data, saved, setAnswer, patchAnswers }: {
  data: TemplateData;
  saved: Record<string, string>;
  setAnswer: (key: string, next: string) => void;
  patchAnswers: (next: Record<string, string>) => void;
}) {
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const mode = saved.speakingPart1Mode ?? 'intro';
  const index = Math.min(Math.max(Number(saved.speakingPart1Index ?? 0), 0), Math.max(questions.length - 1, 0));
  const current = questions[index] ?? {};
  const currentFeatured = isFeaturedTemplateItem(current);
  const openAnswer = saved.speakingPart1OpenAnswer ?? '';
  const progress = questions.length ? Math.max(4, Math.round(((index + 1) / questions.length) * 100)) : 0;

  function openPractice(nextIndex = 0) {
    patchAnswers({
      speakingPart1Mode: 'practice',
      speakingPart1Index: String(Math.min(Math.max(nextIndex, 0), Math.max(questions.length - 1, 0))),
      speakingPart1OpenAnswer: ''
    });
  }

  function toggleAnswer(answerKey: string) {
    patchAnswers({ speakingPart1OpenAnswer: openAnswer === answerKey ? '' : answerKey });
  }

  if (mode === 'summary') {
    return (
      <AptisPaper narrow compact>
        <div className="mx-auto max-w-[1180px] space-y-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-extrabold">
                <ListChecks className="text-brand-600" /> Speaking Part 1 - Danh sách câu hỏi
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-600">Tổng hợp {questions.length} câu hỏi trong file import.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => openPractice(index)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white">Trang luyện tập</button>
              <button type="button" onClick={() => patchAnswers({ speakingPart1Mode: 'intro' })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Giới thiệu</button>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {questions.map((item: any, itemIndex: number) => (
              <article key={`${item.question}-${itemIndex}`} className={`rounded-xl border bg-white p-5 shadow-soft ${isFeaturedTemplateItem(item) ? 'border-amber-400 ring-4 ring-amber-100' : 'border-brand-100'}`}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    {isFeaturedTemplateItem(item) && <FeaturedQuestionBadge />}
                    <button type="button" onClick={() => openPractice(itemIndex)} className="block text-left text-lg font-extrabold text-navy hover:text-brand-600">
                      Câu {itemIndex + 1}: {item.question}
                    </button>
                  </div>
                  <button type="button" onClick={() => openPractice(itemIndex)} className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700">
                    Luyện câu này
                  </button>
                </div>
                <div className="grid gap-3 text-sm leading-7 md:grid-cols-2">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <p className="mb-1 text-xs font-extrabold uppercase tracking-widest text-brand-600">Đáp án mẫu 1</p>
                    <p>{item.answer1 || 'Chưa có đáp án mẫu 1.'}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                    <p className="mb-1 text-xs font-extrabold uppercase tracking-widest text-emerald-700">Đáp án mẫu 2</p>
                    <p>{item.answer2 || 'Chưa có đáp án mẫu 2.'}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </AptisPaper>
    );
  }

  if (mode !== 'practice') {
    return (
      <AptisPaper narrow compact>
        <div className="mx-auto max-w-[880px] space-y-5">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-sm text-white">i</span>
            Giới thiệu - Speaking Part 1
          </h1>
          <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-soft">
            <div className="grid grid-cols-[190px_1fr_1.35fr] bg-blue-50 text-center text-sm font-extrabold text-blue-950">
              <div className="border-r border-brand-100 p-4">Phần thi</div>
              <div className="border-r border-brand-100 p-4">Mô tả</div>
              <div className="p-4">Hướng dẫn ôn tập</div>
            </div>
            <div className="grid grid-cols-[190px_1fr_1.35fr] text-sm leading-7">
              <div className="border-r border-brand-100 bg-sky-50 p-5 font-bold">
                <p>Part 1:</p>
                <p>Thông tin bạn thân</p>
              </div>
              <div className="border-r border-brand-100 p-5">
                Bạn sẽ được hỏi <b>3 câu</b> xoay quanh các chủ đề quen thuộc về cuộc sống cá nhân.
                Mỗi câu có <b>45 giây</b> để trả lời. Câu trả lời nên ngắn gọn, rõ ràng và đúng trọng tâm.
              </div>
              <div className="space-y-3 p-5">
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">?</span>Luyện cách giới thiệu bản thân, gia đình, sở thích, hoạt động cuối tuần.</p>
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">?</span>Hạn chế liệt kê đơn điệu, dùng từ nối và câu ghép để câu trả lời tự nhiên hơn.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
            <b>Thang điểm APTIS:</b> từ A0 đến C1. Part 1 đánh giá khả năng trả lời ngắn gọn, rõ ràng và phù hợp chủ đề.
          </div>
          <div className="rounded-2xl bg-white p-6 text-center shadow-soft">
            <p className="mb-4 text-sm font-semibold text-slate-600">Chọn chủ đề học</p>
            <div className="mx-auto grid max-w-[620px] gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => openPractice(0)} className="h-12 rounded-full bg-brand-600 text-sm font-extrabold text-white hover:bg-brand-700">
                <Mic className="mr-2 inline" size={16} /> Trang luyện tập
              </button>
              <button type="button" onClick={() => patchAnswers({ speakingPart1Mode: 'summary', speakingPart1OpenAnswer: '' })} className="h-12 rounded-full border border-slate-400 text-sm font-extrabold text-slate-700 hover:bg-sky-50">
                <ListChecks className="mr-2 inline" size={16} /> Trang tong hop
              </button>
            </div>
          </div>
        </div>
      </AptisPaper>
    );
  }

  return (
    <AptisPaper narrow compact>
      <div className="mx-auto max-w-[760px] rounded-2xl bg-white p-6 shadow-soft">
        <div className="mb-5 h-1.5 rounded-full bg-sky-200">
          <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
            QUESTION <InlineNumber value={index + 1} /> / {questions.length}
          </div>
          <button type="button" onClick={() => patchAnswers({ speakingPart1Mode: 'summary', speakingPart1OpenAnswer: '' })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-sky-50">
            Trang tong hop
          </button>
        </div>
        <div className="mt-6 flex items-start justify-between gap-4">
          <div>
            {currentFeatured && <div className="mb-2"><FeaturedQuestionBadge /></div>}
            <h2 className="text-xl font-extrabold text-navy">{current.question}</h2>
          </div>
          <SpeakingRecordButton compact />
        </div>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-widest text-slate-600">Your answer</p>
        <textarea
          className="mt-2 min-h-24 w-full rounded-xl border border-brand-100 bg-sky-50 p-4 text-sm italic text-slate-700"
          placeholder="Your speech will appear here..."
          value={saved[`speakingPart1Answer-${index}`] ?? ''}
          onChange={(event) => setAnswer(`speakingPart1Answer-${index}`, event.target.value)}
        />
        <div className="mt-7 border-t border-dashed border-brand-100 pt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => toggleAnswer(`${index}-1`)} className="h-11 rounded-lg border border-brand-600 text-sm font-semibold text-brand-600 hover:bg-blue-50">
              <MessageCircle className="mr-2 inline" size={15} /> Sample Answer 1
            </button>
            <button type="button" onClick={() => toggleAnswer(`${index}-2`)} className="h-11 rounded-lg border border-emerald-600 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              <MessageCircle className="mr-2 inline" size={15} /> Sample Answer 2
            </button>
          </div>
          {(openAnswer === `${index}-1` || openAnswer === `${index}-2`) && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-navy">
              {openAnswer === `${index}-1` ? current.answer1 : current.answer2}
            </div>
          )}
        </div>
      </div>
    </AptisPaper>
  );
}

function SpeakingPart2Renderer({ data, saved, setAnswer, patchAnswers }: {
  data: TemplateData;
  saved: Record<string, string>;
  setAnswer: (key: string, next: string) => void;
  patchAnswers: (next: Record<string, string>) => void;
}) {
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const mode = saved.speakingPart2Mode ?? 'intro';
  const index = Math.min(Math.max(Number(saved.speakingPart2Index ?? 0), 0), Math.max(questions.length - 1, 0));
  const tab = Math.min(Math.max(Number(saved.speakingPart2Tab ?? 0), 0), 2);
  const current = questions[index] ?? {};
  const currentFeatured = isFeaturedTemplateItem(current);
  const [imageFailed, setImageFailed] = useState(false);
  const prompt = current[`question${tab + 1}`] ?? 'Describe the picture?';
  const sample = current[`question${tab + 1}_answer`] ?? '';
  const showSample = saved.speakingPart2ShowSample === 'true';
  const progress = questions.length ? Math.max(4, Math.round(((index + 1) / questions.length) * 100)) : 0;
  const tabs = [
    { label: 'Q1 - Mô tả', icon: BookOpen },
    { label: 'Q2 - Liên quan', icon: MessageCircle },
                { label: 'Q3 - Ý kiến', icon: HelpCircle }
  ];

  const imageUrl = resolveLocalSpeakingImage(current.urlpic1, localSpeakingImage('part2', `${index + 1}.png`));

  useEffect(() => {
    setImageFailed(false);
  }, [index, imageUrl]);

  function openPractice(nextIndex = 0) {
    patchAnswers({
      speakingPart2Mode: 'practice',
      speakingPart2Index: String(Math.min(Math.max(nextIndex, 0), Math.max(questions.length - 1, 0))),
      speakingPart2Tab: '0',
      speakingPart2ShowSample: 'false'
    });
  }

  function openSummary() {
    patchAnswers({ speakingPart2Mode: 'summary' });
  }

  function setTab(nextTab: number) {
    patchAnswers({ speakingPart2Tab: String(nextTab), speakingPart2ShowSample: 'false' });
  }

  if (mode === 'summary') {
    return (
      <AptisPaper narrow compact>
        <div className="mx-auto max-w-[1180px] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold">
              <ListChecks className="text-brand-600" /> Speaking Part 2 - Danh sách câu hỏi
            </h1>
            <div className="flex gap-2">
              <button type="button" onClick={() => openPractice(index)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white">Trang luyện tập</button>
              <button type="button" onClick={() => patchAnswers({ speakingPart2Mode: 'intro' })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Giới thiệu</button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {questions.map((item: any, itemIndex: number) => {
              const summaryImageUrl = resolveLocalSpeakingImage(item.urlpic1, localSpeakingImage('part2', `${itemIndex + 1}.png`));
              return (
                <button
                  type="button"
                  key={`${item.urlpic1 ?? itemIndex}-${item.question1 ?? itemIndex}`}
                  onClick={() => openPractice(itemIndex)}
                  className={`grid gap-4 rounded-xl border bg-white p-4 text-left shadow-soft transition hover:border-brand-300 hover:bg-blue-50 sm:grid-cols-[180px_1fr] ${isFeaturedTemplateItem(item) ? 'border-amber-400 ring-4 ring-amber-100' : 'border-brand-100'}`}
                >
                  <img className="h-32 w-full rounded-lg bg-sky-100 object-cover" src={summaryImageUrl} alt={`Speaking Part 2 question ${itemIndex + 1}`} />
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold text-brand-600">Câu {itemIndex + 1}</p>
                      {isFeaturedTemplateItem(item) && <FeaturedQuestionBadge />}
                    </div>
                    <div className="space-y-2 text-sm leading-6 text-slate-700">
                      <p><b>Q1:</b> {item.question1 ?? 'Describe the picture?'}</p>
                      <p><b>Q2:</b> {item.question2 ?? 'Answer the related question.'}</p>
                      <p><b>Q3:</b> {item.question3 ?? 'Give your opinion.'}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </AptisPaper>
    );
  }

  if (mode !== 'practice') {
    return (
      <AptisPaper narrow compact>
        <div className="mx-auto max-w-[880px] space-y-5">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-sm text-white">i</span>
            Giới thiệu - Speaking Part 2
          </h1>
          <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-soft">
            <div className="grid grid-cols-[1.35fr_1fr_1.35fr] bg-blue-50 text-center text-sm font-extrabold text-blue-950">
              <div className="border-r border-brand-100 p-4">Phần thi</div>
              <div className="border-r border-brand-100 p-4">Mô tả</div>
              <div className="p-4">Hướng dẫn ôn tập</div>
            </div>
            <div className="grid min-h-[250px] grid-cols-[1.35fr_1fr_1.35fr] text-sm leading-7">
              <div className="border-r border-brand-100 bg-sky-50 p-6 font-bold">
                <p>Part 2:</p>
                <p>Mô tả, bày tỏ ý kiến, nêu lý do và giải thích.</p>
              </div>
              <div className="border-r border-brand-100 p-6">
                Trong phần này, bạn cần <b>mô tả một hình ảnh</b> và trả lời thêm <b>hai câu hỏi</b> liên quan.
                Mỗi câu hỏi có <b>45 giây</b> để trả lời.
              </div>
              <div className="space-y-4 p-6">
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">?</span>Luyện nói trôi chảy và tự nhiên, trả lời đủ cả ba câu.</p>
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">?</span>Khi mô tả ảnh, hãy nói rõ vị trí, hành động, cảm xúc và bối cảnh.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
            <TrendingUp className="mr-3 inline text-cyan-700" size={22} />
            <b>Thang điểm APTIS:</b> từ A0 đến C1. Part 2 đánh giá khả năng mô tả, lý giải và bày tỏ ý kiến bằng tiếng Anh.
          </div>
          <div className="rounded-2xl bg-white p-6 text-center shadow-soft">
            <p className="mb-4 text-sm font-semibold text-slate-600">Chọn chủ đề học</p>
            <div className="mx-auto grid max-w-[620px] gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => openPractice(0)} className="h-12 rounded-full bg-brand-600 text-sm font-extrabold text-white hover:bg-brand-700">
                <Mic className="mr-2 inline" size={16} /> Trang luyện tập
              </button>
              <button type="button" onClick={openSummary} className="h-12 rounded-full border border-slate-400 text-sm font-extrabold text-slate-700 hover:bg-sky-50">
                <ListChecks className="mr-2 inline" size={16} /> Trang tổng hợp
              </button>
            </div>
          </div>
        </div>
      </AptisPaper>
    );
  }

  return (
    <AptisPaper narrow compact>
      <div className="mx-auto max-w-[800px] overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="border-b border-brand-100 px-7 py-5">
          <div className="mb-4 h-1.5 rounded-full bg-sky-200">
            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-base font-extrabold text-slate-700">
              Speak question <InlineNumber value={index + 1} /> / {questions.length}
            </div>
            <button type="button" onClick={openSummary} className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-sky-50">
              Trang tổng hợp
            </button>
          </div>
        </div>
        <div className="p-7">
          <div className="rounded-xl border border-brand-100 bg-white p-3">
            {!imageFailed && imageUrl ? (
              <img
                className="mx-auto h-[300px] w-full max-w-[520px] object-cover"
                src={imageUrl}
                alt="Speaking Part 2 prompt"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-lg bg-sky-100 text-center text-sm font-semibold text-slate-600">
                Chưa tải được ảnh. Kiểm tra file trong public/images/speaking/part2.
              </div>
            )}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {tabs.map((item, itemIndex) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => setTab(itemIndex)}
                  className={`h-11 rounded-lg border text-sm font-semibold ${tab === itemIndex ? 'border-brand-600 bg-blue-50 text-brand-600' : 'border-brand-100 bg-sky-50 text-slate-600'}`}
                >
                  <Icon className="mr-1.5 inline" size={15} />{item.label}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <div>
              {currentFeatured && <div className="mb-2"><FeaturedQuestionBadge /></div>}
              <h2 className="text-xl font-bold">{prompt}</h2>
            </div>
            <SpeakingRecordButton compact />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-600">Your answer</p>
          <textarea
            className="mt-2 min-h-20 w-full rounded-xl border border-brand-100 bg-sky-50 p-4 italic text-slate-600"
            placeholder="Your speech will appear here..."
            value={saved[`speakingPart2Answer-${index}-${tab}`] ?? ''}
            onChange={(event) => setAnswer(`speakingPart2Answer-${index}-${tab}`, event.target.value)}
          />
          <div className="mt-7 border-t border-dashed border-brand-100 pt-5">
            <button
              type="button"
              onClick={() => patchAnswers({ speakingPart2ShowSample: showSample ? 'false' : 'true' })}
              className="h-10 w-full rounded-lg border border-brand-600 text-sm font-semibold text-brand-600 hover:bg-blue-50"
            >
              <MessageCircle className="mr-2 inline" size={15} />{showSample ? 'Ẩn Sample Answer' : 'Sample Answer'}
            </button>
            {showSample && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-navy">
                {sample || 'Chưa có đáp án mẫu cho câu này.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </AptisPaper>
  );
}

function SpeakingPart3Renderer({ data, saved, setAnswer, patchAnswers }: {
  data: TemplateData;
  saved: Record<string, string>;
  setAnswer: (key: string, next: string) => void;
  patchAnswers: (next: Record<string, string>) => void;
}) {
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const mode = saved.speakingPart3Mode ?? 'intro';
  const index = Math.min(Math.max(Number(saved.speakingPart3Index ?? 0), 0), Math.max(questions.length - 1, 0));
  const tab = Math.min(Math.max(Number(saved.speakingPart3Tab ?? 0), 0), 2);
  const current = questions[index] ?? {};
  const currentFeatured = isFeaturedTemplateItem(current);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const prompt = pickTextValue(
    current,
    [
      `question${tab + 1}`,
      `question_${tab + 1}`,
      `q${tab + 1}`,
      `prompt${tab + 1}`,
      `prompt_${tab + 1}`,
      tab === 0 ? 'compareQuestion' : tab === 1 ? 'relatedQuestion' : 'opinionQuestion'
    ],
    tab === 0 ? 'Describe the picture?' : tab === 1 ? 'Answer the related question.' : 'Give your opinion.'
  );
  const sample = pickTextValue(current, [
    `question${tab + 1}_answer`,
    `question_${tab + 1}_answer`,
    `q${tab + 1}_answer`,
    `answer${tab + 1}`,
    `answer_${tab + 1}`,
    `sample${tab + 1}`,
    `sampleAnswer${tab + 1}`,
    tab === 0 ? 'compareAnswer' : tab === 1 ? 'relatedAnswer' : 'opinionAnswer'
  ]);
  const showSample = saved.speakingPart3ShowSample === 'true';
  const progress = questions.length ? Math.max(4, Math.round(((index + 1) / questions.length) * 100)) : 0;
  const image1Url = getSpeakingImageUrl(current, 1, index);
  const image2Url = getSpeakingImageUrl(current, 2, index);
  const tabs = [
    { label: 'Q1 - So sánh', icon: BookOpen },
    { label: 'Q2 - Liên quan', icon: MessageCircle },
    { label: 'Q3 - Ý kiến', icon: HelpCircle }
  ];

  useEffect(() => {
    setFailedImages({});
  }, [index, image1Url, image2Url]);

  function getSpeakingImageUrl(question: Record<string, unknown>, side: 1 | 2, questionIndex: number) {
    const keys = side === 1
      ? ['urlpic1', 'urlPic1', 'url_pic1', 'url_pic_1', 'image1', 'image1Url', 'image_1', 'picture1', 'picture1Url', 'pic1', 'photo1', 'photo1Url']
      : ['urlpic2', 'urlPic2', 'url_pic2', 'url_pic_2', 'image2', 'image2Url', 'image_2', 'picture2', 'picture2Url', 'pic2', 'photo2', 'photo2Url'];
    const value = keys
      .map((key) => question?.[key])
      .find((item) => typeof item === 'string' && item.trim().length > 0);

    return resolveLocalSpeakingImage(value, localSpeakingPart3Image(questionIndex, side));
  }

  function openPractice(nextIndex = 0) {
    patchAnswers({
      speakingPart3Mode: 'practice',
      speakingPart3Index: String(Math.min(Math.max(nextIndex, 0), Math.max(questions.length - 1, 0))),
      speakingPart3Tab: '0',
      speakingPart3ShowSample: 'false'
    });
  }

  function openSummary() {
    patchAnswers({ speakingPart3Mode: 'summary' });
  }

  function setTab(nextTab: number) {
    patchAnswers({ speakingPart3Tab: String(nextTab), speakingPart3ShowSample: 'false' });
  }

  function renderPromptImage(src: string, label: string, keyName: string) {
    if (!src || failedImages[keyName]) {
      return (
        <div className="relative flex h-[198px] items-center justify-center rounded-lg border border-brand-100 bg-sky-50 text-center text-xs font-semibold text-slate-600">
          <span className="absolute left-2 top-2 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-white">{label}</span>
          Chưa tải được ảnh. Kiểm tra file trong public/images/speaking/part3.
        </div>
      );
    }

    return (
      <div className="relative overflow-hidden rounded-lg border border-brand-100 bg-sky-50">
        <span className="absolute left-2 top-2 z-10 rounded-full bg-slate-700 px-2 py-0.5 text-xs font-bold text-white">{label}</span>
        <img
          className="h-[198px] w-full object-cover"
          src={src}
          alt={label}
          onError={() => setFailedImages((currentFailed) => ({ ...currentFailed, [keyName]: true }))}
        />
      </div>
    );
  }

  if (mode === 'summary') {
    return (
      <AptisPaper narrow compact>
        <div className="mx-auto max-w-[1180px] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold">
              <ListChecks className="text-brand-600" /> Speaking Part 3 - Danh sách câu hỏi
            </h1>
            <div className="flex gap-2">
              <button type="button" onClick={() => openPractice(index)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white">Trang luyện tập</button>
              <button type="button" onClick={() => patchAnswers({ speakingPart3Mode: 'intro' })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Giới thiệu</button>
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {questions.map((item: any, itemIndex: number) => {
              const image1 = getSpeakingImageUrl(item, 1, itemIndex);
              const image2 = getSpeakingImageUrl(item, 2, itemIndex);
              const question1 = pickTextValue(item, ['question1', 'question_1', 'q1', 'prompt1', 'prompt_1', 'compareQuestion'], 'Describe the picture?');
              const question2 = pickTextValue(item, ['question2', 'question_2', 'q2', 'prompt2', 'prompt_2', 'relatedQuestion'], 'Answer the related question.');
              const question3 = pickTextValue(item, ['question3', 'question_3', 'q3', 'prompt3', 'prompt_3', 'opinionQuestion'], 'Give your opinion.');
              return (
                <button
                  type="button"
                  key={`${image1}-${image2}-${itemIndex}`}
                  onClick={() => openPractice(itemIndex)}
                  className={`rounded-xl border bg-white p-4 text-left shadow-soft transition hover:border-brand-300 hover:bg-blue-50 ${isFeaturedTemplateItem(item) ? 'border-amber-400 ring-4 ring-amber-100' : 'border-brand-100'}`}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-extrabold text-brand-600">Câu {itemIndex + 1}</p>
                    {isFeaturedTemplateItem(item) && <FeaturedQuestionBadge />}
                  </div>
                  <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    <img className="h-32 w-full rounded-lg bg-sky-100 object-cover" src={image1} alt={`Speaking Part 3 question ${itemIndex + 1} image 1`} />
                    <img className="h-32 w-full rounded-lg bg-sky-100 object-cover" src={image2} alt={`Speaking Part 3 question ${itemIndex + 1} image 2`} />
                  </div>
                  <div className="space-y-2 text-sm leading-6 text-slate-700">
                    <p><b>Q1:</b> {question1}</p>
                    <p><b>Q2:</b> {question2}</p>
                    <p><b>Q3:</b> {question3}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </AptisPaper>
    );
  }

  if (mode !== 'practice') {
    return (
      <AptisPaper narrow compact>
        <div className="mx-auto max-w-[880px] space-y-5">
          <h1 className="flex items-center gap-3 text-2xl font-extrabold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-sm text-white">i</span>
            Giới thiệu - Speaking Part 3
          </h1>
          <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-soft">
            <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-blue-50 text-center text-sm font-extrabold text-blue-950">
              <div className="border-r border-brand-100 p-4">Phần thi</div>
              <div className="border-r border-brand-100 p-4">Mô tả</div>
              <div className="p-4">Hướng dẫn ôn tập</div>
            </div>
            <div className="grid min-h-[300px] grid-cols-[1.4fr_1fr_1fr] text-sm leading-7">
              <div className="border-r border-brand-100 bg-sky-50 p-6 font-bold">
                <p>Part 3:</p>
                <p>Mô tả, so sánh, cung cấp lý do và giải thích.</p>
              </div>
              <div className="border-r border-brand-100 p-6">
                Trong phần này, bạn sẽ được yêu cầu <b>so sánh hai bức ảnh</b> và sau đó trả lời <b>hai câu hỏi</b> liên quan đến chủ đề. Độ khó sẽ tăng dần từ mô tả đến suy đoán.
                <br /><br />Thời gian nói: <b>45 giây / câu hỏi.</b>
              </div>
              <div className="space-y-4 p-6">
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">?</span>Để chuẩn bị cho bài tập này, hãy luyện nói so sánh hai vật thể khác nhau và tập trung mô tả ưu, nhược điểm.</p>
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">?</span>Với phần suy đoán, dùng cấu trúc như <i>might, could, seem to, appear to</i>.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
            <TrendingUp className="mr-3 inline text-cyan-700" size={22} />
            <b>Thang điểm APTIS:</b> từ A0 đến C1. Part 3 đánh giá khả năng so sánh, lập luận và suy đoán bằng tiếng Anh.
          </div>
          <div className="rounded-2xl bg-white p-6 text-center shadow-soft">
            <p className="mb-4 text-sm font-semibold text-slate-600">Chọn chủ đề học</p>
            <div className="mx-auto grid max-w-[620px] gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => openPractice(0)} className="h-12 rounded-full bg-brand-600 text-sm font-extrabold text-white hover:bg-brand-700">
                <Mic className="mr-2 inline" size={16} /> Trang luyện tập
              </button>
              <button type="button" onClick={openSummary} className="h-12 rounded-full border border-slate-400 text-sm font-extrabold text-slate-700 hover:bg-sky-50">
                <ListChecks className="mr-2 inline" size={16} /> Trang tổng hợp
              </button>
            </div>
          </div>
        </div>
      </AptisPaper>
    );
  }

  return (
    <AptisPaper narrow compact>
      <div className="mx-auto max-w-[840px] overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="border-b border-brand-100 px-7 py-5">
          <div className="mb-4 h-1.5 rounded-full bg-sky-200">
            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-base font-extrabold text-slate-700">
              Speak question <InlineNumber value={index + 1} /> / {questions.length}
            </div>
            <button type="button" onClick={openSummary} className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-sky-50">
              Trang tổng hợp
            </button>
          </div>
        </div>
        <div className="p-7">
          <div className="grid gap-3 rounded-xl border border-brand-100 bg-white p-3 sm:grid-cols-2">
            {renderPromptImage(image1Url, 'ảnh 1', `urlpic1-${index}`)}
            {renderPromptImage(image2Url, 'ảnh 2', `urlpic2-${index}`)}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {tabs.map((item, itemIndex) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => setTab(itemIndex)}
                  className={`h-11 rounded-lg border text-sm font-semibold ${tab === itemIndex ? 'border-brand-600 bg-blue-50 text-brand-600' : 'border-brand-100 bg-sky-50 text-slate-600'}`}
                >
                  <Icon className="mr-1.5 inline" size={15} />{item.label}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <div>
              {currentFeatured && <div className="mb-2"><FeaturedQuestionBadge /></div>}
              <h2 className="text-xl font-bold">{prompt}</h2>
            </div>
            <SpeakingRecordButton compact />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-600">Your answer</p>
          <textarea
            className="mt-2 min-h-20 w-full rounded-xl border border-brand-100 bg-sky-50 p-4 italic text-slate-600"
            placeholder="Your speech will appear here..."
            value={saved[`speakingPart3Answer-${index}-${tab}`] ?? ''}
            onChange={(event) => setAnswer(`speakingPart3Answer-${index}-${tab}`, event.target.value)}
          />
          <div className="mt-7 border-t border-dashed border-brand-100 pt-5">
            <button
              type="button"
              onClick={() => patchAnswers({ speakingPart3ShowSample: showSample ? 'false' : 'true' })}
              className="h-10 w-full rounded-lg border border-brand-600 text-sm font-semibold text-brand-600 hover:bg-blue-50"
            >
              <MessageCircle className="mr-2 inline" size={15} />{showSample ? 'Ẩn Sample Answer' : 'Sample Answer'}
            </button>
            {showSample && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-navy">
                {sample || 'Chưa có đáp án mẫu cho câu này.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </AptisPaper>
  );
}

function SpeakingPart4Renderer({ data, saved, setAnswer, patchAnswers }: {
  data: TemplateData;
  saved: Record<string, string>;
  setAnswer: (key: string, next: string) => void;
  patchAnswers: (next: Record<string, string>) => void;
}) {
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const mode = saved.speakingPart4Mode ?? 'intro';
  const openAnswer = saved.speakingPart4OpenAnswer ?? '';
  const index = Math.min(Math.max(Number(saved.speakingPart4Index ?? 0), 0), Math.max(questions.length - 1, 0));
  const current = questions[index] ?? {};
  const currentFeatured = isFeaturedTemplateItem(current);
  const showSample = saved.speakingPart4ShowSample === 'true';
  const progress = questions.length ? Math.max(2, Math.round(((index + 1) / questions.length) * 100)) : 0;

  function openPractice(nextIndex = 0) {
    patchAnswers({
      speakingPart4Mode: 'practice',
      speakingPart4Index: String(Math.min(Math.max(nextIndex, 0), Math.max(questions.length - 1, 0))),
      speakingPart4ShowSample: 'false',
      speakingPart4OpenAnswer: ''
    });
  }

  function openSummary() {
    patchAnswers({ speakingPart4Mode: 'summary', speakingPart4OpenAnswer: '' });
  }

  function toggleAnswer(index: number) {
    patchAnswers({ speakingPart4OpenAnswer: openAnswer === String(index) ? '' : String(index) });
  }

  if (mode === 'intro') {
    return (
      <AptisPaper narrow compact>
        <div className="mx-auto max-w-[820px] space-y-5">
          <h1 className="flex items-center gap-3 text-2xl font-extrabold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-sm text-white">i</span>
            Giới thiệu - Speaking Part 4
          </h1>
          <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-soft">
            <div className="grid grid-cols-[100px_1fr_1fr] bg-blue-50 text-center text-sm font-extrabold text-blue-950">
              <div className="border-r border-brand-100 p-4">Phần thi</div>
              <div className="border-r border-brand-100 p-4">Mô tả</div>
              <div className="p-4">Hướng dẫn ôn tập</div>
            </div>
            <div className="grid min-h-[390px] grid-cols-[100px_1fr_1fr] text-sm leading-7">
              <div className="border-r border-brand-100 bg-sky-50 p-5 font-bold">
                <p>Part 4:</p>
                <p>Thảo luận kinh nghiệm cá nhân và đưa ra ý kiến cho mỗi chủ đề trừu tượng.</p>
              </div>
              <div className="border-r border-brand-100 p-6">
                Trong phần cuối, bạn sẽ quan sát một bức ảnh và <b>trả lời ba câu hỏi</b> về một chủ đề trừu tượng.
                <br /><br />
                Thí sinh có <b>1 phút</b> để chuẩn bị câu trả lời và có thể ghi chú.
                <br /><br />
                Thời gian nói: <b>2 phút.</b>
              </div>
              <div className="space-y-4 p-6">
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs text-white">!</span>Một lỗi phổ biến là mô tả bức ảnh. Part 4 cần trả lời sâu hơn về chủ đề.</p>
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs text-white">!</span>Tránh đi lệch đề. Hãy trả lời rõ ràng, mạch lạc và dùng cấu trúc chính xác.</p>
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">?</span>Luyện nói trong hai phút về một chủ đề trừu tượng để quen thời lượng thi.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
            <TrendingUp className="mr-3 inline text-cyan-700" size={22} />
            <b>Thang điểm APTIS:</b> từ A0 đến C1. Part 4 đánh giá khả năng thảo luận kinh nghiệm cá nhân, đưa ra ý kiến và lập luận về chủ đề trừu tượng.
          </div>
          <div className="rounded-2xl bg-white p-6 text-center shadow-soft">
            <p className="mb-4 text-sm font-semibold text-slate-600">Chọn chủ đề học</p>
            <div className="mx-auto grid max-w-[580px] gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => openPractice(0)} className="h-12 rounded-full bg-brand-600 text-sm font-extrabold text-white hover:bg-brand-700">
                <Mic className="mr-2 inline" size={16} /> Trang luyện tập
              </button>
              <button type="button" onClick={openSummary} className="h-12 rounded-full border border-slate-400 text-sm font-extrabold text-slate-700 hover:bg-sky-50">
                <ListChecks className="mr-2 inline" size={16} /> Trang tổng hợp
              </button>
            </div>
          </div>
        </div>
      </AptisPaper>
    );
  }

  if (mode === 'practice') {
    return (
      <AptisPaper narrow compact>
        <div className="mx-auto max-w-[760px] overflow-hidden rounded-2xl bg-white shadow-soft">
          <div className="border-b border-brand-100 px-7 py-5">
            <div className="mb-4 h-1.5 rounded-full bg-sky-200">
              <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-base font-extrabold text-slate-700">
              QUESTION <InlineNumber value={index + 1} /> / {questions.length}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                <Clock className="mr-1 inline" size={13} /> Chuẩn bị: 1 phút
              </span>
              <span className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                <Mic className="mr-1 inline" size={13} /> Nói: 2 phút
              </span>
            </div>
          </div>
          <div className="p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                {currentFeatured && <div className="mb-2"><FeaturedQuestionBadge /></div>}
                <h2 className="text-xl font-bold">{current.question ?? 'Speaking Part 4 question'}</h2>
              </div>
              <SpeakingRecordButton compact durationSeconds={120} />
            </div>
            <p className="mt-8 text-xs font-bold uppercase tracking-widest text-slate-600">Your answer</p>
            <textarea
              className="mt-2 min-h-24 w-full rounded-xl border border-brand-100 bg-sky-50 p-4 italic text-slate-600"
              placeholder="Your speech will appear here..."
              value={saved[`speakingPart4Answer-${index}`] ?? ''}
              onChange={(event) => setAnswer(`speakingPart4Answer-${index}`, event.target.value)}
            />
            <div className="mt-7 border-t border-dashed border-brand-100 pt-5">
              <button
                type="button"
                onClick={() => patchAnswers({ speakingPart4ShowSample: showSample ? 'false' : 'true' })}
                className="h-10 w-full rounded-lg border border-brand-600 text-sm font-semibold text-brand-600 hover:bg-blue-50"
              >
                <MessageCircle className="mr-2 inline" size={15} />{showSample ? 'Ẩn Sample Answer' : 'Sample Answer'}
              </button>
              {showSample && (
                <div
                  className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-navy"
                  dangerouslySetInnerHTML={{ __html: current.answer1 || 'Chưa có đáp án mẫu cho câu này.' }}
                />
              )}
            </div>
          </div>
        </div>
      </AptisPaper>
    );
  }

  return (
    <AptisPaper narrow compact>
      <div className="mx-auto max-w-[1160px] space-y-5">
        <h1 className="flex items-center gap-3 text-2xl font-extrabold">
          <ListChecks className="text-brand-600" size={24} />
          Speaking Part 4 - Danh sách câu hỏi
        </h1>
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-soft">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-sky-50 text-left">
              <tr>
                <th className="w-12 border-b border-r border-slate-300 px-3 py-3">#</th>
                <th className="border-b border-r border-slate-300 px-3 py-3">Câu hỏi</th>
                <th className="w-44 border-b border-slate-300 px-3 py-3">Đáp án mẫu</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question: any, index: number) => {
                const isOpen = openAnswer === String(index);
                return (
                  <Fragment key={`${question.question}-${index}`}>
                    <tr className={`border-b border-brand-100 ${isFeaturedTemplateItem(question) ? 'bg-amber-50' : ''}`}>
                      <td className="border-r border-brand-100 px-3 py-3 font-bold text-slate-700">{index + 1}</td>
                      <td className="border-r border-brand-100 px-3 py-3">
                        <span>{question.question}</span>
                        {isFeaturedTemplateItem(question) && <span className="mt-2 block"><FeaturedQuestionBadge /></span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAnswer(index)}
                          className="h-9 rounded-md border border-brand-600 px-4 text-sm font-semibold text-brand-600 hover:bg-blue-50"
                        >
                          {isOpen ? 'Ẩn đáp án' : 'Xem đáp án'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td className="border-r border-brand-100 bg-blue-50" />
                        <td colSpan={2} className="border-l-4 border-brand-600 bg-blue-50 p-5">
                          <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-slate-600">Đáp án mẫu</p>
                          <div
                            className="prose max-w-none text-sm leading-7 text-navy"
                            dangerouslySetInnerHTML={{ __html: question.answer1 || 'Chưa có đáp án mẫu.' }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AptisPaper>
  );
}

function SpeakingRecordButton({ compact, durationSeconds = 45 }: { compact?: boolean; durationSeconds?: number }) {
  const duration = durationSeconds;
  const [recording, setRecording] = useState(false);
  const [remaining, setRemaining] = useState(duration);
  const [audioUrl, setAudioUrl] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const progress = ((duration - remaining) / duration) * 100;

  useEffect(() => {
    if (!recording) return;
    if (remaining <= 0) {
      stopRecording();
      return;
    }
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [recording, remaining]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Trình duyệt chưa hỗ trợ ghi âm bằng micro.');
      return;
    }

    try {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl('');
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setRemaining(duration);
      setRecording(true);
    } catch {
      toast.error('Không mở được micro. Hãy cho phép quyền ghi âm trên trình duyệt.');
    }
  }

  function stopRecording() {
    setRecording(false);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }

  if (compact) {
    return (
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          className={`inline-flex h-11 items-center gap-2 rounded-full px-6 font-bold text-white ${recording ? 'bg-slate-800' : 'bg-red-500 hover:bg-red-600'}`}
        >
          <Mic size={16} />{recording ? `Còn ${remaining}s` : 'Record'}
        </button>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-red-100">
          <span className="block h-full rounded-full bg-red-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        {audioUrl && <audio className="h-9 w-52" controls src={audioUrl} />}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center sm:justify-between">
      <div>
        <p className="font-extrabold text-navy">Thời gian nói: 45 giây</p>
        <p className="mt-1 text-sm text-slate-600">{recording ? `Đang ghi âm, còn ${remaining} giây.` : remaining === 0 ? 'Đã hết thời gian nói.' : 'Bấm bắt đầu ghi âm để tính giờ.'}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-2 w-32 overflow-hidden rounded-full bg-red-100">
          <span className="block h-full rounded-full bg-red-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          className={`inline-flex h-11 items-center gap-2 rounded-full px-5 font-bold text-white ${recording ? 'bg-slate-800' : 'bg-red-500 hover:bg-red-600'}`}
        >
          <Mic size={16} />{recording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
        </button>
      </div>
      {audioUrl && (
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-bold text-slate-700">Bạn ghi của bạn</p>
          <audio className="w-full" controls src={audioUrl} />
        </div>
      )}
    </div>
  );
}

function WritingClubCollectionRenderer({ data, saved, initialClubIndex, setAnswer, patchAnswers, showAnswers, setShowAnswers }: {
  data: TemplateData;
  saved: Record<string, string>;
  initialClubIndex?: number;
  setAnswer: (key: string, next: string) => void;
  patchAnswers: (next: Record<string, string>) => void;
  showAnswers: boolean;
  setShowAnswers: Dispatch<SetStateAction<boolean>>;
}) {
  const clubs = data.clubs ?? [];
  const selectedClubIndex = Number(saved.selectedClubIndex ?? initialClubIndex ?? -1);
  const partIndex = Number(saved.writingPartIndex ?? 0);
  const club = clubs[selectedClubIndex];
  const palette = ['bg-amber-400 text-navy', 'bg-emerald-700 text-white', 'bg-red-500 text-white', 'bg-cyan-500 text-navy', 'bg-brand-600 text-white'];
  const sampleHtml = (html?: string) => ({ __html: (html ?? '').replace(/\n/g, '<br />') });
  const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;
  const writingInstruction = (text: string | undefined, currentPart: number) => {
    if (currentPart === 0) {
      const clubDisplayName = displayWritingClubName(club.clubName, selectedClubIndex);
      const article = /^[aeiou]/i.test(clubDisplayName) ? 'an' : 'a';
      return `You are joining ${article} ${clubDisplayName}. Fill out the form. Write short answers (1-5 words) for each message (Bài này nên trả lời dài nhất là 5 từ, viết hoa từ đầu và dấu chấm kết thúc câu).`;
    }
    if (currentPart === 1) {
      return (text ?? '').replace(/\([^)]*Vi[^)]*\)/, '(Viết 20 đến 30 từ thôi nhé!)');
    }
    return text ?? '';
  };

  function updateWriting(key: string, next: string) {
    setAnswer(`${selectedClubIndex}-${partIndex}-${key}`, next);
  }

  function getWriting(key: string) {
    return saved[`${selectedClubIndex}-${partIndex}-${key}`] ?? '';
  }

  if (!club) {
    return (
      <AptisPaper narrow compact>
        <h1 className="mb-5 text-center text-3xl font-normal">Writing Practice</h1>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clubs.map((item: any, index: number) => (
            <button
              type="button"
              className={`h-11 rounded-md px-5 text-base font-semibold shadow-soft transition hover:-translate-y-0.5 hover:shadow-md ${palette[index % palette.length]}`}
              key={`${item.clubName}-${index}`}
              onClick={() => patchAnswers({ selectedClubIndex: String(index), writingPartIndex: '0' })}
            >
              {displayWritingClubName(item.clubName, index)}
            </button>
          ))}
        </div>
      </AptisPaper>
    );
  }

  const part1 = club.parts?.[0] ?? {};
  const part2 = club.parts?.[1] ?? {};
  const part3 = club.parts?.[2] ?? {};
  const part4 = club.parts?.[3] ?? {};
  const partTitle = partIndex === 3 ? 'Email Writing' : displayWritingClubName(club.clubName, selectedClubIndex);

  return (
    <AptisPaper narrow compact>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="rounded bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white" onClick={() => patchAnswers({ selectedClubIndex: '-1', writingPartIndex: '0' })}>Quay lại danh sách</button>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((index) => (
            <button
              type="button"
              className={`rounded px-3 py-1.5 text-sm font-bold ${partIndex === index ? 'bg-brand-600 text-white' : 'bg-sky-100 text-slate-700 hover:bg-sky-200'}`}
              key={index}
              onClick={() => setAnswer('writingPartIndex', String(index))}
            >
              Câu {index + 1}
            </button>
          ))}
        </div>
      </div>

      <h1 className="mb-3 text-2xl font-normal">Question {partIndex + 1} of 4 - {partTitle}</h1>

      {partIndex === 0 && (
        <>
          <p className="mb-2 text-sm font-semibold">{writingInstruction(part1.instructions, 0)}</p>
          <div className="space-y-3">
            {(part1.prompts ?? []).map((prompt: string, index: number) => (
              <label className="block" key={prompt}>
                <span className="mb-1 block text-sm">{prompt}</span>
                <input className="h-8 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" value={getWriting(`p1-${index}`)} onChange={(event) => updateWriting(`p1-${index}`, event.target.value)} />
              </label>
            ))}
          </div>
        </>
      )}

      {partIndex === 1 && (
        <>
          <p className="mb-2 text-sm font-semibold">{writingInstruction(part2.instructions, 1)}</p>
          <label className="block">
            <span className="mb-1 block text-sm">{part2.prompts?.[0]}</span>
            <textarea className="min-h-24 w-full rounded border border-slate-300 p-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" value={getWriting('p2')} onChange={(event) => updateWriting('p2', event.target.value)} />
            <span className="mt-1 block text-right text-sm text-slate-700">Word Count: {wordCount(getWriting('p2'))}</span>
          </label>
        </>
      )}

      {partIndex === 2 && (
        <>
          <p className="mb-2 text-sm font-semibold">{writingInstruction(part3.instructions, 2)}</p>
          <div className="space-y-3">
            {(part3.prompts ?? []).map((prompt: string, index: number) => {
              const text = getWriting(`p3-${index}`);
              return (
                <label className="block" key={prompt}>
                  <span className="mb-1 block text-sm">{prompt}</span>
                  <textarea className="min-h-16 w-full rounded border border-slate-300 p-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" value={text} onChange={(event) => updateWriting(`p3-${index}`, event.target.value)} />
                  <span className="mt-1 block text-right text-sm text-slate-700">Word Count: {wordCount(text)}</span>
                </label>
              );
            })}
          </div>
        </>
      )}

      {partIndex === 3 && (
        <>
          <p className="mb-2 text-sm font-semibold">{writingInstruction(part4.instructions, 3)}</p>
          <p className="mb-2 text-sm leading-5">{part4.mainText}</p>
          {(part4.prompts ?? []).map((prompt: string, index: number) => {
            const text = getWriting(`p4-${index}`);
            return (
              <label className="mb-4 block" key={prompt}>
                <span className="mb-1 block text-sm font-semibold">{prompt}</span>
                <textarea className="min-h-20 w-full rounded border border-slate-300 p-3 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" value={text} onChange={(event) => updateWriting(`p4-${index}`, event.target.value)} />
                <span className="mt-1 block text-right text-sm text-slate-700">Word Count: {wordCount(text)}</span>
              </label>
            );
          })}
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="rounded bg-cyan-500 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowAnswers((value) => !value)}>
          {showAnswers ? 'Ẩn đáp án mẫu' : 'Đáp án mẫu'}
        </button>
      </div>

      {showAnswers && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-950">
          {partIndex === 0 && (part1.sampleAnswers ?? []).map((answer: string, index: number) => <p key={`${answer}-${index}`}><b>{index + 1}.</b> {answer}</p>)}
          {partIndex === 1 && <p>{part2.sampleAnswers?.[0]}</p>}
          {partIndex === 2 && (part3.sampleAnswers ?? []).map((answer: string, index: number) => <p className="mb-3" key={`${answer}-${index}`}><b>{index + 1}.</b> {answer}</p>)}
          {partIndex === 3 && (part4.sampleAnswers ?? []).map((answer: string, index: number) => <div className="mb-4" key={index} dangerouslySetInnerHTML={sampleHtml(answer)} />)}
        </div>
      )}
    </AptisPaper>
  );
}

function AptisPaper({ children, narrow, classic, compact }: { children: ReactNode; narrow?: boolean; classic?: boolean; compact?: boolean }) {
  if (classic) {
    return (
      <div className="bg-white px-3 pb-36 pt-3 text-navy sm:border-t-2 sm:border-red-600 sm:px-6 sm:pb-24 sm:pt-0">
        <div className="mx-auto max-w-[1180px]">
          {children}
        </div>
      </div>
    );
  }
  return <div className={`mx-auto bg-white text-navy ${compact ? 'px-3 py-3 sm:px-5' : 'px-3 py-5 sm:px-6 sm:py-6'} ${narrow ? 'max-w-[1080px]' : 'max-w-[1120px]'}`}>{children}</div>;
}

function QuestionCounter({ current, total, featured }: { current?: number; total?: number; featured?: boolean }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
      <h1 className="flex flex-wrap items-center gap-2 text-[22px] font-extrabold leading-tight sm:text-xl">
        Question <span className="inline-flex min-w-9 justify-center border-b border-slate-900 px-1">{current ?? 1}</span> of {total ?? 1}
      </h1>
      {featured && <FeaturedQuestionBadge />}
    </div>
  );
}

function InlineNumber({ value = 1 }: { value?: number }) {
  return <span className="inline-flex h-9 min-w-16 items-center justify-center rounded border border-slate-300 bg-white px-4 text-base font-bold">{value}</span>;
}

function AudioBar({ text, audioUrl }: { text?: string; audioUrl?: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const normalizedAudioUrl = normalizeAudioUrl(audioUrl);
  const progress = duration ? Math.min(100, (current / duration) * 100) : 0;

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    audio.pause();
    audio.load();
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [normalizedAudioUrl]);

  async function toggleAudio() {
    const audio = ref.current;
    if (!audio || !normalizedAudioUrl) {
      toast.error('Chưa có link audio cho câu này.');
      return;
    }
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setPlaying(false);
        toast.error('Không phát được audio. Kiểm tra lại link file nghe trong admin.');
      }
    } else {
      audio.pause();
    }
  }

  return (
    <div className="mb-5 rounded-xl bg-[#ef2620] px-4 py-4 text-white shadow-soft sm:flex sm:min-h-12 sm:items-center sm:justify-between sm:gap-4 sm:rounded sm:px-5 sm:py-2">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        {normalizedAudioUrl && (
          <audio
            ref={ref}
            src={normalizedAudioUrl}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={() => {
              setPlaying(false);
              toast.error('Không tải được audio. Kiểm tra lại link file nghe.');
            }}
            onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
            onContextMenu={(event) => event.preventDefault()}
            className="hidden"
          />
        )}
        <button type="button" onClick={toggleAudio} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:h-7 sm:w-7 sm:bg-transparent" aria-label={playing ? 'Pause audio' : 'Play audio'}>
          <Play size={18} fill="currentColor" className={playing ? 'opacity-70' : ''} />
        </button>
        <Volume2 className="hidden sm:block" size={17} fill="currentColor" />
        <div className="relative h-2 min-w-0 flex-1 rounded-full bg-white sm:h-1.5 sm:w-32 sm:flex-none">
          <span className="absolute left-0 top-0 h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
          <span className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-brand-600" style={{ left: `calc(${progress || 50}% - 7px)` }} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-3 sm:mt-0 sm:justify-start">
        <span className="block text-right text-xs font-bold sm:text-left">{text ?? '2 of 2 plays remaining'}</span>
      </div>
    </div>
  );
}

function TemplateSelect({ value, options, onChange, wide, compact, status }: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  wide?: boolean;
  compact?: boolean;
  status?: 'correct' | 'wrong' | 'answer';
}) {
  const [open, setOpen] = useState(false);
  const label = value || '-- Select an answer --';
  const statusClass = status === 'correct'
    ? 'border-green-600 bg-green-50 ring-2 ring-green-200'
    : status === 'wrong'
      ? 'border-red-600 bg-red-50 ring-2 ring-red-200'
      : status === 'answer'
        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
        : '';
  if (!wide) {
    return (
      <select className={`rounded-md border border-[#c8c78d] bg-white px-2 text-[13px] outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-200 ${statusClass} ${compact ? 'mx-1 h-8 min-w-20' : 'h-11 w-full max-w-[280px]'}`} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">-- Select an answer --</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  return (
    <div className="relative w-full">
      <button
        type="button"
        className={`flex h-11 w-full items-center justify-between rounded-md border bg-white px-4 text-left text-[15px] outline-none transition ${statusClass} ${open ? 'border-blue-400 ring-4 ring-blue-200' : 'border-[#c8c78d]'}`}
        onClick={() => setOpen((next) => !next)}
      >
        <span className={value ? 'text-navy' : 'text-navy'}>{label}</span>
        <ChevronDown className={`shrink-0 text-slate-700 transition ${open ? 'rotate-180' : ''}`} size={18} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[42px] z-50 border border-slate-500 bg-white shadow-lift">
          <button
            type="button"
            className="block h-9 w-full bg-[#2569d2] px-4 text-left text-white"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            -- Select an answer --
          </button>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className="block min-h-9 w-full px-4 py-1.5 text-left text-navy hover:bg-blue-50"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ShowParagraphButton() {
  return <button type="button" className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-extrabold text-white shadow-soft hover:bg-brand-700">Show paragraph</button>;
}
