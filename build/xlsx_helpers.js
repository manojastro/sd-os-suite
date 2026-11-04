// build/xlsx_helpers.js
// Advanced Excel (XLSX) import/export pipeline for SD OS Suite

const SD_XLSX = (function() {
  function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
  }

  // Export any multi-sheet data object { sheetName: [ {col: val}, ... ] }
  function exportWorkbook(sheetsMap, fileName = "SD_OS_Export.xlsx") {
    if (typeof XLSX === "undefined") {
      SD_APP.toast("Spreadsheet library not loaded.", "error");
      return;
    }

    const wb = XLSX.utils.book_new();

    Object.keys(sheetsMap).forEach(sheetName => {
      const rawRows = sheetsMap[sheetName];
      if (!rawRows || !Array.isArray(rawRows)) return;

      // Clean & escape formula injection for text
      const cleanRows = rawRows.map(row => {
        const cRow = {};
        Object.keys(row).forEach(k => {
          cRow[k] = SD_APP.escapeFormula(row[k]);
        });
        return cRow;
      });

      const ws = XLSX.utils.json_to_sheet(cleanRows, { cellDates: true });

      // Calculate reasonable column widths
      if (cleanRows.length > 0) {
        const colWidths = Object.keys(cleanRows[0]).map(colKey => {
          const maxLen = Math.max(
            colKey.length,
            ...cleanRows.slice(0, 50).map(r => String(r[colKey] || "").length)
          );
          return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
        });
        ws["!cols"] = colWidths;
      }

      // Freeze header row
      ws["!freeze"] = { xSplit: "A", ySplit: "1" };

      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31)); // Max 31 chars in sheet name
    });

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    SD_APP.toast(`Exported ${fileName} successfully.`, "success");
  }

  // Specialized Exporter: Infra SD Voice Shift Schedule Nov'26 Format
  function exportVoiceRosterFormatted(rosterList, teamName = "Infra Voice") {
    if (typeof XLSX === "undefined") {
      SD_APP.toast("Spreadsheet library not loaded.", "error");
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Planned Shift
    const wsData = [];
    
    // Title row
    wsData.push([`Infra SD Voice Shift Schedule - Nov'26 (${teamName})`, "", "", "", "", "Weeks 2-29 Nov 2026"]);
    
    // Header row
    const headers = ["Role", "ID", "Name", "Location", "Supervisor Name"];
    for (let day = 1; day <= 28; day++) {
      const d = new Date(2026, 10, 1 + day);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      headers.push(`${dayNames[d.getDay()]} ${day} Nov`);
    }
    wsData.push(headers);

    // Data rows
    rosterList.forEach(agent => {
      const row = [
        agent.role || "Voice SD Analyst",
        agent.id,
        agent.name,
        agent.location || "Bangalore",
        agent.supervisor || "Arun Kumar"
      ];
      if (agent.shifts && Array.isArray(agent.shifts)) {
        agent.shifts.forEach(shift => {
          row.push(SD_APP.escapeFormula(shift));
        });
      }
      wsData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 18 },
      ...new Array(28).fill({ wch: 13 })
    ];
    ws["!freeze"] = { xSplit: "F", ySplit: "2" };

    XLSX.utils.book_append_sheet(wb, ws, "Planned Shift");

    // Sheet 2: Agent Workload & Fairness Summary
    const summaryData = rosterList.map(a => {
      const shifts = a.shifts || [];
      const workDays = shifts.filter(s => s !== "OFF" && s !== "LEAVE" && s !== "COMP-OFF").length;
      const offDays = shifts.filter(s => s === "OFF").length;
      const leaves = shifts.filter(s => s === "LEAVE" || s === "COMP-OFF").length;
      const nightShifts = shifts.filter(s => s === "2100 - 0700" || s === "1800 - 0400").length;
      return {
        "Emp ID": a.id,
        "Name": a.name,
        "Role": a.role,
        "Working Days": workDays,
        "Off Days": offDays,
        "Leave / Comp-Off": leaves,
        "Night Shifts": nightShifts,
        "Total Planned Hours": workDays * 10
      };
    });
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Agent Summary");

    // Sheet 3: Assumptions & Policies
    const assumptions = [
      { "Parameter": "Planning Timezone", "Configured Value": "Asia/Kolkata (IST)" },
      { "Parameter": "Operational Day Cutoff", "Configured Value": "07:00 IST" },
      { "Parameter": "Shift Length", "Configured Value": "10 Hours (with 1h lunch/breaks)" },
      { "Parameter": "Minimum Rest Period", "Configured Value": "10 Hours between shifts" },
      { "Parameter": "Maximum Consecutive Working Days", "Configured Value": "6 Days" },
      { "Parameter": "Maximum Weekly Working Days", "Configured Value": "5 Days per defined week" },
      { "Parameter": "Voice Target SLA", "Configured Value": "80% answered within 20s" },
      { "Parameter": "Planned Shrinkage", "Configured Value": "25% (leave, breaks, training)" },
      { "Parameter": "Genesys IVR Go-Live Assumption", "Configured Value": "20 Nov 2026: -15% Voice call volume reduction" }
    ];
    const wsAssump = XLSX.utils.json_to_sheet(assumptions);
    XLSX.utils.book_append_sheet(wb, wsAssump, "Forecast Assumptions");

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Infra_SD_Voice_Shift_Schedule_Nov26.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    SD_APP.toast(`Exported Infra SD Voice Shift Schedule Nov'26 successfully.`, "success");
  }

  // Parse any uploaded XLSX or CSV file
  function parseWorkbookFile(file, callback) {
    if (typeof XLSX === "undefined") {
      SD_APP.toast("Spreadsheet library not loaded.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const result = {
          fileName: file.name,
          sheetNames: wb.SheetNames,
          sheets: {}
        };

        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(ws, { defval: null });
          result.sheets[sheetName] = json;
        });

        callback(null, result);
      } catch (err) {
        console.error("Error reading workbook file:", err);
        callback(err, null);
      }
    };
    reader.onerror = function(err) {
      callback(err, null);
    };
    reader.readAsArrayBuffer(file);
  }

  return {
    exportWorkbook,
    exportVoiceRosterFormatted,
    parseWorkbookFile
  };
})();

