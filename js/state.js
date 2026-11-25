// 입력 상태 한곳 관리. 화면 그리기는 form.js / result.js 가 맡습니다.

const blank = () => ({
  group: '', // 대상: mid | senior | women
  age: '',
  region: '',
  fields: [], // 고른 분야 key (고른 순서 유지)
  certs: [], // 고른 자격·경험 (목록에서 고른 것)
  customFields: [], // 직접 입력한 분야
  customCerts: [], // 직접 기입한 자격·경험
  open: [], // 펼친 공통 역량 묶음 key
  free: '', // 한 줄 희망
});

export const state = blank();

export const CUSTOM_MAX_LEN = 30;

/** 모든 입력을 처음 상태로 되돌립니다. */
export function resetState() {
  Object.assign(state, blank());
}

/** 지금 고를 수 있는 자격 목록 = 고른 분야의 자격 + 공통 역량 */
export function certPool(industry, common) {
  const byKey = new Map(industry.fields.map((f) => [f.key, f]));
  const fieldCerts = state.fields.flatMap((k) => byKey.get(k)?.certs || []);
  const commonCerts = common.categories.flatMap((c) => c.items || []);
  return [...new Set([...fieldCerts, ...commonCerts])];
}

/** 분야 선택/해제. 해제하면 그 분야에만 있던 자격은 선택에서 빠집니다. */
export function toggleField(key, industry, common) {
  const on = !state.fields.includes(key);
  state.fields = state.fields.filter((k) => k !== key);
  if (on) state.fields.push(key);
  const pool = certPool(industry, common);
  state.certs = state.certs.filter((c) => pool.includes(c));
  return on;
}

export function toggleCert(value) {
  state.certs = state.certs.includes(value) ? state.certs.filter((c) => c !== value) : [...state.certs, value];
}

export function toggleOpen(catKey) {
  state.open = state.open.includes(catKey) ? state.open.filter((k) => k !== catKey) : [...state.open, catKey];
  return state.open.includes(catKey);
}

/**
 * 직접 입력 추가. 앞뒤 공백 제거, 30자 제한, 중복 무시.
 * @param {'customFields'|'customCerts'} listKey
 * @returns {boolean} 새로 추가되었으면 true
 */
export function addCustom(listKey, raw) {
  const v = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, CUSTOM_MAX_LEN);
  if (!v || state[listKey].includes(v)) return false;
  state[listKey].push(v);
  return true;
}

export function removeCustom(listKey, index) {
  state[listKey].splice(index, 1);
}
