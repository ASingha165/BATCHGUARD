# BatchGuard — AWS Weekend Challenge Submission Package Index

> **Challenge:** AWS Weekend Challenge — *No Pipeline, No Problem*  
> **Platform:** AWS Builder Center (`builder.aws.com`)  
> **Submission Window:** November 13, 2026, 12:00 AM PST – November 16, 2026, 1:00 PM PST  
> **Target Repository:** `https://github.com/ASingha165/BATCHGUARD`  
> **Live Demo:** `https://batchguard-pi.vercel.app/dashboard`  

---

## 1. Submission Package Master Index

| Artifact ID | Artifact Name & Description | Path / Location | Format | Verification Status | Action Required During Window |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SUB-01** | **Submission Article Draft**<br>Comprehensive 1,250-word technical submission article structured for AWS Builder Center with transparent backend disclosures | `docs/BUILDER_CENTER_ARTICLE_DRAFT.md` | Markdown | **VERIFIED & READY** | Copy into Builder Center article editor and publish |
| **SUB-02** | **Challenge Rules & Compliance Verification**<br>Official rules audit against AWS Builder Center challenge guidelines with verified vs. unverified classification | `docs/CHALLENGE_RULES_VERIFICATION.md` | Markdown | **VERIFIED & READY** | Reference during article submission |
| **SUB-03** | **Product Interaction Preview (Silent)**<br>47.04-second 720p VP9 product preview showing core UI flows and simulation mode | `docs/evidence/video/batchguard-demo-walkthrough.webm` | WebM (8.65 MB) | **VERIFIED (VP9 720p)** | Embed into article or link via YouTube/Vimeo |
| **SUB-04** | **Video Quality Assurance Report**<br>Detailed technical inspection of video streams, keyframes, audio status, and UI elements | `docs/VIDEO_QA_REPORT.md` | Markdown | **VERIFIED & READY** | For reviewer and documentation reference |
| **SUB-05** | **Video Keyframes (5x)**<br>Extracted representative video frames demonstrating key product workflows | `docs/evidence/video/frames/` | PNG Images | **VERIFIED & READY** | Embed as visual figures in article if needed |
| **SUB-06** | **Final Video Production Plan**<br>Narration script, caption tracks, and production runbook for the planned full walkthrough | `docs/FINAL_VIDEO_PRODUCTION_PLAN.md` | Markdown | **VERIFIED & READY** | Optional: Record voiceover using the provided script |
| **SUB-07** | **Final Submission Checklist**<br>Step-by-step pre-flight checklist for the submission window | `docs/FINAL_SUBMISSION_CHECKLIST.md` | Markdown | **VERIFIED & READY** | Execute step-by-step between Nov 13 and Nov 16 |
| **SUB-08** | **AWS Deployment Runbook**<br>Turnkey deployment guide for provisioning all 48 resources into unconstrained AWS accounts | `docs/AWS_DEPLOYMENT_RUNBOOK.md` | Markdown | **VERIFIED & READY** | Run if an unconstrained AWS account is provisioned |
| **SUB-09** | **GitHub Publication Review**<br>Security, credentials, asset sizing, and link audit for GitHub publication | `docs/GITHUB_PUBLICATION_REVIEW.md` | Markdown | **VERIFIED & READY** | Sign-off artifact for repository publication |
| **SUB-10** | **Live Frontend Deployment**<br>Production-deployed React application with full DEMO MODE capabilities | `https://batchguard-pi.vercel.app` | Web Application | **VERIFIED LIVE (32/32 tests passing)** | Primary live demonstration link in submission |
| **SUB-11** | **Infrastructure as Code (SAM Template)**<br>Complete AWS SAM template defining 48 resources, 20 Lambdas (7 API, 13 workers), DynamoDB, SFN, S3 (`AES-256`), SNS | `template.yaml` | YAML | **VERIFIED (SAM lint clean)** | Source code reference in article |
| **SUB-12** | **Full Architecture Documentation**<br>Deep-dive serverless architecture and sequence specifications | `docs/architecture.md` | Markdown | **VERIFIED & READY** | Referenced in submission article |
| **SUB-13** | **Single-Table DynamoDB Schema**<br>Complete entity model and query access patterns | `docs/database-schema.md` | Markdown | **VERIFIED & READY** | Referenced in submission article |
| **SUB-14** | **Video Capture Playwright Script**<br>Automated browser automation script used to record the walkthrough | `frontend/scripts/record-demo-video.mjs` | Node.js / Playwright | **VERIFIED & READY** | Tooling in repository |

---

## 2. Summary of Verification Status

* **Frontend:** 
  * Vitest unit tests: **21/21 passed**
  * Playwright production tests: **32/32 passed**
  * Typecheck: **Clean (0 errors)**
* **Backend:**
  * Pytest unit & integration tests: **108/108 passed**
* **Infrastructure:**
  * AWS SAM Template validation: **Passed (`sam validate --lint`)**
  * Defined Resources: **48 CloudFormation resources**
  * Defined Lambdas: **20 functions (7 REST API handlers + 13 Step Functions task workers)**
  * Defined API Routes: **29 REST routes**
  * S3 Vault Encryption: **SSE-S3 (`AES-256`)**
* **Documentation & Media:**
  * Product Preview Video duration: **47.04 seconds** (Silent interaction preview)
  * Video size: **8.65 MB** (Limit: 100 MB)
  * Article word count: **~1,250 words** (Requirement: 1,000–1,400 words)
  * Credential exposure: **0 secrets detected**

---

## 3. Submission Window Execution Instructions (Nov 13–16, 2026)

When the submission window opens on **November 13, 2026, at 12:00 AM PST**:

1. **Log in to AWS Builder Center:** Navigate to [builder.aws.com](https://builder.aws.com).
2. **Access Challenge Page:** Open the *Weekend Challenge — No Pipeline, No Problem* challenge page.
3. **Create New Submission Article:**
   * Title: `BatchGuard: Serverless Product Recall Intelligence Without a Pipeline`
   * Body: Copy content from `docs/BUILDER_CENTER_ARTICLE_DRAFT.md`.
4. **Attach Demonstration Media:**
   * Embed or link the silent preview video (`docs/evidence/video/batchguard-demo-walkthrough.webm`) or an external link (YouTube/Vimeo).
5. **Add Mandatory URLs:**
   * Live Demo: `https://batchguard-pi.vercel.app/dashboard`
   * Repository: `https://github.com/ASingha165/BATCHGUARD`
6. **Submit Before Deadline:** Ensure article is published before **November 16, 2026, 1:00 PM PST**.
