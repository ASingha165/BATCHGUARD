# BatchGuard

<p align="center">
  <strong>One Batch. Complete Traceability. Faster Recalls.</strong><br>
  <em>A serverless food supply-chain traceability and recall intelligence platform.</em>
</p>

---

## Executive Summary

**BatchGuard** is an enterprise-grade, serverless platform designed for food manufacturers, agricultural suppliers, distribution centers, and retailers. It unifies batch genealogy tracking, cold-chain telemetry, evidence document management, and signature **One-Click Recall Orchestration** into a secure, responsive, event-driven web application.

When a food safety emergency occurs (e.g. microbial contamination, pathogen detection, or labeling defect), BatchGuard isolates affected lots, determines the downstream blast radius across logistics nodes, generates immediate hold orders, and coordinates targeted multi-channel notifications with cryptographic audit trails.

---

## Core Capabilities

* **Batch Registry & Lineage:** Register finished lots with GS1 GTINs, track upstream raw ingredient origins, harvest timestamps, and processing parameters.
* **Supply Chain & Distribution Tracking:** Real-time visibility into custody handoffs across distribution centers (DCs), transit fleets, and retail endpoints.
* **One-Click Recall Orchestration:** Signature 4-step guided workflow:
  1. Incident Logging & Batch Selection
  2. Hazard Severity Classification (FDA Class I / II / III equivalent)
  3. Blast Radius Assessment & Impacted Node Review
  4. Cryptographic / 2FA Confirmation & Automated Hold Broadcast
* **Evidence Vault:** Secure S3 storage for Certificates of Analysis (COA), audit placards, and lab reports using time-limited pre-signed URLs.
* **Recall Acknowledgement Ledger:** Real-time tracking of facility quarantine status, locked unit counts, and physical disposal verification.
* **Immutable Audit Trail:** Append-only event store recording every status change, inspection flag, and recall action.

---

## System Architecture

```
                    +------------------------------------+
                    |        BatchGuard Frontend         |
                    | React + TypeScript + Tailwind CSS  |
                    +-----------------+------------------+
                                      | HTTPS / REST
                                      v
                    +-----------------+------------------+
                    |        Amazon API Gateway          |
                    +-----------------+------------------+
                                      |
                     +----------------+----------------+
                     |                |                |
                     v                v                v
             +---------------+ +--------------+ +---------------+
             | Batch Handler | | Recall API   | | Evidence API  |
             |  (AWS Lambda) | | (AWS Lambda) | |  (AWS Lambda) |
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

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts |
| **UI Design System** | Google Stitch Design Tokens (Forest Green `#14532D`, Emerald `#10B981`) |
| **Backend Compute** | Python 3.12, AWS Lambda, AWS Step Functions |
| **API Ingress** | Amazon API Gateway (REST API) |
| **Persistence** | Amazon DynamoDB (Single-Table Design) |
| **Document Store** | Amazon S3 (Encrypted Evidence Vault) |
| **Notification** | Amazon SNS (Fan-out notification topic) |
| **Infrastructure as Code**| AWS SAM (Serverless Application Model) & CloudFormation |

---

## Quickstart & Local Setup

### Prerequisites
* **Node.js:** v18+ (v24 LTS recommended)
* **Python:** 3.12+
* **AWS CLI:** Configured with sandbox or test credentials
* **AWS SAM CLI:** Recommended for local API testing and packaging

### 1. Repository Clone & Setup
```bash
git clone https://github.com/ASingha165/BATCHGUARD.git
cd BATCHGUARD
cp .env.example .env
```

### 2. Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### 3. Backend & SAM Deployment
```bash
sam build
sam deploy --guided
```

---

## Documentation Index

* [AGENTS.md](AGENTS.md) — Master Engineering Directives & Single Source of Truth
* [Architecture & Workflows](docs/architecture.md) — Detailed serverless architecture & Step Functions
* [Database Schema & Access Patterns](docs/database-schema.md) — DynamoDB table design & GSI keys
* [API Specification](docs/api-specification.md) — Complete REST endpoint documentation
* [Deployment Guide](docs/deployment.md) — Step-by-step AWS deployment procedures

---

## Regulatory & Legal Disclaimer

*BatchGuard is an engineering platform designed to demonstrate modern event-driven serverless architectures in food safety and supply-chain logistics. It does not certify official FDA, FSMA 204, or GS1 compliance unless independently audited and validated by qualified regulatory authorities.*

