import { ArrowRight, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const dailyGoals = [
  { title: 'Thi thử Reading', to: '/app/mock-tests?skill=READING' },
  { title: 'Thi thử Listening', to: '/app/mock-tests?skill=LISTENING' },
  { title: 'Thi thử Speaking', to: '/app/mock-tests?skill=SPEAKING' },
  { title: 'Thi thử Writing', to: '/app/mock-tests?skill=WRITING' },
  { title: 'Thi thử Grammar & Vocabulary', to: '/app/mock-tests?skill=GRAMMAR' },
  { title: 'Thi thử Full Test', to: '/app/mock-tests?skill=FULL' }
];

function localDayNumber() {
  const now = new Date();
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
}

export function DailyPracticeGoal() {
  const [day, setDay] = useState(localDayNumber);
  const [selection, setSelection] = useState<{ day: number; to: string } | null>(null);
  useEffect(() => {
    const update = () => setDay(localDayNumber());
    const timer = window.setInterval(update, 60_000);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, []);
  const goal = (selection?.day === day ? dailyGoals.find(item => item.to === selection.to) : null)
    ?? dailyGoals[day % dailyGoals.length];

  return <article className="learning-daily-goal">
    <div className="learning-daily-goal-link">
      <span className="learning-stat-icon bg-red-50 text-red-500"><Target size={21} /></span>
      <div className="min-w-0 flex-1">
        <p className="learning-eyebrow">MỤC TIÊU HÔM NAY</p>
        <strong>{goal.title}</strong>
        <label className="sr-only" htmlFor="daily-mock-skill">Chọn Full Test hoặc kỹ năng thi thử hôm nay</label>
        <select id="daily-mock-skill" className="learning-daily-select" value={goal.to} onChange={(event) => setSelection({ day, to: event.target.value })}>
          <option value="/app/mock-tests?skill=FULL">Full Test · Đầy đủ kỹ năng</option>
          {dailyGoals.filter(item => !item.to.endsWith('=FULL')).map(item => <option key={item.to} value={item.to}>{item.title}</option>)}
        </select>
        <p className="learning-daily-description">Chọn 1 đề thi thử để hoàn thành hôm nay.</p>
        <Link to={goal.to} className="learning-small-link learning-daily-action">Chọn đề thi thử <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
    </div>
  </article>;
}
