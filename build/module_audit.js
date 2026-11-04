// build/module_audit.js
// Auditing Portal with Evidence-Led Scoring, Security Fatal Rules, Offline Rule-Engine, and Gateway Integration

const SD_AUDIT = (function() {
  const rubrics = {
    Call: [
      { id: "C1", name: "Professional Greeting & Introduction", weight: 0.05, desc: "Standard greeting, analyst name, and service desk identification." },
      { id: "C2", name: "Identity & Security Verification", weight: 0.15, desc: "Mandatory caller authentication (Emp ID, callback, or security challenge) before support." },
      { id: "C3", name: "Issue Confirmation & Active Listening", weight: 0.10, desc: "Paraphrasing user issue, validating urgency, and confirming affected system." },
      { id: "C4", name: "Technical Diagnosis & Troubleshooting", weight: 0.20, desc: "Logical, accurate troubleshooting steps following documented standard operating procedures." },
      { id: "C5", name: "Knowledge Base / SOP Compliance", weight: 0.10, desc: "Accurate utilization and citation of official KB articles and escalation procedures." },
      { id: "C6", name: "Remote Session Consent & Control", weight: 0.10, desc: "Explicit affirmative verbal consent obtained BEFORE initiating remote screen/control session." },
      { id: "C7", name: "Professional Tone & Empathy", weight: 0.10, desc: "Courteous, reassuring language without condescension, dismissiveness, or impatience." },
      { id: "C8", name: "Hold Procedure & Active Check-in", weight: 0.05, desc: "Proper hold permission requested, hold duration under 2 mins, and check-in etiquette." },
      { id: "C9", name: "Ticket Documentation & Resolution", weight: 0.10, desc: "Accurate work notes, category tagging, root cause, and clear resolution summary." },
      { id: "C10", name: "Closure Etiquette & Ticket Reference", weight: 0.05, desc: "Providing ticket number to user, offering further assistance, and professional closing." }
    ],
    Ticket: [
      { id: "T1", name: "Description & Worknotes Quality", weight: 0.10, desc: "Clear problem statement, detailed troubleshooting steps, and timestamps." },
      { id: "T2", name: "Queue Routing & Classification", weight: 0.10, desc: "Accurate category, priority, and assignment group classification." },
      { id: "T3", name: "Troubleshooting & Technical Accuracy", weight: 0.25, desc: "Systematic diagnosis adhering to SOPs and standard remediation steps." },
      { id: "T4", name: "Security, Approvals & Verification", weight: 0.20, desc: "Required manager/app approvals verified; no credentials logged in ticket text." },
      { id: "T5", name: "Customer Communication & Updates", weight: 0.15, desc: "Professional, timely customer-visible updates avoiding technical jargon." },
      { id: "T6", name: "Resolution Notes & KB Citation", weight: 0.20, desc: "Comprehensive resolution notes with cited KB article and verification of user confirmation." }
    ],
    Chat: [
      { id: "CH1", name: "Greeting & Identity Verification", weight: 0.15, desc: "Prompt welcome, analyst identification, and user identity validation." },
      { id: "CH2", name: "Response Speed & Active Engagement", weight: 0.15, desc: "Timely replies without prolonged unexplained gaps or dead air." },
      { id: "CH3", name: "Accurate Diagnosis & Guidance", weight: 0.25, desc: "Correct technical advice and structured step-by-step guidance." },
      { id: "CH4", name: "Security Compliance & Remote Consent", weight: 0.20, desc: "No plaintext credentials shared; explicit consent before screen share." },
      { id: "CH5", name: "Professional Tone & Empathy", weight: 0.15, desc: "Polite, empathetic tone; respectful handling of user frustration." },
      { id: "CH6", name: "Ticket Reference & Proper Wrap-Up", weight: 0.10, desc: "Incident number provided, user confirmation received, and closing greeting." }
    ]
  };

  let activeAuditResult = null;
  let debounceTimer = null;

  function render() {
    const container = document.getElementById("view-audit");
    if (!container) return;

    const seedSamples = SD_DATA_GENERATOR.generateAll().auditSamples;
    const historyList = SD_APP.state.data.auditHistory || [];

    // Calculate history stats
    const totalAudits = historyList.length;
    const fatalCount = historyList.filter(a => a.verdict === "Fatal – Security").length;
    const passCount = historyList.filter(a => a.verdict === "Pass").length;
    const avgScore = totalAudits > 0 ? (historyList.reduce((acc, a) => acc + a.score, 0) / totalAudits).toFixed(1) : "0.0";

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="font-size: 20px; font-weight: 700; color: var(--text-main);">Auditing Portal</h2>
          <div style="font-size: 13px; color: var(--text-muted);">
            Channel-specific evidence-led scoring (0–100) with security fatal overrides and coaching advice.
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <span class="badge badge-pass">${totalAudits} Audits Conducted</span>
          <span class="badge badge-fatal">${fatalCount} Security Fatal</span>
          <span class="badge badge-needs-imp">Avg: ${avgScore}%</span>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-bar">
        <button class="tab-btn active" onclick="SD_AUDIT.switchTab('audit-run')">Run Live Audit</button>
        <button class="tab-btn" onclick="SD_AUDIT.switchTab('audit-history')">Audit History & Analytics (${totalAudits})</button>
      </div>

      <!-- TAB 1: RUN AUDIT -->
      <div id="tab-audit-run" class="tab-content active">
        <!-- Pre-seeded sample selector -->
        <div class="card" style="margin-bottom: 16px; background: var(--bg-secondary);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 600; font-size: 13px;">Load Test Scenario:</span>
              <select id="audit-sample-picker" class="form-control" style="width: auto; max-width: 400px;" onchange="SD_AUDIT.loadSample(this.value)">
                <option value="">-- Choose one of 15 Seeded Scenarios --</option>
                <optgroup label="Ticket Audit Samples">
                  ${seedSamples.filter(s => s.channel === "Ticket").map(s => `
                    <option value="${s.id}">[Ticket] ${s.type} (${s.expectedVerdict}) - ${s.agent}</option>
                  `).join('')}
                </optgroup>
                <optgroup label="Chat Audit Samples">
                  ${seedSamples.filter(s => s.channel === "Chat").map(s => `
                    <option value="${s.id}">[Chat] ${s.type} (${s.expectedVerdict}) - ${s.agent}</option>
                  `).join('')}
                </optgroup>
                <optgroup label="Call Audit Samples">
                  ${seedSamples.filter(s => s.channel === "Call").map(s => `
                    <option value="${s.id}">[Call] ${s.type} (${s.expectedVerdict}) - ${s.agent}</option>
                  `).join('')}
                </optgroup>
              </select>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--text-dim);">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="checkbox" id="audit-mask-pii" checked>
                <span>Mask PII & Secrets before external API</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="checkbox" id="audit-auto-debounce" checked>
                <span>Auto-audit on paste (800ms)</span>
              </label>
            </div>
          </div>
        </div>

        <div class="grid-2">
          <!-- Left Column: Input Form -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Audit Subject & Interaction Transcript</span>
              <span id="audit-engine-badge" class="badge-source badge-simulated">OFFLINE RULE-BASED AUDIT</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Channel</label>
                <select id="audit-channel" class="form-control" onchange="SD_AUDIT.onChannelChange()">
                  <option value="Call">Call Audit (Voice)</option>
                  <option value="Ticket">Ticket Audit</option>
                  <option value="Chat">Chat Audit</option>
                </select>
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Interaction Reference ID</label>
                <input type="text" id="audit-ref" class="form-control" placeholder="e.g. INC001045 or CALL-8012" value="CALL-8012">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Assigned Analyst</label>
                <input type="text" id="audit-agent" class="form-control" placeholder="Type analyst name..." value="Ananya Kumar" list="audit-analyst-list">
                <datalist id="audit-analyst-list"></datalist>
              </div>
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Audit Date</label>
                <input type="date" id="audit-date" class="form-control" value="2026-11-04">
              </div>
            </div>

            <!-- Call audio upload container -->
            <div id="call-upload-box" class="form-group" style="background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-md); border: 1px dashed var(--border-light); margin-bottom: 12px;">
              <label class="form-label" style="display: flex; justify-content: space-between;">
                <span>Call Audio Recording (mp3, wav, m4a, webm)</span>
                <span style="font-weight: normal; color: var(--text-dim);">External Whisper API required for live STT</span>
              </label>
              <input type="file" id="audit-audio-file" accept="audio/*,video/*" class="form-control" onchange="SD_AUDIT.handleAudioUpload(this)">
              <div id="audio-upload-status" style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">No recording uploaded. Using transcript text below.</div>
            </div>

            <div class="form-group">
              <label class="form-label" style="display: flex; justify-content: space-between;">
                <span>Interaction Text / Transcript (Editable)</span>
                <span id="audit-text-counter" style="font-size: 11px; color: var(--text-dim);">0 characters</span>
              </label>
              <textarea id="audit-text" class="form-control" style="height: 280px; font-family: monospace; font-size: 12px;" oninput="SD_AUDIT.onTextInput()"></textarea>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <button class="btn btn-secondary btn-sm" onclick="SD_AUDIT.clearForm()">Clear Input</button>
              <button class="btn btn-primary" id="btn-run-audit" onclick="SD_AUDIT.executeAudit()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Execute Audit Now
              </button>
            </div>
          </div>

          <!-- Right Column: Audit Evaluation Results -->
          <div class="card" id="audit-results-card">
            <div class="card-header">
              <span class="card-title">Audit Report & Evaluation Findings</span>
              <div id="audit-verdict-badge" class="badge badge-pass" style="font-size: 13px; padding: 4px 10px;">Pending Evaluation</div>
            </div>

            <div id="audit-output-placeholder" style="text-align: center; padding: 60px 20px; color: var(--text-dim);">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <div>Select a scenario above or paste ticket/call notes to run an audit.</div>
            </div>

            <div id="audit-output-content" style="display: none;">
              <!-- Score Header Summary -->
              <div style="background: var(--bg-tertiary); padding: 14px 16px; border-radius: var(--radius-md); margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Overall Weighted Score</div>
                  <div id="audit-score-number" style="font-size: 32px; font-weight: 800; color: var(--text-main);">0.0</div>
                </div>
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Tone & Soft Skills</div>
                  <div id="audit-tone-summary" style="font-size: 13px; font-weight: 600; color: var(--text-main);">Positive (5/5)</div>
                </div>
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Security Findings</div>
                  <div id="audit-security-flag" class="badge badge-pass">None Detected</div>
                </div>
              </div>

              <!-- Security Fatal Banner (if triggered) -->
              <div id="audit-fatal-banner" class="alert-box alert-danger" style="display: none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div style="flex:1;">
                  <strong style="color: #ef4444;">FATAL OVERRIDE TRIGGERED:</strong>
                  <span id="audit-fatal-reason">High-severity security violation detected. Verdict set to Fatal – Security regardless of numerical score.</span>
                </div>
              </div>

              <!-- Rubric Evaluation Parameters -->
              <div style="font-weight: 700; font-size: 13px; margin-bottom: 8px; color: var(--text-main);">Parameter Breakdown & Evidence</div>
              <div id="audit-criteria-list" style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;"></div>

              <!-- Coaching & Summary -->
              <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
                <div style="font-weight: 700; font-size: 12px; color: var(--text-main); margin-bottom: 4px;">Executive Coaching & Next Steps</div>
                <div id="audit-coaching-text" style="font-size: 12px; color: var(--text-muted); line-height: 1.4;"></div>
              </div>

              <!-- Action Buttons -->
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <button class="btn btn-secondary btn-sm" onclick="SD_AUDIT.copyAuditSummary()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy Summary
                </button>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-warning btn-sm" id="btn-create-task-audit" onclick="SD_AUDIT.createTaskFromFinding()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    Create Action Task
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="SD_AUDIT.exportAuditXLSX()">Export XLSX</button>
                  <button class="btn btn-success btn-sm" onclick="SD_AUDIT.saveToHistory()">Save to History</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: AUDIT HISTORY & ANALYTICS -->
      <div id="tab-audit-history" class="tab-content">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Audit Records Ledger & Trend Lineage</span>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-sm" onclick="SD_AUDIT.exportHistoryXLSX()">Export History Excel</button>
              <button class="btn btn-danger btn-sm" onclick="SD_AUDIT.clearHistory()">Clear History</button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Audit Ref</th>
                  <th>Date</th>
                  <th>Analyst</th>
                  <th>Channel</th>
                  <th>Score</th>
                  <th>Verdict</th>
                  <th>Rubric</th>
                  <th>Summary Finding</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="audit-history-tbody">
                ${historyList.length === 0 ? `<tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 24px;">No audits recorded in local history yet.</td></tr>` : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    populateAnalystDatalist();
    renderHistoryTable();
  }

  function populateAnalystDatalist() {
    const list = document.getElementById("audit-analyst-list");
    if (!list) return;
    const teamMapping = SD_APP.state.data.teamMapping;
    if (!teamMapping) return;

    const names = new Set();
    Object.keys(teamMapping).forEach(sheet => {
      teamMapping[sheet].forEach(emp => {
        if (emp.Name) names.add(`${emp.Name} (${emp["Emp ID"] || ""})`);
      });
    });
    list.innerHTML = Array.from(names).map(n => `<option value="${n}">`).join('');
  }

  function switchTab(tabId) {
    document.querySelectorAll("#view-audit .tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll("#view-audit .tab-content").forEach(c => c.classList.remove("active"));
    if (tabId === "audit-run") {
      document.querySelectorAll("#view-audit .tab-btn")[0].classList.add("active");
      document.getElementById("tab-audit-run").classList.add("active");
    } else {
      document.querySelectorAll("#view-audit .tab-btn")[1].classList.add("active");
      document.getElementById("tab-audit-history").classList.add("active");
      renderHistoryTable();
    }
  }

  function onChannelChange() {
    const ch = document.getElementById("audit-channel").value;
    const box = document.getElementById("call-upload-box");
    if (box) box.style.display = (ch === "Call") ? "block" : "none";
  }

  function handleAudioUpload(input) {
    const status = document.getElementById("audio-upload-status");
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    status.innerHTML = `<strong>Uploaded:</strong> ${file.name} (${(file.size / 1024).toFixed(1)} KB). Ready for transcription.`;
    SD_APP.toast(`Audio recording loaded: ${file.name}. Notice: Transcription requires live Gateway API with Whisper configured.`, "info");
  }

  function onTextInput() {
    const text = document.getElementById("audit-text").value;
    const counter = document.getElementById("audit-text-counter");
    if (counter) counter.textContent = `${text.length} characters`;

    const autoDebounce = document.getElementById("audit-auto-debounce").checked;
    if (autoDebounce && text.trim().length > 30) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        executeAudit();
      }, 800);
    }
  }

  function loadSample(sampleId) {
    if (!sampleId) return;
    const samples = SD_DATA_GENERATOR.generateAll().auditSamples;
    const s = samples.find(x => x.id === sampleId);
    if (!s) return;

    document.getElementById("audit-channel").value = s.channel;
    document.getElementById("audit-ref").value = s.ref;
    document.getElementById("audit-agent").value = s.agent;
    document.getElementById("audit-text").value = s.text;
    onChannelChange();
    onTextInput();

    SD_APP.toast(`Loaded sample: ${s.type} for ${s.agent} (${s.channel})`, "info");
    executeAudit();
  }

  function clearForm() {
    document.getElementById("audit-text").value = "";
    document.getElementById("audit-text-counter").textContent = "0 characters";
    document.getElementById("audit-output-placeholder").style.display = "block";
    document.getElementById("audit-output-content").style.display = "none";
    activeAuditResult = null;
  }

  // Pure Offline Rule-Based Auditor
  function evaluateRuleBased(channel, text) {
    const channelRubric = rubrics[channel] || rubrics.Ticket;
    const lower = text.toLowerCase();
    
    // Check for Fatal Security Breaches
    const securityViolations = [];
    
    // 1. Cleartext passwords or tokens
    const credPatterns = [
      /(password\s+is\s+[:=]?\s*[^\s,.]+)/i,
      /(temporary\s+password\s+[^\s,.]+)/i,
      /(reset\s+password\s+to\s+[^\s,.]+)/i,
      /(root\s+password\s+is\s+[^\s,.]+)/i,
      /(otp\s+\d{6})/i,
      /(bearer\s+eyj[a-za-z0-9_\-\.]+)/i,
      /(bitlocker\s+recovery\s+key\s*[:=]?\s*[0-9\-]+)/i
    ];
    for (const pat of credPatterns) {
      const match = text.match(pat);
      if (match) {
        securityViolations.push({
          severity: "Fatal",
          rule: "Cleartext Credentials / Passwords Exposed",
          excerpt: match[0],
          advice: "Never transmit, log, or quote passwords, tokens, or BitLocker keys in ticket worknotes or chat."
        });
        break;
      }
    }

    // 2. Skipped identity verification
    const idSkipPatterns = [
      /(skipped\s+(callback|employee\s+id|verification))/i,
      /(without\s+verification)/i,
      /(cannot\s+wait\s+for\s+standard\s+approval)/i,
      /(without\s+disturbing\s+him\s+for\s+confirmation)/i
    ];
    for (const pat of idSkipPatterns) {
      const match = text.match(pat);
      if (match) {
        securityViolations.push({
          severity: "Fatal",
          rule: "Skipped Identity Verification Before MFA / Password Reset",
          excerpt: match[0],
          advice: "Positive identity challenge (callback or manager authorization) is non-negotiable for identity resets."
        });
        break;
      }
    }

    // 3. Remote control without consent
    const remoteSkipPatterns = [
      /(without\s+notifying\s+user)/i,
      /(silently\s+pushed)/i,
      /(did\s+not\s+(authorize|approve)\s+remote)/i,
      /(why\s+are\s+you\s+moving\s+my\s+mouse)/i,
      /(please\s+ask\s+before\s+taking\s+control)/i
    ];
    for (const pat of remoteSkipPatterns) {
      const match = text.match(pat);
      if (match) {
        securityViolations.push({
          severity: "Fatal",
          rule: "Remote Desktop Control Initiated Without Affirmative User Consent",
          excerpt: match[0],
          advice: "Always request explicit permission and wait for affirmative user consent before remote takeover."
        });
        break;
      }
    }

    // Check Tone & Soft Skills
    let toneScore = 5;
    let toneLabel = "Positive";
    const rudePhrases = [
      /(didn't\s+follow\s+the\s+instructions)/i,
      /(obviously\s+because)/i,
      /(stop\s+spamming)/i,
      /(don't\s+reopen\s+this\s+ticket)/i,
      /(well\s+everyone\s+says\s+that)/i,
      /(i\s+have\s+4\s+other\s+chats)/i,
      /(typing\s+your\s+password\s+wrong\s+5\s+times\s+will\s+do\s+that)/i,
      /(silent\s+hold\s+for\s+4\s+minutes)/i,
      /(yeah\s+bye)/i
    ];
    let rudeQuote = null;
    for (const pat of rudePhrases) {
      const match = text.match(pat);
      if (match) {
        rudeQuote = match[0];
        toneScore = 2;
        toneLabel = "Needs Improvement (Negative / Impatient Phrasing)";
        break;
      }
    }

    // Evaluate parameters
    const evaluatedCriteria = [];
    let earnedPoints = 0;
    let totalEligibleWeight = 0;

    channelRubric.forEach(c => {
      let status = "Met";
      let multiplier = 1.0;
      let quote = "";
      let explanation = "";

      if (c.id === "C1" || c.id === "CH1") {
        if (/hello|thank\s+you\s+for\s+calling|welcome\s+to|my\s+name\s+is/i.test(lower)) {
          quote = text.slice(0, 100);
          explanation = "Standard professional greeting detected.";
        } else {
          status = "Not Met";
          multiplier = 0.0;
          quote = text.slice(0, 60);
          explanation = "Missing standard greeting and analyst introduction.";
        }
      } else if (c.id === "C2" || c.id === "T4" || c.id === "CH4") {
        if (securityViolations.some(v => v.rule.includes("Identity"))) {
          status = "Not Met";
          multiplier = 0.0;
          quote = securityViolations.find(v => v.rule.includes("Identity")).excerpt;
          explanation = "Critical: Authentication challenged skipped.";
        } else if (/employee\s+id|verified|emp-|authentication/i.test(lower)) {
          quote = (text.match(/emp-[\w\d]+/i) || ["Identity confirmed"])[0];
          explanation = "Identity verification protocol followed.";
        } else {
          status = "Partially Met";
          multiplier = 0.5;
          explanation = "Verification steps not explicitly documented.";
        }
      } else if (c.id === "C6") {
        if (securityViolations.some(v => v.rule.includes("Remote"))) {
          status = "Not Met";
          multiplier = 0.0;
          quote = securityViolations.find(v => v.rule.includes("Remote")).excerpt;
          explanation = "Remote session initiated without consent.";
        } else if (/permission\s+to\s+remotely|quick\s+assist|screen\s+share/i.test(lower)) {
          quote = "May I request permission to remotely connect...";
          explanation = "Affirmative remote assistance consent obtained.";
        } else {
          status = "N/A"; // Exclude if no remote required
        }
      } else if (c.id === "C7" || c.id === "CH5") {
        if (rudeQuote) {
          status = "Not Met";
          multiplier = 0.0;
          quote = `"${rudeQuote}"`;
          explanation = "Impatient, dismissive, or condescending language used.";
        } else {
          quote = "Polite and empathetic phrasing throughout.";
          explanation = "Exhibited professional empathy and helpful tone.";
        }
      } else {
        // General diagnostic criteria
        if (text.length > 150) {
          status = "Met";
          multiplier = 1.0;
          explanation = "Troubleshooting steps executed and logged.";
        } else {
          status = "Partially Met";
          multiplier = 0.5;
          explanation = "Brief documentation provided.";
        }
      }

      if (status !== "N/A") {
        totalEligibleWeight += c.weight;
        earnedPoints += c.weight * multiplier;
      }

      evaluatedCriteria.push({
        id: c.id,
        name: c.name,
        weight: c.weight,
        status: status,
        scorePoints: (c.weight * multiplier * 100).toFixed(1),
        quote: quote || "Documented in interaction",
        explanation: explanation
      });
    });

    // Score 0-100 normalized
    const overallScore = totalEligibleWeight > 0 ? parseFloat(((earnedPoints / totalEligibleWeight) * 100).toFixed(1)) : 0;
    
    // Verdict calculation
    let verdict = "Pass";
    if (overallScore < 70) verdict = "Fail";
    else if (overallScore < 85) verdict = "Needs Improvement";

    // Fatal Security Override
    const isFatal = securityViolations.length > 0;
    if (isFatal) {
      verdict = "Fatal – Security";
    }

    return {
      score: overallScore,
      verdict: verdict,
      isFatal: isFatal,
      securityViolations: securityViolations,
      toneSummary: `${toneLabel} (${toneScore}/5)`,
      evaluatedCriteria: evaluatedCriteria,
      coachingAdvice: isFatal ?
        `SECURITY ESCALATION: Conduct mandatory security re-briefing with ${securityViolations[0].rule}. Review SOP before next shift.` :
        (overallScore >= 85 ? "Great work! Interaction followed technical and customer service standards." : "Focus on communication tone and ensuring all troubleshooting steps are thoroughly logged.")
    };
  }

  function executeAudit() {
    const text = document.getElementById("audit-text").value.trim();
    if (!text) {
      SD_APP.toast("Please enter or paste transcript/worknotes to audit.", "warning");
      return;
    }

    const channel = document.getElementById("audit-channel").value;
    const ref = document.getElementById("audit-ref").value;
    const agent = document.getElementById("audit-agent").value;
    const date = document.getElementById("audit-date").value;

    const btn = document.getElementById("btn-run-audit");
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-block; animation:spin 1s infinite linear;">⟳</span> Evaluating...`;

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Execute Audit Now`;

      const result = evaluateRuleBased(channel, text);
      activeAuditResult = {
        ref,
        agent,
        channel,
        date,
        text,
        ...result
      };

      displayAuditResult(activeAuditResult);
    }, 200);
  }

  function displayAuditResult(res) {
    document.getElementById("audit-output-placeholder").style.display = "none";
    document.getElementById("audit-output-content").style.display = "block";

    // Score & Badges
    document.getElementById("audit-score-number").textContent = res.score.toFixed(1);
    document.getElementById("audit-tone-summary").textContent = res.toneSummary;

    const verdictBadge = document.getElementById("audit-verdict-badge");
    verdictBadge.textContent = res.verdict.toUpperCase();
    verdictBadge.className = `badge ${res.verdict === 'Pass' ? 'badge-pass' : (res.verdict === 'Fatal – Security' ? 'badge-fatal' : (res.verdict === 'Needs Improvement' ? 'badge-needs-imp' : 'badge-fail'))}`;

    const secFlag = document.getElementById("audit-security-flag");
    if (res.isFatal) {
      secFlag.textContent = "CRITICAL BREACH";
      secFlag.className = "badge badge-fatal";
    } else {
      secFlag.textContent = "Clean";
      secFlag.className = "badge badge-pass";
    }

    // Fatal Banner
    const fatalBanner = document.getElementById("audit-fatal-banner");
    if (res.isFatal) {
      fatalBanner.style.display = "flex";
      document.getElementById("audit-fatal-reason").textContent = res.securityViolations.map(v => `${v.rule} (Quote: "${v.excerpt}")`).join('; ');
    } else {
      fatalBanner.style.display = "none";
    }

    // Coaching advice
    document.getElementById("audit-coaching-text").textContent = res.coachingAdvice;

    // Criteria breakdown
    const list = document.getElementById("audit-criteria-list");
    list.innerHTML = res.evaluatedCriteria.map(c => `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: 600; color: var(--text-main);">${c.name} (${(c.weight * 100).toFixed(0)}%)</span>
          <span class="badge ${c.status === 'Met' ? 'badge-pass' : (c.status === 'Partially Met' ? 'badge-needs-imp' : (c.status === 'N/A' ? 'badge-not-loaded' : 'badge-fail'))}">
            ${c.status} (${c.scorePoints} pts)
          </span>
        </div>
        <div style="color: var(--text-muted); font-size: 11px;">${c.explanation}</div>
        ${c.quote ? `<div class="quote-box" style="margin-top: 4px; font-size: 11px;">${SD_APP.escapeHtml(c.quote)}</div>` : ''}
      </div>
    `).join('');

    SD_APP.toast(`Audit evaluated: ${res.verdict} (${res.score.toFixed(1)}%)`, res.isFatal ? "error" : "success");
  }

  function copyAuditSummary() {
    if (!activeAuditResult) return;
    const r = activeAuditResult;
    const summary = `
=== SD OS AUDIT REPORT ===
Reference: ${r.ref} | Date: ${r.date} | Channel: ${r.channel}
Analyst: ${r.agent}
Overall Score: ${r.score.toFixed(1)} / 100
Verdict: ${r.verdict}
Tone: ${r.toneSummary}
Security Breaches: ${r.isFatal ? r.securityViolations.map(v => v.rule).join(', ') : 'None'}
Coaching Advice: ${r.coachingAdvice}
===========================
    `.trim();

    navigator.clipboard.writeText(summary).then(() => {
      SD_APP.toast("Audit report summary copied to clipboard.", "success");
    }).catch(() => {
      SD_APP.toast("Unable to copy to clipboard.", "warning");
    });
  }

  function saveToHistory() {
    if (!activeAuditResult) return;
    const r = activeAuditResult;
    const record = {
      id: `AUD-${Date.now()}`,
      ref: r.ref,
      agent: r.agent,
      channel: r.channel,
      date: r.date,
      score: r.score,
      verdict: r.verdict,
      summary: r.isFatal ? `CRITICAL: ${r.securityViolations[0].rule}` : r.coachingAdvice,
      rubricVersion: "v2.0"
    };

    SD_APP.state.data.auditHistory.unshift(record);
    SD_APP.saveToStorage();
    renderHistoryTable();
    SD_APP.toast(`Saved audit ${r.ref} to history ledger.`, "success");
  }

  function createTaskFromFinding() {
    if (!activeAuditResult) return;
    const r = activeAuditResult;
    const title = r.isFatal ?
      `Security Action: ${r.securityViolations[0].rule} (${r.ref})` :
      `Coaching Plan for ${r.agent} on ${r.channel} SOP (${r.ref})`;

    const desc = `Generated from Audit ${r.ref} dated ${r.date}. Score: ${r.score}%. Findings: ${r.coachingAdvice}`;

    const newTask = {
      id: `TSK-AUD${Math.floor(Math.random() * 899 + 100)}`,
      title: title,
      description: desc,
      owner: r.agent,
      priority: r.isFatal ? "High" : "Medium",
      status: "Open",
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      source: "Auditing Portal",
      notes: `Verbatim quote: "${r.isFatal ? r.securityViolations[0].excerpt : 'General coaching'}"`,
      subtasks: [
        { text: "Review audit findings with analyst", done: false },
        { text: "Complete mandatory SOP refresher", done: false }
      ]
    };

    SD_APP.state.data.tasks.unshift(newTask);
    SD_APP.saveToStorage();
    SD_APP.toast(`Created linked Task ${newTask.id} in Tasks module!`, "success");
    SD_NAV.navigateTo('tasks');
  }

  function exportAuditXLSX() {
    if (!activeAuditResult) return;
    const r = activeAuditResult;
    const rows = r.evaluatedCriteria.map(c => ({
      "Audit Ref": r.ref,
      "Analyst": r.agent,
      "Channel": r.channel,
      "Date": r.date,
      "Criterion ID": c.id,
      "Parameter Name": c.name,
      "Weight %": c.weight * 100,
      "Status": c.status,
      "Points": c.scorePoints,
      "Explanation": c.explanation,
      "Verbatim Quote": c.quote
    }));

    SD_XLSX.exportWorkbook({
      "Audit Findings": rows,
      "Summary": [
        { "Key": "Overall Score", "Value": r.score },
        { "Key": "Verdict", "Value": r.verdict },
        { "Key": "Tone", "Value": r.toneSummary },
        { "Key": "Security Breaches", "Value": r.isFatal ? r.securityViolations.map(v => v.rule).join('; ') : "None" }
      ]
    }, `Audit_${r.ref}_${r.date}.xlsx`);
  }

  function renderHistoryTable() {
    const tbody = document.getElementById("audit-history-tbody");
    if (!tbody) return;
    const list = SD_APP.state.data.auditHistory || [];
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-dim); padding: 24px;">No audits recorded in local history yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr>
        <td><strong>${SD_APP.escapeHtml(item.ref)}</strong></td>
        <td>${SD_APP.escapeHtml(item.date)}</td>
        <td>${SD_APP.escapeHtml(item.agent)}</td>
        <td><span class="badge badge-needs-imp">${item.channel}</span></td>
        <td><strong>${item.score.toFixed(1)}%</strong></td>
        <td><span class="badge ${item.verdict === 'Pass' ? 'badge-pass' : (item.verdict === 'Fatal – Security' ? 'badge-fatal' : 'badge-needs-imp')}">${item.verdict}</span></td>
        <td><span style="font-family: monospace; font-size: 11px;">${item.rubricVersion || 'v2.0'}</span></td>
        <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${SD_APP.escapeHtml(item.summary)}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="SD_AUDIT.deleteHistoryItem('${item.id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  function deleteHistoryItem(id) {
    SD_APP.state.data.auditHistory = SD_APP.state.data.auditHistory.filter(x => x.id !== id);
    SD_APP.saveToStorage();
    renderHistoryTable();
    SD_APP.toast("Audit record removed.", "info");
  }

  function clearHistory() {
    if (confirm("Are you sure you want to clear all audit history records?")) {
      SD_APP.state.data.auditHistory = [];
      SD_APP.saveToStorage();
      renderHistoryTable();
      SD_APP.toast("Audit history cleared.", "info");
    }
  }

  function exportHistoryXLSX() {
    const list = SD_APP.state.data.auditHistory || [];
    if (list.length === 0) {
      SD_APP.toast("No history records to export.", "warning");
      return;
    }
    SD_XLSX.exportWorkbook({ "Audit History": list }, `Audit_History_Ledger.xlsx`);
  }

  return {
    render,
    switchTab,
    onChannelChange,
    handleAudioUpload,
    onTextInput,
    loadSample,
    clearForm,
    executeAudit,
    copyAuditSummary,
    saveToHistory,
    createTaskFromFinding,
    exportAuditXLSX,
    deleteHistoryItem,
    clearHistory,
    exportHistoryXLSX
  };
})();

