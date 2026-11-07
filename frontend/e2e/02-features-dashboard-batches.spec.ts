import { test, expect } from '@playwright/test';

test.describe('Phase 2: Dashboard & Batch Registry Features', () => {
  test('02.1 - Dashboard renders KPI metrics, charts, and simulated disclosures', async ({ page }) => {
    await page.goto('/dashboard');

    // KPI Metric cards
    await expect(page.getByText('Total Registered Batches').first()).toBeVisible();
    await expect(page.getByText('Active Verified Suppliers').first()).toBeVisible();
    await expect(page.getByText('Monitored Distribution Nodes').first()).toBeVisible();
    await expect(page.getByText('Open Recall Incidents').first()).toBeVisible();

    // Chart SVG on dashboard
    const chart = page.locator('svg').first();
    await expect(chart).toBeVisible();

    // Verify Demo Mode dataset disclosure
    await expect(page.getByText(/DEMO DATASET/i).first()).toBeVisible();
  });

  test('02.2 - Dashboard Register Batch action navigates directly to Batch Registry modal', async ({ page }) => {
    await page.goto('/dashboard');

    // Click "Register New Batch" button on dashboard
    const registerBtn = page.getByRole('button', { name: /Register New Batch/i });
    await registerBtn.click();

    // Verifies navigation to /batches with modal triggered
    await expect(page).toHaveURL(/\/batches/);
    await expect(page.getByText(/Register Production Batch/i).first()).toBeVisible();
  });

  test('02.3 - Dashboard Export Safety Audit button triggers CSV download with correct content', async ({ page }) => {
    await page.goto('/dashboard');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export Safety Audit/i }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/batchguard-safety-audit-.*\.csv/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const csvContent = Buffer.concat(chunks).toString('utf-8');

    // Verify CSV disclosure header and columns
    expect(csvContent).toContain('BATCHGUARD COMPREHENSIVE SAFETY AUDIT & TRACEABILITY REPORT');
    expect(csvContent).toContain('BatchID,LotNumber,GTIN,ProductName,Quantity,UOM,Supplier,FacilityGLN,ProductionDate,Status');
    expect(csvContent).toContain('BG-2024-8891-ORG');
  });

  test('02.4 - Batch Registry search and status filtering', async ({ page }) => {
    await page.goto('/batches');

    // Initial batch list should contain BG-2024-8891-ORG in table body
    const tableBody = page.locator('tbody');
    await expect(tableBody.getByText('BG-2024-8891-ORG').first()).toBeVisible();

    // Search filter
    const searchInput = page.getByPlaceholder(/Search lot code, GTIN, SKU/i);
    await searchInput.fill('L-8891-A');
    await expect(tableBody.getByText('BG-2024-8891-ORG').first()).toBeVisible();

    // Search for non-existing query
    await searchInput.fill('XYZ-NONEXISTENT-QUERY-999');
    await expect(tableBody.getByText('BG-2024-8891-ORG')).not.toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(tableBody.getByText('BG-2024-8891-ORG').first()).toBeVisible();

    // Filter tabs
    const holdTab = page.getByRole('button', { name: /^HOLD$/i });
    await holdTab.click();
    await expect(tableBody.getByText(/BG-2024-7719-BER/).first()).toBeVisible();

    const allTab = page.getByRole('button', { name: /^ALL$/i });
    await allTab.click();
    await expect(tableBody.getByText('BG-2024-8891-ORG').first()).toBeVisible();
  });

  test('02.5 - Batch Registration modal creates a new lot in local state', async ({ page }) => {
    await page.goto('/batches');

    // Open Register modal
    await page.getByRole('button', { name: /Register New Batch/i }).click();
    await expect(page.getByText(/Register Production Batch/i).first()).toBeVisible();

    // Fill form using form input index
    const uniqueLot = `L-TEST-${Date.now().toString().slice(-4)}`;
    const lotInput = page.locator('form input').nth(1);
    await lotInput.fill(uniqueLot);

    const submitBtn = page.getByRole('button', { name: /Commit Lot to Ledger/i });
    await submitBtn.click();

    // Success toast appears
    await expect(page.getByText(/Batch Registered/i).first()).toBeVisible({ timeout: 5000 });

    // New lot appears in the table
    await expect(page.locator('tbody').getByText(uniqueLot).first()).toBeVisible();
  });

  test('02.6 - Batch Details page renders complete telemetry, genealogy, and action buttons', async ({ page }) => {
    await page.goto('/batches/BG-2024-8891-ORG');

    await expect(page.getByText(/Batch Profile: BG-2024-8891-ORG/i).first()).toBeVisible();
    await expect(page.getByText(/Organic Baby Spinach 16oz/i).first()).toBeVisible();

    // Action buttons
    await expect(page.getByRole('button', { name: /Print GS1-128 Placard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Traceability Dossier/i })).toBeVisible();

    // Click Print Placard triggers toast
    await page.getByRole('button', { name: /Print GS1-128 Placard/i }).click();
    await expect(page.getByText(/GS1-128 Pallet Placard Generated/i).first()).toBeVisible();
  });
});
