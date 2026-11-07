import { test, expect } from '@playwright/test';

test.describe('Phase 4: Responsive Viewport Testing', () => {
  const viewports = [
    { name: 'Desktop (1920x1080)', width: 1920, height: 1080, isMobile: false },
    { name: 'Laptop (1366x768)', width: 1366, height: 768, isMobile: false },
    { name: 'Tablet (768x1024)', width: 768, height: 1024, isMobile: true },
    { name: 'Mobile (390x844)', width: 390, height: 844, isMobile: true },
    { name: 'Small Mobile (320x568)', width: 320, height: 568, isMobile: true },
  ];

  for (const vp of viewports) {
    test(`Responsiveness on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/dashboard');

      // Verify page loaded
      await expect(page.getByText(/Operations Overview/i).first()).toBeVisible();

      // Verify Demo Mode badge is visible and not clipped
      const demoBadge = page.locator('text=DEMO MODE').first();
      await expect(demoBadge).toBeVisible();

      // Check no horizontal document overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 5;
      });
      expect(overflow, `Page should not have accidental horizontal overflow on ${vp.name}`).toBe(false);

      if (vp.isMobile) {
        // Mobile hamburger menu toggle check
        const hamburgerBtn = page.locator('button:has(span:text("menu"))');
        if (await hamburgerBtn.isVisible()) {
          await hamburgerBtn.click();
          // Drawer should be open and navigation visible
          await expect(page.getByRole('link', { name: /Batch Registry/i }).first()).toBeVisible();

          // Close drawer
          const closeBtn = page.locator('button:has(span:text("close"))');
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
          }
        }
      } else {
        // Desktop / Laptop side rail should be visible
        await expect(page.getByRole('link', { name: /Batch Registry/i }).first()).toBeVisible();
      }
    });
  }
});

