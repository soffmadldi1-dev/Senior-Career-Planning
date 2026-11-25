// 데이터 파일 점검 — 새 산업 JSON을 추가했을 때 실수를 바로 잡아 줍니다.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { readJSON, ROOT } from './helpers.js';

const meta = readJSON('data/meta.json');
const sites = readJSON('data/sites.json');
const groups = readJSON('data/groups.json');
const common = readJSON('data/common.json');
const modifiers = readJSON('data/modifiers.json');
const demos = readJSON('data/demos.json');
const BADGES = ['gov', 'pub', 'local', 'assoc'];
const PLACEHOLDERS = new Set(['kw0', 'kw1', 'combo0', 'fieldName']);

/** 객체 안의 모든 문자열을 [경로, 값]으로 모읍니다. */
function strings(obj, p = '$') {
  if (typeof obj === 'string') return [[p, obj]];
  if (Array.isArray(obj)) return obj.flatMap((v, i) => strings(v, `${p}[${i}]`));
  if (obj && typeof obj === 'object') return Object.entries(obj).flatMap(([k, v]) => strings(v, `${p}.${k}`));
  return [];
}
const allFiles = fs
  .readdirSync(path.join(ROOT, 'data'), { recursive: true })
  .filter((f) => f.endsWith('.json'))
  .map((f) => `data/${f}`);

test('모든 데이터 파일에 HTML 태그가 없다', () => {
  for (const f of allFiles) {
    for (const [p, s] of strings(readJSON(f))) expect(/<\/?[a-z][^>]*>/i.test(s), `${f} ${p}`).toBe(false);
  }
});

test('출처 유형(badge)은 4종만 쓴다', () => {
  for (const f of allFiles) {
    const walk = (o, p) => {
      if (Array.isArray(o)) o.forEach((v, i) => walk(v, `${p}[${i}]`));
      else if (o && typeof o === 'object') {
        if ('badge' in o) expect(BADGES, `${f} ${p}.badge`).toContain(o.badge);
        Object.entries(o).forEach(([k, v]) => walk(v, `${p}.${k}`));
      }
    };
    walk(readJSON(f), '$');
  }
  expect(Object.keys(meta.badges).sort()).toEqual([...BADGES].sort());
});

test('meta.json: 정보 확인일 형식과 산업 파일 존재', () => {
  expect(meta.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(meta.industries.length).toBeGreaterThan(0);
  for (const it of meta.industries) expect(fs.existsSync(path.join(ROOT, 'data', it.file)), it.file).toBe(true);
  expect(meta.industries.map((x) => x.id)).toContain(meta.defaultIndustry);
});

for (const entry of meta.industries) {
  test(`산업 파일 점검: ${entry.file}`, () => {
    const ind = readJSON(`data/${entry.file}`);
    expect(ind.id).toBe(entry.id);
    expect(ind.name).toBeTruthy();
    const keys = new Set();
    for (const f of ind.fields) {
      const where = `${entry.id}.${f.key}`;
      expect(keys.has(f.key), `${where} key 중복`).toBe(false);
      keys.add(f.key);
      for (const k of ['name', 'law', 'example']) expect(f[k], `${where}.${k}`).toBeTruthy();
      expect(f.keywords.length, `${where}.keywords`).toBeGreaterThan(0);
      for (const b of f.backOffice || []) expect(f.keywords, `${where}.backOffice "${b}"`).toContain(b);
      for (const [c, kw] of Object.entries(f.certToKeyword || {})) {
        expect(f.certs, `${where}.certToKeyword 의 자격 "${c}"`).toContain(c);
        expect(f.keywords, `${where}.certToKeyword 의 직무 "${kw}"`).toContain(kw);
      }
      for (const s of f.sites) expect(Object.keys(sites), `${where}.sites "${s}"`).toContain(s);
      for (const p of f.paths) expect(['high', 'mid'], `${where}.paths.fit`).toContain(p.fit);
      expect(f.warning?.title && f.warning?.body, `${where}.warning`).toBeTruthy();
      expect(f.weeklyTask?.title && f.weeklyTask?.how && f.weeklyTask?.done, `${where}.weeklyTask`).toBeTruthy();
    }
    for (const s of ind.defaultSites) expect(Object.keys(sites)).toContain(s);
    // 이번 주 할 일 7개, 자리표시자는 정해진 것만
    expect(ind.weekly).toHaveLength(7);
    for (const [p, s] of strings({ weekly: ind.weekly, roadmap: ind.roadmap, fields: ind.fields, d1: ind.defaultFieldTask })) {
      for (const m of s.matchAll(/\{(\w+)\}/g)) expect(PLACEHOLDERS.has(m[1]), `${entry.id} ${p} {${m[1]}}`).toBe(true);
    }
  });
}

test('groups.json: 3개 그룹과 필수 항목', () => {
  expect(groups.groups.map((g) => g.key)).toEqual(['mid', 'senior', 'women']);
  for (const g of groups.groups) {
    expect(g.modifiers.length).toBeGreaterThanOrEqual(1);
    expect(g.weeklyConsult.title).toBeTruthy();
    for (const a of g.ages) expect(meta.ageOptions).toContain(a);
  }
});

test('common.json: 언어 묶음 11개, 직접 기입 묶음 1개 / modifiers.json 언어 매핑', () => {
  const lang = common.categories.find((c) => c.isLanguage);
  expect(lang.items).toHaveLength(11);
  expect(common.categories.filter((c) => c.isCustom)).toHaveLength(1);
  for (const l of lang.items) expect(modifiers[l], l).toBeTruthy();
});

test('demos.json: 예시 인물 입력값이 실제 목록에 있다', () => {
  const ind = readJSON('data/industries/tourism.json');
  const pool = new Set([...ind.fields.flatMap((f) => f.certs), ...common.categories.flatMap((c) => c.items || [])]);
  for (const d of demos) {
    for (const f of d.fields) expect(ind.fields.map((x) => x.key)).toContain(f);
    for (const c of d.certs) expect(pool.has(c), c).toBe(true);
    expect(meta.ageOptions).toContain(d.age);
    expect(meta.regionOptions).toContain(d.region);
  }
});
