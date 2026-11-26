// 4. 검색어 규칙 단위 테스트 — 명세 6-3의 예시 3명 기준값
import { test, expect } from '@playwright/test';
import { buildKeywords, fieldJobs } from '../js/keywords.js';
import { buildSummary } from '../js/summary.js';
import { readJSON } from './helpers.js';

const data = {
  industry: readJSON('data/industries/tourism.json'),
  common: readJSON('data/common.json'),
  modifiers: readJSON('data/modifiers.json'),
  groups: readJSON('data/groups.json'),
};
const demos = readJSON('data/demos.json');
const input = (d) => ({ group: d.group, fields: d.fields, certs: d.certs, customFields: d.customFields, customCerts: d.customCerts });

test.describe('keywords.js 맞춤 검색어 규칙', () => {
  test('예시1 신중년·관광안내·해설·관광통역안내사·일본어', () => {
    const k = buildKeywords(input(demos[0]), data);
    expect(k.combo).toEqual(['관광통역안내사 일본어 가능', '관광안내원 경력무관']);
    expect(k.job).toHaveLength(7); // 분야 1개 → 7개
    expect(k.job[0]).toBe('관광통역안내사'); // 자격에 걸린 직무가 맨 앞
    expect(k.mod).toEqual(['일본어 가능', '중장년', '경력무관']); // 직무 이름과 겹치는 '관광통역안내사'는 제외
  });

  test('예시2 경력보유여성·예약상담+호텔·영어', () => {
    const k = buildKeywords(input(demos[1]), data);
    expect(k.combo).toEqual(['예약 상담원 영어 가능', '예약실 경력단절 우대', '하우스키핑 시간제', '룸메이드 경력단절 우대']);
    expect(k.job).toHaveLength(8); // 분야 2개 → 분야당 4개
    expect(k.mod[0]).toBe('영어 가능'); // 언어 → 자격 → 그룹 순서
    expect(k.mod.slice(-2)).toEqual(['시간제', '경력단절 우대']);
  });

  test('예시3 시니어·관광지+호텔·시설 경력·소방안전관리자', () => {
    const k = buildKeywords(input(demos[2]), data);
    expect(k.combo).toEqual(['시설물관리원 시니어', '안전관리원 60세 이상', '호텔 시설관리 시니어', '하우스키핑 60세 이상']);
  });

  test('직무 이름 최대 12개, 조건 단어 최대 6개, 추천 조합 최대 4개, 중복 없음', () => {
    const allLang = data.common.categories[0].items;
    const k = buildKeywords(
      {
        group: 'mid',
        fields: data.industry.fields.map((f) => f.key),
        certs: [...allLang, '엑셀', '운전면허', '호텔서비스사'],
        customFields: ['크루즈', '면세점'],
        customCerts: [],
      },
      data,
    );
    expect(k.job.length).toBeLessThanOrEqual(12);
    expect(k.mod.length).toBeLessThanOrEqual(6);
    expect(k.combo.length).toBeLessThanOrEqual(4);
    for (const list of [k.job, k.mod, k.combo]) expect(new Set(list).size).toBe(list.length);
    expect(k.mod.some((m) => k.job.includes(m))).toBe(false);
  });

  test('직접 입력한 분야는 직무 이름 뒤에 붙고, 그룹 단어와 조합된다', () => {
    const k = buildKeywords({ group: 'senior', fields: [], certs: [], customFields: ['크루즈'], customCerts: [] }, data);
    expect(k.job).toEqual(['크루즈']);
    expect(k.combo).toEqual(['크루즈 시니어']);
  });

  test('fieldJobs: 자격에 걸린 직무가 앞으로 온다', () => {
    const hotel = data.industry.fields.find((f) => f.key === 'hotel');
    expect(fieldJobs(hotel, ['경비·보안 경력'])[0]).toBe('호텔 보안');
    expect(fieldJobs(hotel, [])[0]).toBe('하우스키핑');
  });
});

test('summary.js: 요약 구성과 순서', () => {
  const K = buildKeywords(input(demos[0]), data);
  const t = buildSummary({
    serviceName: '다시, 일 길잡이',
    date: '2026.11.26',
    url: 'https://seniorcareer.vercel.app/',
    who: ['신중년', '50대 후반', '서울'],
    fieldNames: ['관광안내·해설'],
    keywords: K,
    sites: [{ name: '나라일터', url: 'https://www.gojobs.go.kr' }, { name: '시·군·구청', url: '' }],
    consult: [{ name: '새일센터', phone: '1544-1199' }],
    tasks: [{ title: '고용24 가입' }],
  });
  const lines = t.split('\n');
  expect(lines[0]).toBe('[다시, 일 길잡이] 나의 맞춤 안내 (2026.11.26)');
  expect(t).toContain('- 관광통역안내사 일본어 가능');
  expect(t).toContain('- 나라일터 https://www.gojobs.go.kr');
  expect(t).toContain('- 시·군·구청\n');
  expect(t).toContain('- 새일센터 ☎ 1544-1199');
  expect(lines.at(-1)).toBe('다시 보기: https://seniorcareer.vercel.app/');
});
