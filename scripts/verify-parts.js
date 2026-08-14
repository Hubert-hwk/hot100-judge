'use strict';

/**
 * 数据分片验证器：
 *   node scripts/verify-parts.js <group>   —— 验证 work/parts/problems-<group>.json 等
 *   node scripts/verify-parts.js all       —— 验证 public/data/*.json（合并后的全量数据）
 *
 * 对每个题目做 4 项检查（有数据才检查）：
 *   ACM 模式：python3 完整程序、cpp 完整程序 跑通全部 ACM 用例
 *   核心模式：python3 核心函数、cpp 核心类 跑通全部 core 用例
 */
const fs = require('fs');
const path = require('path');
const { judgeACM, judgeCore } = require('../judge/judge');

function load(partsDir, name, group) {
  const file = path.join(partsDir, `${name}-${group}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function withRetry(fn) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fn();
    const text = `${r.error || ''} ${r.compileError || ''}`;
    if (!/fatal error|killed|terminated|cc1plus|signal|SIGKILL|退出码 137|已杀死|internal compiler error/i.test(text)) return r;
    await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
  }
  return fn();
}

async function verifyOne(problem, tests, solutions) {
  const id = problem.id;
  const report = { id, title: problem.title, checks: [] };
  const t = tests[id];
  const sol = solutions[id];

  if (!t) { report.error = 'tests.json 缺少该题'; return report; }
  if (!sol) { report.error = 'solutions.json 缺少该题'; return report; }

  if (sol.python3 && sol.python3.acm && t.acm && t.acm.length) {
    const r = await withRetry(() => judgeACM({ language: 'python3', code: sol.python3.acm, tests: t.acm }));
    report.checks.push({
      name: 'ACM python3',
      pass: !r.error && r.results.every((x) => x.ok),
      detail: r.error || r.results.filter((x) => !x.ok).map((x) => `#${x.index + 1} ${(x.error || '').slice(0, 200)}`).slice(0, 2).join(' | '),
    });
  }
  if (sol.cpp && sol.cpp.acm && t.acm && t.acm.length) {
    const r = await withRetry(() => judgeACM({ language: 'cpp', code: sol.cpp.acm, tests: t.acm }));
    report.checks.push({
      name: 'ACM cpp',
      pass: !r.error && r.results.every((x) => x.ok),
      detail: r.error || r.results.filter((x) => !x.ok).map((x) => `#${x.index + 1} ${(x.error || '').slice(0, 200)}`).slice(0, 2).join(' | '),
    });
  }
  if (problem.core && sol.python3 && sol.python3.core && t.core && t.core.length) {
    const r = await withRetry(() => judgeCore({ language: 'python3', code: sol.python3.core, core: problem.core, tests: t.core }));
    report.checks.push({
      name: 'core python3',
      pass: !r.error && r.results.every((x) => x.ok),
      detail: r.error || r.results.filter((x) => !x.ok).map((x) => JSON.stringify({ args: x.args, expected: x.expected, got: x.got, err: x.error }).slice(0, 260)).slice(0, 2).join(' | '),
    });
  }
  if (problem.core && sol.cpp && sol.cpp.core && t.core && t.core.length) {
    const r = await withRetry(() => judgeCore({ language: 'cpp', code: sol.cpp.core, core: problem.core, tests: t.core }));
    report.checks.push({
      name: 'core cpp',
      pass: !r.error && r.results.every((x) => x.ok),
      detail: r.error || r.results.filter((x) => !x.ok).map((x) => JSON.stringify({ args: x.args, expected: x.expected, got: x.got, err: x.error }).slice(0, 260)).slice(0, 2).join(' | '),
    });
  }

  // 结构校验
  const problems = [];
  if (!problem.desc || !problem.desc.trim()) problems.push('desc 为空');
  if (!problem.acm || !problem.acm.input || !problem.acm.output) problems.push('acm.input/output 缺失');
  if (!problem.acm || !problem.acm.examples || !problem.acm.examples.length) problems.push('acm.examples 为空');
  if (!problem.acm || !problem.acm.template || !problem.acm.template.python3 || !problem.acm.template.cpp) problems.push('acm.template 缺失');
  if (!problem.core || !problem.core.kind) problems.push('core 缺失');
  else {
    if (!problem.core.templates || !problem.core.templates.python3 || !problem.core.templates.cpp) problems.push('core.templates 缺失');
    if (problem.core.kind === 'ops' && (!problem.core.ops || !problem.core.ops.methods)) problems.push('core.ops 缺失');
    if (problem.core.kind === 'function' && (!problem.core.params || !problem.core.params.length || !problem.core.method)) problems.push('core.params/method 缺失');
  }
  if (!t.acm || t.acm.length < 3) problems.push(`acm 用例 ${t.acm ? t.acm.length : 0} 组（要求 ≥3）`);
  if (!t.core || t.core.length < 3) problems.push(`core 用例 ${t.core ? t.core.length : 0} 组（要求 ≥3）`);
  if (t.acm && t.acm.some((c) => typeof c.input !== 'string' || typeof c.output !== 'string')) problems.push('acm 用例格式错误');
  if (t.core && t.core.some((c) => !Array.isArray(c.args))) problems.push('core 用例缺少 args 数组');
  if (sol && (!sol.python3 || !sol.cpp)) problems.push('题解缺语言（需 python3 与 cpp）');
  if (sol && sol.python3 && (!sol.python3.core || !sol.python3.acm)) problems.push('python3 题解缺 core/acm');
  if (sol && sol.cpp && (!sol.cpp.core || !sol.cpp.acm)) problems.push('cpp 题解缺 core/acm');
  report.structural = problems;
  report.pass = report.checks.every((c) => c.pass) && problems.length === 0;
  return report;
}

async function main() {
  const group = process.argv[2];
  if (!group) {
    console.error('用法: node scripts/verify-parts.js <group|all>');
    process.exit(1);
  }
  let problems, tests, solutions;
  if (group === 'all') {
    const dataDir = path.join(__dirname, '..', 'public', 'data');
    problems = JSON.parse(fs.readFileSync(path.join(dataDir, 'problems.json'), 'utf8'));
    tests = JSON.parse(fs.readFileSync(path.join(dataDir, 'tests.json'), 'utf8'));
    solutions = JSON.parse(fs.readFileSync(path.join(dataDir, 'solutions.json'), 'utf8'));
  } else {
    const partsDir = path.join(__dirname, '..', 'work', 'parts');
    problems = load(partsDir, 'problems', group);
    tests = load(partsDir, 'tests', group);
    solutions = load(partsDir, 'solutions', group);
  }

  let allPass = true;
  for (const p of problems) {
    const r = await verifyOne(p, tests, solutions);
    if (!r.pass) allPass = false;
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${String(r.id).padStart(4)} ${r.title}`);
    if (!r.pass) {
      for (const c of r.checks || []) if (!c.pass) console.log(`   ✗ ${c.name}: ${c.detail}`);
      for (const s of r.structural || []) console.log(`   ✗ 结构: ${s}`);
      if (r.error) console.log(`   ✗ ${r.error}`);
    }
  }
  console.log(allPass ? '\n✅ 全部通过' : '\n❌ 存在失败项');
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
