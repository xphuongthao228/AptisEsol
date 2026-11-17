export function clampScore50(score: number) {
  return Math.min(50, Math.max(0, Math.round(Number.isFinite(score) ? score : 0)));
}

export type AptisBand = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export function aptisSkillBand(skill: 'LISTENING' | 'READING' | 'SPEAKING' | 'WRITING', rawScore: number, grammarScore: number): AptisBand {
  const score = clampScore50(rawScore);
  const grammarAllowsBorderline = clampScore50(grammarScore) > 32;

  if (skill === 'LISTENING') {
    if (score > 40 || (score === 40 && grammarAllowsBorderline)) return 'C1';
    if (score >= 34) return 'B2';
    if (score >= 24) return 'B1';
  }
  if (skill === 'READING') {
    if (score > 44 || (score === 44 && grammarAllowsBorderline)) return 'C1';
    if (score > 36 || (score === 36 && grammarAllowsBorderline)) return 'B2';
    if (score >= 24) return 'B1';
  }
  if (skill === 'SPEAKING') {
    if (score >= 46) return 'C1';
    if (score > 40 || (score === 40 && grammarAllowsBorderline)) return 'B2';
    if (score >= 26) return 'B1';
  }
  if (skill === 'WRITING') {
    if (score >= 46) return 'C1';
    if (score > 38 || (score === 38 && grammarAllowsBorderline)) return 'B2';
    if (score >= 26) return 'B1';
  }
  return score >= 14 ? 'A2' : 'A1';
}

export function overallBandFromSkills(bands: AptisBand[]): AptisBand {
  const levels: AptisBand[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const average = bands.reduce((sum, band) => sum + levels.indexOf(band), 0) / Math.max(1, bands.length);
  return levels[Math.min(levels.length - 1, Math.max(0, Math.round(average)))];
}

