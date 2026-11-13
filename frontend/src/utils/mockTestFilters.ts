import type { MockTestResult, Submission } from '../types';

export type MockPriority = 'IMPORTANT' | 'NOTABLE' | 'REFERENCE';
export const mockPriorityLabels: Record<MockPriority, string> = {
  IMPORTANT: 'Quan trọng', NOTABLE: 'Đáng chú ý', REFERENCE: 'Tham khảo'
};

export function mockCardPriority(card: { priority?: MockPriority; featured?: boolean; title?: string }): MockPriority {
  if (card.priority && card.priority !== 'REFERENCE') return card.priority;
  const title = (card.title ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  if (/\bquan trong\b/.test(title)) return 'IMPORTANT';
  if (/\bdang chu y\b/.test(title)) return 'NOTABLE';
  return card.priority ?? (card.featured ? 'IMPORTANT' : 'REFERENCE');
}

export function hasCompletedMockCard(
  card: { id: string; skill: string; practiceTestId?: number },
  results: Pick<MockTestResult, 'mockTestId' | 'skill'>[],
  submissions: Pick<Submission, 'testId'>[]
) {
  return results.some(result => result.mockTestId === card.id && result.skill === card.skill)
    || (card.skill !== 'FULL' && card.practiceTestId != null
      && submissions.some(submission => submission.testId === card.practiceTestId));
}
