# BatchGuard — AWS Serverless Backend Deployment Runbook

> [!WARNING]
> **Documentation Only — Do Not Execute Without User Approval:**  
> This runbook is a technical operating procedure designed for deploying the BatchGuard serverless backend into an **authorized, unrestricted AWS account**.  
> Do not execute deployment commands in AWS Account `316636858874` while organizational Service Control Policy (SCP) `p-ifuj16mo` is active.

---

## 1. Deployment Prerequisites

Before initiating cloud deployment:
1. **AWS CLI v2:** Installed and verified (`aws --version` >= 2.15).
2. **AWS SAM CLI:** Installed and verified (`sam --version` >= 1.115).
3. **Python 3.12:** Installed with `pip` and build tools on PATH.
4. **Target Account:** An active, unrestricted AWS account where CloudFormation, Lambda, DynamoDB, API Gateway, Step Functions, S3, SNS, and Cognito creation is permitted.
5. **IAM Credentials:** Active administrator or scoped deployment credentials configured via `aws configure` or AWS IAM Identity Center.
6. **Docker (Optional):** Required only if compiling native Python C-extensions with `sam build --use-container`. BatchGuard's dependencies are pure Python and build natively without Docker.

---

## 2. Required IAM Deployment Permissions

The deploying IAM identity (user, role, or CI/CD pipeline) requires permissions across 9 AWS services:

| Service | Minimum Actions Required | Resource Scope |
| :--- | :--- | :--- |
| **CloudFormation** | `CreateStack`, `UpdateStack`, `DescribeStacks`, `DescribeStackEvents`, `GetTemplate`, `DeleteStack` | `arn:aws:cloudformation:*:*:stack/BatchGuard-*/*` |
| **AWS Lambda** | `CreateFunction`, `UpdateFunctionCode`, `UpdateFunctionConfiguration`, `DeleteFunction`, `AddPermission`, `GetFunction` | `arn:aws:lambda:*:*:function:BatchGuard-*` |
| **API Gateway** | `POST`, `GET`, `PUT`, `DELETE` on APIs, routes, integrations, and stages | `arn:aws:apigateway:*::/apis*`, `arn:aws:apigateway:*::/restapis*` |
| **DynamoDB** | `CreateTable`, `UpdateTable`, `DeleteTable`, `DescribeTable`, `TagResource` | `arn:aws:dynamodb:*:*:table/BatchGuard-*` |
| **Step Functions** | `CreateStateMachine`, `UpdateStateMachine`, `DeleteStateMachine`, `DescribeStateMachine` | `arn:aws:states:*:*:stateMachine:RecallOrchestrator*` |
| **Amazon S3** | `CreateBucket`, `PutBucketPolicy`, `PutBucketEncryption`, `PutBucketPublicAccessBlock`, `DeleteBucket` | `arn:aws:s3:::batchguard-evidence-vault-*` |
| **Amazon SNS** | `CreateTopic`, `SetTopicAttributes`, `DeleteTopic`, `Subscribe` | `arn:aws:sns:*:*:BatchGuardRecallTopic-*` |
| **Amazon Cognito** | `CreateUserPool`, `CreateUserPoolClient`, `UpdateUserPool`, `DeleteUserPool` | `arn:aws:cognito-idp:*:*:userpool/*` |
| **IAM** | `CreateRole`, `PutRolePolicy`, `AttachRolePolicy`, `PassRole`, `DeleteRole` | Scoped to `role/BatchGuard-*` and `role/aws-service-role/*` |
| **CloudWatch Logs** | `CreateLogGroup`, `PutRetentionPolicy`, `DeleteLogGroup` | `arn:aws:logs:*:*:log-group:/aws/lambda/BatchGuard-*` |

---

## 3. SAM Build & Validation Commands

Execute from workspace root `D:\BatchGuard`:

```bash
# Step 1: Validate SAM template and syntax
sam validate --lint

# Step 2: Build Python Lambda handlers and package dependencies
sam build --parallel

# Expected Output:
# Build Succeeded
# Built Artifacts  : .aws-sam/build
# Valid SAM Template : .aws-sam/build/template.yaml
```

---

## 4. Expected Infrastructure Resources (48 Resources)

Upon successful deployment, CloudFormation creates 48 managed resources:

* **1 API Ingress:** Amazon API Gateway REST API (`BatchGuardApi`) with 29 route bindings across 7 handler modules.
* **1 Database:** Amazon DynamoDB table (`BatchGuard-Main-${Environment}`) with GSI1/GSI2, PITR, and on-demand billing.
* **1 Storage Vault:** Amazon S3 bucket (`batchguard-evidence-${Environment}-${AWS::AccountId}`) with SSE-S3 (`AES-256`) encryption and blocked public access.
* **1 Storage Policy:** Amazon S3 Bucket Policy enforcing TLS HTTPS access and bucket security.
* **1 Notification Topic:** Amazon SNS topic (`RecallTopic`).
* **1 State Machine:** AWS Step Functions Standard Workflow (`RecallOrchestratorStateMachine`).
* **2 Identity Resources:** Amazon Cognito User Pool (`BatchGuardUserPool`) and Client (`BatchGuardUserPoolClient`) with TOTP MFA.
* **20 AWS Lambda Functions:**
  * 7 HTTP API handlers (`BatchFunction`, `RecallFunction`, `OverviewFunction`, `SupplierFunction`, `DistributionFunction`, `EvidenceFunction`, `AuditFunction`)
  * 13 Step Functions task workers (`ValidateRecallRequestWorker`, `CalculateBlastRadiusWorker`, `EvaluateRecallRiskWorker`, `AwaitApprovalWorker`, `CreateQuarantineTasksWorker`, `IdentifyCarrierInterceptsWorker`, `DispatchNotificationsWorker`, `TrackAcknowledgementsWorker`, `RecordAuditEntryWorker`, `FinalizeRecallWorker`, `HandleRejectionWorker`, `HandleTimeoutWorker`, `HandleFailureWorker`)
* **20 CloudWatch Log Groups:** 14-day retention per function to control log storage costs.

---

## 5. Configuration & Secret Management

* **Environment Separation:** Governed by SAM parameter `Environment` (`dev`, `staging`, `prod`).
* **No Hardcoded Secrets:** Credentials, AWS account IDs, and sensitive tokens are strictly excluded from code.
* **Cognito Configuration:** The Cognito User Pool ID and Client ID are exported from CloudFormation outputs into the frontend environment (`VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`).
* **Pre-signed S3 URLs:** Evidence file uploads are client-to-S3 direct; no IAM secret keys are exposed to the browser.

---

## 6. Deployment Commands for an Authorized Account

### Initial Guided Deployment
```bash
# Ensure target profile is configured with deployment permissions
aws sts get-caller-identity --profile <target-profile>

# Execute guided SAM deployment
sam deploy --guided \
  --profile <target-profile> \
  --region us-east-1 \
  --stack-name BatchGuard-dev \
  --parameter-overrides Environment=dev LogLevel=INFO \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```

### Subsequent CI/CD or Scripted Deployment
```bash
sam deploy \
  --profile <target-profile> \
  --region us-east-1 \
  --stack-name BatchGuard-dev \
  --parameter-overrides Environment=dev LogLevel=INFO \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --no-confirm-changeset
```

---

## 7. Post-Deployment Verification

After CloudFormation reports `CREATE_COMPLETE`:

1. **Retrieve Outputs:**
   ```bash
   aws cloudformation describe-stacks \
     --stack-name BatchGuard-dev \
     --profile <target-profile> \
     --query "Stacks[0].Outputs" \
     --output table
   ```
2. **Verify API Health:**
   ```bash
   curl -s -i "<ApiGatewayEndpoint>/overview/summary"
   # Expected: HTTP 200 OK or 401 Unauthorized (confirming API Gateway is live and routing)
   ```
3. **Verify DynamoDB Table:**
   ```bash
   aws dynamodb describe-table \
     --table-name BatchGuard-Main-dev \
     --profile <target-profile> \
     --query "Table.TableStatus"
   # Expected: "ACTIVE"
   ```
4. **Connect Frontend:**
   Update `frontend/.env.production` with the output values:
   ```env
   VITE_API_BASE_URL=<ApiGatewayEndpoint>
   VITE_COGNITO_USER_POOL_ID=<CognitoUserPoolId>
   VITE_COGNITO_CLIENT_ID=<CognitoClientId>
   VITE_FORCE_MOCK=false
   ```
   Re-deploy frontend to Vercel to switch from DEMO MODE to live cloud backend.

---

## 8. Rollback Procedures

If deployment fails during `sam deploy`:
* CloudFormation automatically initiates rollback and restores previous stack state.
* If initial stack creation fails:
  ```bash
  # Inspect failed event reasons
  aws cloudformation describe-stack-events \
    --stack-name BatchGuard-dev \
    --profile <target-profile> \
    --query "StackEvents[?ResourceStatus=='CREATE_FAILED'].{Resource:LogicalResourceId,Reason:ResourceStatusReason}" \
    --output table

  # Delete failed stack shell if stuck
  sam delete --stack-name BatchGuard-dev --profile <target-profile> --no-prompts
  ```

---

## 9. Resource Cleanup Procedures (Tear Down)

To permanently remove all cloud resources and avoid ongoing charges:

```bash
# Step 1: Empty S3 evidence bucket (CloudFormation cannot delete non-empty buckets)
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name BatchGuard-dev \
  --profile <target-profile> \
  --query "Stacks[0].Outputs[?OutputKey=='EvidenceVaultBucketName'].OutputValue" \
  --output text)

if [ -n "$BUCKET_NAME" ]; then
  aws s3 rm "s3://$BUCKET_NAME" --recursive --profile <target-profile>
fi

# Step 2: Delete entire CloudFormation stack
sam delete \
  --stack-name BatchGuard-dev \
  --profile <target-profile> \
  --region us-east-1 \
  --no-prompts
```

---

## 10. Billing and Cost-Monitoring Precautions

1. **Set Up an AWS Budget:** Create a \$10.00 monthly cost budget with email alerts at 50%, 80%, and 100% threshold.
2. **DynamoDB On-Demand:** Preserved in `template.yaml` (`BillingMode: PAY_PER_REQUEST`). Incurs zero hourly capacity charges while idle.
3. **CloudWatch Log Retention:** Explicitly set to 14 days across all 20 function log groups to prevent perpetual storage accumulation.
4. **Cognito MAU Tracking:** Free tier covers 50,000 MAUs. Avoid configuring automated SMS messaging without verifying AWS SNS per-SMS carrier rates.
5. **Step Functions Standard Workflows:** State transitions cost \$0.025 per 1,000 transitions after the first 4,000 monthly free transitions. No hourly idle charge while paused in `.waitForTaskToken`.

