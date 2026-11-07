# BatchGuard — Video Recording Checklist

**Target Application:** [https://batchguard-pi.vercel.app/dashboard](https://batchguard-pi.vercel.app/dashboard)  
**Reference Script:** [`docs/DEMO_SCRIPT.md`](DEMO_SCRIPT.md)  
**Target Video Duration:** 3 to 5 minutes (Planned pacing: 4 minutes 15 seconds)  
**Target Resolution:** 1920 × 1080 (1080p Desktop Viewport, 60 FPS recommended)  
**Audio Quality:** Clear directional microphone with low background noise  

> [!IMPORTANT]
> **Demo Mode Disclosure Requirement:**  
> The presenter must explicitly draw attention to the persistent **DEMO MODE** badge in the top navigation bar during the Overview section and reiterate before recall authorization that the live frontend operates in simulation mode with realistic mock datasets, while the complete AWS serverless backend is fully implemented and tested in the project repository.

---

## 1. Pre-Recording Environment Checklist

- [ ] Browser: Google Chrome or Chromium (latest stable).
- [ ] Viewport: Full screen at 1920 × 1080 (100% zoom level, bookmarks bar hidden).
- [ ] Browser Cache: Cleared or opened in a clean session so mock datasets start in pristine default state.
- [ ] URL: Pre-loaded at `https://batchguard-pi.vercel.app/dashboard`.
- [ ] Network: Stable internet connection (production Vercel static assets cached).
- [ ] Audio: Test microphone input levels; verify zero clipping or hum.
- [ ] Recording Software: OBS Studio, QuickTime, or Loom configured for full display capture.

---

## 2. Step-by-Step Recording Sequence

| Step # | Timestamp | Route / Screen | User Interactions | Suggested Narration Keypoints | Expected UI Response | Verified In Demo |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: |
| **01** | `0:00 - 0:30` | `/dashboard` | Smooth mouse movement across header, highlight title & tagline | The problem: 48M Americans face foodborne illnesses yearly; traditional recalls take 6–14 days, causing massive waste and public health risks. | Header displays "BatchGuard" and "One Batch. Complete Traceability. Faster Recalls." | [x] |
| **02** | `0:30 - 0:50` | `/dashboard` | Hover over top navigation and status badge | The solution: BatchGuard collapses recall containment from days to minutes via event-driven serverless architecture. | Top bar renders amber `DEMO MODE` badge and operational simulation indicators. | [x] |
| **03** | `0:50 - 1:20` | `/dashboard` | Hover over 4 KPI cards and cold-chain temperature telemetry chart | Dashboard overview: 12,482 active lots, 4,821 nodes, 48.2m containment velocity. Disclose DEMO MODE indicator in top header. | Telemetry sparklines render smoothly; DEMO MODE pill is clearly visible. | [x] |
| **04** | `1:20 - 1:50` | `/batches` | 1. Click **Batch Registry** in sidebar.<br/>2. Click **+ Register New Batch**.<br/>3. Enter Lot `L-904-C`, GTIN `00850012345678`, Product `Organic Baby Spinach 16oz`.<br/>4. Click **Commit Lot to Ledger**. | Ingestion speed: captures GTIN-14, grower facility, harvest timestamps, and temperature ranges in seconds. Disclose simulated in-memory state update. | Modal opens cleanly; upon commit, success toast appears; new lot prepends to table. | [x] |
| **05** | `1:50 - 2:20` | `/batches/BG-2024-8891-ORG` | 1. Click **Lineage** button on batch `BG-2024-8891-ORG`.<br/>2. Hover over KDE Traceability Score.<br/>3. Click **Print GS1-128 Placard**. | Bidirectional provenance: backward lineage traces to Salinas Valley Organics Field 4B; forward lineage shows DC arrivals; 98.4% KDE confidence score. | Batch details load with interactive telemetry chart and KDE breakdown; placard toast fires. | [x] |
| **06** | `2:20 - 2:50` | `/recalls` | 1. Click **Recall Management** in sidebar.<br/>2. Click **+ Initiate Targeted Recall**.<br/>3. Step 1: Select batch `BG-2024-8891-ORG`, click Proceed.<br/>4. Step 2: Select **Class I Critical**, click Proceed. | Signature feature: One-Click Recall Orchestration. Simulating confirmed pathogen cross-contact (Listeria). Rapid hazard severity classification. | Wizard modal opens with animated step progression; hazard cards highlight on click. | [x] |
| **07** | `2:50 - 3:15` | `/recalls` (Step 3) | 1. Inspect Blast Radius Ledger.<br/>2. Highlight 3 impacted facilities, 18,450 units, and carrier intercepts.<br/>3. Click **Proceed to Step 4**. | Surgical isolation: instant downstream graph traversal pinpoints exact DCs, en route transit line-hauls, and retail storefronts without guessing. | Dynamic blast radius table populates showing allocation counts and intercept status. | [x] |
| **08** | `3:15 - 3:35` | `/recalls` (Step 4) | 1. In confirmation phrase field, type: `CONFIRM-RECALL-BG-2024-8891-ORG`.<br/>2. In 2FA token field, enter demo token: `123456`.<br/>3. Click **Broadcast Emergency Recall**. | Security & human authorization: requires confirmation phrase and demonstration 2FA code. Disclose that in Demo Mode, this triggers an in-browser simulated state transition, and would trigger the AWS Step Functions workflow when connected to live backend. | Broadcast button unlocks upon valid demo inputs; modal submits, and active recall card updates. | [x] |
| **09** | `3:35 - 3:55` | `/evidence` | 1. Click **Evidence Vault** in sidebar.<br/>2. Hover over Certificate of Analysis (COA) entry.<br/>3. Click **Upload Evidence Certificate** to show drag-and-drop zone. | Tamper-proof evidence vault: direct-to-S3 pre-signed upload URL architecture avoids Lambda memory bottlenecks and preserves audit documents. | Document table shows cryptographic SHA-256 hashes and pre-signed S3 download links. | [x] |
| **10** | `3:55 - 4:15` | `/audit-logs` | 1. Click **Audit Logs** in sidebar.<br/>2. Highlight Genesis block hash (`0x0000...0000`).<br/>3. Click **Verify Chain Integrity**.<br/>4. Click **Export Safety Audit (CSV)**. | Cryptographic audit ledger: append-only content-addressable SHA-256 hash chain where each block seals the predecessor hash. Instant federal audit readiness. | Integrity verification indicator turns green; CSV download initiates without error. | [x] |
| **11** | `4:15 - 4:45` | `template.yaml` / Architecture Slide | 1. Switch to architecture diagram or code repository view.<br/>2. Highlight 20 Lambda functions, Step Functions ASL, DynamoDB, and SNS topics. | Pure serverless backend: 20 modular Python 3.12 Lambdas, single-table DynamoDB, Step Functions Standard Workflow. 108 backend tests & 32 Playwright tests pass. Disclose SCP account boundary. | Architecture diagram displays cleanly; conclude presentation with tagline. | [x] |

---

## 3. Post-Recording Quality Checks

Before finalizing the video export:
- [ ] **Audio Clarity:** Confirm voice narration is audible over any background audio; no clicks or echoes.
- [ ] **Pacing:** Confirm video duration is between 3:00 and 5:00 minutes (target 4:15).
- [ ] **Visual Crispness:** Text, GTINs, and hashes must be legible at 1080p without blurring.
- [ ] **Disclosures Verified:** Confirm DEMO MODE disclosure occurred in Overview and Recall sections.
- [ ] **Export Format:** MP4 container, H.264 video codec, AAC audio codec, 1080p resolution.

---

## 4. Local Automated Screen Recording Workflow (Optional Tooling)

For automated capture using Playwright's built-in video recording:
```bash
# Set Playwright to record video during test runs
export PLAYWRIGHT_VIDEO=on
cd frontend
npx playwright test e2e/05-cross-feature-workflows.spec.ts --project="Desktop Chrome"
```
*Playwright will output recorded `.webm` files into `frontend/test-results/`.*

