// 6. 반응형·품질 기준 — 4개 너비 × (기본/큰 글씨)
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, openApp, runDemo, ROOT } from './helpers.js';
import { auditPage } from './audit.js';

const WIDTHS = [360, 390, 768, 1180];
const SHOTS = path.join(ROOT, 'tests', 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

async function audit(page, label) {
  const issues = await page.evaluate(`(${auditPage.toString()})()`);
  expect(issues, `${label} 품질 점검`).toEqual([]);
}

for (const width of WIDTHS) {
  for (const big of [false, true]) {
    const mode = big ? '큰글씨' : '기본';
    test(`${width}px · ${mode}: 가로 스크롤·넘침·터치·대비·줄바꿈`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openApp(page);
      if (big) await page.locator('#fsBtn').click();

      // 입력 화면: 모든 묶음을 펼친 상태
      await page.locator('#fieldBox [data-f="hotel"]').click();
      await page.locator('#fieldBox [data-f="guide"]').click();
      for (const k of ['lang', 'pc', 'svc', 'lic', 'life', 'custom']) await page.locator(`[data-cat="${k}"]`).click();
      await page.locator('#certIn').fill('해외 주재원 3년 근무 경험');
      await page.locator('#certIn').press('Enter');
      await page.locator('#demoBox summary').click();
      await audit(page, `${width}/${mode}/입력`);
      await page.screenshot({ path: path.join(SHOTS, `${width}-${big ? 'big' : 'base'}-form.png`), fullPage: true });

      // 결과 화면: 예시2(가장 긴 결과) + 5개 탭 모두
      await page.locator('[data-demo="1"]').click();
      await expect(page.locator('#result')).toBeVisible();
      for (const id of ['p1', 'p2', 'p3', 'p4', 'p5']) {
        await page.locator(`#tab-${id}`).click();
        await audit(page, `${width}/${mode}/결과 ${id}`);
        if (id === 'p1' || id === 'p4') {
          await page.locator('#result').screenshot({ path: path.join(SHOTS, `${width}-${big ? 'big' : 'base'}-result-${id}.png`) });
        }
      }
    });
  }
}

test('탭 칸 수: PC 5열 / 태블릿 3열 / 모바일 2열', async ({ page }) => {
  await openApp(page);
  await runDemo(page, 0);
  const cols = () => page.locator('.tabs').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  for (const [w, n] of [[1180, 5], [768, 3], [390, 2]]) {
    await page.setViewportSize({ width: w, height: 900 });
    expect(await cols(), `${w}px`).toBe(n);
  }
});

test('포커스 표시가 보인다', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press('Tab'); // 본문 바로가기
  await page.keyboard.press('Tab'); // 큰 글씨 버튼
  const outline = await page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement);
    return [document.activeElement.id, cs.outlineStyle, parseFloat(cs.outlineWidth)];
  });
  expect(outline[0]).toBe('fsBtn');
  expect(outline[1]).not.toBe('none');
  expect(outline[2]).toBeGreaterThanOrEqual(2);
});

test('prefers-reduced-motion 이면 애니메이션을 끈다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  expect(await page.locator('#toast').evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');
});
