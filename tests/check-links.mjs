#!/usr/bin/env node
// 외부 링크 점검 스크립트
// 사용: node tests/check-links.mjs
// - data/*.json 과 index.html 에 있는 모든 http(s) 주소를 모아 실제 접속 여부를 확인합니다.
// - 네트워크가 막힌 환경이면 접속 확인 대신 링크 목록만 출력합니다.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const files = [
  'index.html',
  ...fs.readdirSync(path.join(ROOT, 'data'), { recursive: true }).filter((f) => f.endsWith('.json')).map((f) => `data/${f}`),
];

const links = new Map(); // url → 나온 파일들
for (const f of files) {
  const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of text.matchAll(/https?:\/\/[^\s"'<>)]+/g)) {
    const url = m[0].replace(/[.,]$/, '');
    if (url.includes('w3.org/2000/svg')) continue;
    if (!links.has(url)) links.set(url, new Set());
    links.get(url).add(f);
  }
}

async function check(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
    if (res.status === 405 || res.status === 403) res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal });
    return { ok: res.status < 400, status: String(res.status) };
  } catch (e) {
    return { ok: false, status: `연결 실패(${e.cause?.code || e.name})`, network: true };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (const [url, where] of links) results.push({ url, where: [...where].join(', '), ...(await check(url)) });

const blocked = results.every((r) => r.network);
console.log(`\n외부 링크 ${results.length}개 (${new Date().toISOString().slice(0, 10)} 점검)\n`);
if (blocked) {
  console.log('※ 네트워크가 막혀 있어 접속 여부를 확인하지 못했습니다. 아래 목록을 직접 열어 확인해 주세요.\n');
  for (const r of results) console.log(`- [ ] ${r.url}   (${r.where})`);
  process.exit(0);
}
for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.status.padEnd(8)} ${r.url}   (${r.where})`);
const bad = results.filter((r) => !r.ok);
console.log(`\n정상 ${results.length - bad.length}개 / 확인 필요 ${bad.length}개`);
process.exit(bad.length ? 1 : 0);
