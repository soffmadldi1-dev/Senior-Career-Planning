// 시작: 데이터 불러오기 → 화면 그리기 → 이벤트 연결
//
// TODO [확인 필요] (2026-11-26 기준 남은 항목 — README 6번 참고)
//  - 관광안내·해설 경고문의 "2026 종묘관리소 공고, 만 60세 미만" 사례 원문 → data/industries/tourism.json  guide.warning
//  - 국외여행인솔자 등록·교육 위탁 기관 이름                         → data/industries/tourism.json  travel.edu
//  - 궁능유적본부 채용 게시판 정확한 메뉴 이름                        → data/sites.json  royal
//  - 모든 외부 링크의 실제 접속 여부                                  → node tests/check-links.mjs
import { setFormContext, renderFormStatic, drawAll, initForm, clearForm, showFormMessage } from './form.js';
import { renderResult, hideResult, initResult, scrollBehavior } from './result.js';
import { state, resetState } from './state.js';
import { h, rich, replaceChildren } from './utils.js';

const $ = (s) => document.querySelector(s);
const LOAD_FAIL = '정보를 불러오지 못했습니다. 새로고침해 주세요.';
const cache = new Map();
let ctx = null;

async function loadJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path} 불러오기 실패 (${res.status})`);
  const json = await res.json();
  cache.set(path, json);
  return json;
}

function pickIndustryId(meta) {
  const q = new URLSearchParams(location.search).get('industry');
  const ids = meta.industries.map((x) => x.id);
  return ids.includes(q) ? q : ids.includes(meta.defaultIndustry) ? meta.defaultIndustry : ids[0];
}

async function loadIndustry(meta, id) {
  const entry = meta.industries.find((x) => x.id === id);
  if (!entry) throw new Error(`등록되지 않은 산업: ${id}`);
  return loadJSON(`data/${entry.file}`);
}

/* ---------- 산업에 따라 바뀌는 머리말·꼬리말 ---------- */
function renderChrome() {
  const { meta, industry } = ctx;
  const c = industry.copy || {};
  document.title = `${meta.serviceName} — ${industry.name} 분야 일자리 안내`;
  $('#brandName').textContent = meta.serviceName;
  $('#logo').textContent = meta.logoText || '길';
  $('#tagline').textContent = c.tagline || `${meta.audience}을 위한 ${industry.name}분야 일자리 안내`;
  $('#scope').textContent = c.scopeBadge || `1차 버전 · ${industry.name}산업 분야 전용`;
  replaceChildren(
    $('#heroTitle'),
    (c.heroTitle || []).flatMap((line, i) => (i ? [h('br'), line] : [line])),
  );
  $('#heroDesc').textContent = c.heroDesc || '';
  replaceChildren($('#searchTip'), rich(c.searchTip || ''));

  const d = meta.checkedAt.split('-').join('.');
  replaceChildren(
    $('#footer'),
    '출처 표기: ',
    Object.entries(meta.badges).flatMap(([k, b], i) => [i ? ' · ' : '', h('span', { class: `badge b-${k}` }, b.label), ` ${b.desc}`]),
    h('br'),
    `${meta.footerNote} · 정보 확인일 `,
    h('time', { datetime: meta.checkedAt }, d),
    ` · v${meta.version}`,
  );
}

/* ---------- 동작 ---------- */
function run() {
  if (!state.fields.length && !state.customFields.length) {
    showFormMessage('관심 분야를 1개 이상 고르거나 직접 적어 주세요.');
    $('#fieldBox').scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    $('#fieldBox .chip')?.focus({ preventScroll: true });
    return;
  }
  try {
    showFormMessage('');
    renderResult(ctx);
    const title = $('#rTitle');
    title.focus({ preventScroll: true });
    $('#result').scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  } catch (err) {
    console.error(err);
    showFormMessage('결과를 만드는 중 문제가 생겼습니다. 다시 시도해 주세요.');
  }
}

function reset() {
  clearForm();
  hideResult();
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
  $('#formTitle').focus({ preventScroll: true });
}

function editInput() {
  $('#form').scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  $('#formTitle').focus({ preventScroll: true });
}

async function switchIndustry(id) {
  try {
    ctx.industry = await loadIndustry(ctx.meta, id);
    resetState();
    setFormContext(ctx);
    renderChrome();
    renderFormStatic();
    clearForm();
    hideResult();
    const url = new URL(location.href);
    url.searchParams.set('industry', id);
    history.replaceState(null, '', url);
  } catch (err) {
    console.error(err);
    showFormMessage(LOAD_FAIL);
  }
}

function toggleBigText(e) {
  const on = document.documentElement.classList.toggle('big');
  e.currentTarget.setAttribute('aria-pressed', String(on));
  e.currentTarget.textContent = on ? '가 기본 글씨로 보기' : '가 큰 글씨로 보기';
}

function showLoadError() {
  const box = $('#loadState');
  box.hidden = false;
  box.classList.add('error');
  replaceChildren(
    box,
    h('p', {}, LOAD_FAIL),
    h('button', { type: 'button', class: 'btn primary', onclick: () => location.reload() }, '새로고침'),
  );
  $('#app').hidden = true;
}

async function boot() {
  $('#fsBtn').addEventListener('click', toggleBigText);
  try {
    const [meta, groups, common, modifiers, sites, prompts, demos] = await Promise.all(
      ['meta', 'groups', 'common', 'modifiers', 'sites', 'prompts', 'demos'].map((n) => loadJSON(`data/${n}.json`)),
    );
    const industry = await loadIndustry(meta, pickIndustryId(meta));
    ctx = { meta, groups, common, modifiers, sites, prompts, demos, industry };
  } catch (err) {
    console.error(err);
    showLoadError();
    return;
  }

  setFormContext(ctx);
  renderChrome();
  renderFormStatic();
  drawAll();
  initForm({ onRun: run, onReset: reset, onIndustry: switchIndustry });
  initResult({ onEdit: editInput });

  $('#loadState').hidden = true;
  $('#app').hidden = false;
  document.documentElement.dataset.ready = 'true';
}

boot();
