# Stage 8C — AWS Deployment Readiness Review Report

**Date:** 2026-11-02  
**Repository:** `https://github.com/ASingha165/BATCHGUARD.git`  
**Workspace:** `D:\BatchGuard`  
**Latest Verified Commit:** [`d220656`](file:///d:/BatchGuard) (`fix: complete BatchGuard SAM validation`)  
**Auditor:** Senior AWS Solutions Architect, Cloud Security Engineer & DevSecOps Auditor  
**Final Status:** **READY WITH CONDITIONS**

---

## 1. Executive Summary

BatchGuard has reached full local infrastructure build verification and serverless architecture maturity. The AWS SAM template (`template.yaml`), Step Functions State Machine definition (`statemachine/recall_orchestrator.asl.json`), and all 20 AWS Lambda functions (7 API handlers and 13 task workers) have been validated live by `sam validate --lint` (0 errors, 0 warnings) and successfully built via `sam build` targeting `python3.12` on `arm64` (AWS Graviton2).

All 100 backend unit and integration tests pass, Python bytecode compiles cleanly, and the React frontend builds production bundles without error.

However, an actual deployment to AWS cannot and must not occur blindly. This audit identifies **4 conditions** (including missing host credentials, frontend Cognito JWT token wiring, URL path prefix handling, and CloudWatch log retention) that must be addressed or accounted for before or during deployment.

---

## 2. Repository Integrity Baseline

* **Branch:** `main`
* **Commit:** `d220656` (`fix: complete BatchGuard SAM validation`)
* **Working Tree:** Clean (untracked `stitch_batchguard_supply_traceability_saas/` design assets preserved).
* **Source Artifact Consistency:**
  - Build directory `.aws-sam\build\` matches current source files in `backend/` and `template.yaml`.
  - Built CloudFormation template `.aws-sam\build\template.yaml` (22,737 bytes) contains all 28 declared serverless resources.
* **Regression Test Status:**
  - `pytest backend/tests/ -v`: **100/100 PASSED** in 1.35s.
  - `python -m compileall backend/`: 0 errors.
  - `npm --prefix frontend run typecheck`: 0 errors.
  - `npm --prefix frontend run build`: 0 errors (built in 1.58s).

---

## 3. AWS Identity and Region Status

A live check of the local AWS environment was conducted using read-only CLI commands:

| Command | Result | Finding |
| :--- | :--- | :--- |
| `aws --version` | `aws-cli/2.38.1 Python/3.14.6 Windows/11 exe/AMD64` | AWS CLI v2 is installed. |
| `aws configure list` | All fields `<not set>` (profile, access_key, secret_key, region) | No active credentials or profiles configured. |
| `aws configure get region` | Exit code 1 (empty) | No default region configured in AWS CLI. |
| `aws sts get-caller-identity` | `aws: [ERROR]: (NoCredentials): Unable to locate credentials.` | **No active AWS credentials available.** |

### Determination:
No AWS credentials or IAM role are currently active on the host machine. Deployment cannot proceed until credentials for the designated AWS account are provisioned.

---

## 4. Complete AWS Resource Inventory (28 Resources)

| Resource Logical ID | AWS Resource Type | Architectural Purpose | Persistent? | Ongoing Cost? | Special Permissions Required | Sensitive Data Stored? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `BatchGuardApi` | `AWS::Serverless::Api` | REST API Ingress (`/v1/*`) | No | Pay-per-call | `apigateway:*` | In-transit request/response |
| `BatchGuardMainTable` | `AWS::DynamoDB::Table` | Single-table persistence | **YES** | On-Demand (PITR storage) | `dynamodb:*` | **YES** (Lots, genealogy, quarantine logs) |
| `EvidenceVaultBucket` | `AWS::S3::Bucket` | Lab tests & COA evidence vault | **YES** | Storage / requests | `s3:*` | **YES** (Lab COAs, BOL docs) |
| `EvidenceVaultBucketPolicy` | `AWS::S3::BucketPolicy` | Enforces TLS-only & SSE | No | None | `s3:PutBucketPolicy` | None |
| `RecallTopic` | `AWS::SNS::Topic` | Emergency recall notification fanout | No | Pay-per-message | `sns:*` | Emergency alert payloads |
| `BatchGuardUserPool` | `AWS::Cognito::UserPool` | Identity provider & RBAC claims | **YES** | Free <=50k MAUs | `cognito-idp:*` | User emails, password hashes, roles |
| `BatchGuardUserPoolClient` | `AWS::Cognito::UserPoolClient` | Web SPA client integration | No | None | `cognito-idp:*` | None (Public client) |
| `BatchFunction` | `AWS::Serverless::Function` | Batches CRUD & Lineage API | No | Invocations | `iam:PassRole`, `lambda:*` | Processing lots & genealogy |
| `RecallFunction` | `AWS::Serverless::Function` | Blast Radius & Recall API | No | Invocations | SFN Start/SendTaskToken | Processing recall incidents |
| `OverviewFunction` | `AWS::Serverless::Function` | Executive KPI & Summary API | No | Invocations | DynamoDB Read | Metrics aggregation |
| `SupplierFunction` | `AWS::Serverless::Function` | Supplier & Facility API | No | Invocations | DynamoDB CRUD | Supplier certification records |
| `DistributionFunction` | `AWS::Serverless::Function` | Distribution & Shipping API | No | Invocations | DynamoDB CRUD | Logistics chain-of-custody |
| `EvidenceFunction` | `AWS::Serverless::Function` | Pre-signed S3 URL Generator | No | Invocations | S3 PutObject pre-signing | S3 Object keys |
| `AuditFunction` | `AWS::Serverless::Function` | Cryptographic Audit Log API | No | Invocations | DynamoDB Read/Write | SHA-256 ledger integrity entries |
| `ValidateRecallRequestWorker` | `AWS::Serverless::Function` | Step Functions task: payload validation | No | Invocations | DynamoDB Read | Recall incident validation |
| `CalculateBlastRadiusWorker` | `AWS::Serverless::Function` | Step Functions task: BFS traversal | No | Invocations | DynamoDB Read | Upstream/downstream blast radius |
| `EvaluateRecallRiskWorker` | `AWS::Serverless::Function` | Step Functions task: FDA hazard scoring | No | Invocations | Standard compute | Hazard classification metrics |
| `AwaitApprovalWorker` | `AWS::Serverless::Function` | Step Functions task: task token registrar | No | Invocations | DynamoDB CRUD | Pauses workflow for 2FA gate |
| `CreateQuarantineTasksWorker` | `AWS::Serverless::Function` | Step Functions task: POS lock injection | No | Invocations | DynamoDB CRUD | Facility hold orders |
| `IdentifyCarrierInterceptsWorker` | `AWS::Serverless::Function` | Step Functions task: transit rerouting | No | Invocations | DynamoDB CRUD | Bill of lading intercept tasks |
| `DispatchNotificationsWorker` | `AWS::Serverless::Function` | Step Functions task: SNS broadcast | No | Invocations | `sns:Publish` | Emergency broadcast payloads |
| `TrackAcknowledgementsWorker` | `AWS::Serverless::Function` | Step Functions task: facility receipts | No | Invocations | DynamoDB Read | Quarantine acknowledgment ledger |
| `RecordAuditEntryWorker` | `AWS::Serverless::Function` | Step Functions task: hash chain link | No | Invocations | DynamoDB CRUD | SHA-256 cryptographic commit |
| `FinalizeRecallWorker` | `AWS::Serverless::Function` | Step Functions task: lock release | No | Invocations | DynamoDB CRUD | Terminal recall completion |
| `HandleRejectionWorker` | `AWS::Serverless::Function` | Step Functions task: rejection release | No | Invocations | DynamoDB CRUD | Releases active recall lock |
| `HandleTimeoutWorker` | `AWS::Serverless::Function` | Step Functions task: 24h expiration | No | Invocations | DynamoDB CRUD | Releases active recall lock |
| `HandleFailureWorker` | `AWS::Serverless::Function` | Step Functions task: catch-all error | No | Invocations | DynamoDB CRUD | Releases active recall lock |
| `RecallOrchestratorStateMachine`| `AWS::Serverless::StateMachine` | SFN Standard Orchestrator | No | State transitions | `states:*`, Lambda invoke | Workflow execution state |

---

## 5. IAM and Security Audit Findings

### Security Controls Confirmed:
1. **Zero Overly Permissive Wildcard Policies:** No `AdministratorAccess` or broad `*.*` IAM roles.
2. **SAM Policy Templates Used Exclusively:** All Lambda functions use scoped SAM policy templates (`DynamoDBCrudPolicy`, `DynamoDBReadPolicy`, `S3CrudPolicy`, `SNSPublishMessagePolicy`).
3. **Task-Token IAM Scope:** `RecallFunction` statement grants `states:SendTaskSuccess` and `states:SendTaskFailure` on `Resource: "*"`. This is strictly compliant with AWS Step Functions architecture because task tokens are cryptographically opaque strings that cannot map to ARN resource patterns.
4. **Step Functions Invocation Least Privilege:** The state machine role contains 13 discrete `LambdaInvokePolicy` entries, granting invocation rights exclusively to the 13 worker Lambdas.
5. **S3 Bucket Security:**
   - Public access block explicitly enabled across all 4 vectors (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets`).
   - Default AES256 server-side encryption enabled.
   - S3 Bucket Policy unconditionally denies insecure HTTP (`aws:SecureTransport: false`).
   - S3 Versioning enabled.
   - S3 Lifecycle rules configured: transition to `STANDARD_IA` at 90 days, expire at 365 days, non-current versions expire at 30 days.
6. **DynamoDB Security:**
   - Encryption at Rest (`SSEEnabled: true`) with AWS-owned KMS keys.
   - Point-in-Time Recovery enabled (`PointInTimeRecoveryEnabled: true`) for continuous backup.

### Security & IAM Findings Table:

| ID | Severity | Category | Description | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **HIGH** | Authorization | `BatchGuardApi` sets `DefaultAuthorizer: CognitoAuthorizer`. All endpoints require valid Cognito JWT. Frontend does not yet transmit tokens. | Create a Cognito test user and configure authorization token injection before end-to-end browser testing. |
| **SEC-02** | **MEDIUM** | Observability | No explicit CloudWatch `LogGroup` resources defined. Lambda logs will default to infinite retention (`Never Expire`). | Define `AWS::Logs::LogGroup` with `RetentionInDays: 30` or set account-level retention in CloudWatch. |
| **SEC-03** | **MEDIUM** | CORS Scope | `template.yaml` defines `AllowOrigin: "'*'"` for API Gateway CORS. Acceptable for development, but should be restricted in production. | Restrict `AllowOrigin` to the specific frontend domain when deploying to `staging` or `prod`. |
| **SEC-04** | **LOW** | Persistence | `BatchGuardMainTable` has no explicit `DeletionPolicy: Retain`. Deleting stack will delete table and data. | Add `DeletionPolicy: Retain` if production data persistence across stack tear-downs is required. |
| **SEC-05** | **INFORMATIONAL** | S3 Deletion | `EvidenceVaultBucket` versioning is enabled. Stack deletion will fail if bucket contains objects. | Document S3 bucket cleanup command prior to stack deletion in runbook. |

---

## 6. Deployment Configuration Audit & Integration Gaps

### Parameter Analysis (`samconfig.toml` vs `template.yaml`):
* `Environment`: Default `dev`. Allowed: `dev`, `staging`, `prod`.
* `LogLevel`: Default `INFO` (prod: `WARN`).
* `Capabilities`: `CAPABILITY_IAM CAPABILITY_NAMED_IAM` configured.
* `Region`: `us-east-1` configured.

### Configuration Gaps Identified:

1. **API Endpoint Path Suffix Mismatch (HIGH):**
   - In `template.yaml`:
     ```yaml
     Outputs:
       ApiGatewayEndpoint:
         Value: !Sub "https://${BatchGuardApi}.execute-api.${AWS::Region}.amazonaws.com/${Environment}/v1"
     ```
   - In `frontend/src/services/api.ts`:
     ```typescript
     const url = `${API_BASE_URL}/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
     ```
   - **Risk:** If a developer sets `VITE_API_BASE_URL` to the CloudFormation output URL (`https://.../dev/v1`), the frontend will fetch `https://.../dev/v1/v1/batches`, causing `404 Not Found`.
   - **Rule:** `VITE_API_BASE_URL` MUST be configured as `https://${BatchGuardApi}.execute-api.${AWS::Region}.amazonaws.com/${Environment}` (WITHOUT trailing `/v1`).

2. **Cognito Client ID Output (MEDIUM):**
   - `template.yaml` outputs `ApiGatewayEndpoint`, `DynamoDBTableName`, `EvidenceVaultBucketName`, `RecallTopicArn`, `RecallOrchestratorArn`, and `CognitoUserPoolId`.
   - It is missing an output for `CognitoUserPoolClientId` (`BatchGuardUserPoolClient`).
   - **Recommendation:** Add `CognitoUserPoolClientId` to `Outputs` in `template.yaml` so developers can copy both User Pool and Client IDs immediately after deployment.

---

## 7. Cost & Operational Risk Assessment

### Estimated Monthly Charges (Low-Traffic Development):

| AWS Service | Usage Metric | Free Tier Coverage | Est. Monthly Cost |
| :--- | :--- | :--- | :--- |
| **AWS Lambda (arm64)** | ~10,000 invocations, 256MB, 500ms | 1,000,000 invocations / 3.2M sec | **$0.00** |
| **Amazon API Gateway** | ~10,000 requests | 1,000,000 requests / month | **$0.00** |
| **Amazon DynamoDB** | On-Demand (PAY_PER_REQUEST), <5MB | 25 GB storage free | **$0.00** |
| **DynamoDB PITR** | Continuous backup on <5MB data | None ($0.20/GB-month) | **<$0.01** |
| **Amazon S3** | Evidence Vault (<50 files, <20MB) | 5 GB Standard storage free | **$0.00** |
| **AWS Step Functions** | ~100 recall executions (~1,000 transitions) | 4,000 state transitions / month | **$0.00** |
| **Amazon SNS** | Emergency alerts (<100 messages) | 1,000,000 publishes free | **$0.00** |
| **Amazon Cognito** | <10 test users | 50,000 MAUs free | **$0.00** |
| **Amazon CloudWatch** | Structured logs (<100MB) | 5 GB ingestion / 5 GB storage free | **$0.00** |
| **Total Estimated Cost** | — | — | **<$0.10 / month** |

### Potential Ongoing or Surprise Costs:
1. **CloudWatch Logs:** If left unconfigured, logs never expire and will accumulate.
2. **SAM Artifact Bucket:** `sam deploy --resolve-s3` creates an S3 deployment bucket. Storing multiple packaged versions (~29 MB each) incurs standard S3 storage charges over time.

---

## 8. Deployment and Rollback Runbook (Planned Sequence)

### Phase A: Pre-Flight Verification
```powershell
# 1. Verify AWS authentication
aws sts get-caller-identity

# 2. Verify region
aws configure get region
```

### Phase B: SAM Build & Deployment
```powershell
# 3. Build serverless artifacts
$env:SAM_CLI_TELEMETRY = "0"
sam build

# 4. Deploy to AWS development stack
sam deploy --config-file samconfig.toml --config-env default
```

### Phase C: Stack Outputs Capture
```powershell
# 5. Extract deployed outputs
aws cloudformation describe-stacks `
  --stack-name batchguard-stack-dev `
  --query "Stacks[0].Outputs" `
  --output table
```

### Phase D: Initial User Provisioning (Cognito)
```powershell
# 6. Create initial compliance officer user
aws cognito-idp admin-create-user `
  --user-pool-id <UserPoolId> `
  --username "compliance.officer@batchguard.internal" `
  --user-attributes Name=email,Value="compliance.officer@batchguard.internal" Name=custom:org_id,Value="ORG#demo-enterprise" `
  --message-action SUPPRESS

# 7. Set permanent password
aws cognito-idp admin-set-user-password `
  --user-pool-id <UserPoolId> `
  --username "compliance.officer@batchguard.internal" `
  --password "BatchGuard2026!Secure" `
  --permanent
```

### Phase E: Rollback & Stack Deletion Procedure
```powershell
# 1. Empty S3 Evidence Vault before stack deletion (required due to S3 versioning)
aws s3 rm s3://batchguard-evidence-dev-<account-id> --recursive

# 2. Delete CloudFormation stack
sam delete --stack-name batchguard-stack-dev --no-prompts
```

---

## 9. Final Readiness Decision

```text
================================================================================
                    BATCHGUARD AWS DEPLOYMENT READINESS
================================================================================
FINAL STATUS: READY WITH CONDITIONS
================================================================================
```

### Conditions for Deployment Authorization:

1. **[BLOCKER 1 - AWS CREDENTIALS]**: Valid AWS credentials must be configured in the deployment environment (`aws sts get-caller-identity` currently returns `NoCredentials`).
2. **[BLOCKER 2 - FRONTEND AUTHENTICATION INTEGRATION]**: Because `BatchGuardApi` strictly enforces `CognitoAuthorizer` across all endpoints, the frontend requires Cognito authentication wiring or test token injection before browser smoke testing can succeed against live AWS infrastructure.
3. **[PREREQUISITE - FRONTEND URL CONFIGURATION]**: `VITE_API_BASE_URL` must be pointed to the API Gateway root (`https://{id}.execute-api.us-east-1.amazonaws.com/dev`) rather than including `/v1`, preventing duplicate path routing (`/v1/v1`).
4. **[RECOMMENDED - USER POOL CLIENT OUTPUT]**: Add `CognitoUserPoolClientId` to `template.yaml` Outputs for automated frontend environment generation.

---

## 10. Verification of Strict Boundaries

* **No AWS resources were created, modified, or deleted.**
* **No CloudFormation stacks were initiated.**
* **No artifacts were uploaded to AWS.**
* **No Git push was executed.**
* **Zero code modifications were made during this audit.**
