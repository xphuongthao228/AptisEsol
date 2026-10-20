import type { SpeakingPracticePrompt } from './speaking-practice-data';
import importedBankImages from './speaking-bank-images.json';

export type SpeakingBankRow = {
  id: string; part: string; topic: string; question: string; vi: string;
  text: string; level: string; section: string; tag: string; textVi?: string;
  bank?: 'samples' | 'answers';
};

function questionKey(value: string) {
  return value.replace(/\\n/g, '\n').split(/\r?\n|\?/)[0]
    .normalize('NFKC').replace(/\([^)]*\)\s*$/, '')
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function sameQuestion(a: string, b: string) {
  return !!questionKey(a) && questionKey(a) === questionKey(b);
}

export function mergeSpeakingBank(practice: SpeakingPracticePrompt[], rows: SpeakingBankRow[]): SpeakingPracticePrompt[] {
  const enrich = (prompt: SpeakingPracticePrompt, bankId?: string): SpeakingPracticePrompt => {
    const candidates = rows.filter(row => row.part === prompt.part && sameQuestion(row.question, prompt.question));
    const scoped = candidates.filter(row => row.topic === prompt.topic);
    const unambiguous = new Set(candidates.map(row => row.topic)).size <= 1;
    const matching = rows.filter(row => row.part === prompt.part &&
      (bankId && row.id === bankId || (scoped.length ? scoped : unambiguous ? candidates : []).includes(row)));
    const toStep = (row: SpeakingBankRow) => ({
      title: row.tag || 'Triển khai câu trả lời', hint_vi: row.textVi || '',
      starter_en: '', suggested_answer: row.text,
    });
    const forms = matching.filter(row => row.bank === 'samples' && (!row.level || row.level === 'B1')).map(toStep);
    const formsByLevel = Object.fromEntries(['B1', 'B2', 'C1'].map(level => [level,
      matching.filter(row => row.bank === 'samples' && row.level === level).map(toStep)]));
    const levelSamples = { ...prompt.levelSamples };
    for (const level of ['B1', 'B2', 'C1']) {
      const answers = matching.filter(row => row.bank === 'answers' && row.level === level);
      if (!levelSamples[level] && answers.length) levelSamples[level] = answers.map(row => row.text).join('\n');
    }
    const fullQuestion = matching.find(row => row.question.replace(/\\n/g, '\n').includes('\n'))?.question;
    return { ...prompt, question: fullQuestion?.replace(/\\n/g, '\n') || prompt.question,
      forms: prompt.forms?.length ? prompt.forms : forms, formsByLevel, levelSamples };
  };
  const groupedPart3Topics = new Set(rows.filter(row => row.part === 'Speaking Part 3' && /[-_]Q[123]$/i.test(row.id)).map(row => row.topic));
  const hasPart4Samples = rows.some(row => row.part === 'Speaking Part 4' && row.bank === 'samples');
  const result = practice.filter(prompt => !(hasPart4Samples && prompt.part === 'Speaking Part 4' &&
    questionKey(prompt.topic).normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'mau form chung cho toan bo cau hoi') && prompt.part !== 'Speaking Part 2' &&
    !(prompt.part === 'Speaking Part 3' && groupedPart3Topics.has(prompt.topic))).map(prompt => {
    if (!prompt.subQuestions?.length) return enrich(prompt);
    const subQuestions = prompt.subQuestions.map(sub => {
      const enriched = enrich({ ...prompt, ...sub, subQuestions: undefined });
      return { ...sub, question: enriched.question, levelSamples: enriched.levelSamples || sub.levelSamples,
        forms: (enriched.forms || []).map(step => ({ ...step, expansion_hint_vi: step.expansion_hint_vi || '', is_optional: step.is_optional === true })) };
    });
    return { ...prompt, ...subQuestions[0], id: prompt.id, subQuestions };
  });
  // Imported banks are a source of practice questions themselves, even without a matching test.
  const groups = new Map<string, SpeakingBankRow>();
  rows.forEach(row => groups.set(`${row.part}:${row.id}`, row));
  const pictureSets = new Map<string, Map<number, SpeakingBankRow>>();
  for (const row of groups.values()) {
    if (row.part !== 'Speaking Part 2' && row.part !== 'Speaking Part 3') continue;
    const match = row.id.match(/^(.*?)[-_]Q([123])$/i);
    if (!match) continue;
    const key = `${row.part}:${match[1]}`;
    const set = pictureSets.get(key) || new Map<number, SpeakingBankRow>();
    set.set(Number(match[2]), row);
    pictureSets.set(key, set);
  }
  for (const [setKey, set] of pictureSets) {
    const subQuestions = [...set].sort(([a], [b]) => a - b).map(([, row]) => {
      const prompt = enrich({ id: row.id, part: row.part, topic: row.topic, question: row.question,
        vi: row.vi || '', images: [], samples: [], source: 'Kho mẫu câu & đáp án' }, row.id);
      return { question: prompt.question, vi: prompt.vi, samples: prompt.samples,
        forms: (prompt.forms || []).map(step => ({ ...step, expansion_hint_vi: '', is_optional: false })),
        ideas: (prompt.forms || []).map(step => step.hint_vi).filter(Boolean), vocabulary: [],
        levelSamples: prompt.levelSamples || {}, duration: 45 };
    });
    const first = set.get(1) || [...set.values()][0];
    const setId = setKey.slice(first.part.length + 1);
    const pictureNumber = Number(setId.match(/^(?:P2|part3)[-_](\d+)$/i)?.[1]);
    // These numbered assets belong to the imported P2-01 ... P2-37 sets.
    const localImages = first.part === 'Speaking Part 2'
      ? pictureNumber >= 1 && pictureNumber <= 37 ? [`/images/speaking/part2/${pictureNumber}.png`] : []
      : pictureNumber >= 1 && pictureNumber <= 25 ? [1, 2].map(side => `/images/speaking/part3/de${String(pictureNumber).padStart(2, '0')}_${side}.png`) : [];
    // Match the actual imported prompt; bank numbering need not match test numbering.
    const topicMatches = practice.filter(prompt => prompt.part === first.part &&
      questionKey(prompt.topic) === questionKey(first.topic));
    const questionMatches = practice.filter(prompt => prompt.part === first.part &&
      [...set.values()].some(row => [prompt.question, ...(prompt.subQuestions || []).map(sub => sub.question)]
        .some(question => sameQuestion(question, row.question))));
    const matches = topicMatches.length ? topicMatches : questionMatches;
    const matchedImages = [0, 1].map(side => {
      const urls = [...new Set(matches.map(prompt => prompt.images[side]).filter(Boolean))];
      const imported = importedBankImages.find(entry => entry.part === first.part &&
        questionKey(entry.topic) === questionKey(first.topic));
      return urls.length === 1 ? urls[0] : imported?.images[side] || '';
    });
    // Use the matched question's image even when its URL points to a local asset.
    // New imports may use IDs unrelated to the original P2-01 numbering.
    const images = matchedImages.some(Boolean) ? matchedImages.filter(Boolean) : localImages;
    result.push({ id: `bank:${first.part}:${setId}`, part: first.part, topic: first.topic,
      ...subQuestions[0], subQuestions, images, imageFallbacks: images.map((src, side) => {
        const imported = importedBankImages.find(entry => entry.part === first.part && questionKey(entry.topic) === questionKey(first.topic));
        return imported?.images[side] !== src ? imported?.images[side] || '' : '';
      }), source: 'Kho mẫu câu & đáp án' });
  }
  for (const row of groups.values()) {
    if ((row.part === 'Speaking Part 2' || row.part === 'Speaking Part 3') && /[-_]Q[123]$/i.test(row.id)) continue;
    const exists = row.part !== 'Speaking Part 2' && result.some(prompt => prompt.part === row.part &&
      (sameQuestion(prompt.question, row.question) || prompt.subQuestions?.some(sub => sameQuestion(sub.question, row.question))));
    if (exists) continue;
    result.push(enrich({ id: `bank:${row.part}:${row.id}`, part: row.part, topic: row.topic,
      question: row.question.replace(/\\n/g, '\n'), vi: row.vi || '', images: [], samples: [], source: 'Kho mẫu câu & đáp án' }, row.id));
  }
  return result;
}
