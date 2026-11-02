# Stage 8C — AWS Deployment Readiness Review Report (Updated Post-8D)

**Date:** 2026-11-02 (Updated: 2026-11-03)  
**Repository:** `https://github.com/ASingha165/BATCHGUARD.git`  
**Workspace:** `D:\BatchGuard`  
**Latest Verified Commit:** [`75727c7`](file:///d:/BatchGuard) (`docs: add Stage 8C AWS deployment readiness review report`)  
**Auditor:** Senior AWS Solutions Architect, Cloud Security Engineer & DevSecOps Auditor  
**Final Status:** **READY WITH CONDITIONS** (Blockers 2 & 3 Remediated in Stage 8D)

---

## 1. Executive Summary

BatchGuard has reached full local infrastructure build verification and serverless architecture maturity. The AWS SAM template (`template.yaml`), Step Functions State Machine definition (`statemachine/recall_orchestrator.asl.json`), and all 20 AWS Lambda functions (7 API handlers and 13 task workers) have been validated live by `sam validate --lint` (0 errors, 0 warnings) and successfully built via `sam build` targeting `python3.12` on `arm64` (AWS Graviton2).

All 107 backend unit and integration tests pass, Python bytecode compiles cleanly, and the React frontend builds production bundles without error.

---

## 2. Repository Integrity Baseline

* **Branch:** `main`
* **Source Artifact Consistency:**
  - Build directory `.aws-sam\build\` matches current source files in `backend/` and `template.yaml`.
  - Built CloudFormation template `.aws-sam\build\template.yaml` contains all 48 declared serverless resources (including 20 explicit CloudWatch LogGroups with 30-day retention).
* **Regression Test Status:**
  - `pytest backend/tests/ -v`: **107/107 PASSED** in 3.10s.
  - `node --test frontend/test/auth_and_url.test.mjs`: **7/7 PASSED**.
  - `python -m compileall backend/`: 0 errors.
  - `npm --prefix frontend run typecheck`: 0 errors.
  - `npm --prefix frontend run build`: 0 errors (built in 3.71s).

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

## 4. Complete AWS Resource Inventory (48 Resources Post-8D)

| Resource Logical ID | AWS Resource Type | Architectural Purpose | Persistent? | Special Permissions Required |
| :--- | :--- | :--- | :--- | :--- |
| `BatchGuardApi` | `AWS::Serverless::Api` | REST API Ingress (`/v1/*`) with Cognito Authorizer | No | `apigateway:*` |
| `BatchGuardMainTable` | `AWS::DynamoDB::Table` | Single-table persistence (PAY_PER_REQUEST, SSE, PITR) | **YES** | `dynamodb:*` |
| `EvidenceVaultBucket` | `AWS::S3::Bucket` | Lab tests & COA evidence vault (Versioned, Encrypted) | **YES** | `s3:*` |
| `EvidenceVaultBucketPolicy` | `AWS::S3::BucketPolicy` | Enforces TLS-only (`aws:SecureTransport: false` denial) | No | `s3:PutBucketPolicy` |
| `RecallTopic` | `AWS::SNS::Topic` | Emergency recall notification fanout | No | `sns:*` |
| `BatchGuardUserPool` | `AWS::Cognito::UserPool` | Identity provider & RBAC claims (`org_id`, roles) | **YES** | `cognito-idp:*` |
| `BatchGuardUserPoolClient` | `AWS::Cognito::UserPoolClient` | Web SPA client (SRP, Refresh, Password Auth) | No | `cognito-idp:*` |
| 7 API Lambda Functions | `AWS::Serverless::Function` | Modular API compute (`handlers/`) | No | Scoped CRUD / Read Policies |
| 13 Task Worker Lambdas | `AWS::Serverless::Function` | Step Functions execution tasks (`workers/`) | No | Scoped Task Roles |
| 20 CloudWatch LogGroups | `AWS::Logs::LogGroup` | Enforces 30-day retention on all 20 functions | No | `logs:*` |
| `RecallOrchestratorStateMachine`| `AWS::Serverless::StateMachine` | SFN Standard Orchestrator | No | Scoped Task Invocation |

---

## 5. IAM and Security Audit Findings

### Security Controls Confirmed:
1. **Zero Overly Permissive Wildcard Policies:** No `AdministratorAccess` or broad `*.*` IAM roles.
2. **SAM Policy Templates Used Exclusively:** All Lambda functions use scoped SAM policy templates (`DynamoDBCrudPolicy`, `DynamoDBReadPolicy`, `S3CrudPolicy`, `SNSPublishMessagePolicy`).
3. **Task-Token IAM Scope:** `RecallFunction` statement grants `states:SendTaskSuccess` and `states:SendTaskFailure` on `Resource: "*"`. This is strictly compliant with AWS Step Functions architecture because task tokens are cryptographically opaque strings that cannot map to ARN resource patterns.
4. **Step Functions Invocation Least Privilege:** The state machine role contains 13 discrete `LambdaInvokePolicy` entries, granting invocation rights exclusively to the 13 worker Lambdas.
5. **S3 Bucket Security:** Public access block enabled across all 4 vectors, AES256 encryption, TLS-only bucket policy, Versioning enabled, Lifecycle transitions configured.
6. **DynamoDB Security:** SSE enabled with AWS KMS, Point-in-Time Recovery enabled for continuous backup.

---

## 6. Deployment Configuration Audit & Remediation Status

1. **API Endpoint Path Suffix Mismatch (REMEDIATED IN STAGE 8D):**
   - Implemented `buildApiUrl(baseUrl, endpoint)` in `frontend/src/services/api.ts`.
   - Strips trailing slashes and deduplicates `/v1`, guaranteeing `/v1/v1` is never formed regardless of whether `VITE_API_BASE_URL` contains `/v1` or the stage root.
   - Added `ApiGatewayStageUrl` export to `template.yaml`.
2. **Cognito Client ID Output (VERIFIED):**
   - Exported as `CognitoClientId` in `template.yaml`.
3. **Frontend Cognito Authentication (REMEDIATED IN STAGE 8D):**
   - Implemented `frontend/src/services/auth.ts` with standard Cognito `InitiateAuth` (`USER_PASSWORD_AUTH` and `REFRESH_TOKEN_AUTH`), token storage, automatic proactive refresh (60s pre-expiry), and safe local dev fallback.
   - Connected `Authorization: Bearer <idToken>` and `X-Organization-Id` in `frontend/src/services/api.ts`.
   - Updated `frontend/src/components/layout/Header.tsx` with user session badge, profile popover, and login modal.
   - Added `ALLOW_USER_PASSWORD_AUTH` to `BatchGuardUserPoolClient`.
4. **CloudWatch Log Retention (REMEDIATED IN STAGE 8D):**
   - Declared 20 explicit `AWS::Logs::LogGroup` resources in `template.yaml`, each with `RetentionInDays: 30`, eliminating infinite log retention cost accumulation.

---

## 7. Cost & Operational Risk Assessment (Corrected Pricing Assumptions)

### Pricing Tiers Explained:
* **Always Free:** Never expires (e.g. Lambda 1M requests/mo, DynamoDB 25GB storage, SNS 1M publishes, Cognito 50k MAUs).
* **12-Month Free Tier:** Applies ONLY to new AWS accounts during the first 12 months. Mature AWS accounts (>12 months) DO NOT receive free S3 storage (5GB) or free API Gateway calls (1M/mo).
* **Non-Free / Paid Features:** Features with NO free tier (e.g. DynamoDB Point-in-Time Recovery).

### Detailed Resource Pricing Breakdown (us-east-1):

| AWS Service | Pricing Model | Always Free Tier | 12-Month Free Tier | Price Beyond Free Tier | Est. Low-Traffic Dev Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AWS Lambda (arm64)** | Per invocation & compute-duration | 1M req / 3.2M sec | N/A | $0.20/1M req + $0.0000133334/GB-s | **$0.00** |
| **Amazon API Gateway** | Pay-per-request REST API | None | 1M calls/mo | $3.50 per 1M requests | **$0.00** (new) / **<$0.05** (mature) |
| **Amazon DynamoDB** | On-Demand (PAY_PER_REQUEST) | 25 GB storage | N/A | $1.25/1M writes, $0.25/1M reads | **$0.00** (idle: $0.00) |
| **DynamoDB PITR** | Paid continuous backup | **NONE** | **NONE** | $0.20 per GB-month | **<$0.01 / month** (on <5MB) |
| **Amazon S3 Standard** | Storage & API requests | None | 5 GB storage, 2k PUT, 20k GET | $0.023/GB-month, $0.005/1k PUT | **$0.00** (new) / **<$0.01** (mature) |
| **S3 Versioning Overhead** | Replaced/deleted object versions | None | Subject to standard S3 rates | $0.023/GB-month (pruned at 30 days) | **<$0.01 / month** |
| **AWS Step Functions** | State transitions (Standard) | 4,000 transitions/mo | N/A | $0.025 per 1,000 transitions | **$0.00** (idle: $0.00) |
| **Amazon SNS** | Emergency broadcasts | 1M publishes/mo | N/A | $0.50/1M publishes | **$0.00** |
| **Amazon Cognito** | Monthly Active Users (MAUs) | 50,000 MAUs/mo | N/A | $0.0055/MAU thereafter | **$0.00** |
| **CloudWatch Logs** | Ingestion & Storage | 5 GB ingest / 5 GB store | N/A | $0.50/GB ingest, $0.03/GB-mo store | **$0.00** (30-day retention bounded) |
| **Total Estimated Cost** | Low-traffic development testing | — | — | — | **<$0.10 / month** |

### Verified Cost & Operational Realities:
1. **Zero-Traffic Idle Cost:** If BatchGuard is deployed and completely idle, DynamoDB, Lambda, API Gateway, Step Functions, and SNS incur **$0.00**. Only DynamoDB PITR on stored data (~$0.001/mo) and S3 storage (~$0.001/mo) incur micro-cents.
2. **S3 Versioning:** Overwriting or deleting evidence documents retains historical versions until purged by the 30-day noncurrent version expiration lifecycle rule.
3. **SAM Deployment Bucket:** `sam deploy --resolve-s3` maintains packaged deployment artifacts in an S3 bucket (~29 MB per release). Old deployment zips accumulate over multiple releases unless manually cleaned or expired.

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
  --user-attributes Name=email,Value="compliance.officer@batchguard.internal" Name=custom:org_id,Value="ORG#apex-foods-north-america" `
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
FINAL STATUS: READY FOR DEPLOYMENT (PENDING CREDENTIAL PROVISIONING)
================================================================================
```

### Remediation Status Matrix:
* **[BLOCKER 1 - AWS CREDENTIALS]**: **ACTIVE BLOCKER** — Host environment requires valid AWS IAM credentials (`aws sts get-caller-identity` returns `NoCredentials`).
* **[BLOCKER 2 - FRONTEND AUTH INTEGRATION]**: **REMEDIATED** — Cognito authentication service implemented in `frontend/src/services/auth.ts`, connected to `api.ts`, and `ALLOW_USER_PASSWORD_AUTH` configured in `template.yaml`.
* **[BLOCKER 3 - URL NORMALIZATION]**: **REMEDIATED** — `buildApiUrl` cleanly handles both stage URL and `/v1` root without path duplication.
* **[OBSERVABILITY & COST - CLOUDWATCH RETENTION]**: **REMEDIATED** — All 20 Lambda functions now have explicit CloudWatch LogGroups with 30-day retention in `template.yaml`.

---

## 10. Verification of Strict Boundaries

* **No AWS resources were created, modified, or deleted.**
* **No CloudFormation stacks were initiated.**
* **No artifacts were uploaded to AWS.**
* **No Git push was executed.**
