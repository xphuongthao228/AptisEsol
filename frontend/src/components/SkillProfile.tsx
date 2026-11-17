import { Link } from 'react-router-dom';
import type { MockTestResult } from '../types';
import { aptisSkillBand, overallBandFromSkills } from '../utils/aptisScoring';
import { fullTestScores, placementTestUrl, type LearningGoal } from '../utils/learningRoadmap';
import { CefrBarChart } from './CefrBarChart';
import './skill-profile.css';

export function SkillProfile({ results, goal }: { results: MockTestResult[]; goal: LearningGoal | null }) {
  const latest = [...results]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id)
    .find(result => fullTestScores(result) !== null);
  const scores = latest ? fullTestScores(latest) : null;
  const grammar = scores?.find(skill => skill.name === 'Grammar');
  const grammarScore = grammar ? grammar.percent / 2 : null;
  const rows = (['LISTENING', 'READING', 'SPEAKING', 'WRITING'] as const).map(skill => {
    const name = skill[0] + skill.slice(1).toLowerCase();
    const value = scores?.find(item => item.name === name);
    const score = value ? value.percent / 2 : null;
    return { name, score, band: score !== null && grammarScore !== null ? aptisSkillBand(skill, score, grammarScore) : null };
  });
  const bands = rows.flatMap(row => row.band ? [row.band] : []);
  const overall = bands.length === 4 ? overallBandFromSkills(bands) : null;
  const total = scores ? rows.reduce((sum, row) => sum + (row.score ?? 0), 0) : null;

  return <div className="learning-skill-profile">
    <div className="learning-section-heading">
      <div><h2>Phân tích năng lực</h2><p className="skill-profile-subtitle">Kết quả Full Test gần nhất · Mục tiêu {goal?.level ?? 'B2'}</p></div>
      <span className="learning-cefr-badge">CEFR</span>
    </div>
    <h3 className="skill-profile-overall">Overall CEFR level: <strong>{overall ?? '—'}</strong></h3>
    <div className="skill-profile-columns">
      <div>
        <h4>Scale score</h4>
        <table className="skill-profile-table">
          <caption className="sr-only">Điểm các kỹ năng trong Full Test gần nhất</caption>
          <thead><tr><th scope="col">Skill name</th><th scope="col">Skill score</th></tr></thead>
          <tbody>
            {rows.map(row => <tr key={row.name}><th scope="row">{row.name}</th><td>{row.score === null ? '—' : `${row.score}/50`}</td></tr>)}
            <tr className="skill-profile-total"><th scope="row">Final Scale Score</th><td>{total === null ? '—' : `${total}/200`}</td></tr>
            <tr><th scope="row">Grammar and Vocabulary</th><td>{grammarScore === null ? '—' : `${grammarScore}/50`}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="skill-profile-bars">
        <h4>CEFR skill profile</h4>
        <CefrBarChart items={[...rows.map(row => ({ label: row.name, band: row.band })), { label: 'Overall', band: overall }]} />
      </div>
    </div>
    <p className="skill-profile-note">{latest
      ? `Cập nhật theo Full Test hoàn thành ngày ${new Intl.DateTimeFormat('vi-VN').format(new Date(latest.createdAt))}.`
      : 'Hoàn thành Full Test để xem điểm và mức CEFR của từng kỹ năng.'}</p>
    <Link to={placementTestUrl} className="learning-small-link">{latest ? 'Làm Full Test mới →' : 'Làm Full Test đầu vào →'}</Link>
  </div>;
}
