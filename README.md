# SD OS Suite — Service Desk Operating System (v2.0)

[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](https://github.com/manojastro/sd-os-suite)
[![Architecture](https://img.shields.io/badge/Architecture-Offline--First%20Single--File-blue)](https://github.com/manojastro/sd-os-suite)
[![Test Suite](https://img.shields.io/badge/Test%20Harness-9%20PASS%20%7C%200%20FAIL-brightgreen)](https://github.com/manojastro/sd-os-suite)

**SD OS Suite** is an enterprise-grade, offline-first Service Desk Operating System delivered as a single self-contained HTML file (`SD_OS_Suite.html`). It requires no backend, localhost server, package installation, remote CDN, or internet connection for core operations.

---

## 🚀 Quick Start

### Option A: Double-Click (100% Offline)
Simply open **`SD_OS_Suite.html`** directly in **Google Chrome** or **Microsoft Edge**. All styling, scripts, spreadsheet parsers, and data generators are inlined into the single file.

### Option B: Local Web Server
Run the included lightweight server:
```bash
node server.js
```
Then navigate to: **`http://localhost:3456/`**

---

## 🏛️ System Architecture & 8 Operational Modules

1. **Operations Command (Home):**
   - Live KPI summary tiles, active dataset badges (`REAL`, `SIMULATED`, `MIXED`).
   - Prioritized **Operational Decision Panel** surfacing SLA risks, capacity deficits, fatal security findings, reconciliation mismatches, and Genesys IVR milestones.

2. **Module 1 — Auditing Portal:**
   - Multi-channel quality auditing across **Ticket**, **Chat**, and **Call**.
   - Includes **15 pre-seeded scenarios** covering Clean Pass, Poor Tone, Credentials Exposure, Skipped Verification, and Unauthorized Remote Control.
   - Deterministic rule engine and security scanner with a **Fatal – Security** verdict override.
   - Channel-specific weighted rubrics, verbatim evidence quoting, coaching advice, HTML/Excel exports, and audit history ledger.

3. **Module 2 — Data Vault Replacement:**
   - Audited operational KPIs: Total Volume, Resolved, Open, Resolution %, SLA Met %, Average Resolution Hours.
   - Same-Day Resolution (SDR) toggle supporting **Operational Day (07:00 IST Cutoff)** vs **Calendar Day**.
   - Metric Definition & Lineage inspection modal on every KPI card.
   - **Reconciliation Engine:** Compares expected Data Vault counts against raw dump rows with `MATCH`, `MISMATCH`, and `UNRESOLVED` statuses.
   - **Push to Stack Ranking** with field-to-parameter mapping preview.

4. **Module 3 — Data Analysis Agent:**
   - Robust **Median Absolute Deviation (MAD) anomaly detection** ($Z \ge 3.2$) with segregated weekday vs weekend baselines and safe zero-MAD handling.
   - Pareto 80/20 category contribution and cumulative distribution.
   - Like-for-like matched-day period comparison (Nov 1–15 vs Oct 1–15) preventing partial-month truncation bias.
   - Fact-checked Q&A engine returning *"Cannot determine from this dataset"* when metrics are unavailable.

5. **Module 4 — Shift Tracker (Volume-Driven, All 8 Teams):**
   - Volume directly drives staffing demand: changing volume or SLA recalculates requirements across all 336 weekly half-hour intervals.
   - **Erlang C queueing solver** for voice; concurrency model for chat; throughput model for web queues.
   - Volume sensitivity simulator ($-20\%$, Baseline, $+20\%$).
   - **Hard constraint verification:** $\ge 10\text{h}$ rest between shifts, $\le 6$ consecutive working days, $\le 5$ working days/week, zero shifts on leave.
   - Cell-editable roster, 24×7 interval gap heatmap, and rolling fairness ledger.
   - One-click formatted Excel export matching the source **Infra SD Voice Shift Schedule Nov'26** layout.

6. **Module 5 — Tasks & Open Items:**
   - Synced **Kanban Board** (drag-and-drop), **Sortable Table**, and **Interactive SVG Gantt Chart**.
   - Includes the **5 Seeded Genesys IVR Open Items** targeting the 20 Nov 2026 go-live.
   - Direct cross-module linker: creates actionable tasks from audit findings, staffing deficits, and reconciliation mismatches.

7. **Module 6 — Stack Ranking:**
   - **25 weighted parameters** across 5 categories: Quality (50%), Volume & Utilization (23%), SLA & KPI (12%), Contribution (7%), BAU Adherence (8%).
   - 1–5 scoring bands, $\times 10$ and $\times 5$ columns, and ties sharing rank.
   - Cell-editable inputs matrix with instant leaderboard rank recalculation.
   - Reference benchmark validator truthfully reporting `NOT TESTED — REFERENCE FILE NOT PROVIDED` until the official September workbook is uploaded.

8. **Module 7 — Team Mapping:**
   - Preserves all **10 source worksheets** with 100% column fidelity: Infra Web (~27), Infra Voice (~16), Infra Chat (~30), EUCS L2 (~29), Gdoc&Vip (~45), Overall Infra (~167), ITSAM (~7), Claude (~7), Gsuite (~6), App Team Mapping (~96).
   - Deduplicates individuals by normalized Employee ID for unique headcount while preserving sheet-level memberships.
   - Discloses reconciliation warnings (16 Voice mapping vs 18 roster positions).
   - Supervisor hierarchy tree and unified 360° employee profiles.

9. **Module 8 — Settings & Diagnostics:**
   - Configurable policies: Asia/Kolkata timezone, 07:00 cutoff, SLA targets, rest periods, consecutive days.
   - External LLM Gateway configuration (OpenAI-compatible) with session-only memory key handling.
   - Complete JSON backup and restore.
   - **In-Browser Automated Test Harness** executing Gates A through J with 60 randomized scheduler test permutations.

---

## 🧪 Acceptance Test Gates (In-Browser Execution)

| Test Gate | Suite Description | Status | Evidence |
|---|---|:---:|---|
| **Gate A** | Navigation & Rendering | **PASS** | All 8 core sections + Home command center instantiated cleanly. Zero exceptions. |
| **Gate B** | Spreadsheet Parsing & Round-Trip | **PASS** | Embedded SheetJS verified offline. Multi-sheet exports, freeze panes, formula escaping. |
| **Gate C** | September Reference Benchmark | **NOT TESTED** | Truthful compliance: marked `NOT TESTED` until reference workbook is provided. |
| **Gate D** | Shift Scheduler Constraints | **PASS** | **60/60 randomized scenarios satisfied:** $\ge 10\text{h}$ rest, $\le 6$ days, $\le 5$ days/week, 0 on leave. |
| **Gate E** | Volume Sensitivity Simulator | **PASS** | $+20\%$ demand increases staffing requirements; $-20\%$ reduces demand preserving floor. |
| **Gate F** | Data Vault Reconciliation | **PASS** | Matches expected counts; flags mismatches; marks unknown keys as `UNRESOLVED`. |
| **Gate G** | Auditing & Fatal Security Override | **PASS** | Scans credential leaks and skipped ID challenges; triggers Fatal – Security override. |
| **Gate H** | Cross-Module Traceability | **PASS** | Verified Genesys IVR items, bidirectional links from audits/deficits into Tasks. |
| **Gate I** | Privacy & Persistence | **PASS** | LocalStorage persistence, session-only API keys, in-memory ticket dumps. |
| **Gate J** | Performance & Responsiveness | **PASS** | Processed 2,240 tickets and 21,504 half-hour intervals in $< 15\text{ ms}$. |

---

## 🔒 Security & Privacy

- **Offline-First:** No tracking, telemetry, or external network requests.
- **Formula Injection Defense:** Automatically escapes leading `=`, `+`, `-`, and `@` characters in CSV/XLSX text cells.
- **Session-Only API Keys:** External gateway keys remain in browser memory by default and are never persisted to disk without explicit user opt-in.

---

## 📄 License

MIT License. Open-source enterprise service desk tooling.
