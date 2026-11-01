# BatchGuard Architecture & System Design

## 1. High-Level Architectural Overview

BatchGuard is architected as a decoupled, multi-tier, event-driven serverless cloud platform on AWS. The design prioritizes high availability, minimal operational overhead, robust security boundaries, and near-instantaneous recall containment.

### Architecture Topology

```
+--------------------------------------------------------------------------+
|                            CLIENT TIER                                   |
|   React 18 + TypeScript SPA (Vite, Tailwind CSS, Google Stitch Tokens)   |
|   Static Assets hosted via Amazon S3 / CloudFront Distribution           |
+-----------------------------------+--------------------------------------+
                                    | HTTPS / TLS 1.3
                                    v
+--------------------------------------------------------------------------+
|                           API INGRESS TIER                               |
|   Amazon API Gateway (Regional REST API)                                 |
|   - Request Validation (JSON Schema)                                     |
|   - CORS Configuration                                                   |
|   - Throttling & Rate Limiting                                           |
+-----------------------------------+--------------------------------------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
          v                         v                         v
+-------------------+     +-------------------+     +-------------------+
|  Batch Ingress    |     |  Recall Ingress   |     |  Evidence Vault   |
|  Lambda Function  |     |  Lambda Function  |     |  Lambda Function  |
|  (Python 3.12)    |     |  (Python 3.12)    |     |  (Python 3.12)    |
+---------+---------+     +---------+---------+     +---------+---------+
          |                         |                         |
          |                         v                         | Pre-signed S3
          |               +-------------------+               | PUT/GET URLs
          |               | AWS Step Function |               v
          |               | Recall Machine    |     +-------------------+
          |               +---------+---------+     | Amazon S3 Bucket  |
          |                         |               | Evidence Vault    |
          |                         v               | (Encrypted KMS)   |
          |               +-------------------+     +-------------------+
          |               | Recall Worker     |
          |               | Lambda Pool       |
          |               +----+---------+----+
          |                    |         |
          v                    v         v
+-----------------------------------+  +--------------------------------+
|       PERSISTENCE LAYER           |  |       MESSAGING TIER           |
| Amazon DynamoDB Single-Table      |  | Amazon SNS (Recall Alerts)     |
| BatchGuard-Main (On-Demand)       |  | Fan-out SMS, Email, Webhooks   |
+-----------------------------------+  +--------------------------------+
```

---

## 2. Serverless Component Breakdown

### 2.1 Amazon API Gateway
* Serves as the single secure entry point (`/v1/*`).
* Configured with strict CORS headers allowing authenticated web origins.
* Validates incoming request payloads using OpenAPI schema definitions before invoking compute.
* Maps standardized HTTP status codes (200, 201, 400, 403, 404, 409, 500).

### 2.2 AWS Lambda Compute Layer
* **Runtime:** Python 3.12 running with ARM64 (Graviton2) architecture for optimal cost and performance.
* **Separation of Functions:**
  * `batch_service`: Handles batch registration, lookup, filtering, and upstream ingredient lineage.
  * `recall_service`: Evaluates blast radius, accepts recall initiation commands, queries active recall status, and processes acknowledgements.
  * `supplier_service`: Manages verified vendor directory, facility codes, and compliance status.
  * `distribution_service`: Tracks node custody handoffs, warehouse receipts, and cold-chain temperature telemetry logs.
  * `evidence_service`: Generates short-lived, pre-signed S3 upload URLs with content-type and size constraints, avoiding binary transmission through Lambda.
  * `audit_service`: Read-only queries against immutable audit trail records.

### 2.3 AWS Step Functions — Recall Orchestration State Machine
The signature feature of BatchGuard is its **One-Click Recall Orchestration**. Because a recall involves multiple asynchronous and transactional operations (locking inventory, broadcasting emergency communications, persisting containment records), it is orchestrated via an **AWS Step Functions Express/Standard Workflow**:

```
 [Start: Recall Requested]
           |
           v
 [Validate Confirmation & 2FA Token]
           |
           v
 [Calculate Downstream Blast Radius]
 (Traverse DynamoDB distribution records)
           |
           v
 [Atomic Batch Quarantine Update]
 (Update Batch status to QUARANTINED in DynamoDB)
           |
           v
 [Parallel Execution Branch]
    +--------------------------------+--------------------------------+
    |                                |                                |
    v                                v                                v
[Lock Node Allocations]     [Broadcast SNS Alert]      [Create Audit Entry]
(Write ACK records per DC)  (Emergency fan-out email/  (Append immutable log)
                            SMS/Webhook)
    |                                |                                |
    +--------------------------------+--------------------------------+
           |
           v
 [Complete: Return Execution Summary]
```

### 2.4 Amazon DynamoDB (Single-Table Architecture)
* Single table `BatchGuard-Main` handles all entities using carefully planned Partition Keys (`PK`), Sort Keys (`SK`), and two Global Secondary Indexes (`GSI1`, `GSI2`).
* Zero cross-table joins; queries execute within single-digit milliseconds.
* Point-In-Time Recovery (PITR) enabled for production resilience.

### 2.5 Amazon S3 Evidence Vault
* Dedicated bucket for compliance documents, laboratory test certificates, and chain-of-custody bills of lading.
* Encrypted at rest using SSE-S3 or AWS KMS.
* Public access strictly blocked at bucket and account levels (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets`).
* Ingestion and retrieval handled purely through pre-signed URLs with maximum 15-minute expiration.

### 2.6 Amazon SNS Notification Fabric
* Dedicated Topic `batchguard-recall-notifications`.
* Fan-out subscribers include:
  * Quality Assurance notification emails.
  * Facility manager emergency SMS endpoints.
  * Downstream enterprise ERP / WMS webhooks for automated EDI 940 hold generation.

---

## 3. Security & Compliance Architecture

1. **Principle of Least Privilege:**
   * Every Lambda has an isolated IAM role with explicit actions (`dynamodb:GetItem`, `dynamodb:PutItem`, `s3:PutObject` for specific ARNs only).
   * No wildcard `*` resource permissions on data-bearing resources.
2. **Idempotency in Emergency Operations:**
   * Recall initiation generates an `idempotencyKey` derived from `SHA256(batchId + incidentTimestamp + hazardClass)`.
   * Re-sending an identical command returns the existing recall execution without duplicating alert broadcasts or duplicate database writes.
3. **Data Protection in Transit and at Rest:**
   * All API communication enforces TLS 1.3.
   * DynamoDB and S3 enforce encryption at rest with AWS-managed keys.


---

## 4. Identity & Authentication Architecture (Amazon Cognito)

BatchGuard establishes a zero-trust authentication boundary using **Amazon Cognito User Pools**:

```
+----------------+      1. Authenticate (SRP / MFA)      +---------------------+
|   Web Client   | -------------------------------------> | Amazon Cognito Pool |
|   (React SPA)  | <------------------------------------- | (TOTP / SMS MFA)    |
+-------+--------+       2. JWT Tokens (ID, Access)       +---------------------+
        |
        | 3. HTTPS + Authorization: Bearer <ID-Token>
        v
+-----------------------+ 4. Validate JWT Claims          +---------------------+
|  Amazon API Gateway   | ------------------------------> | Lambda Context Auth |
|  (Cognito Authorizer) |   Injects: sub, email,          | requestContext.     |
+-----------+-----------+   custom:org_id, groups         | authorizer.claims   |
            |                                             +---------------------+
            v
+-----------------------+
|  AWS Lambda Handlers  | 5. Enforces AuthContext.org_id
|  (e.g. BatchHandler)  |    Rejects cross-tenant access attempts
+-----------------------+
```

### Identity Attributes & Claims Mapping:
* **Tenant Isolation:** `custom:org_id` attribute stores the organization UUID (`ORG#<orgId>`). Every Lambda handler extracts this attribute directly from `requestContext.authorizer.claims` and strictly scopes DynamoDB queries.
* **Role-Based Access Control (RBAC):** Cognito Groups (`ComplianceOfficer`, `QualityManager`, `LogisticsOperator`, `Viewer`) map to granular execution permissions. Critical operations (e.g. `POST /v1/recalls/initiate`) strictly mandate `ComplianceOfficer` or `Admin` membership via `require_role()`.
* **Multi-Factor Authentication (MFA):** Enforces Software Token TOTP (Google Authenticator, Microsoft Authenticator) for compliance administrators initiating recalls.

---

## 5. Audit Integrity & Non-Repudiation Architecture

BatchGuard distinguishes between three tiers of audit record integrity:

| Integrity Tier | Mechanism | Threat Protected Against | Limitations |
| :--- | :--- | :--- | :--- |
| **Tier 1: Hash-Based Integrity Checking** | SHA-256 signature calculated over canonicalized JSON payload (`"cryptographicSignature": "0x..."`) | Detects accidental data corruption or single-attribute tampering | An attacker with DynamoDB write privileges could recompute the SHA-256 hash and update the item |
| **Tier 2: Append-Only Application Logic** | DynamoDB `PutItem` with `attribute_not_exists(PK) AND attribute_not_exists(SK)` | Prevents application-level overwriting or deletion via API Gateway | Direct console or administrative IAM access can still alter rows |
| **Tier 3: Tamper-Resistant Storage (WORM)** | **Production Target:** DynamoDB Streams $\to$ Amazon Kinesis Data Firehose $\to$ Amazon S3 Object Lock in **Compliance Mode** | Fully prevents deletion or modification by any IAM role or AWS Root account during retention period | Requires S3 Object Lock bucket provisioning and stream configuration |

> [!NOTE]
> A SHA-256 digest stored inside a DynamoDB row provides **tamper-evidence**, not tamper-resistance. True regulatory immutability (e.g. FDA 21 CFR Part 11 / FSMA 204) is achieved in Tier 3 via S3 Object Lock in Compliance Mode.

---

## 6. S3 Evidence Vault Security Architecture

To securely ingest Certificate of Analysis (COA) documents and microbiological lab assay PDFs:

1. **Pre-Signed POST Policy Enforcement:** Rather than open `put_object` URLs (which cannot restrict upload size at the S3 edge), BatchGuard implements S3 Pre-Signed POST policies containing cryptographically signed conditions:
   ```json
   [
     ["content-length-range", 1, 52428800],
     {"Content-Type": "application/pdf"},
     ["starts-with", "$key", "evidence/ORG-APEX-GLOBAL/"]
   ]
   ```
2. **Key Prefix Isolation:** Object keys follow `evidence/{orgId}/{batchId}/{docId}_{sanitizedFileName}`, preventing cross-tenant file writes or filename collision attacks.
3. **Restricted Egress:** Direct public reads are blocked (`PublicAccessBlockConfiguration: true`). Document downloads are mediated through time-limited (300-second) pre-signed GET URLs generated only after verifying the caller's tenant boundary.

---

## 7. Comprehensive Serverless Cost Audit

### Resource Billing Models:

| Service | Billing Mode | Free Tier Coverage | Real Cost at True Idle | Real Cost at Low Volume (50k req/mo) |
| :--- | :--- | :--- | :--- | :--- |
| **Amazon DynamoDB** | `PAY_PER_REQUEST` | 25 GB storage free | \$0.01 – \$0.02 / mo (PITR minimums) | ~\$0.08 / mo |
| **AWS Lambda** | Arm64 Pay-per-use | 1M requests & 400k GB-sec free | \$0.00 / mo | \$0.00 (within Free Tier) |
| **Amazon API Gateway** | Pay-per-request | 1M API calls (12 mos Free Tier) | \$0.00 / mo | ~\$0.18 / mo |
| **Amazon S3** | Standard Tier | 5 GB storage, 2k PUT, 20k GET free | \$0.00 / mo | ~\$0.05 / mo |
| **AWS Step Functions** | Standard Workflows | 4,000 state transitions free | \$0.00 / mo | \$0.00 (within Free Tier) |
| **Amazon SNS** | Pay-per-notification | 1M requests, 100k HTTP free | \$0.00 / mo | ~\$0.02 / mo |
| **Amazon CloudWatch** | Ingestion & Storage | 5 GB ingestion & 5 GB storage free | \$0.01 – \$0.05 / mo (metric baselines) | ~\$0.15 / mo (with 14-day retention) |
| **Amazon Cognito** | Monthly Active Users | 50,000 MAU free | \$0.00 / mo | \$0.00 (within Free Tier) |

* **Estimated True Idle Cost:** **\$0.02 – \$0.07 / month** (attributable to DynamoDB PITR base metadata and CloudWatch log baseline alarms; never strictly \$0.00).
* **Estimated Low-Volume Cost:** **\$0.35 – \$0.65 / month** (well within standard AWS \$300 promotional credit budgets).
