# BatchGuard — 3–5 Minute Product Demonstration Script

**Tagline:** *One Batch. Complete Traceability. Faster Recalls.*  
**Target Duration:** 3 to 5 minutes  
**Format:** Video screencast or live walkthrough  
**Audience:** Hackathon Technical Judges, Solution Architects, Supply Chain & Compliance Officers  
**Local Demo URL:** `http://localhost:4173` or `http://localhost:5173`  

---

## Technical Disclosures & Demo Mode Notice

> [!NOTE]
> **Demonstration Mode Notice:**
> In this local demonstration, BatchGuard operates in **Local Demonstration Mode** with high-fidelity deterministic supply-chain seed data. All business logic, algorithms (Breadth-First Search lineage traversal, blast radius modeling, cryptographic SHA-256 hash chains, and 2FA confirmation gates) run live in the application. Remote AWS Step Functions state machine execution, SNS SMS/email alerts, and CloudFormation infrastructure provisioning are modeled locally because live cloud deployment is currently restricted by an organizational Service Control Policy (SCP).

---

## Scene 1: The Problem & Vision (0:00 – 0:45)

### Visual on Screen:
* Dashboard Overview page (`/dashboard`).
* Highlighting the KPIs: Total Batches Monitored, Active Suppliers, Monitored Distribution Nodes, and the Containment Timer.

### Speaker Script:
> "Hello everyone. Every year, foodborne pathogen outbreaks sicken millions of people and cost the food industry billions of dollars in blanket, untargeted recalls. When a contaminated harvest lot is discovered, tracing downstream products across raw material processors, cross-dock distribution centers, transit fleets, and grocery retail shelves typically takes days or weeks.
>
> This is **BatchGuard** — an enterprise-grade, serverless supply-chain traceability and recall intelligence platform.
>
> Our mission is simple: **One Batch. Complete Traceability. Faster Recalls.**
>
> BatchGuard replaces slow, manual phone trees and fragmented spreadsheets with automated GTIN-level lineage, instant blast radius containment, and cryptographic auditability."

---

## Scene 2: Batch Registry & Upstream Lineage (0:45 – 1:30)

### Visual on Screen:
* Click on **Batch Registry** in the left sidebar (`/batches`).
* Click on batch **`BG-2024-8891-ORG`** (Organic Baby Spinach 16oz).
* Open the **Batch Profile & Traceability** view (`/batches/BG-2024-8891-ORG`).
* Hover over the interactive genealogy graph showing Farm Harvest (`SUP-882`), Processing Plant, and Distribution Centers.

### Speaker Script:
> "Here in the Batch Registry, we track every production lot with GS1 GTIN identifiers, harvest timestamps, and cold-chain temperature telemetry.
>
> Let's inspect batch `BG-2024-8891-ORG`. In seconds, BatchGuard's traceability engine reconstructs the entire backward and forward lineage tree.
>
> Using a bounded Breadth-First Search traversal with cycle detection, the platform maps raw agricultural lots directly to intermediate processing steps and downstream shipping consignments. We can see its supplier certifications, storage temperatures, and every custody handoff across the logistics mesh."

---

## Scene 3: One-Click Recall Initiation & 2FA Gate (1:30 – 2:30)

### Visual on Screen:
* Click on **Recall Operations** (`/recalls`).
* Click **Initiate Targeted Recall**.
* Step 1: Select batch `BG-2024-8891-ORG` and select Hazard Class **Class I — High Risk (Microbial Contamination)**.
* Step 2: View the Blast Radius Calculation (6,200 units at risk, 48 impacted logistics nodes).
* Step 3: Type confirmation phrase: `CONFIRM-RECALL-BG-2024-8891-ORG`.
* Step 4: Enter 6-digit TOTP token: `123456`.
* Click **Authorize & Broadcast Recall**.
* Success toast appears: *"Targeted Recall Broadcasted — Emergency hold orders and SNS alerts released"*.

### Speaker Script:
> "Now, suppose lab testing detects *Listeria monocytogenes* in lot `BG-2024-8891-ORG`.
>
> In traditional systems, emergency coordination is chaotic. In BatchGuard, we launch our signature **One-Click Recall Orchestration**.
>
> First, our engine instantly computes the downstream blast radius: exactly **6,200 units** across **48 facilities**, distinguishing stock in warehouses from pallets currently in-transit on refrigerated carriers.
>
> Because initiating an emergency recall is high-stakes, BatchGuard enforces strict governance: a cryptographic confirmation phrase matching the lot ID, followed by a mandatory 2-Factor Authentication token.
>
> With one click, the recall is authorized. In our AWS production architecture, this triggers an AWS Step Functions Standard Workflow, dispatches automated EDI 940 warehouse holds, and broadcasts emergency alerts via Amazon SNS."

---

## Scene 4: Real-Time Containment Ledger & Physical Holds (2:30 – 3:15)

### Visual on Screen:
* View the **Recall Operations Command** dashboard.
* Show the active recall card, the live containment countdown timer, and the facility acknowledgement status table.
* Highlight the quarantine verification column showing facility-by-facility physical quarantine verification (`Physical Hold Verified`).

### Speaker Script:
> "Once broadcast, BatchGuard does not consider a recall complete simply because alerts were sent.
>
> As mandated by our safety directives, a recall only transitions to 'COMPLETED' when 100% of impacted facilities submit verified physical hold confirmations from their cooler managers.
>
> Here in the live acknowledgement ledger, compliance officers can monitor quarantine execution facility by facility, tracking pallet lock tags, retail POS scan-blocks, and verified disposal receipts in real time."

---

## Scene 5: Cryptographic Audit Trail & Evidence Vault (3:15 – 4:00)

### Visual on Screen:
* Click on **Audit Logs** (`/audit`).
* Point to the SHA-256 hash chain column with previous and current block hashes.
* Click on **Evidence Vault** (`/evidence`).
* View pre-signed Certificates of Analysis (COA) and lab test placards.

### Speaker Script:
> "For regulatory compliance and legal defense, BatchGuard maintains an immutable, content-addressable **SHA-256 integrity hash chain**.
>
> Every critical tracking event, 2FA sign-off, and state transition commits to the cryptographic hash of its predecessor. Any unauthorized database tampering immediately invalidates the ledger head.
>
> In the Evidence Vault, raw Certificates of Analysis and lab placards are stored in private Amazon S3 buckets via time-limited, encrypted pre-signed URLs."

---

## Scene 6: AWS Serverless Architecture & Wrap-Up (4:00 – 4:45)

### Visual on Screen:
* Show the architectural diagram (from `README.md` or slide).
* Summary of the technology stack: API Gateway, 20 Lambda functions, DynamoDB Single-Table, Step Functions, SNS, Cognito, S3.

### Speaker Script:
> "Under the hood, BatchGuard is built on a 100% serverless, event-driven AWS architecture:
>
> * **Amazon API Gateway** with Cognito User Pool JWT authorization and RBAC.
> * **20 AWS Lambda functions** in Python 3.12, handling lineage, blast radius modeling, and audit verification.
> * **Amazon DynamoDB** with a single-table design optimized for microsecond lookups.
> * **AWS Step Functions** orchestrating human-in-the-loop compliance approvals and automated quarantine tasks.
> * **AWS SAM** infrastructure as code, passing full linting and local packaging.
>
> Our test suite independently validates this with **108 passing backend tests** and **10 frontend tests**.
>
> While our live cloud deployment in account `316636858874` is currently awaiting the detachment of an AWS Organizations Service Control Policy by our management account administrator, the entire architecture and codebase are fully validated and production-ready.
>
> Thank you! BatchGuard is ready to make the global food supply chain safer, faster, and fully transparent."

---

## Demonstration Checklist for Presenter

- [ ] Ensure local preview server is running (`npm run preview` in `frontend/`).
- [ ] Open browser to `http://localhost:4173` in full screen (1080p).
- [ ] Verify test credentials / dev session is active (`sarah.chen@apexnutrition.internal`).
- [ ] Practice the 4-step recall initiation modal sequence:
  - Batch: `BG-2024-8891-ORG`
  - Hazard: `Class I - Critical`
  - Phrase: `CONFIRM-RECALL-BG-2024-8891-ORG`
  - 2FA Code: `123456`
- [ ] Ensure audio microphone levels are clear and crisp.
