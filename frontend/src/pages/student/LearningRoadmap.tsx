import { Link } from 'react-router-dom';
import { CalendarDays, Clock3, Map, Target, Trophy } from 'lucide-react';
import './learning-dashboard.css';
import { useEffect, useState } from 'react';
import { api, unwrap } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { MockTestResult } from '../../types';
import { currentRoadmapStage, goalDaysRemaining, placementTestUrl, type LearningGoal, type RoadmapProgress } from '../../utils/learningRoadmap';

const stages = [
  { title: 'Bắt đầu', x: 9.5, y: 70.5, width: 12, height: 11, to: '/app/lessons' },
  { title: 'Thi thử đầu vào', x: 19.2, y: 58, width: 11, height: 11, to: placementTestUrl },
  { title: 'Xem hướng dẫn học', x: 30.7, y: 58, width: 11, height: 11, to: '/app/lessons' },
  { title: 'Reading', x: 42, y: 58, width: 11, height: 11, to: '/app/tests/parts?skill=READING' },
  { title: 'Listening', x: 60.8, y: 58, width: 12, height: 11, to: '/app/tests/parts?skill=LISTENING' },
  { title: 'Writing', x: 72.6, y: 58, width: 10.5, height: 11, to: '/app/tests/parts?skill=WRITING' },
  { title: 'Speaking', x: 84, y: 58, width: 11, height: 11, to: '/app/tests/parts?skill=SPEAKING' },
  { title: 'GV', x: 85, y: 40.5, width: 13, height: 11, to: '/app/mock-tests?skill=GRAMMAR' },
  { title: 'Thi thử', x: 66.2, y: 32.3, width: 14, height: 10, to: placementTestUrl },
  { title: 'Dự đoán đề', x: 46.5, y: 32.3, width: 15, height: 10, to: '/app/predictions' },
  { title: 'Về đích', x: 23, y: 34.5, width: 16, height: 10, to: '/app/history' }
];

export function LearningRoadmap({ mockResults, resultsLoading, goal, onEditGoal }: { mockResults: MockTestResult[]; resultsLoading: boolean; goal: LearningGoal | null; onEditGoal: () => void }) {
  const targetLevel = goal?.level ?? 'B2';
  const daysRemaining = goal ? goalDaysRemaining(goal.examDate) : null;
  const examDateLabel = goal ? goal.examDate.split('-').reverse().join('/') : '';
  const { data: progress, loading, error, reload } = useApi<RoadmapProgress>(() => unwrap(api.get('/progress/roadmap')), []);
  const [savingGuide, setSavingGuide] = useState(false);
  const [guideError, setGuideError] = useState(false);
  const activeIndex = currentRoadmapStage(progress, mockResults);
  const activeStage = stages[activeIndex];
  const ready = !loading && !resultsLoading && !error;
  const stageUrl = (index: number) => index === 7 && (progress?.skills.find(skill => skill.skill === 'GRAMMAR')?.total ?? 0) > 0 ? '/app/tests/questions/GRAMMAR' : stages[index].to;
  useEffect(() => {
    window.addEventListener('focus', reload);
    return () => window.removeEventListener('focus', reload);
  }, [reload]);
  async function completeMilestone(milestone: 'guide' | 'predictions') {
    setSavingGuide(true);
    setGuideError(false);
    try { await unwrap(api.post(`/progress/roadmap/${milestone}`)); reload(); }
    catch { setGuideError(true); }
    finally { setSavingGuide(false); }
  }
  return <section className="learning-roadmap learning-panel">
    <div className="learning-section-heading">
      <div className="flex items-center gap-3"><span className="learning-heading-icon"><Map size={22} /></span><div><p className="learning-eyebrow">TỪNG BƯỚC CHINH PHỤC MỤC TIÊU</p><h2>Lộ trình học Aptis {targetLevel}</h2></div></div>
      <Link to="/app/lessons" className="learning-small-link">Xem hướng dẫn ↗</Link>
    </div>
    {goal ? <div className="learning-roadmap-goal mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-navy">
        <span className="inline-flex items-center gap-2"><Target size={18} className="text-brand-600" />Aim <strong>{goal.level}</strong></span>
        <span className="inline-flex items-center gap-2"><CalendarDays size={18} className="text-amber-600" />Ngày thi: <strong>{examDateLabel}</strong></span>
        <span className="inline-flex items-center gap-2"><Clock3 size={18} className="text-emerald-600" />{daysRemaining === 0 ? 'Hôm nay là ngày thi' : daysRemaining! > 0 ? `Còn ${daysRemaining} ngày ôn tập` : 'Đã qua ngày thi dự kiến'}</span>
      </div>
      <button type="button" onClick={onEditGoal} className="learning-small-link">Điều chỉnh mục tiêu →</button>
    </div> : <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-4 text-sm text-slate-500"><p>Đặt ngày thi và aim để theo dõi mục tiêu ngay trên lộ trình.</p><button type="button" onClick={onEditGoal} className="learning-small-link">Đặt mục tiêu →</button></div>}
    <div className="learning-map-scroll"><div className="learning-map">
      <img src="/images/aptis-roadmap-neutral.png" alt={`Bản đồ lộ trình Aptis Lingo: 11 chặng, mục tiêu ${targetLevel}`} width={1672} height={941} className="learning-map-image" />
      {goal && <span className="learning-map-aim-title">Lộ trình học Aptis {targetLevel}</span>}
      <span className="learning-map-sign-aim" aria-label={`Mục tiêu trên bảng: ${targetLevel}`}>{targetLevel}</span>
      <span className="learning-map-book-aim" aria-label={`Mục tiêu trên sách: ${targetLevel}`}>{targetLevel}</span>
      {ready && <>
        <span className="learning-map-current-ring" style={{ left: `${activeStage.x}%`, top: `${activeStage.y}%`, width: `${activeStage.width}%`, height: `${activeStage.height}%` }} aria-hidden="true" />
        <div className="learning-map-character-position" style={{ left: `${Math.min(89, Math.max(8, activeStage.x + 4))}%`, top: `${activeStage.y - 27}%` }}>
          <img src="/images/aptis-roadmap-mascot.png" alt="" aria-hidden="true" className="learning-map-floating-mascot" />
          <span className="learning-map-current-label">{activeIndex === 10 ? 'Về đích!' : 'Đang học'}</span>
        </div>
      </>}
      {stages.map((stage, index) => <Link key={stage.title} to={stageUrl(index)} className="learning-map-hotspot" aria-label={`Chặng ${index + 1}: ${stage.title}`} title={`${index + 1}. ${stage.title}`} style={{ left: `${stage.x}%`, top: `${stage.y}%`, width: `${stage.width}%`, height: `${stage.height}%` }} />)}
    </div></div>
    <div className="learning-roadmap-status">
      {loading || resultsLoading ? <p>Đang tải tiến độ lộ trình…</p> : error ? <p>Chưa tải được tiến độ. <button onClick={reload} className="learning-small-link">Thử lại</button></p> : <>
        <strong>Chặng {activeIndex + 1}: {activeStage.title}</strong>
        <Link to={stageUrl(activeIndex)} className="learning-small-link ml-3">{activeIndex === 10 ? 'Xem kết quả' : 'Học tiếp'} →</Link>
        {activeIndex === 1 && <p>Làm một Full Test để xác định điểm 5 kỹ năng và bắt đầu lộ trình cá nhân.</p>}
        {(activeIndex === 2 || activeIndex === 9) && <div className="mt-2 flex flex-wrap items-center gap-3"><Link to={activeStage.to} className="learning-small-link">{activeStage.title} ↗</Link><button disabled={savingGuide} onClick={() => completeMilestone(activeIndex === 2 ? 'guide' : 'predictions')} className="learning-small-link">{savingGuide ? 'Đang lưu…' : activeIndex === 2 ? 'Đã xem hướng dẫn, bắt đầu luyện →' : 'Đã ôn dự đoán, hoàn thành lộ trình →'}</button>{guideError && <span>Chưa lưu được. Vui lòng thử lại.</span>}</div>}
        {activeIndex >= 3 && activeIndex <= 7 && <p>Hoàn thành tất cả câu luyện theo part để sang chặng tiếp theo. Câu đã làm được lưu theo tài khoản.</p>}
        {activeIndex === 8 && <p>Bạn đã hoàn thành các chặng luyện tập. Làm lại Full Test để đánh giá kết quả và về đích.</p>}
        <div className="learning-roadmap-counts">{progress?.skills.map(skill => <span key={skill.skill}>{skill.skill}: <strong>{skill.completed}/{skill.total}</strong>{skill.total === 0 ? ' · Chưa có câu hỏi' : skill.completed === skill.total ? ' ✓' : ''}</span>)}</div>
      </>}
    </div>
    <div className="mt-5 flex items-center justify-between gap-3"><p className="learning-eyebrow text-emerald-600">HÀNH TRÌNH CHINH PHỤC APTIS</p><span className="text-xs text-slate-500">Chọn một chặng để bắt đầu</span></div>
    <div className="learning-stage-list">{stages.map((stage, index) => <Link to={stageUrl(index)} key={stage.title} aria-current={ready && index === activeIndex ? 'step' : undefined} className={ready && index === activeIndex ? 'is-current' : index === 10 ? 'is-goal' : ''}><span>{index === 10 ? <Trophy size={16} /> : String(index + 1).padStart(2, '0')}</span><strong>{stage.title}</strong><small>{ready && index === activeIndex ? 'Đang học' : index === 10 ? `Mục tiêu ${targetLevel}` : 'Khám phá →'}</small></Link>)}</div>
  </section>;
}

