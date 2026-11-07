# BatchGuard — Phase 17 Submission Asset Inventory
**Consolidated Catalog of Challenge Deliverables & Publication Status**

- **Date:** November 8, 2026
- **Challenge:** AWS Weekend Challenge — *No Pipeline, No Problem*
- **Challenge Window:** November 13–16, 2026
- **Status:** **PRE-SUBMISSION VERIFIED**

---

## 1. Primary Public Submission URLs

These URLs are live, publicly accessible, and verified for direct submission:

| Deliverable | Destination URL | Public Availability | Notes |
| :--- | :--- | :---: | :--- |
| **Public GitHub Repository** | `https://github.com/ASingha165/BATCHGUARD` | **PUBLIC (200 OK)** | Main branch, open-source repository containing all frontend, backend, IaC, and test code. |
| **Live Web Application** | `https://batchguard-pi.vercel.app/dashboard` | **PUBLIC (200 OK)** | Vercel production edge deployment operating in DEMO MODE with simulated telemetry. |

---

## 2. Submission Documentation & Content Artifacts

These markdown and media assets are committed and tracked within the repository:

| Asset | Local File Path | Repository URL / Relative Link | Current Status | Action Required at Launch |
| :--- | :--- | :--- | :---: | :--- |
| **Final Article (Publication Ready)** | `docs/BUILDER_CENTER_ARTICLE_FINAL.md` | [`docs/BUILDER_CENTER_ARTICLE_FINAL.md`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/BUILDER_CENTER_ARTICLE_FINAL.md) | **READY** | Copy content directly into AWS Builder Center article post on Nov 13. |
| **Working Article Draft** | `docs/BUILDER_CENTER_ARTICLE_DRAFT.md` | [`docs/BUILDER_CENTER_ARTICLE_DRAFT.md`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/BUILDER_CENTER_ARTICLE_DRAFT.md) | **ARCHIVED** | Retained for reference and version history. |
| **Master Narrated Video** | `docs/evidence/video/batchguard-final-narrated-demo.mp4` | [`docs/evidence/video/batchguard-final-narrated-demo.mp4`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/evidence/video/batchguard-final-narrated-demo.mp4) | **READY (8.40 MB)** | Upload to YouTube / Builder Center and embed public link in article. |
| **Voiceover Script** | `docs/evidence/video/FINAL_VOICEOVER_SCRIPT.md` | [`docs/evidence/video/FINAL_VOICEOVER_SCRIPT.md`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/evidence/video/FINAL_VOICEOVER_SCRIPT.md) | **PUBLIC** | Full 439-word narration script for accessibility compliance. |
| **Video Keyframe Catalog** | `docs/evidence/video/narrated_frames/` | [`docs/evidence/video/narrated_frames/`](https://github.com/ASingha165/BATCHGUARD/tree/main/docs/evidence/video/narrated_frames) | **PUBLIC** | 6 high-definition 1080p frames matching each narrated scene. |
| **Silent Walkthrough Preview** | `docs/evidence/video/batchguard-demo-walkthrough.webm` | [`docs/evidence/video/batchguard-demo-walkthrough.webm`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/evidence/video/batchguard-demo-walkthrough.webm) | **PUBLIC** | 47-second rapid UI interaction video (720p VP9). |

---

## 3. Technical Specifications & Architecture Artifacts

| Technical Specification | Local File Path | Repository URL / Relative Link | Scope / Metric |
| :--- | :--- | :--- | :--- |
| **AWS SAM Template** | `template.yaml` | [`template.yaml`](https://github.com/ASingha165/BATCHGUARD/blob/main/template.yaml) | 48 CloudFormation resources, 20 Lambdas, SSE-S3 AES-256 |
| **System Architecture Guide** | `docs/architecture.md` | [`docs/architecture.md`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/architecture.md) | Serverless topology, API Gateway routes, event flows |
| **Single-Table Database Schema** | `docs/database-schema.md` | [`docs/database-schema.md`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/database-schema.md) | Entity key mappings, GSIs, single-table access patterns |
| **Step Functions State Machine** | `statemachine/recall_orchestrator.asl.json` | [`statemachine/recall_orchestrator.asl.json`](https://github.com/ASingha165/BATCHGUARD/blob/main/statemachine/recall_orchestrator.asl.json) | 13-stage ASL state machine with token approval gates |
| **Deployment Runbook** | `docs/AWS_DEPLOYMENT_RUNBOOK.md` | [`docs/AWS_DEPLOYMENT_RUNBOOK.md`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/AWS_DEPLOYMENT_RUNBOOK.md) | Turnkey deployment guide for judges (`sam deploy`) |

---

## 4. Quality Assurance, Security & Audit Reports

| Report | Local File Path | Repository URL / Relative Link | Outcome |
| :--- | :--- | :--- | :--- |
| **Security & Secret Scan** | `docs/FINAL_SECURITY_AUDIT.md` | [`docs/FINAL_SECURITY_AUDIT.md`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/FINAL_SECURITY_AUDIT.md) | **100% CLEAN:** 0 authentic credentials across 104 files & 32 commits |
| **Video Quality Assurance** | `docs/FINAL_VIDEO_QA.md` | [`docs/FINAL_VIDEO_QA.md`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/FINAL_VIDEO_QA.md) | **VERIFIED:** 1080p, 00:02:51.01, AAC audio, 6 scenes, DEMO MODE visible |
| **Phase 16 Readiness Report** | `docs/PHASE16_FINAL_READINESS.md` | [`docs/PHASE16_FINAL_READINESS.md`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/PHASE16_FINAL_READINESS.md) | **VERIFIED:** 161 automated tests, transparency disclosures confirmed |
| **Phase 17 Repository Audit** | `docs/PHASE17_REPOSITORY_AUDIT.md` | [`docs/PHASE17_REPOSITORY_AUDIT.md`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/PHASE17_REPOSITORY_AUDIT.md) | **VERIFIED:** Branch clean, 200 OK links, commit lineage verified |
| **Phase 17 Official Rules Audit**| `docs/PHASE17_OFFICIAL_RULES_AUDIT.md`| [`docs/PHASE17_OFFICIAL_RULES_AUDIT.md`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/PHASE17_OFFICIAL_RULES_AUDIT.md)| **VERIFIED:** Grounded against official `community.aws` guidelines |
| **Phase 17 Live Demo Audit** | `docs/PHASE17_LIVE_DEMO_AUDIT.md` | [`docs/PHASE17_LIVE_DEMO_AUDIT.md`](https://github.com/ASingha165/BATCHGUARD/blob/main/docs/PHASE17_LIVE_DEMO_AUDIT.md) | **VERIFIED:** 9/9 routes 200 OK, 0 JS errors, DEMO MODE verified |

---

## 5. Items Requiring Action During Challenge Window (Nov 13–16, 2026)

The following items cannot be published prior to the official opening bell:
1. **Host Narrated Video:** Upload `docs/evidence/video/batchguard-final-narrated-demo.mp4` to YouTube (Public or Unlisted) or upload directly via the Builder Center editor.
2. **Publish Builder Center Article:** Create a new article on `community.aws` using `docs/BUILDER_CENTER_ARTICLE_FINAL.md`. Insert the hosted video embed and diagrams.
3. **Submit Entry:** Fill in the challenge entry form on the AWS Builder Center challenge page linking to the published article, live demo, and GitHub repository.

