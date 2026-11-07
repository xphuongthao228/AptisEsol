const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/utils/learningRoadmap.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(compiled.outputText, filename);
const { fullTestScores, dashboardSkillScores, currentRoadmapStage } = loaded.exports;
const { goalDaysRemaining } = loaded.exports;
test('exam countdown uses calendar days across midnight and month boundaries', () => {
  assert.equal(goalDaysRemaining('2026-11-04', new Date(2026, 10, 4, 23, 59)), 0);
  assert.equal(goalDaysRemaining('2026-11-05', new Date(2026, 10, 4, 23, 59)), 1);
  assert.equal(goalDaysRemaining('2026-12-01', new Date(2026, 10, 30)), 1);
  assert.equal(goalDaysRemaining('2026-11-03', new Date(2026, 10, 4)), -1);
});
const full = (overrides = {}) => ({ id: 1, skill: 'FULL', maxScore: 200, score: 164, createdAt: '2026-11-04T08:00:00', resultJson: JSON.stringify({ reading: { score: 44 }, listening: { score: 38 }, speaking: { overallScore: 40 }, writing: { overallScore: 42 }, grammar: { score: 46 } }), ...overrides });
const progress = () => ({ guideReviewed: true, predictionsReviewed: false, lastPracticedAt: '2026-11-04T09:00:00', skills: ['READING', 'LISTENING', 'WRITING', 'SPEAKING', 'GRAMMAR'].map(skill => ({ skill, completed: 3, total: 3 })) });

test('Full Test fills all five axes including zero scores and total excludes Grammar', () => {
  const scores = fullTestScores(full());
  assert.deepEqual(scores.map(s => s.percent / 2), [44, 38, 40, 42, 46]);
  assert.equal(scores.slice(0, 4).reduce((sum, s) => sum + s.percent / 2, 0), 164);
  assert.equal(fullTestScores(full({ resultJson: '{"reading":{"score":0},"listening":{"score":0},"speaking":{"overallScore":0},"writing":{"overallScore":0},"grammar":{"score":0}}' }))[0].hasData, true);
});
test('malformed or intermediate FULL results never replace a complete assessment', () => {
  assert.equal(fullTestScores(full({ resultJson: '{}' })), null);
  assert.equal(fullTestScores(full({ maxScore: 50 })), null);
  const newest = full({ id: 2, createdAt: '2026-11-04T10:00:00', resultJson: '{}' });
  assert.equal(dashboardSkillScores([full(), newest], [])[0].percent, 88);
});
test('roadmap requires entry test then guide and every unique unit of each skill', () => {
  assert.equal(currentRoadmapStage(progress(), []), 1);
  assert.equal(currentRoadmapStage({ ...progress(), guideReviewed: false }, [full()]), 2);
  const p = progress(); p.skills[0].completed = 2;
  assert.equal(currentRoadmapStage(p, [full()]), 3);
  p.skills[0].completed = 3; p.skills[1].completed = 2;
  assert.equal(currentRoadmapStage(p, [full()]), 4);
  p.skills[1].total = 0; p.skills[1].completed = 0;
  assert.equal(currentRoadmapStage(p, [full()]), 4);
});
test('all practice leads to retest, then predictions and finish', () => {
  assert.equal(currentRoadmapStage(progress(), [full()]), 8);
  const retest = full({ id: 2, createdAt: '2026-11-04T10:00:00' });
  assert.equal(currentRoadmapStage(progress(), [full(), retest]), 9);
  assert.equal(currentRoadmapStage({ ...progress(), predictionsReviewed: true }, [full(), retest]), 10);
});
