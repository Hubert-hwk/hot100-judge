'use strict';
/**
 * 从 work/codetop/ 的抓取数据构建每道题的 CodeTop 高频信息，写入 public/data/problems.json 的 freq 字段：
 *   freq: {
 *     rank:      全局高频榜排名（1 起）
 *     value:     全局出现次数
 *     companies: [{ name, value }] 按次数降序的常考公司
 *   }
 */
const fs = require('fs');
const path = require('path');

const CODETOP_DIR = path.join(__dirname, '..', 'work', 'codetop');
const PROBLEMS_FILE = path.join(__dirname, '..', 'public', 'data', 'problems.json');

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(CODETOP_DIR, name), 'utf8'));
}

const problems = JSON.parse(fs.readFileSync(PROBLEMS_FILE, 'utf8'));
const companies = load('companies.json');
const hot = load('hot-all.json');

// 全局排名（hot-all 已按 value 降序）
const globalIdx = new Map();
hot.forEach((q, i) => {
  globalIdx.set(Number(q.leetcode.frontend_question_id), {
    rank: i + 1,
    value: q.value,
    lastAsked: (q.time || '').slice(0, 10),
  });
});

// 每公司
const companyIdx = new Map(); // problemId -> [{name, value, lastAsked}]
for (const c of companies) {
  const file = path.join(CODETOP_DIR, `company-${c.id}.json`);
  if (!fs.existsSync(file)) continue;
  const list = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const q of list) {
    const pid = Number(q.leetcode.frontend_question_id);
    if (!companyIdx.has(pid)) companyIdx.set(pid, []);
    companyIdx.get(pid).push({
      name: c.name,
      value: q.value,
      lastAsked: (q.time || '').slice(0, 10),
    });
  }
}

let added = 0;
const missing = [];
for (const p of problems) {
  const g = globalIdx.get(p.id);
  const comps = (companyIdx.get(p.id) || []).sort((a, b) => b.value - a.value);
  if (g) {
    p.freq = {
      rank: g.rank,
      value: g.value,
      lastAsked: g.lastAsked,
      companies: comps,
    };
    added++;
  } else {
    delete p.freq;
    missing.push(p.id);
  }
}

fs.writeFileSync(PROBLEMS_FILE, JSON.stringify(problems, null, 1), 'utf8');
console.log(`已标注 ${added}/${problems.length} 题的高频信息`);
console.log('缺失（榜外）:', missing.length ? missing.join(',') : '无');
// 预览热度前 10
const withFreq = problems.filter((p) => p.freq).sort((a, b) => a.freq.rank - b.freq.rank).slice(0, 10);
console.log('热度 Top10:');
for (const p of withFreq) {
  const tops = p.freq.companies.slice(0, 3).map((c) => `${c.name}${c.value}`).join(' ');
  console.log(`  #${p.freq.rank} 题${p.id} ${p.title} (${p.freq.value}次) | ${tops}`);
}
