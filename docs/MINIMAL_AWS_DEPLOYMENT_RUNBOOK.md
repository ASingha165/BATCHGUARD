# BatchGuard — Minimal AWS Serverless Deployment Runbook (MVP)

> [!WARNING]
> **Technical Procedure — Requires Explicit User Approval Before Execution:**  
> This runbook defines the exact step-by-step operating procedure for deploying the **Minimal AWS BatchGuard MVP** into an **authorized, unrestricted AWS account**.  
> **Do not execute these commands in corporate accounts subject to AWS Organizations SCP `p-ifuj16mo` (`316636858874` / `514903005325`).**  
> All deployment steps require explicit human confirmation.

---

## 1. Authorized AWS Account Prerequisites

Before executing deployment:
1. **Target Account Independence:** An active, standalone personal AWS account (e.g. AWS Free Tier) that is **not** a member of restricted AWS Organization `o-s7r0hf99yn`.
2. **Local Tooling Installed:**
   * AWS CLI v2 (`aws --version` >= 2.15)
   * AWS SAM CLI (`sam --version` >= 1.115)
   * Python 3.12 with `pip`
   * Node.js v20+ and npm
3. **No Existing Billing Commitments:** Verify that no provisioned instances or high-cost services are active in the target account.

---

## 2. Step 1 — Account Identity Verification

Confirm that your active shell session targets the intended standalone account and profile:

```powershell
# Verify active identity and account ID
aws sts get-caller-identity --profile <authorized-profile>

# Confirm output matches your personal, unconstrained account ID:
# {
#     "UserId": "AIDA...",
#     "Account": "<your-authorized-account-id>",
#     "Arn": "arn:aws:iam::<your-authorized-account-id>:user/<your-username>"
# }
```

> [!CAUTION]
> If the reported Account ID is `316636858874` or `514903005325`, **STOP IMMEDIATELY**. Do not proceed.

---

## 3. Step 2 — Local SAM Build & Validation

Validate the minimal SAM template and compile the Python Lambda dependencies:

```powershell
# 1. Validate SAM syntax and CloudFormation linting
sam validate -t template.minimal.yaml --lint

# 2. Build Lambda packages locally
sam build -t template.minimal.yaml --parallel
```

Expected output:
```text
D:\BatchGuard\template.minimal.yaml is a valid SAM Template
Build Succeeded
Built Artifacts  : .aws-sam\build
Valid SAM Template : .aws-sam\build\template.yaml
```

---

## 4. Step 3 — Deployment Commands (Windows PowerShell)

Execute guided deployment to provision the 17 minimal serverless resources:

```powershell
# Execute guided SAM deployment
sam deploy --guided `
  --template-file .aws-sam/build/template.yaml `
  --stack-name BatchGuard-Minimal-dev `
  --profile <authorized-profile> `
  --region us-east-1 `
  --parameter-overrides Environment=dev LogLevel=INFO CorsAllowOrigin="https://batchguard-pi.vercel.app" `
  --capabilities CAPABILITY_IAM
```

### Guided Prompts & Expected Inputs:
* **Stack Name:** `BatchGuard-Minimal-dev`
* **AWS Region:** `us-east-1`
* **Parameter Environment:** `dev`
* **Parameter LogLevel:** `INFO`
* **Parameter CorsAllowOrigin:** `https://batchguard-pi.vercel.app`
* **Confirm changes before deploy:** `Y`
* **Allow SAM CLI IAM role creation:** `Y`
* **Disable rollback:** `N` (keep rollback enabled for safety)
* **Save arguments to configuration file:** `Y` (saves to `samconfig.toml`)

---

## 5. Step 4 — Capture Deployment Outputs

Upon successful deployment, CloudFormation displays stack outputs:

```text
CloudFormation outputs from deployed stack:
-------------------------------------------------------------------------------------------------------------------------------------------------
Outputs
-------------------------------------------------------------------------------------------------------------------------------------------------
Key                 ApiBaseUrl
Description         Base URL for BatchGuard Minimal REST API Gateway endpoints
Value               https://<api-id>.execute-api.us-east-1.amazonaws.com/dev/v1

Key                 DynamoDbTableName
Description         DynamoDB Single-Table Persistence Engine
Value               BatchGuard-Minimal-dev

Key                 StateMachineArn
Description         Step Functions Minimal Recall Orchestrator State Machine ARN
Value               arn:aws:states:us-east-1:<account-id>:stateMachine:BatchGuard-Minimal-RecallOrchestrator-dev
-------------------------------------------------------------------------------------------------------------------------------------------------
```

Note the `ApiBaseUrl` value for subsequent smoke testing and frontend integration.

---

## 6. Step 5 — API Smoke Tests

Verify the live endpoints using PowerShell curl / Invoke-RestMethod:

```powershell
$API_BASE = "https://<api-id>.execute-api.us-east-1.amazonaws.com/dev/v1"

# 1. Register a test production batch (POST /v1/batches)
$batchPayload = @{
    lotNumber = "LOT-LIVE-AWS-001"
    gtin = "00850012345001"
    productName = "Organic Baby Spinach 16oz"
    initialQuantity = 500
    unitOfMeasure = "CASES"
    supplierId = "SUP-SALINAS-01"
    facilityGln = "0850012000018"
    harvestDate = "2026-11-01T08:00:00Z"
    productionDate = "2026-11-02T10:00:00Z"
    expirationDate = "2026-11-20T23:59:59Z"
} | ConvertTo-Json

$batchRes = Invoke-RestMethod -Uri "$API_BASE/batches" -Method Post -Body $batchPayload -ContentType "application/json"
$batchId = $batchRes.data.batchId
Write-Host "Created Batch ID: $batchId"

# 2. Retrieve the created batch (GET /v1/batches/{id})
$getBatch = Invoke-RestMethod -Uri "$API_BASE/batches/$batchId" -Method Get
Write-Host "Fetched Batch Lot: $($getBatch.data.lotNumber)"

# 3. Initiate targeted recall (POST /v1/recalls)
$recallPayload = @{
    batchId = $batchId
    hazardClass = "CLASS_I_CRITICAL"
    reason = "Suspected Salmonella enterica contamination detected in packaging"
    confirmationPhrase = "CONFIRM-RECALL-$batchId"
    auth2FAToken = "123456"
} | ConvertTo-Json

$recallRes = Invoke-RestMethod -Uri "$API_BASE/recalls" -Method Post -Body $recallPayload -ContentType "application/json"
$recallId = $recallRes.data.recallId
Write-Host "Initiated Recall ID: $recallId"

# 4. Inspect recall status (GET /v1/recalls/{id})
$getStatus = Invoke-RestMethod -Uri "$API_BASE/recalls/$recallId" -Method Get
Write-Host "Current Recall Status: $($getStatus.data.status)"
```

---

## 7. Step 6 — Frontend Integration (Vercel)

To link the deployed Vercel frontend with the live AWS backend:

1. Open your Vercel Dashboard -> Project `batchguard` -> **Settings** -> **Environment Variables**.
2. Add or update the following variables:
   * `VITE_API_BASE_URL`: `https://<api-id>.execute-api.us-east-1.amazonaws.com/dev/v1`
   * `VITE_CONNECTION_MODE`: `AWS`
   * `VITE_USE_MOCK_DATA`: `false`
3. Trigger a production redeployment in Vercel.
4. Navigate to `https://batchguard-pi.vercel.app/dashboard`.
5. Confirm the top header pill badge displays **`AWS CONNECTED (MVP)`** with a pulsing green indicator.
6. Test creating a batch and initiating a recall in the browser UI.

> [!NOTE]
> To revert to local demonstration mode at any time, simply set `VITE_CONNECTION_MODE` back to `DEMO` in Vercel and redeploy. The app immediately returns to `DEMO MODE` without data loss.

---

## 8. Step 7 — Rollback & Complete Resource Deletion

To immediately tear down all AWS resources and eliminate any lingering footprint:

```powershell
# Delete the entire CloudFormation stack and all 17 associated resources
sam delete --stack-name BatchGuard-Minimal-dev --profile <authorized-profile> --region us-east-1

# Confirm deletion prompt: Y
```

### Verification of Zero Residual Resources:
```powershell
# Confirm CloudFormation stack is deleted
aws cloudformation describe-stacks --stack-name BatchGuard-Minimal-dev --profile <authorized-profile> 2>$null

# Confirm DynamoDB table is deleted
aws dynamodb describe-table --table-name BatchGuard-Minimal-dev --profile <authorized-profile> 2>$null
```

---

## 9. Cost Monitoring & Budget Safeguards

1. **Zero-Spend Budget Alert:** Configure an AWS Budget alerting at **$0.01** total spend:
   ```powershell
   # Create a $1.00 monthly cost budget with email notification
   aws budgets create-budget `
     --account-id <authorized-account-id> `
     --profile <authorized-profile> `
     --budget file://docs/evidence/zero-spend-budget.json
   ```

2. **No Guaranteed Free Deployment Disclosure:**
   > [!IMPORTANT]
   > AWS deployment is **NOT guaranteed to be zero-cost**. Actual charges depend on account age and prior consumption:
   > * **Account-Specific Eligibility:** Accounts older than 12 months have expired introductory Free Tier allocations for API Gateway. Accounts with other running workloads may have exhausted shared Lambda/DynamoDB Free Tier allowances.
   > * **Potential Charges:** If outside Free Tier: API Gateway ($3.50/M calls), Lambda ($0.20/M requests + GB-s duration), DynamoDB ($1.25/M writes, $0.25/M reads), CloudWatch logs ($0.50/GB ingested).
   > * **Budget Alert vs Spending Cap:** AWS Budgets are **notification alerts, not hard spending caps**. An alert will NOT stop resources. You MUST execute `sam delete` immediately after evaluation to terminate resources and prevent any ongoing billing.

