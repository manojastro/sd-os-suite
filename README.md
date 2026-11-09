# SD OS Suite

An offline-first service desk workspace delivered as a self-contained HTML file. **The redesign is incomplete:** the supported features and the material gaps are listed below. Do not rely on it as a complete replacement for the original suite yet.

## Run and build

Open `SD_OS_Suite.html` in a modern browser. No server, account, or network connection is needed for local features. Alternatively, run `node server.js` and open `http://127.0.0.1:3456/`. The server binds to loopback only. Build with `npm run build`; `build/assemble.js` embeds the `src/` modules, styles, and local SheetJS library in the standalone file. Legacy modules in `build/` are retained for reference and are not bundled.

Data is stored in IndexedDB for the browser and origin that created it. A `file:` URL and the local server have separate storage, as do different browsers and hosted origins. If IndexedDB is unavailable, the app warns that changes are session-only. Concurrent writes use revision checks; reload before applying a stale change. The app copies old `SD_OS_v2_` data into an unverified snapshot without deleting it; old tasks can be reviewed individually, and the complete snapshot can be downloaded. Legacy records are excluded from current metrics until reviewed or imported.

## Current features

- CSV/XLS/XLSX import with sheet selection, column mapping, validation, preview, append/upsert/replace, error reports, source rows and provenance. Blank templates are downloadable in Settings. Imports and restores are committed in IndexedDB transactions.
- Ticket volume, resolution, SLA and operational-day same-day resolution with exclusions; daily volumes, matched date windows and imported-baseline reconciliation and previewed transfers to performance inputs. Team and date filters apply to Operations overview and trends; reconciliation uses its baseline periods across all data.
- Rule-based audit keyword flags for human review, exact evidence offsets, manual criterion scoring, reviewer overrides and linked review tasks. Unsupported quality criteria are **not assessed**; no transcription is provided.
- Roster and leave drafts, validation against saved rest and workday policies, planning estimates using voice Erlang C and chat/throughput workload models, and CSV export. Model assumptions and planned headcount are displayed.
- Task creation, assignment, editing, board and table views, subtasks, dependencies, completion, reopening and archival; employee entry and imported directory data; 25-metric performance scoring for complete inputs, tied ranks, breakdowns, and versioned editable rubric rules.
- Versioned JSON backup/restore with a pre-restore snapshot, grouped search, light/dark themes and an assistant panel.

The local assistant accepts `help`, `tickets`, `search employees|tickets|tasks|audits|roster|demand|performance|baselines <text>`, `create task <title>`, `complete task <ID>`, `reopen task <ID>`, `assign task <ID> to <employee ID>`, `set task <ID> priority <priority>`, `set task <ID> due <YYYY-MM-DD>`, `open <page>`, `import data`, `export backup`, `validate roster`, `audit <transcript>`, and `undo`. It declines unsupported commands. Reads use the same calculations as the interface. Undo is available for the most recent assistant task mutation until another change.

## Optional OpenRouter provider

Settings accepts an OpenAI-compatible base endpoint (default `https://openrouter.ai/api/v1`), model, and a key held in page memory only. The key is not saved in preferences or backups and must be re-entered after reload. External AI requires both enablement and explicit consent; messages and bounded tool results can leave the browser for the configured provider. The connection test performs a real request and reports errors. External provider tool access is currently read-only; use local commands or the UI for writes. A provider or browser may reject direct requests due to CORS. No live provider call has been verified without credentials.

## Verification

Run `npm test` for focused domain, import, audit, roster, performance, reconciliation and provider-contract tests. Run `npm ci`, then `npm run test:browser-storage`, `npm run test:browser`, and `npm run test:browser-fallback` for Chromium tests. Set `CHROMIUM_PATH` if Chromium is not at `/snap/bin/chromium`. The browser tests use isolated profiles and a dedicated storage-test database. Set `TEST_URL=http://127.0.0.1:3456/` for the workspace test against local-server mode; otherwise it tests the standalone file. These tests are not a complete acceptance suite.

## Known gaps

The complete specification in `prompt` is not yet met. Notable missing work includes comprehensive assistant tool coverage, broader roster optimization and planning, more complete import mapping and large-file handling, richer audit rubrics and configurable fatal rules, advanced anomaly detection and complete source-coverage checks, benchmark workbook validation, comprehensive directory membership conflict review, and the full required accessibility and cross-browser acceptance suite. The optional provider is limited to bounded read-only tools, and it has not been tested with a live key. The application should not be described as fully tested or production-ready.

For SDR comparisons using local timestamps without offsets, the app supports UTC and Asia/Kolkata; other time zones require offset-qualified timestamps to avoid ambiguous daylight-saving times. Roster validation uses local wall times and does not resolve daylight-saving transitions. This is a single-user local workspace; multi-user authorization requires a trusted backend.
