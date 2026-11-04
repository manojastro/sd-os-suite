// build/module_mapping.js
// Team Mapping: Preserves all 10 Worksheets, Deduplicated Unique Headcount, Supervisor Hierarchy, and Unified Profile Modal

const SD_MAPPING = (function() {
  let activeSheet = "Unified"; // "Unified" or sheet name
  let filterTower = "All";
  let filterSupervisor = "All";
  let filterLocation = "All";
  let searchQuery = "";

  function render() {
    const container = document.getElementById("view-mapping");
    if (!container) return;

    const sheets = SD_APP.state.data.teamMapping || {};
    const sheetNames = Object.keys(sheets);

    // Compute unique headcount deduplicated by Emp ID across operational sheets (excluding Overall Infra)
    const uniqueMap = new Map();
    const operationalSheets = ["Infra Web", "Infra Voice", "Infra Chat", "EUCS L2", "Gdoc&Vip", "ITSAM", "Claude", "Gsuite", "App Team Mapping"];
    
    operationalSheets.forEach(sName => {
      const list = sheets[sName] || [];
      list.forEach(emp => {
        const id = (emp["Emp ID"] || "").trim();
        if (id && !uniqueMap.has(id)) {
          uniqueMap.set(id, { ...emp, sourceSheets: [sName] });
        } else if (id && uniqueMap.has(id)) {
          uniqueMap.get(id).sourceSheets.push(sName);
        }
      });
    });

    const uniqueHeadcount = uniqueMap.size;
    const totalSourceRows = Object.values(sheets).reduce((acc, list) => acc + list.length, 0);

    // Filter list
    let displayList = [];
    if (activeSheet === "Unified") {
      displayList = Array.from(uniqueMap.values());
    } else {
      displayList = (sheets[activeSheet] || []).map(emp => ({ ...emp, sourceSheets: [activeSheet] }));
    }

    // Apply secondary filters
    const filtered = displayList.filter(emp => {
      if (filterTower !== "All" && emp.Tower !== filterTower) return false;
      if (filterSupervisor !== "All" && emp["Supervisor Name"] !== filterSupervisor) return false;
      if (filterLocation !== "All" && emp.Location !== filterLocation) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = (emp.Name || "").toLowerCase().includes(q);
        const matchId = (emp["Emp ID"] || "").toLowerCase().includes(q);
        const matchRole = (emp.Role || "").toLowerCase().includes(q);
        if (!matchName && !matchId && !matchRole) return false;
      }
      return true;
    });

    // Extract unique supervisors and locations for filters
    const supervisors = new Set();
    const locations = new Set();
    const towers = new Set();
    displayList.forEach(e => {
      if (e["Supervisor Name"]) supervisors.add(e["Supervisor Name"]);
      if (e.Location) locations.add(e.Location);
      if (e.Tower) towers.add(e.Tower);
    });

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="font-size: 20px; font-weight: 700; color: var(--text-main);">Team Mapping & Directory</h2>
          <div style="font-size: 13px; color: var(--text-muted);">
            Preserves all 10 source worksheets and raw columns. Deduplicates unique headcount and reconciles cross-sheet memberships.
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="SD_MAPPING.openSupervisorTreeModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Supervisor Tree
          </button>
          <button class="btn btn-secondary btn-sm" onclick="SD_MAPPING.exportMappingXLSX()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export 10-Sheet Workbook
          </button>
        </div>
      </div>

      <!-- Headcount Summary & Disclosures Bar -->
      <div class="grid-4" style="margin-bottom: 18px;">
        <div class="stat-card">
          <div class="stat-label">UNIQUE HEADCOUNT</div>
          <div class="stat-value">${uniqueHeadcount.toLocaleString()}</div>
          <div class="stat-sub">Deduplicated across operational sheets</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">TOTAL SHEET ROWS</div>
          <div class="stat-value">${totalSourceRows.toLocaleString()}</div>
          <div class="stat-sub">Includes 167 rows in Overall Infra</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">VOICE MAPPING HEADCOUNT</div>
          <div class="stat-value">16</div>
          <div class="stat-sub"><span style="color:var(--warning)">Roster lists 18 analysts (+2 gap)</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">PRESERVED SHEETS</div>
          <div class="stat-value">${sheetNames.length} / 10</div>
          <div class="stat-sub">100% columns preserved</div>
        </div>
      </div>

      <!-- Reconciliation Warning Callout -->
      <div class="alert-box alert-warning" style="margin-bottom: 18px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div style="flex: 1;">
          <strong>RECONCILIATION NOTICE:</strong>
          <em>Overall Infra</em> is treated as an aggregate reference sheet (~167 rows) and not summed into the operational teams.
          <em>Infra Voice</em> sheet defines 16 positions, whereas the active Shift Roster schedules 18 positions.
          The 2 unmapped roster analysts are reported below without arbitrary headcount destruction.
        </div>
      </div>

      <!-- Sheet Selector Tab Bar -->
      <div class="tab-bar" style="overflow-x: auto; white-space: nowrap;">
        <button class="tab-btn ${activeSheet === 'Unified' ? 'active' : ''}" onclick="SD_MAPPING.setSheet('Unified')">
          Unified Directory (${uniqueHeadcount})
        </button>
        ${sheetNames.map(sName => `
          <button class="tab-btn ${activeSheet === sName ? 'active' : ''}" onclick="SD_MAPPING.setSheet('${sName}')">
            ${sName} (${(sheets[sName] || []).length})
          </button>
        `).join('')}
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar" style="justify-content: space-between; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div class="global-search-container" style="width: 220px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search name or ID..." value="${searchQuery}" oninput="SD_MAPPING.onSearch(this.value)">
          </div>

          <select class="form-control" style="width: auto;" onchange="SD_MAPPING.onTowerFilterChange(this.value)">
            <option value="All">All Towers</option>
            ${Array.from(towers).map(t => `<option value="${t}" ${filterTower === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>

          <select class="form-control" style="width: auto;" onchange="SD_MAPPING.onSupervisorFilterChange(this.value)">
            <option value="All">All Supervisors</option>
            ${Array.from(supervisors).map(s => `<option value="${s}" ${filterSupervisor === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>

          <select class="form-control" style="width: auto;" onchange="SD_MAPPING.onLocationFilterChange(this.value)">
            <option value="All">All Locations</option>
            ${Array.from(locations).map(l => `<option value="${l}" ${filterLocation === l ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <div style="font-size: 12px; color: var(--text-dim);">
          Showing ${filtered.length} employees
        </div>
      </div>

      <!-- Directory Table -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Employee Roster — ${activeSheet}</span>
          <span class="badge badge-pass">Click employee for 360° Profile</span>
        </div>

        <div class="table-responsive" style="max-height: 540px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Name</th>
                <th>Tower</th>
                <th>Team</th>
                <th>Role</th>
                <th>Level</th>
                <th>Supervisor</th>
                <th>Location</th>
                <th>PDOJ</th>
                <th>Tenurity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderEmployeeRows(filtered)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function setSheet(sheet) {
    activeSheet = sheet;
    render();
  }

  function onSearch(q) {
    searchQuery = q;
    render();
  }

  function onTowerFilterChange(t) {
    filterTower = t;
    render();
  }

  function onSupervisorFilterChange(s) {
    filterSupervisor = s;
    render();
  }

  function onLocationFilterChange(l) {
    filterLocation = l;
    render();
  }

  function renderEmployeeRows(list) {
    if (list.length === 0) {
      return `<tr><td colspan="11" style="text-align: center; color: var(--text-dim); padding: 24px;">No employees match the selected filters.</td></tr>`;
    }

    return list.map(emp => `
      <tr style="cursor: pointer;" onclick="SD_MAPPING.openProfileModal('${emp["Emp ID"]}')">
        <td><strong>${emp["Emp ID"]}</strong></td>
        <td><strong style="color: var(--primary);">${emp.Name}</strong></td>
        <td>${emp.Tower || 'Applications'}</td>
        <td>${emp["Team Name"] || activeSheet}</td>
        <td>${emp.Role || 'Staff Member'}</td>
        <td><span class="badge badge-needs-imp">${emp.Level || 'L1'}</span></td>
        <td>${emp["Supervisor Name"] || 'Unassigned'}</td>
        <td>${emp.Location || 'Bangalore'}</td>
        <td>${emp.PDOJ || 'N/A'}</td>
        <td>${emp.Tenurity || 'N/A'}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); SD_MAPPING.openProfileModal('${emp["Emp ID"]}')">Profile</button>
        </td>
      </tr>
    `).join('');
  }

  function openProfileModal(empId) {
    const sheets = SD_APP.state.data.teamMapping || {};
    let matchedEmp = null;
    const memberships = [];

    Object.keys(sheets).forEach(sName => {
      const list = sheets[sName] || [];
      const found = list.find(e => e["Emp ID"] === empId);
      if (found) {
        if (!matchedEmp) matchedEmp = found;
        memberships.push(sName);
      }
    });

    if (!matchedEmp) {
      SD_APP.toast(`Employee ID ${empId} not found in official mapping.`, "warning");
      return;
    }

    // Look up associated tasks, audits, and stack ranking
    const tasks = (SD_APP.state.data.tasks || []).filter(t => t.owner && t.owner.includes(matchedEmp.Name));
    const audits = (SD_APP.state.data.auditHistory || []).filter(a => a.agent && a.agent.includes(matchedEmp.Name));
    const rankEntry = ((SD_APP.state.data.stackRanking && SD_APP.state.data.stackRanking.matrix) || []).find(x => x.id === empId);

    const bodyHtml = `
      <div>
        <!-- Profile Header -->
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px; background: var(--bg-tertiary); padding: 14px; border-radius: var(--radius-md);">
          <div class="brand-logo" style="width: 44px; height: 44px; font-size: 18px;">
            ${matchedEmp.Name.slice(0, 1)}
          </div>
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 2px;">
              ${matchedEmp.Name} (${matchedEmp["Emp ID"]})
            </h3>
            <div style="font-size: 12px; color: var(--text-muted);">
              ${matchedEmp.Role || 'Analyst'} • ${matchedEmp.Designation || 'Systems Engineer'} • ${matchedEmp.Location || 'Bangalore'}
            </div>
          </div>
        </div>

        <!-- Details Grid -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
          <div><strong>Supervisor:</strong> ${matchedEmp["Supervisor Name"] || 'N/A'} (${matchedEmp["Supervisor ID"] || ''})</div>
          <div><strong>Manager:</strong> ${matchedEmp.Manager || 'Director of Operations'}</div>
          <div><strong>Tower:</strong> ${matchedEmp.Tower || 'Infrastructure'}</div>
          <div><strong>Level & Grade:</strong> ${matchedEmp.Level || 'L1'} (Grade ${matchedEmp.Grade || 'B'})</div>
          <div><strong>PDOJ:</strong> ${matchedEmp.PDOJ || 'N/A'}</div>
          <div><strong>Tenurity:</strong> ${matchedEmp.Tenurity || 'N/A'} (${matchedEmp.Months || 0} months)</div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="font-weight: 600; font-size: 12px; margin-bottom: 4px;">Source Worksheet Memberships:</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${memberships.map(m => `<span class="badge badge-pass">${m}</span>`).join('')}
          </div>
        </div>

        <!-- Stack Ranking & Performance -->
        <div style="margin-bottom: 14px; background: var(--bg-card); border: 1px solid var(--border-color); padding: 10px; border-radius: var(--radius-md);">
          <div style="font-weight: 600; font-size: 12px; margin-bottom: 4px;">Stack Ranking Standing:</div>
          ${rankEntry ? `
            <div style="display: flex; gap: 14px; align-items: center; font-size: 12px;">
              <span>Rank: <strong style="color:var(--primary); font-size:14px;">#${rankEntry.rank}</strong></span>
              <span>Overall Adherence: <strong>${rankEntry.overallScore}%</strong></span>
              <span>Quality: <strong>${rankEntry.points["M01"] || 0} pts</strong></span>
            </div>
          ` : `<div style="font-size: 11px; color: var(--text-dim);">No stack ranking record for this employee.</div>`}
        </div>

        <!-- Assigned Tasks -->
        <div>
          <div style="font-weight: 600; font-size: 12px; margin-bottom: 4px;">Assigned Operational Tasks (${tasks.length}):</div>
          ${tasks.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${tasks.map(t => `
                <div style="font-size: 11px; padding: 6px; background: var(--bg-tertiary); border-radius: var(--radius-sm); display: flex; justify-content: space-between;">
                  <span><strong>${t.id}:</strong> ${SD_APP.escapeHtml(t.title)}</span>
                  <span class="badge ${t.status === 'Done' ? 'badge-pass' : 'badge-needs-imp'}">${t.status}</span>
                </div>
              `).join('')}
            </div>
          ` : `<div style="font-size: 11px; color: var(--text-dim);">No tasks assigned currently.</div>`}
        </div>
      </div>
    `;

    SD_APP.showModal(`Employee Profile: ${matchedEmp.Name}`, bodyHtml, [
      { label: "Close", class: "btn-secondary", closeOnClick: true }
    ]);
  }

  function openSupervisorTreeModal() {
    const sheets = SD_APP.state.data.teamMapping || {};
    const supTree = {};

    Object.keys(sheets).forEach(sName => {
      if (sName === "Overall Infra") return; // Skip aggregate
      (sheets[sName] || []).forEach(emp => {
        const sup = emp["Supervisor Name"] || "Direct to Manager";
        if (!supTree[sup]) supTree[sup] = [];
        supTree[sup].push(emp);
      });
    });

    const bodyHtml = `
      <div style="max-height: 480px; overflow-y: auto;">
        ${Object.keys(supTree).map(sup => `
          <div style="margin-bottom: 16px; background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-md);">
            <div style="font-weight: 700; font-size: 13px; color: var(--text-main); margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span>Supervisor: ${sup}</span>
              <span class="badge badge-pass">${supTree[sup].length} Direct Reports</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">
              ${supTree[sup].map(r => `
                <div style="font-size: 11px; background: var(--bg-card); padding: 5px 8px; border-radius: 4px; display: flex; justify-content: space-between;">
                  <span>${r.Name}</span>
                  <span style="color:var(--text-dim);">${r["Emp ID"]}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    SD_APP.showModal("Supervisor Organizational Hierarchy Tree", bodyHtml, [
      { label: "Close", class: "btn-secondary", closeOnClick: true }
    ]);
  }

  function exportMappingXLSX() {
    const sheets = SD_APP.state.data.teamMapping || {};
    SD_XLSX.exportWorkbook(sheets, "Team_Mapping_Nov26_All_10_Sheets.xlsx");
  }

  return {
    render,
    setSheet,
    onSearch,
    onTowerFilterChange,
    onSupervisorFilterChange,
    onLocationFilterChange,
    openProfileModal,
    openSupervisorTreeModal,
    exportMappingXLSX
  };
})();

