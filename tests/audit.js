// 브라우저 안에서 실행하는 품질 점검 함수 (page.evaluate 로 주입)
// 반환: 문제 목록(문자열). 비어 있으면 통과.
export function auditPage() {
  const issues = [];
  const de = document.documentElement;
  const vw = de.clientWidth;
  const desc = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${id}${cls} "${(el.textContent || '').trim().slice(0, 24)}"`;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.opacity === '0' || cs.display === 'none') return false;
    }
    return true;
  };
  const skip = (el) => el.closest('.skip, #toast, noscript');
  const all = [...document.body.querySelectorAll('*')].filter((el) => !skip(el) && visible(el));

  // 1) 가로 스크롤
  if (de.scrollWidth > vw) issues.push(`가로 스크롤: scrollWidth ${de.scrollWidth} > clientWidth ${vw}`);

  // 2) 화면·박스 밖으로 넘친 요소/글자
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 0.5 || r.left < -0.5) issues.push(`화면 밖: ${desc(el)} (${Math.round(r.left)}~${Math.round(r.right)})`);
    const cs = getComputedStyle(el);
    if (cs.display === 'inline' || el.tagName === 'SELECT' || el.tagName === 'INPUT') continue;
    if (['auto', 'scroll'].includes(cs.overflowX)) continue;
    if (el.scrollWidth > el.clientWidth + 1) issues.push(`박스 넘침: ${desc(el)} (${el.scrollWidth}>${el.clientWidth})`);
  }

  // 3) 터치 영역 44px 이상 (체크박스는 감싼 줄 전체가 눌리는 영역)
  for (const el of all.filter((e) => e.matches('button, a[href], select, input, summary'))) {
    let r = el.getBoundingClientRect();
    if (el.matches('input[type=checkbox]')) r = el.closest('li').getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) issues.push(`터치 영역 작음: ${desc(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }

  // 4) 입력 글자 16px 이상
  for (const el of all.filter((e) => e.matches('input[type=text], select'))) {
    if (parseFloat(getComputedStyle(el).fontSize) < 16) issues.push(`입력 글자 작음: ${desc(el)}`);
  }

  // 5) 색 대비 WCAG AA
  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const bgOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.length >= 3 && (c.length === 3 || c[3] > 0)) return c.slice(0, 3);
    }
    return [255, 255, 255];
  };
  for (const el of all) {
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color).slice(0, 3);
    const [a, b] = [lum(fg), lum(bgOf(el))];
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5) - 0.01) issues.push(`색 대비 부족 ${ratio.toFixed(2)}: ${desc(el)}`);
  }

  // 6) 제목·버튼의 마지막 1~2글자 홀로 줄바꿈
  for (const el of all.filter((e) => e.matches('h1, h2, h3, h4, h5, button, summary, .tab b'))) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const s = t.textContent;
      if (!s.trim()) continue;
      const lines = new Map();
      const range = document.createRange();
      for (let i = 0; i < s.length; i++) {
        if (/\s/.test(s[i])) continue;
        range.setStart(t, i);
        range.setEnd(t, i + 1);
        const rr = range.getClientRects()[0];
        if (!rr) continue;
        const key = Math.round(rr.top);
        lines.set(key, (lines.get(key) || 0) + 1);
      }
      if (lines.size > 1) {
        const last = [...lines.entries()].sort((x, y) => x[0] - y[0]).pop()[1];
        if (last <= 2) issues.push(`마지막 ${last}글자 홀로 줄바꿈: ${desc(el)}`);
      }
    }
  }
  return [...new Set(issues)];
}
