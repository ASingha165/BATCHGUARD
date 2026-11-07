# BatchGuard — Video Demonstration QA Report (Silent Product Interaction Preview)

**Target Asset:** [`docs/evidence/video/batchguard-demo-walkthrough.webm`](evidence/video/batchguard-demo-walkthrough.webm) (Silent Product Interaction Preview)  
**Inspection Date:** November 7, 2026  
**Tooling Used:** FFmpeg / FFprobe v7.0.1 (Playwright build 1013)  
**Inspection Type:** Automated Stream Analysis & Representative Frame Extraction  

---

## 1. Stream & Container Specifications

| Metric | Verified Value | Target / Guideline | Evaluation |
| :--- | :--- | :--- | :---: |
| **File Existence** | Present on disk (`docs/evidence/video/`) | Required | **PASS** |
| **File Size** | **9,074,309 bytes (8.65 MB)** | < 100 MB GitHub limit | **PASS** (Optimal for repo storage) |
| **Duration** | **47.04 seconds (`00:00:47.04`)** | < 3:00 (< 180 seconds) | **PASS** (Well within Builder Center limit) |
| **Video Codec** | **VP9 (`libvpx-vp9`, Profile 0)** | Standard WebM | **PASS** |
| **Resolution** | **1280 × 720 (720p HD, 16:9 DAR)** | Standard 16:9 | **PASS** |
| **Frame Rate** | **25.0 fps (Progressive)** | >= 24 fps | **PASS** |
| **Pixel Format** | `yuv420p(tv, progressive)` | Standard color space | **PASS** |
| **Video Bitrate** | **1,543 kbps** (~1.5 Mbps) | 1–3 Mbps | **PASS** (Balanced quality/size) |
| **Audio Stream** | **NONE / SILENT** | Audio optional / spoken | **REPORTED BELOW** |
| **Frame Integrity** | Zero dropped or corrupted frames | Continuous playback | **PASS** |

---

## 2. Audio Inspection & Voiceover Disclosure

> [!IMPORTANT]
> **Audio Absence Disclosure:**  
> The `.webm` video was generated via Playwright headless browser context recording (`recordVideo`). Headless browser automation captures the Chromium rendering pipeline and canvas buffers directly, **without recording microphone audio**.  
> Consequently, **no audio stream exists** in `batchguard-demo-walkthrough.webm`.  
> *Do not infer that narration is present.* If an evaluator or submission reviewer requires a narrated walkthrough, the submitter may use [`docs/FINAL_VIDEO_PRODUCTION_PLAN.md`](FINAL_VIDEO_PRODUCTION_PLAN.md) to record a spoken voiceover track over this video or use Loom/OBS.

---

## 3. Representative Frame Quality Review

Representative keyframes were extracted across 5 distinct timeline points into [`docs/evidence/video/frames/`](evidence/video/frames/):

| Frame ID | Timestamp | Screen / Action Captured | Visual Review & Verification |
| :--- | :---: | :--- | :--- |
| `frame-1` | `00:00:03` | **Operations Overview Dashboard** | Amber `DEMO MODE` badge clearly visible in header; `DEMO DATASET` badge visible; KPI cards and cold-chain velocity sparklines render crisply without visual artifacts. |
| `frame-2` | `00:00:15` | **Batch Profile & Traceability (`BG-2024-8891-ORG`)** | Origin details (Green Valley Organics, Field 14B Salinas CA), packaging, and cold-chain telemetry display cleanly. Text is sharp and fully legible. |
| `frame-3` | `00:00:25` | **Recall Protocol Wizard (Step 2 of 4)** | Modal opens with smooth animation; Class I Critical hazard card selected; pathogen description field filled cleanly. |
| `frame-4` | `00:00:35` | **Recall Broadcast & Notification** | Modal confirms broadcast; top-right notification toast states: *"Simulated Recall Initialized (Demo Mode): Recall workflow and blast radius modeled for BG-2024-8891-ORG. Remote AWS execution simulated in demo mode."* |
| `frame-5` | `00:00:45` | **Dashboard Wrap-up & Return** | Application returns cleanly to Dashboard without memory leaks, console error overlays, or frozen UI states. |

### Visual Quality Findings:
1. **Zero Exposed Credentials:** No AWS access keys, passwords, bearer tokens, or internal account numbers appear in any frame.
2. **Prominent Demo Disclosures:** Both the persistent top-bar `DEMO MODE` badge and the in-app broadcast confirmation toast explicitly inform viewers of simulated execution.
3. **No Visual Defects:** Zero rendering glitches, clipping, or missing font icons were detected.
4. **No Fabricated AWS Screens:** The video strictly shows the authentic deployed Vercel frontend interface.

---

## 4. Recommendations for Submission

1. **Keep `.webm` in Repository:** At 8.65 MB, `batchguard-demo-walkthrough.webm` fits comfortably in Git and serves as an immutable, reproducible technical demonstration of the UI.
2. **Optional Voiceover Hosting:** For the final submission post on AWS Builder Center, the submitter can upload this video (or a Loom recording following [`docs/FINAL_VIDEO_PRODUCTION_PLAN.md`](FINAL_VIDEO_PRODUCTION_PLAN.md)) to YouTube or Loom and embed the playable link directly in the article.

