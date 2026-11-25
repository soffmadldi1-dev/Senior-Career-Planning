// 맞춤 검색어 생성 — DOM을 쓰지 않는 순수 함수만 둡니다(브라우저·Node 테스트 모두에서 실행).

const uniq = (arr) => [...new Set((arr || []).filter(Boolean))];

export const LIMITS = Object.freeze({
  jobsSingleField: 7, // 분야 1개를 골랐을 때 분야당 직무 수
  jobsMultiField: 4, // 분야를 여러 개 골랐을 때 분야당 직무 수
  jobsTotal: 12,
  modifiers: 6,
  combos: 4,
  combosPerField: 2,
});

/** 공통 역량 묶음 중 '언어' 묶음의 항목 목록 */
export function languageItems(common) {
  return (common?.categories || []).filter((c) => c.isLanguage).flatMap((c) => c.items || []);
}

/**
 * 한 분야의 직무 이름 순서: 고른 자격에 걸린 직무(고른 순서) → 나머지 기본 직무
 * @param {object} field  industries/*.json 의 fields[] 항목
 * @param {string[]} certs 고른 자격·경험
 */
export function fieldJobs(field, certs = []) {
  const map = field.certToKeyword || {};
  const hits = uniq(certs.map((c) => map[c]));
  return uniq([...hits, ...(field.keywords || [])]);
}

/**
 * 맞춤 검색어를 만듭니다.
 * @param {object} input  { group, fields: string[](순서 있음), certs, customFields, customCerts }
 * @param {object} data   { industry, common, modifiers, groups }
 * @returns {{ job: string[], mod: string[], combo: string[] }}
 */
export function buildKeywords(input, data) {
  const { industry, common, modifiers = {}, groups } = data;
  const certs = input.certs || [];
  const customFields = input.customFields || [];
  const allCerts = [...certs, ...(input.customCerts || [])];

  const fieldMap = new Map((industry.fields || []).map((f) => [f.key, f]));
  const fields = (input.fields || []).map((k) => fieldMap.get(k)).filter(Boolean);
  const langs = languageItems(common);
  const groupWords = groups?.groups?.find((g) => g.key === input.group)?.modifiers || [];

  // ① 직무 이름
  const per = fields.length > 1 ? LIMITS.jobsMultiField : LIMITS.jobsSingleField;
  const job = uniq([...fields.flatMap((f) => fieldJobs(f, certs).slice(0, per)), ...customFields]).slice(0, LIMITS.jobsTotal);

  // ② 조건 단어: 언어 → 자격 → 그룹 단어, 직무 이름과 겹치면 제외
  const langMods = uniq(allCerts.filter((c) => langs.includes(c)).map((c) => modifiers[c]));
  const certMods = allCerts.filter((c) => !langs.includes(c)).map((c) => modifiers[c]);
  const mod = uniq([...langMods, ...certMods, ...groupWords])
    .filter((m) => !job.includes(m))
    .slice(0, LIMITS.modifiers);

  // ③ 추천 조합: 분야마다 앞의 직무 2개
  //  - 첫 번째 직무가 손님을 직접 응대하는 직무(languageRelevant && backOffice 아님)이고 언어가 있으면 → 언어 조건
  //  - 그 밖에는 그룹 단어(두 번째 직무는 그룹의 두 번째 단어)
  const lang0 = langMods[0] || '';
  const combo = [];
  fields.forEach((f) => {
    fieldJobs(f, certs)
      .slice(0, LIMITS.combosPerField)
      .forEach((k, i) => {
        const faceToFace = !!f.languageRelevant && !(f.backOffice || []).includes(k);
        let m;
        if (i === 0) m = (faceToFace && lang0) || groupWords[0] || '';
        else m = groupWords[i] || groupWords[0] || (faceToFace && lang0) || '';
        combo.push(m && !k.includes(m) ? `${k} ${m}` : k);
      });
  });
  customFields.forEach((c) => combo.push(groupWords[0] ? `${c} ${groupWords[0]}` : c));

  return { job, mod, combo: uniq(combo).slice(0, LIMITS.combos) };
}
