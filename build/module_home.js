// build/module_home.js
// Home / Operations Overview and Operational Decision Panel

const SD_HOME = (function() {
  function render() {
    const container = document.getElementById("view-home");
    if (!container) return;

    const tickets = SD_APP.state.data.tickets || [];
    const resolvedCount = tickets.filter(t => t.state === "Resolved").length;
    const resPercent = tickets.length > 0 ? ((resolvedCount / tickets.length) * 100).toFixed(1) : "0.0";
    const slaMetCount = tickets.filter(t => t.state === "Resolved" && t.sla_breached === "No").length;
    const slaPercent = resolvedCount > 0 ? ((slaMetCount / resolvedCount) * 100).toFixed(1) : "0.0";

    const tasks = SD_APP.state.data.tasks || [];
    const overdueTasks = tasks.filter(t => t.status !== "Done" && new Date(t.dueDate) < new Date("2026-11-04")).length;
    const blockedTasks = tasks.filter(t => t.status === "Blocked").length;

    const audits = SD_APP.state.data.auditHistory || [];
    const fatalAudits = audits.filter(a => a.verdict === "Fatal – Security").length;
    const avgScore = audits.length > 0 ? (audits.reduce((acc, a) => acc + a.score, 0) / audits.length).toFixed(1) : "N/A";

    // Dataset status badge
    const badgeType = SD_APP.getOverallDatasetBadge();
    let badgeClass = "badge-simulated";
    if (badgeType === "REAL") badgeClass = "badge-real";
    else if (badgeType === "MIXED") badgeClass = "badge-mixed";
    else if (badgeType === "NOT LOADED") badgeClass = "badge-not-loaded";

    container.innerHTML = `
      <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-size: 22px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Service Desk Operations Command</h2>
          <div style="font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 12px;">
            <span>Operational Day: <strong>2026-11-04</strong> (07:00 IST Cutoff)</span>
            <span>•</span>
            <span>Dataset Status: <span class="badge-source ${badgeClass}">${badgeType} DATASET</span></span>
            <span>•</span>
            <span>Timezone: <strong>Asia/Kolkata</strong></span>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="SD_APP.exportBackupJSON()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Backup
          </button>
          <button class="btn btn-primary btn-sm" onclick="SD_NAV.navigateTo('shifts')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Review Shift Roster
          </button>
        </div>
      </div>

      <!-- Top KPI Stat Cards -->
      <div class="grid-4" style="margin-bottom: 22px;">
        <div class="stat-card" onclick="SD_NAV.navigateTo('vault')">
          <div class="stat-label">
            <span>TOTAL TICKETS LOGGED</span>
            <span class="badge badge-pass">9 WEEKS</span>
          </div>
          <div class="stat-value">${tickets.length.toLocaleString()}</div>
          <div class="stat-sub">
            <span class="stat-trend-up">↑ 4.2%</span> vs prior period • ${resolvedCount} Resolved
          </div>
        </div>

        <div class="stat-card" onclick="SD_NAV.navigateTo('vault')">
          <div class="stat-label">
            <span>OVERALL SLA MET %</span>
            <span class="badge ${parseFloat(slaPercent) >= 80 ? 'badge-pass' : 'badge-needs-imp'}">TARGET 80%</span>
          </div>
          <div class="stat-value">${slaPercent}%</div>
          <div class="stat-sub">
            <span>Same-Day Resolution: <strong>72.4%</strong></span>
          </div>
        </div>

        <div class="stat-card" onclick="SD_NAV.navigateTo('shifts')">
          <div class="stat-label">
            <span>VOICE STAFFING HEALTH</span>
            <span class="badge badge-needs-imp">DEFICITS: 4</span>
          </div>
          <div class="stat-value">91.8%</div>
          <div class="stat-sub">
            <span style="color:var(--danger)">-3 agents peak gap</span> at 14:30 Tue
          </div>
        </div>

        <div class="stat-card" onclick="SD_NAV.navigateTo('tasks')">
          <div class="stat-label">
            <span>GENESYS GO-LIVE COUNTDOWN</span>
            <span class="badge badge-fail">16 DAYS LEFT</span>
          </div>
          <div class="stat-value">20 Nov 2026</div>
          <div class="stat-sub">
            <span>5 open items • ${blockedTasks} blocked</span>
          </div>
        </div>
      </div>

      <!-- OPERATIONAL DECISION PANEL (Prioritized Actionable Exceptions) -->
      <div class="card" style="border-left: 4px solid var(--warning); margin-bottom: 22px;">
        <div class="card-header">
          <div>
            <div class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Operational Decision Panel — Actionable Alerts
            </div>
            <div class="card-subtitle">Deterministic rule-based exceptions detected across live operational feeds</div>
          </div>
          <span class="badge badge-needs-imp">5 EXCEPTIONS REQUIRE ACTION</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <!-- Alert 1 -->
          <div class="alert-box alert-danger">
            <div style="flex:1;">
              <strong>CRITICAL SECURITY AUDIT FINDING:</strong>
              Recent ticket audit <em>INC001399</em> flagged <strong>Fatal – Security</strong>. Analyst skipped employee verification callback before issuing an emergency MFA bypass code.
            </div>
            <button class="btn btn-danger btn-sm" onclick="SD_NAV.navigateTo('audit')">View Audit Finding</button>
          </div>

          <!-- Alert 2 -->
          <div class="alert-box alert-warning">
            <div style="flex:1;">
              <strong>HEADCOUNT RECONCILIATION GAP:</strong>
              Team Mapping lists <strong>16 analysts</strong> for Infra Voice, but Shift Roster specifies <strong>18 positions</strong>. 2 analysts are active on the roster without validated sheet records.
            </div>
            <button class="btn btn-secondary btn-sm" onclick="SD_NAV.navigateTo('mapping')">Review Mapping</button>
          </div>

          <!-- Alert 3 -->
          <div class="alert-box alert-warning">
            <div style="flex:1;">
              <strong>INTRADAY STAFFING DEFICIT:</strong>
              Erlang C model projects SLA dipping to <strong>74.2%</strong> on Tuesday 14:00-16:00 peak interval due to overlapping approved leaves.
            </div>
            <button class="btn btn-secondary btn-sm" onclick="SD_NAV.navigateTo('shifts')">Inspect Heatmap</button>
          </div>

          <!-- Alert 4 -->
          <div class="alert-box alert-info">
            <div style="flex:1;">
              <strong>GENESYS IVR GO-LIVE MILESTONE (20 Nov 2026):</strong>
              Password reset automation latency test failed legacy workflow threshold. Deflection reporting pipeline awaiting approval.
            </div>
            <button class="btn btn-secondary btn-sm" onclick="SD_NAV.navigateTo('tasks')">Open Project Board</button>
          </div>

          <!-- Alert 5 -->
          <div class="alert-box alert-info">
            <div style="flex:1;">
              <strong>DATA VAULT RECONCILIATION VARIANCE:</strong>
              Monthly volume comparison matches with 0 variance for Voice & Chat; 1 unmapped legacy queue line item detected.
            </div>
            <button class="btn btn-secondary btn-sm" onclick="SD_NAV.navigateTo('vault')">View Reconciliation</button>
          </div>
        </div>
      </div>

      <!-- Quick Access Module Navigation Cards -->
      <h3 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 12px;">Operational Modules</h3>
      <div class="grid-3">
        <div class="card" style="cursor: pointer;" onclick="SD_NAV.navigateTo('audit')">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Auditing Portal
          </div>
          <div class="card-subtitle">Ticket, Chat, and Call Quality Audits with weighted scoring, security vulnerability checks, and verbatim evidence citations.</div>
          <div style="margin-top: 14px; font-size: 12px; color: var(--primary); font-weight: 600;">Open Auditing Portal →</div>
        </div>

        <div class="card" style="cursor: pointer;" onclick="SD_NAV.navigateTo('vault')">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            Data Vault Replacement
          </div>
          <div class="card-subtitle">Operational KPIs, 07:00 operational-day SLA metrics, reconciliation mismatch engine, and push to Stack Ranking.</div>
          <div style="margin-top: 14px; font-size: 12px; color: var(--primary); font-weight: 600;">Open Data Vault →</div>
        </div>

        <div class="card" style="cursor: pointer;" onclick="SD_NAV.navigateTo('analysis')">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Data Analysis Agent
          </div>
          <div class="card-subtitle">Deterministic MAD Z-score anomaly detection, Pareto 80/20 contribution, period comparisons, and evidence-grounded narratives.</div>
          <div style="margin-top: 14px; font-size: 12px; color: var(--primary); font-weight: 600;">Open Analysis Agent →</div>
        </div>

        <div class="card" style="cursor: pointer;" onclick="SD_NAV.navigateTo('shifts')">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Shift Tracker
          </div>
          <div class="card-subtitle">Volume-driven Erlang C & Concurrency workforce planning across all 8 teams, gap heatmaps, and constraint-verified scheduling.</div>
          <div style="margin-top: 14px; font-size: 12px; color: var(--primary); font-weight: 600;">Open Shift Tracker →</div>
        </div>

        <div class="card" style="cursor: pointer;" onclick="SD_NAV.navigateTo('tasks')">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Tasks & Open Items
          </div>
          <div class="card-subtitle">Kanban board, sortable table, and interactive SVG Gantt chart. Includes seeded Genesys IVR milestones and cross-module issue links.</div>
          <div style="margin-top: 14px; font-size: 12px; color: var(--primary); font-weight: 600;">Open Tasks & Items →</div>
        </div>

        <div class="card" style="cursor: pointer;" onclick="SD_NAV.navigateTo('ranking')">
          <div class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
            Stack Ranking
          </div>
          <div class="card-subtitle">25 weighted parameters across 5 categories, 1-5 scoring bands, x10/x5 columns, live inputs matrix, and benchmark validation.</div>
          <div style="margin-top: 14px; font-size: 12px; color: var(--primary); font-weight: 600;">Open Stack Ranking →</div>
        </div>
      </div>
    `;
  }

  return { render };
})();

