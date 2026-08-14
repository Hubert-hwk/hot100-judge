'use strict';

/**
 * 评测逻辑：
 *  - judgeACM：ACM 模式，逐用例编译/运行用户完整程序，stdin/stdout 对比（含浮点容差）。
 *  - judgeCore：核心代码模式，生成驱动源文件，一次编译/运行跑完全部用例。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runProcess, commandExists, DEFAULT_TIMEOUT_MS } = require('./runner');
const { buildPythonDriver, buildCppDriver } = require('./core-driver');

const CORE_TIMEOUT_MS = 8000;

/** 输出对比：先精确匹配（trim 每行），再尝试整行浮点容差匹配。 */
function outputsEqual(expectedRaw, gotRaw) {
  const norm = (s) => String(s || '').replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd());
  const e = norm(expectedRaw).filter((l, i, a) => !(i === a.length - 1 && l === ''));
  const g = norm(gotRaw).filter((l, i, a) => !(i === a.length - 1 && l === ''));
  if (e.length === g.length && e.every((l, i) => l === g[i])) return true;
  if (e.length !== g.length) return false;
  const isNum = (s) => /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s.trim());
  if (e.every(isNum) && g.every(isNum)) {
    return e.every((l, i) => {
      const a = parseFloat(l);
      const b = parseFloat(g[i]);
      return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
    });
  }
  return false;
}

async function judgeACM({ language, code, tests }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hot100-acm-judge-'));
  try {
    // 编译一次，逐用例运行（Python 直接运行）
    let runCmd = null; // {command, args}
    if (language === 'python3') {
      const python = await commandExists('python3');
      if (!python) return { error: '未找到 python3', phase: 'syntax' };
      const file = path.join(tmp, 'main.py');
      fs.writeFileSync(file, code, 'utf8');
      const checked = await runProcess(python, ['-m', 'py_compile', file], { cwd: tmp, phase: 'compile' });
      if (checked.code !== 0 || checked.timedOut) return { error: checked.stderr || '语法错误', phase: 'syntax' };
      runCmd = { command: python, args: [file] };
    } else if (language === 'c' || language === 'cpp') {
      const compiler = await commandExists(language === 'c' ? 'gcc' : 'g++');
      if (!compiler) return { error: `当前系统未安装 ${language === 'c' ? 'gcc' : 'g++'}。`, phase: 'compile' };
      const source = path.join(tmp, language === 'c' ? 'main.c' : 'main.cpp');
      const binary = path.join(tmp, 'main');
      fs.writeFileSync(source, code, 'utf8');
      const args = language === 'c'
        ? [source, '-O2', '-std=c11', '-lm', '-o', binary]
        : [source, '-O2', '-std=c++17', '-o', binary];
      const compiled = await runProcess(compiler, args, { cwd: tmp, phase: 'compile' });
      if (compiled.code !== 0 || compiled.timedOut) return { error: compiled.stderr || '编译失败', phase: 'compile' };
      runCmd = { command: binary, args: [] };
    } else {
      return { error: '不支持的语言' };
    }

    const results = [];
    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const run = await runProcess(runCmd.command, runCmd.args, { input: t.input, cwd: tmp });
      const entry = {
        index: i,
        input: t.input,
        expected: t.output,
        ok: false,
        ms: run.ms,
        phase: 'run',
        timedOut: !!run.timedOut,
      };
      if (run.code === 0 && !run.timedOut) {
        entry.got = run.stdout;
        entry.ok = outputsEqual(t.output, run.stdout);
        if (!entry.ok) {
          entry.error = `输出不一致\n期望:\n${t.output}\n实际:\n${run.stdout}`;
        }
      } else {
        entry.error = run.timedOut ? `运行超时 ${run.ms}ms` : (run.stderr || run.error || `程序退出码 ${run.code}`);
        if (run.killedByLimit === 'cpu') entry.error = `CPU 时间超限（运行超过 5 秒）`;
        if (run.killedByLimit === 'output') entry.error = '输出超出大小限制（64KB）';
      }
      results.push(entry);
    }
    return { results };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** 核心代码模式评测：一次编译 + 一次运行，跑完全部用例。 */
async function judgeCore({ language, code, core, tests }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hot100-acm-core-'));
  try {
    const cases = core.kind === 'ops'
      ? tests.map((t) => ({ ops: t.ops, args: t.args, expected: t.expected }))
      : tests.map((t) => ({ args: t.args, expected: t.expected }));

    if (language === 'python3') {
      const python = await commandExists('python3');
      if (!python) return { error: '未找到 python3' };
      const source = buildPythonDriver({ core, code, cases });
      const file = path.join(tmp, 'main.py');
      fs.writeFileSync(file, source, 'utf8');
      const checked = await runProcess(python, ['-m', 'py_compile', file], { cwd: tmp, phase: 'compile' });
      if (checked.code !== 0 || checked.timedOut) {
        return { error: '语法错误（驱动已注入，若为编译错误请检查核心函数签名）', compileError: checked.stderr || checked.error, phase: 'syntax' };
      }
      const run = await runProcess(python, [file], { cwd: tmp, timeout: CORE_TIMEOUT_MS });
      if (run.code !== 0 || run.timedOut) {
        return { error: run.timedOut ? `运行超时 ${run.ms}ms` : (run.stderr || run.error || `退出码 ${run.code}`), phase: 'run' };
      }
      return parseCoreResults(run.stdout);
    }

    if (language === 'cpp') {
      const compiler = await commandExists('g++');
      if (!compiler) return { error: '当前系统未安装 g++。' };
      const source = buildCppDriver({ core, code, cases });
      const srcFile = path.join(tmp, 'main.cpp');
      const binary = path.join(tmp, 'main');
      const casesFile = path.join(tmp, 'cases.json');
      fs.writeFileSync(srcFile, source, 'utf8');
      fs.writeFileSync(casesFile, JSON.stringify(cases), 'utf8');
      const compiled = await runProcess(compiler, [srcFile, '-O2', '-std=c++17', '-o', binary], { cwd: tmp, phase: 'compile' });
      if (compiled.code !== 0 || compiled.timedOut) {
        return { error: '编译错误（驱动已注入，请检查核心函数/类签名）', compileError: compiled.stderr || compiled.error, phase: 'compile' };
      }
      const run = await runProcess(binary, [casesFile], { cwd: tmp, timeout: CORE_TIMEOUT_MS });
      if (run.timedOut) return { error: `运行超时 ${run.ms}ms`, phase: 'run' };
      if (run.code !== 0) return { error: run.stderr || run.error || `退出码 ${run.code}`, phase: 'run' };
      return parseCoreResults(run.stdout);
    }

    return { error: '核心代码模式暂不支持该语言' };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * 解析驱动输出。驱动对每个用例输出 {"ok":true} 或 {"ok":false,"expected":..,"got":..,"error":..}。
 * expected/got 为 JSON 字符串形式的 Canon 序列化。
 */
function parseCoreResults(stdout) {
  let arr;
  try {
    arr = JSON.parse(stdout);
  } catch (e) {
    return { error: '评测驱动输出异常', phase: 'run', raw: stdout.slice(0, 2000) };
  }
  if (!Array.isArray(arr)) return { error: '评测驱动输出异常', phase: 'run' };
  return { results: arr };
}

/** 汇总为前端展示结构。 */
function summarize(results, mode) {
  let passed = 0;
  for (const r of results) if (r.ok) passed++;
  return { passed, total: results.length, allPassed: passed === results.length };
}

module.exports = { judgeACM, judgeCore, outputsEqual, summarize };
