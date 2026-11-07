import { test, expect } from '@playwright/test';

test.describe('Phase 3: Cross-Feature User Journeys', () => {
  test('Workflow A: Register a new batch -> locate it in registry -> navigate to details', async ({ page }) => {
    await page.goto('/batches');

    // Register batch
    const uniqueLot = `L-WF-A-${Date.now().toString().slice(-4)}`;
    await page.getByRole('button', { name: /Register New Batch/i }).click();

    await page.locator('form input').nth(1).fill(uniqueLot);
    await page.getByRole('button', { name: /Commit Lot to Ledger/i }).click();

    // Verify in registry table
    const searchInput = page.getByPlaceholder(/Search lot code, GTIN, SKU/i);
    await searchInput.fill(uniqueLot);
    await expect(page.locator('tbody').getByText(uniqueLot).first()).toBeVisible({ timeout: 10000 });

    // Navigate to batch details
    const lineageBtn = page.locator('tbody tr').first().getByRole('button', { name: /Lineage/i });
    await lineageBtn.click();

    // Expect details page to render
    await expect(page).toHaveURL(/\/batches\//);
    await expect(page.getByText(/Batch Profile:/i).first()).toBeVisible();
  });

  test('Workflow B: Select a batch -> initiate recall -> complete 4-step wizard -> inspect updated status', async ({ page }) => {
    await page.goto('/recalls');

    // Initiate recall wizard
    await page.getByRole('button', { name: /\+ Initiate Targeted Recall/i }).click();

    // Step 1 -> Step 2
    await page.getByRole('button', { name: /Proceed to Step 2/i }).click();

    // Step 2 -> Step 3
    await page.getByRole('button', { name: /Proceed to Step 3/i }).click();

    // Step 3 -> Step 4
    await page.getByRole('button', { name: /Proceed to Step 4/i }).click();

    // Authorize with confirmation phrase and OTP
    await page.getByPlaceholder(/Type CONFIRM-RECALL-/i).fill('CONFIRM-RECALL-BG-2024-8891-ORG');
    await page.getByPlaceholder(/e\.g\. 123456/i).fill('123456');

    await page.getByRole('button', { name: /Broadcast Emergency Recall/i }).click();

    // Verification toast
    await expect(page.getByText(/Simulated Recall Initialized|Targeted Recall Broadcasted|Recall Broadcast/i).first()).toBeVisible({ timeout: 10000 });

    // Verifies containment timer and active recall details remain visible
    await expect(page.getByText(/elapsed/i).first()).toBeVisible();
  });

  test('Workflow C: Execute simulated recall -> inspect audit records -> export CSV', async ({ page }) => {
    await page.goto('/audit-logs');

    // Audit logs should list recent events
    await expect(page.getByText(/RECALL_INITIATED/i).first()).toBeVisible({ timeout: 15000 });

    // Navigate to dashboard
    await page.getByRole('link', { name: /Overview/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Export Safety Audit CSV
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export Safety Audit/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('Workflow D: Navigate from supplier -> batch registry -> supply chain lineage -> recall operations', async ({ page }) => {
    // 1. Supplier
    await page.goto('/suppliers');
    await expect(page.getByText(/Salinas Valley Organics/i).first()).toBeVisible({ timeout: 15000 });

    // 2. Batch Registry
    await page.getByRole('link', { name: /Batch Registry/i }).first().click();
    await expect(page).toHaveURL(/\/batches/);
    await expect(page.getByText(/Organic Baby Spinach 16oz/i).first()).toBeVisible({ timeout: 15000 });

    // 3. Supply Chain Mesh
    await page.getByRole('link', { name: /Supply Chain/i }).first().click();
    await expect(page).toHaveURL(/\/supply-chain/);
    await expect(page.getByText(/Supply Chain Mesh/i).first()).toBeVisible({ timeout: 15000 });

    // 4. Recall Operations
    await page.getByRole('link', { name: /Recall Management/i }).first().click();
    await expect(page).toHaveURL(/\/recalls/);
    await expect(page.getByText(/CLASS I CRITICAL/i).first()).toBeVisible({ timeout: 15000 });
  });
});
