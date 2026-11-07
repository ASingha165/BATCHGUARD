import { test, expect } from '@playwright/test';

test.describe('Phase 2: Suppliers, Evidence Vault, Audit Logs & Settings Features', () => {
  test('04.1 - Suppliers page renders supplier directory and allows enrolling a new supplier', async ({ page }) => {
    await page.goto('/suppliers');

    // Supplier listing
    await expect(page.getByText(/Salinas Valley Organics/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Watsonville Berry Co-op/i).first()).toBeVisible({ timeout: 15000 });

    // Enroll Supplier
    await page.getByRole('button', { name: /Add Supplier Partner/i }).click();
    await expect(page.getByText(/Enroll Supplier Facility/i).first()).toBeVisible();

    const uniqueSupplier = `Supplier Alpha ${Date.now().toString().slice(-4)}`;
    await page.locator('input[placeholder="e.g. Salinas Valley Organics"]').fill(uniqueSupplier);
    await page.locator('input[placeholder="0850012000015"]').fill('0850012009999');

    await page.getByRole('button', { name: /Verify & Enroll/i }).click();

    // Success toast appears
    await expect(page.getByText(/Supplier Enrolled/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(uniqueSupplier).first()).toBeVisible({ timeout: 15000 });
  });

  test('04.2 - Evidence Vault displays document ledger and handles simulated upload', async ({ page }) => {
    await page.goto('/evidence');

    // Evidence documents listed
    await expect(page.getByText(/Microbial_Screen_Lot_8891A/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Certificate_Of_Analysis_Salinas/i).first()).toBeVisible({ timeout: 15000 });

    // Category filter tabs
    await page.getByRole('button', { name: /COA/i }).first().click();
    await expect(page.getByText(/Certificate_Of_Analysis_Salinas/i).first()).toBeVisible();

    await page.getByRole('button', { name: /^ALL$/i }).first().click();

    // Upload modal
    await page.getByRole('button', { name: /Upload Certificate/i }).click();
    await expect(page.getByText(/Upload to S3 Evidence Vault/i).first()).toBeVisible();

    const uniqueDocName = `Lab_Assay_${Date.now().toString().slice(-4)}.pdf`;
    await page.locator('input[placeholder="e.g. BioCert_Salmonella_Lot_8891A.pdf"]').fill(uniqueDocName);

    await page.getByRole('button', { name: /Generate Pre-signed URL & Vault/i }).click();

    await expect(page.getByText(/Evidence Upload Completed/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(uniqueDocName).first()).toBeVisible();
  });

  test('04.3 - Audit Logs renders immutable event ledger and supports actor search', async ({ page }) => {
    await page.goto('/audit-logs');

    // Audit events table
    await expect(page.getByText(/RECALL_INITIATED/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/POS_SCAN_BLOCK_BROADCAST/i).first()).toBeVisible({ timeout: 15000 });

    // Search filter
    const searchInput = page.getByPlaceholder(/Search action, actor, or entity/i);
    await searchInput.fill('elena.vance');
    await expect(page.getByText(/RECALL_INITIATED/i).first()).toBeVisible();

    // Search for non-existent actor
    await searchInput.fill('nobody-exists-999');
    await expect(page.getByText(/RECALL_INITIATED/i)).not.toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(page.getByText(/RECALL_INITIATED/i).first()).toBeVisible();

    // Click details button on first row
    const detailsBtn = page.getByRole('button', { name: /Inspect/i }).first();
    if (await detailsBtn.isVisible()) {
      await detailsBtn.click();
      await expect(page.getByText(/Audit Event Ledger Entry/i).first()).toBeVisible();
      // Close modal
      await page.getByRole('button', { name: /Close Inspector/i }).click();
    }
  });

  test('04.4 - Supply Chain page renders interactive multi-tier mesh graph', async ({ page }) => {
    await page.goto('/supply-chain');

    await expect(page.getByText(/Supply Chain Mesh/i).first()).toBeVisible();
    await expect(page.getByText(/Northeast Logistics Hub 01/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/ColdRoute Fleet Carrier #204/i).first()).toBeVisible({ timeout: 15000 });

    // Check filter indicator buttons
    await expect(page.getByRole('button', { name: /PRIMARY DC/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /TRANSIT FLEET/i })).toBeVisible();
  });

  test('04.5 - Settings page allows configuring tenant properties and shows save toast', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByText(/System Configuration & Governance/i).first()).toBeVisible();
    await expect(page.getByText(/Tenant Organization/i).first()).toBeVisible();

    // Save button
    await page.getByRole('button', { name: /Save Configuration/i }).click();

    // Success toast appears
    await expect(page.getByText(/Settings Saved/i).first()).toBeVisible({ timeout: 5000 });
  });
});
