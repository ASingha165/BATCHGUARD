# AWS Weekend Challenge — Rules & Submission Requirements Verification

> **Document Status:** Verified & Clarified  
> **Challenge:** AWS Weekend Challenge — *No Pipeline, No Problem*  
> **Platform:** AWS Builder Center (`builder.aws.com/challenges`)  
> **Date of Audit:** November 7, 2026  
> **Challenge Window:** November 13, 2026, 12:00 AM PST – November 16, 2026, 1:00 PM PST  

---

## 1. Executive Summary

This document audits the official challenge parameters, eligibility criteria, artifact expectations, and platform submission guidelines for the **AWS Weekend Challenge — No Pipeline, No Problem** hosted on **AWS Builder Center**.

To maintain absolute technical and competition integrity, each requirement is categorized as:
* **VERIFIED:** Directly confirmed via official AWS Builder Center platform guidelines or verified challenge documentation.
* **UNVERIFIED:** Based on community platform norms, historical challenge patterns, or general hackathon practices, but lacking an explicit, published, challenge-specific rule sheet at the time of this review.

---

## 2. Challenge Overview & Host Platform

| Parameter | Official Specification | BatchGuard Status | Verification Level |
| :--- | :--- | :--- | :--- |
| **Challenge Title** | AWS Weekend Challenge — No Pipeline, No Problem | Matched | **VERIFIED** |
| **Host Platform** | **AWS Builder Center** (`builder.aws.com`) | Matched | **VERIFIED** |
| **Challenge Window** | Nov 13, 2026, 12:00 AM PST – Nov 16, 2026, 1:00 PM PST | 72-hour window | **VERIFIED** |
| **Submission Format** | Published Builder Center Article (`builder.aws.com/articles`) | Draft prepared | **VERIFIED** |
| **Primary Links** | Public Git Repository, Live Demo URL, Demo Video | All prepared | **VERIFIED** |
| **Architecture Focus** | Serverless / Cloud-native AWS Architecture | Implemented in SAM | **VERIFIED** |

---

## 3. Detailed Rules Verification & Status Matrix

### 3.1 Eligibility & Registration
* **Builder Center Account Requirement:** Participants must publish their submission article through a registered AWS Builder Center profile.
  * *Status:* **VERIFIED**. Profile available for publication.
* **Team vs. Individual Participation:** Individual submissions and small teams are accepted under standard platform terms.
  * *Status:* **VERIFIED**. Single-author submission by `ASingha165`.

### 3.2 Pre-Existing Code & Repository Genesis Policy
* **Challenge-Specific Pre-Existing Code Rule:** Whether repositories or foundations created prior to November 13, 2026, are fully eligible, subject to point deductions, or restricted.
  * *Status:* **UNVERIFIED**. AWS Builder Center challenges generally focus on architectural quality, educational clarity, and building with AWS primitives; however, no challenge-specific terms governing pre-existing commits have been officially published.
  * *BatchGuard Posture:* Full transparency. The submission article and documentation openly disclose the pre-challenge design, local verification, and commit timeline.

### 3.3 Mandatory Live Cloud Deployment Requirement
* **Live AWS Cloud Backend Requirement:** Whether a live, publicly reachable AWS backend is mandatory for qualification, or whether an interactive client-side demo with fully implemented, tested IaC templates is acceptable.
  * *Status:* **UNVERIFIED**. The official judging rubric and disqualification thresholds have not been published. While live AWS deployments are typically preferred in judging, it is unverified whether undeployed backends are disqualified or merely scored down on execution.
  * *BatchGuard Posture:* **Transparent Disclosure**. We do not claim that our hybrid posture (live Vercel frontend in DEMO MODE + complete SAM template + 108 local pytest tests) automatically fulfills all challenge criteria. The submission explicitly states that the AWS backend is undeployed due to an AWS Organizations SCP (`p-ifuj16mo`) and provides a turnkey runbook for evaluation.

### 3.4 Video Demonstration Requirements
* **Video Duration Limit (< 3 minutes):** Standard AWS Builder Center guidelines recommend demo videos under 180 seconds.
  * *Status:* **UNVERIFIED** (challenge-specific rubric not published; follows platform convention).
* **Audio & Voiceover Requirement:** Whether human voiceover is strictly mandatory or if silent/captioned walkthroughs are accepted.
  * *Status:* **UNVERIFIED**.
  * *BatchGuard Posture:* We provide an automated 47-second **Silent Product Interaction Preview** (`docs/evidence/video/batchguard-demo-walkthrough.webm`) to demonstrate UI flows, while providing a complete spoken script and production plan in `docs/FINAL_VIDEO_PRODUCTION_PLAN.md` and `docs/DEMO_SCRIPT.md` should narrated recording be performed.

### 3.5 AI-Assisted Development Policy
* **Official AI Tooling Rules:** Whether explicit AI disclosures are mandatory in the article body.
  * *Status:* **UNVERIFIED** for this specific weekend challenge (platform broadly welcomes generative AI coding assistants like Amazon Q Developer).
  * *BatchGuard Posture:* Full attribution and disclosure provided in documentation and article draft.

---

## 4. Submission Deliverables Status

| Deliverable | Specification | File Location | Status |
| :--- | :--- | :--- | :--- |
| **1. Submission Article Draft** | ~1,250 words, 10 sections | `docs/BUILDER_CENTER_ARTICLE_DRAFT.md` | **READY FOR REVIEW** |
| **2. Public Repository** | GitHub (`ASingha165/BATCHGUARD`) | Workspace root (`main` branch) | **READY** |
| **3. Live Application URL** | Publicly accessible web link | `https://batchguard-pi.vercel.app/dashboard` | **VERIFIED LIVE (32/32 tests passing)** |
| **4. Product Preview Video** | Silent interaction preview (47.04s, 720p VP9) | `docs/evidence/video/batchguard-demo-walkthrough.webm` | **VERIFIED (8.65 MB)** |
| **5. Narrated Demo Script** | Complete spoken narration plan | `docs/FINAL_VIDEO_PRODUCTION_PLAN.md` | **DOCUMENTED** |
| **6. Infrastructure as Code** | AWS SAM template (48 resources, 20 Lambdas) | `template.yaml` | **VERIFIED (`sam validate --lint`)** |
| **7. Deployment Runbook** | Turnkey provisioning runbook | `docs/AWS_DEPLOYMENT_RUNBOOK.md` | **DOCUMENTED** |

---

## 5. Pre-Submission Action Plan During Window (Nov 13–16, 2026)

1. **Monitor Official Announcements:** Upon challenge launch on November 13, 2026, inspect the live challenge page on `builder.aws.com/challenges` to resolve all items marked **UNVERIFIED**.
2. **Review Deployment Opportunities:** If an unrestricted AWS account becomes available, deploy using `docs/AWS_DEPLOYMENT_RUNBOOK.md`.
3. **Publish Article:** Publish `docs/BUILDER_CENTER_ARTICLE_DRAFT.md` on AWS Builder Center before November 16, 2026, 1:00 PM PST.
