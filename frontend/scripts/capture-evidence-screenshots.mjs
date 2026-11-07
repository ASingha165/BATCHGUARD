import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenceDir = path.resolve(__dirname, '../../docs/evidence');

if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

const targetBaseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://batchguard-pi.vercel.app';

async function capture() {
  console.log(`Starting evidence screenshot capture against: ${targetBaseUrl}`);
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();

  // 1. Dashboard
  console.log('Capturing 01-dashboard.png...');
  await page.goto(`${targetBaseUrl}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(evidenceDir, '01-dashboard.png'), fullPage: false });

  // 2. Batch Registry
  console.log('Capturing 02-batch-registry.png...');
  await page.goto(`${targetBaseUrl}/batches`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(evidenceDir, '02-batch-registry.png'), fullPage: false });

  // 3. Batch Details
  console.log('Capturing 03-batch-details.png...');
  await page.goto(`${targetBaseUrl}/batches/BG-2024-8891-ORG`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(evidenceDir, '03-batch-details.png'), fullPage: false });

  // 4. Supply Chain Traceability
  console.log('Capturing 04-supply-chain-traceability.png...');
  await page.goto(`${targetBaseUrl}/supply-chain`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(evidenceDir, '04-supply-chain-traceability.png'), fullPage: false });

  // 5. Recall Management
  console.log('Capturing 05-recall-management.png...');
  await page.goto(`${targetBaseUrl}/recalls`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(evidenceDir, '05-recall-management.png'), fullPage: false });

  // 6. Recall Simulation (Launch wizard & proceed to step 2 Blast Radius Assessment)
  console.log('Capturing 06-recall-simulation.png...');
  const initiateBtn = page.getByRole('button', { name: /\+ Initiate Targeted Recall/i });
  if (await initiateBtn.isVisible()) {
    await initiateBtn.click();
    await page.waitForTimeout(500);
    const step2Btn = page.getByRole('button', { name: /Proceed to Step 2/i });
    if (await step2Btn.isVisible()) {
      await step2Btn.click();
      await page.waitForTimeout(800);
    }
  }
  await page.screenshot({ path: path.join(evidenceDir, '06-recall-simulation.png'), fullPage: false });

  // 7. Suppliers
  console.log('Capturing 07-suppliers.png...');
  await page.goto(`${targetBaseUrl}/suppliers`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(evidenceDir, '07-suppliers.png'), fullPage: false });

  // 8. Evidence Vault
  console.log('Capturing 08-evidence-vault.png...');
  await page.goto(`${targetBaseUrl}/evidence`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(evidenceDir, '08-evidence-vault.png'), fullPage: false });

  // 9. Audit Logs
  console.log('Capturing 09-audit-logs.png...');
  await page.goto(`${targetBaseUrl}/audit-logs`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(evidenceDir, '09-audit-logs.png'), fullPage: false });

  // 10. Settings
  console.log('Capturing 10-settings.png...');
  await page.goto(`${targetBaseUrl}/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(evidenceDir, '10-settings.png'), fullPage: false });

  await browser.close();
  console.log('All 10 evidence screenshots captured successfully in docs/evidence/');
}

capture().catch((err) => {
  console.error('Error capturing evidence screenshots:', err);
  process.exit(1);
});

