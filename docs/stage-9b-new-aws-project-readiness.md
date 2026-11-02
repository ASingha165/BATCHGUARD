# Stage 9B — New AWS Project Authentication, Service Access Verification & Deployment Readiness Report

**Project:** BatchGuard — Food Supply-Chain Traceability & Recall Orchestration  
**Auditor:** Senior AWS Solutions Architect, DevOps Engineer, Cloud Security Engineer  
**Date:** 2026-11-03  
**Target Environment:** AWS Serverless Architecture (`us-east-1`)  
**New AWS Account ID:** `316636858874` (Verified)  
**AWS CLI Profile:** `batchguard-prod`  
**CloudFormation Stack:** `batchguard-stack-dev`  
**AWS Organization ID:** `o-s7r0hf99yn`  
**Management Account ID:** `765578795131` (`singhaankit165@gmail.com`)  
**Enforcing SCPs:** `p-ifuj16mo`, `p-2ee7b077`  
**Local Baseline Commit:** `6331247`  

---

## 1. Verified AWS Account Identity

AWS CLI authentication was executed and verified for profile `batchguard-prod`:

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

* **Account ID:** `316636858874` — Matches the target new project account exactly.
* **Assumed Role ARN:** `arn:aws:sts::316636858874:assumed-role/AccountFullAccessRole/54c8d468-d041-70aa-e978-a84635832a04`
* **Local IAM Permissions:** `AccountFullAccessRole` has full administrative permissions (`AdministratorAccess`) within the member account boundary.
* **AWS Organization:** `o-s7r0hf99yn` (Management Account: `765578795131`, `singhaankit165@gmail.com`).

---

## 2. Serverless Service Access Matrix

Probes across all 9 target serverless services were executed against new account `316636858874` using profile `batchguard-prod`:

| Service | Operation Tested | Result | Classification | Denial Authority |
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
| *AWS Organization* | `organizations:DescribeOrganization` | **Success (200)** | **ACCESSIBLE — READ OPERATION SUCCESSFUL** | Allowed |

---

## 3. SCP & IAM Findings

### Architectural Discovery
The new AWS account `316636858874` was created within the **same AWS Organization** (`o-s7r0hf99yn`) managed by account `765578795131`.

Because Service Control Policies attach to Organizational Units (OUs) or to the Organization Root, new account `316636858874` **inherits the exact same SCP restrictions** as the previous account:
1. **Policy `p-ifuj16mo`**: Explicitly denies `cloudformation:*`, `lambda:*`, `apigateway:*`, `dynamodb:*`, `states:*`, `sns:*`, and `cognito-idp:*`.
2. **Policy `p-2ee7b077`**: Explicitly denies `account:*` operations (e.g. `account:GetContactInformation`).

### Precedence Rule
Under AWS IAM evaluation, an **Explicit Deny in an SCP overrides all identity-based and resource-based policies**, regardless of `AdministratorAccess`. Therefore, creating new member accounts within this same Organization OU will continue to inherit this explicit deny until the policy is detached or modified in management account `765578795131`.

---

## 4. Free Plan Safety & Cost Controls

The user has strictly mandated compliance with the **AWS Free Plan** (no paid plan upgrade, no billing commitment).

### Free Tier Compliance Analysis
* **Zero Cost Under Free Tier:** BatchGuard is designed to execute entirely within the AWS Free Tier allowances:
  - Lambda: 1M invocations / month, 3.2M compute seconds (Free)
  - DynamoDB: 25 GB storage, 25 WCU, 25 RCU (Always Free)
  - API Gateway: 1M REST requests / month (Free first 12 months)
  - Step Functions: 4,000 state transitions / month (Always Free)
  - SNS: 1M publish requests / month (Always Free)
  - Cognito: 50,000 MAUs (Always Free)
  - S3: 5 GB standard storage (Free first 12 months)
  - CloudWatch: 5 GB ingestion, 30-day retention explicitly configured (Always Free)
* **Potential Paid Risk Vectors (Mitigations in Place):**
  - *DynamoDB Point-in-Time Recovery (PITR):* `PointInTimeRecoveryEnabled` is deliberately kept `false` in development to avoid hourly backup storage fees.
  - *Data Transfer / NAT Gateways:* Zero VPC NAT Gateways or VPC endpoints are used; pure serverless design eliminates idle hourly infrastructure charges.
  - *Log Retention:* All 20 CloudWatch Log Groups have an explicit `RetentionInDays: 30` constraint to prevent unbounded archive accumulation.
* **Pre-Deployment Safeguard:**
  Before deploying in any environment, setting a \$0–\$5 CloudWatch billing alert or AWS Budget in the console is recommended.

---

## 5. Infrastructure Validation

Local infrastructure compilation was validated against `template.yaml`:

1. **AWS SAM Lint & Validation:**
   ```powershell
   sam validate --lint
   ```
   **Result:** `D:\BatchGuard\template.yaml is a valid SAM Template` (PASSED).

2. **AWS SAM Build:**
   ```powershell
   sam build
   ```
   **Result:** Incremental packaging of all 20 Lambda functions succeeded (`.aws-sam\build\template.yaml` generated).

---

## 6. Application Validation

Full test suites were executed locally:

1. **Backend Tests:**
   ```powershell
   python -m pytest backend/tests -v
   ```
   **Result:** **108 passed in 0.95s** (100% passing).
   - Covers blast radius calculation, cryptographic audit hash chains, mutual exclusion locking, 2FA gating, cross-tenant isolation, and worker idempotency.

2. **Frontend Tests:**
   ```powershell
   node --test frontend/test/auth_and_url.test.mjs
   ```
   **Result:** **10 passed in 68ms** (100% passing).
   - Covers API URL `/v1` contract, Cognito JWT payload extraction, and MFA software token challenge handling.

3. **Frontend TypeScript Compilation:**
   ```powershell
   cd frontend; npm run typecheck
   ```
   **Result:** Zero errors (PASSED).

4. **Frontend Production Build:**
   ```powershell
   cd frontend; npm run build
   ```
   **Result:** Vite production bundle generated (`dist/assets/index-B6SJUxvj.js`, 366.96 kB) with zero warnings or errors (PASSED).

---

## 7. Remaining Deployment Risks

1. **SCP Inheritance Risk:** Account `316636858874` cannot run `sam deploy` or provision serverless resources until SCP `p-ifuj16mo` is detached from this account or its parent OU in the management account.
2. **Zero Code Blockers:** Application code, infrastructure templates, packaging, and test suites have zero blocking defects.

---

## 8. Required User Actions for Resolution

Because management account `765578795131` is registered to `singhaankit165@gmail.com`, you have direct root/admin authority over the organization:

1. **Sign in to the AWS Console** using root credentials for **`singhaankit165@gmail.com`** (Management Account `765578795131`).
2. Navigate to **AWS Organizations** → **AWS accounts**.
3. Select account **`316636858874`** (or the OU where it resides).
4. Click on the **Policies** tab:
   - Next to Service Control Policy **`p-ifuj16mo`**, click **Detach**.
   - Verify that **`FullAWSAccess`** remains attached.
   *(Alternatively, under **Policies** → **Service control policies**, edit policy `p-ifuj16mo` to remove the `Deny` statements for `cloudformation:*`, `lambda:*`, `apigateway:*`, `dynamodb:*`, `states:*`, `sns:*`, and `cognito-idp:*`).*
5. Save the change.

---

## 9. Recommended Deployment Sequence (Post SCP Detachment)

Once SCP `p-ifuj16mo` is detached from account `316636858874`:

1. Run single read-only probe: `aws cloudformation list-stacks --region us-east-1 --profile batchguard-prod`.
2. Confirm HTTP 200 (Accessible).
3. Execute controlled deployment:
   ```powershell
   sam deploy --config-env dev --profile batchguard-prod --region us-east-1
   ```
4. Extract CloudFormation outputs (`ApiUrl`, `CognitoUserPoolId`, `CognitoClientId`).
5. Update `frontend/.env.production` and deploy frontend static assets.

---

## 10. Final Deployment Verdict

```
========================================================================================
FINAL VERDICT: DEPLOYMENT BLOCKED BY AWS PERMISSIONS
========================================================================================
Verified Target Account: 316636858874 (Profile: batchguard-prod)
Authentication Status: SUCCESSFUL (AssumedRole: AccountFullAccessRole)
Application & Test Status: 100% READY (108 backend tests, 10 frontend tests, SAM build passed)
Blocker Reason: Account 316636858874 resides in AWS Organization o-s7r0hf99yn and inherits
                SCP p-ifuj16mo, which explicitly denies CloudFormation, Lambda, API Gateway,
                DynamoDB, Step Functions, SNS, and Cognito.
Resolution: Detach SCP p-ifuj16mo from account 316636858874 in management account 765578795131.
Billing Constraint: Preserved on AWS Free Plan (No paid upgrade required).
========================================================================================
```
