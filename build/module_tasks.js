// build/module_tasks.js
// Tasks & Open Items: Kanban Drag-and-Drop, Sortable Table, SVG Gantt Timeline, and Seeded Genesys IVR Milestones

const SD_TASKS = (function() {
  let activeView = "kanban"; // "kanban", "table", "gantt"
  let searchQuery = "";
  let statusFilter = "All";
  let priorityFilter = "All";

  function render() {
    const container = document.getElementById("view-tasks");
    if (!container) return;

    const allTasks = SD_APP.state.data.tasks || [];
    
    // Filter tasks
    const filtered = allTasks.filter(t => {
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (t.title || "").toLowerCase().includes(q);
        const matchOwner = (t.owner || "").toLowerCase().includes(q);
        const matchId = (t.id || "").toLowerCase().includes(q);
        if (!matchTitle && !matchOwner && !matchId) return false;
      }
      return true;
    });

    const openCount = allTasks.filter(t => t.status === "Open").length;
    const inProgCount = allTasks.filter(t => t.status === "In Progress").length;
    const blockedCount = allTasks.filter(t => t.status === "Blocked").length;
    const doneCount = allTasks.filter(t => t.status === "Done").length;
    const overdueCount = allTasks.filter(t => t.status !== "Done" && new Date(t.dueDate) < new Date("2026-11-04")).length;

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="font-size: 20px; font-weight: 700; color: var(--text-main);">Tasks & Open Items</h2>
          <div style="font-size: 13px; color: var(--text-muted);">
            Manage operational action items, audit coaching, staffing remediations, and Genesys IVR go-live milestones (Target: 20 Nov 2026).
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary btn-sm" onclick="SD_TASKS.openNewTaskModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Task
          </button>
          <button class="btn btn-secondary btn-sm" onclick="SD_TASKS.exportTasksXLSX()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Tasks XLSX
          </button>
        </div>
      </div>

      <!-- Quick KPI Counters -->
      <div class="grid-5" style="margin-bottom: 18px;">
        <div class="stat-card" style="padding: 12px 14px;" onclick="SD_TASKS.filterByStatus('Open')">
          <div class="stat-label">OPEN</div>
          <div class="stat-value" style="font-size: 22px;">${openCount}</div>
        </div>
        <div class="stat-card" style="padding: 12px 14px;" onclick="SD_TASKS.filterByStatus('In Progress')">
          <div class="stat-label">IN PROGRESS</div>
          <div class="stat-value" style="font-size: 22px; color: var(--primary);">${inProgCount}</div>
        </div>
        <div class="stat-card" style="padding: 12px 14px;" onclick="SD_TASKS.filterByStatus('Blocked')">
          <div class="stat-label">BLOCKED</div>
          <div class="stat-value" style="font-size: 22px; color: var(--danger);">${blockedCount}</div>
        </div>
        <div class="stat-card" style="padding: 12px 14px;" onclick="SD_TASKS.filterByStatus('Done')">
          <div class="stat-label">COMPLETED</div>
          <div class="stat-value" style="font-size: 22px; color: var(--success);">${doneCount}</div>
        </div>
        <div class="stat-card" style="padding: 12px 14px;">
          <div class="stat-label">OVERDUE ITEMS</div>
          <div class="stat-value" style="font-size: 22px; color: ${overdueCount > 0 ? 'var(--danger)' : 'var(--success)'};">${overdueCount}</div>
        </div>
      </div>

      <!-- Filter & View Switcher Bar -->
      <div class="filter-bar" style="justify-content: space-between; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div class="global-search-container" style="width: 220px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search tasks..." value="${searchQuery}" oninput="SD_TASKS.onSearch(this.value)">
          </div>

          <select class="form-control" style="width: auto;" onchange="SD_TASKS.onStatusFilterChange(this.value)">
            <option value="All" ${statusFilter === 'All' ? 'selected' : ''}>All Statuses</option>
            <option value="Open" ${statusFilter === 'Open' ? 'selected' : ''}>Open</option>
            <option value="In Progress" ${statusFilter === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Blocked" ${statusFilter === 'Blocked' ? 'selected' : ''}>Blocked</option>
            <option value="Done" ${statusFilter === 'Done' ? 'selected' : ''}>Done</option>
          </select>

          <select class="form-control" style="width: auto;" onchange="SD_TASKS.onPriorityFilterChange(this.value)">
            <option value="All" ${priorityFilter === 'All' ? 'selected' : ''}>All Priorities</option>
            <option value="High" ${priorityFilter === 'High' ? 'selected' : ''}>High</option>
            <option value="Medium" ${priorityFilter === 'Medium' ? 'selected' : ''}>Medium</option>
            <option value="Low" ${priorityFilter === 'Low' ? 'selected' : ''}>Low</option>
          </select>
        </div>

        <!-- View Switcher -->
        <div style="display: inline-flex; border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
          <button class="btn btn-sm ${activeView === 'kanban' ? 'btn-primary' : 'btn-secondary'}" style="border-radius:0;" onclick="SD_TASKS.setView('kanban')">Kanban Board</button>
          <button class="btn btn-sm ${activeView === 'table' ? 'btn-primary' : 'btn-secondary'}" style="border-radius:0;" onclick="SD_TASKS.setView('table')">List Table</button>
          <button class="btn btn-sm ${activeView === 'gantt' ? 'btn-primary' : 'btn-secondary'}" style="border-radius:0;" onclick="SD_TASKS.setView('gantt')">Gantt Timeline</button>
        </div>
      </div>

      <!-- VIEW 1: KANBAN BOARD -->
      <div id="tasks-kanban-view" style="display: ${activeView === 'kanban' ? 'block' : 'none'};">
        <div class="kanban-board">
          ${renderKanbanColumn("Open", "Open", filtered.filter(t => t.status === "Open"), "var(--text-muted)")}
          ${renderKanbanColumn("In Progress", "In Progress", filtered.filter(t => t.status === "In Progress"), "var(--primary)")}
          ${renderKanbanColumn("Blocked", "Blocked", filtered.filter(t => t.status === "Blocked"), "var(--danger)")}
          ${renderKanbanColumn("Done", "Done", filtered.filter(t => t.status === "Done"), "var(--success)")}
        </div>
      </div>

      <!-- VIEW 2: LIST TABLE -->
      <div id="tasks-table-view" style="display: ${activeView === 'table' ? 'block' : 'none'};">
        <div class="card">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Title & Description</th>
                  <th>Owner</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Due Date</th>
                  <th>Source Module</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(t => {
                  const isOverdue = t.status !== "Done" && new Date(t.dueDate) < new Date("2026-11-04");
                  return `
                    <tr>
                      <td><strong>${t.id}</strong></td>
                      <td style="max-width: 300px; white-space: normal;">
                        <div style="font-weight: 600; color: var(--text-main);">${SD_APP.escapeHtml(t.title)}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${SD_APP.escapeHtml(t.description)}</div>
                      </td>
                      <td>${SD_APP.escapeHtml(t.owner)}</td>
                      <td>
                        <span class="badge ${t.priority === 'High' ? 'badge-fail' : (t.priority === 'Medium' ? 'badge-needs-imp' : 'badge-pass')}">${t.priority}</span>
                      </td>
                      <td>
                        <select class="form-control" style="padding: 2px 6px; font-size: 11px; width: auto;" onchange="SD_TASKS.updateTaskStatus('${t.id}', this.value)">
                          <option value="Open" ${t.status === 'Open' ? 'selected' : ''}>Open</option>
                          <option value="In Progress" ${t.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                          <option value="Blocked" ${t.status === 'Blocked' ? 'selected' : ''}>Blocked</option>
                          <option value="Done" ${t.status === 'Done' ? 'selected' : ''}>Done</option>
                        </select>
                      </td>
                      <td>${t.startDate || 'N/A'}</td>
                      <td style="color: ${isOverdue ? 'var(--danger)' : 'var(--text-main)'}; font-weight: ${isOverdue ? '700' : 'normal'};">
                        ${t.dueDate} ${isOverdue ? '⚠️' : ''}
                      </td>
                      <td><span class="badge badge-needs-imp">${t.source || 'Operational'}</span></td>
                      <td>
                        <button class="btn btn-secondary btn-sm" onclick="SD_TASKS.openEditModal('${t.id}')">Edit</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VIEW 3: GANTT TIMELINE -->
      <div id="tasks-gantt-view" style="display: ${activeView === 'gantt' ? 'block' : 'none'};">
        <div class="card">
          <div class="card-header">
            <div>
              <span class="card-title">Interactive SVG Project Gantt Timeline</span>
              <div class="card-subtitle">Red line indicates Current Local Time (2026-11-04). Diamond marks Genesys IVR Go-Live (20 Nov 2026).</div>
            </div>
            <span class="badge badge-pass">MILESTONE TRACKER</span>
          </div>
          <div class="gantt-container">
            ${renderGanttChart(filtered)}
          </div>
        </div>
      </div>
    `;
  }

  function renderKanbanColumn(title, statusKey, columnTasks, color) {
    return `
      <div class="kanban-column" ondragover="SD_TASKS.onDragOver(event)" ondrop="SD_TASKS.onDrop(event, '${statusKey}')">
        <div class="kanban-col-header" style="border-top: 3px solid ${color};">
          <span>${title}</span>
          <span class="badge" style="background: var(--bg-tertiary);">${columnTasks.length}</span>
        </div>
        <div class="kanban-cards">
          ${columnTasks.map(t => {
            const isOverdue = t.status !== "Done" && new Date(t.dueDate) < new Date("2026-11-04");
            const completedSub = (t.subtasks || []).filter(s => s.done).length;
            const totalSub = (t.subtasks || []).length;

            return `
              <div class="kanban-card" draggable="true" ondragstart="SD_TASKS.onDragStart(event, '${t.id}')" onclick="SD_TASKS.openEditModal('${t.id}')">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                  <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: var(--primary);">${t.id}</span>
                  <span class="badge ${t.priority === 'High' ? 'badge-fail' : (t.priority === 'Medium' ? 'badge-needs-imp' : 'badge-pass')}">${t.priority}</span>
                </div>
                <div style="font-weight: 600; font-size: 12px; color: var(--text-main); margin-bottom: 6px; line-height: 1.3;">
                  ${SD_APP.escapeHtml(t.title)}
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">
                  Owner: <strong>${SD_APP.escapeHtml(t.owner)}</strong>
                </div>
                ${totalSub > 0 ? `
                  <div style="font-size: 10px; color: var(--text-dim); margin-bottom: 6px;">
                    Checklist: ${completedSub}/${totalSub} completed
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 6px; font-size: 11px;">
                  <span style="color: ${isOverdue ? 'var(--danger)' : 'var(--text-dim)'}; font-weight: ${isOverdue ? '700' : 'normal'};">
                    Due: ${t.dueDate}
                  </span>
                  <span class="badge badge-needs-imp" style="font-size: 9px;">${t.source || 'General'}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderGanttChart(tasks) {
    const minDate = new Date("2026-10-25");
    const maxDate = new Date("2026-11-30");
    const totalDays = Math.round((maxDate - minDate) / 86400000);
    const dayWidth = 26;
    const totalWidth = totalDays * dayWidth;
    const today = new Date("2026-11-04");
    const todayOffset = Math.round((today - minDate) / 86400000) * dayWidth;
    const milestoneDate = new Date("2026-11-20");
    const milestoneOffset = Math.round((milestoneDate - minDate) / 86400000) * dayWidth;

    const rowHeight = 36;
    const chartHeight = tasks.length * rowHeight + 60;

    let svg = `
      <svg width="${totalWidth + 240}" height="${chartHeight}" style="font-family: inherit; font-size: 11px;">
        <!-- Header background -->
        <rect x="0" y="0" width="${totalWidth + 240}" height="40" fill="var(--bg-tertiary)"/>
        
        <!-- Today Line -->
        <line x1="${240 + todayOffset}" y1="0" x2="${240 + todayOffset}" y2="${chartHeight}" stroke="#ef4444" stroke-width="2" stroke-dasharray="4"/>
        <text x="${240 + todayOffset + 4}" y="14" fill="#ef4444" font-weight="bold" font-size="10">TODAY (Nov 4)</text>

        <!-- Genesys Go-Live Milestone Line -->
        <line x1="${240 + milestoneOffset}" y1="0" x2="${240 + milestoneOffset}" y2="${chartHeight}" stroke="#8b5cf6" stroke-width="2"/>
        <polygon points="${240 + milestoneOffset},25 ${240 + milestoneOffset + 6},31 ${240 + milestoneOffset},37 ${240 + milestoneOffset - 6},31" fill="#8b5cf6"/>
        <text x="${240 + milestoneOffset + 8}" y="35" fill="#8b5cf6" font-weight="bold" font-size="10">GO-LIVE (Nov 20)</text>

        <!-- Days scale -->
    `;

    for (let d = 0; d < totalDays; d++) {
      const cur = new Date(minDate.getTime() + d * 86400000);
      const isMon = cur.getDay() === 1;
      const x = 240 + d * dayWidth;
      svg += `
        <line x1="${x}" y1="20" x2="${x}" y2="${chartHeight}" stroke="var(--border-color)" stroke-width="0.5"/>
        ${isMon ? `<text x="${x + 2}" y="32" fill="var(--text-dim)" font-size="10">${cur.getDate()} Nov</text>` : ''}
      `;
    }

    // Render task bars
    tasks.forEach((t, idx) => {
      const y = 50 + idx * rowHeight;
      const sDate = new Date(t.startDate || "2026-11-01");
      const dDate = new Date(t.dueDate || "2026-11-15");
      const startX = 240 + Math.max(0, Math.round((sDate - minDate) / 86400000)) * dayWidth;
      const barWidth = Math.max(dayWidth, Math.round((dDate - sDate) / 86400000) * dayWidth);

      let barColor = "var(--primary)";
      if (t.status === "Blocked") barColor = "var(--danger)";
      else if (t.status === "Done") barColor = "var(--success)";
      else if (t.priority === "High") barColor = "var(--warning)";

      svg += `
        <!-- Task label -->
        <text x="10" y="${y + 16}" fill="var(--text-main)" font-weight="500" font-size="11">
          ${t.id}: ${SD_APP.escapeHtml(t.title).slice(0, 28)}...
        </text>
        
        <!-- Task Bar -->
        <rect x="${startX}" y="${y + 4}" width="${barWidth}" height="18" rx="4" fill="${barColor}" opacity="0.85" style="cursor: pointer;" onclick="SD_TASKS.openEditModal('${t.id}')">
          <title>${t.title} (${t.startDate} to ${t.dueDate})</title>
        </rect>
        <text x="${startX + 6}" y="${y + 17}" fill="white" font-size="10" font-weight="600">
          ${t.owner} (${t.status})
        </text>
      `;
    });

    svg += `</svg>`;
    return svg;
  }

  // Drag and Drop handlers
  let draggedTaskId = null;
  function onDragStart(event, taskId) {
    draggedTaskId = taskId;
    event.dataTransfer.setData("text/plain", taskId);
  }
  function onDragOver(event) {
    event.preventDefault();
  }
  function onDrop(event, targetStatus) {
    event.preventDefault();
    if (!draggedTaskId) return;
    updateTaskStatus(draggedTaskId, targetStatus);
    draggedTaskId = null;
  }

  function updateTaskStatus(taskId, newStatus) {
    const task = SD_APP.state.data.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = newStatus;
      SD_APP.saveToStorage();
      render();
      SD_APP.toast(`Updated ${taskId} to ${newStatus}.`, "info");
    }
  }

  function setView(view) {
    activeView = view;
    render();
  }

  function onSearch(q) {
    searchQuery = q;
    render();
  }

  function onStatusFilterChange(s) {
    statusFilter = s;
    render();
  }

  function onPriorityFilterChange(p) {
    priorityFilter = p;
    render();
  }

  function filterByStatus(s) {
    statusFilter = s;
    render();
  }

  function openNewTaskModal() {
    const newId = `TSK-${Math.floor(Math.random() * 899 + 100)}`;
    const bodyHtml = `
      <div>
        <div class="form-group">
          <label class="form-label">Task ID</label>
          <input type="text" id="task-modal-id" class="form-control" value="${newId}" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" id="task-modal-title" class="form-control" placeholder="Enter concise task title...">
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="task-modal-desc" class="form-control" style="height: 70px;" placeholder="Detailed action item description..."></textarea>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          <div class="form-group">
            <label class="form-label">Owner</label>
            <input type="text" id="task-modal-owner" class="form-control" value="Arun Kumar" list="audit-analyst-list">
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select id="task-modal-priority" class="form-control">
              <option value="High">High</option>
              <option value="Medium" selected>Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input type="date" id="task-modal-start" class="form-control" value="2026-11-04">
          </div>
          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" id="task-modal-due" class="form-control" value="2026-11-18">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Source Module</label>
          <input type="text" id="task-modal-source" class="form-control" value="Operational Action Item">
        </div>
      </div>
    `;

    SD_APP.showModal("Create New Operational Task", bodyHtml, [
      { label: "Cancel", class: "btn-secondary", closeOnClick: true },
      {
        label: "Create Task",
        class: "btn-primary",
        onClick: () => {
          const title = document.getElementById("task-modal-title").value.trim();
          if (!title) {
            SD_APP.toast("Title is required.", "warning");
            return;
          }
          const newTask = {
            id: newId,
            title: title,
            description: document.getElementById("task-modal-desc").value.trim(),
            owner: document.getElementById("task-modal-owner").value.trim(),
            priority: document.getElementById("task-modal-priority").value,
            status: "Open",
            startDate: document.getElementById("task-modal-start").value,
            dueDate: document.getElementById("task-modal-due").value,
            source: document.getElementById("task-modal-source").value.trim(),
            notes: "",
            subtasks: []
          };
          SD_APP.state.data.tasks.unshift(newTask);
          SD_APP.saveToStorage();
          render();
          SD_APP.toast(`Task ${newId} created successfully.`, "success");
        }
      }
    ]);
  }

  function openEditModal(taskId) {
    const task = SD_APP.state.data.tasks.find(t => t.id === taskId);
    if (!task) return;

    const subtasksHtml = (task.subtasks || []).map((s, idx) => `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <input type="checkbox" id="subtask-${idx}" ${s.done ? 'checked' : ''} onchange="SD_TASKS.toggleSubtask('${taskId}', ${idx})">
        <label for="subtask-${idx}" style="font-size: 12px; text-decoration: ${s.done ? 'line-through' : 'none'}; color: ${s.done ? 'var(--text-dim)' : 'var(--text-main)'};">${SD_APP.escapeHtml(s.text)}</label>
      </div>
    `).join('');

    const bodyHtml = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-family: monospace; font-size: 14px; font-weight: 700; color: var(--primary);">${task.id}</span>
          <span class="badge badge-needs-imp">${task.source || 'Operational'}</span>
        </div>
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" id="edit-task-title" class="form-control" value="${SD_APP.escapeHtml(task.title)}">
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="edit-task-desc" class="form-control" style="height: 70px;">${SD_APP.escapeHtml(task.description || '')}</textarea>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="edit-task-status" class="form-control">
              <option value="Open" ${task.status === 'Open' ? 'selected' : ''}>Open</option>
              <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Blocked" ${task.status === 'Blocked' ? 'selected' : ''}>Blocked</option>
              <option value="Done" ${task.status === 'Done' ? 'selected' : ''}>Done</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select id="edit-task-priority" class="form-control">
              <option value="High" ${task.priority === 'High' ? 'selected' : ''}>High</option>
              <option value="Medium" ${task.priority === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>Low</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Owner</label>
            <input type="text" id="edit-task-owner" class="form-control" value="${SD_APP.escapeHtml(task.owner)}">
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input type="date" id="edit-task-start" class="form-control" value="${task.startDate || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input type="date" id="edit-task-due" class="form-control" value="${task.dueDate || ''}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Checklist Action Items</label>
          <div style="background: var(--bg-tertiary); padding: 8px 12px; border-radius: var(--radius-md); max-height: 120px; overflow-y: auto;">
            ${subtasksHtml || '<div style="font-size:11px; color:var(--text-dim);">No subtasks defined.</div>'}
          </div>
        </div>
      </div>
    `;

    SD_APP.showModal(`Edit Task: ${task.id}`, bodyHtml, [
      {
        label: "Delete Task",
        class: "btn-danger",
        onClick: () => {
          SD_APP.state.data.tasks = SD_APP.state.data.tasks.filter(t => t.id !== taskId);
          SD_APP.saveToStorage();
          render();
          SD_APP.toast(`Deleted ${taskId}.`, "info");
        }
      },
      { label: "Cancel", class: "btn-secondary", closeOnClick: true },
      {
        label: "Save Changes",
        class: "btn-primary",
        onClick: () => {
          task.title = document.getElementById("edit-task-title").value.trim();
          task.description = document.getElementById("edit-task-desc").value.trim();
          task.status = document.getElementById("edit-task-status").value;
          task.priority = document.getElementById("edit-task-priority").value;
          task.owner = document.getElementById("edit-task-owner").value.trim();
          task.startDate = document.getElementById("edit-task-start").value;
          task.dueDate = document.getElementById("edit-task-due").value;
          SD_APP.saveToStorage();
          render();
          SD_APP.toast(`Saved changes to ${taskId}.`, "success");
        }
      }
    ]);
  }

  function toggleSubtask(taskId, subtaskIdx) {
    const task = SD_APP.state.data.tasks.find(t => t.id === taskId);
    if (task && task.subtasks && task.subtasks[subtaskIdx]) {
      task.subtasks[subtaskIdx].done = !task.subtasks[subtaskIdx].done;
      SD_APP.saveToStorage();
      render();
    }
  }

  function exportTasksXLSX() {
    const allTasks = SD_APP.state.data.tasks || [];
    const rows = allTasks.map(t => ({
      "Task ID": t.id,
      "Title": t.title,
      "Description": t.description,
      "Owner": t.owner,
      "Priority": t.priority,
      "Status": t.status,
      "Start Date": t.startDate,
      "Due Date": t.dueDate,
      "Source Module": t.source,
      "Notes": t.notes
    }));

    SD_XLSX.exportWorkbook({ "Operational Tasks": rows }, `Tasks_and_Open_Items.xlsx`);
  }

  return {
    render,
    setView,
    onSearch,
    onStatusFilterChange,
    onPriorityFilterChange,
    filterByStatus,
    onDragStart,
    onDragOver,
    onDrop,
    updateTaskStatus,
    openNewTaskModal,
    openEditModal,
    toggleSubtask,
    exportTasksXLSX
  };
})();

