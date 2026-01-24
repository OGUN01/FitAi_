import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for FitAI Workers API Testing
 * No browsers needed - pure API/HTTP testing
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  use: {
    // Base URL for API requests
    baseURL: process.env.API_URL || 'https://fitai-workers.sharmaharsh9887.workers.dev',
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
    
    // Trace on first retry
    trace: 'on-first-retry',
  },
  
  // Timeout for each test
  timeout: 60000,
  
  // Global setup for auth tokens
  globalSetup: './e2e/global-setup.ts',
  
  projects: [
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
    },
  ],
});
