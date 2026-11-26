// 공유 미리보기 이미지 생성: node tools/make-og.mjs → assets/og.png (1200×630)
import { chromium } from '@playwright/test';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(`file://${path.join(root, 'tools/og-template.html')}`);
await page.screenshot({ path: path.join(root, 'assets/og.png') });
await browser.close();
console.log('assets/og.png 생성 완료');
