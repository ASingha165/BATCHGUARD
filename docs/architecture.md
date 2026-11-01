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

