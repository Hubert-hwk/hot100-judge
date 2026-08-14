'use strict';
/**
 * 抓取 CodeTop 公开数据（https://codetop.cc）：
 *   1. /api/companies/  → 公司列表
 *   2. /api/questions/  → 全局高频榜（分页，每页 20）
 *   3. /api/questions/?company=<id> → 各公司高频题（分页）
 * 输出到 work/codetop/ 下，供 scripts/build-codetop-data.js 加工。
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://codetop.cc';
const OUT = path.join(__dirname, '..', 'work', 'codetop');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const resp = await fetch(url, { headers: { 'user-agent': 'hot100-acm/1.0 (local practice tool)' } });
      if (resp.ok) return await resp.json();
      if (resp.status === 429) {
        console.log('触发限流 429，等待 8s 后重试…');
        await sleep(8000);
        continue;
      }
      throw new Error('HTTP ' + resp.status);
    } catch (e) {
      await sleep(2500 * (attempt + 1));
    }
  }
  throw new Error('fetch failed: ' + url);
}

async function fetchAllPages(endpoint, label) {
  const all = [];
  let page = 1;
  for (;;) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const d = await get(`${BASE}${endpoint}${sep}page=${page}`);
    const list = d.list || [];
    all.push(...list);
    if (page * 20 >= (d.count || 0) || !list.length) break;
    page++;
    await sleep(500);
    if (page % 10 === 0) console.log(label, 'page', page);
  }
  console.log(label, '完成:', all.length, '条');
  return all;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const companies = await get(BASE + '/api/companies/');
  fs.writeFileSync(path.join(OUT, 'companies.json'), JSON.stringify(companies, null, 1));
  console.log('公司数:', companies.length, companies.map((c) => c.name).join('、'));

  if (!fs.existsSync(path.join(OUT, 'hot-all.json'))) {
    const hot = await fetchAllPages('/api/questions/', '全局高频榜');
    fs.writeFileSync(path.join(OUT, 'hot-all.json'), JSON.stringify(hot));
  } else {
    console.log('全局高频榜已存在，跳过');
  }

  for (const c of companies) {
    const target = path.join(OUT, `company-${c.id}.json`);
    if (fs.existsSync(target)) {
      console.log(`公司 ${c.id} ${c.name} 已存在，跳过`);
      continue;
    }
    const list = await fetchAllPages(`/api/questions/?company=${c.id}`, `公司 ${c.id} ${c.name}`);
    fs.writeFileSync(target, JSON.stringify(list));
    await sleep(300);
  }
  console.log('ALL DONE');
})().catch((e) => { console.error(e); process.exit(1); });
