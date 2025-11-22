const { test, beforeEach, afterEach } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildServer } = require('./server');

function createTempAnswersPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'answers-'));
  return path.join(dir, 'answers.json');
}

async function startServer(answersPath) {
  const server = buildServer({ answersPath });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;
  return { server, baseUrl };
}

let answersPath;
let server;
let baseUrl;

beforeEach(async () => {
  answersPath = createTempAnswersPath();
  ({ server, baseUrl } = await startServer(answersPath));
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  try {
    fs.rmSync(path.dirname(answersPath), { recursive: true, force: true });
  } catch (error) {
    // best effort cleanup
  }
});

test('GET /api/questions returns all questions', async () => {
  const response = await fetch(`${baseUrl}/api/questions`);
  assert.strictEqual(response.status, 200);
  const payload = await response.json();
  assert.ok(Array.isArray(payload.questions));
  assert.ok(payload.questions.length > 0);
  const questionIds = payload.questions.map((q) => q.id);
  assert.ok(questionIds.includes('role'));
  assert.ok(questionIds.includes('anything_else'));
});

test('POST /api/answers validates payload shape', async () => {
  const response = await fetch(`${baseUrl}/api/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invalid: true })
  });

  assert.strictEqual(response.status, 400);
  const payload = await response.json();
  assert.ok(payload.error.includes('answers'));
});

test('POST /api/answers stores answers and GET retrieves them', async () => {
  const answers = {
    role: 'vet',
    seniority: '2-3',
    goals: ['respect', 'workload'],
    goals_free: 'שיפור תנאים',
    management_importance: '4',
    management_issues: 'צורך בשקיפות',
    workload_pain: 'עומס לילה',
    workload_ideas: 'תכנון משמרות',
    salary_feel: 'שכר נמוך',
    salary_expectations: 'עדכון טבלאות',
    job_security: 'חוסר ודאות',
    wellbeing: 'חדר מנוחה',
    development: 'קורסים',
    anything_else: 'תודה'
  };

  const postResponse = await fetch(`${baseUrl}/api/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers })
  });

  assert.strictEqual(postResponse.status, 201);
  const postPayload = await postResponse.json();
  assert.ok(postPayload.entry.id);
  assert.strictEqual(postPayload.entry.responses.length, 14);

  const getResponse = await fetch(`${baseUrl}/api/answers`);
  const getPayload = await getResponse.json();
  assert.strictEqual(getPayload.answers.length, 1);
  assert.strictEqual(getPayload.answers[0].responses.length, 14);
});
