# BatchGuard

<p align="center">
  <strong>One Batch. Complete Traceability. Faster Recalls.</strong><br>
  <em>An event-driven serverless food supply-chain traceability and recall intelligence platform.</em>
</p>

<p align="center">
  <a href="https://batchguard-pi.vercel.app/dashboard"><strong>Live Demonstration (Vercel) »</strong></a> ·
  <a href="#system-architecture">Architecture</a> ·
  <a href="#quickstart--local-setup">Quickstart</a> ·
  <a href="docs/architecture.md">System Specification</a> ·
  <a href="docs/DEMO_SCRIPT.md">Demo Script</a> ·
  <a href="docs/SUBMISSION.md">Hackathon Submission</a>
</p>

---

## Executive Summary

**BatchGuard** is an enterprise-grade food supply-chain traceability and recall intelligence platform designed for agricultural growers, food processors, distribution centers (DCs), transit carriers, and retail operators. It unifies backward ingredient genealogy, cold-chain telemetry monitoring, tamper-proof lab evidence vaulting, and signature **One-Click Recall Orchestration** into a secure, responsive, event-driven web application.

When a food safety emergency occurs (such as pathogen detection, severe allergen cross-contact, or undeclared ingredient contamination), BatchGuard identifies upstream parent lots via backward BFS traversal, calculates the downstream blast radius across logistics nodes in under 2 seconds, generates automated hold orders (`EDI 940` equivalent), diverts en route trucks, and coordinates targeted multi-channel notifications with cryptographic audit trails.

---

## Deployment Status & Architecture Profiles

> [!IMPORTANT]
> ### Public Demonstration vs. AWS Serverless Backend Architecture
> * **Publicly Deployed Demonstration (Vercel):** The BatchGuard frontend is deployed and publicly accessible on **Vercel** at [https://batchguard-pi.vercel.app/dashboard](https://batchguard-pi.vercel.app/dashboard) as an interactive demonstration running in **DEMO MODE**. It simulates multi-tier batch genealogy, blast radius isolation, and multi-node recall operations in-browser with rich mock data. It does not invoke live AWS backend services.
> * **Not Deployed to AWS:** The AWS serverless backend infrastructure is **not currently deployed to AWS** due to an explicit AWS Organizations Service Control Policy (SCP `p-ifuj16mo`) restricting resource creation in the target evaluation account (`316636858874`). Do not assume AWS Lambda, DynamoDB, or Step Functions are live in the public demonstration.
> * **Dual Deployment Profiles Implemented:**
>   1. **Full Production Profile (`template.yaml`):** 48 declared CloudFormation resources (20 Lambda functions: 7 API handlers and 13 Step Functions task workers), Amazon Cognito User Pool with TOTP MFA, Amazon S3 Evidence Vault (`AES-256` SSE-S3), Amazon SNS emergency alert topic, DynamoDB single-table schema with PITR, and Step Functions recall orchestrator state machine (`statemachine/recall_orchestrator.asl.json`).
>   2. **Minimal Deployment Profile (`template.minimal.yaml`):** 17 declared CloudFormation resources (7 Lambda functions: 2 API handlers and 5 Step Functions task workers), 1 DynamoDB table (`PAY_PER_REQUEST`), 1 Step Functions 4-stage sequential state machine (`statemachine/minimal_recall_orchestrator.asl.json`), 1 REST API Gateway with CORS and throttling, and 7 explicit 14-day CloudWatch log groups. Zero VPC or NAT Gateway dependencies.
> * **Verified by Automated Testing:** Fully validated by 176 automated tests (123 backend pytest tests, 21 frontend unit tests, and 32 Playwright production browser E2E tests) with SAM lint validation on both templates.

---

## Operational Connection Modes

BatchGuard supports two operational connection modes configurable at runtime via environment variables:

| Feature / Dimension | `LOCAL_DEMO_MODE` (Default) | `AWS_CONNECTED` (Minimal MVP) |
| :--- | :--- | :--- |
| **Activation** | Default mode (or `VITE_CONNECTION_MODE=DEMO`) | Set `VITE_CONNECTION_MODE=AWS` & `VITE_API_BASE_URL` |
| **Target Infrastructure** | Zero AWS connection required; completely offline in-browser client | Amazon API Gateway $\rightarrow$ AWS Lambda $\rightarrow$ DynamoDB & Step Functions |
| **Header Badge** | Displays `DEMO MODE` (amber status pill) | Displays `AWS CONNECTED (MVP)` (pulsing emerald badge upon verified probe) |
| **Batch Operations** | In-browser simulated batch registration and query | Real HTTP requests to `POST /v1/batches` and `GET /v1/batches/{id}` |
| **Recall Orchestration**| In-browser 4-step wizard with simulated blast radius | Real HTTP requests to `POST /v1/recalls` executing 4-stage Step Functions workflow |
| **Error Handling** | Always succeeds with simulated domain records | True AWS server responses; real errors are propagated to the user (no silent fallback) |
| **Unsupported Modules** | All modules interactively simulated | Modules not in minimal profile (`Supply Chain`, `Suppliers`, `Evidence Vault`, `Audit Logs`) are labeled `Demo` in the sidebar |

---

## Problem Statement & Objectives

### The Industry Challenge
Traditional food recalls in the United States and globally take an average of **3 to 14 days** to identify affected facilities, track down downstream shipments, and confirm physical quarantine. During this lag:
* Contaminated perishable foods remain on grocery shelves and in restaurant coolers.
* Manufacturers resort to blunt, nationwide product withdrawals costing tens of millions of dollars in destroyed uncontaminated inventory.
* Chain-of-custody handoffs between farms, truckers, and third-party logistics (3PL) hubs are fragmented across paper bills of lading and unlinked spreadsheets.

### BatchGuard's Objectives
1. **Compress Containment to Minutes:** Reduce mean time to quarantine (MTTQ) from days to under 60 minutes via automated blast radius computation and POS scan-blocking.
2. **Deterministic Upstream & Downstream Lineage:** Model multi-tier ingredient composition with backward BFS graph exploration, cycle detection, and KDE traceability confidence scoring.
3. **Automated Chain-of-Custody Coordination:** Unify distribution tracking across primary DCs, transit fleets, and retail storefronts with real-time temperature telemetry.
4. **Cryptographic Proof of Containment:** Maintain an immutable, content-addressable SHA-256 hash chain recording every status transition, approval signature, and facility quarantine sign-off.

---

## Key Features

* **Food Batch Registration:** Capture GS1 GTIN-14, production lot codes, harvest timestamps, initial case quantities, unit temperatures, and verified grower associations.
* **Traceability & Lineage Engine:** Directed acyclic graph (DAG) modeling parent-child ingredient relationships with backward traversal (depth capped at 10) and automatic circular reference severing.
* **One-Click Recall Orchestration (Signature Capability):** 4-step guided incident wizard:
  1. Incident Logging & Target Food Batch Selection
  2. Hazard Severity Classification (FDA Class I Critical / Class II / Class III)
  3. Blast Radius Assessment & Downstream Facility Ledger Review
  4. Cryptographic Confirmation & Two-Factor Authentication (2FA OTP)
* **AWS Step Functions Execution:** Standard workflow coordinating request validation, risk assessment, `.waitForTaskToken` compliance officer approval gate, emergency notification dispatch, and atomic lock release.
* **Evidence Management Vault:** Encrypted compliance repository for Certificates of Analysis (COA), USDA organic certifications, and bills of lading using 15-minute pre-signed S3 URLs (`SSE-S3`).
* **Facility Quarantine Ledger:** Live tracking of facility-by-facility physical cooler holds, locked unit counts, and carrier diversions.
* **Immutable Audit Trail:** Append-only SHA-256 hash chain providing cryptographic proof of event sequence and tamper evidence.
* **Dual-Mode Architecture:** Seamless operation in offline/demonstration mode with zero latency or live AWS serverless execution when configured.

---

## System Architecture

```
                    +------------------------------------+
                    |        BatchGuard Frontend         |
                    | React + TypeScript + Tailwind CSS  |
                    | (Google Stitch Tokens / DEMO MODE) |
                    +-----------------+------------------+
                                      | HTTPS / REST
                                      v
                    +-----------------+------------------+
                    |        Amazon API Gateway          |
                    |       REST API (HTTP /v1)          |
                    +-----------------+------------------+
                                      |
                     +----------------+----------------+
                     |                |                |
                     v                v                v
             +---------------+ +--------------+ +---------------+
             | Batch Handler | | Recall API   | | Evidence API  |
             | (AWS Lambda)  | | (AWS Lambda) | |  (AWS Lambda) |
             +-------+-------+ +------+-------+ +-------+-------+
                     |                |                 |
                     |                v                 | Pre-signed URLs
                     |        +---------------+         v
                     |        | Step Function |  +---------------+
                     |        | Orchestrator  |  |   Amazon S3   |
                     |        +-------+-------+  | Evidence Vault|
                     |                |          +---------------+
                     |                v
                     |        +---------------+
                     |        | Worker Lambdas|
                     |        +-------+-------+
                     |                |
                     v                v
             +---------------+ +--------------+
             |Amazon DynamoDB| |  Amazon SNS  |
             | Single Table  | |Notifications |
             +---------------+ +--------------+
```

*(See [`docs/architecture.md`](docs/architecture.md) for complete sequence diagrams, failure modes, and mathematical formulations).*

---

## Technology Stack

| Layer | Technologies | Role in BatchGuard |
| :--- | :--- | :--- |
| **Frontend UI** | React 18.3.1, TypeScript 5.6.3, Vite 5.4.11 | High-performance SPA with client-side routing |
| **Styling & Design** | Tailwind CSS 3.4.15, Google Stitch Tokens | Deep Forest Green (`#14532D`) & Emerald (`#10B981`) theme |
| **Visualizations** | Recharts, Inline SVG sparklines | Temperature telemetry curves, KDE confidence scores |
| **Testing** | Playwright 1.65.0, Node Test Runner | 32 E2E browser tests, 21 unit tests |
| **Backend Compute** | Python 3.12, AWS Lambda (ARM64) | 20 modular handlers and Step Functions task workers in `template.yaml` |
| **Orchestration** | AWS Step Functions (Standard Workflow) | 4-step recall state machine with `.waitForTaskToken` |
| **Database** | Amazon DynamoDB (Single-Table Pattern) | Sub-10ms key-value queries with GSI1/GSI2, PITR & SSE |
| **Object Store** | Amazon S3 (`AES-256` SSE-S3) | Tamper-proof evidence vault with pre-signed PUT/GET URLs |
| **Alerts & Fan-Out** | Amazon SNS | High-priority emergency broadcast notifications |
| **Auth & Governance** | Amazon Cognito User Pools, TOTP MFA | Role-based access control (Admin, Compliance Officer) |
| **IaC & Deployment** | AWS SAM & CloudFormation | Declarative serverless infrastructure specification |

---

## Quickstart & Local Setup

### Prerequisites
* **Node.js:** v18+ (Node.js v20+ or v24 LTS recommended)
* **Python:** 3.12+
* **Git:** For version control
* **AWS SAM CLI:** Recommended for local API testing (`sam --version`)
* **Docker:** Required for running SAM local Lambda containers

### 1. Clone Repository & Setup Environment
```bash
git clone https://github.com/ASingha165/BATCHGUARD.git
cd BATCHGUARD
cp .env.example .env
```

### 2. Frontend Development & Local Execution
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. The application will start in **DEMO MODE** automatically.

### 3. Run Comprehensive Test Suites
```bash
# Frontend Unit Tests (21 tests)
cd frontend
npm test

# TypeScript Static Typecheck (0 errors)
npm run typecheck

# Production Bundle Build
npm run build

# End-to-End Browser Playwright Tests (32 tests)
npx playwright test

# Backend Pytest Suite (123 tests: unit, integration, RBAC, minimal deployment)
cd ..
pytest backend/tests

# AWS SAM Template Validation & Linting (Both Profiles)
sam validate -t template.yaml --lint
sam validate -t template.minimal.yaml --lint
```
**Total Automated Verification:** **176 tests passed / 0 failed (100% pass rate)**.

---

## AWS Deployment Architecture Profiles & Runbooks

BatchGuard provides two declarative infrastructure specifications targeting different deployment requirements:

### Profile 1: Minimal AWS Serverless Deployment (`template.minimal.yaml`)
Designed for fast, low-cost proof-of-concept evaluation without complex networking or enterprise auth dependencies:
* **Resources:** Exactly **17 CloudFormation resources** (1 REST API Gateway, 1 DynamoDB table, 7 Lambda functions, 7 LogGroups, 1 Step Functions state machine).
* **Cost Profile:** Zero NAT Gateways (saves ~$32.40/month per NAT), on-demand DynamoDB (`PAY_PER_REQUEST`), unreserved compute, and 14-day CloudWatch log retention.
* **Orchestration:** 4-stage sequential Step Functions state machine (`CalculateBlastRadius` $\rightarrow$ `LockInventory` $\rightarrow$ `RecordAudit` $\rightarrow$ `FinalizeRecall`) with automated error catching.
* **Authentication:** Hardened with IAM SigV4 support for non-public automated testing; unverified client headers are strictly rejected in deployed runtimes.
* **Runbook:** See [`docs/MINIMAL_AWS_DEPLOYMENT_RUNBOOK.md`](docs/MINIMAL_AWS_DEPLOYMENT_RUNBOOK.md) for step-by-step PowerShell deployment instructions.

```powershell
# Deploy Minimal Profile to an authorized AWS account
sam deploy --guided `
  --template-file template.minimal.yaml `
  --stack-name BatchGuard-Minimal-dev `
  --region us-east-1 `
  --parameter-overrides Environment=dev LogLevel=INFO CorsAllowOrigin="https://batchguard-pi.vercel.app" `
  --capabilities CAPABILITY_IAM
```

### Profile 2: Full Production Architecture (`template.yaml`)
The complete enterprise specification:
* **Resources:** 48 declared CloudFormation resources (20 Lambda functions: 7 API handlers, 13 task workers).
* **Identity & Governance:** Amazon Cognito User Pool with TOTP MFA and custom group claims.
* **Evidence Storage:** Amazon S3 Evidence Vault (`AES-256` SSE-S3) with pre-signed PUT/GET URLs.
* **Alerts:** Amazon SNS topic for emergency recall fan-out notifications.
* **Runbook:** See [`docs/deployment.md`](docs/deployment.md) for full enterprise deployment procedures.

### AWS Deployment Prerequisites & Cost Notice:
* **Account Permissions:** Requires an unrestricted AWS account with permissions for `cloudformation:*`, `lambda:*`, `dynamodb:*`, `apigateway:*`, `states:*`, `logs:*`, and `iam:CreateRole`/`iam:PassRole`.
* **Cost Disclosure:** AWS deployment is **NOT guaranteed to be zero-cost**. Accounts older than 12 months have expired introductory API Gateway free tiers, and accounts with other active workloads may have exhausted shared free tier quotas.
* **Mandatory Teardown:** AWS Budgets are notification alerts, not hard spending caps. Run `sam delete --stack-name <stack-name>` immediately following evaluation to terminate all cloud resources.

---

## Demonstration Instructions

For an evaluator or reviewer exploring the live demonstration at [https://batchguard-pi.vercel.app/dashboard](https://batchguard-pi.vercel.app/dashboard):

1. **Dashboard Overview:** Review active production lots, monitored logistics nodes, mean containment velocity, and telemetry sparklines.
2. **Batch Registry:** Navigate to `/batches`, search for `BG-2024-8891-ORG` (Spinach 16oz), filter by status (`ACTIVE`, `QUARANTINED`), and register a new production lot.
3. **Batch Genealogy & Telemetry:** Click **Lineage** on lot `BG-2024-8891-ORG` to inspect upstream ingredient farms, harvest timestamps, temperature compliance, and generate a simulated GS1-128 placard.
4. **Targeted Recall Orchestration:** Navigate to `/recalls` and click **+ Initiate Targeted Recall** to experience the 4-step wizard:
   * Select batch `BG-2024-8891-ORG`.
   * Classify hazard severity as **Class I Critical** (Pathogen detection).
   * Review the blast radius: 48 impacted nodes across 3 SKUs and 18,450 units.
   * Authorize with phrase `CONFIRM-RECALL-BG-2024-8891-ORG` and 2FA OTP `123456`.
   * Submit broadcast and observe containment timer and facility quarantine ledger.
5. **Evidence Vault:** Navigate to `/evidence` to inspect compliance assays and simulate a pre-signed S3 document upload.
6. **Audit Trail:** Navigate to `/audit-logs` to inspect the SHA-256 hash chain and search events by actor or entity.

*(See [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) for a timed 3–5 minute presentation script).*

---

## Security & Reliability Considerations

* **Least-Privilege Execution:** Every Lambda function has an execution role scoped strictly to required table keys, S3 prefixes, or SNS topic ARNs.
* **Zero Credential Leaking:** The frontend never stores AWS secret access keys, session tokens, or plaintext passwords in `localStorage` or `sessionStorage` (verified by automated Playwright security audits).
* **Pre-signed Upload Protocol:** Large evidence files are uploaded directly to Amazon S3 via short-lived (15m) pre-signed URLs with size constraints, preventing memory exhaustion on backend compute.
* **Mutual Exclusion Lock:** DynamoDB conditional writes prevent race conditions when multiple incident coordinators attempt simultaneous recall actions on the same food batch.

---

## Known Limitations

1. **Live Cloud Backend Status:** The AWS serverless backend is fully implemented and tested locally but is not currently live on AWS due to an organizational Service Control Policy (SCP `p-ifuj16mo`) restricting resource provisioning in the evaluation account.
2. **Regulatory Positioning:** BatchGuard provides alignment frameworks and engineering tools for food traceability. It does not certify official FDA, FSMA 204, or GS1 compliance unless independently audited by qualified authorities.
3. **Demonstration Telemetry:** In the public Vercel demonstration, cold-chain temperature readings and carrier GPS coordinates are simulated in-browser.

---

## Documentation Index

* [System Architecture Specification](docs/architecture.md) — Comprehensive technical architecture, sequence diagrams & failure modes
* [Demonstration Presentation Script](docs/DEMO_SCRIPT.md) — Timed 3–5 minute evaluator walkthrough
* [Video Recording Checklist](docs/VIDEO_RECORDING_CHECKLIST.md) — Step-by-step evaluator recording guide & script cues
* [Hackathon Submission Package](docs/SUBMISSION.md) — Official AWS Challenge submission narrative
* [AWS Technical Evidence & Inventories](docs/evidence/AWS_TECHNICAL_EVIDENCE.md) — Implementation verification, test logs & schema inventories
* [Submission Audit Report](docs/SUBMISSION_AUDIT.md) — Pre-competition requirements and eligibility audit
* [Master Engineering Directives](AGENTS.md) — Architectural invariants and single source of truth
* [Database Schema & Access Patterns](docs/database-schema.md) — DynamoDB single-table design & GSI models
* [API Specification](docs/api-specification.md) — Complete REST endpoint documentation
* [Deployment Guide](docs/deployment.md) — AWS SAM deployment procedures

---

## License

This project is licensed under the MIT License — see the LICENSE file for details.
