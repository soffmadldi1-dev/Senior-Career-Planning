// 테스트 공통 도구
import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const readJSON = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

/**
 * page 픽스처 확장
 * - 외부 글꼴 CDN(jsdelivr)은 테스트 환경 네트워크가 막혀 있을 수 있어 빈 CSS로 대신합니다.
 * - 콘솔 오류·페이지 오류를 모아 두고, 각 테스트 끝에서 0개인지 확인합니다.
 */
export const test = base.extend({
  consoleErrors: async ({}, use) => use([]),
  page: async ({ page, consoleErrors }, use, testInfo) => {
    await page.route('**/cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '/* font stub */' }));
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
    await use(page);
    if (!testInfo.annotations.some((a) => a.type === 'allow-console-error')) {
      expect(consoleErrors, '콘솔 오류가 없어야 합니다').toEqual([]);
    }
  },
});
export { expect };

export async function openApp(page, url = '/') {
  await page.goto(url);
  await page.waitForSelector('html[data-ready="true"]');
}

export async function runDemo(page, index) {
  await page.locator('#demoBox summary').click();
  await page.locator(`[data-demo="${index}"]`).click();
  await expect(page.locator('#result')).toBeVisible();
}
