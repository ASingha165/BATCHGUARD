# AGENTS.md — BatchGuard Engineering Master Directives

> **Single Source of Truth** for BatchGuard engineering, architecture, development workflow, and coding standards.
> Every agent, contributor, and automated workflow must comply with the directives defined herein.

---

## 1. Project Identity

* **Project Name:** BatchGuard
* **Tagline:** *One Batch. Complete Traceability. Faster Recalls.*
* **Repository:** `https://github.com/ASingha165/BATCHGUARD.git`
* **Target Environment:** AWS Serverless Architecture (Production-grade, secure, and event-driven).
* **Mission:** Provide end-to-end food supply-chain traceability, cold-chain telemetry visibility, and signature **One-Click Recall Orchestration** across manufacturers, suppliers, distribution centers, and retail points.

> [!IMPORTANT]
> Never claim that the application provides verified regulatory compliance (e.g. FSMA 204 or GS1 certification) unless independently audited and established. Frame compliance features as *alignment tools* and *traceability frameworks*.

---

## 2. Product Objectives & Target Audience

BatchGuard connects multiple enterprise tiers across the food and beverage supply chain:
1. **Manufacturers:** Register finished production lots, monitor critical tracking events (CTEs), link raw ingredient batches to output goods, and coordinate containment.
2. **Suppliers:** Provide harvest, processing, and ingredient certification, lot documentation, and chain-of-custody handoffs.
3. **Distribution Centers (DCs):** Ingest pallets, track storage conditions (telemetry), record warehouse movements, and execute automated hold orders (`EDI 940` equivalent).
4. **Retailers:** Monitor store allocations, scan-block quarantined lots at POS registers, and acknowledge containment orders.
5. **Quality & Compliance Officers:** Audit genealogy trees, inspect lab evidence, and initiate controlled, cryptographically verified targeted recalls.

### Primary Capabilities:
1. **Food Batch Registration:** Capture GTIN, lot codes, harvest/production timestamps, quantities, and supplier associations.
2. **Supplier Management:** Track verified partner facilities, Tier 1/2 status, and certifications.
3. **Batch Traceability & Lineage:** Upstream ingredient composition and downstream product flow graph.
4. **Distribution Tracking:** Multi-node chain of custody spanning transit carriers, cold-chain logs, and warehouse facilities.
5. **One-Click Recall Orchestration (Signature Feature):** Targeted 4-step wizard to assess blast radius, isolate affected nodes, trigger AWS Step Functions state machine execution, dispatch emergency SNS alerts, and enforce 2FA verification.
6. **Evidence Management Vault:** Secure S3 object storage with pre-signed upload URLs for lab test certificates, COAs (Certificates of Analysis), and bill-of-lading documents.
7. **Audit Logging:** Immutable append-only record of all critical events, state transitions, and user actions.
8. **Recall Acknowledgement Tracking:** Live status ledger tracking facility-by-facility sign-offs and physical quarantine metrics.

---

## 3. Technology Stack

### Frontend:
* **Framework:** React 18+ with TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS with custom Stitch design tokens
* **Icons:** Lucide Icons / Google Material Symbols Outlined
* **Visualizations:** Recharts for telemetry and KPI sparklines
* **State & Data Fetching:** Clean React state / TanStack Query or lightweight custom API client

### Backend:
* **Runtime:** Python 3.12 (AWS Lambda standard)
* **API Ingress:** Amazon API Gateway (HTTP/REST API)
* **Compute:** AWS Lambda (Modular, single-responsibility handlers)
* **Orchestration:** AWS Step Functions (Recall execution state machine)
* **Database:** Amazon DynamoDB (Single-table design pattern)
* **Object Storage:** Amazon S3 (Evidence Vault with SSE-S3 / KMS encryption & pre-signed URLs)
* **Messaging & Alerts:** Amazon SNS (Recall fan-out notifications)
* **Monitoring & Observability:** Amazon CloudWatch (Structured JSON logging & metrics)

### Infrastructure as Code (IaC):
* **Format:** AWS SAM (Serverless Application Model) / AWS CloudFormation
* **Templates:** `template.yaml` (SAM template defining API Gateway, Lambdas, DynamoDB tables, S3 bucket, Step Functions state machine, and SNS topics)

---

## 4. Repository Structure

```
BatchGuard/
├── .github/
│   └── workflows/              # CI/CD pipelines (lint, test, sam validate)
├── docs/
│   ├── architecture.md         # Detailed serverless architecture & Step Functions
│   ├── database-schema.md      # DynamoDB single-table schema & query access patterns
│   ├── api-specification.md    # OpenAPI / REST endpoint documentation
│   └── deployment.md           # AWS SAM deployment runbook
├── frontend/                   # React + TypeScript + Vite + Tailwind CSS
│   ├── public/
│   ├── src/
│   │   ├── assets/             # Brand logos & icons
│   │   ├── components/         # Reusable UI components (Buttons, Badges, Tables, Modals)
│   │   ├── layouts/            # Sidebar, Header, PageShell
│   │   ├── pages/              # Overview, BatchRegistry, BatchDetails, RecallOps, etc.
│   │   ├── services/           # API client layer (typed REST endpoints)
│   │   ├── types/              # Domain TypeScript interfaces & types
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/                    # Python 3.12 AWS Lambda functions
│   ├── handlers/
│   │   ├── batches/            # create_batch, get_batch, list_batches, trace_lineage
│   │   ├── recalls/            # initiate_recall, get_recall, acknowledge_recall, list_recalls
│   │   ├── suppliers/          # list_suppliers, create_supplier, get_supplier
│   │   ├── distribution/       # list_distribution_nodes, track_shipments
│   │   ├── evidence/           # get_presigned_url, list_evidence
│   │   └── audit/              # list_audit_events
│   ├── workers/                # Step Functions task lambdas
│   │   ├── calculate_blast_radius.py
│   │   ├── dispatch_notifications.py
│   │   ├── lock_pos_inventory.py
│   │   └── record_audit_entry.py
│   ├── common/                 # Shared utilities
│   │   ├── db.py               # DynamoDB helper & serialization
│   │   ├── response.py         # Standardized API response formatting
│   │   ├── validation.py       # Pydantic or schema validators
│   │   └── logger.py           # Structured CloudWatch JSON logger
│   └── requirements.txt
├── statemachine/
│   └── recall_orchestrator.asl.json # Step Functions Amazon States Language definition
├── template.yaml               # AWS SAM specification
├── AGENTS.md                   # Single Source of Truth engineering directives
├── README.md                   # Project overview & developer guide
├── .env.example                # Documented configuration template
└── .gitignore                  # Git exclusions
```

---

## 5. Architectural Principles & Invariants

1. **Pure Serverless Backend:** Zero always-running EC2/containers. All backend compute is on-demand AWS Lambda behind API Gateway.
2. **Separation of Concerns:** Frontend is completely decoupled from backend compute and communicates strictly via REST API over HTTPS.
3. **Idempotency in Recall Execution:** Recall initiation requests must accept an `idempotency_token` (e.g. `client_request_token` or hashed batch incident payload) to prevent duplicate emergency broadcasts.
4. **Explicit Confirmation & 2FA Gate:** Initiating a product recall is a critical action. The user interface and API require multi-step verification and explicit confirmation token validation before workflow execution.
5. **Least Privilege IAM:** Every Lambda function has an execution role scoped strictly to the resources it accesses (e.g., specific DynamoDB table ARN, S3 prefix, or SNS topic).
6. **No Secrets in Code:** Never commit `.env` files, IAM credentials, or sensitive tokens. Use environment variables and AWS SSM Parameter Store / Secrets Manager in production.
7. **Secure Evidence Ingestion:** Raw lab certificates and evidence are uploaded directly to Amazon S3 via pre-signed, time-limited PUT URLs with content-type and size constraints. Lambda never proxies large binary uploads.

---

## 6. Frontend Design Specifications (Google Stitch Compliance)

Frontend implementations must follow the design tokens extracted from Google Stitch in `stitch_batchguard_supply_traceability_saas/stitch_batchguard_supply_traceability_saas/batchguard_intelligence/DESIGN.md`:

* **Color Palette:**
  * Primary: Deep Forest Green (`#14532D`, hover `#166534`, base `#003B1B`)
  * Accent / Brand: Emerald (`#10B981`, secondary-fixed `#6FFBBE`, container `#6CF8BB`)
  * Critical / Recall: Red Alert (`#DC2626` base, container `#FEE2E2`, text `#991B1B`)
  * Warning: Amber / Gold (`#F59E0B` base, container `#FEF3C7`, text `#92400E`)
  * Canvas Background: Soft Neutral Slate (`#F8FAFC` / `#F8F9FF`)
  * Surface Container: Crisp Pure White (`#FFFFFF`) with border `#E2E8F0`
  * Text Primary: Slate 900 (`#0F172A` / `#0B1C30`)
  * Text Secondary / Label: Slate 500 (`#64748B` / `#717970`)

* **Typography:**
  * Interface Headings & Body: `Inter`
  * Serial Numbers, GTINs, Hashes, Timestamps: `JetBrains Mono`
  * Numbers in Tables & KPIs: OpenType `tnum` (tabular figures)

* **Layout Rhythm:**
  * Fixed 260px operational side rail on desktop
  * Top navigation header with Global Search, Region Status badge (`US-EAST PROD`), notifications, and user profile
  * Responsive collapsing on tablet and mobile

---

## 7. Data Architecture (DynamoDB Single-Table Pattern)

Primary Table Name: `BatchGuard-Main-{Environment}`

* **Partition Key (PK):** `String`
* **Sort Key (SK):** `String`
* **Global Secondary Index 1 (GSI1):** `GSI1PK` (Partition) / `GSI1SK` (Sort)
* **Global Secondary Index 2 (GSI2):** `GSI2PK` (Partition) / `GSI2SK` (Sort)

### Entity Mapping Summary:
| Entity | PK | SK | GSI1PK | GSI1SK | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Organization** | `ORG#<orgId>` | `METADATA` | `TYPE#ORG` | `<name>` | Multi-tenant organization profile |
| **Supplier** | `ORG#<orgId>` | `SUPPLIER#<supplierId>` | `TYPE#SUPPLIER` | `<status>#<name>` | Farm or processor details |
| **Product** | `ORG#<orgId>` | `PRODUCT#<gtin>` | `TYPE#PRODUCT` | `<sku>` | Finished product catalog |
| **Batch** | `ORG#<orgId>` | `BATCH#<batchId>` | `GTIN#<gtin>` | `BATCH#<timestamp>` | Production lot record |
| **Lineage Event** | `BATCH#<batchId>` | `EVENT#<eventId>` | `TYPE#EVENT` | `<timestamp>` | Critical tracking event / harvest |
| **Distribution Node** | `ORG#<orgId>` | `NODE#<nodeId>` | `TYPE#NODE` | `<type>#<name>` | DC, Carrier, or Retail Store |
| **Distribution Record**| `BATCH#<batchId>` | `DIST#<nodeId>` | `NODE#<nodeId>` | `BATCH#<batchId>` | Downstream allocation |
| **Recall Incident** | `ORG#<orgId>` | `RECALL#<recallId>` | `BATCH#<batchId>` | `STATUS#<status>` | One-click recall incident |
| **Acknowledgement** | `RECALL#<recallId>`| `ACK#<nodeId>` | `NODE#<nodeId>` | `ACK#<timestamp>` | Node response & units locked |
| **Audit Event** | `ORG#<orgId>` | `AUDIT#<timestamp>#<id>`| `USER#<userId>` | `AUDIT#<timestamp>` | Immutable audit trail |

*(Refer to `docs/database-schema.md` for complete attribute models and access patterns).*

---

## 8. API Standards

* **Base URL:** `/v1`
* **Format:** JSON (`application/json`)
* **Standard Response Envelope:**
  ```json
  {
    "success": true,
    "data": { ... },
    "error": null,
    "meta": {
      "requestId": "aws-request-id",
      "timestamp": "2026-11-01T21:40:00Z"
    }
  }
  ```
* **Error Response Envelope:**
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Lot identifier is required",
      "details": []
    },
    "meta": {
      "requestId": "aws-request-id",
      "timestamp": "2026-11-01T21:40:00Z"
    }
  }
  ```

---

## 9. Development & Testing Workflow

1. **Incremental Execution:** Build modules step-by-step; do not attempt massive unverified writes.
2. **Quality Verification:**
   * Backend: Run `pytest` for unit and integration logic.
   * Frontend: Run `npm run typecheck` and `npm run build` to ensure clean zero-error compilation.
   * SAM: Run `sam validate --lint` on `template.yaml`.
3. **Branch & Commit Discipline:** Clean descriptive git commit messages prefixed with component context (e.g. `docs:`, `feat(recall):`, `fix(db):`).

---

## 10. Traceability & Recall Intelligence Invariants

1. **Backward Lineage Traversal Invariants:**
   * Maximum BFS exploration depth is capped at 10 levels.
   * Circular ancestor references must be detected via path tracking, flagged (`cycleDetected=True`), recorded as an audit warning, and safely severed to prevent infinite execution.
   * Raw harvest leaves terminate upstream querying when no parent lot IDs or intermediate batch flags exist.
2. **Forward Tracking & Inventory State Veracity:**
   * Multiple consignments dispatched to the same physical node are aggregated into a single deduplicated node.
   * Missing, unconfirmed, or in-transit stock must NEVER be assumed to be zero. Discrepancies are reported as `unconfirmedUnits` to prevent understated recall risk.
   * Negative remaining stock anomalies incur a 25% penalty on the KDE Traceability Confidence score.
3. **Traceability Completeness Scoring:**
   * Evaluated across 6 weighted dimensions: Origin & Harvest (20%), Supplier Verification (15%), Lab Evidence (20%), Chain of Custody (15%), Delivery Timestamps (15%), and Inventory Balance (15%).
   * Scores are categorized into HIGH (>=90%), MEDIUM (70–89%), and LOW (<70%).

---

## 11. Step Functions Recall Orchestration & Concurrency Directives

1. **Step Functions Standard Workflow:**
   * Recall orchestration MUST execute via Step Functions Standard Workflows using `.waitForTaskToken` for human approval gates.
   * Workflows must define bounded retries (max 3, exponential backoff) and explicit catch handlers for `States.ALL` and `States.Timeout`.
2. **Human Approval Gate Invariants:**
   * Emergency broadcasts and quarantine locks must pause at `AwaitRecallApproval` pending authorized sign-off.
   * Only callers with `COMPLIANCE_OFFICER` or `ADMIN` roles derived from validated Cognito claims may approve or reject recalls.
   * Expired approval timeouts (default 86,400s) must transition to `FAILED` with reason `APPROVAL_WINDOW_EXPIRED`; timeouts must NEVER auto-approve.
3. **Atomic Mutual Exclusion Lock:**
   * Concurrent recall initiation requests for the same batch must be atomically serialized using a DynamoDB conditional write on `PK=ORG#<orgId>, SK=ACTIVE_RECALL#<batchId>`.
   * Rejection, failure, cancellation, or completion of a recall MUST release the active recall lock.




---

## 12. Audit Trail & Recall Completion Invariants

1. **Content-Addressable SHA-256 Hash Chain:**
   * The audit trail operates as an append-only, content-addressable SHA-256 hash chain where each record cryptographically commits to the canonical JSON of its content and the `recordHash` of its immediate predecessor (`previousHash`).
   * The Genesis record links to `GENESIS_HASH` (`0x` + 64 zeros).
   * Canonical serialization strictly uses sorted keys with compact separators (`json.dumps(data, sort_keys=True, separators=(',', ':'))`).
   * Frame the audit mechanism strictly and accurately as a **SHA-256 content-addressable integrity hash chain**; never claim PKI digital signatures or hardware HSM signatures.

2. **Strict Recall Completion Criteria:**
   * A recall MUST NOT transition to `COMPLETED` merely because notifications were dispatched or facilities submitted basic alert receipts (`ACKNOWLEDGED`).
   * Transition to `COMPLETED` strictly requires:
     1. `totalImpactedFacilities > 0`
     2. `allAcknowledged == True`
     3. `verifiedHoldCount == totalImpactedFacilities` (every single impacted facility has verified physical cooler/warehouse quarantine with `physicalHoldVerified == True`).
   * Facilities submitting unconfirmed receipts remain in `PARTIALLY_ACKNOWLEDGED`.
   * Reaching `COMPLETED`, `REJECTED`, `FAILED`, or `CANCELLED` automatically releases the atomic active recall lock (`ACTIVE_RECALL#<batchId>`).

3. **Atomic TransactWriteItems Ledger Head & Terminal Lock Release:**
   * Audit log insertion and `AUDIT_LEDGER_HEAD` advancement MUST execute within the same DynamoDB `TransactWriteItems` transaction with condition expressions ensuring strict sequential integrity and optimistic concurrency control.
   * Transitioning a recall to a terminal state (`COMPLETED`, `REJECTED`, `FAILED`, `CANCELLED`) and releasing the active recall lock (`ACTIVE_RECALL#<batchId>`) MUST execute atomically via `TransactWriteItems` with condition `status = :curr_status` and `recallId = :recall_id`.

4. **Worker Side-Effect Idempotency:**
   * Step Functions task workers MUST tolerate retries idempotently:
     - SNS emergency broadcasts use deterministic deduplication keys (`DISPATCH#EMERGENCY_BROADCAST`).
     - Quarantine tasks use deterministic identifiers (`TSK-<hash>`) and preserve existing verified hold states.
     - Carrier intercepts check existing records and preserve dispatch timestamps.
     - Worker audit events supply deterministic idempotency keys (`SFN#<recallId>#<action>`).
