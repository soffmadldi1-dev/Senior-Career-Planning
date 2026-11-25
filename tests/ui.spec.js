// 1·2·3·5·7번 테스트 — 실제 브라우저에서 입력 화면과 결과 화면 동작 확인
import { test, expect, openApp, runDemo, readJSON } from './helpers.js';

const chip = (page, scope, text) => page.locator(`${scope} .chip`, { hasText: text }).first();

test.beforeEach(async ({ page }) => openApp(page));

test('1. 분야 전환에 따라 자격 목록이 바뀐다', async ({ page }) => {
  const cert = page.locator('#certBox');
  await expect(cert.getByText('2번에서 관심 분야를 고르면')).toBeVisible();

  const hotel = page.locator('#fieldBox [data-f="hotel"]');
  await hotel.click();
  await expect(hotel).toHaveAttribute('aria-pressed', 'true');
  await expect(cert.locator('[data-c="호텔서비스사"]')).toBeVisible();

  // 호텔 전용 자격을 골라 둔 뒤 호텔을 해제하면 선택에서도 빠져야 함
  await cert.locator('[data-c="호텔서비스사"]').click();
  await expect(page.locator('#selSummary')).toContainText('자격·경험 1개');
  await hotel.click();
  await page.locator('#fieldBox [data-f="cs"]').click();
  await expect(cert.locator('[data-c="텔레마케팅관리사"]')).toBeVisible();
  await expect(cert.locator('[data-c="호텔서비스사"]')).toHaveCount(0);
  await expect(page.locator('#selSummary')).toContainText('자격·경험 0개');
});

test('2. 공통 역량 [언어] 펼침·접힘과 고른 개수 표시', async ({ page }) => {
  const lang = page.locator('[data-cat="lang"]');
  await expect(lang).toHaveAttribute('aria-expanded', 'false');
  await lang.click();
  await expect(page.locator('[data-cat="lang"]')).toHaveAttribute('aria-expanded', 'true');
  const panel = page.locator('#panel-lang');
  await expect(panel.locator('.chip')).toHaveCount(11);

  await panel.locator('[data-c="영어"]').click();
  await page.locator('#panel-lang [data-c="일본어"]').click();
  await expect(page.locator('[data-cat="lang"] em')).toHaveText('2');
  await expect(page.locator('#panel-lang [data-c="영어"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('[data-cat="lang"]').click();
  await expect(page.locator('[data-cat="lang"]')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#panel-lang')).toHaveCount(0);
  await expect(page.locator('[data-cat="lang"] em')).toHaveText('2'); // 접어도 개수는 유지
});

test('2-1. 묶음 버튼을 키보드로 눌러도 포커스가 유지된다', async ({ page }) => {
  await page.locator('[data-cat="pc"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cat="pc"]')).toBeFocused();
  await expect(page.locator('[data-cat="pc"]')).toHaveAttribute('aria-expanded', 'true');
});

test('3. 직접 기입: 추가 → 칩 생성 → 중복 무시 → × 삭제', async ({ page }) => {
  await page.locator('[data-cat="custom"]').click();
  const input = page.locator('#certIn');
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();

  await input.fill('은행 창구 20년');
  await page.locator('[data-add="cert"]').click();
  const chips = page.locator('#certCustom .chip');
  await expect(chips).toHaveCount(1);
  await expect(chips.first()).toHaveText('은행 창구 20년');
  await expect(page.locator('[data-cat="custom"] em')).toHaveText('1');

  await input.fill('은행 창구 20년');
  await input.press('Enter'); // Enter로도 추가, 같은 단어는 무시
  await expect(chips).toHaveCount(1);

  await input.fill('가'.repeat(40)); // 30자 제한
  await input.press('Enter');
  await expect(chips).toHaveCount(2);
  expect((await chips.nth(1).textContent()).length).toBeLessThanOrEqual(30);

  await chips.first().click(); // × 삭제
  await expect(chips).toHaveCount(1);

  // 분야 직접 입력도 같은 방식
  await page.locator('#fieldIn').fill('크루즈');
  await page.locator('#fieldIn').press('Enter');
  await expect(page.locator('#fieldCustom .chip')).toHaveText(['크루즈']);
  await page.locator('#fieldCustom .chip').click();
  await expect(page.locator('#fieldCustom .chip')).toHaveCount(0);
});

test('직접 입력한 내용은 HTML로 해석되지 않는다', async ({ page }) => {
  await page.locator('#fieldIn').fill('<img src=x onerror=alert(1)>');
  await page.locator('#fieldIn').press('Enter');
  await page.locator('#runBtn').click();
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#result img')).toHaveCount(0);
  await expect(page.locator('#rTitle')).toContainText('<img');
});

test('분야 없이 [맞춤 안내 받기] → 안내 문구, 결과 없음', async ({ page }) => {
  await page.locator('#runBtn').click();
  await expect(page.locator('#formMsg')).toHaveText('관심 분야를 1개 이상 고르거나 직접 적어 주세요.');
  await expect(page.locator('#result')).toBeHidden();
  await expect(page.locator('#fieldBox')).toBeInViewport();
});

test('예시 인물: 입력칸이 채워지고 관련 묶음이 펼쳐지며 결과가 나온다', async ({ page }) => {
  await runDemo(page, 1);
  await expect(page.locator('#groupBox [data-v="women"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#age')).toHaveValue('40대');
  await expect(page.locator('#region')).toHaveValue('경기·인천');
  for (const k of ['lang', 'pc', 'custom']) await expect(page.locator(`[data-cat="${k}"]`)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#certCustom .chip')).toHaveText(['보험사 사무 10년']);
  await expect(page.locator('#kwCombo .kw > span')).toHaveText(['예약 상담원 영어 가능', '예약실 경력단절 우대', '하우스키핑 시간제', '룸메이드 경력단절 우대']);
  await expect(page.locator('#rTitle')).toHaveText('예약·고객상담 · 호텔·숙박 분야 맞춤 안내');
  await expect(page.locator('#rTitle')).toBeFocused();
});

test('결과 5개 탭: 클릭·키보드 이동과 탭별 내용', async ({ page }) => {
  await runDemo(page, 0); // 신중년·서울·관광안내
  const tabs = page.locator('[role="tab"]');
  await expect(tabs).toHaveCount(5);
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#p1')).toBeVisible();
  // ① 채용공고: 분야 sites 순서, 검색 순서 3단계, 분야 주의 박스
  await expect(page.locator('#jobBox .item h3')).toHaveText(['나라일터', '시·군·구청 · 지역 관광공사 누리집', '관광인 (관광전문인력포털)', '고용24']);
  await expect(page.locator('#jobBox .item').first().locator('ol li')).toHaveCount(3);
  await expect(page.locator('#warnBox .warn')).toContainText('만 60세 미만');

  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#p2')).toBeVisible();
  await expect(page.locator('#p1')).toBeHidden();
  // ② 서울 거주 신중년 → 중장년취업사관학교, 같은 이름은 하나만
  const eduNames = await page.locator('#eduBox h3').allTextContents();
  expect(eduNames).toContain('중장년취업사관학교 (서울시50플러스재단)');
  expect(new Set(eduNames).size).toBe(eduNames.length);

  await page.keyboard.press('ArrowRight');
  // ③ 관광일자리센터 + 신중년 기관(서울이면 50플러스 포함)
  await expect(page.locator('#comBox h3')).toHaveText(['한국관광공사 관광일자리센터', '중장년내일센터', '서울시50플러스재단 · 일자리몽땅']);

  await page.keyboard.press('ArrowLeft');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(tabs.nth(4)).toHaveAttribute('aria-selected', 'true');
  // ⑤ AI 질문문 4종 + 개인정보 안내
  await expect(page.locator('#promptBox .prompt')).toHaveCount(4);
  await expect(page.locator('#promptBox .prompt b')).toHaveText(['나에게 맞는 일 찾기', '공고 쉽게 풀어보기', '이력서 경력 문장 만들기', '면접 연습하기']);
  await expect(page.locator('#aiNotice')).toContainText('개인정보는 넣지 마세요');
  await expect(page.locator('#pp0')).toContainText('- 나: 신중년, 50대 후반, 서울 거주');
  await expect(page.locator('#pp0')).toContainText('관광산업 중 관광안내·해설');
  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
});

test('④ 로드맵: 3단계·갈 수 있는 길·이번 주 할 일 7개(그룹별 3일차, 분야별 5일차)', async ({ page }) => {
  await runDemo(page, 2); // 시니어·관광지+호텔
  await page.locator('#tab-p4').click();
  await expect(page.locator('#roadBox .stage')).toHaveCount(3);
  await expect(page.locator('#roadBox')).toContainText('"시설물관리원"');
  const paths = page.locator('#pathBox .path');
  expect(await paths.count()).toBeLessThanOrEqual(8);
  const todo = page.locator('#todoBox li');
  await expect(todo).toHaveCount(7);
  await expect(todo.nth(3)).toContainText('노인일자리 여기 지역 공고 확인');
  await expect(todo.nth(5)).toContainText('나라일터에 공공 시설 공고 확인');
  await expect(todo.nth(1)).toContainText('"시설물관리원 시니어"');
  await expect(page.locator('#todoProgress')).toHaveText('7개 중 0개 완료');
  await todo.nth(0).locator('label').click();
  await expect(todo.nth(0)).toHaveCSS('background-color', 'rgb(232, 246, 239)');
  await expect(page.locator('#todoProgress')).toHaveText('7개 중 1개 완료');
});

test('① 시니어·60세 이상 연령 주의 문구 / 경력보유여성 새일센터 교육', async ({ page }) => {
  // 연령 주의는 관광안내·관광지 분야를 고르지 않았을 때 추가
  await page.locator('#groupBox [data-v="senior"]').click();
  await page.locator('#fieldBox [data-f="hotel"]').click();
  await page.locator('#runBtn').click();
  await expect(page.locator('#warnBox')).toContainText('정년(만 60세)');
  await page.locator('#editBtn').click();
  await page.locator('#groupBox [data-v="women"]').click();
  await page.locator('#runBtn').click();
  await expect(page.locator('#warnBox')).not.toContainText('정년(만 60세)');
  await page.locator('#tab-p2').click();
  await expect(page.locator('#eduBox')).toContainText('새일센터 직업교육훈련');
  await page.locator('#tab-p3').click();
  await expect(page.locator('#comBox a[href="tel:15441199"]')).toBeVisible();
});

test('지역 조건: 서울이 아니면 50플러스 기관이 나오지 않는다', async ({ page }) => {
  await page.locator('#groupBox [data-v="mid"]').click();
  await page.selectOption('#region', '경기·인천');
  await page.locator('#fieldBox [data-f="travel"]').click();
  await page.locator('#runBtn').click();
  await page.locator('#tab-p3').click();
  await expect(page.locator('#comBox')).not.toContainText('50플러스');
  await page.locator('#tab-p2').click();
  await expect(page.locator('#eduBox')).not.toContainText('중장년취업사관학교');
});

test('나이와 대상이 맞지 않으면 부드럽게 알려 준다', async ({ page }) => {
  await page.selectOption('#age', '65세 이상');
  await expect(page.locator('#ageHint')).toContainText("'시니어' 대상");
  await page.locator('#groupBox [data-v="senior"]').click();
  await expect(page.locator('#ageHint')).toBeHidden();
  await page.selectOption('#age', '40대');
  await expect(page.locator('#ageHint')).toContainText('나이가 다릅니다');
});

test('5. 예시 실행 후 [처음부터 다시] → 모든 입력·결과가 비어 있다', async ({ page }) => {
  await runDemo(page, 1);
  await page.locator('[data-cat="lang"]').waitFor();
  await page.locator('#fieldIn').fill('작성 중');
  await page.locator('#resetBtn').click();

  await expect(page.locator('#result')).toBeHidden();
  await expect(page.locator('#form [aria-pressed="true"]:not([data-industry])')).toHaveCount(0);
  await expect(page.locator('#form [aria-expanded="true"]')).toHaveCount(0);
  for (const s of ['#age', '#region', '#free', '#fieldIn', '#certIn']) await expect(page.locator(s)).toHaveValue('');
  await expect(page.locator('#fieldCustom .chip, #certCustom .chip')).toHaveCount(0);
  await expect(page.locator('#customWrap')).toBeHidden();
  await expect(page.locator('#kwJob .kw, #promptBox .prompt, #todoBox li')).toHaveCount(0);
  await expect(page.locator('#demoBox')).not.toHaveAttribute('open', '');
  await expect(page.locator('#selSummary')).toHaveText('지금 고른 것: 관심 분야 0개 · 자격·경험 0개');
});

test('복사: 성공하면 안내 토스트, 클립보드에 단어가 들어간다', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await runDemo(page, 0);
  await page.locator('#kwCombo .cp').first().click();
  await expect(page.locator('#toast')).toContainText('복사 완료');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('관광통역안내사 일본어 가능');
  await page.locator('#tab-p5').click();
  await page.locator('[data-copyp="2"]').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('[작업 순서]');
});

test('복사 실패 시 "길게 눌러 직접 복사" 안내', async ({ page }) => {
  await runDemo(page, 0);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('막힘')) } });
    document.execCommand = () => false;
  });
  await page.locator('#kwJob .cp').first().click();
  await expect(page.locator('#toast')).toHaveText('복사가 안 되면 단어를 길게 눌러 직접 복사해 주세요');
});

test('큰 글씨 토글: 17px ↔ 20px', async ({ page }) => {
  const fs = () => page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  expect(await fs()).toBe('17px');
  await page.locator('#fsBtn').click();
  await expect(page.locator('#fsBtn')).toHaveAttribute('aria-pressed', 'true');
  expect(await fs()).toBe('20px');
  await page.locator('#fsBtn').click();
  expect(await fs()).toBe('17px');
});

test('하단에 meta.json의 정보 확인일이 자동 표시된다', async ({ page }) => {
  const { checkedAt } = readJSON('data/meta.json');
  await expect(page.locator('#footer time')).toHaveText(checkedAt.replaceAll('-', '.'));
});

test('alert·confirm을 쓰지 않는다', async ({ page }) => {
  let dialogs = 0;
  page.on('dialog', (d) => {
    dialogs++;
    d.dismiss();
  });
  await page.locator('#runBtn').click();
  await runDemo(page, 2);
  await page.locator('#resetBtn').click();
  expect(dialogs).toBe(0);
});
