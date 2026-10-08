// Capture UI reference screenshots for Stitch AI with local API fixtures.
// Run: node --experimental-websocket scripts/capture-stitch-ai.cjs
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../reports/stitch-ai-screens');
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const previewPort = 5179;
const debugPort = 9239;

fs.mkdirSync(output, { recursive: true });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const apiResponse = (data, message = 'stitch fixture') => ({ success: true, data, message, errors: null, timestamp: new Date().toISOString() });

const student = {
  id: 90001,
  email: 'stitch-student@example.invalid',
  fullName: 'Minh Anh',
  roles: ['STUDENT'],
  enabled: true,
  proExpiresAt: '2030-01-01T00:00:00',
  accessExpiresAt: '2030-01-01T00:00:00',
  lastSeenAt: '2026-10-02T13:00:00',
  createdAt: '2026-01-01T00:00:00',
  avatarUrl: null
};

const admin = { ...student, id: 90002, email: 'stitch-admin@example.invalid', fullName: 'Aptis Admin', roles: ['ADMIN'] };

const tests = [
  ['LISTENING', 'Listening Practice Test', 40],
  ['SPEAKING', 'Speaking Practice Test', 12],
  ['READING', 'Reading Practice Test', 35],
  ['WRITING', 'Writing Practice Test', 50]
].flatMap(([skill, title, duration], skillIndex) =>
  [1, 2, 3, 4].map((part) => ({
    id: skillIndex * 10 + part,
    skillId: skillIndex + 1,
    skillName: skill,
    title: `${title} - Part ${part}`,
    description: 'Luyện tập theo part với dữ liệu import mẫu.',
    durationMinutes: duration,
    status: 'PUBLISHED',
    mode: 'PRACTICE',
    featured: part === 1,
    questionCount: 4
  }))
);

const mockTests = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  externalId: `aptis-full-${String(index + 1).padStart(2, '0')}`,
  skill: index % 2 === 0 ? 'FULL' : 'READING',
  title: index % 2 === 0 ? `Aptis Full Test ${String(index + 1).padStart(2, '0')}` : `Reading Practice Test ${index + 1}`,
  description: 'Đề thi thử Aptis có đủ cấu trúc, thời gian và đáp án mẫu.',
  questions: index % 2 === 0 ? '5 kỹ năng' : '4 parts',
  minutes: index % 2 === 0 ? '162 phút' : '35 phút',
  status: 'PUBLISHED',
  featured: index < 2,
  accessible: true,
  accessOrder: index + 1,
  updatedAt: '2026-10-02T13:00:00',
  questionData: JSON.stringify([{ skill: 'READING', template: 'READING_HEADING_MATCH', part: 4 }])
}));

const lessons = [
  {
    id: 1,
    skill: 'READING',
    title: 'Nhận diện keyword trong bài đọc',
    summary: 'Luyện cách đọc câu hỏi trước, gạch từ khóa và tìm thông tin nhanh.',
    content: 'Đọc câu hỏi trước khi quét văn bản. Tập trung vào danh từ riêng, số liệu và từ đồng nghĩa.',
    status: 'PUBLISHED',
    resourceType: 'DOCUMENT',
    resourceUrl: null,
    partLabel: 'Reading · Part 1'
  },
  {
    id: 2,
    skill: 'LISTENING',
    title: 'Bắt ý chính khi nghe hội thoại',
    summary: 'Tập trung vào ngữ cảnh, người nói và tín hiệu chuyển ý.',
    content: 'Nghe câu mở đầu để xác định tình huống, sau đó chú ý các từ nhấn mạnh.',
    status: 'PUBLISHED',
    resourceType: 'VIDEO',
    resourceUrl: 'https://example.com/lesson.mp4',
    partLabel: 'Listening · Part 2'
  }
];

function questionsFor(testId) {
  const test = tests.find((item) => item.id === Number(testId));
  const skill = test?.skillName ?? 'READING';
  const partMatch = `${test?.title ?? ''}`.match(/Part\s*(\d+)/i);
  const part = Number(partMatch?.[1] ?? 1);
  const readingTemplates = {
    1: 'READING_GAP_FILL',
    2: 'READING_SENTENCE_ORDER',
    3: 'READING_FORUM_MATCH',
    4: 'READING_HEADING_MATCH'
  };
  return Array.from({ length: 3 }, (_, index) => ({
    id: Number(testId) * 100 + index + 1,
    testId: Number(testId),
    type: 'TEXT',
    content: JSON.stringify({
      template: skill === 'READING' ? readingTemplates[part] : `${skill}_PART${part}`,
      part,
      topic: `${skill} Part ${part}`,
      prompt: 'Sample practice question',
      options: ['A', 'B', 'C', 'D'],
      paragraphs: ['First paragraph', 'Second paragraph', 'Third paragraph'],
      questions: ['Question one?', 'Question two?'],
      correctAnswers: ['A', 'B']
    }),
    topic: `${skill} Part ${part}`,
    audioUrl: '',
    scriptText: '',
    explanation: 'Đáp án và giải thích mẫu.',
    points: 2,
    sortOrder: index + 1,
    featured: index === 0,
    answers: []
  }));
}

const routes = [
  { file: '01-login-desktop.png', title: 'Login', path: '/login', width: 1440, height: 900, auth: null },
  { file: '02-dashboard-desktop.png', title: 'Dashboard', path: '/app', width: 1440, height: 900, auth: 'student' },
  { file: '03-practice-parts-reading-desktop.png', title: 'Practice Parts Reading', path: '/app/tests/parts?skill=READING', width: 1440, height: 900, auth: 'student' },
  { file: '04-mock-tests-desktop.png', title: 'Mock Tests', path: '/app/mock-tests', width: 1440, height: 900, auth: 'student' },
  { file: '05-ai-practice-desktop.png', title: 'AI Practice', path: '/app/ai-practice', width: 1440, height: 900, auth: 'student' },
  { file: '06-lessons-desktop.png', title: 'Lessons', path: '/app/lessons', width: 1440, height: 900, auth: 'student' },
  { file: '07-admin-content-desktop.png', title: 'Admin Content', path: '/admin/content', width: 1440, height: 900, auth: 'admin' },
  { file: '08-practice-parts-mobile.png', title: 'Practice Parts Mobile', path: '/app/tests/parts?skill=READING', width: 390, height: 844, auth: 'student' },
  { file: '09-mock-tests-mobile.png', title: 'Mock Tests Mobile', path: '/app/mock-tests', width: 390, height: 844, auth: 'student' },
  { file: '10-dashboard-mobile.png', title: 'Dashboard Mobile', path: '/app', width: 390, height: 844, auth: 'student' }
];

let activeAuth = 'student';

function authScript(kind) {
  if (!kind) {
    return `localStorage.clear(); sessionStorage.clear(); localStorage.setItem('aptis-theme','light');`;
  }
  const user = kind === 'admin' ? admin : student;
  const token = `stitch.${Buffer.from(JSON.stringify({ exp: 2000000000 })).toString('base64url')}.fixture`;
  const state = JSON.stringify({ state: { user, accessToken: token, refreshToken: null }, version: 0 });
  return `
    localStorage.setItem('aptis-esol-auth', ${JSON.stringify(state)});
    localStorage.setItem('aptis-theme','light');
    sessionStorage.setItem('aptis-community-invite-dismissed','1');
  `;
}

function fixtureFor(url) {
  const pathname = url.pathname;
  const activeUser = activeAuth === 'admin' ? admin : student;
  if (pathname.endsWith('/auth/heartbeat')) return apiResponse({ user: activeUser, visitorId: 'stitch', onlineCount: 24 });
  if (pathname.endsWith('/auth/me')) return apiResponse(activeUser);
  if (pathname.includes('/payments/subscription/me')) return apiResponse({ active: true, proActive: true, expiresAt: '2030-01-01T00:00:00', daysLeft: 120 });
  if (pathname.endsWith('/tests')) return apiResponse(tests);
  if (pathname.endsWith('/mock-tests')) return apiResponse(mockTests);
  if (pathname.endsWith('/mock-tests/admin')) return apiResponse(mockTests);
  if (pathname.endsWith('/mock-tests/results/my')) return apiResponse([
    { id: 1, mockTestId: 'aptis-full-01', title: 'Aptis Full Test 01', skill: 'FULL', score: 38, maxScore: 50, cefrLevel: 'B2', resultJson: '{}', createdAt: '2026-10-01T09:00:00' }
  ]);
  if (pathname.endsWith('/lessons')) return apiResponse(lessons);
  if (pathname.endsWith('/notifications')) return apiResponse([]);
  if (pathname.endsWith('/progress')) return apiResponse([
    { skillId: 1, skillName: 'Listening', completedTests: 8, bestScore: 42 },
    { skillId: 2, skillName: 'Reading', completedTests: 12, bestScore: 46 }
  ]);
  if (pathname.endsWith('/leaderboard')) return apiResponse([]);
  if (pathname.endsWith('/statistics')) return apiResponse({ users: 128, tests: 36, submissions: 420, averageScore: 78 });
  if (pathname.endsWith('/predictions')) return apiResponse([]);
  if (pathname.endsWith('/media')) return apiResponse([]);
  if (pathname.endsWith('/users')) return apiResponse([student, admin]);
  if (pathname.endsWith('/questions')) return apiResponse(questionsFor(url.searchParams.get('testId')));
  return apiResponse([]);
}

async function main() {
  const preview = spawn(process.execPath, [
    path.resolve(root, 'node_modules/vite/bin/vite.js'),
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(previewPort),
    '--strictPort'
  ], { cwd: root, stdio: 'ignore', windowsHide: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'aptis-stitch-'))}`,
    'about:blank'
  ], { stdio: 'ignore', windowsHide: true });

  let ws;
  try {
    for (let i = 0; i < 80; i++) {
      try {
        if ((await fetch(`http://127.0.0.1:${previewPort}`)).ok) break;
      } catch {}
      await delay(150);
    }

    let targets;
    for (let i = 0; i < 80; i++) {
      try {
        targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
        break;
      } catch {
        await delay(150);
      }
    }
    if (!targets) throw new Error('Chrome did not start');

    ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
    const waiting = new Map();
    let nextId = 1;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = nextId++;
      waiting.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const request = waiting.get(message.id);
        waiting.delete(message.id);
        if (message.error) request?.reject(new Error(JSON.stringify(message.error)));
        else request?.resolve(message.result);
      }
      if (message.method === 'Fetch.requestPaused') {
        const { requestId, request } = message.params;
        const url = new URL(request.url);
        if (!url.pathname.startsWith('/api/')) {
          send('Fetch.continueRequest', { requestId }).catch(() => {});
          return;
        }
        const body = Buffer.from(JSON.stringify(fixtureFor(url))).toString('base64');
        send('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: [
            { name: 'Content-Type', value: 'application/json; charset=utf-8' },
            { name: 'Access-Control-Allow-Origin', value: `http://127.0.0.1:${previewPort}` },
            { name: 'Access-Control-Allow-Credentials', value: 'true' },
            { name: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type' },
            { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' }
          ],
          body
        }).catch(() => {});
      }
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }] });

    const manifest = [];
    for (const route of routes) {
      activeAuth = route.auth ?? 'student';
      await send('Emulation.setDeviceMetricsOverride', {
        width: route.width,
        height: route.height,
        deviceScaleFactor: 1,
        mobile: route.width < 600
      });
      await send('Page.navigate', { url: `http://127.0.0.1:${previewPort}/login` });
      await delay(300);
      await send('Runtime.evaluate', { expression: authScript(route.auth), awaitPromise: true });
      await send('Page.navigate', { url: `http://127.0.0.1:${previewPort}${route.path}` });
      for (let i = 0; i < 80; i++) {
        const ready = await send('Runtime.evaluate', {
          expression: `document.readyState === 'complete' && document.body && document.body.innerText.length > 100`,
          returnByValue: true
        });
        if (ready.result.value) break;
        await delay(150);
      }
      await delay(900);
      const screenshot = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        fromSurface: true
      });
      const filePath = path.join(output, route.file);
      fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
      manifest.push({ title: route.title, file: route.file, route: route.path, viewport: `${route.width}x${route.height}` });
      console.log(`Captured ${route.file}`);
    }

    fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
    fs.writeFileSync(path.join(output, 'stitch-ai-prompt.txt'), `Use these screenshots as visual references for the Aptis Lingo web app.

Recreate the same product UI system: white and warm off-white surfaces, deep navy text, red primary actions, yellow/gold accents, compact rounded cards, top navigation, student dashboard, practice-by-part flow, mock test cards, AI practice page, lessons page, and admin content management.

Keep the layout dense but friendly. Preserve the navigation hierarchy, card spacing, button styling, typography scale, and responsive mobile bottom navigation shown in the mobile screenshots.

Screens included:
${manifest.map((item) => `- ${item.file}: ${item.title}, ${item.viewport}, ${item.route}`).join('\n')}
`);

    await send('Browser.close');
    ws.close();
    preview.kill();
    chrome.kill();
  } catch (error) {
    console.error(error);
    ws?.close();
    preview.kill();
    chrome.kill();
    process.exitCode = 1;
  }
}

main();
