# BatchGuard — Official Spoken Voiceover Narration Script

> **Video Asset:** [`docs/evidence/video/batchguard-final-narrated-demo.mp4`](batchguard-final-narrated-demo.mp4)  
> **Total Duration:** 2 minutes 51.01 seconds  
> **Target Platform:** AWS Builder Center Weekend Challenge (*No Pipeline, No Problem*)  
> **Synthesized Voice:** `en-US-ChristopherNeural` (Rate: +16%)  

---

## Word-for-Word Narration Script & Timings

### Scene 1: Opening Hook & Problem Statement (`0:00 – 0:24`)
* **Duration:** 23.50 seconds
* **Visual Screen:** Operations Overview Dashboard (`/dashboard`)
* **Spoken Narration:**
> *"Every year, foodborne pathogens sicken forty-eight million Americans. When outbreaks occur, legacy supply chains take days of manual calls and paper manifests to locate contaminated lots. In that window, tainted food stays on shelves, while panicked blanket recalls destroy millions of dollars in safe food. Today, we present BatchGuard: an event-driven serverless product recall intelligence platform."*

---

### Scene 2: Operations Dashboard & Live Telemetry (`0:24 – 0:46`)
* **Duration:** 21.84 seconds
* **Visual Screen:** Operations Dashboard, KPI cards, and cold-chain temperature telemetry chart
* **Spoken Narration:**
> *"Here on the executive dashboard, food safety officers monitor operational health across nationwide facilities in real time. Notice the amber DEMO MODE badge in the header—clearly indicating that this public web application runs in-browser with simulated supply chain data. Across the country, cold-chain temperature telemetry curves track pallet transit to detect thermal abuse before food reaches consumers."*

---

### Scene 3: Bidirectional Traceability & Provenance (`0:46 – 1:13`)
* **Duration:** 27.31 seconds
* **Visual Screen:** Batch Registry (`/batches`) and Batch Details (`/batches/BG-2024-8891-ORG`)
* **Spoken Narration:**
> *"On the Batch Details screen, BatchGuard delivers instantaneous bidirectional provenance. Tracing backward, we track this organic spinach lot directly to Salinas Valley Organics, Field 4B, harvested on October 28th. Tracing forward, we monitor warehouse arrivals and carrier line-hauls across distribution nodes. Our engine calculates an automated ninety-eight point four percent KDE traceability confidence score and generates standard GS1-128 pallet placards in one click."*

---

### Scene 4: One-Click Recall Orchestration & Blast-Radius (`1:13 – 1:49`)
* **Duration:** 35.40 seconds
* **Visual Screen:** Recall Command Center (`/recalls`) and 4-Step Targeted Recall Wizard
* **Spoken Narration:**
> *"Now, let us trigger BatchGuard's signature capability: One-Click Recall Orchestration. When our quality lab flags Listeria contamination, we select the lot and classify it as FDA Class I Critical. In Step 3, BatchGuard automatically traverses the downstream distribution graph in under two seconds—pinpointing eighteen thousand four hundred fifty units across two distribution centers and retail stores, while intercepting trucks en route. In Step 4, we enforce two-factor authentication before broadcasting. In demo mode, this simulates our AWS Step Functions orchestration workflow without live cloud side effects."*

---

### Scene 5: Evidence Vault & Cryptographic Audit Ledger (`1:49 – 2:15`)
* **Duration:** 25.63 seconds
* **Visual Screen:** Evidence Vault (`/evidence`) and Immutable Audit Trail (`/audit-logs`)
* **Spoken Narration:**
> *"In the Evidence Vault, lab certificates and inspection photos upload directly to Amazon S3 via pre-signed URLs—bypassing server compute overhead. Every critical tracking event is sealed into an append-only, content-addressable SHA-256 hash chain. Clicking Verify Chain Integrity cryptographically validates the entire ledger from the Genesis block forward. Note that this public demonstration operates on synthetic demonstration data."*

---

### Scene 6: AWS Architecture & Explicit Deployment Disclosure (`2:15 – 2:51`)
* **Duration:** 40.44 seconds
* **Visual Screen:** Operations Dashboard wrap-up, brand logo, and repository links
* **Spoken Narration:**
> *"Under the hood, BatchGuard is built for the AWS No Pipeline, No Problem philosophy: one hundred percent serverless with zero servers to manage. Our open-source repository provides an AWS SAM template specifying twenty Python 3.12 Lambdas, a Step Functions Standard Workflow with human task tokens, a DynamoDB single-table schema, and an S3 evidence vault. One hundred eight backend tests and thirty-two Playwright browser tests pass with one hundred percent success. The public frontend is deployed on Vercel in demonstration mode. The AWS backend is implemented and locally tested, but cloud deployment is currently restricted by organizational policies. Thank you from the BatchGuard team."*

---

## Manual Recording Runbook (Alternative to Automated Video)

If a presenter wishes to record this walkthrough manually with a live microphone:
1. Open [`https://batchguard-pi.vercel.app/dashboard`](https://batchguard-pi.vercel.app/dashboard) in Google Chrome in Full Screen (1920 × 1080).
2. Launch OBS Studio or Loom recording the browser window.
3. Follow the 6 scene actions described above while reading each section aloud at a comfortable, natural speaking pace.
4. Export as MP4 (H.264 / AAC) ensuring duration is between 2:30 and 3:00.

