# 다시, 일 길잡이 (1차 버전 · 관광산업)

신중년(만 40~64세)·시니어(만 65세 이상)·경력보유여성이 **관심 분야와 자격·경험을 고르면**, 채용공고에 실제로 쓰이는 **맞춤 검색어**를 만들어 주고 그 검색어로 **① 채용공고 ② 교육·자격 ③ 상담·커뮤니티 ④ 나의 로드맵 ⑤ AI에게 물어보기**를 안내하는 정적 웹 도구입니다.

- 프레임워크·빌드 도구 없음: HTML + CSS + 순수 JavaScript(ES Modules)
- 모든 내용은 `data/*.json`에 있습니다. **새 산업은 데이터 파일만 추가하면 됩니다.**
- 입력값은 서버로 보내지 않고, 외부 분석·추적 스크립트도 없습니다.

---

## 1. 실행 방법 (내 컴퓨터에서 보기)

JSON을 `fetch()`로 불러오기 때문에 파일을 더블클릭(`file://`)해서 열면 동작하지 않습니다. 아래 둘 중 하나로 간단한 서버를 띄웁니다.

```bash
python3 -m http.server 8080
```

```bash
npx serve .
```

브라우저에서 `http://localhost:8080` 을 엽니다(`npx serve`는 화면에 표시된 주소).

## 2. 배포 방법

빌드 과정이 없으므로 폴더를 그대로 올리면 됩니다. `reference/`, `tests/`, `node_modules/`는 배포에 필요 없습니다.

**GitHub Pages (자동 배포 설정됨)**
1. 처음 한 번만: 저장소 → Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 선택
2. 이후 `main`에 반영될 때마다 `.github/workflows/pages.yml`이 배포용 파일(`index.html`, `css`, `js`, `data`)만 모아 자동 배포
3. 주소: `https://soffmadldi1-dev.github.io/Senior-Career-Planning/` (Actions 탭에서 진행 상황 확인)

PR을 올리거나 `main`에 반영하면 `.github/workflows/tests.yml`이 Playwright 테스트를 자동으로 실행합니다.

**Vercel**
1. vercel.com → Add New → Project → 저장소 선택
2. Framework Preset: `Other`, Build Command·Output Directory는 비워 둠 → Deploy

## 3. 테스트

```bash
npm install
```

```bash
npx playwright test
```

| 파일 | 확인 내용 |
|---|---|
| `tests/keywords.spec.js` | 검색어 규칙 — 예시 인물 3명 기준값, 개수 제한, 중복 제거 |
| `tests/ui.spec.js` | 분야 전환·공통 역량 펼침·직접 기입·초기화·탭 키보드·복사·큰 글씨·콘솔 오류 0 |
| `tests/responsive.spec.js` | 360/390/768/1180px × 기본/큰 글씨: 가로 스크롤·글자 넘침·터치 44px·색 대비 AA·제목 끝 글자 홀로 줄바꿈 |
| `tests/load.spec.js` | 데이터 불러오기 실패 안내, **두 번째 산업 등록 시 동작(확장 구조)** |
| `tests/data.spec.js` | 데이터 파일 점검 — HTML 금지, 출처 유형 4종, 사이트 key·자격 매핑·자리표시자 오류 |

대표 화면 스크린샷은 `tests/screenshots/`에 `너비-모드-화면.png`로 저장됩니다(예: `390-big-result-p1.png`).

외부 링크 점검:

```bash
node tests/check-links.mjs
```

> 테스트 환경에서 글꼴 CDN(jsdelivr)이 막혀 있을 수 있어, 테스트에서는 글꼴 CSS만 빈 파일로 대신합니다.

## 4. 폴더 구조

```
index.html            화면 뼈대(공통 문구)
css/style.css         디자인(목업 v0.3 기준)
js/main.js            시작·데이터 로드·이벤트 연결
js/state.js           입력 상태
js/form.js            입력 화면
js/keywords.js        맞춤 검색어 생성(순수 함수)
js/result.js          결과 화면·5개 탭
js/prompts.js         AI 질문문 채우기
js/utils.js           escape·uniq·fill·복사·토스트
data/meta.json        서비스명, 정보 확인일(checkedAt), 산업 목록, 나이·지역 선택지, 출처 유형
data/groups.json      신중년·시니어·경력보유여성: 조건 단어, 상담기관, 교육, 3일차 할 일
data/common.json      공통 역량 6묶음
data/modifiers.json   자격·경험 → 조건 단어
data/sites.json       채용 사이트
data/prompts.json     AI 질문문 4종
data/demos.json       예시 인물 3명
data/industries/      산업별 데이터(현재 tourism.json)
reference/            목업 원본·빌드 프롬프트(배포 제외)
```

## 5. 새 산업 추가 방법

1. `data/industries/tourism.json`을 복사해 `data/industries/office.json`(예: 사무)으로 저장합니다.
2. 아래 항목을 새 산업에 맞게 고칩니다.
   - `id`(영문, 파일 이름과 같게), `name`(화면에 "관심 있는 ○○ 분야"로 표시)
   - `copy`: 머리말 문구, 히어로 문구, 검색어 안내문(`**굵게**` 표기 가능), 입력칸 예시, 주요 사이트 이름, 직무 표현 예시
   - `basis`, `certBasis`: 분야·자격 근거 문구
   - `fields[]`: 분야마다 `keywords`(공고에 실제로 쓰이는 직무 이름), `certs`, `certToKeyword`, `backOffice`, `languageRelevant`, `sites`, `edu`, `warning`, `paths`, `weeklyTask`
   - `commonEdu`, `fallbackEdu`, `consultCenters`, `roadmap`, `weekly`(7개), `defaultWeeklyConsult`, `defaultFieldTask`, `ageWarning`
3. 새 채용 사이트가 필요하면 `data/sites.json`에 key를 추가하고 `fields[].sites`에서 그 key를 씁니다.
4. `data/meta.json`의 `industries`에 한 줄을 추가합니다.
   ```json
   { "id": "office", "name": "사무", "file": "industries/office.json" }
   ```
   산업이 2개 이상이면 입력 화면 2번에 **산업 고르기**가 자동으로 나타나고, `?industry=office` 주소로 바로 열 수도 있습니다.
5. (선택) 그 산업용 예시 인물은 `data/demos.json`에 `"industry": "office"`로 추가합니다.
6. `npx playwright test tests/data.spec.js`로 데이터 실수를 점검합니다.

**데이터 작성 규칙**
- HTML 문자열을 넣지 않습니다. 굵은 글씨가 필요하면 `**이렇게**` 씁니다(경고문은 `title`/`body`로 나눔).
- 출처 유형(`badge`)은 `gov` 정부 / `pub` 공공기관 / `local` 지자체 / `assoc` 협회(참고용) 4종만 씁니다.
- 문구 안 자리표시자: `{kw0}` 첫 번째 직무 이름, `{kw1}` 두 번째 직무 이름, `{combo0}` 첫 번째 추천 조합, `{fieldName}` 첫 번째 분야 이름
- 정보를 다시 확인했다면 `meta.json`의 `checkedAt`을 바꿉니다(화면 하단에 자동 표시).

## 6. 확인 필요 목록 `[확인 필요]`

데이터의 `todo` 칸과 `js/main.js` 맨 위 주석에도 같은 목록이 있습니다.

- [ ] 프로마이스(promice.or.kr) 사이트 성격·메뉴 이름 — `data/sites.json` › `promice`
- [ ] 국외여행인솔자 자격 요건과 담당 기관 — `data/industries/tourism.json` › `travel`
- [ ] 궁능유적본부 누리집의 채용 게시판 메뉴 이름 — `data/sites.json` › `narail`
- [ ] 고용24 "전직지원서비스(중장년내일센터)" 신청 메뉴 경로 — `data/groups.json` › `mid.weeklyConsult`
- [ ] 관광일자리센터 위치(한국관광공사 서울센터)·상담 신청 메뉴 이름 — `data/industries/tourism.json` › `consultCenters`
- [ ] 모든 외부 링크의 실제 접속 여부 — `node tests/check-links.mjs` (개발 환경은 외부 접속이 막혀 목록만 출력됨)

## 7. 목업 v0.3에서 바로잡은 점

| 구분 | 목업 | 1차 버전 |
|---|---|---|
| 큰 글씨 모드 | `body`에 클래스를 달아 rem 크기가 실제로 커지지 않음 | `html`에 적용 → 17px ↔ 20px 정상 동작 |
| 색 대비 | 근거 문구 3.1:1, 보조 글자 4.3:1, 선택 탭 설명 4.1:1 | 모두 4.5:1 이상(AA) |
| 터치 영역 | [복사] 32px, 큰 글씨 버튼 약 41px | 모든 버튼·링크 44px 이상 |
| 키보드 | 칩을 누르면 화면을 다시 그려 포커스가 사라짐, 탭 화살표 이동 없음 | 포커스 유지, ←/→/Home/End 탭 이동, `aria-controls`·`tabpanel` |
| "이 검색어로 찾기" | 분야 기본 단어만 표시(내 자격 반영 안 됨), 복사 불가 | 내 자격에 맞춘 직무 이름 + [복사] 버튼 |
| 결과 문구 | `"…"를 함께 고려했습니다`(받침에 따라 조사 어색) | `희망 사항 "…"도 함께 고려했습니다` |
| 보안 | 데이터를 `innerHTML`로 삽입 | 모든 화면 출력은 텍스트 노드로 생성 |
| 줄바꿈 | 좁은 화면에서 제목 끝 1~2글자·가운뎃점 앞 줄바꿈 | `text-wrap: balance`·분야 이름 묶음, 자동 점검 테스트 |
| 가로 넘침 | `overflow-x: clip`으로 넘침을 가림 | 가림 없이 실제로 넘침 0 |

## 8. 1차에서 더한 작은 개선

- 상담기관 **전화 바로 걸기** 버튼(노인일자리 1544-3388, 새일센터 1544-1199)
- 나이와 대상이 맞지 않으면 부드러운 확인 안내(진행은 막지 않음)
- 입력 버튼 위 **"지금 고른 것: 분야 ○개 · 자격·경험 ○개"** 요약, 결과 상단 **[입력 고치기]**
- 이번 주 할 일 **"7개 중 ○개 완료"** 진행 표시
- 데이터 불러오기 실패·자바스크립트 꺼짐 안내, 본문 바로가기, 공유용 설명(OG) 태그
- 일부 메신저 앱 안 브라우저를 위한 복사 예비 방식

## 9. 이번 빌드에서 하지 않은 것

로그인·서버·DB, AI API 직접 호출, 공고 실시간 수집, 관광 이외 산업 데이터(구조만 준비).
