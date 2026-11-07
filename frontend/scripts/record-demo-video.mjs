import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const videoDir = path.resolve(__dirname, '../../docs/evidence/video');

if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

const targetBaseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://batchguard-pi.vercel.app';

async function record() {
  console.log(`Starting automated video recording against: ${targetBaseUrl}`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  // Helper for human-paced smooth delay
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Scene 1 & 2: Overview Dashboard (0:00 - 0:15)
  console.log('Recording Scene 1 & 2: Dashboard Overview...');
  await page.goto(`${targetBaseUrl}/dashboard`, { waitUntil: 'networkidle' });
  await wait(3000);
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await wait(2500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(2000);

  // Scene 3: Batch Registry & Registration (0:15 - 0:30)
  console.log('Recording Scene 3: Batch Registry & Registration...');
  await page.getByRole('link', { name: /Batch Registry/i }).click();
  await wait(2000);

  const registerBtn = page.getByRole('button', { name: /\+ Register New Batch/i });
  if (await registerBtn.isVisible()) {
    await registerBtn.click();
    await wait(1500);
    // Fill mock form fields
    const productInput = page.getByLabel(/Product Name|Product Title/i).or(page.locator('input[name="productName"]'));
    if (await productInput.isVisible()) {
      await productInput.fill('Organic Baby Spinach 16oz');
      await wait(800);
    }
    const lotInput = page.getByLabel(/Lot Code|Lot Number/i).or(page.locator('input[name="lotCode"]'));
    if (await lotInput.isVisible()) {
      await lotInput.fill('L-904-C');
      await wait(800);
    }
    const gtinInput = page.getByLabel(/GTIN/i).or(page.locator('input[name="gtin"]'));
    if (await gtinInput.isVisible()) {
      await gtinInput.fill('00850012345678');
      await wait(800);
    }
    const commitBtn = page.getByRole('button', { name: /Commit Lot to Ledger|Save Batch/i });
    if (await commitBtn.isVisible()) {
      await commitBtn.click();
      await wait(2000);
    }
  }

  // Scene 4: Batch Details & Lineage (0:30 - 0:45)
  console.log('Recording Scene 4: Batch Details & Lineage...');
  await page.goto(`${targetBaseUrl}/batches/BG-2024-8891-ORG`, { waitUntil: 'networkidle' });
  await wait(3000);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await wait(2000);
  const placardBtn = page.getByRole('button', { name: /Print GS1-128 Placard/i });
  if (await placardBtn.isVisible()) {
    await placardBtn.click();
    await wait(2000);
  }

  // Scene 5: Recall Orchestration Wizard (0:45 - 1:15)
  console.log('Recording Scene 5: One-Click Recall Orchestration...');
  await page.getByRole('link', { name: /Recall Management/i }).click();
  await wait(2500);

  const initiateRecallBtn = page.getByRole('button', { name: /\+ Initiate Targeted Recall/i });
  if (await initiateRecallBtn.isVisible()) {
    await initiateRecallBtn.click();
    await wait(2000);

    // Step 1: Select batch
    const step2Btn = page.getByRole('button', { name: /Proceed to Step 2/i });
    if (await step2Btn.isVisible()) {
      await step2Btn.click();
      await wait(2000);
    }

    // Step 2: Classify Hazard
    const step3Btn = page.getByRole('button', { name: /Proceed to Step 3/i });
    if (await step3Btn.isVisible()) {
      await step3Btn.click();
      await wait(2500);
    }

    // Step 3: Blast Radius Assessment
    const step4Btn = page.getByRole('button', { name: /Proceed to Step 4/i });
    if (await step4Btn.isVisible()) {
      await step4Btn.click();
      await wait(2000);
    }

    // Step 4: 2FA & Authorization
    const confirmInput = page.getByPlaceholder(/CONFIRM-RECALL/i);
    if (await confirmInput.isVisible()) {
      await confirmInput.fill('CONFIRM-RECALL-BG-2024-8891-ORG');
      await wait(1000);
    }
    const tokenInput = page.getByPlaceholder(/123456/i);
    if (await tokenInput.isVisible()) {
      await tokenInput.fill('123456');
      await wait(1000);
    }
    const broadcastBtn = page.getByRole('button', { name: /Broadcast Emergency Recall/i });
    if (await broadcastBtn.isVisible()) {
      await broadcastBtn.click();
      await wait(3000);
    }
  }

  // Scene 6: Evidence Vault (1:15 - 1:30)
  console.log('Recording Scene 6: Evidence Vault...');
  await page.getByRole('link', { name: /Evidence Vault/i }).click();
  await wait(2500);
  await page.evaluate(() => window.scrollBy({ top: 250, behavior: 'smooth' }));
  await wait(2000);

  // Scene 7: Cryptographic Audit Ledger (1:30 - 1:45)
  console.log('Recording Scene 7: Audit Logs & Chain Verification...');
  await page.getByRole('link', { name: /Audit Logs/i }).click();
  await wait(2000);

  const verifyBtn = page.getByRole('button', { name: /Verify Chain Integrity/i });
  if (await verifyBtn.isVisible()) {
    await verifyBtn.click();
    await wait(2500);
  }

  const exportBtn = page.getByRole('button', { name: /Export Safety Audit|Export CSV/i });
  if (await exportBtn.isVisible()) {
    await exportBtn.click();
    await wait(2000);
  }

  // Final wrap-up on dashboard
  console.log('Recording Wrap-up on Dashboard...');
  await page.getByRole('link', { name: /Overview/i }).click();
  await wait(3000);

  // Close context to finish video
  const videoObj = page.video();
  await context.close();
  await browser.close();

  if (videoObj) {
    const videoPath = await videoObj.path();
    console.log(`Video recorded successfully to temporary path: ${videoPath}`);
    const finalPath = path.join(videoDir, 'batchguard-demo-walkthrough.webm');
    if (fs.existsSync(videoPath)) {
      fs.copyFileSync(videoPath, finalPath);
      const stat = fs.statSync(finalPath);
      console.log(`Final video verified at: ${finalPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  }
}

record().catch((err) => {
  console.error('Error recording demo video:', err);
  process.exit(1);
});
