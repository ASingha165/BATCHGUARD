import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://batchguard-pi.vercel.app';
const TEMP_VIDEO_DIR = path.resolve(__dirname, '../../docs/evidence/video/temp_raw');

if (!fs.existsSync(TEMP_VIDEO_DIR)) {
  fs.mkdirSync(TEMP_VIDEO_DIR, { recursive: true });
}

async function run() {
  console.log(`[Narrated Demo] Launching browser to record video at 1920x1080 against ${TARGET_URL}...`);

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: TEMP_VIDEO_DIR,
      size: { width: 1920, height: 1080 },
    },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  // Helper smooth mouse hover
  async function smoothHover(selector) {
    try {
      const loc = page.locator(selector).first();
      if (await loc.isVisible()) {
        await loc.hover({ timeout: 4000 });
      }
    } catch (e) {
      // ignore
    }
  }

  // Helper wait
  const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ==========================================================================
  // SCENE 1: Introduction (0:00 - 0:24, ~24s)
  // ==========================================================================
  console.log('[Scene 1: Introduction] Navigating to Dashboard...');
  await page.goto(`${TARGET_URL}/dashboard`, { waitUntil: 'networkidle' });
  await waitMs(2000);

  // Hover over brand logo and tagline
  await smoothHover('text=BatchGuard');
  await waitMs(4000);
  await smoothHover('text=One Batch. Complete Traceability. Faster Recalls.');
  await waitMs(6000);

  // Gentle scroll to establish presence
  await page.mouse.wheel(0, 150);
  await waitMs(4000);
  await page.mouse.wheel(0, -150);
  await waitMs(7500); // Scene 1 total: ~23.5s

  // ==========================================================================
  // SCENE 2: Executive Dashboard & Live Telemetry (0:24 - 0:46, ~22s)
  // ==========================================================================
  console.log('[Scene 2: Dashboard] Showcasing KPI metrics and DEMO MODE...');
  // Hover over the amber DEMO MODE badge in the header
  await smoothHover('text=DEMO MODE');
  await waitMs(4000);

  // Hover over KPI cards
  await smoothHover('text=Active Monitored Batches');
  await waitMs(3000);
  await smoothHover('text=Distribution Nodes');
  await waitMs(3000);
  await smoothHover('text=Mean Containment Time');
  await waitMs(3000);

  // Scroll to telemetry charts
  await page.mouse.wheel(0, 300);
  await waitMs(4000);
  await page.mouse.wheel(0, -300);
  await waitMs(4800); // Scene 2 total: ~21.8s

  // ==========================================================================
  // SCENE 3: Traceability & Provenance (0:46 - 1:13, ~27s)
  // ==========================================================================
  console.log('[Scene 3: Traceability] Navigating to Batch Registry & Details...');
  await page.click('a[href="/batches"]');
  await waitMs(3000);

  // Search for the target batch
  const searchInput = page.locator('input[placeholder*="Search by lot"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill('BG-2024-8891');
    await waitMs(2000);
  }

  // Click on the target batch row or link
  const batchRow = page.locator('text=BG-2024-8891-ORG').first();
  await batchRow.click();
  await waitMs(3000);

  // On details screen: scroll provenance
  await smoothHover('text=Field 14B Salinas');
  await waitMs(3000);
  await page.mouse.wheel(0, 350);
  await waitMs(4000);

  // Hover confidence score
  await smoothHover('text=Traceability Confidence');
  await waitMs(3000);

  // Placard action
  const placardBtn = page.getByRole('button', { name: /Placard/i }).first();
  if (await placardBtn.isVisible()) {
    await placardBtn.click();
    await waitMs(2000);
  }
  await page.mouse.wheel(0, -350);
  await waitMs(7300); // Scene 3 total: ~27.3s

  // ==========================================================================
  // SCENE 4: One-Click Recall Orchestration (1:13 - 1:49, ~36s)
  // ==========================================================================
  console.log('[Scene 4: Recall] Triggering 4-step Recall Orchestration Wizard...');
  await page.click('a[href="/recalls"]');
  await waitMs(3000);

  // Click initiate recall
  const initRecallBtn = page.getByRole('button', { name: /Initiate Targeted Recall/i }).first();
  await initRecallBtn.click();
  await waitMs(2500);

  // Step 1: Select batch (default selected)
  await waitMs(1500);
  const step2Btn = page.getByRole('button', { name: /Proceed to Step 2/i });
  await step2Btn.click();
  await waitMs(3000);

  // Step 2: Severity & Hazard (Class I Critical is default)
  const step3Btn = page.getByRole('button', { name: /Proceed to Step 3/i });
  await step3Btn.click();
  await waitMs(3500);

  // Step 3: Blast Radius Review
  const step4Btn = page.getByRole('button', { name: /Proceed to Step 4/i });
  await step4Btn.click();
  await waitMs(3000);

  // Step 4: 2FA & Authorization Phrase
  const phraseInput = page.getByPlaceholder(/CONFIRM-RECALL/i);
  await phraseInput.fill('CONFIRM-RECALL-BG-2024-8891-ORG');
  await waitMs(1500);

  const tokenInput = page.getByPlaceholder(/123456/i);
  await tokenInput.fill('123456');
  await waitMs(1500);

  // Broadcast
  const broadcastBtn = page.getByRole('button', { name: /Broadcast Emergency Recall/i });
  await broadcastBtn.click();
  await waitMs(5000);

  // Notice simulated broadcast active on page
  await waitMs(10900); // Scene 4 total: ~35.4s

  // ==========================================================================
  // SCENE 5: Evidence Vault & Cryptographic Audit Ledger (1:49 - 2:15, ~26s)
  // ==========================================================================
  console.log('[Scene 5: Evidence & Audit] Reviewing Evidence Vault & Hash Chain...');
  await page.click('a[href="/evidence"]');
  await waitMs(4000);

  // Highlight lab test document entry
  await smoothHover('text=Certificate of Analysis');
  await waitMs(3000);

  // Switch to Audit Logs
  await page.click('a[href="/audit-logs"]');
  await waitMs(3500);

  // Click Verify Chain Integrity button
  const verifyBtn = page.getByRole('button', { name: /Verify Chain Integrity/i }).first();
  if (await verifyBtn.isVisible()) {
    await verifyBtn.click();
    await waitMs(3000);
  }

  // Click Export CSV button
  const exportBtn = page.getByRole('button', { name: /Export/i }).first();
  if (await exportBtn.isVisible()) {
    await exportBtn.click();
    await waitMs(2000);
  }
  await waitMs(10100); // Scene 5 total: ~25.6s

  // ==========================================================================
  // SCENE 6: AWS Serverless Architecture & Closing (2:15 - 2:55, ~40s)
  // ==========================================================================
  console.log('[Scene 6: Architecture & Closing] Wrapping up demonstration...');
  await page.click('a[href="/dashboard"]');
  await waitMs(4000);

  // Focus on header and operational integrity
  await smoothHover('text=BatchGuard');
  await waitMs(5000);

  // Hover on DEMO MODE indicator for final transparent closing statement
  await smoothHover('text=DEMO MODE');
  await waitMs(6000);

  // Gentle overview scroll
  await page.mouse.wheel(0, 200);
  await waitMs(6000);
  await page.mouse.wheel(0, -200);
  await waitMs(19400); // Scene 6 total: ~40.4s

  console.log('[Narrated Demo] Finished scenario actions. Closing browser...');
  await page.close();
  await context.close();
  await browser.close();

  // Find recorded video in TEMP_VIDEO_DIR
  const files = fs.readdirSync(TEMP_VIDEO_DIR).filter((f) => f.endsWith('.webm'));
  if (files.length > 0) {
    // Sort by mtime descending
    files.sort((a, b) => fs.statSync(path.join(TEMP_VIDEO_DIR, b)).mtimeMs - fs.statSync(path.join(TEMP_VIDEO_DIR, a)).mtimeMs);
    const recordedVideo = path.join(TEMP_VIDEO_DIR, files[0]);
    console.log(`[Narrated Demo] Raw video captured successfully: ${recordedVideo}`);
  }
}

run().catch((err) => {
  console.error('[Narrated Demo] Error:', err);
  process.exit(1);
});
