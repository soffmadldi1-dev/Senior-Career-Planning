// Playwright 설정 — 정적 서버를 띄워 실제 브라우저로 확인합니다.
import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.js/,
  fullyParallel: true,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
    locale: 'ko-KR',
  },
  webServer: {
    command: `python3 -m http.server ${PORT}`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
