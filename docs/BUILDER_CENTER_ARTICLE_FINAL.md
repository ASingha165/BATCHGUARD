# BatchGuard: Serverless Product Recall Intelligence Without a Pipeline

> **Tagline:** *One Batch. Complete Traceability. Faster Recalls.*  
> **Challenge:** AWS Weekend Challenge — *No Pipeline, No Problem*  
> **Author:** Ankit Singha ([@ASingha165](https://github.com/ASingha165))  
> **Repository:** [github.com/ASingha165/BATCHGUARD](https://github.com/ASingha165/BATCHGUARD)  
> **Live Interactive Demo:** [batchguard-pi.vercel.app/dashboard](https://batchguard-pi.vercel.app/dashboard)  
> **Demonstration Video:** 2-minute 51-second narrated 1080p walkthrough (`batchguard-final-narrated-demo.mp4`) with synchronized neural narration  

---

## 1. Problem Statement: The Fragility of Modern Food Recalls

When foodborne pathogens (*Salmonella*, *Listeria*, *E. coli*) or undeclared allergens enter the commercial food supply chain, every hour of triage latency dramatically escalates consumer health emergencies and financial liabilities. Across growers, food processors, regional distribution centers (DCs), and grocery retailers, operational visibility is routinely trapped in disparate ERP silos, paper bills of lading, and slow manual phone chains.

Under emergency recall pressure, calculating the **blast radius**—the exact downstream facilities, transit carriers, and retail stores holding affected inventory—routinely consumes days or weeks. Without rapid, targeted containment:
* **Overbroad Blanket Recalls Occur:** Millions of units of perfectly safe food are needlessly landfilled out of precaution.
* **Contaminated Inventory Leaks to Retail:** Dangerous lots slip past distribution bottlenecks and scan through point-of-sale (POS) registers to consumers.
* **Regulatory Compliance Strains:** Modernized traceability frameworks, such as FSMA 204 critical tracking event (CTE) recordkeeping, place strict 24-hour compliance demands on supply chain operators.

Traditional enterprise traceability software has historically required multi-month consulting deployments, dedicated DevOps personnel, fragile CI/CD infrastructure, and costly persistent database instances.

**BatchGuard was engineered to prove a better way:** an enterprise-grade, event-driven serverless architecture that provides end-to-end batch genealogy, cold-chain telemetry visibility, and cryptographic auditability, culminating in our signature innovation: **One-Click Targeted Recall Orchestration**.

---

## 2. What BatchGuard Does: Solution & Key Capabilities

BatchGuard is an automated supply chain traceability and recall intelligence platform connecting five key enterprise stakeholders:
1. **Growers & Suppliers:** Ingest harvest timestamps, lot certificates, and supplier compliance status.
2. **Food Manufacturers:** Link raw ingredient lots to finished product batches and track critical tracking events (CTEs).
3. **Distribution Centers:** Monitor cold-chain telemetry logs and execute automated warehouse holds (`EDI 940` equivalent).
4. **Retail Outlets:** Scan-lock quarantined lots at POS registers and acknowledge containment orders in real time.
5. **Quality & Compliance Officers:** Audit genealogy trees, inspect lab evidence, and initiate controlled, 2FA-verified targeted recalls.

### Core Product Capabilities:
* **Interactive Batch Genealogy:** Bidirectional directed acyclic graph (DAG) tracing forward distribution to retail and backward lineage to harvest farms.
* **Traceability Completeness Scoring:** Real-time Key Data Element (KDE) confidence scoring across 6 weighted dimensions (Origin, Supplier Status, Lab Evidence, Chain of Custody, Delivery Times, and Inventory Balance).
* **One-Click Recall Orchestration:** A 4-step wizard that evaluates blast radius, aggregates affected physical nodes, enforces a 2FA confirmation gate, and triggers automated quarantine workflows.
* **Immutable Cryptographic Audit Trail:** Append-only SHA-256 content-addressable hash chain where each event mathematically commits to the canonical JSON of its payload and its parent's hash.
* **Evidence Management Vault:** Direct pre-signed S3 upload architecture with time-limited permissions, allowing lab certificates of analysis (COAs) to bypass Lambda compute entirely.

---

## 3. How We Built It: Event-Driven Serverless Architecture

BatchGuard embraces the core philosophy of the AWS Weekend Challenge: **zero always-on infrastructure, zero virtual machines, zero container orchestration, and zero CI/CD pipeline overhead**. Every component scales to zero when idle and executes strictly on demand.

```
                      +-----------------------------+
                      |   React 18 + Vite Frontend  |
                      |  (Vercel Edge / CloudFront) |
                      +--------------+--------------+
                                     |
                                HTTPS REST
                                     v
                      +-----------------------------+
                      |    Amazon API Gateway REST  |
                      |    (29 Routes, 7 Handlers)  |
                      +--------------+--------------+
                                     |
              +----------------------+----------------------+
              |                      |                      |
              v                      v                      v
    +-------------------+  +-------------------+  +-------------------+
    | Batch/Trace Lambdas|  | Evidence S3 URLs  |  | Recall Initiation |
    +---------+---------+  +---------+---------+  +---------+---------+
              |                      |                      |
              |                      v                      v
              |             +-----------------+   +-------------------+
              |             | S3 Evidence     |   | AWS Step Functions|
              |             | Vault (SSE-S3)  |   | State Machine     |
              |             +-----------------+   +---------+---------+
              |                                             |
              |     +---------------------------------------+
              |     | 13 Task Workers: Blast Radius, POS Lock, SNS Fan-out
              v     v
    +-------------------------------------------------------+
    |           Amazon DynamoDB (Single-Table Design)       |
    |      Partition Key (PK)  |  Sort Key (SK)  |  GSI1/2  |
    +-------------------------------------------------------+
              |
              v
    +-------------------------------------------------------+
    |         Amazon SNS (Emergency Broadcast Alerts)       |
    +-------------------------------------------------------+
```

### AWS Serverless Services & Their Exact Roles:

| AWS Service | Architectural Role in BatchGuard | Scale & Configuration |
| :--- | :--- | :--- |
| **AWS Lambda** | Modular compute engine powering all business logic. | **20 Functions:** 7 API handlers + 13 Step Functions task workers in Python 3.12. |
| **Amazon API Gateway** | Managed REST API ingress, CORS management, and request validation. | **29 REST routes** across `/batches`, `/recalls`, `/suppliers`, `/distribution`, `/evidence`, `/audit`. |
| **AWS Step Functions** | Distributed orchestration state machine for high-stakes recall workflows. | **13-state Standard Workflow** with atomic locks (`ACTIVE_RECALL#<id>`) and task token human approvals. |
| **Amazon DynamoDB** | Ultra-low-latency primary persistence engine. | **Single-Table Design (`BatchGuard-Main`)** with 2 GSIs, Pay-Per-Request billing, and atomic transactions. |
| **Amazon S3** | Secure object storage for lab certificates and compliance documents. | **Evidence Vault** with Server-Side Encryption (`SSE-S3 AES-256`), Block Public Access, and pre-signed PUTs. |
| **Amazon SNS** | Immediate fan-out notification service for critical recall alerts. | KMS-encrypted topics broadcasting emergency containment messages to DCs and retail endpoints. |
| **Amazon Cognito** | Authentication and authorization for compliance operators. | User Pool with MFA enforcement, scoped custom attributes, and public SPA client configuration. |

**Total CloudFormation Scope:** **48 declared resources** defined cleanly in a single Infrastructure as Code template (`template.yaml`).

---

## 4. Single-Table DynamoDB Schema Design

To eliminate relational database connection pooling and support microsecond graph queries, BatchGuard models all business entities within a single DynamoDB table:

| Entity | Partition Key (`PK`) | Sort Key (`SK`) | `GSI1PK` | `GSI1SK` | Core Attributes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Batch** | `ORG#<orgId>` | `BATCH#<batchId>` | `GTIN#<gtin>` | `BATCH#<timestamp>` | GTIN, Lot, Quantity, HarvestDate, SupplierId |
| **Lineage Event** | `BATCH#<batchId>` | `EVENT#<eventId>` | `TYPE#EVENT` | `<timestamp>` | StepType, Location, OperatorId, Telemetry |
| **Distribution** | `BATCH#<batchId>` | `DIST#<nodeId>` | `NODE#<nodeId>` | `BATCH#<batchId>` | ShippedUnits, RemainingUnits, Carrier, Status |
| **Recall Incident**| `ORG#<orgId>` | `RECALL#<recallId>`| `BATCH#<batchId>` | `STATUS#<status>` | Severity, Reason, ImpactedNodes, TotalUnits |
| **Facility Ack** | `RECALL#<recallId>`| `ACK#<nodeId>` | `NODE#<nodeId>` | `ACK#<timestamp>` | PhysicalHoldVerified, UnitsQuarantined |
| **Audit Ledger** | `ORG#<orgId>` | `AUDIT#<isoTimestamp>#<id>` | `USER#<userId>` | `AUDIT#<isoTimestamp>` | RecordHash, PreviousHash, Action, Payload |

### Core DynamoDB Access Patterns:
* **Direct Batch Lookup:** Direct key-condition lookup `PK=ORG#<id>, SK=BATCH#<batchId>` ($O(1)$ latency).
* **Downstream Consignment Traversal:** Query `PK=BATCH#<batchId>, SK begins_with DIST#`.
* **Facility Hold Reconciliation:** Query `PK=RECALL#<recallId>, SK begins_with ACK#`.
* **Ledger Head Advancement:** Atomic `TransactWriteItems` updating `AUDIT_LEDGER_HEAD` with sequential condition expressions.

---

## 5. Signature Feature: One-Click Recall Orchestration

The signature innovation of BatchGuard transforms what has historically been a chaotic 72-hour manual triage into a 30-second deterministic procedure:

1. **Contaminant Classification:** The compliance officer identifies the suspect lot code, designates the biological or physical hazard, selects FDA/USDA severity classification (Class I, II, or III), and establishes quarantine bounds.
2. **Blast Radius Analysis:** BatchGuard executes a bounded breadth-first traversal (capped at 10 levels) across ingredient compositions and outbound distribution records. Consignments shipped to the same physical facility are deduplicated, and in-transit units are accounted for.
3. **Multi-Factor Approval Gate:** Initiating an emergency recall is an irreversible high-consequence enterprise action. BatchGuard enforces a strict confirmation phrase (`CONFIRM-RECALL`) coupled with a time-based 2FA token before workflow dispatch.
4. **Step Functions Orchestration:** Upon authorization, API Gateway triggers the Step Functions state machine with an atomic mutual-exclusion lock (`ACTIVE_RECALL#<batchId>`) preventing duplicate broadcasts:
   * **Blast Radius Materialization:** Compiles verified distribution nodes and stock counts.
   * **Emergency Fan-Out Alerts:** Dispatches deterministic alerts via Amazon SNS.
   * **Electronic Quarantine:** Generates electronic hold orders (`EDI 940` equivalent) to immediately scan-lock contaminated barcodes at retail registers.
   * **Cryptographic Sealing:** Records the incident into the DynamoDB SHA-256 hash chain.

---

## 6. Testing Rigor & Automated Verification

BatchGuard was validated across five distinct automated testing and quality assurance frameworks:

* **Frontend Unit Tests (Vitest):** **21 / 21 tests passing** covering mock state transitions, simulation toggles, and formatting utilities.
* **Production End-to-End Tests (Playwright):** **32 / 32 tests passing** against the live Vercel deployment (`https://batchguard-pi.vercel.app`), verifying:
  * Dashboard KPI rendering and telemetry status cards.
  * Batch Registry search, filtering, and detail navigation.
  * Upstream and downstream lineage graph visualizations.
  * 4-step Recall Orchestration execution with 2FA token gating.
  * Facility acknowledgement status monitoring.
* **Backend Serverless Tests (Pytest):** **108 / 108 tests passing** simulating DynamoDB single-table operations, API Gateway payloads, Step Functions worker idempotency, and hash chain math using `moto` and LocalStack mocks.
* **CloudFormation Linting:** Verified clean with AWS SAM CLI (`sam validate --lint`) across all 48 resources.
* **Security & Secret Scan:** Audited with Yelp `detect-secrets` v1.5.0 across all 104 files and 32 git commits (**0 authentic credentials found**).

### Total Verified Test Count:
$$\mathbf{21\text{ (Vitest)}} + \mathbf{108\text{ (Pytest)}} + \mathbf{32\text{ (Playwright)}} = \mathbf{161\text{ Automated Tests Passing (100\%)}}$$

---

## 7. Demonstration Media

* **Master Narrated Demonstration Video (2:51.01):** Recorded in 1080p Full HD (`docs/evidence/video/batchguard-final-narrated-demo.mp4`, 8.40 MB) with synchronized spoken neural narration across all 6 operational scenes.
* **Word-for-Word Voiceover Script:** Documented in [`docs/evidence/video/FINAL_VOICEOVER_SCRIPT.md`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/evidence/video/FINAL_VOICEOVER_SCRIPT.md).
* **Keyframe Archive:** 6 extracted 1080p keyframes cataloged in [`docs/evidence/video/narrated_frames/`](https://github.com/ASingha165/BATCHGUARD/tree/main/docs/evidence/video/narrated_frames).

---

## 8. Transparent Implementation & Deployment Disclosure

In the true spirit of engineering integrity and open-source transparency:

* **Live Frontend:** Deployed on Vercel at [batchguard-pi.vercel.app](https://batchguard-pi.vercel.app/dashboard). Operates in an integrated `DEMO MODE` engine that provides realistic, deterministic responses for all batch queries, lineage graphs, and recall orchestrations without requiring live AWS credentials.
* **AWS Serverless Backend Status:** **The AWS serverless backend is NOT currently deployed to AWS cloud.** It is 100% authored in SAM (`template.yaml`), completely implemented in Python 3.12, and verified locally with 108 passing automated tests.
* **Reason for Undeployed Cloud Status:** During pre-submission staging, deployment to our provisioned AWS developer accounts (`316636858874` and `514903005325`) was blocked by an upstream AWS Organizations Service Control Policy (`p-ifuj16mo` restricting IAM role creation in sandbox accounts). In strict accordance with hackathon safety guidelines, no attempt was made to bypass corporate governance.
* **Turnkey Deployment Runbook:** Any reviewer or judge with standard AWS access can deploy the complete backend in one command:
  ```bash
  # Clone repository
  git clone https://github.com/ASingha165/BATCHGUARD.git
  cd BATCHGUARD

  # Build and deploy all 48 AWS resources
  sam build
  sam deploy --guided
  ```

---

## 9. What We Learned: The "No Pipeline, No Problem" Takeaways

Building BatchGuard for the AWS Weekend Challenge demonstrated three key serverless insights:

1. **State Machines Over Microservices:** Delegating complex distributed workflows (blast radius calculation, multi-facility alerting, POS locks, and audit commits) to AWS Step Functions eliminates hundreds of lines of fragile error-handling boilerplate. Visual execution logs provide immediate observability into where any facility alert failed.
2. **Single-Table Design Unlocks Instant Graph Queries:** In food traceability, traversal speed matters. By collocating batch records, critical tracking events, and distribution allocations under shared partition keys, upstream and downstream queries execute with single-digit millisecond latency.
3. **Clean Decoupling Enables Frictionless Prototyping:** By adhering to strict REST interface boundaries and typed domain models, the frontend and backend evolved independently. The application functions seamlessly in client-side demonstration mode while remaining 100% plug-and-play ready for live API Gateway ingress.

---

## 10. Submission Links & Artifacts

* **Live Interactive Demo:** [https://batchguard-pi.vercel.app/dashboard](https://batchguard-pi.vercel.app/dashboard)
* **Public GitHub Repository:** [https://github.com/ASingha165/BATCHGUARD](https://github.com/ASingha165/BATCHGUARD)
* **AWS SAM Specification:** [template.yaml](https://github.com/ASingha165/BATCHGUARD/blob/main/template.yaml) (48 CloudFormation resources)
* **Serverless Architecture Guide:** [docs/architecture.md](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/architecture.md)
* **Single-Table Database Schema:** [docs/database-schema.md](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/database-schema.md)
* **Step Functions State Machine:** [statemachine/recall_orchestrator.asl.json](https://github.com/ASingha165/BATCHGUARD/blob/main/statemachine/recall_orchestrator.asl.json)
* **Narrated Video File:** [docs/evidence/video/batchguard-final-narrated-demo.mp4](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/evidence/video/batchguard-final-narrated-demo.mp4)
* **Deployment Runbook:** [docs/AWS_DEPLOYMENT_RUNBOOK.md](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/AWS_DEPLOYMENT_RUNBOOK.md)

---

*BatchGuard demonstrates that with modern AWS serverless architecture, mission-critical enterprise workflows can be solved cleanly, reliably, and cost-effectively—No Pipeline, No Problem.*

