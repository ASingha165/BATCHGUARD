import { test, expect } from '@playwright/test';

test.describe('Phase 2: Recall Operations & 4-Step Wizard Features', () => {
  test('03.1 - Recall Operations page renders live incident overview, timer, and quarantine ledger', async ({ page }) => {
    await page.goto('/recalls');

    // Incident Banner
    await expect(page.getByText('CLASS I CRITICAL').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('REC-2024-082').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Listeria Monocytogenes/i).first()).toBeVisible();

    // Elapsed Containment Timer
    await expect(page.getByText(/elapsed/i).first()).toBeVisible();

    // Downstream Facilities Ledger
    await expect(page.getByText(/Facility Quarantine & POS Lock Status Ledger/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Northeast Logistics Hub 01/i).first()).toBeVisible({ timeout: 15000 });

    // Containment metrics & velocity
    await expect(page.getByText(/Containment Velocity/i).first()).toBeVisible();
  });

  test('03.2 - Four-step recall wizard walks through batch selection to 2FA broadcast', async ({ page }) => {
    await page.goto('/recalls');

    // Launch Wizard
    await page.getByRole('button', { name: /\+ Initiate Targeted Recall/i }).click();

    // Step 1: Batch Select
    await expect(page.getByText(/Step 1 of 4/i).first()).toBeVisible();
    await expect(page.getByText(/Select Target Food Batch/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Proceed to Step 2/i }).click();

    // Step 2: Hazard Class
    await expect(page.getByText(/Step 2 of 4/i).first()).toBeVisible();
    await expect(page.getByText(/Classify Safety Hazard Severity/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Proceed to Step 3/i }).click();

    // Step 3: Blast Radius & Impacted Nodes
    await expect(page.getByText(/Step 3 of 4/i).first()).toBeVisible();
    await expect(page.getByText(/Review Downstream Blast Radius/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Proceed to Step 4/i }).click();

    // Step 4: Cryptographic Confirmation & Two-Factor Authentication
    await expect(page.getByText(/Step 4 of 4/i).first()).toBeVisible();
    await expect(page.getByText(/Two-Factor Authorization Required/i).first()).toBeVisible();

    // Verify broadcast button is initially disabled
    const broadcastBtn = page.getByRole('button', { name: /Broadcast Emergency Recall/i });
    await expect(broadcastBtn).toBeDisabled();

    // Fill incorrect phrase - remains disabled
    const phraseInput = page.getByPlaceholder(/Type CONFIRM-RECALL-/i);
    await phraseInput.fill('WRONG-PHRASE');
    await expect(broadcastBtn).toBeDisabled();

    // Fill exact confirmation phrase
    await phraseInput.fill('CONFIRM-RECALL-BG-2024-8891-ORG');

    // Fill 6-digit OTP token
    const otpInput = page.getByPlaceholder(/e\.g\. 123456/i);
    await otpInput.fill('123456');

    // Now broadcast button becomes enabled
    await expect(broadcastBtn).toBeEnabled();

    // Submit broadcast
    await broadcastBtn.click();

    // Success toast or confirmation view appears
    await expect(page.getByText(/Simulated Recall Initialized|Targeted Recall Broadcasted|Recall Broadcast/i).first()).toBeVisible({ timeout: 10000 });

    // Modal closes
    await expect(page.getByText(/Step 4 of 4/i)).not.toBeVisible();
  });
});
