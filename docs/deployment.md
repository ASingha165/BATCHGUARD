# BatchGuard AWS Deployment Runbook

> **Stage 8A Cloud Readiness Artifact**  
> Operational guide for deploying, configuring, monitoring, and rolling back BatchGuard serverless infrastructure across AWS environments.

---

## 1. Overview & Deployment Strategy

BatchGuard is packaged and provisioned using **AWS Serverless Application Model (SAM)** and CloudFormation. This ensures automated, reproducible, infrastructure-as-code deployments across staging and production environments.

The stack creates:
1. **Amazon DynamoDB:** `BatchGuard-Main-{Environment}` single-table database with on-demand capacity, SSE encryption, and GSIs.
2. **Amazon S3:** `batchguard-evidence-vault-{Environment}-{AWS::AccountId}` encrypted object store with TLS-enforcing bucket policy and Public Access Block.
3. **Amazon SNS:** `batchguard-recall-notifications-{Environment}` emergency broadcast topic.
4. **AWS Step Functions:** `BatchGuardRecallOrchestrator-{Environment}` Standard Workflow recall orchestrator with human approval gate.
5. **Amazon Cognito:** User Pool & User Pool Client for tenant authentication with SRP and MFA support.
6. **AWS Lambda:** 7 REST API microservices + 13 Step Functions task workers with least-privilege IAM policies.
7. **Amazon API Gateway:** REST API with CORS, Cognito user pool authorizer, and request validation.

---

## 2. Prerequisites & Environment Setup

* **AWS CLI:** Version 2.x installed and configured (`aws sts get-caller-identity` returns valid credentials).
* **AWS SAM CLI:** Version 1.100+ installed (`sam --version`).
  * *Windows installation:* `winget install Amazon.SAMCLI` or download the 64-bit MSI installer from AWS.
* **Python:** 3.12 runtime installed (`python --version`).
* **Node.js:** 20+ LTS and npm 10+ installed (`node -v`, `npm -v`).
* **Docker (Optional):** Docker Desktop required only if building native binary packages with `sam build --use-container`. For pure Python Lambda code, native `sam build` works directly.

### Verification of AWS Credentials
```bash
aws sts get-caller-identity
```
Ensure your IAM user or assumed role possesses permissions to create CloudFormation stacks, IAM roles, Lambda functions, DynamoDB tables, S3 buckets, SNS topics, Step Functions state machines, and API Gateway APIs.

---

## 3. Configuration Management (`samconfig.toml`)

Deployment configurations for all environments are pre-defined in `samconfig.toml`:

```bash
# Deploy to Development
sam deploy --config-env dev

# Deploy to Staging
sam deploy --config-env staging

# Deploy to Production (enforces confirmation prompts)
sam deploy --config-env prod
```

---

## 4. Step-by-Step Backend Deployment

### Step 4.1 — Validate SAM Specification
```bash
sam validate --lint
```

### Step 4.2 — Build Serverless Artifacts
```bash
sam build
```
*(If building dependencies inside a container, use `sam build --use-container`).*

### Step 4.3 — Guided Initial Deployment
For the initial deployment to create the CloudFormation stack:
```bash
sam deploy --guided
```

Provide the requested configuration prompts:
* **Stack Name:** `batchguard-stack-dev`
* **AWS Region:** `us-east-1` (or your target region)
* **Parameter Environment:** `dev`
* **Confirm changes before deploy:** `Y`
* **Allow SAM CLI IAM role creation:** `Y`
* **Disable rollback on failure:** `N` (keep rollback enabled for safety)
* **Save arguments to configuration file:** `Y`

### Step 4.4 — Capture Stack Outputs
Upon completion, the SAM CLI outputs the operational endpoints:
```
Key: ApiGatewayEndpoint
Value: https://<api-id>.execute-api.us-east-1.amazonaws.com/Prod/v1

Key: EvidenceVaultBucketName
Value: batchguard-evidence-vault-dev-123456789012

Key: RecallTopicArn
Value: arn:aws:sns:us-east-1:123456789012:batchguard-recall-notifications-dev

Key: StepFunctionsArn
Value: arn:aws:states:us-east-1:123456789012:stateMachine:BatchGuardRecallOrchestrator-dev

Key: UserPoolId
Value: us-east-1_abcdef123

Key: UserPoolClientId
Value: 1234567890abcdef1234567890
```

---

## 5. Frontend Configuration & Deployment

### Step 5.1 — Configure Frontend Environment
Create or edit `frontend/.env.production` with stack outputs:
```env
VITE_API_BASE_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com/Prod/v1
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_abcdef123
VITE_USER_POOL_CLIENT_ID=1234567890abcdef1234567890
VITE_APP_ENV=production
```

### Step 5.2 — Build Production Bundle
```bash
cd frontend
npm run build
```
This produces optimized production assets in `frontend/dist/`.

### Step 5.3 — Hosting
* **S3 + CloudFront CDN:**
  ```bash
  aws s3 sync dist/ s3://batchguard-frontend-dev-123456789012/ --delete
  aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/*"
  ```
* **AWS Amplify Hosting:**
  Connect the GitHub repository `https://github.com/ASingha165/BATCHGUARD.git` to AWS Amplify Console for automated Git branch deploys.

---

## 6. Rollback & Disaster Recovery Procedures

### Automatic Rollbacks (Default Behavior)
By default, SAM deployments have `disable_rollback = false`. If any CloudFormation resource creation fails (e.g. IAM permission error or resource quota breach):
1. CloudFormation immediately pauses execution.
2. All newly created resources are cleanly deleted in reverse order.
3. The stack returns to its previous clean state (`ROLLBACK_COMPLETE` or previous `UPDATE_COMPLETE`).

### Manual Emergency Rollback
To roll back to a specific previous stack revision:
```bash
aws cloudformation rollback-stack --stack-name batchguard-stack-dev
```

### Stack Deletion (Tear Down Non-Prod)
To cleanly delete all ephemeral dev/test resources:
```bash
# 1. Empty the S3 Evidence Bucket (CloudFormation cannot delete non-empty buckets)
aws s3 rm s3://batchguard-evidence-vault-dev-<account-id> --recursive

# 2. Delete the CloudFormation stack
sam delete --stack-name batchguard-stack-dev --no-prompts
```

---

## 7. Security & Regulatory Compliance Notice

> [!IMPORTANT]
> In accordance with `AGENTS.md` Directives, BatchGuard provides traceability frameworks and FSMA 204 alignment tools. Never claim that the application provides verified regulatory compliance (e.g. FSMA 204 or GS1 certification) unless independently audited and established.
