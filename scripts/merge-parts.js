'use strict';

/**
 * 合并 work/parts/ 下的数据分片为最终数据文件：
 *   problems-*.json  → public/data/problems.json（按 id 排序的数组）
 *   tests-*.json     → public/data/tests.json（id → {acm, core}）
 *   solutions-*.json → public/data/solutions.json（id → {python3:{core,acm}, cpp:{core,acm}}）
 */
const fs = require('fs');
const path = require('path');

const partsDir = path.join(__dirname, '..', 'work', 'parts');
const dataDir = path.join(__dirname, '..', 'public', 'data');

const problemParts = fs.readdirSync(partsDir).filter((f) => /^problems-g\d{2}\.json$/.test(f)).sort();
const testParts = fs.readdirSync(partsDir).filter((f) => /^tests-g\d{2}\.json$/.test(f)).sort();
const solParts = fs.readdirSync(partsDir).filter((f) => /^solutions-g\d{2}\.json$/.test(f)).sort();

if (!problemParts.length) {
  console.error('work/parts/ 下没有数据分片，请先运行子代理生成。');
  process.exit(1);
}

const problems = [];
const tests = {};
const solutions = {};

// 保留上一次合并时由生成脚本（build-codetop-data / add-explains）写入的字段
let existing = [];
try {
  existing = JSON.parse(fs.readFileSync(path.join(dataDir, 'problems.json'), 'utf8'));
} catch (e) { /* 首次合并无旧文件 */ }
const preserveFields = (p) => {
  const old = existing.find((x) => x.id === p.id);
  if (!old) return;
  if (old.freq) p.freq = old.freq;
  if (old.explain) p.explain = old.explain;
};

for (const f of problemParts) {
  const arr = JSON.parse(fs.readFileSync(path.join(partsDir, f), 'utf8'));
  for (const p of arr) {
    if (problems.some((x) => x.id === p.id)) {
      console.error(`重复题目 id=${p.id}（${f}）`);
      process.exit(1);
    }
    preserveFields(p);
    problems.push(p);
  }
}
for (const f of testParts) {
  Object.assign(tests, JSON.parse(fs.readFileSync(path.join(partsDir, f), 'utf8')));
}
for (const f of solParts) {
  Object.assign(solutions, JSON.parse(fs.readFileSync(path.join(partsDir, f), 'utf8')));
}

problems.sort((a, b) => a.id - b.id);
const missingTests = problems.filter((p) => !tests[p.id]);
const missingSols = problems.filter((p) => !solutions[p.id]);
if (missingTests.length) console.warn(`警告: ${missingTests.length} 题缺少测试用例:`, missingTests.map((p) => p.id).join(','));
if (missingSols.length) console.warn(`警告: ${missingSols.length} 题缺少题解:`, missingSols.map((p) => p.id).join(','));

fs.writeFileSync(path.join(dataDir, 'problems.json'), JSON.stringify(problems, null, 1), 'utf8');
fs.writeFileSync(path.join(dataDir, 'tests.json'), JSON.stringify(tests, null, 1), 'utf8');
fs.writeFileSync(path.join(dataDir, 'solutions.json'), JSON.stringify(solutions, null, 1), 'utf8');

console.log(`合并完成：${problems.length} 题；测试用例 ${Object.keys(tests).length} 题；题解 ${Object.keys(solutions).length} 题`);
