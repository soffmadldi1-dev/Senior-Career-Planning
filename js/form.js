// 입력 화면: 대상·나이·지역, 분야 카드, 자격 목록(분야 연동), 공통 역량 펼침, 직접 입력, 예시 인물
import { state, toggleField, toggleCert, toggleOpen, addCustom, removeCustom, resetState, CUSTOM_MAX_LEN } from './state.js';
import { h, replaceChildren, toast } from './utils.js';

const $ = (s) => document.querySelector(s);
let ctx = null;

export function setFormContext(next) {
  ctx = next;
}

/* ---------- 정적 영역(데이터에서 한 번 그리는 부분) ---------- */
export function renderFormStatic() {
  const { meta, groups, industry, common, demos } = ctx;

  // 대상
  replaceChildren(
    $('#groupBox'),
    groups.groups.map((g) =>
      h('button', { type: 'button', class: 'chip', 'data-v': g.key, 'aria-pressed': 'false' }, g.label, h('small', {}, g.desc)),
    ),
  );

  // 나이·사는 곳
  const opts = (list) => [h('option', { value: '' }, '선택하세요'), ...list.map((v) => h('option', { value: v }, v))];
  replaceChildren($('#age'), opts(meta.ageOptions));
  replaceChildren($('#region'), opts(meta.regionOptions));

  // 산업 선택(산업이 2개 이상 등록되었을 때만 보임)
  const box = $('#industryBox');
  box.hidden = meta.industries.length < 2;
  replaceChildren(
    $('#industryChips'),
    meta.industries.map((it) =>
      h('button', { type: 'button', class: 'chip', 'data-industry': it.id, 'aria-pressed': String(it.id === industry.id) }, it.name),
    ),
  );

  // 분야
  $('#fieldTitle').textContent = `2. 관심 있는 ${industry.name} 분야`;
  replaceChildren(
    $('#fieldBox'),
    industry.fields.map((f) =>
      h(
        'button',
        { type: 'button', class: 'chip', 'data-f': f.key, 'aria-pressed': 'false' },
        f.name,
        h('small', {}, f.example),
        h('small', {}, `법정 업종: ${f.law}`),
      ),
    ),
  );
  $('#fieldIn').placeholder = industry.copy?.fieldPlaceholder || '목록에 없는 분야·직무를 적어 주세요';
  $('#fieldBasis').textContent = industry.basis || '';
  $('#certBasis').textContent = industry.certBasis || '';
  $('#free').placeholder = industry.copy?.freePlaceholder || '';

  const customCat = common.categories.find((c) => c.isCustom);
  $('#certIn').placeholder = customCat?.placeholder || '';
  $('#fieldIn').maxLength = CUSTOM_MAX_LEN;
  $('#certIn').maxLength = CUSTOM_MAX_LEN;

  // 예시 인물
  replaceChildren(
    $('#demos'),
    demos
      .map((d, i) => [d, i])
      .filter(([d]) => !d.industry || d.industry === industry.id)
      .map(([d, i]) => h('button', { type: 'button', class: 'chip', 'data-demo': i }, d.label, h('small', {}, d.sub))),
  );
}

/* ---------- 상태 → 화면 동기화 ---------- */
function syncPressed(container, attr, isOn) {
  container.querySelectorAll(`[${attr}]`).forEach((el) => el.setAttribute('aria-pressed', String(isOn(el.getAttribute(attr)))));
}

/** 다시 그린 뒤에도 키보드 포커스를 같은 버튼에 돌려놓기 위한 도우미 */
function keepFocus(container, draw) {
  const a = document.activeElement;
  const key = a && container.contains(a) ? ['data-c', 'data-cat'].find((k) => a.hasAttribute(k)) : null;
  const sel = key ? `[${key}="${CSS.escape(a.getAttribute(key))}"]` : null;
  const nth = sel ? [...container.querySelectorAll(sel)].indexOf(a) : -1;
  draw();
  if (sel) {
    const list = container.querySelectorAll(sel);
    (list[nth] || list[0])?.focus();
  }
}

export function drawCerts() {
  const { industry, common } = ctx;
  const box = $('#certBox');
  keepFocus(box, () => {
    const chip = (v) => h('button', { type: 'button', class: 'chip', 'data-c': v, 'aria-pressed': String(state.certs.includes(v)) }, v);
    const parts = [];
    if (!state.fields.length) {
      parts.push(h('p', { class: 'empty' }, `2번에서 관심 분야를 고르면, 그 분야에 맞는 자격·경험 항목이 여기에 나타납니다.`));
    }
    const byKey = new Map(industry.fields.map((f) => [f.key, f]));
    state.fields.forEach((k) => {
      const f = byKey.get(k);
      if (!f) return;
      parts.push(h('div', { class: 'cgroup' }, h('h4', {}, `${f.name} 관련`), h('div', { class: 'chips' }, f.certs.map(chip))));
    });

    const cats = common.categories.map((c) => {
      const n = c.isCustom ? state.customCerts.length : c.items.filter((v) => state.certs.includes(v)).length;
      const open = state.open.includes(c.key);
      return h(
        'button',
        {
          type: 'button',
          class: 'cat',
          'data-cat': c.key,
          'aria-expanded': String(open),
          'aria-controls': c.isCustom ? 'customWrap' : `panel-${c.key}`,
        },
        h('b', {}, c.name, n ? h('em', { 'aria-label': `${n}개 선택` }, String(n)) : null),
        h('small', {}, c.desc),
        h('i', { 'aria-hidden': 'true' }, open ? '−' : '+'),
      );
    });
    const panels = common.categories
      .filter((c) => !c.isCustom && state.open.includes(c.key))
      .map((c) => h('div', { class: 'catpanel', id: `panel-${c.key}` }, h('h5', {}, c.name), h('div', { class: 'chips' }, c.items.map(chip))));

    parts.push(
      h(
        'div',
        { class: 'common' },
        h('h4', {}, common.title),
        h('p', { class: 'hint commonhint' }, common.hint),
        h('div', { class: 'cats' }, cats),
        panels,
      ),
    );
    replaceChildren(box, parts);
  });
  const customCat = common.categories.find((c) => c.isCustom);
  $('#customWrap').hidden = !(customCat && state.open.includes(customCat.key));
  drawSummary();
}

export function drawCustom() {
  const chip = (listKey, v, i) =>
    h('button', { type: 'button', class: 'chip custom', 'aria-pressed': 'true', 'data-rm': listKey, 'data-i': i, 'aria-label': `${v} 삭제` }, v);
  replaceChildren($('#fieldCustom'), state.customFields.map((v, i) => chip('customFields', v, i)));
  replaceChildren($('#certCustom'), state.customCerts.map((v, i) => chip('customCerts', v, i)));
  drawSummary();
}

export function drawChoices() {
  syncPressed($('#groupBox'), 'data-v', (v) => v === state.group);
  syncPressed($('#fieldBox'), 'data-f', (v) => state.fields.includes(v));
  $('#age').value = state.age;
  $('#region').value = state.region;
  $('#free').value = state.free;
  drawAgeHint();
}

/** 나이와 대상이 서로 맞지 않으면 부드럽게 알려 줍니다(진행은 막지 않음). */
function drawAgeHint() {
  const el = $('#ageHint');
  const { groups } = ctx;
  let msg = '';
  if (state.age) {
    const g = groups.groups.find((x) => x.key === state.group);
    const fits = (x) => (x.ages || []).includes(state.age);
    if (!g) {
      const s = groups.groups.find(fits);
      if (s) msg = `"${state.age}"는 '${s.label}' 대상입니다. 위에서 대상을 고르면 맞는 지원 기관까지 함께 안내합니다.`;
    } else if ((g.ages || []).length && !fits(g)) {
      const s = groups.groups.find(fits);
      msg = `'${g.label}'(${g.desc})과 나이가 다릅니다.${s ? ` "${state.age}"는 보통 '${s.label}' 대상입니다.` : ''} 맞게 고르셨는지 한 번 확인해 주세요.`;
    }
  }
  el.textContent = msg;
  el.hidden = !msg;
}

function drawSummary() {
  const nf = state.fields.length + state.customFields.length;
  const nc = state.certs.length + state.customCerts.length;
  $('#selSummary').textContent = `지금 고른 것: 관심 분야 ${nf}개 · 자격·경험 ${nc}개`;
}

export function drawAll() {
  drawChoices();
  drawCerts();
  drawCustom();
}

/* ---------- 이벤트 ---------- */
export function initForm({ onRun, onReset, onIndustry }) {
  $('#groupBox').addEventListener('click', (e) => {
    const c = e.target.closest('[data-v]');
    if (!c) return;
    state.group = c.dataset.v;
    drawChoices();
  });
  $('#age').addEventListener('change', (e) => {
    state.age = e.target.value;
    drawAgeHint();
  });
  $('#region').addEventListener('change', (e) => (state.region = e.target.value));
  $('#free').addEventListener('input', (e) => (state.free = e.target.value));

  $('#industryChips').addEventListener('click', (e) => {
    const c = e.target.closest('[data-industry]');
    if (c && c.dataset.industry !== ctx.industry.id) onIndustry(c.dataset.industry);
  });

  $('#fieldBox').addEventListener('click', (e) => {
    const c = e.target.closest('[data-f]');
    if (!c) return;
    toggleField(c.dataset.f, ctx.industry, ctx.common);
    $('#formMsg').textContent = '';
    drawChoices();
    drawCerts();
  });

  $('#certBox').addEventListener('click', (e) => {
    const c = e.target.closest('[data-c]');
    if (c) {
      toggleCert(c.dataset.c);
      drawCerts();
      return;
    }
    const cat = e.target.closest('[data-cat]');
    if (cat) {
      const opened = toggleOpen(cat.dataset.cat);
      drawCerts();
      const isCustom = ctx.common.categories.find((x) => x.key === cat.dataset.cat)?.isCustom;
      if (isCustom && opened) $('#certIn').focus();
    }
  });

  // 직접 입력: [추가] 버튼과 Enter
  const add = (kind) => {
    const input = kind === 'field' ? $('#fieldIn') : $('#certIn');
    const listKey = kind === 'field' ? 'customFields' : 'customCerts';
    const v = input.value;
    if (!v.trim()) {
      input.focus();
      return;
    }
    const added = addCustom(listKey, v);
    if (!added) toast('이미 추가한 항목입니다');
    input.value = '';
    input.focus();
    drawCustom();
    if (kind === 'cert') drawCerts();
    else $('#formMsg').textContent = '';
  };
  document.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => add(b.dataset.add)));
  [
    ['#fieldIn', 'field'],
    ['#certIn', 'cert'],
  ].forEach(([sel, kind]) =>
    $(sel).addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        add(kind);
      }
    }),
  );

  // 직접 입력 칩 × 삭제
  $('#form').addEventListener('click', (e) => {
    const r = e.target.closest('[data-rm]');
    if (!r) return;
    const listKey = r.dataset.rm;
    removeCustom(listKey, Number(r.dataset.i));
    drawCustom();
    if (listKey === 'customCerts') drawCerts();
    (listKey === 'customFields' ? $('#fieldIn') : $('#certIn')).focus();
  });

  // 예시 인물
  $('#demos').addEventListener('click', (e) => {
    const c = e.target.closest('[data-demo]');
    if (!c) return;
    applyDemo(ctx.demos[Number(c.dataset.demo)]);
    onRun();
  });

  $('#runBtn').addEventListener('click', onRun);
  $('#resetBtn').addEventListener('click', onReset);
}

/** 예시 인물의 입력값을 채우고, 관련 공통 역량 묶음을 펼칩니다. */
export function applyDemo(d) {
  const { common, industry } = ctx;
  resetState();
  const fieldKeys = new Set(industry.fields.map((f) => f.key));
  Object.assign(state, {
    group: d.group || '',
    age: d.age || '',
    region: d.region || '',
    fields: (d.fields || []).filter((k) => fieldKeys.has(k)),
    certs: [...(d.certs || [])],
    customFields: [...(d.customFields || [])],
    customCerts: [...(d.customCerts || [])],
    free: d.free || '',
  });
  state.open = common.categories
    .filter((c) => (c.isCustom ? state.customCerts.length > 0 : c.items.some((v) => state.certs.includes(v))))
    .map((c) => c.key);
  $('#fieldIn').value = '';
  $('#certIn').value = '';
  $('#formMsg').textContent = '';
  drawAll();
}

/** [처음부터 다시]: 입력칸까지 모두 비웁니다. */
export function clearForm() {
  resetState();
  $('#fieldIn').value = '';
  $('#certIn').value = '';
  $('#formMsg').textContent = '';
  const demo = $('#demoBox');
  if (demo) demo.open = false;
  drawAll();
}

export function showFormMessage(text) {
  $('#formMsg').textContent = text;
}

