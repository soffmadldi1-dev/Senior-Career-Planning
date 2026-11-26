// 결과 한 장 요약 — 카카오톡·문자에 붙여넣기 좋은 짧은 글 (DOM 없음, 테스트 대상)
//
// 개인정보 보호: 한 줄 희망(자유 입력)과 직접 기입한 자격·경력은 넣지 않습니다.

/**
 * @param {object} p
 * @param {string} p.serviceName
 * @param {string} p.date        표시용 날짜 (예: 2026.11.26)
 * @param {string} p.url         다시 볼 주소
 * @param {string[]} p.who       대상·나이·지역 (빈 값 제외)
 * @param {string[]} p.fieldNames
 * @param {{job:string[], combo:string[]}} p.keywords
 * @param {{name:string,url?:string}[]} p.sites
 * @param {{name:string,url?:string,phone?:string}[]} p.consult
 * @param {{title:string}[]} p.tasks
 */
export function buildSummary(p) {
  const L = [];
  L.push(`[${p.serviceName}] 나의 맞춤 안내 (${p.date})`);
  if (p.who.length) L.push(`대상: ${p.who.join(' · ')}`);
  L.push(`관심 분야: ${p.fieldNames.join(', ')}`);

  L.push('', '■ 바로 쓰는 검색어 (검색창에 그대로)');
  p.keywords.combo.forEach((k) => L.push(`- ${k}`));
  const more = p.keywords.job.filter((k) => !p.keywords.combo.some((c) => c.startsWith(k))).slice(0, 4);
  if (more.length) L.push(`- 함께 찾아볼 직무: ${more.join(', ')}`);

  L.push('', '■ 공고 찾는 곳');
  p.sites.slice(0, 3).forEach((s) => L.push(`- ${s.name}${s.url ? ` ${s.url}` : ''}`));

  L.push('', '■ 무료 상담');
  p.consult.slice(0, 3).forEach((c) => L.push(`- ${c.name}${c.phone ? ` ☎ ${c.phone}` : c.url ? ` ${c.url}` : ''}`));

  L.push('', '■ 이번 주 할 일');
  p.tasks.forEach((t, i) => L.push(`${i + 1}. ${t.title}`));

  L.push('', `다시 보기: ${p.url}`);
  return L.join('\n');
}
