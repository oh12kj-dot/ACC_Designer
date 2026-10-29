import { defineConfig, devices } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export default defineConfig({
  testDir:'tests/e2e',
  workers:1,
  use:{baseURL:'http://127.0.0.1:3100',trace:'retain-on-failure',serviceWorkers:'block'},
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
    {name:'mobile-chromium',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}},
    {name:'desktop-webkit',use:{...devices['Desktop Safari']}},
    {name:'mobile-webkit',use:{...devices['iPhone 13']}},
  ],
  webServer:{command:'npm.cmd run start -- --hostname 127.0.0.1 --port 3100',env:{ACC_LOCAL_WORKSPACE_TEST_ID:randomUUID()},url:'http://127.0.0.1:3100',reuseExistingServer:false,timeout:30000},
});
