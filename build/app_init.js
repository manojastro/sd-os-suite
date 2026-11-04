// build/app_init.js
// Global Router, Navigation, Theme Toggler, Global Search, and App Startup

const SD_NAV = (function() {
  let activeModule = "home";

  const moduleTitles = {
    home: "Operations Command & Decision Center",
    audit: "Auditing Portal",
    vault: "Data Vault Replacement",
    analysis: "Data Analysis Agent",
    shifts: "Shift Tracker & Workforce Planning",
    tasks: "Tasks & Open Items",
    ranking: "Stack Ranking & Performance",
    mapping: "Team Mapping & Directory",
    settings: "Settings & System Diagnostics"
  };

  function navigateTo(moduleId) {
    activeModule = moduleId;

    // Update Sidebar Navigation
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
      if (item.getAttribute("data-module") === moduleId) {
        item.classList.add("active");
      }
    });

    // Update Top Header
    const titleEl = document.getElementById("header-section-title");
    if (titleEl) titleEl.textContent = moduleTitles[moduleId] || "SD OS Suite";

    // Switch View Containers
    document.querySelectorAll(".module-view").forEach(v => v.classList.remove("active"));
    const targetView = document.getElementById(`view-${moduleId}`);
    if (targetView) targetView.classList.add("active");

    // Render Module
    if (moduleId === "home") SD_HOME.render();
    else if (moduleId === "audit") SD_AUDIT.render();
    else if (moduleId === "vault") SD_VAULT.render();
    else if (moduleId === "analysis") SD_ANALYSIS.render();
    else if (moduleId === "shifts") SD_SHIFTS.render();
    else if (moduleId === "tasks") SD_TASKS.render();
    else if (moduleId === "ranking") SD_RANKING.render();
    else if (moduleId === "mapping") SD_MAPPING.render();
    else if (moduleId === "settings") SD_SETTINGS.render();

    // Scroll to top
    const content = document.getElementById("content-container");
    if (content) content.scrollTop = 0;
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    SD_APP.state.settings.theme = newTheme;
    SD_APP.saveToStorage();

    const icon = document.getElementById("theme-toggle-icon");
    if (icon) {
      icon.innerHTML = newTheme === "dark" ?
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>` :
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
    SD_APP.toast(`Theme set to ${newTheme.toUpperCase()} mode.`, "info");
  }

  function handleGlobalSearch(query) {
    if (!query || query.trim().length < 2) return;
    const q = query.toLowerCase().trim();

    // Check if searching for analyst
    const teamMapping = SD_APP.state.data.teamMapping;
    if (teamMapping) {
      for (const sheet of Object.keys(teamMapping)) {
        const found = teamMapping[sheet].find(e => (e.Name || "").toLowerCase().includes(q) || (e["Emp ID"] || "").toLowerCase() === q);
        if (found) {
          SD_NAV.navigateTo('mapping');
          SD_MAPPING.onSearch(found.Name);
          SD_APP.toast(`Found employee: ${found.Name} (${found["Emp ID"]})`, "success");
          return;
        }
      }
    }

    // Check tasks
    const tasks = SD_APP.state.data.tasks || [];
    const foundTask = tasks.find(t => (t.title || "").toLowerCase().includes(q) || (t.id || "").toLowerCase() === q);
    if (foundTask) {
      SD_NAV.navigateTo('tasks');
      SD_TASKS.onSearch(foundTask.id);
      SD_APP.toast(`Found Task: ${foundTask.id}`, "success");
      return;
    }

    SD_APP.toast(`No direct match found for "${query}".`, "info");
  }

  function init() {
    // 1. Initialize State & Data
    SD_APP.initData();

    // 2. Set saved theme
    const savedTheme = SD_APP.state.settings.theme || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    // 3. Setup Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        SD_APP.closeModal();
      }
    });

    // 4. Initial Navigation
    navigateTo("home");
  }

  return {
    navigateTo,
    toggleTheme,
    handleGlobalSearch,
    init
  };
})();

// Bootstrap on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
  SD_NAV.init();
});

