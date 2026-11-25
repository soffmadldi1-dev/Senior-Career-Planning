// 결과 화면: 입력 요약 + 맞춤 검색어 박스 + 5개 탭(채용공고·교육·상담·로드맵·AI)
import { state } from './state.js';
import { buildKeywords, fieldJobs } from './keywords.js';
import { buildPrompts } from './prompts.js';
import { h, rich, replaceChildren, uniq, fill, copyText } from './utils.js';

const $ = (s) => document.querySelector(s);
const FIT = { high: { cls: 'h', label: '바로 지원 가능' }, mid: { cls: 'm', label: '준비 후 도전' } };
const TAB_IDS = ['p1', 'p2', 'p3', 'p4', 'p5'];

let promptTexts = [];

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const scrollBehavior = () => (reduceMotion() ? 'auto' : 'smooth');

/* ---------- 작은 부품 ---------- */
function badge(meta, key) {
  const b = meta.badges[key] || meta.badges.assoc;
  return h('span', { class: `badge b-${meta.badges[key] ? key : 'assoc'}` }, b.label);
}

/** 바로가기·전화 버튼 묶음. 주소가 없으면 "지역별 확인" */
function actions(x) {
  const out = [];
  if (x.url) {
    out.push(h('a', { class: 'go', href: x.url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${x.name} 바로가기 (새 창)` }, '바로가기 →'));
  }
  if (x.phone) {
    out.push(h('a', { class: 'go tel', href: `tel:${x.phone.replace(/[^0-9]/g, '')}`, 'aria-label': `${x.name} 전화 ${x.phone}` }, `전화 ${x.phone}`));
  }
  if (!out.length) out.push(h('span', { class: 'go off' }, '지역별 확인'));
  return h('div', { class: 'golinks' }, out);
}

function itemCard(meta, x, extra = []) {
  return h(
    'div',
    { class: 'item' },
    h('h3', {}, x.name),
    actions(x),
    h('div', { class: 'meta' }, badge(meta, x.badge), x.meta ? h('span', { class: 'tag' }, x.meta) : null),
    h('p', {}, x.desc),
    extra,
  );
}

function kwChip(word, cls = '') {
  return h(
    'span',
    { class: `kw ${cls}`.trim() },
    h('span', {}, word),
    h('button', { type: 'button', class: 'cp', 'data-copy': word, 'aria-label': `${word} 복사` }, '복사'),
  );
}

/* ---------- 결과 그리기 ---------- */
/**
 * @returns {boolean} 결과를 그렸으면 true, 입력이 모자라면 false
 */
export function renderResult(ctx) {
  const { meta, industry, groups, sites, common, modifiers } = ctx;
  const byKey = new Map(industry.fields.map((f) => [f.key, f]));
  const fs = state.fields.map((k) => byKey.get(k)).filter(Boolean);
  const g = groups.groups.find((x) => x.key === state.group);
  const names = uniq([...fs.map((f) => f.name), ...state.customFields]);
  const K = buildKeywords(
    { group: state.group, fields: state.fields, certs: state.certs, customFields: state.customFields, customCerts: state.customCerts },
    { industry, common, modifiers, groups },
  );
  const allCerts = [...state.certs, ...state.customCerts];
  const vars = {
    kw0: K.job[0] || '관심 직무',
    kw1: K.job[1] || K.job[0] || '관심 직무',
    combo0: K.combo[0] || K.job[0] || '관심 직무',
    fieldName: names[0] || industry.name,
  };

  /* 제목·요약 */
  // 분야 이름은 가운뎃점(·)에서 줄이 갈리지 않도록 한 덩어리로 묶습니다.
  replaceChildren(
    $('#rTitle'),
    names.flatMap((n, i) => [i ? ' · ' : '', h('span', { class: 'nw' }, n)]),
    ' 분야 맞춤 안내',
  );
  $('#rSub').textContent = state.free.trim() ? `희망 사항 "${state.free.trim()}"도 함께 고려했습니다.` : '고르신 내용을 기준으로 정리했습니다.';
  replaceChildren(
    $('#rTags'),
    uniq([g?.label, state.age, state.region, ...allCerts]).map((t) => h('span', { class: 'tag' }, t)),
  );

  /* 맞춤 검색어 */
  replaceChildren($('#kwJob'), K.job.map((k) => kwChip(k)));
  replaceChildren(
    $('#kwMod'),
    K.mod.length ? K.mod.map((k) => kwChip(k)) : h('span', { class: 'hint' }, '자격·외국어를 고르면 조건 단어가 생깁니다.'),
  );
  replaceChildren($('#kwCombo'), K.combo.map((k) => kwChip(k, 'combo')));

  /* ① 채용공고 */
  const siteIds = uniq(fs.flatMap((f) => f.sites || []));
  if (!siteIds.length) siteIds.push(...(industry.defaultSites || ['work24']));
  replaceChildren(
    $('#jobBox'),
    siteIds
      .filter((id) => sites[id])
      .map((id) => {
        const s = { ...sites[id] };
        const useKw = uniq([
          ...fs.filter((f) => (f.sites || []).includes(id)).flatMap((f) => fieldJobs(f, state.certs).slice(0, 3)),
          ...state.customFields,
        ]).slice(0, 4);
        const words = useKw.length ? useKw : K.job.slice(0, 3);
        return itemCard(meta, s, [
          h('div', { class: 'use' }, h('b', {}, '이 검색어로 찾기'), h('div', { class: 'kwlist' }, words.map((k) => kwChip(k)))),
          h('ol', {}, s.steps.map((x) => h('li', {}, x))),
        ]);
      }),
  );
  const older = meta.olderAges.includes(state.age) || state.group === 'senior';
  const warns = fs.map((f) => f.warning).filter(Boolean);
  if (older && !fs.some((f) => f.warningCoversAge) && industry.ageWarning) warns.push(industry.ageWarning);
  replaceChildren(
    $('#warnBox'),
    warns.map((w) => h('div', { class: 'warn' }, h('b', {}, w.title), ' — ', rich(w.body))),
  );

  /* ② 교육·자격 */
  const inRegion = (x) => !x.onlyRegion || x.onlyRegion === state.region;
  const seen = new Set();
  const edu = [
    ...fs.flatMap((f) => f.edu || []),
    ...(industry.commonEdu || []),
    ...((g?.edu || []).filter(inRegion)),
    ...(industry.fallbackEdu || []),
  ].filter((x) => !seen.has(x.name) && seen.add(x.name));
  replaceChildren($('#eduBox'), edu.map((x) => itemCard(meta, x)));

  /* ③ 상담·커뮤니티 */
  const com = [...(industry.consultCenters || []), ...(g ? g.consult.filter(inRegion) : groups.noGroupConsult || [])];
  replaceChildren($('#comBox'), com.map((x) => itemCard(meta, x)));

  /* ④ 나의 로드맵 */
  replaceChildren(
    $('#roadBox'),
    (industry.roadmap || []).map((st) =>
      h('div', { class: 'stage' }, h('div', { class: 'when' }, st.when), h('h3', {}, st.title), h('ul', {}, st.items.map((i) => h('li', {}, fill(i, vars))))),
    ),
  );
  const paths = [
    ...fs.flatMap((f) => f.paths || []),
    ...state.customFields.map((c) => ({ fit: 'mid', title: c, desc: industry.customPathDesc || '' })),
  ].slice(0, 8);
  replaceChildren(
    $('#pathBox'),
    paths.map((p) => {
      const fit = FIT[p.fit] || FIT.mid;
      return h('div', { class: 'path' }, h('span', { class: `fit ${fit.cls}` }, fit.label), h('h4', {}, p.title), h('p', {}, p.desc));
    }),
  );
  const tasks = (industry.weekly || []).map((t) => {
    if (t.slot === 'groupConsult') return { ...(g?.weeklyConsult || industry.defaultWeeklyConsult), when: t.when };
    if (t.slot === 'fieldTask') return { ...(fs[0]?.weeklyTask || industry.defaultFieldTask), when: t.when };
    return t;
  });
  replaceChildren(
    $('#todoBox'),
    tasks.map((t, i) =>
      h(
        'li',
        {},
        h('input', { type: 'checkbox', id: `t${i}` }),
        h(
          'label',
          { for: `t${i}` },
          h('span', { class: 'when' }, t.when),
          h('b', {}, fill(t.title, vars)),
          h('span', { class: 'how' }, `방법: ${fill(t.how, vars)}`),
          h('span', { class: 'done' }, `완료 기준: ${fill(t.done, vars)}`),
        ),
      ),
    ),
  );
  updateTodoProgress();

  /* ⑤ AI에게 물어보기 */
  const P = buildPrompts(ctx, state, K, names);
  promptTexts = P.map((p) => p.text);
  $('#aiNotice').textContent = ctx.prompts.notice;
  replaceChildren(
    $('#promptBox'),
    P.map((p, i) =>
      h(
        'div',
        { class: 'prompt' },
        h(
          'div',
          { class: 'ph' },
          h('div', {}, h('b', {}, p.title), h('small', {}, p.desc)),
          h('button', { type: 'button', class: 'cpbig', 'data-copyp': i, 'aria-label': `${p.title} 질문 복사` }, '질문 복사'),
        ),
        h('pre', { id: `pp${i}`, tabindex: '0', 'aria-label': `${p.title} 질문문` }, p.text),
      ),
    ),
  );

  const result = $('#result');
  result.hidden = false;
  selectTab('p1');
  return true;
}

export function hideResult() {
  $('#result').hidden = true;
  promptTexts = [];
  ['#kwJob', '#kwMod', '#kwCombo', '#jobBox', '#warnBox', '#eduBox', '#comBox', '#roadBox', '#pathBox', '#todoBox', '#promptBox', '#rTags'].forEach((s) =>
    replaceChildren($(s)),
  );
  $('#rTitle').textContent = '맞춤 안내 결과';
  $('#rSub').textContent = '';
}

/* ---------- 탭 ---------- */
export function selectTab(id, focus = false) {
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.p === id;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
  });
  document.querySelectorAll('.panel').forEach((p) => {
    p.hidden = p.id !== id;
  });
}

function updateTodoProgress() {
  const boxes = [...document.querySelectorAll('#todoBox input[type=checkbox]')];
  const done = boxes.filter((b) => b.checked).length;
  $('#todoProgress').textContent = boxes.length ? `${boxes.length}개 중 ${done}개 완료${done === boxes.length ? ' — 이번 주 목표 달성!' : ''}` : '';
}

export function initResult({ onEdit }) {
  const tablist = $('.tabs');
  tablist.addEventListener('click', (e) => {
    const t = e.target.closest('.tab');
    if (t) selectTab(t.dataset.p);
  });
  // 키보드: 좌우 화살표, Home/End 로 탭 이동
  tablist.addEventListener('keydown', (e) => {
    const cur = TAB_IDS.indexOf(document.activeElement?.dataset?.p);
    if (cur < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = (cur + 1) % TAB_IDS.length;
    else if (e.key === 'ArrowLeft') next = (cur - 1 + TAB_IDS.length) % TAB_IDS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TAB_IDS.length - 1;
    if (next === null) return;
    e.preventDefault();
    selectTab(TAB_IDS[next], true);
  });

  $('#todoBox').addEventListener('change', updateTodoProgress);
  $('#editBtn').addEventListener('click', onEdit);

  // 복사 버튼(검색어·질문문)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]');
    if (b) {
      copyText(b.dataset.copy, `"${b.dataset.copy}" 복사 완료 — 검색창에 붙여넣으세요`);
      return;
    }
    const p = e.target.closest('[data-copyp]');
    if (p) copyText(promptTexts[Number(p.dataset.copyp)] || '', '질문을 복사했습니다 — AI 대화창에 붙여넣으세요');
  });
}
