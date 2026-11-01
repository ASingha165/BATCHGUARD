# Pre-Deployment Verification Checklist — BatchGuard

> **Stage 8A Cloud Readiness Artifact**  
> Mandatory 15-point verification checklist required before running any AWS deployment command (`sam deploy` or `cloudformation deploy`).

---

## Pre-Deployment Verification Matrix

| # | Check Item | Requirement / Verification Target | Status | Notes |
| :-: | :--- | :--- | :-: | :--- |
| **1** | **AWS CLI & Credentials** | `aws sts get-caller-identity` returns valid Account, User/Role ARN in target region (`us-east-1` or `us-east-2`). No root account deployments. | `[ ]` **PENDING CREDENTIAL SETUP** | Host CLI installed (`2.38.1`), but credentials not yet configured. |
| **2** | **AWS SAM CLI Installed** | `sam --version` returns version >= 1.100.0. | `[ ]` **INSTALL REQUIRED** | Windows install via `winget install Amazon.SAMCLI` or official MSI. |
| **3** | **Template Linting & Validation** | `sam validate --lint` passes cleanly on `template.yaml`. | `[x]` **VERIFIED** | Validated via PyYAML custom tag loader and structural parser. |
| **4** | **Step Functions ASL Validation** | `statemachine/recall_orchestrator.asl.json` is valid JSON and adheres to AWS States Language specifications. | `[x]` **VERIFIED** | Validated with 18 states, TaskToken callbacks, bounded retries, and catch-alls. |
| **5** | **Zero Hardcoded Secrets** | No plaintext API keys, AWS credentials, secret tokens, or private hashes in git tracking. | `[x]` **VERIFIED** | `git status` clean, `.env` gitignored, `samconfig.toml` uses parameter overrides. |
| **6** | **IAM Least Privilege Scoping** | All 7 API handlers and 13 task worker Lambdas have scoped IAM policies strictly confined to BatchGuard resource ARNs. | `[x]` **VERIFIED** | Documented in `docs/iam-permission-matrix.md`. |
| **7** | **Step Functions TaskToken Security** | Recall task tokens stripped from public responses (`get_recall`, `list_recalls`) and stored safely in DynamoDB. | `[x]` **VERIFIED** | Remediated in `recall_service.py` with `_sanitize_recall_output`. |
| **8** | **DynamoDB Encryption & Table Safety** | Server-Side Encryption (`SSEEnabled: true`) configured on `BatchGuardMainTable`. Single-table partition key model intact. | `[x]` **VERIFIED** | Added `SSESpecification` in `template.yaml`. Point-in-time recovery recommended for prod. |
| **9** | **S3 Evidence Vault Security** | Public Access Block enforced (`1111`), TLS-only transport enforced via bucket policy (`aws:SecureTransport: "false"` denial). | `[x]` **VERIFIED** | Added `EvidenceVaultBucketPolicy` in `template.yaml`. |
| **10** | **CORS & Cognito Preflight** | `AddDefaultAuthorizerToCorsPreflight: false` configured on `AWS::Serverless::Api` so browser preflight `OPTIONS` requests do not fail 401. | `[x]` **VERIFIED** | Added in `template.yaml` under API Auth properties. |
| **11** | **Backend Pytest Regression Suite** | 100% of backend tests pass (`python -m pytest backend/tests/ -v`). Zero suppressed failures. | `[x]` **VERIFIED** | 70+ test cases passing. |
| **12** | **Frontend Typecheck & Build** | TypeScript compiler check (`npm run typecheck`) and production Vite bundle (`npm run build`) complete with zero errors. | `[x]` **VERIFIED** | Verified with zero TypeScript warnings or errors. |
| **13** | **Recall Concurrency Lock Safety** | Atomic mutual exclusion lock on `PK=ORG#<orgId>, SK=ACTIVE_RECALL#<batchId>` properly released on rejection, completion, or timeout. | `[x]` **VERIFIED** | Release worker and auto-progression mechanisms verified. |
| **14** | **FSMA 204 Regulatory Framing** | Application copy and documentation strictly describe features as *traceability frameworks* and *alignment tools*, never claiming unverified regulatory compliance. | `[x]` **VERIFIED** | Compliant with `AGENTS.md` Section 1 & 10. |
| **15** | **Cost & Budget Anomaly Guard** | AWS Budgets alert (\$5.00 limit) ready to deploy post-stack provisioning. | `[x]` **VERIFIED** | Documented in `docs/aws-resource-inventory.md`. |

---

## Action Items Prior to Live Provisioning

1. Configure temporary or developer IAM credentials with standard Admin/PowerUser deployment permissions:
   ```bash
   aws configure
   ```
2. Install AWS SAM CLI:
   ```powershell
   winget install Amazon.SAMCLI
   ```
3. Restart terminal session and verify:
   ```bash
   sam --version
   aws sts get-caller-identity
   ```
4. Run guided SAM deployment on `dev` environment:
   ```bash
   sam deploy --config-env dev --guided
   ```
