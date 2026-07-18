import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Fragment } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, BookOpen, CalendarPlus, CheckSquare, Clock, FileSearch, HelpCircle, LayoutDashboard, ListChecks, LogOut, MessageCircle, Mic, Play, RotateCcw, Search, Settings, TrendingUp, Volume2 } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { Answer, Question, Submission, Test } from '../../types';

const examLinks = [
  { to: '/app', label: 'Trang chủ', icon: LayoutDashboard, active: false },
  { to: '/app/tests', label: 'Luyện tập', icon: BookOpen, active: true },
  { to: '/app/exams', label: 'Đề thi', icon: ListChecks, active: false },
  { to: '/app/predictions', label: 'Dự đoán đề', icon: FileSearch, active: false },
  { to: '/app/renewal', label: 'Gia hạn', icon: CalendarPlus, active: false },
  { to: '/app/settings', label: 'Cài đặt', icon: Settings, active: false }
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
  const classicTemplate = isClassicAptisTemplate(renderTemplateData);
  const selfCheckingTemplate = isSelfCheckingTemplate(renderTemplateData);
  const fullListeningExam = useMemo(() => isFullListeningExam(test, questions ?? []), [test, questions]);
  const listeningReview = useMemo(() => buildListeningExamReview(test, questions ?? [], answers), [test, questions, answers]);
  const fullReadingExam = useMemo(() => isExamSetMode && isFullReadingExam(test, questions ?? []), [isExamSetMode, test, questions]);
  const readingReview = useMemo(() => buildReadingExamReview(test, questions ?? [], answers), [test, questions, answers]);
  const canCheckCurrent = !fullReadingExam || currentIndex >= totalQuestions - 1;
  const showClassicCheckButton = (!fullListeningExam && !fullReadingExam) || currentIndex >= totalQuestions - 1;
  const activeChecked = activeQuestion ? checkedAnswers[activeQuestion.id] : undefined;
  const sharedAudioUrl = useMemo(() => getSharedAudioUrl(questions ?? []), [questions]);
  const audioUrl = activeQuestion ? getQuestionAudioUrl(activeQuestion, renderTemplateData, sharedAudioUrl) : '';
  const scriptText = activeQuestion ? getQuestionScriptText(activeQuestion, renderTemplateData) : '';
  const topicTitle = activeQuestion?.topic || test?.title || 'Luyện thi Aptis';
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
  const isWritingClubQuestion = renderTemplateData?.template === 'WRITING_CLUB_COLLECTION';
  const isSpeakingPart1Question = renderTemplateData?.template === 'SPEAKING_PART1';
  const isSpeakingPart2Question = renderTemplateData?.template === 'SPEAKING_PART2';
  const isSpeakingPart3Question = renderTemplateData?.template === 'SPEAKING_PART3';
  const isSpeakingPart4Question = renderTemplateData?.template === 'SPEAKING_PART4';
  const writingPartIndex = Math.min(3, Math.max(0, Number(activeSavedAnswer.writingPartIndex ?? 0)));
  const speakingPart1Mode = activeSavedAnswer.speakingPart1Mode ?? 'intro';
  const speakingPart1Index = Math.max(0, Number(activeSavedAnswer.speakingPart1Index ?? 0));
  const speakingPart1Total = Array.isArray(renderTemplateData?.questions) ? renderTemplateData.questions.length : 0;
  const speakingPart2Mode = activeSavedAnswer.speakingPart2Mode ?? 'intro';
  const speakingPart2Index = Math.max(0, Number(activeSavedAnswer.speakingPart2Index ?? 0));
  const speakingPart2Total = Array.isArray(renderTemplateData?.questions) ? renderTemplateData.questions.length : 0;
  const speakingPart3Mode = activeSavedAnswer.speakingPart3Mode ?? 'intro';
  const speakingPart3Index = Math.max(0, Number(activeSavedAnswer.speakingPart3Index ?? 0));
  const speakingPart3Total = Array.isArray(renderTemplateData?.questions) ? renderTemplateData.questions.length : 0;
  const speakingPart4Mode = activeSavedAnswer.speakingPart4Mode ?? 'intro';
  const speakingPart4Index = Math.max(0, Number(activeSavedAnswer.speakingPart4Index ?? 0));
  const speakingPart4Total = Array.isArray(renderTemplateData?.questions) ? renderTemplateData.questions.length : 0;
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

  useEffect(() => {
    if (!questions?.length || !requestedQuestionId) return;
    const index = questions.findIndex((question) => question.id === requestedQuestionId);
    if (index >= 0) setCurrentIndex(index);
  }, [questions, requestedQuestionId]);

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
    navigate('/app/tests');
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
        toast.error('Bạn làm tới câu 17 rồi bấm Kiểm tra để xem điểm cả bộ đề.');
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
        toast.error(`Bạn làm tới câu ${totalQuestions} rồi bấm Kiểm tra để xem kết quả cả bộ đề.`);
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

    const value = answers[activeQuestion.id];
    if (!value) {
      toast.error('Bạn hãy chọn hoặc nhập câu trả lời trước.');
      return;
    }

    const templateResult = evaluateTemplateAnswer(renderTemplateData, value);
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

  function resetCurrentQuestion() {
    if (!activeQuestion) return;
    const { [activeQuestion.id]: _oldAnswer, ...nextAnswers } = answers;
    const { [activeQuestion.id]: _oldChecked, ...nextChecked } = checkedAnswers;
    setAnswers(nextAnswers);
    setCheckedAnswers(nextChecked);
  }

  if (classicTemplate) {
    return (
      <div className="min-h-screen bg-white text-slate-950">
        <AppSidebar pathname={location.pathname} navigate={navigate} />
        <main className="xl:pl-[260px]">
          <AppTopbar />
        <form onSubmit={submit} className="pb-24">
          {loading && <div className="mx-auto max-w-[1460px] p-8">Đang tải câu hỏi...</div>}
          {activeQuestion && renderTemplateData && (
            <AptisTemplateRenderer
              data={renderTemplateData}
              questionId={activeQuestion.id}
              currentNumber={currentIndex + 1}
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
    <div className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col bg-[#1e293b] text-white xl:flex">
        <div className="px-6 py-8">
          <h1 className="text-2xl font-extrabold tracking-tight">English Prep</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Chế độ ôn thi</p>
        </div>
        <nav className="flex-1 space-y-2 overflow-hidden px-4 pb-4">
          {examLinks.map(({ to, label, icon: Icon }) => (
            <ExamNav key={label} to={to} icon={<Icon className="shrink-0" size={22} />} label={label} active={isActiveExamNav(to, location.pathname)} />
          ))}
        </nav>
        <div className="border-t border-slate-700/60 p-4">
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="mb-2 text-center text-xs font-bold text-white">Aptis Pro Access</p>
            <Link to="/app/renewal" className="flex h-10 w-full items-center justify-center rounded-lg bg-brand-600 text-xs font-extrabold text-white hover:bg-brand-700">Nâng cấp Pro</Link>
          </div>
          <ExamNav icon={<HelpCircle />} label="Trợ giúp" />
          <button onClick={() => navigate('/login')} className="flex h-11 w-full items-center gap-3 rounded-lg px-4 text-sm text-red-300 hover:bg-white/10 hover:text-red-200">
            <LogOut size={20} />Đăng xuất
          </button>
        </div>
      </aside>

      <main className="xl:pl-[260px]">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
          <div className="flex h-12 items-center justify-between px-5 sm:px-6">
            <div className="flex items-center gap-6">
              <div className="text-lg font-extrabold text-brand-600">LingoMaster</div>
              <div className="hidden h-9 w-px bg-slate-200 sm:block" />
              <div className="hidden items-center gap-2 font-bold text-brand-600 sm:flex"><Clock size={22} />Còn 12:45</div>
            </div>
            <div className="flex h-9 w-full max-w-[280px] items-center gap-3 rounded-full bg-[#f0f3fd] px-4 text-sm text-slate-500">
              <Search size={19} />
              <span className="hidden sm:inline">Tìm tài liệu...</span>
            </div>
          </div>
        </header>

        <form onSubmit={submit}>
          <div className="px-4 pb-20 pt-3 sm:px-5">
            {!templateOwnsHeader && (
            <div className="mb-2 flex flex-col justify-between gap-2 lg:flex-row lg:items-end">
              <div>
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Đọc hiểu</span>
                <h1 className="mt-1 text-2xl font-extrabold tracking-normal sm:text-3xl">Câu {currentIndex + 1} / {totalQuestions}</h1>
                <p className="mt-1 text-sm">{isExamSetMode ? 'Bộ đề' : 'Chủ đề'}: <span className="font-extrabold text-brand-600">{topicTitle}</span></p>
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

            {test?.skillName?.toLowerCase().includes('speaking') && !renderTemplateData?.template?.startsWith('SPEAKING') && (
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

            {audioUrl && !renderTemplateData && (
              <QuestionAudioPlayer audioUrl={audioUrl} scriptText={scriptText} />
            )}

            {scriptText && renderTemplateData && !classicTemplate && (
              <QuestionScriptBox scriptText={scriptText} />
            )}

            {loading && <div className="rounded-[18px] border border-slate-200 bg-white p-7">Đang tải câu hỏi...</div>}

            {activeQuestion && renderTemplateData && (
              <AptisTemplateRenderer
                data={renderTemplateData}
                questionId={activeQuestion.id}
                currentNumber={currentIndex + 1}
                initialClubIndex={Number.isFinite(requestedClubIndex) ? requestedClubIndex : undefined}
                checked={activeChecked}
                value={answers[activeQuestion.id] ?? ''}
                onChange={(value) => setAnswers({ ...answers, [activeQuestion.id]: value })}
              />
            )}

            {activeQuestion && renderTemplateData && activeChecked !== undefined && !selfCheckingTemplate && (
              <QuestionFeedback isCorrect={activeChecked} textOnly={!activeQuestion.answers.length} />
            )}

            {activeQuestion && !renderTemplateData && (
              <section className="mx-auto max-w-[1180px] space-y-2">
                  <div className="rounded-xl border border-slate-300 bg-white p-3 shadow-soft">
                    <div className="flex gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-brand-600"><HelpCircle size={18} /></div>
                      <div>
                        <h2 className="text-base font-extrabold">{activeQuestion.answers.length ? 'Chọn đáp án đúng' : 'Trả lời tự luận'}</h2>
                        <p className="mt-1 text-sm leading-5 text-slate-600">{activeQuestion.content}</p>
                      </div>
                    </div>
                  </div>

                  {activeQuestion.answers.length > 0 ? (
                    <div className="space-y-2">
                      {activeQuestion.answers.map((answer, index) => (
                        <label className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-2 text-sm shadow-soft transition ${getAnswerClassName({ answer, selectedValue: answers[activeQuestion.id], checked: activeChecked })}`} key={answer.id}>
                          <input className="h-4 w-4" type="radio" name={`q-${activeQuestion.id}`} value={answer.id} onChange={(e) => setAnswers({ ...answers, [activeQuestion.id]: e.target.value })} />
                          <span className="flex-1">{answer.content}</span>
                          <AnswerStatusBadge answer={answer} selectedValue={answers[activeQuestion.id]} checked={activeChecked} />
                          <span className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 text-xs text-slate-400">{index + 1}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea className="min-h-[170px] w-full rounded-[14px] border border-slate-300 bg-white p-4 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100" placeholder="Nhập câu trả lời..." onChange={(e) => setAnswers({ ...answers, [activeQuestion.id]: e.target.value })} />
                  )}
                  {activeChecked !== undefined && <QuestionFeedback isCorrect={activeChecked} textOnly={!activeQuestion.answers.length} />}
              </section>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-300 bg-white/95 px-4 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:px-6 xl:left-[260px]">
            <div className="flex items-center justify-between gap-4">
              <button type="button" onClick={goBack} className="inline-flex items-center gap-3 font-semibold text-slate-600 disabled:opacity-50" disabled={!canGoBack}><ArrowLeft />Quay lại</button>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary hidden h-10 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-200 sm:inline-flex" onClick={resetCurrentQuestion}><RotateCcw size={17} />Làm lại</button>
                <button type="button" onClick={checkCurrentQuestion} disabled={!canCheckCurrent} className="inline-flex h-10 items-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-extrabold text-white outline-none focus:ring-2 focus:ring-green-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"><CheckSquare size={18} />Kiểm tra</button>
                <button type="button" className="btn-primary h-10 px-5 text-sm outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-50" onClick={goNext} disabled={!canGoNext}>Kế tiếp <ArrowRight size={18} /></button>
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
  const className = `flex h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition ${active ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'text-white/80 hover:bg-[#334155] hover:text-white'}`;

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

function AppSidebar({ pathname, navigate }: { pathname: string; navigate: (to: string) => void }) {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col bg-[#1e293b] text-white xl:flex">
      <div className="px-6 py-8">
        <h1 className="text-2xl font-extrabold tracking-tight">English Prep</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Chế độ ôn thi</p>
      </div>
      <nav className="flex-1 space-y-2 overflow-hidden px-4 pb-4">
        {examLinks.map(({ to, label, icon: Icon }) => (
          <ExamNav key={label} to={to} icon={<Icon className="shrink-0" size={22} />} label={label} active={isActiveExamNav(to, pathname)} />
        ))}
      </nav>
      <div className="border-t border-slate-700/60 p-4">
        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="mb-2 text-center text-xs font-bold text-white">Aptis Pro Access</p>
          <Link to="/app/renewal" className="flex h-10 w-full items-center justify-center rounded-lg bg-brand-600 text-xs font-extrabold text-white hover:bg-brand-700">Nâng cấp Pro</Link>
        </div>
        <ExamNav icon={<HelpCircle />} label="Trợ giúp" />
        <button onClick={() => navigate('/login')} className="flex h-11 w-full items-center gap-3 rounded-lg px-4 text-sm text-red-300 hover:bg-white/10 hover:text-red-200">
          <LogOut size={20} />Đăng xuất
        </button>
      </div>
    </aside>
  );
}

function AppTopbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="flex h-12 items-center justify-between px-5 sm:px-6">
        <div className="flex items-center gap-6">
          <div className="text-lg font-extrabold text-brand-600">LingoMaster</div>
          <div className="hidden h-9 w-px bg-slate-200 sm:block" />
          <div className="hidden items-center gap-2 font-bold text-brand-600 sm:flex"><Clock size={22} />Còn 12:45</div>
        </div>
        <div className="flex h-9 w-full max-w-[280px] items-center gap-3 rounded-full bg-[#f0f3fd] px-4 text-sm text-slate-500">
          <Search size={19} />
          <span className="hidden sm:inline">Tìm tài liệu...</span>
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
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-300 bg-white/95 px-4 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:px-6 xl:left-[260px]">
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-3 font-semibold text-slate-600 disabled:opacity-50" disabled={currentIndex === 0}>
          <ArrowLeft />Quay lại
        </button>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary hidden h-10 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-200 sm:inline-flex" onClick={onReset}>
            <RotateCcw size={17} />Làm lại
          </button>
          {showCheck && (
            <button type="button" onClick={onCheck} className="inline-flex h-10 items-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-extrabold text-white outline-none focus:ring-2 focus:ring-green-200">
              <CheckSquare size={18} />Kiểm tra
            </button>
          )}
          <button type="button" className="btn-primary h-10 px-5 text-sm outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-50" onClick={onNext} disabled={currentIndex >= totalQuestions - 1}>
            Kế tiếp <ArrowRight size={18} />
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
    return 'border-slate-200 bg-slate-50 opacity-60';
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
  return (
    <section className="sticky top-14 z-10 mx-auto mb-2 max-w-[1180px] rounded-xl border border-blue-200 bg-white/95 px-3 py-1.5 shadow-soft backdrop-blur">
      <div className="mb-1 flex items-center gap-2 font-extrabold text-slate-900">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-brand-600"><Volume2 size={16} /></span>
        <span className="text-xs">Nghe audio câu hỏi</span>
      </div>
      <audio className="h-7 w-full" controls src={audioUrl} />
      {scriptText && <QuestionScriptBox scriptText={scriptText} compact />}
    </section>
  );
}

function getQuestionAudioUrl(question: Question, templateData: TemplateData | null, fallbackAudioUrl = '') {
  if (question.audioUrl) return question.audioUrl;
  if (templateData?.audioUrl) return String(templateData.audioUrl);
  return findAudioUrl(`${question.content ?? ''} ${question.explanation ?? ''}`) || fallbackAudioUrl;
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
  if (question.scriptText) return question.scriptText;
  if (templateData?.scriptText) return String(templateData.scriptText);
  if (templateData?.script) return String(templateData.script);
  if (templateData?.transcript) return String(templateData.transcript);
  return '';
}

function QuestionScriptBox({ scriptText, compact }: { scriptText: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${compact ? 'mt-3' : 'mx-auto mb-5 max-w-[1180px] rounded-[16px] border border-blue-200 bg-white p-4 shadow-soft'}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand-200 bg-blue-50 px-3 text-xs font-extrabold text-brand-700 hover:bg-blue-100"
      >
        <BookOpen size={18} />{open ? 'Ẩn script' : 'Xem script'}
      </button>
      {open && (
        <div className="mt-3 whitespace-pre-line rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          {scriptText}
        </div>
      )}
    </div>
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

function QuestionNavigator({ total, currentIndex, answeredIds, checkedIds, questions, onSelect }: {
  total: number;
  currentIndex: number;
  answeredIds: Record<number, string>;
  checkedIds: Record<number, boolean>;
  questions: Question[];
  onSelect: (index: number) => void;
}) {
  return (
    <div className="mb-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-soft">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold">Chọn câu hỏi</h2>
          <p className="hidden text-xs text-slate-500 md:block">Bấm số câu để chuyển nhanh.</p>
        </div>
        <span className="text-xs font-bold text-brand-600">{currentIndex + 1}/{total}</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {questions.map((question, index) => {
          const active = index === currentIndex;
          const answered = Boolean(answeredIds[question.id]);
          const checked = checkedIds[question.id];
          return (
            <button
              type="button"
              key={question.id}
              onClick={() => onSelect(index)}
              className={`grid h-7 min-w-7 place-items-center rounded-md border text-[10px] font-extrabold transition ${
                active
                  ? 'border-brand-600 bg-brand-600 text-white shadow-soft'
                  : checked === true
                    ? 'border-green-300 bg-green-100 text-green-800'
                    : checked === false
                      ? 'border-red-300 bg-red-100 text-red-700'
                  : answered
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-300'
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type TemplateData = Record<string, any> & { template: string };
type ListeningReviewGroup = '1-13' | '14' | '15' | '16-17';

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

  const score = items.filter((item) => item.correct).length;
  return {
    score,
    maxScore: items.length,
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
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Test and Answer Review listening keys</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-2xl text-slate-500 hover:bg-slate-100">x</button>
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
          <div className="overflow-hidden rounded-lg border border-slate-200">
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
                  <tr className={index % 2 === 0 ? 'bg-slate-100' : 'bg-white'} key={`${item.group}-${item.questionNo}-${index}`}>
                    <td className="px-4 py-3">{item.questionNo}</td>
                    <td className={`px-4 py-3 font-bold ${item.correct ? 'text-green-700' : 'text-red-600'}`}>{item.yourAnswer}</td>
                    <td className="px-4 py-3 font-bold text-green-700">{item.correctAnswer || '-'}</td>
                  </tr>
                ))}
                {!groupItems.length && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={3}>Chưa có dữ liệu câu hỏi trong nhóm này.</td>
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
  const partScore = partItems.filter((item) => item.correct).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-8">
      <section className="w-full max-w-[980px] rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Test and Answer Review reading keys</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-2xl text-slate-500 hover:bg-slate-100">x</button>
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
              <h3 className="text-2xl font-bold text-slate-900">Part {activePart}</h3>
              <p className="mt-1 text-sm text-slate-600">Score: {partScore} / {partItems.length}</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-brand-700">
              {partItems.length} câu
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
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
                  <tr className={index % 2 === 0 ? 'bg-slate-100' : 'bg-white'} key={`${item.questionNo}-${index}`}>
                    <td className="px-4 py-3">{item.questionNo}</td>
                    <td className={`px-4 py-3 font-bold ${item.correct ? 'text-green-700' : 'text-red-600'}`}>{item.yourAnswer}</td>
                    <td className="px-4 py-3 font-bold text-green-700">{item.correctAnswer || '-'}</td>
                  </tr>
                ))}
                {!partItems.length && (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={3}>Chưa có dữ liệu đáp án để chấm.</td>
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
    .map((answer) => answer.content)
    .filter(Boolean);

  const correctAnswers = parsePersonCorrectAnswers(question.explanation, options);
  const topic = cleanAptisTopic(question.topic || test?.title || 'Aptis Listening Part 2');

  return {
    template: 'LISTENING_PEOPLE_MATCH',
    total: totalQuestions || 13,
    topic,
    instructions: question.content,
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
    .map((answer) => answer.content)
    .filter(Boolean);
  const options = rawOptions.length ? rawOptions : ['Man', 'Woman', 'Both'];
  const statements = splitStatementRows(question.content);

  return {
    template: 'LISTENING_OPINION_MATCH',
    total: totalQuestions || 17,
    topic: cleanAptisTopic(question.topic || test?.title || 'Aptis Listening Part 3'),
    instructions: statements.length > 1 ? defaultListeningPart3Instructions() : question.content,
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
  const optionText = question.answers.map((answer) => answer.content.toLowerCase()).join(' ');
  const hasOpinionOptions = /man/.test(optionText) && /woman/.test(optionText) && /both/.test(optionText);
  const looksLikeOpinionMatch = /two colleagues|man's|woman's|whose opinion|who expresses|man\s*\/\s*woman|woman\s*\/\s*both/.test(text);

  return looksLikePart3 && (hasOpinionOptions || looksLikeOpinionMatch);
}

function buildListeningPart4FallbackTemplate(question: Question, test: Test | null, totalQuestions: number): TemplateData | null {
  if (parseTemplate(question.content)) return null;
  if (!isListeningPart4FallbackQuestion(question, test, totalQuestions)) return null;

  const options = [...question.answers]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((answer) => answer.content)
    .filter(Boolean);
  const groups = options.length
    ? [{ prompt: stripPart4Content(question.content), options, correctAnswer: question.answers.find((answer) => answer.correct)?.content ?? '' }]
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
  return value.replace(/^topic:\s*/i, '').trim();
}

function stripLeadingIndex(value: string) {
  return value.replace(/^\s*\d+[\).]\s*/, '').trim();
}

function parseTemplate(content: string): TemplateData | null {
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
    const order = Array.isArray(saved.order) ? saved.order : [];
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

function AptisTemplateRenderer({ data, questionId, currentNumber, initialClubIndex, checked, value, onChange }: {
  data: TemplateData;
  questionId: number;
  currentNumber?: number;
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
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-slate-800">
            <span className="text-brand-600">‹</span>
            Question {data.questionNumber ?? currentNumber ?? 1} of {data.total ?? 30}
          </h1>
          {data.instructions && <p className="mt-2 text-sm text-slate-600">{data.instructions}</p>}
        </div>

        {data.template === 'GRAMMAR_CHOICE' && (
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="mb-5 text-lg font-semibold text-slate-950">{data.prompt}</p>
            <div className="flex flex-wrap gap-3">
              {(data.options ?? []).map((option: string) => {
                const selected = saved.choice === option;
                const correct = data.correctAnswer === option;
                const statusClass = revealAnswers
                  ? correct
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : selected
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-white text-slate-700'
                  : selected
                    ? 'border-brand-600 bg-blue-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-700';
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
                  <span className="font-semibold text-slate-950">{row.label}</span>
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
          <button type="button" className="rounded-lg bg-green-700 px-4 py-2 text-sm font-extrabold text-white shadow-sm hover:bg-green-800" onClick={() => setShowAnswers((value) => !value)}>
            {showAnswers ? 'Ẩn đáp án' : 'Xem đáp án'}
          </button>
        </div>
      </AptisPaper>
    );
  }

  if (data.template === 'LISTENING_AUDIO_MC') {
    const revealStatus = checked !== undefined || showAnswers;
    return (
      <AptisPaper classic>
        <QuestionCounter current={currentNumber} total={data.total} />
        <AudioBar text={data.playsRemaining} audioUrl={data.audioUrl} />
        <div className="rounded-lg bg-[#eeeeee] px-5 py-4">
          {data.topic && <h2 className="mb-4 text-base font-extrabold">Topic: {data.topic}</h2>}
          <div className="space-y-4">
            {(data.groups ?? []).map((group: any, groupIndex: number) => (
              <div key={groupIndex}>
                <p className="mb-1.5 text-[14px]">{group.prompt}</p>
                {(group.options ?? []).length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    File CSV hiện chưa có đáp án cho câu này, nên chưa thể hiện radio giống mẫu.
                  </div>
                ) : (
                <div className="space-y-1.5">
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
                    <label className={`flex w-fit items-center gap-2.5 rounded-md border px-2 py-0.5 text-[14px] ${statusClass}`} key={option}>
                      <input type="radio" name={`${questionId}-${groupIndex}`} checked={saved[`g${groupIndex}`] === option} onChange={() => setAnswer(`g${groupIndex}`, option)} />
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="h-9 rounded-lg bg-green-700 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-green-800" onClick={() => setShowAnswers((value) => !value)}>
            {showAnswers ? 'Ẩn đáp án' : 'Xem đáp án'}
          </button>
          {data.scriptText && (
            <button type="button" className="h-9 rounded-lg bg-slate-700 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800" onClick={() => setShowScript((value) => !value)}>
              {showScript ? 'Ẩn script' : 'Show script'}
            </button>
          )}
        </div>
        {showScript && data.scriptText && (
          <div className="mt-3 whitespace-pre-line rounded border border-slate-300 bg-slate-50 p-4 text-sm leading-6">
            {data.scriptText}
          </div>
        )}
      </AptisPaper>
    );
  }

  if (data.template === 'LISTENING_OPINION_MATCH' || data.template === 'LISTENING_PEOPLE_MATCH') {
    const rows = data.template === 'LISTENING_PEOPLE_MATCH' ? data.rows : data.statements;
    const revealAnswers = checked !== undefined || showAnswers;
    return (
      <AptisPaper classic>
        <QuestionCounter current={currentNumber} total={data.total} />
        <AudioBar text={data.playsRemaining ?? '2 of 2 plays remaining'} audioUrl={data.audioUrl} />
        <div className="rounded-lg bg-[#eeeeee] px-8 py-8">
          <h2 className="mb-6 text-xl font-extrabold">Topic: {data.topic}</h2>
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
          <button type="button" className="h-10 rounded-lg bg-green-700 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-green-800" onClick={() => setShowAnswers((value) => !value)}>
            {showAnswers ? 'Ẩn đáp án' : 'Xem đáp án'}
          </button>
          {data.scriptText && (
            <button type="button" className="h-10 rounded-lg bg-slate-700 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800" onClick={() => setShowScript((value) => !value)}>
              {showScript ? 'Ẩn script' : 'Show script'}
            </button>
          )}
        </div>
        {showAnswers && data.correctAnswers?.length > 0 && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <h3 className="mb-3 font-extrabold text-green-800">Đáp án của câu</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.correctAnswers.map((answer: string, index: number) => (
                <div className="rounded-md bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm" key={`${answer}-${index}`}>
                  {index + 1} là <span className="text-green-700">{answer}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {showScript && data.scriptText && (
          <div className="mt-4 whitespace-pre-line rounded border border-slate-300 bg-slate-50 p-5 leading-7">
            {data.scriptText}
          </div>
        )}
      </AptisPaper>
    );
  }

  if (data.template === 'READING_GAP_FILL') {
    const rows = data.rows ?? [];
    const correctAnswers = getReadingGapCorrectAnswers(data);
    const revealStatus = checked !== undefined || showAnswers;
    return (
      <AptisPaper narrow>
        <h1 className="mb-3 text-3xl font-extrabold">Reading Question <span className="mx-2 inline-flex min-w-12 justify-center border-b border-slate-900">{currentNumber ?? 1}</span> of {data.total}</h1>
        <p className="mb-4 text-sm">{data.instructions}</p>
        {data.before && <p className="mb-4 whitespace-pre-line text-sm">{data.before}</p>}
        <div className="space-y-2.5">
          {rows.map((row: any, index: number) => {
            const parts = getReadingGapParts(row);
            const selected = saved[`gap${index}`] ?? '';
            const correct = correctAnswers[index] ?? '';
            const status = revealStatus && correct
              ? selected === correct ? 'correct' : selected ? 'wrong' : 'answer'
              : undefined;
            return (
              <div className="rounded border border-slate-300 bg-white px-4 py-2.5 text-[15px] shadow-sm" key={`${parts[0]}-${index}`}>
                <span>{parts[0]}</span>
                <TemplateSelect value={selected} options={getReadingGapOptions(data, row)} onChange={(next) => setAnswer(`gap${index}`, next)} compact status={status} />
                <span>{parts[1]}</span>
              </div>
            );
          })}
        </div>
        {data.after && <p className="mt-5 whitespace-pre-line text-sm">{data.after}</p>}
        {showAnswers && correctAnswers.length > 0 && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3">
            <h3 className="mb-2 font-extrabold text-green-800">Đáp án</h3>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {correctAnswers.map((answer, index) => (
                <div className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm" key={`${answer}-${index}`}>
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
    const currentOrder = selectedOrder.length ? selectedOrder : displaySentences;
    const score = selectedOrder.filter((sentence, index) => sentence === correctOrder[index]).length;
    function saveOrder(nextOrder: string[]) {
      onChange(JSON.stringify({ ...saved, order: nextOrder }));
    }
    function moveSentence(sentence: string, direction: -1 | 1) {
      const current = currentOrder.indexOf(sentence);
      const target = current + direction;
      if (current < 0 || target < 0 || target >= currentOrder.length) return;
      const nextOrder = [...currentOrder];
      [nextOrder[current], nextOrder[target]] = [nextOrder[target], nextOrder[current]];
      saveOrder(nextOrder);
    }
    function dropSentence(targetSentence: string, sourceSentence = dragSentence) {
      const from = currentOrder.indexOf(sourceSentence);
      const to = currentOrder.indexOf(targetSentence);
      if (from < 0 || to < 0 || from === to) return;
      const nextOrder = [...currentOrder];
      const [moved] = nextOrder.splice(from, 1);
      nextOrder.splice(to, 0, moved);
      saveOrder(nextOrder);
    }
    return (
      <AptisPaper narrow>
        <h1 className="mb-4 text-2xl font-extrabold">
          Reading Question <span className="mx-3 inline-flex min-w-12 justify-center rounded border border-slate-300 bg-white px-4 py-1 text-base">{currentNumber ?? 1}</span> of {data.total}
        </h1>
        <h2 className="mb-5 text-2xl font-bold text-red-600">Topic: {data.topic}</h2>
        <p className="mb-5 font-semibold">{data.instructions}</p>
        <div className="space-y-2">
          {currentOrder.map((sentence: string, index: number) => {
            const wrong = checked !== undefined && sentence !== correctOrder[index];
            const correct = checked !== undefined && sentence === correctOrder[index];
            return (
              <div
                role="button"
                tabIndex={0}
                className={`flex min-h-12 w-full cursor-grab items-center justify-between rounded border bg-white px-4 py-3 text-left text-[15px] transition hover:border-brand-400 hover:bg-blue-50 active:cursor-grabbing ${
                  correct ? 'border-green-500 bg-green-50 text-green-800' : wrong ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-300'
                }`}
                key={sentence}
                draggable
                onDragStart={(event) => {
                  setDragSentence(sentence);
                  event.dataTransfer.setData('text/plain', sentence);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const source = event.dataTransfer.getData('text/plain') || dragSentence;
                  dropSentence(sentence, source);
                  setDragSentence('');
                }}
                onDragEnd={() => setDragSentence('')}
              >
                <span>{sentence}</span>
                <span className="ml-4 inline-flex items-center overflow-hidden rounded-full border border-brand-200 bg-brand-600 text-white shadow-sm">
                    <span className="inline-flex h-7 min-w-7 items-center justify-center px-2 text-sm font-extrabold">{index + 1}</span>
                    <button
                      type="button"
                      className={`grid h-7 w-7 place-items-center border-l border-white/25 text-xs font-extrabold hover:bg-white/15 ${index === 0 ? 'cursor-not-allowed opacity-40' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        moveSentence(sentence, -1);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={`grid h-7 w-7 place-items-center border-l border-white/25 text-xs font-extrabold hover:bg-white/15 ${index === currentOrder.length - 1 ? 'cursor-not-allowed opacity-40' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        moveSentence(sentence, 1);
                      }}
                    >
                      ↓
                    </button>
                  </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowAnswers((value) => !value)}>
            {showAnswers ? 'Ẩn đáp án' : 'Xem đáp án'}
          </button>
          <button type="button" className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => onChange(JSON.stringify({ ...saved, order: [] }))}>
            Chọn lại thứ tự
          </button>
        </div>
        {showAnswers && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
            <div className="max-h-[86vh] w-full max-w-5xl overflow-auto rounded-lg bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-bold">Test and Answer Review Question {currentNumber ?? 1}</h3>
                <button type="button" className="text-3xl leading-none text-slate-500 hover:text-slate-900" onClick={() => setShowAnswers(false)}>×</button>
              </div>
              <div className="p-5">
                <p className="mb-5 text-center text-2xl font-extrabold text-green-700">Your score: {score} / {correctOrder.length}</p>
                <div className="grid border border-slate-300 text-center md:grid-cols-2">
                  <div className="border-b border-slate-300 p-3 font-extrabold md:border-r">Your Answer</div>
                  <div className="border-b border-slate-300 p-3 font-extrabold">Correct Answer</div>
                  {correctOrder.map((sentence, index) => (
                    <div className="contents" key={`${sentence}-${index}`}>
                      <div className="border-b border-slate-200 p-3 text-red-600 md:border-r">{selectedOrder[index] ?? 'Chưa chọn'}</div>
                      <div className="border-b border-slate-200 p-3 text-green-700">{sentence}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </AptisPaper>
    );
  }

  if (data.template === 'READING_FORUM_MATCH') {
    const correctAnswers = data.correctAnswers ?? [];
    return (
      <AptisPaper>
        <h1 className="mb-3 text-3xl font-extrabold">Reading Question 4 ({currentNumber ?? 1}/{data.total})</h1>
        <h2 className="mb-4 text-xl font-bold text-red-600">Topic: {data.topic}</h2>
        <div className="grid gap-6 text-[15px] leading-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section>
            <p className="mb-3 font-extrabold leading-6" dangerouslySetInnerHTML={{ __html: data.leftTitle ?? '' }} />
            <div className="space-y-3 leading-6">
              {(data.opinions ?? []).map((opinion: string) => <p key={opinion} dangerouslySetInnerHTML={{ __html: opinion }} />)}
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
        <div className="mt-4">
          <button type="button" className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowAnswers((value) => !value)}>
            {showAnswers ? 'Ẩn đáp án' : 'Xem đáp án'}
          </button>
        </div>
        {showAnswers && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
            <div className="max-h-[86vh] w-full max-w-4xl overflow-auto rounded-lg bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-bold">Test and Answer Review Question 4</h3>
                <button type="button" className="text-3xl leading-none text-slate-500 hover:text-slate-900" onClick={() => setShowAnswers(false)}>×</button>
              </div>
              <div className="p-5">
                <h4 className="mb-6 text-center text-3xl font-extrabold text-slate-800">Correct answer compare</h4>
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
                        <div className="border-b border-slate-200 bg-slate-50 p-3">{question}</div>
                        <div className={`border-b border-slate-200 bg-slate-50 p-3 ${ok ? 'text-green-700' : 'text-red-600'}`}>{selected}</div>
                        <div className="border-b border-slate-200 bg-slate-50 p-3 text-green-700">{correct}</div>
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
    const score = correctAnswers.filter((answer: string, index: number) => (saved[`heading${index}`] ?? '') === answer).length * 2;
    const maxScore = correctAnswers.length * 2;
    return (
      <AptisPaper narrow>
        <h1 className="mb-4 text-4xl font-extrabold">Reading question 5 ({currentNumber ?? 1}/{data.total})</h1>
        <h2 className="mb-5 text-2xl font-bold text-red-600">TOPIC: {data.topic}</h2>
        <div className="mb-6 flex flex-wrap gap-2">
          <button type="button" className="rounded bg-slate-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowScript((value) => !value)}>
            {showScript ? 'Ẩn nội dung' : 'Xem nội dung'}
          </button>
          {data.tips && (
            <button type="button" className="rounded bg-slate-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowTips((value) => !value)}>
              {showTips ? 'Ẩn mẹo' : 'Xem mẹo'}
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
                    <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                      {paragraph}
                    </p>
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
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-bold">Test and Answer Review Question 5</h3>
                <button type="button" className="text-3xl leading-none text-slate-500 hover:text-slate-900" onClick={() => setShowAnswers(false)}>×</button>
              </div>
              <div className="p-5">
                <h4 className="mb-3 text-center text-3xl font-extrabold text-slate-800">Correct answer compare</h4>
                <p className="mb-5 text-center font-extrabold text-slate-800">Your score: {score} / {maxScore}</p>
                <div className="grid border border-slate-300 text-center md:grid-cols-[0.5fr_1fr_1.6fr]">
                  <div className="border-b border-slate-300 p-3 font-extrabold">Question</div>
                  <div className="border-b border-slate-300 p-3 font-extrabold">Your Answer</div>
                  <div className="border-b border-slate-300 p-3 font-extrabold">Correct Answer</div>
                  {correctAnswers.map((answer: string, index: number) => {
                    const selected = saved[`heading${index}`] || '(không chọn)';
                    const ok = selected === answer;
                    return (
                      <div className="contents" key={`${answer}-${index}`}>
                        <div className="border-b border-slate-200 bg-slate-50 p-3">{index + 1}</div>
                        <div className={`border-b border-slate-200 bg-slate-50 p-3 ${ok ? 'text-green-700' : 'text-red-600'}`}>{selected}</div>
                        <div className="border-b border-slate-200 bg-slate-50 p-3 text-green-700">{answer}</div>
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
          <div className="flex items-center gap-4 border-b border-slate-200 px-7 py-5">
            <b>Speak question</b><InlineNumber /> <b>/ {data.total}</b>
          </div>
          <div className="p-7">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <img className="mx-auto h-[300px] w-full max-w-[480px] object-cover" src={data.imageUrl} alt="Speaking prompt" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {(data.tabs ?? []).map((tab: string, index: number) => <button type="button" className={`h-10 rounded-lg border text-sm ${index === 0 ? 'border-brand-600 text-brand-600' : 'border-slate-200 text-slate-500'}`} key={tab}>{tab}</button>)}
            </div>
            <div className="mt-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">{data.prompt}</h2>
              <SpeakingRecordButton compact />
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-500">Your answer</p>
            <textarea className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 italic text-slate-500" placeholder="Your speech will appear here..." value={saved.speech ?? ''} onChange={(event) => setAnswer('speech', event.target.value)} />
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
          <div className="grid grid-cols-[50px_1fr_170px] bg-slate-50 font-bold">
            <div className="border-r p-3">#</div><div className="border-r p-3">Câu hỏi</div><div className="p-3">Đáp án mẫu</div>
          </div>
          <div className="grid grid-cols-[50px_1fr_170px] border-t">
            <div className="border-r p-3 font-bold">1</div>
            <div className="border-r p-3">{data.question}</div>
            <div className="p-3"><button type="button" className="rounded bg-brand-600 px-4 py-2 text-sm font-bold text-white">Xem đáp án</button></div>
          </div>
          <div className="border-l-4 border-brand-600 bg-blue-50 p-5 leading-7">
            <p className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-500">Đáp án mẫu</p>
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
    const palette = ['bg-amber-400 text-slate-950', 'bg-emerald-700 text-white', 'bg-red-500 text-white', 'bg-sky-500 text-slate-950', 'bg-brand-600 text-white'];
    const iconNames = ['🎨', '🔒', '👤', '⌂', '📖', '💚', '💻', '💼', '🏠', '📺', '🚗', '🌐', '✈', '🎬', '🎥', '🚶', '🎧', '🏛', '✎', '▭', '♫', '🛍'];
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
                className={`h-12 rounded-md px-5 text-lg font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${palette[index % palette.length]}`}
                key={`${item.clubName}-${index}`}
                onClick={() => patchAnswers({ selectedClubIndex: String(index), writingPartIndex: '0' })}
              >
                <span className="mr-4 inline-block w-6 text-center">{iconNames[index % iconNames.length]}</span>
                {item.clubName}
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
    const partTitle = partIndex === 3 ? 'Email Writing' : club.clubName;

    return (
      <AptisPaper narrow>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => patchAnswers({ selectedClubIndex: '-1', writingPartIndex: '0' })}>Quay lại danh sách</button>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((index) => (
              <button
                type="button"
                className={`rounded px-4 py-2 text-sm font-bold ${partIndex === index ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
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
              <span className="mt-2 block text-right text-slate-600">Word Count: {wordCount(getWriting('p2'))}</span>
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
                    <span className="mt-2 block text-right text-slate-600">Word Count: {wordCount(text)}</span>
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
                  <span className="mt-2 block text-right text-slate-600">Word Count: {wordCount(text)}</span>
                </label>
              );
            })}
          </>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="rounded bg-cyan-500 px-5 py-3 font-semibold text-white" onClick={() => setShowAnswers((value) => !value)}>
            {showAnswers ? 'Ẩn đáp án mẫu' : 'Đáp án mẫu'}
          </button>
          <button type="button" className="rounded bg-slate-200 px-5 py-3 font-semibold text-slate-700 disabled:opacity-50" disabled={partIndex === 0} onClick={() => setAnswer('writingPartIndex', String(Math.max(0, partIndex - 1)))}>Câu trước</button>
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
                <p className="mt-2 text-right text-slate-600">Word Count: {count}</p>
              </div>
            );
          })}
        </div>
        <button type="button" className="mt-6 rounded bg-cyan-500 px-5 py-3 font-semibold text-white">Xem đáp án</button>
      </AptisPaper>
    );
  }

  return <div className="rounded-xl border border-slate-200 bg-white p-6">Template chưa được hỗ trợ.</div>;
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
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold">
              <ListChecks className="text-brand-600" /> Speaking Question 1 - Danh sach cau hoi
            </h1>
            <div className="flex gap-2">
              <button type="button" onClick={() => openPractice(index)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white">Trang luyen tap</button>
              <button type="button" onClick={() => patchAnswers({ speakingPart1Mode: 'intro' })} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Gioi thieu</button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
            <div className="grid grid-cols-[52px_1fr_140px_140px] bg-slate-50 text-sm font-extrabold">
              <div className="border-r border-slate-300 p-3">#</div>
              <div className="border-r border-slate-300 p-3">Cau hoi</div>
              <div className="border-r border-slate-300 p-3">Dap an 1</div>
              <div className="p-3">Dap an 2</div>
            </div>
            {questions.map((item: any, itemIndex: number) => {
              const key1 = `${itemIndex}-1`;
              const key2 = `${itemIndex}-2`;
              return (
                <div key={`${item.question}-${itemIndex}`}>
                  <div className="grid grid-cols-[52px_1fr_140px_140px] border-t border-slate-200 text-sm">
                    <div className="border-r border-slate-200 p-3 font-bold text-slate-600">{itemIndex + 1}</div>
                    <button type="button" onClick={() => openPractice(itemIndex)} className="border-r border-slate-200 p-3 text-left hover:bg-blue-50">{item.question}</button>
                    <div className="border-r border-slate-200 p-2">
                      <button type="button" onClick={() => toggleAnswer(key1)} className="h-9 rounded border border-brand-600 px-3 text-sm font-semibold text-brand-600">
                        {openAnswer === key1 ? 'An dap an 1' : 'Xem dap an 1'}
                      </button>
                    </div>
                    <div className="p-2">
                      <button type="button" onClick={() => toggleAnswer(key2)} className="h-9 rounded border border-emerald-600 px-3 text-sm font-semibold text-emerald-700">
                        {openAnswer === key2 ? 'An dap an 2' : 'Xem dap an 2'}
                      </button>
                    </div>
                  </div>
                  {(openAnswer === key1 || openAnswer === key2) && (
                    <div className="border-l-4 border-brand-600 bg-blue-50 px-5 py-4 text-sm leading-7 text-slate-800">
                      <p className="mb-1 text-xs font-extrabold uppercase tracking-widest text-slate-500">
                        {openAnswer === key1 ? 'Dap an mau 1' : 'Dap an mau 2'}
                      </p>
                      <p>{openAnswer === key1 ? item.answer1 : item.answer2}</p>
                    </div>
                  )}
                </div>
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
            Gioi thieu - Speaking Part 1
          </h1>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
            <div className="grid grid-cols-[190px_1fr_1.35fr] bg-blue-50 text-center text-sm font-extrabold text-blue-950">
              <div className="border-r border-slate-200 p-4">Phan thi</div>
              <div className="border-r border-slate-200 p-4">Mo ta</div>
              <div className="p-4">Huong dan on tap</div>
            </div>
            <div className="grid grid-cols-[190px_1fr_1.35fr] text-sm leading-7">
              <div className="border-r border-slate-200 bg-slate-50 p-5 font-bold">
                <p>Part 1:</p>
                <p>Thong tin ban than</p>
              </div>
              <div className="border-r border-slate-200 p-5">
                Ban se duoc hoi <b>3 cau</b> xoay quanh cac chu de quen thuoc ve cuoc song ca nhan.
                Moi cau co <b>45 giay</b> de tra loi. Cau tra loi nen ngan gon, ro rang va dung trong tam.
              </div>
              <div className="space-y-3 p-5">
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">✓</span>Luyen cach gioi thieu ban than, gia dinh, so thich, hoat dong cuoi tuan.</p>
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">✓</span>Han che liet ke don dieu, dung tu noi va cau ghep de cau tra loi tu nhien hon.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
            <b>Thang diem APTIS:</b> tu A0 den C1. Part 1 danh gia kha nang tra loi ngan gon, ro rang va phu hop chu de.
          </div>
          <div className="rounded-2xl bg-white p-6 text-center shadow-soft">
            <p className="mb-4 text-sm font-semibold text-slate-500">Chon che do hoc</p>
            <div className="mx-auto grid max-w-[620px] gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => openPractice(0)} className="h-12 rounded-full bg-brand-600 text-sm font-extrabold text-white hover:bg-brand-700">
                <Mic className="mr-2 inline" size={16} /> Trang luyen tap
              </button>
              <button type="button" onClick={() => patchAnswers({ speakingPart1Mode: 'summary', speakingPart1OpenAnswer: '' })} className="h-12 rounded-full border border-slate-400 text-sm font-extrabold text-slate-700 hover:bg-slate-50">
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
        <div className="mb-5 h-1.5 rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
            QUESTION <InlineNumber value={index + 1} /> / {questions.length}
          </div>
          <button type="button" onClick={() => patchAnswers({ speakingPart1Mode: 'summary', speakingPart1OpenAnswer: '' })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            Trang tong hop
          </button>
        </div>
        <div className="mt-6 flex items-start justify-between gap-4">
          <h2 className="text-xl font-extrabold text-slate-950">{current.question}</h2>
          <SpeakingRecordButton compact />
        </div>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-widest text-slate-500">Your answer</p>
        <textarea
          className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm italic text-slate-600"
          placeholder="Your speech will appear here..."
          value={saved[`speakingPart1Answer-${index}`] ?? ''}
          onChange={(event) => setAnswer(`speakingPart1Answer-${index}`, event.target.value)}
        />
        <div className="mt-7 border-t border-dashed border-slate-200 pt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => toggleAnswer(`${index}-1`)} className="h-11 rounded-lg border border-brand-600 text-sm font-semibold text-brand-600 hover:bg-blue-50">
              <MessageCircle className="mr-2 inline" size={15} /> Sample Answer 1
            </button>
            <button type="button" onClick={() => toggleAnswer(`${index}-2`)} className="h-11 rounded-lg border border-emerald-600 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              <MessageCircle className="mr-2 inline" size={15} /> Sample Answer 2
            </button>
          </div>
          {(openAnswer === `${index}-1` || openAnswer === `${index}-2`) && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-slate-800">
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

  function setTab(nextTab: number) {
    patchAnswers({ speakingPart2Tab: String(nextTab), speakingPart2ShowSample: 'false' });
  }

  if (mode !== 'practice') {
    return (
      <AptisPaper narrow compact>
        <div className="mx-auto max-w-[880px] space-y-5">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-sm text-white">i</span>
            Giới thiệu - Speaking Part 2
          </h1>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
            <div className="grid grid-cols-[1.35fr_1fr_1.35fr] bg-blue-50 text-center text-sm font-extrabold text-blue-950">
              <div className="border-r border-slate-200 p-4">Phần thi</div>
              <div className="border-r border-slate-200 p-4">Mô tả</div>
              <div className="p-4">Hướng dẫn ôn tập</div>
            </div>
            <div className="grid min-h-[250px] grid-cols-[1.35fr_1fr_1.35fr] text-sm leading-7">
              <div className="border-r border-slate-200 bg-slate-50 p-6 font-bold">
                <p>Part 2:</p>
                <p>Mô tả, bày tỏ ý kiến, nêu lý do và giải thích.</p>
              </div>
              <div className="border-r border-slate-200 p-6">
                Trong phần này, bạn cần <b>mô tả một hình ảnh</b> và trả lời thêm <b>hai câu hỏi</b> liên quan.
                Mỗi câu hỏi có <b>45 giây</b> để trả lời.
              </div>
              <div className="space-y-4 p-6">
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">✓</span>Luyện nói trôi chảy và tự nhiên, trả lời đủ cả ba câu.</p>
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">✓</span>Khi mô tả ảnh, hãy nói rõ vị trí, hành động, cảm xúc và bối cảnh.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
            <TrendingUp className="mr-3 inline text-cyan-700" size={22} />
            <b>Thang điểm APTIS:</b> từ A0 đến C1. Part 2 đánh giá khả năng mô tả, lý giải và bày tỏ ý kiến bằng tiếng Anh.
          </div>
          <div className="rounded-2xl bg-white p-6 text-center shadow-soft">
            <p className="mb-4 text-sm font-semibold text-slate-500">Chọn chế độ học</p>
            <button type="button" onClick={() => openPractice(0)} className="mx-auto h-12 w-full max-w-[300px] rounded-full bg-brand-600 text-sm font-extrabold text-white hover:bg-brand-700">
              <Mic className="mr-2 inline" size={16} /> Trang luyện tập
            </button>
          </div>
        </div>
      </AptisPaper>
    );
  }

  return (
    <AptisPaper narrow compact>
      <div className="mx-auto max-w-[800px] overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="border-b border-slate-200 px-7 py-5">
          <div className="mb-4 h-1.5 rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-3 text-base font-extrabold text-slate-700">
            Speak question <InlineNumber value={index + 1} /> / {questions.length}
          </div>
        </div>
        <div className="p-7">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            {!imageFailed && imageUrl ? (
              <img
                className="mx-auto h-[300px] w-full max-w-[520px] object-cover"
                src={imageUrl}
                alt="Speaking Part 2 prompt"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-lg bg-slate-100 text-center text-sm font-semibold text-slate-500">
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
                  className={`h-11 rounded-lg border text-sm font-semibold ${tab === itemIndex ? 'border-brand-600 bg-blue-50 text-brand-600' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                >
                  <Icon className="mr-1.5 inline" size={15} />{item.label}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">{prompt}</h2>
            <SpeakingRecordButton compact />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-500">Your answer</p>
          <textarea
            className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 italic text-slate-500"
            placeholder="Your speech will appear here..."
            value={saved[`speakingPart2Answer-${index}-${tab}`] ?? ''}
            onChange={(event) => setAnswer(`speakingPart2Answer-${index}-${tab}`, event.target.value)}
          />
          <div className="mt-7 border-t border-dashed border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => patchAnswers({ speakingPart2ShowSample: showSample ? 'false' : 'true' })}
              className="h-10 w-full rounded-lg border border-brand-600 text-sm font-semibold text-brand-600 hover:bg-blue-50"
            >
              <MessageCircle className="mr-2 inline" size={15} />{showSample ? 'Ẩn Sample Answer' : 'Sample Answer'}
            </button>
            {showSample && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-slate-800">
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

  function setTab(nextTab: number) {
    patchAnswers({ speakingPart3Tab: String(nextTab), speakingPart3ShowSample: 'false' });
  }

  function renderPromptImage(src: string, label: string, keyName: string) {
    if (!src || failedImages[keyName]) {
      return (
        <div className="relative flex h-[198px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-500">
          <span className="absolute left-2 top-2 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-white">{label}</span>
          Chưa tải được ảnh. Kiểm tra file trong public/images/speaking/part3.
        </div>
      );
    }

    return (
      <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
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

  if (mode !== 'practice') {
    return (
      <AptisPaper narrow compact>
        <div className="mx-auto max-w-[880px] space-y-5">
          <h1 className="flex items-center gap-3 text-2xl font-extrabold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-sm text-white">i</span>
            Giới thiệu - Speaking Part 3
          </h1>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
            <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-blue-50 text-center text-sm font-extrabold text-blue-950">
              <div className="border-r border-slate-200 p-4">Phần thi</div>
              <div className="border-r border-slate-200 p-4">Mô tả</div>
              <div className="p-4">Hướng dẫn ôn tập</div>
            </div>
            <div className="grid min-h-[300px] grid-cols-[1.4fr_1fr_1fr] text-sm leading-7">
              <div className="border-r border-slate-200 bg-slate-50 p-6 font-bold">
                <p>Part 3:</p>
                <p>Mô tả, so sánh, cung cấp lý do và giải thích.</p>
              </div>
              <div className="border-r border-slate-200 p-6">
                Trong phần này, bạn sẽ được yêu cầu <b>so sánh hai bức ảnh</b> và sau đó trả lời <b>hai câu hỏi</b> liên quan đến chủ đề. Độ khó sẽ tăng dần từ mô tả đến suy đoán.
                <br /><br />Thời gian nói: <b>45 giây / câu hỏi.</b>
              </div>
              <div className="space-y-4 p-6">
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">✓</span>Để chuẩn bị cho bài tập này, hãy luyện nói so sánh hai vật thể khác nhau và tập trung mô tả ưu, nhược điểm.</p>
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">✓</span>Với phần suy đoán, dùng cấu trúc như <i>might, could, seem to, appear to</i>.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
            <TrendingUp className="mr-3 inline text-cyan-700" size={22} />
            <b>Thang điểm APTIS:</b> từ A0 đến C1. Part 3 đánh giá khả năng so sánh, lập luận và suy đoán bằng tiếng Anh.
          </div>
          <div className="rounded-2xl bg-white p-6 text-center shadow-soft">
            <p className="mb-4 text-sm font-semibold text-slate-500">Chọn chế độ học</p>
            <button type="button" onClick={() => openPractice(0)} className="mx-auto h-12 w-full max-w-[300px] rounded-full bg-brand-600 text-sm font-extrabold text-white hover:bg-brand-700">
              <Mic className="mr-2 inline" size={16} /> Trang luyện tập
            </button>
          </div>
        </div>
      </AptisPaper>
    );
  }

  return (
    <AptisPaper narrow compact>
      <div className="mx-auto max-w-[840px] overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="border-b border-slate-200 px-7 py-5">
          <div className="mb-4 h-1.5 rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-3 text-base font-extrabold text-slate-700">
            Speak question <InlineNumber value={index + 1} /> / {questions.length}
          </div>
        </div>
        <div className="p-7">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2">
            {renderPromptImage(image1Url, 'Ảnh 1', `urlpic1-${index}`)}
            {renderPromptImage(image2Url, 'Ảnh 2', `urlpic2-${index}`)}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {tabs.map((item, itemIndex) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => setTab(itemIndex)}
                  className={`h-11 rounded-lg border text-sm font-semibold ${tab === itemIndex ? 'border-brand-600 bg-blue-50 text-brand-600' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                >
                  <Icon className="mr-1.5 inline" size={15} />{item.label}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">{prompt}</h2>
            <SpeakingRecordButton compact />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-500">Your answer</p>
          <textarea
            className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 italic text-slate-500"
            placeholder="Your speech will appear here..."
            value={saved[`speakingPart3Answer-${index}-${tab}`] ?? ''}
            onChange={(event) => setAnswer(`speakingPart3Answer-${index}-${tab}`, event.target.value)}
          />
          <div className="mt-7 border-t border-dashed border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => patchAnswers({ speakingPart3ShowSample: showSample ? 'false' : 'true' })}
              className="h-10 w-full rounded-lg border border-brand-600 text-sm font-semibold text-brand-600 hover:bg-blue-50"
            >
              <MessageCircle className="mr-2 inline" size={15} />{showSample ? 'Ẩn Sample Answer' : 'Sample Answer'}
            </button>
            {showSample && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-slate-800">
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
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
            <div className="grid grid-cols-[100px_1fr_1fr] bg-blue-50 text-center text-sm font-extrabold text-blue-950">
              <div className="border-r border-slate-200 p-4">Phần thi</div>
              <div className="border-r border-slate-200 p-4">Mô tả</div>
              <div className="p-4">Hướng dẫn ôn tập</div>
            </div>
            <div className="grid min-h-[390px] grid-cols-[100px_1fr_1fr] text-sm leading-7">
              <div className="border-r border-slate-200 bg-slate-50 p-5 font-bold">
                <p>Part 4:</p>
                <p>Thảo luận kinh nghiệm cá nhân và đưa ra ý kiến cho mỗi chủ đề trừu tượng.</p>
              </div>
              <div className="border-r border-slate-200 p-6">
                Trong phần cuối, bạn sẽ quan sát một bức ảnh và <b>trả lời ba câu hỏi</b> về một chủ đề trừu tượng.
                <br /><br />
                Thí sinh có <b>1 phút</b> để chuẩn bị câu trả lời và có thể ghi chú.
                <br /><br />
                Thời gian nói: <b>2 phút.</b>
              </div>
              <div className="space-y-4 p-6">
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs text-white">!</span>Một lỗi phổ biến là mô tả bức ảnh. Part 4 cần trả lời sâu hơn về chủ đề.</p>
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs text-white">!</span>Tránh đi lệch đề. Hãy trả lời rõ ràng, mạch lạc và dùng cấu trúc chính xác.</p>
                <p><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">✓</span>Luyện nói trong hai phút về một chủ đề trừu tượng để quen thời lượng thi.</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
            <TrendingUp className="mr-3 inline text-cyan-700" size={22} />
            <b>Thang điểm APTIS:</b> từ A0 đến C1. Part 4 đánh giá khả năng thảo luận kinh nghiệm cá nhân, đưa ra ý kiến và lập luận về chủ đề trừu tượng.
          </div>
          <div className="rounded-2xl bg-white p-6 text-center shadow-soft">
            <p className="mb-4 text-sm font-semibold text-slate-500">Chọn chế độ học</p>
            <div className="mx-auto grid max-w-[580px] gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => openPractice(0)} className="h-12 rounded-full bg-brand-600 text-sm font-extrabold text-white hover:bg-brand-700">
                <Mic className="mr-2 inline" size={16} /> Trang luyện tập
              </button>
              <button type="button" onClick={openSummary} className="h-12 rounded-full border border-slate-400 text-sm font-extrabold text-slate-700 hover:bg-slate-50">
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
          <div className="border-b border-slate-200 px-7 py-5">
            <div className="mb-4 h-1.5 rounded-full bg-slate-200">
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
              <h2 className="text-xl font-bold">{current.question ?? 'Speaking Part 4 question'}</h2>
              <SpeakingRecordButton compact durationSeconds={120} />
            </div>
            <p className="mt-8 text-xs font-bold uppercase tracking-widest text-slate-500">Your answer</p>
            <textarea
              className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 italic text-slate-500"
              placeholder="Your speech will appear here..."
              value={saved[`speakingPart4Answer-${index}`] ?? ''}
              onChange={(event) => setAnswer(`speakingPart4Answer-${index}`, event.target.value)}
            />
            <div className="mt-7 border-t border-dashed border-slate-200 pt-5">
              <button
                type="button"
                onClick={() => patchAnswers({ speakingPart4ShowSample: showSample ? 'false' : 'true' })}
                className="h-10 w-full rounded-lg border border-brand-600 text-sm font-semibold text-brand-600 hover:bg-blue-50"
              >
                <MessageCircle className="mr-2 inline" size={15} />{showSample ? 'Ẩn Sample Answer' : 'Sample Answer'}
              </button>
              {showSample && (
                <div
                  className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-slate-800"
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
            <thead className="bg-slate-50 text-left">
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
                    <tr className="border-b border-slate-200">
                      <td className="border-r border-slate-200 px-3 py-3 font-bold text-slate-600">{index + 1}</td>
                      <td className="border-r border-slate-200 px-3 py-3">{question.question}</td>
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
                        <td className="border-r border-slate-200 bg-blue-50" />
                        <td colSpan={2} className="border-l-4 border-brand-600 bg-blue-50 p-5">
                          <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-slate-500">Đáp án mẫu</p>
                          <div
                            className="prose max-w-none text-sm leading-7 text-slate-800"
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
        <p className="font-extrabold text-slate-900">Thời gian nói: 45 giây</p>
        <p className="mt-1 text-sm text-slate-500">{recording ? `Đang ghi âm, còn ${remaining} giây.` : remaining === 0 ? 'Đã hết thời gian nói.' : 'Bấm bắt đầu ghi âm để tính giờ.'}</p>
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
          <p className="mb-2 text-sm font-bold text-slate-600">Bản ghi của bạn</p>
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
  const palette = ['bg-amber-400 text-slate-950', 'bg-emerald-700 text-white', 'bg-red-500 text-white', 'bg-cyan-500 text-slate-950', 'bg-brand-600 text-white'];
  const sampleHtml = (html?: string) => ({ __html: (html ?? '').replace(/\n/g, '<br />') });
  const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;
  const writingInstruction = (text: string | undefined, currentPart: number) => {
    if (currentPart === 0) {
      const article = /^[aeiou]/i.test(club.clubName) ? 'an' : 'a';
      return `You are joining ${article} ${club.clubName}. Fill out the form. Write short answers (1-5 words) for each message (Bài này nên trả lời dài nhất là 5 từ, viết hoa từ đầu và dấu chấm kết thúc câu).`;
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
              className={`h-11 rounded-md px-5 text-base font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${palette[index % palette.length]}`}
              key={`${item.clubName}-${index}`}
              onClick={() => patchAnswers({ selectedClubIndex: String(index), writingPartIndex: '0' })}
            >
              {item.clubName}
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
  const partTitle = partIndex === 3 ? 'Email Writing' : club.clubName;

  return (
    <AptisPaper narrow compact>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="rounded bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white" onClick={() => patchAnswers({ selectedClubIndex: '-1', writingPartIndex: '0' })}>Quay lại danh sách</button>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((index) => (
            <button
              type="button"
              className={`rounded px-3 py-1.5 text-sm font-bold ${partIndex === index ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
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
            <span className="mt-1 block text-right text-sm text-slate-600">Word Count: {wordCount(getWriting('p2'))}</span>
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
                  <span className="mt-1 block text-right text-sm text-slate-600">Word Count: {wordCount(text)}</span>
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
                <span className="mt-1 block text-right text-sm text-slate-600">Word Count: {wordCount(text)}</span>
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
      <div className="border-t-2 border-red-600 bg-white px-6 pb-24 pt-0 text-slate-950">
        <div className="max-w-none">
          {children}
        </div>
      </div>
    );
  }
  return <div className={`mx-auto bg-white text-slate-950 ${compact ? 'px-4 py-4 sm:px-6' : 'px-4 py-8 sm:px-8'} ${narrow ? 'max-w-[1280px]' : 'max-w-[1320px]'}`}>{children}</div>;
}

function QuestionCounter({ current, total }: { current?: number; total?: number }) {
  return <h1 className="mb-4 text-xl font-extrabold">Question <span className="mx-3 inline-flex min-w-10 justify-center border-b border-slate-900">{current ?? 1}</span> of {total ?? 1}</h1>;
}

function InlineNumber({ value = 1 }: { value?: number }) {
  return <span className="inline-flex h-9 min-w-16 items-center justify-center rounded border border-slate-300 bg-white px-4 text-base font-bold">{value}</span>;
}

function AudioBar({ text, audioUrl }: { text?: string; audioUrl?: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const progress = duration ? Math.min(100, (current / duration) * 100) : 0;

  function toggleAudio() {
    const audio = ref.current;
    if (!audio || !audioUrl) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  return (
    <div className="mb-4 flex min-h-12 items-center justify-between gap-4 rounded bg-[#ef2620] px-5 py-1.5 text-white">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {audioUrl && (
          <audio
            ref={ref}
            src={audioUrl}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
            className="hidden"
          />
        )}
        <button type="button" onClick={toggleAudio} className="grid h-7 w-7 place-items-center rounded-full text-white hover:bg-white/10" aria-label={playing ? 'Pause audio' : 'Play audio'}>
          <Play size={16} fill="currentColor" className={playing ? 'opacity-70' : ''} />
        </button>
        <Volume2 size={17} fill="currentColor" />
        <div className="relative h-1.5 w-32 rounded-full bg-white">
          <span className="absolute left-0 top-0 h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
          <span className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-brand-600" style={{ left: `calc(${progress || 50}% - 7px)` }} />
        </div>
      </div>
      <span className="text-xs font-bold">{text ?? '2 of 2 plays remaining'}</span>
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
        <span className={value ? 'text-slate-950' : 'text-slate-950'}>{label}</span>
        <span className="text-xl leading-none text-slate-700">⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[42px] z-50 border border-slate-500 bg-white shadow-lg">
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
              className="block min-h-9 w-full px-4 py-1.5 text-left text-slate-950 hover:bg-blue-50"
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
  return <button type="button" className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-brand-700">Show paragraph</button>;
}


