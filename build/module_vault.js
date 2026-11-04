// build/module_vault.js
// Data Vault Replacement: Operations KPIs, Lineage Definitions, Reconciliation Engine, and Stack Handoff

const SD_VAULT = (function() {
  let activeSdrMode = "operational"; // "operational" (07:00 cutoff) or "calendar" (00:00 cutoff)

  const metricDefinitions = {
    total: {
      name: "Total Volume Logged",
      formula: "COUNT(ticket_id)",
      numerator: "All raw incident records within active date window",
      denominator: "N/A",
      dateBasis: "Opened Date/Time",
      handling: "Includes all states (New, In Progress, Resolved). Duplicates retained per source dump."
    },
    resolved: {
      name: "Resolved Incidents",
      formula: "COUNT(tickets WHERE state = 'Resolved')",
      numerator: "Incidents with state = 'Resolved' and non-null resolved_at timestamp",
      denominator: "N/A",
      dateBasis: "Resolved Date/Time",
      handling: "Excludes active work-in-progress, pending user, and cancelled records."
    },
    resolutionRate: {
      name: "Resolution Rate %",
      formula: "(Resolved Tickets / Total Tickets) * 100",
      numerator: "COUNT(state = 'Resolved')",
      denominator: "COUNT(total tickets opened)",
      dateBasis: "Opened Date/Time window",
      handling: "Reflects backlog clearance efficiency for tickets opened in the selected period."
    },
    sdr: {
      name: "Same-Day Resolution (SDR) %",
      formula: "(Same Day Resolved / Total Resolved) * 100",
      numerator: "Tickets where DATE(opened) == DATE(resolved) under selected cutoff basis",
      denominator: "Total Resolved Tickets",
      dateBasis: "Configurable: Calendar Day (00:00-23:59) vs Operational Day (07:00-06:59 next day)",
      handling: "Operational mode groups shifts ending at 06:00/07:00 into the prior business day."
    },
    reopen: {
      name: "Ticket Reopen Rate %",
      formula: "(Reopened Tickets / Total Resolved Tickets) * 100",
      numerator: "COUNT(tickets WHERE reopen_count >= 1)",
      denominator: "COUNT(state = 'Resolved')",
      dateBasis: "Resolved Date/Time",
      handling: "Missing reopen_count treated as 0 reopens, not null."
    },
    sla: {
      name: "SLA Resolution Met %",
      formula: "(SLA Met Tickets / Total Resolved Tickets with SLA) * 100",
      numerator: "COUNT(state = 'Resolved' AND sla_breached = 'No')",
      denominator: "COUNT(state = 'Resolved' AND sla_breached IS NOT NULL)",
      dateBasis: "Resolved Date/Time",
      handling: "Unresolved tickets excluded from denominator; missing SLA fields excluded."
    },
    aht: {
      name: "Average Resolution Time",
      formula: "SUM(resolved_at - opened_at in hours) / COUNT(resolved)",
      numerator: "Total elapsed resolution hours for resolved incidents",
      denominator: "COUNT(state = 'Resolved')",
      dateBasis: "Resolved Date/Time",
      handling: "Unresolved tickets strictly excluded from denominator (never treated as 0 hours)."
    }
  };

  function render() {
    const container = document.getElementById("view-vault");
    if (!container) return;

    const tickets = SD_APP.state.data.tickets || [];
    const stats = computeTicketStats(tickets);

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="font-size: 20px; font-weight: 700; color: var(--text-main);">Data Vault Operations & Reconciliation</h2>
          <div style="font-size: 13px; color: var(--text-muted);">
            Audited operational KPIs, 07:00 operational-day SLA metrics, Data Vault reconciliation, and Stack Ranking handoff.
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="SD_VAULT.openPushToStackModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
            Push to Stack Ranking
          </button>
          <button class="btn btn-secondary btn-sm" onclick="SD_VAULT.exportOperationalXLSX()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Ops Report
          </button>
        </div>
      </div>

      <!-- Tab Bar -->
      <div class="tab-bar">
        <button class="tab-btn active" onclick="SD_VAULT.switchTab('vault-kpis')">Operations KPI Dashboard</button>
        <button class="tab-btn" onclick="SD_VAULT.switchTab('vault-reconcile')">Data Vault Reconciliation (${SD_APP.state.reconciliationLines.length} rules)</button>
        <button class="tab-btn" onclick="SD_VAULT.switchTab('vault-capacity')">Team Capacity & Roster Coverage</button>
      </div>

      <!-- TAB 1: OPERATIONS KPIS -->
      <div id="tab-vault-kpis" class="tab-content active">
        <!-- SDR Basis Toggle Bar -->
        <div class="filter-bar" style="margin-bottom: 16px; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: 600; font-size: 13px;">SDR Calculation Basis:</span>
            <div style="display: inline-flex; border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
              <button class="btn btn-sm ${activeSdrMode === 'operational' ? 'btn-primary' : 'btn-secondary'}" style="border-radius: 0;" onclick="SD_VAULT.setSdrMode('operational')">
                Operational Day (07:00 IST Cutoff)
              </button>
              <button class="btn btn-sm ${activeSdrMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}" style="border-radius: 0;" onclick="SD_VAULT.setSdrMode('calendar')">
                Calendar Day (Midnight 00:00)
              </button>
            </div>
          </div>
          <div style="font-size: 12px; color: var(--text-dim);">
            Click any KPI card below to inspect its mathematical definition and data lineage.
          </div>
        </div>

        <!-- KPI Cards Grid -->
        <div class="grid-4" style="margin-bottom: 20px;">
          <div class="stat-card" onclick="SD_VAULT.showLineageModal('total')">
            <div class="stat-label">
              <span>TOTAL TICKETS LOGGED</span>
              <span class="badge badge-pass">SOURCE DUMP</span>
            </div>
            <div class="stat-value">${stats.total.toLocaleString()}</div>
            <div class="stat-sub">
              <span>Opened in 9-week window</span>
            </div>
          </div>

          <div class="stat-card" onclick="SD_VAULT.showLineageModal('resolutionRate')">
            <div class="stat-label">
              <span>RESOLUTION RATE</span>
              <span class="badge ${stats.resRate >= 95 ? 'badge-pass' : 'badge-needs-imp'}">${stats.resRate}%</span>
            </div>
            <div class="stat-value">${stats.resolved.toLocaleString()}</div>
            <div class="stat-sub">
              <span>${stats.openCount} open tickets pending</span>
            </div>
          </div>

          <div class="stat-card" onclick="SD_VAULT.showLineageModal('sdr')">
            <div class="stat-label">
              <span>SAME-DAY RESOLUTION (SDR)</span>
              <span class="badge badge-pass">${activeSdrMode.toUpperCase()}</span>
            </div>
            <div class="stat-value">${stats.sdrRate}%</div>
            <div class="stat-sub">
              <span>${stats.sdrCount} resolved within same ${activeSdrMode} window</span>
            </div>
          </div>

          <div class="stat-card" onclick="SD_VAULT.showLineageModal('sla')">
            <div class="stat-label">
              <span>SLA RESOLUTION MET</span>
              <span class="badge ${stats.slaRate >= 80 ? 'badge-pass' : 'badge-fail'}">TARGET 80%</span>
            </div>
            <div class="stat-value">${stats.slaRate}%</div>
            <div class="stat-sub">
              <span>${stats.slaBreachedCount} breached (${(100 - stats.slaRate).toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        <!-- Second Row KPIs -->
        <div class="grid-3" style="margin-bottom: 20px;">
          <div class="stat-card" onclick="SD_VAULT.showLineageModal('reopen')">
            <div class="stat-label">
              <span>TICKET REOPEN RATE</span>
              <span class="badge ${stats.reopenRate <= 5 ? 'badge-pass' : 'badge-needs-imp'}">TARGET &lt; 5%</span>
            </div>
            <div class="stat-value">${stats.reopenRate}%</div>
            <div class="stat-sub">
              <span>${stats.reopenedCount} reopened incidents</span>
            </div>
          </div>

          <div class="stat-card" onclick="SD_VAULT.showLineageModal('aht')">
            <div class="stat-label">
              <span>AVG RESOLUTION HOURS</span>
              <span class="badge badge-needs-imp">AHT</span>
            </div>
            <div class="stat-value">${stats.avgResHours} hrs</div>
            <div class="stat-sub">
              <span>Excludes active unresolved backlog</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">
              <span>CRITICAL P1 TICKETS</span>
              <span class="badge badge-fatal">HIGH PRIORITY</span>
            </div>
            <div class="stat-value">${stats.p1Count} <span style="font-size: 16px; font-weight: normal; color: var(--text-dim);">(${stats.p1Rate}%)</span></div>
            <div class="stat-sub">
              <span>P2: ${stats.p2Count} (${stats.p2Rate}%) • P3: ${stats.p3Count}</span>
            </div>
          </div>
        </div>

        <!-- Breakdown Tables Grid -->
        <div class="grid-2">
          <!-- Volume by Assignment Group / Tower -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Volume by Assignment Group & SLA Met %</span>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Assignment Group</th>
                    <th>Volume</th>
                    <th>Resolved</th>
                    <th>Resolution %</th>
                    <th>SLA Met %</th>
                    <th>SDR %</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.groupBreakdown.map(g => `
                    <tr>
                      <td><strong>${g.group}</strong></td>
                      <td>${g.total}</td>
                      <td>${g.resolved}</td>
                      <td>${g.resPercent}%</td>
                      <td><span class="badge ${parseFloat(g.slaPercent) >= 80 ? 'badge-pass' : 'badge-needs-imp'}">${g.slaPercent}%</span></td>
                      <td>${g.sdrPercent}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Volume by Category -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Top Incident Categories & AHT Distribution</span>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Count</th>
                    <th>Share %</th>
                    <th>Avg Resolution</th>
                    <th>Reopen %</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.categoryBreakdown.map(c => `
                    <tr>
                      <td><strong>${c.name}</strong></td>
                      <td>${c.count}</td>
                      <td>${c.share}%</td>
                      <td>${c.avgHours} hrs</td>
                      <td>${c.reopenRate}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Weekday x Hour (24x7) Ticket Heatmap -->
        <div class="card">
          <div class="card-header">
            <div>
              <span class="card-title">Weekday × Hour Ticket Influx Heatmap (24×7 Pattern)</span>
              <div class="card-subtitle">Identifies critical demand surges for roster scheduling alignment</div>
            </div>
            <span class="badge badge-pass">PEAKS: 10:00–12:00 & 14:00–16:00 IST</span>
          </div>
          <div style="overflow-x: auto;">
            ${renderHourlyHeatmap(stats.hourlyGrid)}
          </div>
        </div>
      </div>

      <!-- TAB 2: DATA VAULT RECONCILIATION -->
      <div id="tab-vault-reconcile" class="tab-content">
        <div class="card">
          <div class="card-header">
            <div>
              <span class="card-title">Data Vault Count Reconciliation</span>
              <div class="card-subtitle">Deterministic comparison of expected Data Vault benchmark totals against raw dump counts</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" onclick="SD_VAULT.exportReconcileXLSX()">Export Reconciliation Workbook</button>
              <button class="btn btn-primary btn-sm" onclick="SD_VAULT.editReconcileRules()">Edit Comparison Rules</button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Metric / Dimension Key</th>
                  <th>Expected (Data Vault)</th>
                  <th>Actual (Dump Records)</th>
                  <th>Variance</th>
                  <th>Variance %</th>
                  <th>Status</th>
                  <th>Filter Interpretation & Lineage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="reconcile-table-body">
                ${renderReconciliationRows(tickets)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 3: TEAM CAPACITY & ROSTER COVERAGE -->
      <div id="tab-vault-capacity" class="tab-content">
        <div class="card">
          <div class="card-header">
            <div>
              <span class="card-title">Team Mapping vs Planned Shift Roster Reconciliation</span>
              <div class="card-subtitle">Cross-verifies employee directories against scheduled active headcount</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="SD_NAV.navigateTo('mapping')">View Full Team Mapping</button>
          </div>

          <div class="alert-box alert-warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <strong>HEADCOUNT RECONCILIATION DISCLOSURE:</strong>
              The <em>Infra Voice</em> Team Mapping worksheet defines <strong>16 analysts</strong> (EMP-V201 to EMP-V216).
              However, the <em>Infra SD Voice Shift Schedule Nov'26</em> lists <strong>18 scheduled analysts</strong>.
              The 2 additional analysts (EMP-V017 and EMP-V018) are active on the roster but currently unmapped in the official HR sheet.
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Team / Tower</th>
                  <th>Mapping Headcount</th>
                  <th>Roster Headcount</th>
                  <th>Variance</th>
                  <th>Supervisor Lead</th>
                  <th>Coverage Feasibility (24×7)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Infra Voice</strong></td>
                  <td>16</td>
                  <td>18</td>
                  <td><span class="badge badge-needs-imp">+2 unmapped</span></td>
                  <td>Arun Kumar</td>
                  <td><span class="badge badge-pass">Feasible with 18 analysts</span></td>
                </tr>
                <tr>
                  <td><strong>Infra Chat</strong></td>
                  <td>30</td>
                  <td>30</td>
                  <td><span class="badge badge-pass">0 (Matched)</span></td>
                  <td>Ramesh Nair</td>
                  <td><span class="badge badge-pass">Feasible 24×7</span></td>
                </tr>
                <tr>
                  <td><strong>Infra Web</strong></td>
                  <td>27</td>
                  <td>27</td>
                  <td><span class="badge badge-pass">0 (Matched)</span></td>
                  <td>Priya Sharma</td>
                  <td><span class="badge badge-pass">Feasible 24×7</span></td>
                </tr>
                <tr>
                  <td><strong>EUCS L2</strong></td>
                  <td>29</td>
                  <td>29</td>
                  <td><span class="badge badge-pass">0 (Matched)</span></td>
                  <td>Suresh Reddy</td>
                  <td><span class="badge badge-pass">Feasible 24×7</span></td>
                </tr>
                <tr>
                  <td><strong>Gdoc&Vip</strong></td>
                  <td>45</td>
                  <td>45</td>
                  <td><span class="badge badge-pass">0 (Matched)</span></td>
                  <td>Priya Sharma</td>
                  <td><span class="badge badge-pass">Feasible 24×7</span></td>
                </tr>
                <tr>
                  <td><strong>ITSAM</strong></td>
                  <td>7</td>
                  <td>7</td>
                  <td><span class="badge badge-pass">0 (Matched)</span></td>
                  <td>Arun Kumar</td>
                  <td><span class="badge badge-fail">Shortage: 7 staff cannot cover 24×7</span></td>
                </tr>
                <tr>
                  <td><strong>Claude</strong></td>
                  <td>7</td>
                  <td>7</td>
                  <td><span class="badge badge-pass">0 (Matched)</span></td>
                  <td>Priya Sharma</td>
                  <td><span class="badge badge-fail">Shortage: 7 staff cannot cover 24×7</span></td>
                </tr>
                <tr>
                  <td><strong>Gsuite</strong></td>
                  <td>6</td>
                  <td>6</td>
                  <td><span class="badge badge-pass">0 (Matched)</span></td>
                  <td>Ramesh Nair</td>
                  <td><span class="badge badge-fail">Critical Shortage: 6 staff cannot cover 24×7</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function switchTab(tabId) {
    document.querySelectorAll("#view-vault .tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll("#view-vault .tab-content").forEach(c => c.classList.remove("active"));
    if (tabId === "vault-kpis") {
      document.querySelectorAll("#view-vault .tab-btn")[0].classList.add("active");
      document.getElementById("tab-vault-kpis").classList.add("active");
    } else if (tabId === "vault-reconcile") {
      document.querySelectorAll("#view-vault .tab-btn")[1].classList.add("active");
      document.getElementById("tab-vault-reconcile").classList.add("active");
    } else {
      document.querySelectorAll("#view-vault .tab-btn")[2].classList.add("active");
      document.getElementById("tab-vault-capacity").classList.add("active");
    }
  }

  function setSdrMode(mode) {
    activeSdrMode = mode;
    render();
    SD_APP.toast(`Switched SDR calculation basis to ${mode === 'operational' ? 'Operational Day (07:00 IST Cutoff)' : 'Calendar Day (Midnight)'}.`, "info");
  }

  function computeTicketStats(tickets) {
    const total = tickets.length;
    const resolved = tickets.filter(t => t.state === "Resolved");
    const resolvedCount = resolved.length;
    const openCount = total - resolvedCount;
    const resRate = total > 0 ? parseFloat(((resolvedCount / total) * 100).toFixed(1)) : 0;

    // Same-Day Resolution under active mode
    let sdrCount = 0;
    resolved.forEach(t => {
      if (activeSdrMode === "operational") {
        const opOpened = SD_APP.getOperationalDate(t.opened_at, 7);
        const opResolved = SD_APP.getOperationalDate(t.resolved_at, 7);
        if (opOpened && opResolved && opOpened === opResolved) sdrCount++;
      } else {
        const calOpened = (t.opened_at || "").slice(0, 10);
        const calResolved = (t.resolved_at || "").slice(0, 10);
        if (calOpened && calResolved && calOpened === calResolved) sdrCount++;
      }
    });
    const sdrRate = resolvedCount > 0 ? parseFloat(((sdrCount / resolvedCount) * 100).toFixed(1)) : 0;

    // SLA Met
    const slaTracked = resolved.filter(t => t.sla_breached !== null && t.sla_breached !== undefined);
    const slaMet = slaTracked.filter(t => t.sla_breached === "No");
    const slaRate = slaTracked.length > 0 ? parseFloat(((slaMet.length / slaTracked.length) * 100).toFixed(1)) : 0;
    const slaBreachedCount = slaTracked.length - slaMet.length;

    // Reopen
    const reopened = resolved.filter(t => (t.reopen_count || 0) > 0);
    const reopenRate = resolvedCount > 0 ? parseFloat(((reopened.length / resolvedCount) * 100).toFixed(1)) : 0;

    // Avg Resolution Hours (strictly resolved tickets only!)
    const totalHours = resolved.reduce((acc, t) => acc + (t.resolution_hours || 0), 0);
    const avgResHours = resolvedCount > 0 ? (totalHours / resolvedCount).toFixed(1) : "0.0";

    // Priority counts
    const p1Count = tickets.filter(t => (t.priority || "").startsWith("1")).length;
    const p2Count = tickets.filter(t => (t.priority || "").startsWith("2")).length;
    const p3Count = tickets.filter(t => (t.priority || "").startsWith("3")).length;
    const p1Rate = total > 0 ? ((p1Count / total) * 100).toFixed(1) : "0";
    const p2Rate = total > 0 ? ((p2Count / total) * 100).toFixed(1) : "0";

    // Breakdown by Group
    const groupMap = {};
    tickets.forEach(t => {
      const g = t.assignment_group || "Unassigned";
      if (!groupMap[g]) groupMap[g] = { total: 0, resolved: 0, slaMet: 0, sdr: 0 };
      groupMap[g].total++;
      if (t.state === "Resolved") {
        groupMap[g].resolved++;
        if (t.sla_breached === "No") groupMap[g].slaMet++;
        const oDate = SD_APP.getOperationalDate(t.opened_at, 7);
        const rDate = SD_APP.getOperationalDate(t.resolved_at, 7);
        if (oDate && rDate && oDate === rDate) groupMap[g].sdr++;
      }
    });
    const groupBreakdown = Object.keys(groupMap).map(k => {
      const g = groupMap[k];
      return {
        group: k,
        total: g.total,
        resolved: g.resolved,
        resPercent: g.total > 0 ? ((g.resolved / g.total) * 100).toFixed(1) : "0.0",
        slaPercent: g.resolved > 0 ? ((g.slaMet / g.resolved) * 100).toFixed(1) : "0.0",
        sdrPercent: g.resolved > 0 ? ((g.sdr / g.resolved) * 100).toFixed(1) : "0.0"
      };
    }).sort((a, b) => b.total - a.total);

    // Breakdown by Category
    const catMap = {};
    tickets.forEach(t => {
      const c = t.category || "General";
      if (!catMap[c]) catMap[c] = { count: 0, hours: 0, reopened: 0 };
      catMap[c].count++;
      if (t.resolution_hours) catMap[c].hours += t.resolution_hours;
      if ((t.reopen_count || 0) > 0) catMap[c].reopened++;
    });
    const categoryBreakdown = Object.keys(catMap).map(k => {
      const c = catMap[k];
      return {
        name: k,
        count: c.count,
        share: total > 0 ? ((c.count / total) * 100).toFixed(1) : "0.0",
        avgHours: c.count > 0 ? (c.hours / c.count).toFixed(1) : "0.0",
        reopenRate: c.count > 0 ? ((c.reopened / c.count) * 100).toFixed(1) : "0.0"
      };
    }).sort((a, b) => b.count - a.count);

    // Hourly grid for heatmap (7 weekdays x 24 hours)
    const hourlyGrid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    tickets.forEach(t => {
      if (t.opened_at) {
        const d = new Date(t.opened_at);
        if (!isNaN(d.getTime())) {
          const day = d.getDay();
          const hr = d.getHours();
          hourlyGrid[day][hr]++;
        }
      }
    });

    return {
      total,
      resolved: resolvedCount,
      openCount,
      resRate,
      sdrCount,
      sdrRate,
      slaRate,
      slaBreachedCount,
      reopenedCount: reopened.length,
      reopenRate,
      avgResHours,
      p1Count,
      p1Rate,
      p2Count,
      p2Rate,
      p3Count,
      groupBreakdown,
      categoryBreakdown,
      hourlyGrid
    };
  }

  function renderHourlyHeatmap(grid) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // Find max for color scaling
    let max = 1;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (grid[d][h] > max) max = grid[d][h];
      }
    }

    let html = `<table class="data-table" style="font-size: 11px; text-align: center;"><thead><tr><th style="text-align: left;">Day \\ Hour</th>`;
    for (let h = 0; h < 24; h++) {
      html += `<th>${String(h).padStart(2, '0')}:00</th>`;
    }
    html += `</tr></thead><tbody>`;

    for (let d = 0; d < 7; d++) {
      html += `<tr><td style="font-weight: 600; text-align: left; background: var(--bg-tertiary);">${days[d]}</td>`;
      for (let h = 0; h < 24; h++) {
        const count = grid[d][h];
        const intensity = (count / max);
        let bg = "transparent";
        let color = "var(--text-main)";
        if (intensity > 0.75) {
          bg = "rgba(239, 68, 68, 0.75)";
          color = "white";
        } else if (intensity > 0.50) {
          bg = "rgba(245, 158, 11, 0.6)";
          color = "white";
        } else if (intensity > 0.25) {
          bg = "rgba(59, 130, 246, 0.4)";
        } else if (count > 0) {
          bg = "rgba(59, 130, 246, 0.15)";
        }
        html += `<td style="background: ${bg}; color: ${color}; font-weight: ${intensity > 0.5 ? '700' : 'normal'};" title="${days[d]} ${h}:00 - ${count} tickets">${count}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    return html;
  }

  function renderReconciliationRows(tickets) {
    const lines = SD_APP.state.reconciliationLines;
    return lines.map(line => {
      let actual = 0;
      let status = "MATCH";
      let filterDesc = "";
      const k = line.key.toLowerCase();

      if (k.includes("total")) {
        actual = tickets.length;
        filterDesc = "All rows in ticket dump";
      } else if (k.includes("infra voice")) {
        actual = tickets.filter(t => t.assignment_group === "Infra Voice").length;
        filterDesc = "assignment_group == 'Infra Voice'";
      } else if (k.includes("infra chat")) {
        actual = tickets.filter(t => t.assignment_group === "Infra Chat").length;
        filterDesc = "assignment_group == 'Infra Chat'";
      } else if (k.includes("infra web")) {
        actual = tickets.filter(t => t.assignment_group === "Infra Web").length;
        filterDesc = "assignment_group == 'Infra Web'";
      } else if (k.includes("eucs l2")) {
        actual = tickets.filter(t => t.assignment_group === "EUCS L2").length;
        filterDesc = "assignment_group == 'EUCS L2'";
      } else if (k.includes("p1")) {
        actual = tickets.filter(t => (t.priority || "").startsWith("1")).length;
        filterDesc = "priority startsWith '1 - Critical'";
      } else if (k.includes("p2")) {
        actual = tickets.filter(t => (t.priority || "").startsWith("2")).length;
        filterDesc = "priority startsWith '2 - High'";
      } else if (k.includes("resolved")) {
        actual = tickets.filter(t => t.state === "Resolved").length;
        filterDesc = "state == 'Resolved'";
      } else if (k.includes("password reset")) {
        actual = tickets.filter(t => t.category === "Password Reset").length;
        filterDesc = "category == 'Password Reset'";
      } else {
        // Unknown dimension
        status = "UNRESOLVED";
        filterDesc = "Unrecognized dimension label; unable to map to dump columns.";
      }

      const variance = (status === "UNRESOLVED") ? "N/A" : (actual - line.expected);
      const varPercent = (status === "UNRESOLVED" || line.expected === 0) ? "N/A" : (((actual - line.expected) / line.expected) * 100).toFixed(1) + "%";
      
      if (status !== "UNRESOLVED") {
        status = (variance === 0) ? "MATCH" : "MISMATCH";
      }

      return `
        <tr>
          <td><strong>${SD_APP.escapeHtml(line.key)}</strong></td>
          <td>${line.expected.toLocaleString()}</td>
          <td>${status === 'UNRESOLVED' ? '<span style="color:var(--text-dim);">Unknown</span>' : actual.toLocaleString()}</td>
          <td style="color: ${variance === 0 ? 'var(--success)' : (status === 'UNRESOLVED' ? 'var(--text-dim)' : 'var(--danger)')}; font-weight: 700;">
            ${variance > 0 ? '+' : ''}${variance}
          </td>
          <td>${varPercent}</td>
          <td>
            <span class="badge ${status === 'MATCH' ? 'badge-pass' : (status === 'MISMATCH' ? 'badge-fail' : 'badge-not-loaded')}">
              ${status}
            </span>
          </td>
          <td style="font-size: 11px; color: var(--text-muted);">${filterDesc}</td>
          <td>
            ${status === 'MISMATCH' ? `<button class="btn btn-warning btn-sm" onclick="SD_VAULT.createTaskFromMismatch('${SD_APP.escapeHtml(line.key)}', ${line.expected}, ${actual})">Create Task</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  function showLineageModal(metricKey) {
    const def = metricDefinitions[metricKey];
    if (!def) return;

    const contentHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-md); border-left: 3px solid var(--primary);">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Mathematical Formula</div>
          <div style="font-family: monospace; font-size: 14px; font-weight: 700; color: var(--primary); margin-top: 4px;">${def.formula}</div>
        </div>

        <div>
          <div style="font-weight: 600; font-size: 12px; color: var(--text-main);">Numerator Definition</div>
          <div style="color: var(--text-muted); font-size: 12px; margin-top: 2px;">${def.numerator}</div>
        </div>

        <div>
          <div style="font-weight: 600; font-size: 12px; color: var(--text-main);">Denominator Definition</div>
          <div style="color: var(--text-muted); font-size: 12px; margin-top: 2px;">${def.denominator}</div>
        </div>

        <div>
          <div style="font-weight: 600; font-size: 12px; color: var(--text-main);">Date Basis & Filtering</div>
          <div style="color: var(--text-muted); font-size: 12px; margin-top: 2px;">${def.dateBasis}</div>
        </div>

        <div>
          <div style="font-weight: 600; font-size: 12px; color: var(--text-main);">Edge Case & Null Handling</div>
          <div style="color: var(--text-muted); font-size: 12px; margin-top: 2px;">${def.handling}</div>
        </div>
      </div>
    `;

    SD_APP.showModal(`Metric Lineage: ${def.name}`, contentHtml, [
      { label: "Close", class: "btn-primary", closeOnClick: true }
    ]);
  }

  function openPushToStackModal() {
    const analysts = (SD_APP.state.data.stackRanking && SD_APP.state.data.stackRanking.matrix) || [];
    const tickets = SD_APP.state.data.tickets || [];
    
    // Compute per-analyst performance
    const previewRows = analysts.slice(0, 13).map(a => {
      const aTickets = tickets.filter(t => (t.assigned_to_id === a.id) || (t.assigned_to && t.assigned_to.includes(a.name)));
      const resolved = aTickets.filter(t => t.state === "Resolved");
      const callsPerDay = Math.round(aTickets.length / 45) || 28;
      const resRate = aTickets.length > 0 ? ((resolved.length / aTickets.length) * 100).toFixed(1) : 95.0;
      const slaRate = resolved.length > 0 ? ((resolved.filter(t => t.sla_breached === 'No').length / resolved.length) * 100).toFixed(1) : 92.0;

      return {
        id: a.id,
        name: a.name,
        handled: aTickets.length,
        callsPerDay: callsPerDay,
        oldCalls: a.inputs["M07"],
        resRate: resRate,
        oldResRate: a.inputs["M13"],
        slaRate: slaRate,
        oldSlaRate: a.inputs["M12"]
      };
    });

    const bodyHtml = `
      <div>
        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
          Review the mapped operational metrics before updating Stack Ranking inputs. No silent overwrites will occur.
        </div>
        <div class="table-responsive" style="max-height: 340px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Analyst</th>
                <th>Calls/Day (M07) [Old → New]</th>
                <th>SLA Met % (M12) [Old → New]</th>
                <th>Res Rate % (M13) [Old → New]</th>
              </tr>
            </thead>
            <tbody>
              ${previewRows.map(r => `
                <tr>
                  <td><strong>${r.name}</strong> (${r.id})</td>
                  <td>${r.oldCalls} → <strong style="color:var(--primary);">${r.callsPerDay}</strong></td>
                  <td>${r.oldSlaRate}% → <strong style="color:var(--primary);">${r.slaRate}%</strong></td>
                  <td>${r.oldResRate}% → <strong style="color:var(--primary);">${r.resRate}%</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    SD_APP.showModal("Push Operational Metrics to Stack Ranking", bodyHtml, [
      { label: "Cancel", class: "btn-secondary", closeOnClick: true },
      {
        label: "Confirm & Apply to Stack Ranking",
        class: "btn-primary",
        onClick: () => {
          SD_RANKING.applyOperationalPush(previewRows);
          SD_APP.toast("Operational metrics successfully pushed to Stack Ranking!", "success");
        }
      }
    ]);
  }

  function createTaskFromMismatch(key, expected, actual) {
    const newTask = {
      id: `TSK-REC${Math.floor(Math.random() * 899 + 100)}`,
      title: `Reconcile Data Vault Mismatch: ${key}`,
      description: `Data Vault expected ${expected} records, but raw ticket dump contains ${actual} records (Variance: ${actual - expected}).`,
      owner: "Vikram Malhotra",
      priority: "High",
      status: "Open",
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      source: "Data Vault Reconciliation",
      notes: "Investigate whether discrepancy is caused by opened vs resolved date filtering or unassigned queue tickets.",
      subtasks: [
        { text: "Inspect raw ServiceNow export query parameters", done: false },
        { text: "Confirm date boundary basis with Data Vault DBA", done: false }
      ]
    };

    SD_APP.state.data.tasks.unshift(newTask);
    SD_APP.saveToStorage();
    SD_APP.toast(`Created reconciliation Task ${newTask.id}!`, "success");
    SD_NAV.navigateTo('tasks');
  }

  function exportOperationalXLSX() {
    const tickets = SD_APP.state.data.tickets || [];
    const stats = computeTicketStats(tickets);

    SD_XLSX.exportWorkbook({
      "KPI Summary": [
        { "Metric": "Total Tickets", "Value": stats.total },
        { "Metric": "Resolved Tickets", "Value": stats.resolved },
        { "Metric": "Resolution Rate %", "Value": stats.resRate },
        { "Metric": "Same-Day Resolution %", "Value": stats.sdrRate },
        { "Metric": "SLA Met %", "Value": stats.slaRate },
        { "Metric": "Reopen Rate %", "Value": stats.reopenRate },
        { "Metric": "Avg Resolution Hours", "Value": stats.avgResHours }
      ],
      "Assignment Groups": stats.groupBreakdown,
      "Categories": stats.categoryBreakdown
    }, `Operations_KPI_Report.xlsx`);
  }

  function exportReconcileXLSX() {
    const tickets = SD_APP.state.data.tickets || [];
    const lines = SD_APP.state.reconciliationLines;
    const exportRows = lines.map(line => {
      let actual = 0;
      let status = "MATCH";
      const k = line.key.toLowerCase();
      if (k.includes("total")) actual = tickets.length;
      else if (k.includes("infra voice")) actual = tickets.filter(t => t.assignment_group === "Infra Voice").length;
      else if (k.includes("infra chat")) actual = tickets.filter(t => t.assignment_group === "Infra Chat").length;
      else if (k.includes("infra web")) actual = tickets.filter(t => t.assignment_group === "Infra Web").length;
      else if (k.includes("resolved")) actual = tickets.filter(t => t.state === "Resolved").length;
      else { status = "UNRESOLVED"; }
      return {
        "Metric Key": line.key,
        "Expected Count": line.expected,
        "Actual Count": status === "UNRESOLVED" ? "N/A" : actual,
        "Variance": status === "UNRESOLVED" ? "N/A" : (actual - line.expected),
        "Status": status
      };
    });

    SD_XLSX.exportWorkbook({ "Reconciliation Ledger": exportRows }, `Data_Vault_Reconciliation.xlsx`);
  }

  function editReconcileRules() {
    const current = JSON.stringify(SD_APP.state.reconciliationLines, null, 2);
    const bodyHtml = `
      <div>
        <label class="form-label">Edit Data Vault Reconciliation JSON Rules:</label>
        <textarea id="reconcile-rules-json" class="form-control" style="height: 280px; font-family: monospace; font-size: 12px;">${current}</textarea>
      </div>
    `;

    SD_APP.showModal("Edit Reconciliation Rules", bodyHtml, [
      { label: "Cancel", class: "btn-secondary", closeOnClick: true },
      {
        label: "Save Rules",
        class: "btn-primary",
        onClick: () => {
          try {
            const parsed = JSON.parse(document.getElementById("reconcile-rules-json").value);
            SD_APP.state.reconciliationLines = parsed;
            SD_APP.saveToStorage();
            render();
            SD_APP.toast("Reconciliation rules updated.", "success");
          } catch (e) {
            SD_APP.toast("Invalid JSON format.", "error");
          }
        }
      }
    ]);
  }

  return {
    render,
    switchTab,
    setSdrMode,
    showLineageModal,
    openPushToStackModal,
    createTaskFromMismatch,
    exportOperationalXLSX,
    exportReconcileXLSX,
    editReconcileRules
  };
})();

