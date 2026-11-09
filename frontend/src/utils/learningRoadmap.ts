import type { MockTestResult, Submission } from '../types';

export const placementTestUrl = '/app/mock-tests?skill=FULL&full=1&screen=fullStart&roadmap=1';
export const radarSkillNames = ['Reading', 'Listening', 'Speaking', 'Writing', 'Grammar'] as const;
export type RadarSkill = { name: string; percent: number; hasData: boolean };
export type LearningGoal = { examDate: string; level: 'B1' | 'B2' | 'C1' };

export function goalDaysRemaining(examDate: string, now = new Date()): number {
  const [year, month, day] = examDate.split('-').map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000);
}
export type RoadmapProgress = {
  guideReviewed: boolean;
  predictionsReviewed: boolean;
  skills: Array<{ skill: string; completed: number; total: number }>;
  lastPracticedAt: string | null;
};

export function fullTestScores(result: MockTestResult): RadarSkill[] | null {
  if (result.skill.toUpperCase() !== 'FULL' || result.maxScore !== 200) return null;
  try {
    const details = JSON.parse(result.resultJson);
    const values = radarSkillNames.map(name => {
      const section = details?.[name.toLowerCase()];
      const value = name === 'Speaking' || name === 'Writing' ? section?.overallScore : section?.score;
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 50 ? value : null;
    });
    if (values.some(value => value === null)) return null;
    return radarSkillNames.map((name, index) => ({ name, percent: values[index]! * 2, hasData: true }));
  } catch { return null; }
}

export function dashboardSkillScores(results: MockTestResult[], submissions: Submission[]): RadarSkill[] {
  const newestFirst = [...results].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id);
  // A Full Test is one coherent assessment; do not mix its sections with unrelated practice attempts.
  for (const result of newestFirst) {
    const scores = fullTestScores(result);
    if (scores) return scores;
  }
  return radarSkillNames.map(name => {
    const mock = newestFirst.find(item => item.skill.toUpperCase() === name.toUpperCase() && item.maxScore > 0);
    if (mock) return { name, percent: Math.min(100, Math.max(0, mock.score / mock.maxScore * 100)), hasData: true };
    const attempts = submissions.filter(item => item.skillName.toLowerCase().includes(name.toLowerCase()) && item.maxScore > 0);
    return { name, percent: attempts.length ? attempts.reduce((sum, item) => sum + item.totalScore / item.maxScore * 100, 0) / attempts.length : 0, hasData: attempts.length > 0 };
  });
}

export function currentRoadmapStage(progress: RoadmapProgress | null, results: MockTestResult[]): number {
  const fullTests = results.filter(result => fullTestScores(result) !== null);
  if (!fullTests.length) return 1; // Stage 2: entry assessment.
  if (!progress?.guideReviewed) return 2;
  const sequence = ['READING', 'LISTENING', 'WRITING', 'SPEAKING'];
  const incomplete = sequence.findIndex(name => {
    const skill = progress.skills.find(item => item.skill === name);
    return !skill || skill.total === 0 || skill.completed < skill.total;
  });
  if (incomplete >= 0) return 3 + incomplete;
  const grammar = progress.skills.find(item => item.skill === 'GRAMMAR');
  const firstAssessmentAt = Math.min(...fullTests.map(result => new Date(result.createdAt).getTime()));
  const grammarTests = results.filter(result => result.skill === 'GRAMMAR' && result.maxScore === 50 && new Date(result.createdAt).getTime() >= firstAssessmentAt);
  if (grammar?.total ? grammar.completed < grammar.total : !grammarTests.length) return 7;
  const latestPracticeAt = Math.max(progress.lastPracticedAt ? new Date(progress.lastPracticedAt).getTime() : 0,
    ...(!grammar?.total ? grammarTests.map(result => new Date(result.createdAt).getTime()) : [0]));
  const hasFinalTest = latestPracticeAt > 0 && fullTests.some(result => new Date(result.createdAt).getTime() > latestPracticeAt);
  return hasFinalTest ? progress.predictionsReviewed ? 10 : 9 : 8;
}

export async function savePracticeCompletion(questionId: number, unitKey = 'question') {
  const { api, unwrap } = await import('../api/client');
  await unwrap(api.post(`/progress/questions/${questionId}/complete`, { unitKey }));
  window.dispatchEvent(new CustomEvent('aptis-practice-unit-completed', { detail: { questionId, unitKey } }));
}
