import { test, expect } from '@playwright/test';

test.describe('Phase 1: Production Smoke & Navigation Tests', () => {
  test('01.1 - HTTPS root redirects to dashboard with 200 and valid assets', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('requestfailed', (req) => failedRequests.push(req.url()));

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page).toHaveTitle(/BatchGuard — Supply-Chain Traceability & Recall Intelligence/);

    // Verify Demo Mode badge is visible
    const demoBadge = page.locator('text=DEMO MODE').first();
    await expect(demoBadge).toBeVisible();

    // Verify critical CSS and JS loaded
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);

    // No failed asset requests
    expect(failedRequests).toEqual([]);
  });

  test('01.2 - Direct URL access for all core application routes', async ({ page }) => {
    const routes = [
      { path: '/dashboard', heading: /Operations Overview/i },
      { path: '/batches', heading: /Food Batch Registry/i },
      { path: '/batches/BG-2024-8891-ORG', heading: /Batch Profile & Traceability/i },
      { path: '/supply-chain', heading: /Supply Chain Mesh/i },
      { path: '/recalls', heading: /Recall Operations/i },
      { path: '/suppliers', heading: /Supplier Management/i },
      { path: '/evidence', heading: /Evidence Vault/i },
      { path: '/audit-logs', heading: /Immutable Audit Trail/i },
      { path: '/settings', heading: /Settings/i },
    ];

    for (const route of routes) {
      const res = await page.goto(route.path);
      expect(res?.status(), `Route ${route.path} should return 200`).toBe(200);
      await expect(page.getByText(route.heading).first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=DEMO MODE').first()).toBeVisible();
    }
  });

  test('01.3 - Direct access to unknown routes gracefully redirects to dashboard', async ({ page }) => {
    await page.goto('/unmapped-route-xyz-404');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Operations Overview/i).first()).toBeVisible();
  });

  test('01.4 - In-app navigation via sidebar links updates URL and active page state', async ({ page }) => {
    await page.goto('/dashboard');

    // Click 'Batch Registry' link in sidebar
    await page.getByRole('link', { name: /Batch Registry/i }).first().click();
    await expect(page).toHaveURL(/\/batches$/);
    await expect(page.getByText(/Food Batch Registry/i).first()).toBeVisible();

    // Click 'Recall Management' link in sidebar
    await page.getByRole('link', { name: /Recall Management/i }).first().click();
    await expect(page).toHaveURL(/\/recalls$/);
    await expect(page.getByText(/Recall Operations/i).first()).toBeVisible();

    // Click 'Suppliers'
    await page.getByRole('link', { name: /Suppliers/i }).first().click();
    await expect(page).toHaveURL(/\/suppliers$/);
    await expect(page.getByText(/Supplier Management/i).first()).toBeVisible();
  });

  test('01.5 - Browser refresh preserves route without 404 or white screen', async ({ page }) => {
    await page.goto('/batches/BG-2024-8891-ORG');
    await expect(page.getByText(/BG-2024-8891-ORG/).first()).toBeVisible();

    // Hard reload
    await page.reload();
    await expect(page).toHaveURL(/\/batches\/BG-2024-8891-ORG$/);
    await expect(page.getByText(/BG-2024-8891-ORG/).first()).toBeVisible();
    await expect(page.locator('text=DEMO MODE').first()).toBeVisible();
  });

  test('01.6 - Browser back and forward history navigation works correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('link', { name: /Batch Registry/i }).first().click();
    await expect(page).toHaveURL(/\/batches$/);

    await page.getByRole('link', { name: /Evidence Vault/i }).first().click();
    await expect(page).toHaveURL(/\/evidence$/);

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/batches$/);

    // Go back again
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/\/batches$/);
  });
});

