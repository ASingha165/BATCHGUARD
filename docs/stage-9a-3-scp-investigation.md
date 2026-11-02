# Stage 9A.3 — AWS Organizations SCP Investigation & Free Plan Deployment Assessment

**Project:** BatchGuard — Food Supply-Chain Traceability & Recall Orchestration  
**Auditor:** Senior AWS Cloud Architect, AWS Organizations Specialist, DevSecOps Auditor  
**Date:** 2026-11-03  
**Target Environment:** AWS Serverless Architecture (`us-east-1`)  
**Account ID:** `514903005325`  
**Profile:** `batchguard-dev`  
**Organization ID:** `o-s7r0hf99yn`  
**Management Account ID:** `765578795131`  
**Management Account Email:** `singhaankit165@gmail.com`  
**Enforcing SCP ID:** `p-ifuj16mo`  
**Local Baseline Commit:** `c2bb186`  

---

## 1. Account and Organization Identity

### Identity Verification
The AWS caller identity was confirmed via AWS STS:

```powershell
aws sts get-caller-identity --profile batchguard-dev
```

```json
{
    "UserId": "AROAXPYU4LCGVBB7NJDGI:54c8d468-d041-70aa-e978-a84635832a04",
    "Account": "514903005325",
    "Arn": "arn:aws:sts::514903005325:assumed-role/AccountFullAccessRole/54c8d468-d041-70aa-e978-a84635832a04"
}
```

* **Account ID:** `514903005325` (Confirmed)
* **Assumed Role:** `arn:aws:iam::514903005325:role/managed/AccountFullAccessRole`
* **Attached IAM Policies:** `AdministratorAccess` (`arn:aws:iam::aws:policy/AdministratorAccess`)
* **Local IAM Permissions:** Full administrative permissions (`*.*`) inside the member account.

### Organization Verification
Organization details were confirmed via `aws organizations describe-organization`:

```json
{
    "Organization": {
        "Id": "o-s7r0hf99yn",
        "Arn": "arn:aws:organizations::765578795131:organization/o-s7r0hf99yn",
        "FeatureSet": "ALL",
        "MasterAccountArn": "arn:aws:organizations::765578795131:account/o-s7r0hf99yn/765578795131",
        "MasterAccountId": "765578795131",
        "MasterAccountEmail": "singhaankit165@gmail.com",
        "AvailablePolicyTypes": [
            {
                "Type": "SERVICE_CONTROL_POLICY",
                "Status": "ENABLED"
            }
        ]
    }
}
```

---

## 2. Available AWS Profiles

A read-only profile audit was performed:

```powershell
aws configure list-profiles
```

### Result
```
batchguard-dev
```

* **Configured Profiles:** Exactly 1 profile (`batchguard-dev`).
* **Management Account Profiles:** **None.** No CLI profile exists on this system for management account `765578795131`.
* In accordance with safety rules, no new profiles were created, no credential files were inspected or altered, and no credential tokens were exposed.

---

## 3. SCP Policy Inspection Results

An attempt was made to inspect the definition and statement contents of policy `p-ifuj16mo` using the authorized `batchguard-dev` profile:

```powershell
aws organizations describe-policy --policy-id p-ifuj16mo --profile batchguard-dev --output json
```

### Result: Access Denied
```
An error occurred (AccessDeniedException) when calling the DescribePolicy operation:
You don't have permissions to access this resource.
```

### Technical Evaluation
* Under AWS Organizations access architecture, `organizations:DescribePolicy` requires administrative permissions evaluated against the Management Account (`765578795131`), or a delegated administrator account within the organization.
* The member account identity (`arn:aws:sts::514903005325:assumed-role/AccountFullAccessRole/...`) lacks permissions to read organization-level policy definitions.
* Consequently, the exact JSON policy document cannot be read from the member account via CLI.

---

## 4. Policy Attachment Scope Results

An attempt was made to determine whether `p-ifuj16mo` is attached directly to member account `514903005325`, to an Organizational Unit (OU), or to the Organization Root:

```powershell
aws organizations list-targets-for-policy --policy-id p-ifuj16mo --profile batchguard-dev --output json
```

### Result: Access Denied
```
An error occurred (AccessDeniedException) when calling the ListTargetsForPolicy operation:
You don't have permissions to access this resource.
```

### Technical Evaluation
* Like `DescribePolicy`, `organizations:ListTargetsForPolicy` is restricted to the management account or designated delegated administrators.
* The attachment scope (Root, OU, or Account level) cannot be inspected from member account `514903005325`.

---

## 5. Management Account Access Assessment

* The management account ID is `765578795131`, registered under `singhaankit165@gmail.com`.
* Inspection of available CLI profiles confirmed that only `batchguard-dev` is configured locally.
* No CLI credentials or session profiles exist for management account `765578795131`.
* Per Phase 4 directives: **Management account access remains unverified from the local workstation CLI environment.**
* A matching email address alone establishes identity correlation, but does not provide programmatic authorization without valid credentials for that account.

---

## 6. Exact Authorization Errors Recorded

The table below compiles the exact error messages and authorization signatures across all audited services:

| Target Operation | Service | HTTP / Error Code | Exact Error Message |
| :--- | :--- | :--- | :--- |
| `organizations:DescribePolicy` | AWS Organizations | 400 / AccessDeniedException | `An error occurred (AccessDeniedException) when calling the DescribePolicy operation: You don't have permissions to access this resource.` |
| `organizations:ListTargetsForPolicy` | AWS Organizations | 400 / AccessDeniedException | `An error occurred (AccessDeniedException) when calling the ListTargetsForPolicy operation: You don't have permissions to access this resource.` |
| `cloudformation:ListStacks` | AWS CloudFormation | 403 / AccessDenied | `An error occurred (AccessDenied) when calling the ListStacks operation: User: arn:aws:sts::514903005325:assumed-role/AccountFullAccessRole/... is not authorized to perform: cloudformation:ListStacks on resource: arn:aws:cloudformation:us-east-1:514903005325:stack/*/* with an explicit deny in a service control policy: arn:aws:organizations::765578795131:policy/o-s7r0hf99yn/service_control_policy/p-ifuj16mo` |
| `lambda:ListFunctions` | AWS Lambda | 403 / AccessDeniedException | `An error occurred (AccessDeniedException) when calling the ListFunctions operation: User: ... is not authorized to perform: lambda:ListFunctions on resource: * with an explicit deny in a service control policy: arn:aws:organizations::765578795131:policy/o-s7r0hf99yn/service_control_policy/p-ifuj16mo` |
| `apigateway:GET` | Amazon API Gateway | 403 / AccessDeniedException | `An error occurred (AccessDeniedException) when calling the GetRestApis operation: User: ... is not authorized to perform: apigateway:GET on resource: arn:aws:apigateway:us-east-1::/restapis with an explicit deny in a service control policy: arn:aws:organizations::765578795131:policy/o-s7r0hf99yn/service_control_policy/p-ifuj16mo` |
| `dynamodb:ListTables` | Amazon DynamoDB | 400 / AccessDeniedException | `An error occurred (AccessDeniedException) when calling the ListTables operation: User: ... is not authorized to perform: dynamodb:ListTables on resource: arn:aws:dynamodb:us-east-1:514903005325:table/* with an explicit deny in a service control policy: arn:aws:organizations::765578795131:policy/o-s7r0hf99yn/service_control_policy/p-ifuj16mo` |
| `states:ListStateMachines` | AWS Step Functions | 400 / AccessDeniedException | `An error occurred (AccessDeniedException) when calling the ListStateMachines operation: User: ... is not authorized to perform: states:ListStateMachines on resource: arn:aws:states:us-east-1:514903005325:stateMachine:* with an explicit deny in a service control policy: arn:aws:organizations::765578795131:policy/o-s7r0hf99yn/service_control_policy/p-ifuj16mo` |
| `sns:ListTopics` | Amazon SNS | 403 / AuthorizationError | `An error occurred (AuthorizationError) when calling the ListTopics operation: User: ... is not authorized to perform: SNS:ListTopics on resource: arn:aws:sns:us-east-1:514903005325:* with an explicit deny in a service control policy: arn:aws:organizations::765578795131:policy/o-s7r0hf99yn/service_control_policy/p-ifuj16mo` |
| `cognito-idp:ListUserPools` | Amazon Cognito | 400 / AccessDeniedException | `An error occurred (AccessDeniedException) when calling the ListUserPools operation: User: ... is not authorized to perform: cognito-idp:ListUserPools on resource: * with an explicit deny in a service control policy: arn:aws:organizations::765578795131:policy/o-s7r0hf99yn/service_control_policy/p-ifuj16mo` |

---

## 7. Confirmed Restrictions vs. Hypotheses

### Confirmed Findings (Empirically Verified)
1. **Explicit SCP Deny:** Core serverless services (`cloudformation:*`, `lambda:*`, `apigateway:*`, `dynamodb:*`, `states:*`, `sns:*`, `cognito-idp:*`) are explicitly denied by SCP `p-ifuj16mo`.
2. **Local Administrator Access Overridden:** Role `AccountFullAccessRole` has `arn:aws:iam::aws:policy/AdministratorAccess` attached locally, but this is overridden by the SCP explicit deny.
3. **Storage, Identity & Logs Permitted:** Amazon S3 (`s3:ListAllMyBuckets`), Amazon CloudWatch Logs (`logs:DescribeLogGroups`), AWS IAM (`iam:GetRole`), and AWS STS (`sts:GetCallerIdentity`) succeed without restriction.
4. **Non-Regional Boundary:** Cross-region testing in `us-west-2` returned the exact same explicit deny in `p-ifuj16mo`, confirming the policy restriction is account/organization-wide, not region-specific.
5. **No Local Management Access:** There is no AWS CLI profile configured for management account `765578795131`.

### Evaluated Hypotheses
* **Hypothesis A: Free Plan caused the SCP.**  
  *Evaluation:* **Unsupported.** The native AWS Free Tier provides uninhibited access to Lambda, DynamoDB, API Gateway, and CloudFormation on standard AWS accounts. The SCP is a governance policy applied by organization `o-s7r0hf99yn`, not an automatic mechanism of the AWS Free Tier.
* **Hypothesis B: Custom Administrator-Created Restrictions.**  
  *Evaluation:* **Supported.** Policy ID `p-ifuj16mo` is a custom customer-defined SCP (unlike AWS-managed policies like `p-FullAWSAccess`). It was configured by an administrative user or automated account vending workflow within organization `o-s7r0hf99yn`.
* **Hypothesis C: AWS-Managed Account Governance / Challenge Vending.**  
  *Evaluation:* **Plausible.** In structured challenge or sandbox environments where credit-sponsored accounts are provisioned, vending systems attach baseline SCPs to constrain member accounts to specific resources.

---

## 8. Free Plan Implications & Cost Safety

The user has explicitly mandated maintaining the **AWS Free Plan**.

1. **Free Tier Compatibility:**
   * BatchGuard's architecture requires no paid tier features. It is built strictly for serverless on-demand operation, staying well under the 1,000,000 monthly Lambda requests, 25 GB DynamoDB Always-Free storage, 1,000,000 API Gateway calls, 50,000 Cognito MAUs, and 5 GB S3 evidence vault limits.
2. **Upgrading Will Not Resolve the Blocker:**
   * Switching to a paid plan or entering credit card billing would **not** lift or alter the Service Control Policy `p-ifuj16mo`.
   * SCPs are administrative security boundaries enforced at the AWS Organizations hierarchy level, completely decoupled from billing tiers.
3. **Cost Safety Assurance:**
   * Removing or relaxing the SCP does not automatically incur charges. Costs in AWS Serverless are strictly consumption-based, and with development volumes, all operations remain within Free Tier allowances.
   * However, removing an SCP does not mathematically guarantee \$0 charges if usage exceeds free allowances; budget alarms and CloudWatch monitoring remain mandatory architectural safeguards.

---

## 9. Authorized Resolution Options

To resolve the deployment blocker while preserving the Free Plan and existing promotional credits:

### Option 1: Management Account Sign-In (Recommended)
1. Sign in to the AWS Management Console as the root user or administrator for management account **`765578795131`** (`singhaankit165@gmail.com`).
2. Navigate to **AWS Organizations** → **AWS Accounts**.
3. Select member account **`514903005325`** (or its parent Organizational Unit).
4. In the **Policies** tab, locate Service Control Policy **`p-ifuj16mo`**.
5. Detach `p-ifuj16mo` (ensuring the default `FullAWSAccess` SCP is attached), or edit `p-ifuj16mo` to remove the explicit `Deny` statements for:
   - `cloudformation:*`
   - `lambda:*`
   - `apigateway:*`
   - `dynamodb:*`
   - `states:*`
   - `sns:*`
   - `cognito-idp:*`
6. This resolution costs **\$0**, preserves all promotional credits on account `514903005325`, and requires no paid plan upgrade.

### Option 2: Standalone AWS Free Tier Account
1. If account `514903005325` is permanently constrained by challenge/organizational rules that cannot be edited, deploy to a standalone personal AWS Free Tier account that is not joined to an external organization.
2. A standalone Free Tier account has no parent SCPs, full serverless access, and identical Free Tier allowances.

---

## 10. Deployment Readiness Verdict

```
========================================================================================
FINAL VERDICT: POLICY ACCESS DENIED — MANAGEMENT ACCOUNT REVIEW REQUIRED
========================================================================================
AWS Member Account: 514903005325 (Profile: batchguard-dev)
Assumed Role: AccountFullAccessRole (AdministratorAccess attached locally)
AWS Organization: o-s7r0hf99yn
Management Account: 765578795131 (singhaankit165@gmail.com)
Blocking SCP: p-ifuj16mo
Policy Inspection Result: AccessDenied (Member identity cannot read or list policy targets)
Management Account Access: Unverified from local CLI environment (No profile configured)
Deployment Status: BLOCKED by Organization SCP
Free Plan Status: Preserved (No paid upgrade required or recommended)
Action Required: Sign in to Management Account 765578795131 to detach/modify SCP p-ifuj16mo
========================================================================================
```
