# AWS Resource Inventory & Cost Estimation — BatchGuard

> **Stage 8A.1 Cloud Readiness & Cost Integrity Artifact**  
> Complete verified inventory of AWS Serverless resources specified in `template.yaml` and `statemachine/recall_orchestrator.asl.json`.
> Strictly separates verified pricing, free tier assumptions, workload estimates, and cost controls.

---

## 1. Verified Resource Catalog

BatchGuard is architected strictly as an on-demand, event-driven serverless system. There are **zero constantly running compute instances, idle containers, or provisioned database capacity units**.

| Category | Logical Resource ID | AWS Service / Resource Type | Billing Model | Configuration / Handler |
| :--- | :--- | :--- | :--- | :--- |
| **Database** | `BatchGuardMainTable` | `AWS::DynamoDB::Table` | Pay-Per-Request (On-Demand) | Auto-scaling (0 provisioned RCU/WCU), SSE enabled, PITR enabled |
| **Object Storage** | `EvidenceVaultBucket` | `AWS::S3::Bucket` | Standard S3 (GB-mo + requests) | Private (PublicAccessBlock 1111), SSE-S3 AES-256 |
| **Object Policy** | `EvidenceVaultBucketPolicy` | `AWS::S3::BucketPolicy` | N/A (Included with S3) | Enforces `aws:SecureTransport: "false"` denial (HTTPS only) |
| **Messaging** | `RecallEmergencyAlertsTopic` | `AWS::SNS::Topic` | Pay-per-publish / notification | Standard SNS Topic |
| **State Machine** | `RecallOrchestratorStateMachine` | `AWS::Serverless::StateMachine` | Standard Workflow (State transitions) | 18 states, `.waitForTaskToken` callback, 86,400s timeout |
| **API Ingress** | `BatchGuardApi` | `AWS::Serverless::Api` | REST API (API Gateway v1) | Pay-per-million calls, Cognito authorizer, CORS enabled |
| **Auth** | `BatchGuardUserPool` | `AWS::Cognito::UserPool` | Monthly Active Users (MAU) | SRP auth, optional software MFA, custom org_id attribute |
| **Auth Client** | `BatchGuardUserPoolClient` | `AWS::Cognito::UserPoolClient` | N/A (Included with Cognito) | Public SPA client, SRP auth |
| **Compute: API** | `BatchesFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `handlers.batch_handler.lambda_handler` (256 MB, 15s) |
| **Compute: API** | `TraceabilityFunction`| `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `handlers.traceability_handler.lambda_handler` (512 MB, 20s) |
| **Compute: API** | `RecallsFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `handlers.recall_handler.lambda_handler` (256 MB, 15s) |
| **Compute: API** | `SuppliersFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `handlers.supplier_handler.lambda_handler` (256 MB, 15s) |
| **Compute: API** | `DistributionFunction`| `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `handlers.distribution_handler.lambda_handler` (256 MB, 15s) |
| **Compute: API** | `EvidenceFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `handlers.evidence_handler.lambda_handler` (256 MB, 15s) |
| **Compute: API** | `AuditFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `handlers.audit_handler.lambda_handler` (256 MB, 15s) |
| **Compute: Worker**| `ValidateRecallRequestWorker` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `workers.validate_recall_request.lambda_handler` (256 MB, 15s) |
| **Compute: Worker**| `CalculateBlastRadiusWorker` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `workers.calculate_blast_radius.lambda_handler` (512 MB, 30s) |
| **Compute: Worker**| `EvaluateRecallRiskWorker` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `workers.evaluate_recall_risk.lambda_handler` (256 MB, 15s) |
| **Compute: Worker**| `AwaitApprovalWorker` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `workers.await_approval.lambda_handler` (256 MB, 15s) |
| **Compute: Worker**| `CreateQuarantineTasksWorker` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `workers.create_quarantine_tasks.lambda_handler` (256 MB, 15s) |
| **Compute: Worker**| `IdentifyCarrierInterceptsWorker` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `workers.identify_carrier_intercepts.lambda_handler` (256 MB, 15s) |
| **Compute: Worker**| `DispatchNotificationsWorker` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `workers.dispatch_notifications.lambda_handler` (256 MB, 15s) |
| **Compute: Worker**| `TrackAcknowledgementsWorker` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `workers.track_acknowledgements.lambda_handler` (256 MB, 15s) |
| **Compute: Worker**| `RecordAuditEntryWorker` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `workers.record_audit_entry.lambda_handler` (256 MB, 15s) |
| **Compute: Worker**| `FinalizeRecallWorker` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `workers.finalize_recall.lambda_handler` (256 MB, 15s) |
| **Compute: Worker**| `HandleRejectionWorker` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `workers.handle_rejection.lambda_handler` (256 MB, 15s) |
| **Compute: Worker**| `HandleTimeoutWorker` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `workers.handle_timeout.lambda_handler` (256 MB, 15s) |
| **Compute: Worker**| `HandleFailureWorker` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | `workers.handle_failure.lambda_handler` (256 MB, 15s) |
| **Logging** | CloudWatch Log Groups (20) | `AWS::Logs::LogGroup` | Pay-per-GB ingested ($0.50/GB standard) | 30-day retention |

---

## 2. Separation of Cost Assumptions

### 2.1 Verified Standard AWS Pricing (US East us-east-1, Standard Rates)
*(Subject to AWS official pricing changes; verify before production billing).*
* **AWS Lambda (x86_64):**
  * \$0.20 per 1,000,000 requests.
  * \$0.0000166667 per GB-second of compute.
* **Amazon API Gateway (REST API):**
  * \$3.50 per 1,000,000 calls (first 333M/month).
* **Amazon DynamoDB (On-Demand):**
  * \$0.25 per 1,000,000 write request units (WRU).
  * \$0.05 per 1,000,000 read request units (RRU).
  * \$0.25 per GB-month table storage.
* **AWS Step Functions (Standard Workflow):**
  * \$0.025 per 1,000 state transitions.
* **Amazon S3 (Standard Storage):**
  * \$0.023 per GB-month.
  * \$0.005 per 1,000 PUT/POST requests.
  * \$0.0004 per 1,000 GET requests.
* **Amazon SNS (Standard):**
  * First 1,000,000 Amazon SNS publishes/month free, then \$0.50 per 1,000,000.
  * Email deliveries: \$2.00 per 100,000 emails (first 1,000/month free).
  * SMS deliveries: Carrier-dependent (approx. \$0.0075 per SMS in US).
* **Amazon Cognito:**
  * Free for first 50,000 Monthly Active Users (MAU).

### 2.2 Free Tier Eligibility & Boundaries
* **Always Free:**
  * Lambda: 1,000,000 requests and 400,000 GB-seconds per month.
  * Step Functions: 4,000 state transitions per month.
  * DynamoDB: 25 GB storage.
  * Cognito: 50,000 MAU.
  * CloudWatch Logs: 5 GB log ingestion and 5 GB archival.
* **12 Months Free Tier (New Accounts):**
  * API Gateway: 1,000,000 REST API requests per month.
  * S3: 5 GB standard storage, 20,000 GETs, 2,000 PUTs.
* **Promotional Credit Notice:**
  * Projections below do NOT assume promotional credits. All calculations evaluate raw retail billing.

### 2.3 Unknown or Account-Dependent Costs
* **SMS Alerting:** If SMS is enabled on SNS topics, destination country rates vary (\$0.0075 to \$0.15/SMS).
* **KMS Customer-Managed Keys (CMK):** If migrated from SSE-S3/DynamoDB default to KMS CMK, each key costs \$1.00/month + \$0.03/10,000 requests. BatchGuard currently uses default AWS-managed encryption (`SSEEnabled: true`, SSE-S3 AES-256) which incurs \$0.00 key fees.
* **Data Transfer Out:** Data transfer to internet is free up to 100 GB/month.

---

## 3. Projected Monthly Workload Tiers (Provisional Estimates)

### Scenario A: True Idle Cost (Zero Active Users / Cold Standby)
When no requests or active recalls are running:
* **DynamoDB:** \$0.00 (0 provisioned units, Pay-Per-Request, <25 GB storage).
* **AWS Lambda:** \$0.00 (0 invocations).
* **API Gateway:** \$0.00 (0 calls).
* **Step Functions:** \$0.00 (0 state transitions).
* **Amazon S3:** \$0.00 (<5 GB test files).
* **Amazon SNS:** \$0.00 (0 messages).
* **Amazon Cognito:** \$0.00 (<50,000 MAU).
* **CloudWatch Logs:** ~\$0.02 – \$0.05 / month (residual metric storage).
* **Estimated Monthly Total: \$0.02 – \$0.05 / month.**

### Scenario B: Low-Volume Testing & Dev QA (1,000 API calls/day, 10 recall workflows/month)
* **API Gateway:** 30,000 calls/month = \$0.11 (covered by Free Tier in year 1, or \$0.11 without).
* **AWS Lambda:**
  * 30,000 API invocations @ avg 120ms (256MB): 921 GB-seconds = \$0.00 (well within 400,000 GB-s free tier).
  * 10 Step Functions runs * 10 worker Lambdas = 100 invocations @ avg 250ms = \$0.00.
* **DynamoDB:** ~90,000 reads, ~15,000 writes, 0.1 GB storage = \$0.00 (within Free Tier) or \$0.04.
* **Step Functions:** 10 executions * ~18 transitions = 180 transitions (covered by 4,000 free tier).
* **S3:** 200 MB storage, ~50 uploads = \$0.01.
* **SNS:** 10 alerts * 5 endpoints = 50 deliveries = \$0.00.
* **CloudWatch Logs:** ~100 MB logs = \$0.05.
* **Estimated Monthly Total: \$0.15 – \$0.45 / month.**

### Scenario C: Active Demonstration & Moderate Workload (50,000 API calls/month, 100 recalls/month)
* **API Gateway:** 50,000 calls = \$0.18.
* **AWS Lambda:** 60,000 invocations @ 250ms = 3,750 GB-seconds = \$0.00 (within Free Tier) or \$0.06.
* **DynamoDB:** ~250,000 reads, ~40,000 writes = \$0.12.
* **Step Functions:** 100 executions * 18 transitions = 1,800 transitions = \$0.00 (within 4,000 Free Tier) or \$0.05.
* **S3:** 2 GB storage + pre-signed PUTs = \$0.08.
* **SNS:** 500 emails / SMS alerts = \$0.25.
* **CloudWatch Logs:** 1 GB logs = \$0.50.
* **Estimated Monthly Total: \$1.19 – \$2.20 / month.**

---

## 4. Cost-Control & Budget Protection Directives

1. **AWS Budgets Alert:** Deploy an AWS Cost Budget with a hard alert limit of **\$5.00 USD/month**, routing immediate SNS notifications to engineering leads when actual or forecasted spend exceeds 80% (\$4.00).
2. **CloudWatch Log Retention:** Enforce strict 30-day retention policies on all 20 Lambda log groups in SAM / CloudFormation to prevent perpetual log accumulation charges.
3. **DynamoDB On-Demand Safeguards:** The table uses Pay-Per-Request billing with no provisioned RCU/WCU floor. Do not switch to provisioned capacity unless sustained workloads exceed millions of daily steady-state requests.
4. **Step Functions Transition Bounds:** All loops and retries in `recall_orchestrator.asl.json` are bounded (`MaxAttempts: 3`), preventing recursive execution cascades that multiply state transitions.
5. **S3 Lifecycle Rules:** `EvidenceVaultBucket` defines lifecycle expiration rules to delete incomplete multipart uploads and transition non-current document versions after 30 days.
6. **Resource Cleanup Runbook:** Clean dev teardown via `sam delete --stack-name batchguard-stack-dev` terminates all resources cleanly, avoiding orphaned billing components.
