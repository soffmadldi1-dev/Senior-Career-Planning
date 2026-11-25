// 데이터 불러오기 실패 / 산업 확장 구조 확인
import { test, expect, openApp, readJSON } from './helpers.js';

test('데이터를 못 불러오면 빈 화면 대신 안내 문구', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'allow-console-error', description: '의도적으로 404를 만듭니다' });
  await page.route('**/data/groups.json', (r) => r.fulfill({ status: 404, body: 'not found' }));
  await page.goto('/');
  await expect(page.locator('#loadState')).toHaveText(/정보를 불러오지 못했습니다\. 새로고침해 주세요\./);
  await expect(page.locator('#loadState button')).toHaveText('새로고침');
  await expect(page.locator('#app')).toBeHidden();
});

test('산업이 1개면 산업 선택이 보이지 않는다', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#industryBox')).toBeHidden();
  await expect(page.locator('#fieldTitle')).toHaveText('2. 관심 있는 관광 분야');
});

test('확장: meta.json에 산업 JSON만 등록하면 선택·화면이 바뀐다', async ({ page }) => {
  const meta = readJSON('data/meta.json');
  const office = readJSON('data/industries/tourism.json');
  office.id = 'office';
  office.name = '사무';
  office.copy = { ...office.copy, tagline: '사무 분야 시험용', heroTitle: ['사무 분야 시험 화면'] };
  office.fields = [{ ...office.fields[5], key: 'desk', name: '사무 보조', keywords: ['사무보조', '경리 사무원'], certToKeyword: {}, backOffice: [] }];
  meta.industries.push({ id: 'office', name: '사무', file: 'industries/office.json' });
  await page.route('**/data/meta.json', (r) => r.fulfill({ json: meta }));
  await page.route('**/data/industries/office.json', (r) => r.fulfill({ json: office }));

  await openApp(page);
  await expect(page.locator('#industryBox')).toBeVisible();
  await page.locator('[data-industry="office"]').click();
  await expect(page.locator('#fieldTitle')).toHaveText('2. 관심 있는 사무 분야');
  await expect(page.locator('#heroTitle')).toHaveText('사무 분야 시험 화면');
  await expect(page.locator('#fieldBox .chip')).toHaveCount(1);
  await expect(page.locator('#demos .chip')).toHaveCount(0); // 관광 예시는 숨김
  await page.locator('[data-f="desk"]').click();
  await page.locator('#runBtn').click();
  await expect(page.locator('#kwJob .kw > span')).toHaveText(['사무보조', '경리 사무원']);
  await expect(page).toHaveURL(/industry=office/);

  // 주소로 바로 열어도 같은 산업
  await openApp(page, '/?industry=office');
  await expect(page.locator('#fieldTitle')).toHaveText('2. 관심 있는 사무 분야');
});
