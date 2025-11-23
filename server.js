const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const os = require('os');

const questionsPath = path.join(__dirname, 'data', 'questions.json');
const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
const indexPath = path.join(__dirname, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

function readAnswers(answersPath) {
  try {
    const content = fs.readFileSync(answersPath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveAnswers(answersPath, answers) {
  const dir = path.dirname(answersPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(answersPath, JSON.stringify(answers, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function ensureWritableDirectory(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probePath = path.join(dir, `.write-test-${randomUUID()}`);
    fs.writeFileSync(probePath, '');
    fs.rmSync(probePath);
    return true;
  } catch (error) {
    return false;
  }
}

function resolveAnswersPath(options = {}) {
  const fallback = path.join(os.tmpdir(), 'qanda-answers.json');

  const candidatePaths = [options.answersPath, process.env.ANSWERS_PATH];

  if (options.useDefaultPath !== false) {
    candidatePaths.push(path.join(__dirname, 'data', 'answers.json'));
  }

  const filteredCandidates = candidatePaths.filter(Boolean);

  for (const candidate of filteredCandidates) {
    const dir = path.dirname(candidate);
    if (ensureWritableDirectory(dir)) {
      return candidate;
    }
  }

  const fallbackDir = path.dirname(fallback);
  ensureWritableDirectory(fallbackDir);
  return fallback;
}

function handleRequest({ req, res, answersPath }) {
  const { method, url } = req;
  const { pathname } = new URL(url, `http://${req.headers.host}`);

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if ((pathname === '/api/questions' || pathname === '/api/questions/') && method === 'GET') {
    return sendJson(res, 200, { questions });
  }

  if ((pathname === '/api/answers' || pathname === '/api/answers/') && method === 'GET') {
    const answers = readAnswers(answersPath);
      return sendJson(res, 200, { answers });
  }

  if ((pathname === '/' || pathname === '/index.html') && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8'
    });
    return res.end(indexHtml);
  }

  if ((pathname === '/api/answers' || pathname === '/api/answers/') && method === 'POST') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      let parsed;
      try {
        parsed = body ? JSON.parse(body) : {};
      } catch (error) {
        return sendJson(res, 400, { error: 'Invalid JSON body' });
      }

      const answersPayload = parsed?.answers;

      if (
        !parsed ||
        answersPayload === null ||
        typeof answersPayload !== 'object' ||
        Array.isArray(answersPayload)
      ) {
        return sendJson(res, 400, { error: 'Request body must include an "answers" object' });
      }

      try {
        const normalizedResponses = questions.map((question) => ({
          questionId: question.id,
          response: answersPayload[question.id] ?? null
        }));

        const storedAnswers = readAnswers(answersPath);
        const entry = {
          id: randomUUID(),
          submittedAt: new Date().toISOString(),
          responses: normalizedResponses
        };

        storedAnswers.push(entry);
        saveAnswers(answersPath, storedAnswers);

        return sendJson(res, 201, { message: 'Answers saved', entry });
      } catch (error) {
        return sendJson(res, 500, { error: 'Failed to save answers' });
      }
    });

    return;
  }

  return sendJson(res, 404, { error: 'Not found' });
}

function buildServer(options = {}) {
  const answersPath = resolveAnswersPath(options);

  return http.createServer((req, res) => handleRequest({ req, res, answersPath }));
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  const server = buildServer();
  server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

module.exports = { buildServer, handleRequest, resolveAnswersPath };
