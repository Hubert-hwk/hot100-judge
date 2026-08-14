'use strict';
/**
 * 把 work/parts/explains-*.json 的解题思路合并进 public/data/problems.json 的 explain 字段。
 */
const fs = require('fs');
const path = require('path');

const PARTS_DIR = path.join(__dirname, '..', 'work', 'parts');
const PROBLEMS_FILE = path.join(__dirname, '..', 'public', 'data', 'problems.json');

const problems = JSON.parse(fs.readFileSync(PROBLEMS_FILE, 'utf8'));
const explains = {};
for (const f of fs.readdirSync(PARTS_DIR).filter((x) => /^explains-\d+\.json$/.test(x)).sort()) {
  Object.assign(explains, JSON.parse(fs.readFileSync(path.join(PARTS_DIR, f), 'utf8')));
}

let added = 0;
const missing = [];
for (const p of problems) {
  if (explains[p.id]) {
    p.explain = explains[p.id];
    added++;
  } else {
    missing.push(p.id);
  }
}

fs.writeFileSync(PROBLEMS_FILE, JSON.stringify(problems, null, 1), 'utf8');
console.log(`已添加 ${added}/${problems.length} 题解题思路`);
console.log('缺失:', missing.length ? missing.join(',') : '无');
