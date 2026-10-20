import type { SpeakingFormStep } from './speaking-practice-data';

// Sentence steps keep the exact wording of the imported level sample.
export function speakingLevelForms(sample: string | undefined, level: string): SpeakingFormStep[] {
  if (!sample?.trim()) return [];
  const sentences = sample.trim().split(/(?<=[.!?])\s+(?=[A-Z“"'])|\n+/).map(text => text.trim()).filter(Boolean);
  return sentences.map((sentence, index) => ({
    title: `Câu ${index + 1} · ${level}`, hint_vi: 'Thay thông tin trong câu mẫu bằng trải nghiệm của bạn.',
    starter_en: '', suggested_answer: sentence,
  }));
}
