import type { Question, Test } from '../../types';
import { repairMojibake } from '../../utils/textRepair';
import { isQuestionInPart } from './Tests';

export type SpeakingSubQuestion = { question: string; vi: string; samples: string[] } & ReturnType<typeof dynamicFields>;
export type SpeakingFormStep = { title: string; hint_vi: string; starter_en: string; suggested_answer: string; expansion_hint_vi?: string; is_optional?: boolean };
export type SpeakingPracticePrompt = { id: string; part: string; topic: string; question: string; vi: string; images: string[]; samples: string[]; source: string; subQuestions?: SpeakingSubQuestion[]; forms?: SpeakingFormStep[]; ideas?: string[]; vocabulary?: string[]; levelSamples?: Record<string, string>; duration?: number };
function jsonArray(value: unknown): unknown[] {
  try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function dynamicFields(item: Record<string, unknown>) {
  const forms = jsonArray(item.forms || item.forms_json).flatMap(raw => {
    if (!raw || typeof raw !== 'object') return [];
    const s = raw as Record<string, unknown>;
    const rawAnswer = s.suggested_answer ?? s.value;
    const answer = text(rawAnswer);
    if (!text(s.title) || typeof rawAnswer !== 'string') return [];
    return [{ title: text(s.title), hint_vi: text(s.hint_vi || s.description_vi), starter_en: text(s.starter_en || s.starter), suggested_answer: answer, expansion_hint_vi: text(s.expansion_hint_vi || s.guide_vi), is_optional: s.is_optional === true }];
  });
  return {
    forms,
    ideas: jsonArray(item.ideas_vi || item.ideas_vi_json).map(text).filter(Boolean),
    vocabulary: jsonArray(item.vocabulary || item.vocabulary_json).map(text).filter(Boolean),
    levelSamples: Object.fromEntries(['B1', 'B2', 'C1'].map(level => [level, plain(item[`${level.toLowerCase()}_sample`])])),
    duration: Number(item.duration_seconds) > 0 ? Number(item.duration_seconds) : undefined,
  };
}
const text = (value: unknown): string => typeof value === 'string' ? repairMojibake(value).trim() : '';
function plain(value: unknown) {
  const doc = new DOMParser().parseFromString(text(value).replace(/<br\s*\/?\s*>/gi, '\n'), 'text/html');
  return doc.body.textContent?.trim() || '';
}
function pick(item: Record<string, unknown>, keys: string[]) { return keys.map(k => text(item[k])).find(Boolean) || ''; }
function image(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const local = value.match(/(?:^|\/)(speaking\/part[23]\/[^?#]+)/i)?.[1];
  return local ? `/images/${local.replace(/^speaking\/part3\/(\d+)_(1|2)\.png$/i, (_, n, side) => `speaking/part3/de${n.padStart(2, '0')}_${side}.png`)}` : value;
}
export function speakingPracticePrompts(test: Test, questions: Question[]): SpeakingPracticePrompt[] {
  const imageIndexes: Record<number, number> = {};
  return [...questions].sort((a, b) => a.sortOrder - b.sortOrder).flatMap(q => {
    let data: Record<string, unknown> | null = null;
    try { const parsed = JSON.parse(q.content); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed; } catch { /* Plain text imports are also supported. */ }
    const explicit = text(data?.template).match(/^SPEAKING_PART([1-4])$/i);
    const part = explicit ? Number(explicit[1]) : [1, 2, 3, 4].find(p => isQuestionInPart(q, 'SPEAKING', p, test));
    if (!part) return [];
    const items = data ? (Array.isArray(data.questions) && data.questions.length ? data.questions : [data]) : [{ question: q.content }];
    return items.flatMap<SpeakingPracticePrompt>((raw, i) => {
      const imageIndex = imageIndexes[part] ?? 0;
      imageIndexes[part] = imageIndex + 1;
      const item: Record<string, unknown> = typeof raw === 'string' ? { question: raw } : raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
      const images = [1, 2].slice(0, part === 3 ? 2 : part === 2 ? 1 : 0).map(side => {
        const path = pick(item, [`urlpic${side}`, `urlPic${side}`, `url_pic${side}`, `url_pic_${side}`, `image${side}`, `image${side}Url`, `image_${side}`, `picture${side}`, `picture${side}Url`, `pic${side}`, `photo${side}`, `photo${side}Url`, ...(side === 1 ? ['imageUrl'] : [])]);
        // Same local fallback convention as the Part practice runner.
        return image(path || (part === 2 ? `/images/speaking/part2/${imageIndex + 1}.png` : `/images/speaking/part3/de${String(imageIndex + 1).padStart(2, '0')}_${side}.png`));
      });
      const development = jsonArray((data?.development_data as Record<string, unknown> | undefined)?.questions);
      const metadata = development.find(raw => {
        if (!raw || typeof raw !== 'object') return false;
        const candidate = raw as Record<string, unknown>;
        const question = pick(item, ['question', 'prompt', 'content', 'question1']);
        return question && text(candidate.question) === question;
      }) as Record<string, unknown> | undefined;
      const enriched = { ...metadata, ...item };
      if (part === 4 && item.q2_forms_json && item.q3_forms_json) {
        enriched.forms = ['forms_json', 'q2_forms_json', 'q3_forms_json'].flatMap((key, n) => jsonArray(item[key]).flatMap(raw => raw && typeof raw === 'object' ? [{ ...raw, title: `Q${n + 1}: ${(raw as Record<string, unknown>).title || ''}` }] : []));
      }
      if (part === 4) {
        const numberedQuestions = [1, 2, 3].map(n => pick(item, [`question${n}`, `q${n}`])).filter(Boolean);
        const question = numberedQuestions.length > 1 ? numberedQuestions.join('\n') : pick(item, ['question', 'prompt', 'content']) || numberedQuestions.join('\n');
        if (!question) return [];
        return [{ id: `practice:${test.id}:${q.id}:${i}`, part: 'Speaking Part 4', topic: pick(item, ['topic', 'title']) || text(q.topic) || test.title, question: plain(question), vi: pick(item, ['vi', 'questionVi', 'translation']), images, samples: [plain(item.answer1 || item.sampleAnswer || item.answer || item.original_answer1)].filter(Boolean), source: test.title, ...dynamicFields(enriched) }];
      }
      const direct = pick(item, ['question', 'prompt', 'content']);
      const numbered = [1, 2, 3].map(n => ({ question: pick(item, [`question${n}`, `question_${n}`, `q${n}`, `prompt${n}`, `prompt_${n}`, ...(n === 1 ? ['compareQuestion'] : [])]), sample: plain(item[`question${n}_answer`] || item[`answer${n}`]) })).filter(v => v.question);
      const entries = direct ? [{ question: direct, sample: plain(item.answer1 || item.sampleAnswer || item.answer || item.original_answer1) }] : numbered;
      if ((part === 2 || part === 3) && numbered.length) {
        const development = jsonArray((data?.development_data as Record<string, unknown> | undefined)?.questions);
        const subQuestions = numbered.map((entry, n) => {
          const candidate = development[i * 3 + n];
          const metadata = candidate && typeof candidate === 'object' && text((candidate as Record<string, unknown>).question) === text(entry.question) ? candidate as Record<string, unknown> : {};
          return { question: plain(entry.question), vi: '', samples: [entry.sample].filter(Boolean), ...dynamicFields(metadata) };
        });
        return [{ id: `practice:${test.id}:${q.id}:${i}`, part: `Speaking Part ${part}`, topic: pick(item, ['topic', 'title']) || text(q.topic) || test.title, ...subQuestions[0], images, source: test.title, subQuestions }];
      }
      return entries.map((entry, n) => ({ id: `practice:${test.id}:${q.id}:${i}:${n}`, part: `Speaking Part ${part}`, topic: pick(item, ['topic', 'title']) || text(q.topic) || test.title, question: plain(entry.question), vi: pick(item, ['vi', 'questionVi', 'translation']), images, samples: [entry.sample, ...(part === 1 && direct ? [plain(item.answer2 || item.original_answer2)] : [])].filter(Boolean), source: test.title, ...dynamicFields(enriched) }));
    });
  });
}
