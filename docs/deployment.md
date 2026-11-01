# BatchGuard AWS Deployment Runbook

## 1. Overview & Deployment Strategy

BatchGuard is packaged and provisioned using **AWS Serverless Application Model (SAM)** and CloudFormation. This ensures automated, reproducible, infrastructure-as-code deployments across staging and production environments.

The deployment creates:
1. **Amazon DynamoDB:** `BatchGuard-Main-{Environment}` table with on-demand capacity and GSIs.
2. **Amazon S3:** `batchguard-evidence-vault-{Environment}-{AWS::AccountId}` encrypted object store.
3. **Amazon SNS:** `batchguard-recall-notifications-{Environment}` fan-out topic.
4. **AWS Step Functions:** `BatchGuardRecallOrchestrator-{Environment}` state machine.
5. **AWS Lambda:** Granular Python 3.12 microservices with least-privilege IAM roles.
6. **Amazon API Gateway:** REST API with CORS and schema validation.

---

## 2. Prerequisites & Environment Setup

* **AWS CLI:** Version 2.x installed and configured (`aws sts get-caller-identity` returns valid credentials).
* **AWS SAM CLI:** Version 1.100+ installed (`sam --version`).
* **Python:** 3.12 runtime installed.
* **Node.js:** 20+ LTS and npm 10+ installed.

### Verification of AWS Credentials
```bash
aws sts get-caller-identity
```

---

## 3. Deployment Steps (Backend & Infrastructure)

### Step 3.1 — Validate SAM Specification
```bash
sam validate --lint
```

### Step 3.2 — Build Serverless Artifacts
```bash
sam build --use-container
```
*(If Docker is not installed locally, run `sam build` directly on a system with Python 3.12).*

### Step 3.3 — Guided Deployment
For the initial deployment to create the CloudFormation stack:
```bash
sam deploy --guided
```

Provide the requested configuration prompts:
* **Stack Name:** `batchguard-stack-dev`
* **AWS Region:** `us-east-1` (or desired region)
* **Parameter Environment:** `dev`
* **Confirm changes before deploy:** `Y`
* **Allow SAM CLI IAM role creation:** `Y`
* **Disable rollback on failure:** `N`
* **Save arguments to configuration file:** `Y` (writes to `samconfig.toml`)

### Step 3.4 — Capture Stack Outputs
Upon completion, the SAM CLI outputs the operational endpoints:
```
Key: ApiGatewayEndpoint
Value: https://abcdef1234.execute-api.us-east-1.amazonaws.com/Prod/v1

Key: EvidenceVaultBucketName
Value: batchguard-evidence-vault-dev-123456789012

Key: RecallTopicArn
Value: arn:aws:sns:us-east-1:123456789012:batchguard-recall-notifications-dev

Key: StepFunctionsArn
Value: arn:aws:states:us-east-1:123456789012:stateMachine:BatchGuardRecallOrchestrator-dev
```

---

## 4. Frontend Deployment

### Step 4.1 — Configure Frontend Environment
In `frontend/.env.production`:
```env
VITE_API_BASE_URL=https://abcdef1234.execute-api.us-east-1.amazonaws.com/Prod/v1
VITE_AWS_REGION=us-east-1
VITE_APP_ENV=production
```

### Step 4.2 — Build Production Bundle
```bash
cd frontend
npm run build
```
This produces optimized production assets in `frontend/dist/`.

### Step 4.3 — Hosting Options
* **Option A: S3 + CloudFront CDN (Standard Serverless)**
  ```bash
  aws s3 sync dist/ s3://batchguard-frontend-dev-123456789012/ --delete
  aws cloudfront create-invalidation --distribution-id E1234567890 --paths "/*"
  ```
* **Option B: AWS Amplify Hosting**
  Connect the GitHub repository `https://github.com/ASingha165/BATCHGUARD.git` to AWS Amplify Console for automated Git branch deploys.

---

## 5. Security & Post-Deployment Checklist

1. [ ] Confirm S3 Evidence Vault has **Block Public Access** enabled.
2. [ ] Verify DynamoDB table has **Point-in-Time Recovery (PITR)** active.
3. [ ] Verify CloudWatch log groups are created with 30-day retention policies.
4. [ ] Subscribe emergency email/SMS to the SNS Recall Topic and confirm subscription.
5. [ ] Execute smoke test: Trigger `/v1/overview/summary` via curl or Postman.
6. [ ] Confirm no secrets or `.env` files are tracked in Git.

