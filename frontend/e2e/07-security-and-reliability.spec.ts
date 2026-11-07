import { test, expect } from '@playwright/test';

test.describe('Phase 5: Security & Reliability Testing', () => {
  test('07.1 - Zero uncaught JS exceptions or console errors across core pages', async ({ page }) => {
    const pageErrors: Error[] = [];
    const severeConsoleErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const url = msg.location().url || '';
        // Ignore browser auto-request for favicon.ico
        if (url.includes('favicon.ico') || text.includes('favicon.ico')) {
          return;
        }
        severeConsoleErrors.push(text);
      }
    });

    const routes = ['/dashboard', '/batches', '/recalls', '/suppliers', '/supply-chain', '/evidence', '/audit-logs', '/settings'];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
    }

    expect(pageErrors, 'Should have 0 unhandled page errors').toEqual([]);
    expect(severeConsoleErrors, 'Should have 0 severe console errors').toEqual([]);
  });

  test('07.2 - Network safety: zero unauthorized external API calls or AWS credential leaks', async ({ page }) => {
    const outboundRequests: string[] = [];

    page.on('request', (req) => {
      const url = req.url();
      if (!url.includes('batchguard-pi.vercel.app') && !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('fonts.googleapis.com') && !url.includes('fonts.gstatic.com')) {
        outboundRequests.push(url);
      }
    });

    await page.goto('/dashboard');
    await page.goto('/recalls');
    await page.goto('/evidence');

    // No external calls to unauthorized hosts or live AWS endpoints
    expect(outboundRequests).toEqual([]);
  });

  test('07.3 - Browser storage audit: zero AWS keys or plain-text secrets in localStorage/sessionStorage', async ({ page }) => {
    await page.goto('/dashboard');

    const storageReport = await page.evaluate(() => {
      const items: { key: string; value: string }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || '';
        items.push({ key: k, value: localStorage.getItem(k) || '' });
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i) || '';
        items.push({ key: k, value: sessionStorage.getItem(k) || '' });
      }
      return items;
    });

    for (const item of storageReport) {
      expect(item.value).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(item.value).not.toMatch(/aws_secret_access_key/i);
      expect(item.value).not.toMatch(/-----BEGIN.*PRIVATE KEY-----/);
    }
  });

  test('07.4 - DOM security: no unsanitized raw script injections in rendered content', async ({ page }) => {
    await page.goto('/batches');

    const scriptsCount = await page.evaluate(() => {
      const tdScripts = document.querySelectorAll('td script, th script, h1 script, p script');
      return tdScripts.length;
    });

    expect(scriptsCount).toBe(0);
  });
});

