# Stage 9B — New AWS Project Authentication, Service Access Verification & Deployment Readiness Report

**Project:** BatchGuard — Food Supply-Chain Traceability & Recall Orchestration  
**Auditor:** Senior AWS Solutions Architect, DevOps Engineer, Cloud Security Engineer  
**Date:** 2026-11-03 (Resumed)  
**Target Environment:** AWS Serverless Architecture (`us-east-1`)  
**New AWS Account ID:** `316636858874` (Verified)  
**AWS CLI Profile:** `batchguard-prod`  
**CloudFormation Stack:** `batchguard-stack-dev`  
**AWS Organization ID:** `o-s7r0hf99yn`  
**Management Account ID:** `765578795131` (`singhaankit165@gmail.com`)  
**Enforcing SCPs:** `p-ifuj16mo`  
**Local Baseline Commit:** `0f916ee`  

---

## 1. Verified AWS Account Identity

AWS CLI authentication was re-verified for profile `batchguard-prod`:

```powershell
aws sts get-caller-identity --profile batchguard-prod
```

```json
{
    "UserId": "AROAUTOIHBH5ENA5RUF2A:54c8d468-d041-70aa-e978-a84635832a04",
    "Account": "316636858874",
    "Arn": "arn:aws:sts::316636858874:assumed-role/AccountFullAccessRole/54c8d468-d041-70aa-e978-a84635832a04"
}
```

* **Account ID Verification:** `316636858874` — **Confirmed exact match**.
* **Assumed Role ARN:** `arn:aws:sts::316636858874:assumed-role/AccountFullAccessRole/54c8d468-d041-70aa-e978-a84635832a04`
* **Local IAM Permissions:** `AccountFullAccessRole` has full administrative permissions (`AdministratorAccess`) within the member account boundary.
* **AWS Organization:** `o-s7r0hf99yn` (Management Account: `765578795131`, `singhaankit165@gmail.com`).

---

## 2. Serverless Service Access Matrix

Live read-only permission checks were executed across all 9 target serverless services using profile `batchguard-prod`:

| Service | Operation Probed | Status | Classification | Denial Authority |
| :--- | :--- | :--- | :--- | :--- |
| **AWS CloudFormation** | `cloudformation:ListStacks` | Denied (403) | **EXPLICIT SCP DENY** | SCP `p-ifuj16mo` |
| **AWS Lambda** | `lambda:ListFunctions` | Denied (403) | **EXPLICIT SCP DENY** | SCP `p-ifuj16mo` |
| **Amazon API Gateway** | `apigateway:GET /restapis` | Denied (403) | **EXPLICIT SCP DENY** | SCP `p-ifuj16mo` |
| **Amazon DynamoDB** | `dynamodb:ListTables` | Denied (400) | **EXPLICIT SCP DENY** | SCP `p-ifuj16mo` |
| **Amazon S3** | `s3:ListAllMyBuckets` | **Success (200)** | **ACCESSIBLE — READ OPERATION SUCCESSFUL** | Allowed |
| **AWS Step Functions** | `states:ListStateMachines` | Denied (400) | **EXPLICIT SCP DENY** | SCP `p-ifuj16mo` |
| **Amazon SNS** | `sns:ListTopics` | Denied (403) | **EXPLICIT SCP DENY** | SCP `p-ifuj16mo` |
| **Amazon Cognito** | `cognito-idp:ListUserPools` | Denied (400) | **EXPLICIT SCP DENY** | SCP `p-ifuj16mo` |
| **Amazon CloudWatch Logs**| `logs:DescribeLogGroups` | **Success (200)** | **ACCESSIBLE — READ OPERATION SUCCESSFUL** | Allowed |

---

## 3. Root Cause Analysis

### SCP Inheritance Under Organization `o-s7r0hf99yn`
Account `316636858874` is attached to organization `o-s7r0hf99yn` (management account `765578795131`).
The Service Control Policy `p-ifuj16mo` is attached to either the Organization Root or to the Organizational Unit (OU) where member account `316636858874` resides.

In AWS IAM policy evaluation:
* An **Explicit Deny in an SCP overrides all identity-based policies**, including `AdministratorAccess`.
* As long as SCP `p-ifuj16mo` remains attached to this account's hierarchy, calls to `cloudformation:*`, `lambda:*`, `apigateway:*`, `dynamodb:*`, `states:*`, `sns:*`, and `cognito-idp:*` are blocked at the perimeter before IAM policies are evaluated.

---

## 4. Infrastructure & Application Validation

All local build, lint, and test suites were freshly verified:

| Component | Target / Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **AWS SAM Lint** | `sam validate --lint` | **PASSED** | Valid SAM Template with zero schema errors. |
| **AWS SAM Build** | `sam build` | **PASSED** | Incremental packaging of all 20 Lambda functions succeeded (`.aws-sam\build\template.yaml`). |
| **Backend Test Suite** | `python -m pytest backend/tests` | **PASSED** | **108 / 108 tests passing** (0.93s). |
| **Frontend Test Suite** | `node --test frontend/test/auth_and_url.test.mjs` | **PASSED** | **10 / 10 tests passing** (70ms). |
| **Frontend TypeScript** | `npm run typecheck` | **PASSED** | Zero TypeScript compilation errors. |
| **Frontend Build** | `npm run build` | **PASSED** | Production bundle generated (`dist/assets/index-B6SJUxvj.js`, 366.96 kB). |

---

## 5. Free Plan Safety Assessment

* **Zero Cost Under Free Tier:** BatchGuard is engineered to operate strictly within the AWS Free Tier allowances:
  - Lambda: 1,000,000 requests, 3.2M sec compute (Free Tier)
  - DynamoDB: 25 GB storage, 25 WCU, 25 RCU (Always Free)
  - API Gateway: 1,000,000 REST requests (Free Tier 12 months)
  - Step Functions: 4,000 state transitions (Always Free)
  - SNS: 1,000,000 publishes (Always Free)
  - Cognito: 50,000 MAU (Always Free)
  - S3: 5 GB standard storage (Free Tier 12 months)
  - CloudWatch: 5 GB log ingestion with explicit 30-day retention constraint.
* **Cost Controls:** DynamoDB PITR is disabled (`PointInTimeRecoveryEnabled: false`), zero VPC NAT Gateways are used, and no paid commitments are configured.
* **No Paid Upgrade Required:** Upgrading to a paid plan does **not** affect Service Control Policies. The Free Plan constraint remains strictly preserved.

---

## 6. Required User Action to Unlock Deployment (\$0 Cost)

Because you own management account `765578795131` (`singhaankit165@gmail.com`):

1. **Sign in to the AWS Console** using root credentials for **`singhaankit165@gmail.com`** (Account `765578795131`).
2. Navigate to **AWS Organizations** → **AWS accounts**.
3. Select account **`316636858874`** (or its parent Organizational Unit).
4. Click on the **Policies** tab:
   - Next to Service Control Policy **`p-ifuj16mo`**, click **Detach**.
   - Verify that **`FullAWSAccess`** remains attached.
   *(Alternatively, under **Policies** → **Service control policies**, edit policy `p-ifuj16mo` to remove the `Deny` statements for `cloudformation:*`, `lambda:*`, `apigateway:*`, `dynamodb:*`, `states:*`, `sns:*`, and `cognito-idp:*`).*
5. Save the change.

---

## 7. Deployment Readiness Verdict

```
========================================================================================
FINAL VERDICT: DEPLOYMENT BLOCKED BY AWS PERMISSIONS
========================================================================================
Verified Target Account: 316636858874 (Profile: batchguard-prod)
Authentication Status: SUCCESSFUL (AssumedRole: AccountFullAccessRole)
Application & Code Status: 100% READY (108 backend tests, 10 frontend tests, SAM build passed)
Remaining Blocker: Account 316636858874 inherits SCP p-ifuj16mo from parent Organization o-s7r0hf99yn,
                   which explicitly denies CloudFormation, Lambda, API Gateway, DynamoDB,
                   Step Functions, SNS, and Cognito.
Resolution: Detach SCP p-ifuj16mo from account 316636858874 in management account 765578795131.
Billing Constraint: Maintained on AWS Free Plan ($0 cost).
========================================================================================
```
