// AI 질문문 템플릿 채우기 (DOM 없음)
import { fill, uniq } from './utils.js';

/**
 * @param {object} ctx   { prompts, industry, groups }
 * @param {object} s     입력 상태
 * @param {object} K     buildKeywords 결과
 * @param {string[]} names 고른 분야 이름(직접 입력 포함)
 * @returns {{key:string,title:string,desc:string,text:string}[]}
 */
export function buildPrompts(ctx, s, K, names) {
  const { prompts, industry, groups } = ctx;
  const g = groups.groups.find((x) => x.key === s.group);
  const certs = [...s.certs, ...s.customCerts];

  const vars = {
    who: uniq([g?.label, s.age]).join(', ') || prompts.defaultWho,
    regionPart: s.region ? `, ${s.region} 거주` : '',
    industryName: industry.name,
    fieldNames: names.join(', '),
    fieldName: names[0] || industry.name,
    certs: certs.join(', ') || prompts.noCerts,
    wish: s.free || prompts.noWish,
    kwTop3: K.job.slice(0, 3).join(', '),
    kwTop6: K.job.slice(0, 6).join(', '),
    mainSites: industry.copy?.mainSites || '고용24',
    jobVocab: industry.copy?.jobVocab || '고객 응대, 현장 운영 등',
  };
  vars.profile = fill(prompts.profile.join('\n'), vars);

  return prompts.templates.map((t) => ({
    key: t.key,
    title: fill(t.title, vars),
    desc: fill(t.desc, vars),
    text: fill(t.body.join('\n'), vars),
  }));
}
