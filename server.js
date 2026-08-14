'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { checkCode, runCode } = require('./judge/runner');
const { judgeACM, judgeCore, summarize } = require('./judge/judge');

const PORT = Number(process.env.PORT || 5173);
const ROOT = path.join(__dirname, 'public');
const MAX_BODY = 512 * 1024;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/** 读取数据文件（problems / tests / solutions），带内存缓存。 */
const dataCache = new Map();
function loadData(name) {
  if (dataCache.has(name)) return dataCache.get(name);
  const file = path.join(ROOT, 'data', `${name}.json`);
  let parsed = {};
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    parsed = {};
  }
  dataCache.set(name, parsed);
  return parsed;
}
function invalidateData() {
  dataCache.clear();
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        reject(new Error('请求体过大'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (e) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT, safePath === '/' ? 'index.html' : safePath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': mime[path.extname(filePath)] || 'application/octet-stream',
      'cache-control': pathname.startsWith('/vendor/') ? 'public, max-age=86400' : 'no-cache',
    });
    res.end(data);
  });
}

async function handleApi(req, res, body) {
  const { url } = req;
  if (url === '/api/check') {
    const payload = JSON.parse(body || '{}');
    if (typeof payload.code !== 'string') return sendJson(res, 400, { ok: false, error: '参数错误' });
    const result = await checkCode({ language: payload.language, code: payload.code, mode: payload.mode || 'acm' });
    return sendJson(res, 200, result);
  }

  if (url === '/api/run') {
    const payload = JSON.parse(body || '{}');
    if (typeof payload.code !== 'string' || typeof payload.input !== 'string') {
      return sendJson(res, 400, { ok: false, error: '参数错误' });
    }
    const result = await runCode({ language: payload.language, code: payload.code, input: payload.input });
    return sendJson(res, 200, result);
  }

  if (url === '/api/judge') {
    const payload = JSON.parse(body || '{}');
    const { problemId, mode, language, code } = payload;
    if (typeof code !== 'string' || !problemId || !mode) return sendJson(res, 400, { ok: false, error: '参数错误' });

    const problems = loadData('problems');
    const tests = loadData('tests');
    const problem = (Array.isArray(problems) ? problems : []).find((p) => p && p.id === Number(problemId));
    if (!problem) return sendJson(res, 404, { ok: false, error: '题目不存在' });

    if (mode === 'core') {
      const core = problem.core;
      if (!core || !core.kind) return sendJson(res, 400, { ok: false, error: '该题目暂无核心代码模式数据' });
      if (language !== 'python3' && language !== 'cpp') {
        return sendJson(res, 400, { ok: false, error: '核心代码模式仅支持 Python3 与 C++' });
      }
      const caseList = (tests[problemId] && tests[problemId].core) || [];
      if (!caseList.length) return sendJson(res, 400, { ok: false, error: '该题目暂无核心代码测试用例' });
      const outcome = await judgeCore({ language, code, core, tests: caseList });
      if (outcome.error) {
        return sendJson(res, 200, { ok: false, phase: outcome.phase || 'run', error: outcome.error, compileError: outcome.compileError });
      }
      const summary = summarize(outcome.results, mode);
      return sendJson(res, 200, { ok: true, ...summary, results: outcome.results });
    }

    // acm
    const caseList = (tests[problemId] && tests[problemId].acm) || [];
    if (!caseList.length) return sendJson(res, 400, { ok: false, error: '该题目暂无 ACM 测试用例' });
    const outcome = await judgeACM({ language, code, tests: caseList });
    if (outcome.error) {
      return sendJson(res, 200, { ok: false, phase: outcome.phase || 'run', error: outcome.error });
    }
    const summary = summarize(outcome.results, mode);
    return sendJson(res, 200, { ok: true, ...summary, results: outcome.results });
  }

  if (url === '/api/reload') {
    invalidateData();
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { ok: false, error: '接口不存在' });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST') {
    try {
      const raw = await readBody(req);
      await handleApi(req, res, raw);
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error.message });
    }
    return;
  }
  if (req.method === 'GET' && req.url === '/api/reload') {
    invalidateData();
    sendJson(res, 200, { ok: true });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Hot100 ACM site running at http://localhost:${PORT}`);
});
