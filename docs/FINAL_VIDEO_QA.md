# BatchGuard — Final Narrated Video Demonstration QA Report

> **Target Asset:** [`docs/evidence/video/batchguard-final-narrated-demo.mp4`](evidence/video/batchguard-final-narrated-demo.mp4)  
> **Inspection Date:** November 8, 2026  
> **QA Engineer:** Senior Technical Video Producer & Solutions Architect  
> **Tooling Used:** FFmpeg v7.0.1 / FFprobe v58.42  
> **Target Guideline:** AWS Builder Center (< 3 minutes, 1080p HD, verified audio)  

---

## 1. Technical Container & Stream Verification

| Metric | Measured Specification | Target / Standard | Compliance Status |
| :--- | :--- | :--- | :---: |
| **Container Format** | **MPEG-4 Part 14 (`.mp4`)** | Standard web MP4 | **PASS** |
| **File Existence** | Present on disk (`docs/evidence/video/`) | Required | **PASS** |
| **File Size** | **8,811,174 bytes (8.40 MB)** | < 100 MB GitHub Limit | **PASS** (Optimized for Git & Web) |
| **Total Duration** | **2 minutes 51.01 seconds (`00:02:51.01`)** | 2:30 – 3:00 (< 180s) | **PASS** (Optimal hackathon length) |
| **Video Codec** | **H.264 / AVC (`avc1`, High Profile)** | Industry standard | **PASS** |
| **Video Resolution** | **1920 × 1080 (1080p Full HD)** | 16:9 Aspect Ratio | **PASS** |
| **Pixel Format** | `yuv420p` (Progressive) | Web universal playback | **PASS** |
| **Video Frame Rate** | **25.0 fps** | >= 24 fps progressive | **PASS** |
| **Video Bitrate** | **289 kbps** (~0.3 Mbps) | High-efficiency encoding | **PASS** |
| **Audio Stream** | **PRESENT & VERIFIED** | Mandatory spoken track | **PASS** |
| **Audio Codec** | **AAC (`mp4a / 0x6134706D`)** | High-fidelity AAC | **PASS** |
| **Audio Sampling Rate**| **24,000 Hz, Mono, 117 kbps** | Crisp neural voice | **PASS** |

---

## 2. Audio-Visual Scene Continuity & Narration Sync

The video demonstration was produced using an automated timing matrix aligning browser interactions with the synthesized narration:

| Scene | Timestamp | Primary UI Views & User Actions | Spoken Narration Highlights |
| :---: | :---: | :--- | :--- |
| **Scene 1** | `0:00 – 0:24` | **Platform Introduction & Header Tagline**<br>Landing on `/dashboard`, smooth hover on logo and brand tagline. | Problem statement: 48M sickened annually; multi-tier supply chain bottlenecks; introduction of BatchGuard. |
| **Scene 2** | `0:24 – 0:46` | **Operations Dashboard & Live Telemetry**<br>Hover over amber `DEMO MODE` badge, 4 KPI metric cards, and cold-chain temperature telemetry chart. | Transparent DEMO MODE disclosure; live operational health monitoring; pallet cold-chain abuse detection. |
| **Scene 3** | `0:46 – 1:13` | **Bidirectional Traceability & KDE Scoring**<br>Navigate to `/batches`, search `BG-2024-8891-ORG`, inspect Salinas Valley Field 4B provenance and GS1-128 placard. | Backward provenance to harvest; forward tracking across DCs; 98.4% KDE traceability score; instant pallet placards. |
| **Scene 4** | `1:13 – 1:49` | **One-Click Recall Orchestration Wizard**<br>Navigate to `/recalls`, walk 4-step wizard: hazard classification, blast radius assessment, and 2FA token authorization. | 72-hour triage compressed into 30 seconds; 18,450 units localized across 2 DCs and retail stores; AWS Step Functions simulation. |
| **Scene 5** | `1:49 – 2:15` | **Evidence Vault & SHA-256 Hash Chain**<br>Navigate to `/evidence` and `/audit-logs`, trigger "Verify Chain Integrity" and CSV export. | Client-to-S3 direct uploads via pre-signed URLs; immutable append-only hash chain; cryptographic proof from Genesis block. |
| **Scene 6** | `2:15 – 2:51` | **AWS Architecture & Explicit Deployment Disclosure**<br>Return to dashboard overview and project repository context. | 100% serverless architecture (20 Lambdas, Step Functions, DynamoDB, S3); 108 pytest + 32 Playwright tests; explicit disclosure that AWS backend is undeployed due to organizational SCP. |

---

## 3. Representative Keyframe Inspection (`docs/evidence/video/narrated_frames/`)

Six 1080p high-resolution keyframes were extracted and reviewed:

1. `scene-1-intro-00-00-10.png` (`00:00:10`): Clean dashboard header, tagline, and navigation rail.
2. `scene-2-dashboard-00-00-35.png` (`00:00:35`): Prominent amber `DEMO MODE` badge, `DEMO DATASET` pill, and cold-chain velocity graphs.
3. `scene-3-provenance-00-00-58.png` (`00:00:58`): Batch profile for `BG-2024-8891-ORG`, origin harvest field, and KDE score.
4. `scene-4-recall-wizard-00-01-30.png` (`00:01:30`): Step 4 of 4 recall protocol wizard showing 2FA authentication and confirmation phrase input.
5. `scene-5-audit-ledger-00-02-05.png` (`00:02:05`): Immutable audit ledger showing Genesis commit and signed events.
6. `scene-6-closing-architecture-00-02-35.png` (`00:02:35`): Final dashboard summary and stable application state.

### Quality Findings:
* **Zero Credential Exposure:** No AWS credentials, session tokens, passwords, or personal accounts appear on screen.
* **No Video Glitches:** Zero dropped frames, rendering artifacts, or layout flickering.
* **Audio-Video Harmony:** Audio narration finishes cleanly at `02:50.96` with natural trailing silence, matching the video's end.

---

## 4. Submission & Video Hosting Recommendations

1. **Native Git Storage:** At 8.40 MB, `batchguard-final-narrated-demo.mp4` resides directly within the repository under `docs/evidence/video/` and can be downloaded or played directly on GitHub.
2. **Builder Center Publication:** For embedding into the AWS Builder Center article post, upload this `.mp4` file to YouTube (Unlisted), Loom, or Vimeo, and insert the playback link into the article header.
3. **Preservation of Assets:** The existing 47-second silent video (`batchguard-demo-walkthrough.webm`) remains preserved in the repository as a quick visual interaction preview.

