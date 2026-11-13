import type { MockTestResult, Submission } from '../types';

export type MockPriority = 'IMPORTANT' | 'NOTABLE' | 'REFERENCE';

export function readingPeopleWithNames<T extends { label: string; text: string }>(people: T[], options: string[], answers: string[]): T[] {
  const names = options.filter(value => value.trim() && !/^[A-D]$/i.test(value.trim()));
  if (names.length === people.length && people.every(person => /^[A-D]$/.test(person.label))) {
    return people.map(person => ({ ...person, label: names[person.label.charCodeAt(0) - 65] ?? person.label }));
  }
  const answerNames = [...new Set(answers.filter(value => value.trim() && !/^[A-D]$/i.test(value.trim())))];
  // Some older imports keep letter headings but store the names only in the answer key.
  // Recover only when every letter has exactly one matching name.
  if (people.length && people.every(person => /^[A-D]$/.test(person.label)
    && answerNames.filter(name => name[0]?.toUpperCase() === person.label).length === 1)) {
    return people.map(person => ({ ...person, label: answerNames.find(name => name[0]?.toUpperCase() === person.label)! }));
  }
  return people;
}

export function selectFreePlacementCard<T extends { skill: string; ready: boolean; accessible?: boolean; accessOrder?: number; title: string }>(
  cards: T[], hasFullData: (card: T) => boolean
): T | null {
  return cards.filter(card => card.skill === 'FULL' && card.ready && card.accessible === true
    && card.accessOrder != null && card.accessOrder >= 1 && card.accessOrder <= 2 && hasFullData(card))
    .sort((a, b) => a.accessOrder! - b.accessOrder! || a.title.localeCompare(b.title, undefined, { numeric: true }))[0] ?? null;
}
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
