'use strict';

/**
 * 端到端集成测试：走真实 HTTP API（/api/judge），
 * 用参考题解作为用户代码，验证 ACM / 核心代码两种模式下全部用例通过。
 * 依赖：服务器已在运行（默认 http://127.0.0.1:5173，可用 PORT 覆盖）。
 * 用法：node scripts/e2e.js [--all]   # --all 全量 100 题，否则抽样 10 题
 */
const BASE = process.env.BASE || `http://127.0.0.1:${process.env.PORT || 5173}`;

async function main() {
  const all = process.argv.includes('--all');
  const fs = require('fs');
  const path = require('path');
  const dataDir = path.join(__dirname, '..', 'public', 'data');
  const problems = JSON.parse(fs.readFileSync(path.join(dataDir, 'problems.json'), 'utf8'));
  const solutions = JSON.parse(fs.readFileSync(path.join(dataDir, 'solutions.json'), 'utf8'));

  const sample = all ? problems : problems.filter((p) => [1, 42, 94, 146, 160, 200, 208, 295, 31, 5].includes(p.id));

  let total = 0, passed = 0;
  const failures = [];

  async function judgeOne(id, mode, language, code) {
    const resp = await fetch(`${BASE}/api/judge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ problemId: id, mode, language, code }),
    });
    return resp.json();
  }

  for (const p of sample) {
    const sol = solutions[p.id];
    if (!sol) continue;
    const combos = [
      ['acm', 'python3', sol.python3 && sol.python3.acm],
      ['acm', 'cpp', sol.cpp && sol.cpp.acm],
      ['core', 'python3', sol.python3 && sol.python3.core],
      ['core', 'cpp', sol.cpp && sol.cpp.core],
    ];
    for (const [mode, lang, code] of combos) {
      if (!code) continue;
      total++;
      try {
        const r = await judgeOne(p.id, mode, lang, code);
        if (r.ok && r.allPassed) {
          passed++;
        } else {
          failures.push({ id: p.id, mode, lang, error: (r.error || '').slice(0, 150), detail: JSON.stringify((r.results || []).filter((x) => !x.ok).slice(0, 1)) });
        }
      } catch (e) {
        failures.push({ id: p.id, mode, lang, error: '请求失败: ' + e.message });
      }
    }
  }

  console.log(`E2E: ${passed}/${total} 通过`);
  if (failures.length) {
    console.log('失败项:');
    for (const f of failures) console.log(' ', JSON.stringify(f).slice(0, 300));
    process.exit(1);
  }
  console.log('✅ 端到端全部通过');
}

main().catch((e) => { console.error(e); process.exit(1); });
