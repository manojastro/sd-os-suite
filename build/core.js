// build/core.js
// State management, storage, modal, toast, and core utilities for SD OS Suite

const SD_APP = (function() {
  const STORAGE_PREFIX = "SD_OS_v2_";

  // Default Operational Settings
  const defaultSettings = {
    timezone: "Asia/Kolkata",
    operationalCutoffHour: 7, // 07:00 AM cutoff
    slaTargetPercent: 80,
    slaTargetSeconds: 20,
    shrinkagePercent: 25,
    maxOccupancyPercent: 85,
    minRestHours: 10,
    maxConsecutiveDays: 6,
    maxWeeklyWorkingDays: 5,
    theme: "dark",
    gateway: {
      baseUrl: "https://api.openai.com/v1",
      chatModel: "gpt-4o",
      sttModel: "whisper-1",
      chatPath: "/chat/completions",
      transcriptionPath: "/audio/transcriptions",
      authHeaderType: "Bearer", // "Bearer" or "api-key"
      timeoutMs: 30000,
      persistKey: false
    }
  };

  // Central Application State
  const state = {
    settings: { ...defaultSettings },
    apiKeySession: "",
    datasetStatus: {
      teamMapping: "SIMULATED",
      voiceSchedule: "SIMULATED",
      intervalVolume: "SIMULATED",
      tickets: "SIMULATED",
      stackRanking: "SIMULATED",
      tasks: "SIMULATED"
    },
    data: {
      teamMapping: null,
      voiceSchedule: null,
      intervalVolume: null,
      tickets: null,
      stackRanking: null,
      tasks: [],
      auditHistory: []
    },
    activeFilters: {
      team: "All",
      supervisor: "All",
      location: "All",
      dateFrom: "",
      dateTo: ""
    },
    reconciliationLines: [
      { key: "Total Tickets", expected: 2240 },
      { key: "Infra Voice", expected: 720 },
      { key: "Infra Chat", expected: 640 },
      { key: "Infra Web", expected: 480 },
      { key: "EUCS L2", expected: 310 },
      { key: "Priority P1 - Critical", expected: 45 },
      { key: "Priority P2 - High", expected: 269 },
      { key: "State Resolved", expected: 2173 },
      { key: "Category Password Reset", expected: 492 },
      { key: "Unknown Legacy Queue", expected: 120 }
    ]
  };

  // Toast Notification System
  function toast(message, type = "info", duration = 4000) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    
    let iconSvg = "";
    if (type === "success") {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
    } else if (type === "warning") {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else if (type === "error" || type === "danger") {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    el.innerHTML = `
      ${iconSvg}
      <div style="flex:1;">${escapeHtml(message)}</div>
      <button style="background:none; border:none; color:var(--text-dim); cursor:pointer;" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(el);
    setTimeout(() => {
      if (el.parentElement) el.remove();
    }, duration);
  }

  // Modal Dialog System
  function showModal(title, bodyHtml, footerButtons = []) {
    const overlay = document.getElementById("global-modal-overlay");
    const titleEl = document.getElementById("global-modal-title");
    const bodyEl = document.getElementById("global-modal-body");
    const footerEl = document.getElementById("global-modal-footer");

    if (!overlay || !bodyEl) return;

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;
    footerEl.innerHTML = "";

    if (footerButtons.length === 0) {
      footerButtons.push({
        label: "Close",
        class: "btn-secondary",
        onClick: () => closeModal()
      });
    }

    footerButtons.forEach(btn => {
      const b = document.createElement("button");
      b.className = `btn ${btn.class || "btn-secondary"}`;
      b.textContent = btn.label;
      b.onclick = () => {
        if (btn.onClick) btn.onClick();
        if (btn.closeOnClick !== false) closeModal();
      };
      footerEl.appendChild(b);
    });

    overlay.classList.add("active");
  }

  function closeModal() {
    const overlay = document.getElementById("global-modal-overlay");
    if (overlay) overlay.classList.remove("active");
  }

  // Utility: Escape HTML
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Utility: Escape CSV / XLSX Formula Injection
  function escapeFormula(val) {
    if (typeof val === "string" && /^[=+\-@]/.test(val)) {
      return `'${val}`;
    }
    return val;
  }

  // Date utilities (Asia/Kolkata 07:00 cutoff)
  function getOperationalDate(dateInput, cutoffHour = 7) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    const adjusted = new Date(d.getTime() - cutoffHour * 3600000);
    return adjusted.toISOString().slice(0, 10);
  }

  function getOverallDatasetBadge() {
    const statuses = Object.values(state.datasetStatus);
    const hasReal = statuses.includes("REAL");
    const hasSim = statuses.includes("SIMULATED");
    if (hasReal && hasSim) return "MIXED";
    if (hasReal) return "REAL";
    if (hasSim) return "SIMULATED";
    return "NOT LOADED";
  }

  // LocalStorage Persistence
  function saveToStorage() {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}settings`, JSON.stringify(state.settings));
      localStorage.setItem(`${STORAGE_PREFIX}tasks`, JSON.stringify(state.data.tasks));
      localStorage.setItem(`${STORAGE_PREFIX}auditHistory`, JSON.stringify(state.data.auditHistory));
      localStorage.setItem(`${STORAGE_PREFIX}reconciliation`, JSON.stringify(state.reconciliationLines));
      if (state.settings.gateway.persistKey && state.apiKeySession) {
        localStorage.setItem(`${STORAGE_PREFIX}apiKey`, state.apiKeySession);
      } else {
        localStorage.removeItem(`${STORAGE_PREFIX}apiKey`);
      }
    } catch (e) {
      console.warn("Storage quota exceeded or storage unavailable:", e);
      toast("Browser storage quota reached. Large changes could not be saved to localStorage.", "warning");
    }
  }

  function loadFromStorage() {
    try {
      const savedSettings = localStorage.getItem(`${STORAGE_PREFIX}settings`);
      if (savedSettings) state.settings = { ...defaultSettings, ...JSON.parse(savedSettings) };

      const savedTasks = localStorage.getItem(`${STORAGE_PREFIX}tasks`);
      if (savedTasks) state.data.tasks = JSON.parse(savedTasks);

      const savedAudits = localStorage.getItem(`${STORAGE_PREFIX}auditHistory`);
      if (savedAudits) state.data.auditHistory = JSON.parse(savedAudits);

      const savedRecon = localStorage.getItem(`${STORAGE_PREFIX}reconciliation`);
      if (savedRecon) state.reconciliationLines = JSON.parse(savedRecon);

      const savedKey = localStorage.getItem(`${STORAGE_PREFIX}apiKey`);
      if (savedKey && state.settings.gateway.persistKey) {
        state.apiKeySession = savedKey;
      }
    } catch (e) {
      console.error("Error reading from localStorage:", e);
    }
  }

  function exportBackupJSON() {
    const backupObj = {
      app: "SD_OS_Suite",
      version: "2.0",
      exportDate: new Date().toISOString(),
      settings: state.settings,
      tasks: state.data.tasks,
      auditHistory: state.data.auditHistory,
      reconciliationLines: state.reconciliationLines
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SD_OS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Full system backup exported successfully.", "success");
  }

  function importBackupJSON(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.app !== "SD_OS_Suite") {
          toast("Invalid backup file format.", "error");
          return;
        }
        if (parsed.settings) state.settings = { ...defaultSettings, ...parsed.settings };
        if (parsed.tasks) state.data.tasks = parsed.tasks;
        if (parsed.auditHistory) state.data.auditHistory = parsed.auditHistory;
        if (parsed.reconciliationLines) state.reconciliationLines = parsed.reconciliationLines;
        saveToStorage();
        toast("Backup restored successfully! Refreshing view...", "success");
        setTimeout(() => location.reload(), 1000);
      } catch (err) {
        toast("Failed to parse backup JSON file.", "error");
      }
    };
    reader.readAsText(file);
  }

  // Load Seeded Data Initially
  function initData() {
    loadFromStorage();
    const seeds = SD_DATA_GENERATOR.generateAll();
    state.data.teamMapping = seeds.teamMapping;
    state.data.voiceSchedule = seeds.voiceSchedule;
    state.data.intervalVolume = seeds.intervalVolume;
    state.data.tickets = seeds.tickets;
    state.data.stackRanking = seeds.stackRanking;
    
    // Only use seed tasks if none in storage
    if (!state.data.tasks || state.data.tasks.length === 0) {
      state.data.tasks = seeds.tasks;
    }
    // Seed at least one sample into history if empty
    if (!state.data.auditHistory || state.data.auditHistory.length === 0) {
      state.data.auditHistory = [
        {
          id: "AUD-HIST-01",
          ref: "CALL-8012",
          agent: "Ananya Kumar",
          channel: "Call",
          date: "2026-11-03",
          score: 95.0,
          verdict: "Pass",
          summary: "Outstanding troubleshooting of VPN gateway maintenance issue with proper Quick Assist consent.",
          rubricVersion: "v2.0"
        },
        {
          id: "AUD-HIST-02",
          ref: "INC001399",
          agent: "Deepak Rao",
          channel: "Ticket",
          date: "2026-11-02",
          score: 42.5,
          verdict: "Fatal – Security",
          summary: "CRITICAL: Bypassed employee verification before issuing MFA reset code due to urgency pressure.",
          rubricVersion: "v2.0"
        }
      ];
    }
  }

  return {
    state,
    toast,
    showModal,
    closeModal,
    escapeHtml,
    escapeFormula,
    getOperationalDate,
    getOverallDatasetBadge,
    saveToStorage,
    exportBackupJSON,
    importBackupJSON,
    initData
  };
})();

