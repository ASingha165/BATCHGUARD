# AWS Resource Inventory & Cost Estimation — BatchGuard

> **Stage 8A Cloud Readiness Artifact**  
> Complete inventory of AWS Serverless resources specified in `template.yaml` and `statemachine/recall_orchestrator.asl.json`, with billing models, free tier boundaries, and monthly cost projections across usage tiers.

---

## 1. Resource Catalog Summary

BatchGuard is architected strictly as an on-demand, event-driven serverless system. There are **zero constantly running compute instances, idle containers, or provisioned database capacity units**.

| Category | Logical Resource ID | AWS Service / Resource Type | Billing Model | Sizing / Concurrency |
| :--- | :--- | :--- | :--- | :--- |
| **Database** | `BatchGuardMainTable` | `AWS::DynamoDB::Table` | Pay-Per-Request (On-Demand) | Auto-scaling (0 provisioned RCU/WCU), SSE enabled |
| **Object Storage** | `EvidenceVaultBucket` | `AWS::S3::Bucket` | Standard S3 (GB-mo + requests) | Private, TLS enforced, SSE-S3 |
| **Object Policy** | `EvidenceVaultBucketPolicy` | `AWS::S3::BucketPolicy` | N/A (Included with S3) | Enforces `aws:SecureTransport: "false"` denial |
| **Messaging** | `RecallEmergencyAlertsTopic` | `AWS::SNS::Topic` | Pay-per-publish / notification | Standard SNS Topic |
| **State Machine** | `RecallOrchestratorStateMachine` | `AWS::StepFunctions::StateMachine` | Standard Workflow (State transitions) | 18 states, `.waitForTaskToken` callback |
| **API Ingress** | `BatchGuardApi` | `AWS::Serverless::Api` | REST API (API Gateway v1) | Pay-per-million calls, CORS enabled |
| **Auth** | `BatchGuardUserPool` | `AWS::Cognito::UserPool` | Monthly Active Users (MAU) | 50,000 MAU Free Tier, SRP & Passwords |
| **Auth Client** | `BatchGuardUserPoolClient` | `AWS::Cognito::UserPoolClient` | N/A (Included with Cognito) | Public SPA client, SRP auth |
| **Compute: API** | `BatchesFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: API** | `TraceabilityFunction`| `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 512 MB, Python 3.12, 20s timeout |
| **Compute: API** | `RecallsFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: API** | `SuppliersFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: API** | `DistributionFunction`| `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: API** | `EvidenceFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: API** | `AuditFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: Worker**| `CalculateBlastRadiusFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 512 MB, Python 3.12, 30s timeout |
| **Compute: Worker**| `IsolateFacilitiesFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: Worker**| `DispatchEmergencyAlertsFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: Worker**| `LockPosRegistersFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: Worker**| `HaltInTransitShipmentsFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: Worker**| `NotifyRegulatorsFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: Worker**| `VerifyQuarantineExecutionFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: Worker**| `RecordAuditEntryFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: Worker**| `EmitRecallEventFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: Worker**| `ReleaseRecallLockFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: Worker**| `NotifyRecallCancellationFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: Worker**| `NotifyRecallRejectionFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Compute: Worker**| `NotifyRecallTimeoutFunction` | `AWS::Serverless::Function` | Lambda GB-seconds + invocations | 256 MB, Python 3.12, 15s timeout |
| **Logging** | CloudWatch Log Groups (20) | `AWS::Logs::LogGroup` | Pay-per-GB ingested ($0.50/GB) | 30-day retention |

---

## 2. AWS Free Tier Allowances Applicable to BatchGuard

1. **AWS Lambda:**
   * 1,000,000 free requests per month.
   * 3,200,000 seconds of compute time (at 128 MB) or 1,600,000 seconds (at 256 MB) or 800,000 seconds (at 512 MB).
2. **Amazon API Gateway:**
   * 1,000,000 REST API calls per month free for the first 12 months.
3. **Amazon DynamoDB:**
   * 25 GB of storage free.
   * 25 WCU and 25 RCU under provisioned capacity, or ~2.5M read request units and ~1.0M write request units monthly on on-demand.
4. **Amazon S3:**
   * 5 GB standard storage, 20,000 GET requests, 2,000 PUT requests free for 12 months.
5. **AWS Step Functions:**
   * 4,000 free state transitions per month permanently.
6. **Amazon SNS:**
   * 1,000,000 Amazon SNS publishes free per month.
   * 100,000 HTTP notifications, 1,000 email notifications free per month.
7. **Amazon Cognito:**
   * 50,000 Monthly Active Users (MAU) permanently free.
8. **Amazon CloudWatch:**
   * 5 GB log ingestion and 5 GB log archive free permanently.

---

## 3. Projected Monthly Cost Breakdown

### Scenario A: True Idle Cost (Zero Active Users / Cold Standby)
When no requests or active recalls are running:
* **DynamoDB:** $0.00 (0 provisioned units, Pay-Per-Request, <25 GB storage).
* **AWS Lambda:** $0.00 (0 invocations).
* **API Gateway:** $0.00 (0 calls).
* **Step Functions:** $0.00 (0 state transitions).
* **Amazon S3:** $0.00 (<5 GB test files).
* **Amazon SNS:** $0.00 (0 messages).
* **Amazon Cognito:** $0.00 (<50,000 MAU).
* **CloudWatch Logs:** ~$0.02 – $0.05/month (residual metric storage).
* **Estimated Monthly Total: \$0.02 – \$0.05 / month.**

---

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

---

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

## 4. Cost Anomaly & Budget Protection Recommendations

1. **AWS Budgets Alert:** Set a monthly billing alert at **\$5.00 USD** with an SNS notification to the DevOps distribution list.
2. **Lambda Max Duration Bounds:** All API functions capped at 15s–20s; worker functions capped at 15s–30s to prevent runaway billable execution.
3. **Step Functions Execution Timeout:** State machine configured with `TimeoutSeconds: 86400` (24h) and human gate timeout `TimeoutSeconds: 86400`, ensuring abandoned workflows terminate cleanly.
4. **Log Retention Limits:** Enforce 30-day retention across all CloudWatch log groups to avoid perpetual log storage accumulation.
