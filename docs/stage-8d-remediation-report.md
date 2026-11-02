# Stage 8D — Deployment Blocker Remediation Report

**Date:** 2026-11-03  
**Repository:** `https://github.com/ASingha165/BATCHGUARD.git`  
**Workspace:** `D:\BatchGuard`  
**Base Commit:** [`75727c7`](file:///d:/BatchGuard)  
**Lead Engineer:** Senior AWS Solutions Architect & Full-Stack Security Engineer  
**Status:** **ALL BLOCKERS RESOLVED (READY FOR CREDENTIAL CONFIGURATION & DEPLOYMENT)**

---

## 1. Changes Implemented

| Area | Issue Identified in 8C | Remediation Applied in 8D | Verification Status |
| :--- | :--- | :--- | :--- |
| **Cognito User Pool Client** | Missing `USER_PASSWORD_AUTH` flow for SPA login | Added `- ALLOW_USER_PASSWORD_AUTH` to `BatchGuardUserPoolClient.ExplicitAuthFlows` in `template.yaml`. | Verified via SAM validate & test suite |
| **Frontend Authentication** | Missing token acquisition, lifecycle management, and Cognito wiring | Implemented `frontend/src/services/auth.ts`: standard Cognito `InitiateAuth` (`USER_PASSWORD_AUTH` & `REFRESH_TOKEN_AUTH`), token storage, automatic proactive refresh (60s pre-expiry), Base64URL JWT decoder, and safe local development session fallback. | Verified via Node test suite & frontend build |
| **API Client Integration** | `api.ts` sent no `Authorization` header and had no 401 interceptor | Updated `frontend/src/services/api.ts` to attach `Authorization: Bearer <idToken>` and `X-Organization-Id` on all outbound requests, and handle 401s with automatic single-retry token refresh and session expiration notification. | Verified via regression test suite |
| **UI Integration** | UI had static placeholder for user profile | Updated `frontend/src/components/layout/Header.tsx` to subscribe to auth state changes, display dynamic initials/user details, provide profile popover, and include enterprise Cognito login modal. | Verified via TypeScript check & Vite build |
| **API URL Contract** | Ambiguity between stage URL and `/v1` root risk of `/v1/v1` routing | Implemented `buildApiUrl` in `frontend/src/services/api.ts` with strict deduplication rules, guaranteeing `/v1/v1` is never generated regardless of whether `VITE_API_BASE_URL` contains the stage root or `/v1`. Added `ApiGatewayStageUrl` export to `template.yaml`. | Verified with 5 dedicated URL contract tests |
| **CloudWatch Log Retention** | Log groups were unmanaged and defaulted to infinite retention (`Never Expire`) | Added 20 explicit `AWS::Logs::LogGroup` resources to `template.yaml` (one per Lambda function) with `RetentionInDays: 30`, bound to `!Sub "/aws/lambda/${FunctionName}"`. | Verified via `sam validate --lint` and pytest |
| **Cost Assessment** | Overly optimistic $0.00 assumptions failed to distinguish Free Tier types | Updated `docs/stage-8c-aws-deployment-readiness-report.md` Section 7 with rigorous breakdown of Always Free, 12-Month Free Tier expiration, paid PITR ($0.20/GB-month), and S3 versioning storage implications. | Verified against AWS pricing documentation |

---

## 2. Authentication Architecture

### Production Flow (AWS Cognito):
1. **User Sign-In:** User submits email/username and password via the Header login dialog.
2. **Cognito `InitiateAuth`:** The client executes an HTTPS POST to `https://cognito-idp.${region}.amazonaws.com/` targeting `AWSCognitoIdentityProviderService.InitiateAuth` with `AuthFlow: USER_PASSWORD_AUTH` and public `ClientId`.
3. **Token Issuance:** Cognito returns `AuthenticationResult` containing `IdToken`, `AccessToken`, and `RefreshToken`.
4. **Claims Decoding:** Pure Base64URL decoder extracts identity (`sub`, `email`, `custom:org_id`, `cognito:groups`) without third-party dependencies.
5. **Secure Storage:** Tokens are persisted in `sessionStorage` with expiration timestamps.
6. **API Authorization:** Every API request through `fetchJson` retrieves `authService.getIdToken()` and injects:
   ```http
   Authorization: Bearer <IdToken>
   X-Organization-Id: <orgId>
   ```
7. **Proactive & Reactive Renewal:**
   - Proactive: If `Date.now() >= expiresAt - 60000`, client triggers `REFRESH_TOKEN_AUTH` before the outbound API request.
   - Reactive: If a request receives `401 Unauthorized`, client attempts a one-time token refresh and retries the request. If refresh fails, session is cleared and the login modal is displayed.

### Safe Development Fallback:
If `VITE_COGNITO_USER_POOL_ID` is unconfigured (e.g. initial offline setup), `authService` establishes a local development session for `Sarah Chen (Compliance Officer)` with `ORG#apex-foods-north-america`. In production builds (`import.meta.env.PROD === true`), this fallback is strictly disabled.

---

## 3. API URL Contract & Route Generation

### Canonical Rule:
```typescript
export function buildApiUrl(baseUrl: string, endpoint: string): string
```

1. **Stage Root Convention:** `VITE_API_BASE_URL` is canonically configured to the API Gateway Stage URL:
   `https://${BatchGuardApi}.execute-api.us-east-1.amazonaws.com/dev`
2. **Auto-Deduplication:** If a developer supplies a URL already ending in `/v1` (e.g. `https://.../dev/v1`), the function detects the trailing `/v1` and strips any redundant prefix from `endpoint`, guaranteeing `/v1/v1` is never constructed.
3. **Empty Base Handling:** If `VITE_API_BASE_URL` is empty (local proxy mode), returns clean relative path `/v1${endpoint}`.

---

## 4. CloudWatch Retention Configuration (20 Functions)

All 20 Lambda functions in `template.yaml` have an explicit companion `AWS::Logs::LogGroup` resource:

```yaml
  BatchFunctionLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub "/aws/lambda/${BatchFunction}"
      RetentionInDays: 30
```

* **Resource Count:** Exactly 20 LogGroups.
* **Retention Window:** 30 days.
* **CloudFormation Ownership:** Managed directly by the SAM stack; deleted upon stack tear-down.
* **Cost Risk Elimination:** Eliminates unbounded storage accumulation from default infinite retention.

---

## 5. Corrected Cost Assumptions

* **Free Tier Differentiation:** Delineated Always Free Tier (Lambda 1M calls, DynamoDB 25GB, SNS 1M publishes, Cognito 50k MAUs) from 12-Month Free Tier (API Gateway 1M requests, S3 5GB). Mature accounts (>12 months) pay $3.50/1M calls and $0.023/GB-month.
* **DynamoDB PITR:** Billed at $0.20/GB-month continuously with no free tier. On development data (<5 MB), this represents <$0.001/month, but is accurately classified as a paid continuous backup feature.
* **S3 Versioning Overhead:** Versioning on `EvidenceVaultBucket` retains historical object versions upon update/deletion. Governed by 30-day non-current version expiration lifecycle rule.

---

## 6. Testing & Validation Results

### Backend Pytest Suite:
```text
python -m pytest backend/tests/ -v
============================= 107 passed in 3.10s =============================
```
- Includes 7 new unit tests in `test_deployment_remediation.py` validating CloudWatch LogGroup retention across all 20 functions, Cognito User Pool Client explicit flows, output exports, production unauthenticated rejection (401), Cognito claims extraction, cross-tenant isolation (403), and RBAC enforcement.

### Frontend URL Contract & JWT Tests:
```text
node --test frontend/test/auth_and_url.test.mjs
✔ API URL Contract - stage URL without /v1 appends /v1 cleanly
✔ API URL Contract - base URL already containing /v1 does not produce /v1/v1
✔ API URL Contract - endpoint starting with /v1 does not produce /v1/v1 with /v1 base
✔ API URL Contract - trailing slashes on base are handled gracefully
✔ API URL Contract - empty base defaults to /v1 relative path
✔ Cognito JWT Payload Decoder - extracts claims correctly
✔ Cognito JWT Payload Decoder - handles invalid tokens safely
ℹ tests 7 | pass 7 | fail 0
```

### Build & Syntax Verification:
* **Python Compilation:** `python -m compileall backend/` -> 0 errors.
* **Frontend TypeScript:** `npm --prefix frontend run typecheck` -> 0 errors.
* **Frontend Production Build:** `npm --prefix frontend run build` -> clean bundle in `dist/`.
* **AWS SAM Lint:** `sam validate --lint` -> `D:\BatchGuard\template.yaml is a valid SAM Template` (0 errors, 0 warnings).
* **AWS SAM Build:** `sam build` -> Build Succeeded, 20 functions compiled for `python3.12` / `arm64`.

---

## 7. Remaining Blockers

* **AWS IAM Credentials:** The local environment requires authenticated credentials (`aws sts get-caller-identity`). This remains the single external prerequisite before deployment execution.

---

## 8. Confirmation of Strict Boundaries

* **No AWS resources were created, modified, or deleted.**
* **No CloudFormation stacks were deployed or changed.**
* **No credentials were configured or logged.**
* **No Git pushes were executed.**
