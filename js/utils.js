// 공통 도구: 이스케이프, 중복 제거, 자리표시자 채우기, DOM 만들기, 복사, 토스트

/** HTML 특수문자를 안전하게 바꿉니다. (화면 출력은 textContent를 우선 사용하고, 속성값 등에 보조로 씁니다) */
export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** 빈 값을 빼고 순서를 지키며 중복을 없앱니다. */
export const uniq = (arr) => [...new Set((arr || []).filter(Boolean))];

/**
 * 문구 안의 {이름} 자리표시자를 채웁니다. 모르는 이름은 그대로 둡니다.
 * 예: fill('"{kw0}" 검색', { kw0: '하우스키핑' }) → '"하우스키핑" 검색'
 */
export function fill(str, vars = {}) {
  return String(str ?? '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
}

/**
 * 요소를 만듭니다. 문자열 자식은 항상 텍스트 노드로 들어가므로 HTML이 해석되지 않습니다.
 * h('a', { href: url, class: 'go' }, '바로가기')
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === undefined || c === null || c === false || c === '') continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/**
 * **굵게** 표기만 <b>로 바꿔 넣습니다. HTML은 해석하지 않습니다(데이터에 HTML을 넣지 않기 위한 장치).
 */
export function rich(text) {
  const frag = document.createDocumentFragment();
  String(text ?? '')
    .split(/(\*\*[^*]+\*\*)/g)
    .forEach((part) => {
      if (!part) return;
      if (part.startsWith('**') && part.endsWith('**')) frag.append(h('b', {}, part.slice(2, -2)));
      else frag.append(document.createTextNode(part));
    });
  return frag;
}

/** 요소의 내용을 비우고 새 자식으로 채웁니다. */
export function replaceChildren(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

/* ---------- 토스트 ---------- */
let toastTimer;
export function toast(message) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---------- 복사 ---------- */
export const COPY_FAIL_MSG = '복사가 안 되면 단어를 길게 눌러 직접 복사해 주세요';

/** 예전 방식 복사(일부 메신저 앱 안 브라우저 대비). 성공하면 true */
function legacyCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand && document.execCommand('copy');
    ta.remove();
    return !!ok;
  } catch {
    return false;
  }
}

/** 클립보드에 복사하고 결과를 토스트로 알려 줍니다. */
export async function copyText(text, okMessage) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      toast(okMessage);
      return true;
    }
  } catch {
    /* 아래 예전 방식으로 한 번 더 시도 */
  }
  if (legacyCopy(text)) {
    toast(okMessage);
    return true;
  }
  toast(COPY_FAIL_MSG);
  return false;
}
