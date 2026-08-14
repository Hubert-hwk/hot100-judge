'use strict';

/* ================================================================
 * Hot100 刷题台 · 前端逻辑
 * 数据：/data/problems.json /data/tests.json /data/solutions.json
 * ================================================================ */

const LANG = {
  c: { label: 'C', cmMode: 'text/x-csrc', core: false,
    template: `#include <stdio.h>

int main(void) {
    // 按 ACM 模式从 stdin 读取，向 stdout 输出。
    return 0;
}
` },
  cpp: { label: 'C++', cmMode: 'text/x-c++src', core: true,
    template: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // 按 ACM 模式从 stdin 读取，向 stdout 输出。
    return 0;
}
` },
  python3: { label: 'Python3', cmMode: 'text/x-python', core: true,
    template: `import sys

def main():
    data = sys.stdin.read().strip().split()
    # 按 ACM 模式解析 data，最后 print 答案。

if __name__ == "__main__":
    main()
` },
};

const CORE_UNSUPPORTED_STUB = {
  cpp: `// 该题核心代码模板待补充。
// 请按 LeetCode 风格实现 class Solution。
class Solution {
public:
    // TODO
};
`,
  python3: `# 该题核心代码模板待补充。
# 请按 LeetCode 风格实现核心函数。
def solve():
    pass
`,
};

const state = {
  problems: [],
  tests: {},
  solutions: {},
  selectedId: null,
  language: 'python3',
  mode: 'acm',
  exampleIndex: 0,
  view: 'problem',
  solutionLang: 'python3',
  checkTimer: null,
  checkSeq: 0,
  progress: {},
  starred: {},
  judging: false,
};

let editor = null;
const $ = (id) => document.getElementById(id);

/* ---------------- 数据加载 ---------------- */

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const resp = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!resp.ok) throw new Error(`${url} 返回状态 ${resp.status}`);
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadData() {
  const [problems, tests, solutions] = await Promise.all([
    fetchJson('/data/problems.json'),
    fetchJson('/data/tests.json'),
    fetchJson('/data/solutions.json'),
  ]);
  state.problems = problems || [];
  state.tests = tests || {};
  state.solutions = solutions || {};
}

/* ---------------- 工具 ---------------- */

const currentProblem = () => state.problems.find((p) => p.id === state.selectedId) || null;

function difficultyClass(d) {
  if (d === '困难') return 'hard';
  if (d === '中等') return 'medium';
  return 'easy';
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function storageKey(id, lang, mode) {
  return `hot100-acm:v2:${id}:${lang}:${mode}`;
}
const PROGRESS_KEY = 'hot100-acm:v2:progress';
const STAR_KEY = 'hot100-acm:v2:starred';
const THEME_KEY = 'hot100-acm:v2:theme';

function loadCode() {
  return localStorage.getItem(storageKey(state.selectedId, state.language, state.mode)) || currentTemplate();
}
function saveCode() {
  if (!editor) return;
  localStorage.setItem(storageKey(state.selectedId, state.language, state.mode), editor.getValue());
}
function currentTemplate() {
  const problem = currentProblem();
  if (state.mode === 'core') {
    const tpl = problem && problem.core && problem.core.templates && problem.core.templates[state.language];
    return tpl || CORE_UNSUPPORTED_STUB[state.language] || '';
  }
  const tpl = problem && problem.acm && problem.acm.template && problem.acm.template[state.language];
  return tpl || LANG[state.language].template;
}

/* ---------------- 侧边栏 ---------------- */

function setupFilters() {
  const difficulties = ['全部', ...new Set(state.problems.map((p) => p.difficulty))];
  const topics = ['全部', ...new Set(state.problems.map((p) => (p.topic || '').split('/')[0]))]
    .sort((a, b) => (a === '全部' ? -1 : b === '全部' ? 1 : a.localeCompare(b, 'zh-CN')));
  $('difficultyFilter').innerHTML = difficulties.map((d) => `<option value="${d}">${d}</option>`).join('');
  $('topicFilter').innerHTML = topics.map((t) => `<option value="${t}">${t}</option>`).join('');
  const companies = [...new Set(
    state.problems.flatMap((p) => (p.freq && p.freq.companies ? p.freq.companies : []).map((c) => c.name)),
  )].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  $('companyFilter').innerHTML = ['<option value="全部">全部</option>',
    ...companies.map((c) => {
      const cnt = state.problems.filter((p) => (p.freq && p.freq.companies || []).some((x) => x.name === c)).length;
      return `<option value="${c}">${c}（${cnt} 题）</option>`;
    }),
  ].join('');
}

function filteredProblems() {
  const keyword = $('searchInput').value.trim().toLowerCase();
  const difficulty = $('difficultyFilter').value;
  const topic = $('topicFilter').value;
  const sort = $('sortFilter').value;
  const onlyStar = $('starFilter').checked;
  const company = $('companyFilter').value;
  const list = state.problems.filter((p) => {
    const text = `${p.id} ${p.title} ${p.topic}`.toLowerCase();
    return (!keyword || text.includes(keyword))
      && (difficulty === '全部' || p.difficulty === difficulty)
      && (topic === '全部' || (p.topic || '').includes(topic))
      && (company === '全部' || ((p.freq && p.freq.companies) || []).some((c) => c.name === company))
      && (!onlyStar || state.starred[p.id]);
  });
  if (sort === 'hot') {
    list.sort((a, b) => (a.freq ? a.freq.rank : 1e9) - (b.freq ? b.freq.rank : 1e9));
  } else if (sort === 'difficulty') {
    const order = { 简单: 0, 中等: 1, 困难: 2 };
    list.sort((a, b) => (order[a.difficulty] ?? 9) - (order[b.difficulty] ?? 9) || a.id - b.id);
  } else {
    list.sort((a, b) => a.id - b.id);
  }
  return list;
}

function renderList() {
  const list = filteredProblems();
  $('problemList').innerHTML = list.map((p) => {
    const st = state.progress[p.id];
    const stClass = st === 'solved' ? ' solved' : st === 'failed' ? ' failed' : '';
    const hot = p.freq ? `<span class="p-hot" title="CodeTop 高频榜第 ${p.freq.rank} 名">#${p.freq.rank}</span>` : '';
    const star = state.starred[p.id] ? '<span class="p-star">★</span>' : '';
    return `
      <button class="problem-item ${p.id === state.selectedId ? 'active' : ''}" data-id="${p.id}" type="button">
        <div class="p-row">
          <span class="p-id">${p.id}</span>
          <span class="p-title">${esc(p.title)}</span>
          ${hot}
          ${star}
          <span class="p-status${stClass}"></span>
        </div>
        <div class="p-meta">
          <span class="p-diff ${difficultyClass(p.difficulty)}">${esc(p.difficulty)}</span>
          <span class="p-topic">${esc(p.topic || '')}</span>
        </div>
      </button>`;
  }).join('') || '<div class="empty">没有匹配的题目</div>';
}

function renderProgress() {
  const solved = Object.values(state.progress).filter((v) => v === 'solved').length;
  const total = state.problems.length || 100;
  $('progressText').textContent = `${solved} / ${total}`;
  $('progressBar').style.width = `${total ? Math.round((solved / total) * 100) : 0}%`;
}

/* ---------------- 题目渲染 ---------------- */

function renderProblem() {
  const problem = currentProblem();
  if (!problem) return;
  if (state.mode === 'core' && !LANG[state.language].core) state.mode = 'acm';

  state.exampleIndex = Math.min(state.exampleIndex, Math.max(0, ((problem.acm && problem.acm.examples) || []).length - 1));

  $('problemTitle').textContent = `${problem.id}. ${problem.title}`;
  $('problemDifficulty').textContent = problem.difficulty;
  $('problemDifficulty').className = `pill ${difficultyClass(problem.difficulty)}`;
  $('problemTopic').textContent = problem.topic || '';
  $('leetcodeLink').href = problem.url || '#';
  $('problemDesc').textContent = problem.desc || '（题目描述整理中…）';

  // CodeTop 高频信息
  const freq = problem.freq;
  const freqPill = $('problemFreq');
  if (freq) {
    freqPill.hidden = false;
    freqPill.textContent = `🔥 高频 #${freq.rank} · ${freq.value} 次`;
  } else {
    freqPill.hidden = true;
  }
  const compsEl = $('problemCompanies');
  if (freq && freq.companies && freq.companies.length) {
    compsEl.hidden = false;
    compsEl.innerHTML = freq.companies.slice(0, 6).map((c) =>
      `<span class="company-tag" title="${esc(c.name)} · 出现 ${c.value} 次 · 最近 ${c.lastAsked || '未知'}">${esc(c.name)}</span>`).join('');
  } else {
    compsEl.hidden = true;
  }

  // 最近被考日期 + 数据来源说明
  const freqNote = $('freqNote');
  if (freq) {
    freqNote.hidden = false;
    freqNote.textContent = `最近被考：${freq.lastAsked || '未知'} ｜ 数据来源：CodeTop（codetop.cc）`;
  } else {
    freqNote.hidden = true;
  }

  // 收藏状态
  const starBtn = $('starBtn');
  starBtn.classList.toggle('active', !!state.starred[problem.id]);
  starBtn.textContent = state.starred[problem.id] ? '★' : '☆';

  // 状态 pill
  const st = state.progress[problem.id];
  const statusPill = $('problemStatus');
  if (st) {
    statusPill.hidden = false;
    statusPill.textContent = st === 'solved' ? '✓ 已通过' : '未通过';
    statusPill.className = `pill status-pill ${st}`;
  } else {
    statusPill.hidden = true;
  }

  renderAcmPanel();
  renderCorePanel();
  renderModeSwitch();
  renderLanguageTabs();
  renderList();
  renderProgress();

  // 切换题目/语言/模式时重载编辑器内容
  if (editor) {
    const mode = LANG[state.language].cmMode;
    if (editor.getOption('mode') !== mode) editor.setOption('mode', mode);
    editor.setValue(loadCode());
  }
}

function renderModeSwitch() {
  document.querySelectorAll('.mode-switch .seg-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
    btn.disabled = btn.dataset.mode === 'core' && !LANG[state.language].core;
  });
  $('acmPanel').hidden = state.mode !== 'acm';
  $('corePanel').hidden = state.mode !== 'core';
  $('runSampleBtn').style.display = state.mode === 'acm' ? '' : 'none';
}

function renderAcmPanel() {
  const problem = currentProblem();
  const acm = (problem && problem.acm) || {};
  $('inputSpec').textContent = acm.input || '（该题 ACM 输入规格整理中）';
  $('outputSpec').textContent = acm.output || '（该题 ACM 输出规格整理中）';
  const examples = acm.examples || [];
  const ex = examples[state.exampleIndex] || { input: '', output: '' };
  $('exampleTabs').innerHTML = examples.length
    ? examples.map((_, i) => `<button class="${i === state.exampleIndex ? 'active' : ''}" data-example="${i}" type="button">样例 ${i + 1}</button>`).join('')
    : '<button type="button" disabled>暂无样例</button>';
  $('sampleInput').value = ex.input || '';
  $('expectedOutput').value = ex.output || '';
}

function renderCorePanel() {
  const problem = currentProblem();
  const core = (problem && problem.core) || null;
  const table = $('coreSigTable');
  const note = $('coreNote');
  $('coreTestCount').textContent = '';

  if (!core || !core.kind) {
    table.innerHTML = '<tr><td colspan="3" style="color:var(--muted)">该题核心代码模式数据整理中，敬请期待。</td></tr>';
    note.textContent = '';
    $('coreTestList').innerHTML = '';
    $('coreTestCount').textContent = '';
    return;
  }

  if (core.kind === 'ops') {
    const ctor = (core.ops && core.ops.constructor || []).map((p) => `${p.name}: ${p.type}`).join(', ');
    const methods = (core.ops && core.ops.methods || [])
      .map((m) => `${m.name}(${m.args.join(', ')}) → ${m.ret}`)
      .join('<br>');
    table.innerHTML = `
      <tr><th>类名</th><td colspan="2"><code>${esc(core.className)}</code></td></tr>
      <tr><th>构造</th><td colspan="2"><code>${esc(ctor)}</code></td></tr>
      <tr><th>方法</th><td colspan="2">${methods}</td></tr>`;
    note.textContent = `核心代码模式：实现 ${core.className} 类，评测器会按测试用例中的操作序列依次调用。`;
  } else {
    const rows = (core.params || []).map((p) => `
      <tr><td><code>${esc(p.name)}</code></td><td><code>${esc(p.type)}</code></td><td>${esc(p.desc || '')}</td></tr>`).join('');
    table.innerHTML = `
      <tr><th>参数</th><th>类型</th><th>说明</th></tr>${rows}
      <tr><td><code>return</code></td><td><code>${esc(core.returns || '')}</code></td><td>${esc(core.returnsDesc || '')}</td></tr>`;
    note.textContent = core.mutates >= 0
      ? `提示：本函数为原地修改，参数 ${core.params[core.mutates] ? core.params[core.mutates].name : core.mutates} 会被修改，评测器对比修改后的结果。`
      : `实现 ${core.className}.${core.method}(...) 即可，评测器自动构造参数并对比返回值。链表/树节点结构体已由评测环境提供，请勿重复定义。`;
  }

  const cases = (state.tests[problem.id] && state.tests[problem.id].core) || [];
  $('coreTestCount').textContent = `${cases.length} 组`;
  $('coreTestList').innerHTML = cases.length
    ? cases.map((c) => {
        const text = c.ops
          ? `ops: ${JSON.stringify(c.ops)}\nargs: ${JSON.stringify(c.args)}\nexpected: ${JSON.stringify(c.expected)}`
          : `${JSON.stringify(c.args)} => ${JSON.stringify(c.expected)}`;
        return `<div class="core-test-item">${esc(text)}</div>`;
      }).join('')
    : '<div class="core-test-item">暂无测试用例</div>';
}

/* ---------------- 题解 ---------------- */

function renderSolution() {
  const problem = currentProblem();
  if (!problem) return;
  const sol = state.solutions[problem.id];
  const langs = ['python3', 'cpp'];
  const has = langs.filter((l) => sol && sol[l]);
  if (!has.length) {
    $('solutionLangTabs').innerHTML = '';
    $('solutionBody').innerHTML = '<div class="sol-empty">该题题解整理中，敬请期待。</div>';
    return;
  }
  if (!has.includes(state.solutionLang)) state.solutionLang = has[0];
  $('solutionLangTabs').innerHTML = has.map((l) =>
    `<button class="${l === state.solutionLang ? 'active' : ''}" data-sol-lang="${l}" type="button">${LANG[l].label}</button>`).join('');

  const entry = sol[state.solutionLang];
  const blocks = [];
  if (problem.explain) {
    blocks.push(`
      <div class="sol-explain">
        <div class="sol-explain-head">💡 解题思路</div>
        <div class="sol-explain-body">${esc(problem.explain)}</div>
      </div>`);
  }
  if (entry && entry.core) {
    blocks.push(solBlock('核心代码（函数签名模式）', entry.core));
  }
  if (entry && entry.acm) {
    blocks.push(solBlock('ACM 完整程序（stdin → stdout）', entry.acm));
  }
  if (!blocks.length) {
    $('solutionBody').innerHTML = '<div class="sol-empty">该题题解整理中，敬请期待。</div>';
    return;
  }
  $('solutionBody').innerHTML = `<div class="solution-body">${blocks.join('')}</div>`;
  $('solutionBody').querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = JSON.parse(btn.dataset.code);
      copyText(text).then(() => {
        const old = btn.textContent;
        btn.textContent = '已复制 ✓';
        setTimeout(() => { btn.textContent = old; }, 1200);
      });
    });
  });
}

function solBlock(title, code) {
  return `
    <div class="sol-block">
      <div class="sol-head">
        <span>${esc(title)}</span>
        <span class="actions"><button class="copy-btn" data-code="${esc(JSON.stringify(code))}" type="button">复制</button></span>
      </div>
      <pre>${esc(code)}</pre>
    </div>`;
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) { /* noop */ }
  document.body.removeChild(ta);
}

/* ---------------- 诊断 / 状态 ---------------- */

function setStatus(text, kind = '') {
  const el = $('statusText');
  el.textContent = text;
  el.className = kind;
}

function setDiagnostic(status, message = '', kind = 'clean') {
  $('diagnosticStatus').textContent = status;
  $('diagnosticBox').textContent = message;
  $('diagnosticPanel').className = `diagnostic-panel ${kind}`;
}

function describeFailure(result) {
  if (result.error) return result.error;
  if (result.timedOut) return `运行超时，用时 ${result.ms}ms。`;
  if (result.stderr) return result.stderr;
  return '程序以非 0 状态退出，但没有输出错误信息。';
}

/* ---------------- 语法检查 ---------------- */

async function checkCode({ silent = false } = {}) {
  if (!editor) return;
  saveCode();
  const seq = ++state.checkSeq;
  if (!silent) setDiagnostic('检查中…', '', 'clean');
  try {
    const resp = await fetch('/api/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ language: state.language, code: editor.getValue(), mode: state.mode }),
    });
    const result = await resp.json();
    if (seq !== state.checkSeq) return result;
    if (result.ok) setDiagnostic('语法通过', state.mode === 'core'
      ? '核心代码语法检查通过（函数/类签名合法）。'
      : '未发现语法或编译错误。', 'ok');
    else setDiagnostic(result.phase === 'compile' ? '编译错误' : '语法错误', describeFailure(result), 'bad');
    return result;
  } catch (error) {
    if (seq === state.checkSeq) setDiagnostic('检查失败', error.message, 'bad');
    return { ok: false, error: error.message };
  }
}

function scheduleCheck() {
  clearTimeout(state.checkTimer);
  setDiagnostic('等待检查', '停止输入后会自动检查当前代码。', 'clean');
  state.checkTimer = setTimeout(() => checkCode({ silent: true }), 700);
}

/* ---------------- 运行样例（ACM） ---------------- */

async function runSample() {
  if (!editor || state.judging) return;
  saveCode();
  clearTimeout(state.checkTimer);
  setStatus('运行中…');
  setDiagnostic('运行中…', '', 'clean');
  $('stdoutBox').textContent = '';
  $('stderrBox').textContent = '';
  $('judgeResult').hidden = true;
  $('runResult').hidden = false;
  setBusy(true);
  try {
    const resp = await fetch('/api/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ language: state.language, code: editor.getValue(), input: $('sampleInput').value }),
    });
    const result = await resp.json();
    $('stdoutBox').textContent = result.stdout || '';
    $('stderrBox').textContent = result.stderr || result.error || '';
    if (result.timedOut) {
      setStatus(`超时 ${result.ms}ms`, 'bad');
      setDiagnostic('运行超时', describeFailure(result), 'bad');
    } else if (!result.ok) {
      const label = result.phase === 'syntax' ? '语法错误' : result.phase === 'compile' ? '编译失败' : '运行失败';
      setStatus(label, 'bad');
      setDiagnostic(label, describeFailure(result), 'bad');
    } else if ($('expectedOutput').value && normalizeOutput(result.stdout) !== normalizeOutput($('expectedOutput').value)) {
      setStatus(`输出不匹配 ${result.ms}ms`, 'bad');
      setDiagnostic('答案不一致', `期望输出:\n${$('expectedOutput').value}\n实际输出:\n${result.stdout}`, 'bad');
    } else {
      setStatus(`通过运行 ${result.ms}ms`, 'ok');
      setDiagnostic('运行通过', '程序输出与当前样例一致。', 'ok');
    }
  } catch (error) {
    $('stderrBox').textContent = error.message;
    setStatus('请求失败', 'bad');
  } finally {
    setBusy(false);
  }
}

function normalizeOutput(value) {
  return (value || '').replace(/\r\n/g, '\n').trimEnd();
}

/* ---------------- 全部评测 ---------------- */

async function judge() {
  if (!editor || state.judging) return;
  const problem = currentProblem();
  if (!problem) return;
  saveCode();
  clearTimeout(state.checkTimer);

  setStatus('评测中…');
  setDiagnostic('评测中…', '', 'clean');
  $('judgeResult').hidden = true;
  $('runResult').hidden = true;
  setBusy(true);
  try {
    const resp = await fetch('/api/judge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ problemId: problem.id, mode: state.mode, language: state.language, code: editor.getValue() }),
    });
    const result = await resp.json();
    if (!result.ok) {
      const label = result.phase === 'syntax' ? '语法错误' : result.phase === 'compile' ? '编译失败' : '评测失败';
      setStatus(label, 'bad');
      setDiagnostic(label, (result.compileError || result.error || '未知错误'), 'bad');
      $('judgeResult').hidden = false;
      $('judgeSummary').innerHTML = '<span class="score fail">评测失败</span>';
      $('judgeCases').innerHTML = `<div class="judge-case error"><div class="judge-case-body">${esc(result.compileError || result.error || '未知错误')}</div></div>`;
      markProgress(problem.id, 'failed');
      return;
    }
    renderJudgeResult(result);
    markProgress(problem.id, result.allPassed ? 'solved' : 'failed');
  } catch (error) {
    setStatus('请求失败', 'bad');
    setDiagnostic('评测失败', error.message, 'bad');
  } finally {
    setBusy(false);
  }
}

function renderJudgeResult(result) {
  $('judgeResult').hidden = false;
  const summary = $('judgeSummary');
  const hasMs = result.results && result.results.some((r) => r.ms > 0);
  const ms = hasMs && result.results.length
    ? `平均 ${Math.round(result.results.reduce((a, r) => a + (r.ms || 0), 0) / result.results.length)}ms`
    : '';
  summary.innerHTML = `
    <span class="score ${result.allPassed ? 'pass' : 'fail'}">${result.passed} / ${result.total} 通过</span>
    ${result.allPassed ? '<span class="chip pass">全部通过 ✓</span>' : '<span class="chip fail">存在失败用例</span>'}
    <span class="ms">${ms}</span>`;

  const mode = state.mode;
  const problem = currentProblem();
  const casesEl = $('judgeCases');
  casesEl.innerHTML = result.results.map((r, i) => {
    const head = `
      <div class="judge-case-head">
        <span class="chip ${r.ok ? 'pass' : 'fail'}">${r.ok ? '通过' : '失败'}</span>
        <span>用例 ${i + 1}</span>
        <span class="ms">${r.ms ? r.ms + 'ms' : ''}</span>
      </div>`;
    if (r.error && !('expected' in r)) {
      return `<div class="judge-case error">${head}<div class="judge-case-body">${esc(r.error)}</div></div>`;
    }
    let body = '';
    if (mode === 'acm') {
      body = `
        <div class="diff-row"><span class="dl">输入</span><pre>${esc(truncate(r.input, 400))}</pre></div>
        ${r.ok ? '' : `
        <div class="diff-row"><span class="dl">期望输出</span><pre class="good">${esc(r.expected)}</pre></div>
        <div class="diff-row"><span class="dl">实际输出</span><pre class="bad">${esc(r.got != null ? r.got : '（无输出）')}</pre></div>`}`;
    } else {
      const argsText = Array.isArray(r.args) ? r.args.map((a) => shortVal(a)).join(', ') : JSON.stringify(r.args);
      body = `
        <div class="diff-row"><span class="dl">参数</span><pre>${esc(truncate(argsText, 300))}</pre></div>
        ${r.ok ? '' : `
        <div class="diff-row"><span class="dl">期望</span><pre class="good">${esc(shortVal(r.expected))}</pre></div>
        <div class="diff-row"><span class="dl">实际</span><pre class="bad">${esc(shortVal(r.got))}</pre></div>
        ${r.error ? `<div class="diff-row"><span class="dl">错误</span><pre>${esc(r.error)}</pre></div>` : ''}`}`;
    }
    return `<div class="judge-case">${head}<div class="judge-case-body">${body}</div></div>`;
  }).join('');

  setStatus(`${result.allPassed ? '全部通过' : '未全部通过'}（${result.passed}/${result.total}）`, result.allPassed ? 'ok' : 'bad');
  setDiagnostic(result.allPassed ? '评测通过' : '存在失败用例', result.allPassed
    ? `恭喜，${result.total} 个用例全部通过。`
    : '请根据下方期望/实际对比定位问题。', result.allPassed ? 'ok' : 'bad');
}

function shortVal(v) {
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}
function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function markProgress(id, status) {
  if (status === 'failed' && state.progress[id] === 'solved') return; // 已通过的不降级
  state.progress[id] = status;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(state.progress));
  renderList();
  renderProgress();
  const pill = $('problemStatus');
  if (status) {
    pill.hidden = false;
    pill.textContent = status === 'solved' ? '✓ 已通过' : '未通过';
    pill.className = `pill status-pill ${status}`;
  }
}

function setBusy(busy) {
  state.judging = busy;
  $('judgeBtn').disabled = busy;
  $('checkBtn').disabled = busy;
  $('runSampleBtn').disabled = busy;
}

/* ---------------- 编辑器 ---------------- */

function initEditor() {
  editor = CodeMirror.fromTextArea($('codeEditor'), {
    mode: LANG[state.language].cmMode,
    theme: 'oj',
    lineNumbers: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    lineWrapping: false,
    extraKeys: {
      Tab: (cm) => cm.replaceSelection('  '),
      'Ctrl-Enter': () => judge(),
    },
  });
  editor.on('change', () => {
    saveCode();
    scheduleCheck();
  });
  editor.setValue(loadCode());
}

/* ---------------- 初始化 ---------------- */

function setupResizer() {
  const saved = localStorage.getItem('hot100-acm:v2:sidebar-width');
  if (saved) document.documentElement.style.setProperty('--sidebar-width', `${saved}px`);
  const resizer = $('sidebarResizer');
  if (!resizer) return;
  const clamp = (v) => Math.max(280, Math.min(640, v));
  resizer.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    document.body.classList.add('resizing');
    resizer.setPointerCapture(e.pointerId);
  });
  resizer.addEventListener('pointermove', (e) => {
    if (!document.body.classList.contains('resizing')) return;
    const w = clamp(e.clientX);
    document.documentElement.style.setProperty('--sidebar-width', `${w}px`);
    localStorage.setItem('hot100-acm:v2:sidebar-width', String(w));
  });
  const stop = (e) => {
    document.body.classList.remove('resizing');
    if (resizer.hasPointerCapture(e.pointerId)) resizer.releasePointerCapture(e.pointerId);
  };
  resizer.addEventListener('pointerup', stop);
  resizer.addEventListener('pointercancel', stop);
}

function setupTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);
  $('themeBtn').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  $('themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
}

function setupEvents() {
  $('searchInput').addEventListener('input', renderList);
  $('difficultyFilter').addEventListener('change', renderList);
  $('topicFilter').addEventListener('change', renderList);
  $('sortFilter').addEventListener('change', renderList);
  $('companyFilter').addEventListener('change', renderList);
  $('starFilter').addEventListener('change', renderList);

  $('randomBtn').addEventListener('click', () => {
    const list = filteredProblems();
    if (!list.length) return;
    const pick = list[Math.floor(Math.random() * list.length)];
    saveCode();
    state.selectedId = pick.id;
    state.exampleIndex = 0;
    renderProblem();
    if (state.view === 'solution') renderSolution();
  });

  $('starBtn').addEventListener('click', () => {
    const id = state.selectedId;
    if (state.starred[id]) delete state.starred[id];
    else state.starred[id] = true;
    localStorage.setItem(STAR_KEY, JSON.stringify(state.starred));
    renderProblem();
    renderList();
  });

  $('problemList').addEventListener('click', (e) => {
    const item = e.target.closest('[data-id]');
    if (!item) return;
    saveCode();
    state.selectedId = Number(item.dataset.id);
    state.exampleIndex = 0;
    renderProblem();
    if (state.view === 'solution') renderSolution();
  });

  $('languageTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang]');
    if (!btn || btn.disabled) return;
    saveCode();
    state.language = btn.dataset.lang;
    if (state.mode === 'core' && !LANG[state.language].core) state.mode = 'acm';
    renderProblem();
  });

  $('exampleTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-example]');
    if (!btn) return;
    state.exampleIndex = Number(btn.dataset.example);
    renderAcmPanel();
  });

  document.querySelector('.mode-switch').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (!btn || btn.disabled) return;
    saveCode();
    state.mode = btn.dataset.mode;
    if (editor) editor.setValue(loadCode());
    renderProblem();
  });

  document.querySelector('.view-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view]');
    if (!btn) return;
    state.view = btn.dataset.view;
    document.querySelectorAll('.view-tab').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view));
    $('viewProblem').hidden = state.view !== 'problem';
    $('viewSolution').hidden = state.view !== 'solution';
    if (state.view === 'solution') renderSolution();
  });

  $('solutionLangTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sol-lang]');
    if (!btn) return;
    state.solutionLang = btn.dataset.solLang;
    renderSolution();
  });

  $('checkBtn').addEventListener('click', () => checkCode());
  $('resetBtn').addEventListener('click', () => {
    if (!editor) return;
    editor.setValue(currentTemplate());
    saveCode();
    scheduleCheck();
  });
  $('runSampleBtn').addEventListener('click', runSample);
  $('judgeBtn').addEventListener('click', judge);

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      judge();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCode();
    }
  });
}

function renderLanguageTabs() {
  $('languageTabs').innerHTML = Object.entries(LANG).map(([key, item]) => {
    const disabled = state.mode === 'core' && !item.core ? ' disabled' : '';
    return `<button class="${key === state.language ? 'active' : ''}" data-lang="${key}" type="button"${disabled}>${item.label}</button>`;
  }).join('');
}

async function boot() {
  setupTheme();
  try {
    await loadData();
  } catch (e) {
    const sub = $('splash').querySelector('.splash-sub');
    sub.textContent = '';
    sub.innerHTML = `<span style="color:var(--hard)">加载失败：${esc(e.message || e)}</span><br>请确认已通过 <code>npm start</code> 启动本地服务，并访问 <b>http://localhost:5173</b>。<br>若仍失败请按 Ctrl+Shift+R 强制刷新。`;
    return;
  }
  if (!state.problems.length) {
    $('splash').querySelector('.splash-sub').textContent = '题目数据为空，请先运行 scripts/gen-bootstrap.js。';
    return;
  }
  try {
    state.progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    state.starred = JSON.parse(localStorage.getItem(STAR_KEY) || '{}');
  } catch (e) { state.progress = {}; state.starred = {}; }

  state.selectedId = state.problems[0].id;

  setupFilters();
  setupResizer();
  setupEvents();
  initEditor();
  renderLanguageTabs();
  renderProblem();

  $('splash').hidden = true;
  $('app').hidden = false;
  editor.refresh();
  editor.focus();
}

boot();
