# Stage 9A — AWS Authentication, Account Verification & Deployment Preparation Report

**Date:** 2026-11-03  
**Repository:** `https://github.com/ASingha165/BATCHGUARD.git`  
**Workspace:** `D:\BatchGuard`  
**Base Commit:** [`eb601e7`](file:///d:/BatchGuard)  
**Assessor:** Senior AWS Solutions Architect, DevSecOps Engineer & Cloud Security Auditor  
**Final Verdict:** **BLOCKED — AWS AUTHENTICATION REQUIRED**

---

## 1. Executive Summary

BatchGuard has completed all local engineering, security hardening, Cognito MFA integration, and AWS SAM packaging milestones. The codebase is fully verified:
* **Backend:** 108/108 pytest tests passed in 1.45s.
* **Frontend:** 10/10 Node.js unit tests passed; TypeScript typecheck and production Vite build passed with 0 errors.
* **Infrastructure:** AWS SAM template (`template.yaml`) passed `sam validate --lint` with 0 errors and 0 warnings.
* **Packaging:** `sam build` successfully compiled all 20 AWS Lambda functions for `python3.12` on `arm64`.
* **Security:** Cognito TOTP MFA (`SOFTWARE_TOKEN_MFA`) challenge response natively integrated into the frontend; 20 explicit CloudWatch LogGroups enforce a 30-day retention window.

However, execution of read-only AWS caller identity checks (`aws sts get-caller-identity`) confirms that **no AWS credentials or profiles are currently configured on the host machine**. BatchGuard is completely ready for deployment, but blocked strictly on user authentication to the target AWS account.

---

## 2. AWS Identity and Environment Status

A live audit was conducted using read-only AWS CLI commands:

```text
> aws --version
aws-cli/2.38.1 Python/3.14.6 Windows/11 exe/AMD64

> aws configure list
NAME       : VALUE                    : TYPE             : LOCATION
profile    : <not set>                : None             : None
access_key : <not set>                : None             : None
secret_key : <not set>                : None             : None
region     : <not set>                : None             : None

> aws sts get-caller-identity
aws: [ERROR]: An error occurred (NoCredentials): Unable to locate credentials. You can configure credentials by running "aws login".
```

* **Account ID:** Unverified (`NoCredentials`).
* **IAM Identity / Assumed Role:** Unverified (`NoCredentials`).
* **Configured Region in CLI:** `<not set>` (Target region in `samconfig.toml`: `us-east-1`).
* **Intended Stack Name:** `batchguard-stack-dev`.

---

## 3. Approved Authentication Mechanisms for the User

To enable deployment without exposing sensitive keys or credentials, the user can authenticate using one of three standard AWS methods:

### Option A: AWS IAM Identity Center (Recommended / SSO)
If using AWS IAM Identity Center or the AWS Weekend Challenge SSO portal:
```powershell
aws configure sso
# Follow the interactive browser login prompts
```

### Option B: AWS CLI Interactive Configuration
If using standard IAM user access keys:
```powershell
aws configure
# Enter AWS Access Key ID
# Enter AWS Secret Access Key
# Default region name: us-east-1
# Default output format: json
```
*(Never share or paste secret keys into the chat).*

### Option C: Temporary Environment Variables (Session Token)
If supplied with temporary credentials from the AWS Console or Challenge portal:
```powershell
$env:AWS_ACCESS_KEY_ID="ASIA..."
$env:AWS_SECRET_ACCESS_KEY="..."
$env:AWS_SESSION_TOKEN="..."
$env:AWS_DEFAULT_REGION="us-east-1"
```

---

## 4. Service Availability Assessment (`us-east-1`)

Target deployment region is `us-east-1` (US East, N. Virginia).

| AWS Service | Regional Availability Status | Verification Method |
| :--- | :--- | :--- |
| **AWS CloudFormation** | Fully Available | Regional Core Service |
| **AWS Lambda (arm64 Graviton2)** | Fully Available | Regional Core Service |
| **Amazon API Gateway (REST API)** | Fully Available | Regional Core Service |
| **Amazon DynamoDB (On-Demand)** | Fully Available | Regional Core Service |
| **Amazon S3** | Fully Available | Regional Core Service |
| **AWS Step Functions (Standard)** | Fully Available | Regional Core Service |
| **Amazon SNS** | Fully Available | Regional Core Service |
| **Amazon Cognito User Pools** | Fully Available | Regional Core Service |
| **Amazon CloudWatch Logs** | Fully Available | Regional Core Service |

*Note: Live API endpoint probing requires authenticated AWS credentials.*

---

## 5. IAM and Deployment Permission Assessment

To execute `sam deploy`, the deploying IAM identity will require policy permissions to manage CloudFormation stacks and provision the following resource types:
1. `cloudformation:*` (Scoped to stack `batchguard-stack-dev`)
2. `iam:CreateRole`, `iam:PutRolePolicy`, `iam:AttachRolePolicy`, `iam:DeleteRole`, `iam:PassRole` (for Lambda execution and Step Functions roles)
3. `lambda:*` (for the 20 BatchGuard functions)
4. `apigateway:*` (for REST API, resources, methods, and stages)
5. `dynamodb:*` (for `BatchGuard-Main-dev`)
6. `s3:*` (for `batchguard-evidence-dev-*` and SAM deployment bucket)
7. `states:*` (for `BatchGuardRecallOrchestrator-dev`)
8. `sns:*` (for `batchguard-recall-notifications-dev`)
9. `cognito-idp:*` (for `BatchGuardUserPool` and `BatchGuardUserPoolClient`)
10. `logs:*` (for 20 explicit Lambda log groups)

---

## 6. Infrastructure & Resource Review (48 Resources Total)

* **7 API Handlers:** `BatchFunction`, `RecallFunction`, `OverviewFunction`, `SupplierFunction`, `DistributionFunction`, `EvidenceFunction`, `AuditFunction`.
* **13 Step Functions Workers:** `ValidateRecallRequestWorker`, `CalculateBlastRadiusWorker`, `EvaluateRecallRiskWorker`, `AwaitApprovalWorker`, `CreateQuarantineTasksWorker`, `IdentifyCarrierInterceptsWorker`, `DispatchNotificationsWorker`, `TrackAcknowledgementsWorker`, `RecordAuditEntryWorker`, `FinalizeRecallWorker`, `HandleRejectionWorker`, `HandleTimeoutWorker`, `HandleFailureWorker`.
* **20 CloudWatch LogGroups:** Explicit 30-day retention policies attached 1:1 to every function.
* **1 Database Table:** `BatchGuard-Main-dev` (PAY_PER_REQUEST, SSE, PITR).
* **1 Object Storage Vault:** `EvidenceVaultBucket` (Encrypted, Blocked Public Access, Versioned, 30-day noncurrent version expiration).
* **1 Orchestration Engine:** `RecallOrchestratorStateMachine` (Step Functions Standard Workflow with `.waitForTaskToken`).
* **1 Messaging Fabric:** `RecallTopic` (SSE-SNS).
* **1 Identity Provider:** `BatchGuardUserPool` with TOTP MFA and `BatchGuardUserPoolClient` with `ALLOW_USER_PASSWORD_AUTH`.
* **1 API Gateway:** `BatchGuardApi` with `CognitoAuthorizer`.

---

## 7. Cost Assessment & Resource Safety

* **Estimated Idle Monthly Cost:** **$0.00** for all compute, queues, APIs, and state machines. Minimal micro-cents (<$0.001/mo) for DynamoDB PITR and S3 storage.
* **Estimated Dev Usage Cost:** **<$0.10 / month**.
* **Cleanup Gotcha:** Versioning is active on `EvidenceVaultBucket`. Before running `sam delete`, all active versions, non-current versions, and delete markers must be deleted via `aws s3api delete-objects`.

---

## 8. Deployment Configuration & Parameters

### `samconfig.toml` Settings:
* **Stack Name:** `batchguard-stack-dev`
* **Region:** `us-east-1`
* **Parameter Overrides:** `Environment=dev LogLevel=INFO`
* **Capabilities:** `CAPABILITY_IAM CAPABILITY_NAMED_IAM`
* **Confirm Changeset:** `true` (prompts for manual confirmation before applying CloudFormation changes)
* **Disable Rollback:** `false` (auto-rollbacks on any creation failure)

### Post-Deployment Frontend Configuration:
Immediately following deployment, the frontend `.env` will be populated directly from CloudFormation outputs:
```env
VITE_API_BASE_URL=<ApiGatewayStageUrl>
VITE_COGNITO_USER_POOL_ID=<CognitoUserPoolId>
VITE_COGNITO_CLIENT_ID=<CognitoClientId>
VITE_AWS_REGION=us-east-1
VITE_APP_ENV=development
```

---

## 9. Final Pre-Deployment Validation Results

| Test Suite | Command | Result |
| :--- | :--- | :--- |
| **Backend Tests** | `python -m pytest backend/tests/ -v` | **108 passed in 1.45s** |
| **Frontend Tests** | `node --test frontend/test/auth_and_url.test.mjs` | **10 passed in 67ms** |
| **Frontend Typecheck** | `npm --prefix frontend run typecheck` | **0 errors** |
| **Frontend Build** | `npm --prefix frontend run build` | **Built in 1.58s** |
| **SAM Linting** | `sam validate --lint` | **0 errors, 0 warnings** |
| **SAM Build** | `sam build` | **All 20 functions compiled** |

---

## 10. Final Verdict

```text
================================================================================
                    BATCHGUARD AWS DEPLOYMENT READINESS
================================================================================
VERDICT: BLOCKED — AWS AUTHENTICATION REQUIRED
================================================================================
```

All software, security, infrastructure, test, and packaging requirements are 100% satisfied. The project is strictly blocked on the user authenticating their AWS CLI with the target AWS account.
