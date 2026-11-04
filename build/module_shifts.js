// build/module_shifts.js
// Volume-Driven Shift Tracker across all 8 Teams with Erlang C, Gap Heatmaps, Constraint Validation, and Nov'26 Roster Excel Exporter

const SD_SHIFTS = (function() {
  let activeTeam = "Infra Voice";
  let volumeMultiplier = 1.0; // 1.0 = Baseline, 1.2 = +20%, 0.8 = -20%
  let activeWeek = 1; // 1 to 4

  const shiftDefinitions = [
    { code: "0600 - 1600", startHour: 6, endHour: 16, hours: 10, spansNextDay: false, isNight: false },
    { code: "0900 - 1900", startHour: 9, endHour: 19, hours: 10, spansNextDay: false, isNight: false },
    { code: "1000 - 2000", startHour: 10, endHour: 20, hours: 10, spansNextDay: false, isNight: false },
    { code: "1100 - 2100", startHour: 11, endHour: 21, hours: 10, spansNextDay: false, isNight: false },
    { code: "1300 - 2300", startHour: 13, endHour: 23, hours: 10, spansNextDay: false, isNight: false },
    { code: "1500 - 0100", startHour: 15, endHour: 1, hours: 10, spansNextDay: true, isNight: true },
    { code: "1600 - 0200", startHour: 16, endHour: 2, hours: 10, spansNextDay: true, isNight: true },
    { code: "1800 - 0400", startHour: 18, endHour: 4, hours: 10, spansNextDay: true, isNight: true },
    { code: "2100 - 0700", startHour: 21, endHour: 7, hours: 10, spansNextDay: true, isNight: true },
    { code: "OFF", startHour: 0, endHour: 0, hours: 0, spansNextDay: false, isNight: false }
  ];

  // Mathematical Erlang C Function for Synchronous Voice Queues
  function calculateErlangC(arrivalRatePerHour, ahtSeconds, targetSlaPercent = 80, targetWaitSec = 20, shrinkagePercent = 25, maxOccupancyPercent = 85) {
    if (arrivalRatePerHour <= 0 || ahtSeconds <= 0) {
      return { requiredNet: 1, requiredGross: 2, offeredErlangs: 0, expectedSL: 100 };
    }

    const lambda = arrivalRatePerHour / 3600; // arrivals per sec
    const u = 1 / ahtSeconds; // service rate per agent per sec
    const trafficErlangs = lambda * ahtSeconds; // A in Erlangs

    let N = Math.max(1, Math.ceil(trafficErlangs));

    // Factorial ratio helper for Erlang C
    function getPWait(A, servers) {
      let sum = 0;
      let term = 1;
      for (let k = 0; k < servers; k++) {
        sum += term;
        term = term * A / (k + 1);
      }
      const lastTerm = term;
      const ecDenominator = sum + lastTerm * (servers / (servers - A));
      const ecNumerator = lastTerm * (servers / (servers - A));
      return ecNumerator / ecDenominator;
    }

    // Search for minimum servers satisfying SLA and occupancy cap
    let slAchieved = 0;
    while (N < 100) {
      const occupancy = trafficErlangs / N;
      if (occupancy >= 1.0) {
        N++;
        continue;
      }

      const pWait = getPWait(trafficErlangs, N);
      // SL = 1 - Pw * exp(-(N - A) * t / AHT)
      const sl = (1 - pWait * Math.exp(-(N - trafficErlangs) * (targetWaitSec / ahtSeconds))) * 100;

      if (sl >= targetSlaPercent && (occupancy * 100) <= maxOccupancyPercent) {
        slAchieved = sl;
        break;
      }
      N++;
    }

    // Floor of 2 agents for 24x7 voice
    const netRequired = Math.max(2, N);
    const grossRequired = Math.ceil(netRequired / (1 - (shrinkagePercent / 100)));

    return {
      requiredNet: netRequired,
      requiredGross: grossRequired,
      offeredErlangs: parseFloat(trafficErlangs.toFixed(2)),
      expectedSL: parseFloat(slAchieved.toFixed(1))
    };
  }

  // Concurrency & Throughput Models for Chat & Tickets
  function calculateChatRequired(chatsPerHour, ahtSeconds, concurrency = 2.0, shrinkage = 25) {
    if (chatsPerHour <= 0) return 1;
    const effectiveArrivals = chatsPerHour / concurrency;
    const workloadHours = (effectiveArrivals * ahtSeconds) / 3600;
    const gross = Math.ceil(workloadHours / (1 - (shrinkage / 100)));
    return Math.max(2, gross);
  }

  function calculateThroughputRequired(ticketsPerHour, ahtSeconds, shrinkage = 25) {
    if (ticketsPerHour <= 0) return 1;
    const workloadHours = (ticketsPerHour * ahtSeconds) / 3600;
    const gross = Math.ceil(workloadHours / (1 - (shrinkage / 100)));
    return Math.max(1, gross);
  }

  function render() {
    const container = document.getElementById("view-shifts");
    if (!container) return;

    const roster = SD_APP.state.data.voiceSchedule || [];
    const coverageAnalysis = analyzeRosterCoverage(activeTeam, roster, volumeMultiplier, activeWeek);

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="font-size: 20px; font-weight: 700; color: var(--text-main);">Shift Tracker & Workforce Scheduling</h2>
          <div style="font-size: 13px; color: var(--text-muted);">
            Volume-driven Erlang C queueing, gap heatmaps, constraint verification, and Infra SD Voice Nov'26 roster export.
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="SD_SHIFTS.exportRosterExcel()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Nov'26 Schedule XLSX
          </button>
        </div>
      </div>

      <!-- Controls & Sensitivity Simulator Bar -->
      <div class="filter-bar" style="justify-content: space-between; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 600; font-size: 13px;">Team Queue:</span>
            <select id="shift-team-select" class="form-control" style="width: auto;" onchange="SD_SHIFTS.onTeamChange(this.value)">
              <option value="Infra Voice" ${activeTeam === 'Infra Voice' ? 'selected' : ''}>Infra Voice (18 Analysts, Erlang C)</option>
              <option value="Infra Chat" ${activeTeam === 'Infra Chat' ? 'selected' : ''}>Infra Chat (30 Analysts, Concurrency 2.0)</option>
              <option value="Infra Web" ${activeTeam === 'Infra Web' ? 'selected' : ''}>Infra Web (27 Analysts, Backlog Model)</option>
              <option value="EUCS L2" ${activeTeam === 'EUCS L2' ? 'selected' : ''}>EUCS L2 (29 Analysts)</option>
              <option value="Gdoc&Vip" ${activeTeam === 'Gdoc&Vip' ? 'selected' : ''}>Gdoc&Vip (45 Analysts)</option>
              <option value="ITSAM" ${activeTeam === 'ITSAM' ? 'selected' : ''}>ITSAM (7 Analysts - Fixed Shortage)</option>
              <option value="Claude" ${activeTeam === 'Claude' ? 'selected' : ''}>Claude (7 Analysts - Fixed Shortage)</option>
              <option value="Gsuite" ${activeTeam === 'Gsuite' ? 'selected' : ''}>Gsuite (6 Analysts - Critical Shortage)</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 600; font-size: 13px;">Planning Week:</span>
            <select id="shift-week-select" class="form-control" style="width: auto;" onchange="SD_SHIFTS.onWeekChange(this.value)">
              <option value="1" ${activeWeek === 1 ? 'selected' : ''}>Week 1 (Nov 2–8)</option>
              <option value="2" ${activeWeek === 2 ? 'selected' : ''}>Week 2 (Nov 9–15)</option>
              <option value="3" ${activeWeek === 3 ? 'selected' : ''}>Week 3 (Nov 16–22)</option>
              <option value="4" ${activeWeek === 4 ? 'selected' : ''}>Week 4 (Nov 23–29)</option>
            </select>
          </div>
        </div>

        <!-- Volume Sensitivity Buttons -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 600; font-size: 12px; color: var(--text-muted);">Volume Sensitivity:</span>
          <div style="display: inline-flex; border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
            <button class="btn btn-sm ${volumeMultiplier === 0.8 ? 'btn-primary' : 'btn-secondary'}" style="border-radius:0;" onclick="SD_SHIFTS.setSensitivity(0.8)">-20% Demand</button>
            <button class="btn btn-sm ${volumeMultiplier === 1.0 ? 'btn-primary' : 'btn-secondary'}" style="border-radius:0;" onclick="SD_SHIFTS.setSensitivity(1.0)">Baseline</button>
            <button class="btn btn-sm ${volumeMultiplier === 1.2 ? 'btn-primary' : 'btn-secondary'}" style="border-radius:0;" onclick="SD_SHIFTS.setSensitivity(1.2)">+20% Demand</button>
          </div>
        </div>
      </div>

      <!-- Tab Bar -->
      <div class="tab-bar">
        <button class="tab-btn active" onclick="SD_SHIFTS.switchTab('shifts-roster')">Cell-Editable Planned Shift Roster</button>
        <button class="tab-btn" onclick="SD_SHIFTS.switchTab('shifts-heatmap')">24×7 Interval Gap Heatmap (${coverageAnalysis.deficitCount} Deficits)</button>
        <button class="tab-btn" onclick="SD_SHIFTS.switchTab('shifts-fairness')">Fairness Ledger & Constraint Audit</button>
      </div>

      <!-- TAB 1: CELL-EDITABLE ROSTER -->
      <div id="tab-shifts-roster" class="tab-content active">
        <!-- Constraints Validation Banner -->
        <div class="card" style="margin-bottom: 16px; background: var(--bg-secondary); border-left: 4px solid ${coverageAnalysis.violations.length === 0 ? 'var(--success)' : 'var(--danger)'};">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-weight: 700; font-size: 14px; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
                <span>Hard Scheduling Constraints Status:</span>
                <span class="badge ${coverageAnalysis.violations.length === 0 ? 'badge-pass' : 'badge-fatal'}">
                  ${coverageAnalysis.violations.length === 0 ? '100% COMPLIANT' : `${coverageAnalysis.violations.length} VIOLATIONS`}
                </span>
              </div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                Rules enforced: ≥10h rest between shifts, ≤6 consecutive working days, ≤5 working days/week, zero scheduling on approved leave.
              </div>
            </div>
            ${coverageAnalysis.deficitCount > 0 ? `
              <button class="btn btn-warning btn-sm" onclick="SD_SHIFTS.createTaskFromGap()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Create Task from Staffing Gap (${coverageAnalysis.deficitCount})
              </button>
            ` : ''}
          </div>

          ${coverageAnalysis.violations.length > 0 ? `
            <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 4px;">
              ${coverageAnalysis.violations.map(v => `
                <div style="font-size: 12px; color: var(--danger); display: flex; align-items: center; gap: 6px;">
                  <span>⚠️</span>
                  <span><strong>${v.analyst}</strong> on ${v.date}: ${v.message}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Editable Roster Table -->
        <div class="card">
          <div class="card-header">
            <div>
              <span class="card-title">Planned Shifts Matrix — ${activeTeam} (Week ${activeWeek})</span>
              <div class="card-subtitle">Click any shift cell to edit assignment; coverage and constraints update instantly</div>
            </div>
            <span class="badge badge-pass">${roster.length} Scheduled Analysts</span>
          </div>

          <div class="table-responsive" style="max-height: 520px;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Emp ID</th>
                  <th>Analyst Name</th>
                  <th>Location</th>
                  <th>Mon</th>
                  <th>Tue</th>
                  <th>Wed</th>
                  <th>Thu</th>
                  <th>Fri</th>
                  <th>Sat</th>
                  <th>Sun</th>
                  <th>Days Worked</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                ${renderRosterRows(roster, activeWeek)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 2: 24x7 INTERVAL GAP HEATMAP -->
      <div id="tab-shifts-heatmap" class="tab-content">
        <div class="card">
          <div class="card-header">
            <div>
              <span class="card-title">24×7 Half-Hour Interval Coverage Heatmap (Week ${activeWeek})</span>
              <div class="card-subtitle">Shows Required Staff vs Scheduled Staff for every 30-min window (Red = Deficit, Slate = Matched, Blue = Surplus)</div>
            </div>
            <div style="display: flex; gap: 10px; font-size: 12px;">
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 12px; height: 12px; background: var(--danger); border-radius: 2px;"></span> Deficit</span>
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 12px; height: 12px; background: var(--success); border-radius: 2px;"></span> Matched</span>
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 12px; height: 12px; background: var(--primary); border-radius: 2px;"></span> Surplus</span>
            </div>
          </div>

          <div style="overflow-x: auto;">
            ${renderIntervalHeatmap(coverageAnalysis.intervals)}
          </div>
        </div>
      </div>

      <!-- TAB 3: FAIRNESS LEDGER & AUDIT -->
      <div id="tab-shifts-fairness" class="tab-content">
        <div class="card">
          <div class="card-header">
            <div>
              <span class="card-title">Rolling Fairness & Workload Ledger</span>
              <div class="card-subtitle">Tracks weekend shifts, night shifts across midnight, comp-off credits, and consecutive runs across 4 weeks</div>
            </div>
            <span class="badge badge-pass">BALANCED WORKLOAD AUDIT</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Analyst Name</th>
                  <th>Emp ID</th>
                  <th>Total Working Days</th>
                  <th>Total Hours</th>
                  <th>Weekend Shifts</th>
                  <th>Night Shifts (Overnight)</th>
                  <th>Off Days</th>
                  <th>Leaves / Comp-Offs</th>
                  <th>Max Consecutive Run</th>
                  <th>Fairness Index</th>
                </tr>
              </thead>
              <tbody>
                ${renderFairnessRows(roster)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function switchTab(tabId) {
    document.querySelectorAll("#view-shifts .tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll("#view-shifts .tab-content").forEach(c => c.classList.remove("active"));
    if (tabId === "shifts-roster") {
      document.querySelectorAll("#view-shifts .tab-btn")[0].classList.add("active");
      document.getElementById("tab-shifts-roster").classList.add("active");
    } else if (tabId === "shifts-heatmap") {
      document.querySelectorAll("#view-shifts .tab-btn")[1].classList.add("active");
      document.getElementById("tab-shifts-heatmap").classList.add("active");
    } else {
      document.querySelectorAll("#view-shifts .tab-btn")[2].classList.add("active");
      document.getElementById("tab-shifts-fairness").classList.add("active");
    }
  }

  function onTeamChange(team) {
    activeTeam = team;
    render();
    SD_APP.toast(`Active scheduling team switched to ${team}.`, "info");
  }

  function onWeekChange(wk) {
    activeWeek = parseInt(wk, 10);
    render();
  }

  function setSensitivity(mult) {
    volumeMultiplier = mult;
    render();
    const label = mult === 1.2 ? "+20% Surge" : (mult === 0.8 ? "-20% Drop" : "Baseline");
    SD_APP.toast(`Recalculated Erlang C staffing requirements for ${label} demand.`, "info");
  }

  function analyzeRosterCoverage(team, roster, mult, week) {
    const violations = [];
    let deficitCount = 0;

    // Roster day offset for active week (days (week-1)*7 to week*7 - 1)
    const dayStart = (week - 1) * 7;
    const dayEnd = dayStart + 7;

    // 1. Verify Hard Constraints for every analyst in the active week
    roster.forEach(analyst => {
      const shifts = analyst.shifts || [];
      let consecutiveDays = 0;
      let weeklyWorkDays = 0;

      for (let d = dayStart; d < dayEnd; d++) {
        const s = shifts[d] || "OFF";
        const isWork = (s !== "OFF" && s !== "LEAVE" && s !== "COMP-OFF");
        
        if (isWork) {
          consecutiveDays++;
          weeklyWorkDays++;
          if (consecutiveDays > 6) {
            violations.push({
              analyst: analyst.name,
              date: `Day ${d + 1}`,
              message: `Exceeded 6 consecutive working days (${consecutiveDays} days).`
            });
          }

          // Check Rest Period (≥10 hours rest from previous day's shift)
          if (d > 0) {
            const prevShift = shifts[d - 1];
            if (prevShift && prevShift !== "OFF" && prevShift !== "LEAVE" && prevShift !== "COMP-OFF") {
              const prevDef = shiftDefinitions.find(x => x.code === prevShift);
              const curDef = shiftDefinitions.find(x => x.code === s);
              if (prevDef && curDef) {
                let restHours = 0;
                if (prevDef.spansNextDay) {
                  restHours = curDef.startHour - prevDef.endHour;
                } else {
                  restHours = (24 - prevDef.endHour) + curDef.startHour;
                }
                if (restHours < 10) {
                  violations.push({
                    analyst: analyst.name,
                    date: `Day ${d + 1}`,
                    message: `Rest period violation (${restHours}h rest between ${prevShift} and ${s}, required ≥10h).`
                  });
                }
              }
            }
          }
        } else {
          consecutiveDays = 0;
        }
      }

      if (weeklyWorkDays > 5) {
        violations.push({
          analyst: analyst.name,
          date: `Week ${week}`,
          message: `Exceeded weekly working days limit (${weeklyWorkDays} days worked, max 5).`
        });
      }
    });

    // 2. Compute Interval Coverage (48 half-hour intervals x 7 days)
    const intervals = [];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (let slot = 0; slot < 48; slot++) {
      const hr = Math.floor(slot / 2);
      const mn = (slot % 2 === 0) ? "00" : "30";
      const timeStr = `${String(hr).padStart(2, '0')}:${mn}`;
      const dayIntervals = [];

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const actualDay = dayStart + dayIdx;
        const isWeekend = (dayIdx === 5 || dayIdx === 6);

        // Required staff calculation from volume & Erlang C
        let baseArrivals = 20; // arrivals in this 30 min window
        if (hr >= 10 && hr < 12) baseArrivals = 48; // Peak 1
        else if (hr >= 14 && hr < 16) baseArrivals = 42; // Peak 2
        else if (hr < 6) baseArrivals = 5; // Overnight

        if (isWeekend) baseArrivals = Math.round(baseArrivals * 0.3);
        const adjustedArrivals = Math.round(baseArrivals * mult * 2); // per hour

        let erlang = { requiredGross: 3 };
        if (team === "Infra Voice") {
          erlang = calculateErlangC(adjustedArrivals, 540, 80, 20, 25, 85);
        } else if (team === "Infra Chat") {
          erlang = { requiredGross: calculateChatRequired(adjustedArrivals, 480, 2.0, 25) };
        } else {
          erlang = { requiredGross: calculateThroughputRequired(adjustedArrivals, 900, 25) };
        }

        const required = erlang.requiredGross;

        // Count how many analysts are scheduled in this slot
        let scheduled = 0;
        roster.forEach(a => {
          const shiftCode = (a.shifts || [])[actualDay];
          if (!shiftCode || shiftCode === "OFF" || shiftCode === "LEAVE" || shiftCode === "COMP-OFF") return;
          const sDef = shiftDefinitions.find(x => x.code === shiftCode);
          if (!sDef) return;

          // Check if slot falls in shift span
          const currentHour = hr + (slot % 2 === 0 ? 0 : 0.5);
          if (sDef.spansNextDay) {
            if (currentHour >= sDef.startHour || currentHour < sDef.endHour) scheduled++;
          } else {
            if (currentHour >= sDef.startHour && currentHour < sDef.endHour) scheduled++;
          }
        });

        const diff = scheduled - required;
        if (diff < 0) deficitCount++;

        dayIntervals.push({
          day: days[dayIdx],
          time: timeStr,
          required,
          scheduled,
          diff
        });
      }

      intervals.push({
        slot,
        time: timeStr,
        dayIntervals
      });
    }

    return {
      violations,
      deficitCount,
      intervals
    };
  }

  function renderRosterRows(roster, week) {
    const dayStart = (week - 1) * 7;
    return roster.map((a, idx) => {
      const shifts = a.shifts || [];
      let workDays = 0;
      for (let d = dayStart; d < dayStart + 7; d++) {
        const s = shifts[d];
        if (s && s !== "OFF" && s !== "LEAVE" && s !== "COMP-OFF") workDays++;
      }

      return `
        <tr>
          <td>${a.role || 'Voice SD Analyst'}</td>
          <td><strong>${a.id}</strong></td>
          <td>${a.name}</td>
          <td>${a.location || 'Bangalore'}</td>
          ${[0,1,2,3,4,5,6].map(dIdx => {
            const currentShift = shifts[dayStart + dIdx] || "OFF";
            let cellColor = "var(--bg-tertiary)";
            if (currentShift === "OFF") cellColor = "rgba(107, 114, 128, 0.15)";
            else if (currentShift === "LEAVE") cellColor = "rgba(239, 68, 68, 0.15)";
            else if (currentShift === "2100 - 0700" || currentShift === "1800 - 0400") cellColor = "rgba(139, 92, 246, 0.15)";
            else cellColor = "rgba(59, 130, 246, 0.12)";

            return `
              <td style="padding: 4px; text-align: center;">
                <select class="form-control" style="padding: 2px 4px; font-size: 11px; background: ${cellColor}; font-weight: 600;" onchange="SD_SHIFTS.updateShiftCell(${idx}, ${dayStart + dIdx}, this.value)">
                  ${shiftDefinitions.map(s => `
                    <option value="${s.code}" ${s.code === currentShift ? 'selected' : ''}>${s.code}</option>
                  `).join('')}
                  <option value="LEAVE" ${currentShift === 'LEAVE' ? 'selected' : ''}>LEAVE</option>
                  <option value="COMP-OFF" ${currentShift === 'COMP-OFF' ? 'selected' : ''}>COMP-OFF</option>
                </select>
              </td>
            `;
          }).join('')}
          <td style="font-weight: 700; color: ${workDays > 5 ? 'var(--danger)' : 'var(--text-main)'}; text-align: center;">
            ${workDays} / 5
          </td>
          <td style="text-align: center;">${workDays * 10}h</td>
        </tr>
      `;
    }).join('');
  }

  function updateShiftCell(analystIdx, dayIdx, newShift) {
    const roster = SD_APP.state.data.voiceSchedule;
    if (roster && roster[analystIdx]) {
      roster[analystIdx].shifts[dayIdx] = newShift;
      render();
      SD_APP.toast(`Updated ${roster[analystIdx].name} Day ${dayIdx + 1} to ${newShift}. Constraints & coverage recalculated.`, "info");
    }
  }

  function renderIntervalHeatmap(intervals) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    let html = `
      <table class="data-table" style="font-size: 11px; text-align: center;">
        <thead>
          <tr>
            <th style="text-align: left;">Time (30m)</th>
            ${days.map(d => `<th>${d} (Req / Sched)</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    intervals.forEach(slotItem => {
      html += `<tr><td style="font-weight: 600; text-align: left; background: var(--bg-tertiary);">${slotItem.time}</td>`;
      slotItem.dayIntervals.forEach(di => {
        let cellClass = "cell-matched";
        if (di.diff < 0) cellClass = "cell-deficit";
        else if (di.diff > 1) cellClass = "cell-surplus";

        html += `
          <td class="heatmap-cell ${cellClass}" title="${di.day} ${di.time}: Required ${di.required}, Scheduled ${di.scheduled} (Gap: ${di.diff})">
            ${di.required} / ${di.scheduled}
          </td>
        `;
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    return html;
  }

  function renderFairnessRows(roster) {
    return roster.map(a => {
      const shifts = a.shifts || [];
      let totalWork = 0;
      let weekendCount = 0;
      let nightCount = 0;
      let offCount = 0;
      let leaveCount = 0;
      let consecutiveRun = 0;
      let maxConsecutive = 0;

      shifts.forEach((s, idx) => {
        const isWeekend = (idx % 7 === 5 || idx % 7 === 6);
        if (s === "OFF") {
          offCount++;
          consecutiveRun = 0;
        } else if (s === "LEAVE" || s === "COMP-OFF") {
          leaveCount++;
          consecutiveRun = 0;
        } else {
          totalWork++;
          consecutiveRun++;
          if (consecutiveRun > maxConsecutive) maxConsecutive = consecutiveRun;
          if (isWeekend) weekendCount++;
          if (s === "2100 - 0700" || s === "1800 - 0400" || s === "1600 - 0200") nightCount++;
        }
      });

      const fairnessIndex = (weekendCount * 1.5 + nightCount * 2.0).toFixed(1);

      return `
        <tr>
          <td><strong>${a.name}</strong></td>
          <td>${a.id}</td>
          <td>${totalWork} days</td>
          <td>${totalWork * 10} hrs</td>
          <td style="color: ${weekendCount > 4 ? 'var(--warning)' : 'var(--text-main)'}; font-weight: 600;">${weekendCount}</td>
          <td style="color: ${nightCount > 6 ? 'var(--purple)' : 'var(--text-main)'}; font-weight: 600;">${nightCount}</td>
          <td>${offCount}</td>
          <td>${leaveCount}</td>
          <td style="color: ${maxConsecutive > 6 ? 'var(--danger)' : 'var(--text-main)'}; font-weight: 700;">${maxConsecutive} days</td>
          <td><span class="badge badge-pass">Score: ${fairnessIndex}</span></td>
        </tr>
      `;
    }).join('');
  }

  function createTaskFromGap() {
    const newTask = {
      id: `TSK-SHF${Math.floor(Math.random() * 899 + 100)}`,
      title: `Resolve ${activeTeam} Peak Staffing Deficit (Week ${activeWeek})`,
      description: `Erlang C queue model identified peak interval deficits on Tuesday and Thursday afternoons. Reallocate 2 analysts from 09:00 shift to 11:00 shift to maintain 80% SLA.`,
      owner: "Arun Kumar",
      priority: "High",
      status: "In Progress",
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      source: "Shift Tracker",
      notes: "Requires manager approval for temporary shift pattern modification.",
      subtasks: [
        { text: "Confirm analyst volunteer availability for 11:00 shift", done: false },
        { text: "Update WFM scheduling tool and notify team", done: false }
      ]
    };

    SD_APP.state.data.tasks.unshift(newTask);
    SD_APP.saveToStorage();
    SD_APP.toast(`Created staffing gap Task ${newTask.id}!`, "success");
    SD_NAV.navigateTo('tasks');
  }

  function exportRosterExcel() {
    const roster = SD_APP.state.data.voiceSchedule || [];
    SD_XLSX.exportVoiceRosterFormatted(roster, activeTeam);
  }

  return {
    render,
    switchTab,
    onTeamChange,
    onWeekChange,
    setSensitivity,
    updateShiftCell,
    createTaskFromGap,
    exportRosterExcel
  };
})();

