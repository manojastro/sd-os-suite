// build/generate_data.js
// High-fidelity deterministic seed data generator for SD OS Suite

function sfc32(a, b, c, d) {
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
    var t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

const rng = sfc32(0x9E3779B9, 0x243F6A88, 0xB7E15162, 0x12345678);
function random() { return rng(); }
function randInt(min, max) { return Math.floor(random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(random() * arr.length)]; }

const firstNames = [
  "Aarav", "Aditi", "Akash", "Ananya", "Arun", "Deepak", "Divya", "Gaurav", "Harish", "Ishaan",
  "Kavita", "Kiran", "Manoj", "Meera", "Neha", "Naveen", "Pooja", "Pradeep", "Priya", "Rahul",
  "Rajesh", "Ramesh", "Ritu", "Rohan", "Sanjay", "Shreya", "Sneha", "Suresh", "Swati", "Tarun",
  "Varun", "Vikram", "Vinay", "Anjali", "Bhavna", "Chetan", "Dinesh", "Geeta", "Hemant", "Karthik"
];
const lastNames = [
  "Sharma", "Verma", "Patel", "Kumar", "Singh", "Nair", "Rao", "Reddy", "Iyer", "Kulkarni",
  "Joshi", "Deshmukh", "Gupta", "Malhotra", "Mehta", "Bhat", "Chopra", "Das", "Menon", "Pillai",
  "Saxena", "Kapoor", "Chatterjee", "Banerjee", "Mukherjee", "Shetty", "Hegde", "Naidu", "Gowda", "Mishra"
];
const locations = ["Bangalore", "Chennai", "Hyderabad", "Pune", "Gurgaon"];

function makeName(idx) {
  const f = firstNames[idx % firstNames.length];
  const l = lastNames[Math.floor(idx / firstNames.length) % lastNames.length];
  return `${f} ${l}`;
}

// 1. Generate Team Mapping (10 Worksheets)
function generateTeamMapping() {
  const sheets = {};
  let empCounter = 100;

  function genMembers(sheetName, tower, count, prefix, mgr, supList, roles, levels, grades) {
    const rows = [];
    for (let i = 1; i <= count; i++) {
      empCounter++;
      const empId = `EMP-${prefix}${String(i).padStart(3, '0')}`;
      const name = makeName(empCounter);
      const sup = pick(supList);
      const loc = pick(locations);
      const role = pick(roles);
      const lvl = pick(levels);
      const grd = pick(grades);
      const tenurityYrs = randInt(1, 8);
      const tenurityMos = tenurityYrs * 12 + randInt(0, 11);
      const pdojYr = 2026 - tenurityYrs;
      const pdojMo = String(randInt(1, 12)).padStart(2, '0');
      const pdojDay = String(randInt(1, 28)).padStart(2, '0');

      rows.push({
        "Emp ID": empId,
        "Name": name,
        "Supervisor Name": sup.name,
        "Supervisor ID": sup.id,
        "Manager": mgr,
        "Team Name": sheetName,
        "Role": role,
        "Tower": tower,
        "Project ID": "PRJ-INFRA-8021",
        "Level": lvl,
        "Location": loc,
        "Designation": lvl === "L2" ? "Senior Systems Engineer" : (lvl === "L3" ? "Lead Technical Consultant" : "Systems Engineer"),
        "Grade": grd,
        "PDOJ": `${pdojYr}-${pdojMo}-${pdojDay}`,
        "Tenurity": `${tenurityYrs}y ${tenurityMos % 12}m`,
        "Months": tenurityMos
      });
    }
    return rows;
  }

  const supsInfra = [
    { name: "Arun Kumar", id: "EMP-SUP01" },
    { name: "Priya Sharma", id: "EMP-SUP02" },
    { name: "Ramesh Nair", id: "EMP-SUP03" },
    { name: "Suresh Reddy", id: "EMP-SUP04" }
  ];

  // 1. Infra Web (~27)
  sheets["Infra Web"] = genMembers("Infra Web", "Infrastructure", 27, "W", "Vikram Malhotra", [supsInfra[1], supsInfra[2]], ["Web L1 Analyst", "Web Dispatcher"], ["L1", "L2"], ["A", "B", "C"]);
  
  // 2. Infra Voice (~16 in mapping)
  sheets["Infra Voice"] = genMembers("Infra Voice", "Infrastructure", 16, "V", "Vikram Malhotra", [supsInfra[0]], ["Voice SD Analyst"], ["L1"], ["A", "B"]);
  
  // 3. Infra Chat (~30)
  sheets["Infra Chat"] = genMembers("Infra Chat", "Infrastructure", 30, "C", "Vikram Malhotra", [supsInfra[2], supsInfra[3]], ["Chat Support Specialist"], ["L1", "L2"], ["A", "B", "C"]);
  
  // 4. EUCS L2 (~29)
  sheets["EUCS L2"] = genMembers("EUCS L2", "End User Computing", 29, "E", "Sunita Rao", [supsInfra[3]], ["EUCS L2 Specialist", "Field Engineer"], ["L2"], ["B", "C"]);
  
  // 5. Gdoc&Vip (~45)
  sheets["Gdoc&Vip"] = genMembers("Gdoc&Vip", "VIP & Collaboration", 45, "G", "Sunita Rao", [supsInfra[1]], ["VIP Support Lead", "Collaboration Analyst"], ["L1", "L2"], ["A", "B", "C"]);
  
  // 6. ITSAM (~7)
  sheets["ITSAM"] = genMembers("ITSAM", "Asset Management", 7, "IT", "Kavita Deshmukh", [supsInfra[0]], ["Asset Analyst"], ["L1", "L2"], ["A", "B"]);
  
  // 7. Claude (~7)
  sheets["Claude"] = genMembers("Claude", "AI & Automation", 7, "CL", "Kavita Deshmukh", [supsInfra[1]], ["Automation Specialist"], ["L1", "L2"], ["A", "B"]);
  
  // 8. Gsuite (~6)
  sheets["Gsuite"] = genMembers("Gsuite", "Cloud Productivity", 6, "GS", "Kavita Deshmukh", [supsInfra[2]], ["GSuite Administrator"], ["L1", "L2"], ["A", "B"]);
  
  // 9. Overall Infra (~167: union of Infra Web, Voice, Chat, EUCS L2, Gdoc&Vip + leadership)
  const unionInfra = [
    ...sheets["Infra Web"],
    ...sheets["Infra Voice"],
    ...sheets["Infra Chat"],
    ...sheets["EUCS L2"],
    ...sheets["Gdoc&Vip"]
  ];
  // Add 20 leadership / PMO rows to make ~167
  for (let i = 1; i <= 20; i++) {
    unionInfra.push({
      "Emp ID": `EMP-LEAD${String(i).padStart(3, '0')}`,
      "Name": makeName(800 + i),
      "Supervisor Name": "Vikram Malhotra",
      "Supervisor ID": "EMP-MGR01",
      "Manager": "Director of Service Delivery",
      "Team Name": "Infra Leadership & PMO",
      "Role": "Operations Lead",
      "Tower": "Infrastructure",
      "Project ID": "PRJ-INFRA-8021",
      "Level": "L3",
      "Location": "Bangalore",
      "Designation": "Delivery Manager",
      "Grade": "D",
      "PDOJ": "2019-04-15",
      "Tenurity": "7y 7m",
      "Months": 91
    });
  }
  sheets["Overall Infra"] = unionInfra;

  // 10. App Team Mapping (~96, limited fields per spec: Emp ID, Name, Tower)
  const appMembers = [];
  for (let i = 1; i <= 96; i++) {
    appMembers.push({
      "Emp ID": `EMP-APP${String(i).padStart(3, '0')}`,
      "Name": makeName(900 + i),
      "Tower": "Applications"
    });
  }
  sheets["App Team Mapping"] = appMembers;

  return sheets;
}

// 2. Generate Voice Shift Schedule Nov'26 (18 Analysts, 4 Weeks)
function generateVoiceSchedule(voiceMapping) {
  // Notice: 18 analysts in roster, 16 in Voice Team Mapping sheet!
  // The first 16 are mapped to EMP-V001..V016, plus 2 unmapped/reconciled (EMP-V017, EMP-V018)
  const analysts = [];
  for (let i = 1; i <= 18; i++) {
    const mapped = voiceMapping[i - 1];
    analysts.push({
      role: "Voice SD Analyst",
      id: mapped ? mapped["Emp ID"] : `EMP-V${String(i).padStart(3, '0')}`,
      name: mapped ? mapped["Name"] : `Analyst ${i} (Unmapped in Sheet)`,
      location: mapped ? mapped["Location"] : "Bangalore",
      supervisor: "Arun Kumar",
      fixedShift: i === 1 ? "0600 - 1600" : (i === 18 ? "2100 - 0700" : null)
    });
  }

  const shiftCodes = [
    "0600 - 1600", "0900 - 1900", "1000 - 2000", "1100 - 2100",
    "1300 - 2300", "1500 - 0100", "1600 - 0200", "1800 - 0400", "2100 - 0700", "OFF"
  ];

  // 4 Weeks in Nov 2026: Nov 2 to Nov 29 (28 days)
  const schedule = [];
  analysts.forEach((analyst, aIdx) => {
    const days = [];
    for (let day = 1; day <= 28; day++) {
      const weekday = (day + 0) % 7; // Mon=1, Sun=0
      const isWeekend = (weekday === 6 || weekday === 0);
      let shift = "0900 - 1900";
      
      // Rotate shifts deterministically
      if (analyst.fixedShift) {
        shift = isWeekend ? "OFF" : analyst.fixedShift;
      } else {
        const rot = (aIdx + Math.floor(day / 7) * 2) % 6;
        if (isWeekend) {
          shift = (aIdx % 3 === day % 3) ? "1000 - 2000" : "OFF";
        } else {
          const weekdayShifts = [
            "0600 - 1600", "0900 - 1900", "1000 - 2000",
            "1100 - 2100", "1300 - 2300", "1500 - 0100"
          ];
          shift = weekdayShifts[rot];
        }
      }
      
      // Leave simulation on specific dates
      if (aIdx === 2 && day >= 10 && day <= 12) shift = "LEAVE";
      if (aIdx === 7 && day === 18) shift = "COMP-OFF";
      if (aIdx === 12 && day >= 22 && day <= 24) shift = "LEAVE";

      days.push(shift);
    }
    schedule.push({
      ...analyst,
      shifts: days
    });
  });

  return schedule;
}

// 3. Generate 8-Week 24x7 30-min Interval Volume (21,504 intervals)
function generateIntervalVolume() {
  const teams = [
    { name: "Infra Voice", baseDay: 900, ahtMean: 540, ahtStd: 60, hasReduction: true },
    { name: "Infra Chat", baseDay: 700, ahtMean: 480, ahtStd: 50, hasReduction: false },
    { name: "Infra Web", baseDay: 450, ahtMean: 1000, ahtStd: 120, hasReduction: false },
    { name: "EUCS L2", baseDay: 300, ahtMean: 1800, ahtStd: 200, hasReduction: false },
    { name: "Gdoc&Vip", baseDay: 200, ahtMean: 900, ahtStd: 100, hasReduction: false },
    { name: "ITSAM", baseDay: 120, ahtMean: 1200, ahtStd: 150, hasReduction: false },
    { name: "Claude", baseDay: 80, ahtMean: 600, ahtStd: 80, hasReduction: false },
    { name: "Gsuite", baseDay: 60, ahtMean: 750, ahtStd: 90, hasReduction: false }
  ];

  // Nov 2, 2026 was a Monday. 8 Weeks = 56 days.
  // Oct 5, 2026 to Nov 29, 2026 (56 days)
  const startDate = new Date(2026, 9, 5); // Month 9 is Oct in JS Date
  const totalDays = 56;
  const intervalsPerDay = 48;

  // Intraday profile distribution weights for 48 half-hour slots
  // Peak 1: 10:00-12:00 (slots 20 to 24), Peak 2: 14:00-16:00 (slots 28 to 32)
  // Overnight 00:00-06:00 (slots 0 to 12) ~ 5-8% total
  const intradayWeights = new Array(48).fill(0);
  for (let i = 0; i < 48; i++) {
    const hr = i / 2;
    if (hr < 6) {
      intradayWeights[i] = 0.005 + (hr / 6) * 0.005; // 0.5% to 1% per slot
    } else if (hr >= 6 && hr < 10) {
      intradayWeights[i] = 0.015 + ((hr - 6) / 4) * 0.025; // ramp up
    } else if (hr >= 10 && hr < 12) {
      intradayWeights[i] = 0.045 + Math.sin((hr - 10) * Math.PI / 2) * 0.01; // peak 1
    } else if (hr >= 12 && hr < 14) {
      intradayWeights[i] = 0.030; // lunch dip
    } else if (hr >= 14 && hr < 16) {
      intradayWeights[i] = 0.042 + Math.sin((hr - 14) * Math.PI / 2) * 0.008; // peak 2
    } else if (hr >= 16 && hr < 20) {
      intradayWeights[i] = 0.025 - ((hr - 16) / 4) * 0.012; // ramp down
    } else {
      intradayWeights[i] = 0.010 - ((hr - 20) / 4) * 0.005; // late evening
    }
  }
  // Normalize weights
  const sumW = intradayWeights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 48; i++) intradayWeights[i] /= sumW;

  const dataset = {};

  teams.forEach(t => {
    const records = [];
    for (let d = 0; d < totalDays; d++) {
      const curDate = new Date(startDate.getTime() + d * 86400000);
      const yyyy = curDate.getFullYear();
      const mm = String(curDate.getMonth() + 1).padStart(2, '0');
      const dd = String(curDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayOfWeek = curDate.getDay(); // 0 Sun, 1 Mon, ... 5 Fri, 6 Sat

      // Weekday / Weekend modifiers
      let dayFactor = 1.0;
      if (dayOfWeek === 1) dayFactor = 1.20; // Monday +20%
      else if (dayOfWeek === 5) dayFactor = 0.90; // Friday -10%
      else if (dayOfWeek === 0 || dayOfWeek === 6) dayFactor = 0.28; // Weekend 28%
      else dayFactor = 1.0; // Tue, Wed, Thu baseline

      // Genesys IVR Go-Live on 20 Nov 2026: -15% reduction for Voice
      if (t.hasReduction && curDate >= new Date(2026, 10, 20)) {
        dayFactor *= 0.85;
      }

      // One ~3x anomaly day (VPN Outage on Oct 21, 2026, day 16)
      if (d === 16 && (t.name === "Infra Voice" || t.name === "Infra Web" || t.name === "Infra Chat")) {
        dayFactor *= 2.95;
      }

      // Month-end spike (Oct 30-31, days 25-26)
      if (d >= 25 && d <= 26) {
        dayFactor *= 1.15;
      }

      const dailyOffered = Math.round(t.baseDay * dayFactor * (0.95 + random() * 0.10));

      for (let slot = 0; slot < 48; slot++) {
        const hr = String(Math.floor(slot / 2)).padStart(2, '0');
        const mn = (slot % 2 === 0) ? "00" : "30";
        const timeStr = `${hr}:${mn}`;

        const slotOffered = Math.round(dailyOffered * intradayWeights[slot]);
        
        // Abandonment rate: 2-4% normally, 8-15% during peak understaffing
        const isPeak = (slot >= 20 && slot <= 24) || (slot >= 28 && slot <= 32);
        const abanRate = isPeak ? (0.08 + random() * 0.05) : (0.02 + random() * 0.02);
        const slotAbandoned = slotOffered > 0 ? Math.round(slotOffered * abanRate) : 0;
        const slotAnswered = Math.max(0, slotOffered - slotAbandoned);

        // AHT with slight peak elevation
        const ahtSlot = Math.round(t.ahtMean * (isPeak ? 1.08 : 0.98) + (random() - 0.5) * t.ahtStd);

        records.push({
          date: dateStr,
          time: timeStr,
          interval: slot,
          offered: slotOffered,
          answered: slotAnswered,
          abandoned: slotAbandoned,
          aht: ahtSlot
        });
      }
    }
    dataset[t.name] = records;
  });

  return dataset;
}

// 4. Generate ~2,200 Service Desk Tickets (over 9 weeks)
function generateTickets(teamMapping) {
  const tickets = [];
  const totalTickets = 2240;
  
  // Priorites: P1 2%, P2 12%, P3 56%, P4 30%
  // Categories: Password Reset, MFA/Authenticator, Account Unlock, VPN/Network, Outlook, Teams, Hardware, Software Install, Access Request, Printer
  const categories = [
    { name: "Password Reset", wt: 0.22, ahtHr: 1.2 },
    { name: "MFA/Authenticator", wt: 0.18, ahtHr: 1.8 },
    { name: "Account Unlock", wt: 0.14, ahtHr: 0.8 },
    { name: "VPN/Network", wt: 0.12, ahtHr: 3.5 },
    { name: "Outlook", wt: 0.10, ahtHr: 4.2 },
    { name: "Teams", wt: 0.08, ahtHr: 2.8 },
    { name: "Hardware", wt: 0.06, ahtHr: 24.0 },
    { name: "Software Install", wt: 0.05, ahtHr: 8.5 },
    { name: "Access Request", wt: 0.03, ahtHr: 12.0 },
    { name: "Printer", wt: 0.02, ahtHr: 6.0 }
  ];

  const groups = [
    "Infra Voice", "Infra Chat", "Infra Web", "EUCS L2", "Gdoc&Vip", "ITSAM"
  ];
  const contactTypes = ["Phone", "Chat", "Self-Service/Web", "Email"];

  const startDate = new Date(2026, 8, 28); // Sep 28, 2026
  const totalDays = 63; // 9 weeks

  // Flatten agents from relevant teams for assignee mapping
  const agents = [
    ...teamMapping["Infra Voice"],
    ...teamMapping["Infra Chat"],
    ...teamMapping["Infra Web"],
    ...teamMapping["EUCS L2"]
  ];

  for (let i = 1; i <= totalTickets; i++) {
    const num = `INC${String(100000 + i).slice(1)}`;
    
    // Date calculation
    const dOffset = Math.floor((i / totalTickets) * totalDays);
    const tDate = new Date(startDate.getTime() + dOffset * 86400000);
    
    // Realistic open hour (peaks during working hours 08:00 to 18:00)
    let hr = randInt(7, 19);
    if (random() < 0.10) hr = randInt(0, 6); // overnight
    if (random() < 0.15) hr = randInt(20, 23);
    const min = randInt(0, 59);
    const sec = randInt(0, 59);
    tDate.setHours(hr, min, sec);
    const openedStr = tDate.toISOString().replace('T', ' ').slice(0, 19);

    // Pick category
    let catRand = random();
    let catObj = categories[0];
    let cum = 0;
    for (const c of categories) {
      cum += c.wt;
      if (catRand <= cum) {
        catObj = c;
        break;
      }
    }

    // Pick Priority: P1 2%, P2 12%, P3 56%, P4 30%
    const pRand = random();
    let prio = "3 - Moderate";
    if (pRand < 0.02) prio = "1 - Critical";
    else if (pRand < 0.14) prio = "2 - High";
    else if (pRand < 0.70) prio = "3 - Moderate";
    else prio = "4 - Low";

    // Unresolved rate: ~3%
    const isUnresolved = (i > totalTickets * 0.97);
    const state = isUnresolved ? pick(["In Progress", "New", "Awaiting User"]) : "Resolved";

    // SLA Breached: ~8.5%
    const slaBreached = (random() < 0.085) ? "Yes" : "No";

    // Reopen count: ~3.5%
    const reopenCount = (random() < 0.035) ? randInt(1, 2) : 0;

    // Resolved timestamp and resolution hours
    let resolvedStr = "";
    let resHours = null;
    let sameDay = "No";

    if (!isUnresolved) {
      // Resolution time in hours
      let mult = (slaBreached === "Yes") ? randInt(3, 8) : (0.5 + random() * 1.5);
      resHours = parseFloat((catObj.ahtHr * mult).toFixed(2));
      const rDate = new Date(tDate.getTime() + resHours * 3600000);
      resolvedStr = rDate.toISOString().replace('T', ' ').slice(0, 19);

      // Check same day (calendar day: same YYYY-MM-DD)
      const opCutoffOpened = new Date(tDate.getTime() - 7 * 3600000).toISOString().slice(0, 10);
      const opCutoffResolved = new Date(rDate.getTime() - 7 * 3600000).toISOString().slice(0, 10);
      
      const calSame = (openedStr.slice(0, 10) === resolvedStr.slice(0, 10));
      const opSame = (opCutoffOpened === opCutoffResolved);
      sameDay = calSame ? "Yes" : "No";
    }

    const assignedAgent = pick(agents);
    const group = assignedAgent["Team Name"];
    const contact = (group === "Infra Voice") ? "Phone" : (group === "Infra Chat" ? "Chat" : pick(contactTypes));

    tickets.push({
      number: num,
      opened_at: openedStr,
      resolved_at: resolvedStr,
      state: state,
      assignment_group: group,
      assigned_to: assignedAgent["Name"],
      assigned_to_id: assignedAgent["Emp ID"],
      priority: prio,
      category: catObj.name,
      contact_type: contact,
      reopen_count: reopenCount,
      sla_breached: slaBreached,
      resolution_hours: resHours,
      same_day: sameDay
    });
  }

  return tickets;
}

// 5. Generate Stack Ranking (Infra Voice Sept'26) - 13 Analysts x 25 Metrics
function generateStackRanking() {
  const analysts = [
    { id: "EMP-V201", name: "Aarav Sharma" },
    { id: "EMP-V202", name: "Aditi Verma" },
    { id: "EMP-V203", name: "Akash Patel" },
    { id: "EMP-V204", name: "Ananya Kumar" },
    { id: "EMP-V205", name: "Arun Nair" },
    { id: "EMP-V206", name: "Deepak Rao" },
    { id: "EMP-V207", name: "Divya Reddy" },
    { id: "EMP-V208", name: "Gaurav Iyer" },
    { id: "EMP-V209", name: "Harish Kulkarni" },
    { id: "EMP-V210", name: "Ishaan Joshi" },
    { id: "EMP-V211", name: "Kavita Deshmukh" },
    { id: "EMP-V212", name: "Kiran Gupta" },
    { id: "EMP-V213", name: "Manoj Malhotra" }
  ];

  // 25 Parameters across 5 categories
  const rubric = [
    // Quality (50%)
    { id: "M01", name: "QA Audit Score %", cat: "Quality", catWeight: 0.50, weight: 0.15, unit: "%", higherBetter: true, bands: [80, 85, 90, 95] },
    { id: "M02", name: "Critical Security / Compliance Breaches", cat: "Quality", catWeight: 0.50, weight: 0.10, unit: "count", higherBetter: false, bands: [3, 2, 1, 0] },
    { id: "M03", name: "CSAT Positive Feedback %", cat: "Quality", catWeight: 0.50, weight: 0.10, unit: "%", higherBetter: true, bands: [75, 80, 85, 90] },
    { id: "M04", name: "DSAT Negative Feedback Count", cat: "Quality", catWeight: 0.50, weight: 0.05, unit: "count", higherBetter: false, bands: [4, 3, 2, 0] },
    { id: "M05", name: "First Contact Resolution FCR %", cat: "Quality", catWeight: 0.50, weight: 0.05, unit: "%", higherBetter: true, bands: [65, 70, 75, 80] },
    { id: "M06", name: "Repeat Caller Rate %", cat: "Quality", catWeight: 0.50, weight: 0.05, unit: "%", higherBetter: false, bands: [15, 12, 9, 6] },

    // Volume and Utilization (23%)
    { id: "M07", name: "Average Calls Handled / Day", cat: "Volume and Utilization", catWeight: 0.23, weight: 0.08, unit: "calls", higherBetter: true, bands: [25, 30, 35, 40] },
    { id: "M08", name: "Average Handling Time AHT", cat: "Volume and Utilization", catWeight: 0.23, weight: 0.05, unit: "sec", higherBetter: false, bands: [650, 600, 540, 480] },
    { id: "M09", name: "Schedule Adherence %", cat: "Volume and Utilization", catWeight: 0.23, weight: 0.04, unit: "%", higherBetter: true, bands: [88, 91, 94, 97] },
    { id: "M10", name: "Aux / Break Adherence %", cat: "Volume and Utilization", catWeight: 0.23, weight: 0.03, unit: "%", higherBetter: true, bands: [85, 88, 92, 95] },
    { id: "M11", name: "After Call Work ACW Adherence %", cat: "Volume and Utilization", catWeight: 0.23, weight: 0.03, unit: "%", higherBetter: true, bands: [85, 90, 93, 96] },

    // SLA and KPI (12%)
    { id: "M12", name: "SLA Response Met %", cat: "SLA and KPI", catWeight: 0.12, weight: 0.04, unit: "%", higherBetter: true, bands: [88, 91, 94, 97] },
    { id: "M13", name: "SLA Resolution Met %", cat: "SLA and KPI", catWeight: 0.12, weight: 0.04, unit: "%", higherBetter: true, bands: [85, 89, 93, 96] },
    { id: "M14", name: "Ticket Reopen Rate %", cat: "SLA and KPI", catWeight: 0.12, weight: 0.02, unit: "%", higherBetter: false, bands: [6, 4.5, 3, 1.5] },
    { id: "M15", name: "Same Day Resolution SDR %", cat: "SLA and KPI", catWeight: 0.12, weight: 0.02, unit: "%", higherBetter: true, bands: [65, 72, 78, 85] },

    // Contribution to Practice (7%)
    { id: "M16", name: "KB Articles Created / Updated", cat: "Contribution to Practice", catWeight: 0.07, weight: 0.03, unit: "count", higherBetter: true, bands: [1, 2, 3, 5] },
    { id: "M17", name: "Process Improvement Ideas Submitted", cat: "Contribution to Practice", catWeight: 0.07, weight: 0.02, unit: "count", higherBetter: true, bands: [0, 1, 2, 3] },
    { id: "M18", name: "Peer Shadowing & Coaching Hours", cat: "Contribution to Practice", catWeight: 0.07, weight: 0.02, unit: "hours", higherBetter: true, bands: [2, 4, 6, 8] },

    // BAU Adherence (8%)
    { id: "M19", name: "Shift Punctuality %", cat: "BAU Adherence", catWeight: 0.08, weight: 0.03, unit: "%", higherBetter: true, bands: [90, 93, 96, 98] },
    { id: "M20", name: "Mandatory Training Completion %", cat: "BAU Adherence", catWeight: 0.08, weight: 0.02, unit: "%", higherBetter: true, bands: [80, 90, 95, 100] },
    { id: "M21", name: "Ticket Categorization Accuracy %", cat: "BAU Adherence", catWeight: 0.08, weight: 0.01, unit: "%", higherBetter: true, bands: [85, 90, 94, 98] },
    { id: "M22", name: "Worknotes Detail & Quality Score", cat: "BAU Adherence", catWeight: 0.08, weight: 0.01, unit: "score", higherBetter: true, bands: [3.0, 3.5, 4.0, 4.5] },
    { id: "M23", name: "Leave Planning Notice Compliance %", cat: "BAU Adherence", catWeight: 0.08, weight: 0.005, unit: "%", higherBetter: true, bands: [80, 85, 90, 95] },
    { id: "M24", name: "Handover Notes Completeness %", cat: "BAU Adherence", catWeight: 0.08, weight: 0.003, unit: "%", higherBetter: true, bands: [85, 90, 95, 98] },
    { id: "M25", name: "Asset & Queue Tagging Compliance %", cat: "BAU Adherence", catWeight: 0.08, weight: 0.002, unit: "%", higherBetter: true, bands: [88, 92, 95, 98] }
  ];

  // Helper to calculate score band 1 to 5
  function getScore(val, higherBetter, bands) {
    if (val === null || val === undefined) return 1;
    if (higherBetter) {
      if (val >= bands[3]) return 5;
      if (val >= bands[2]) return 4;
      if (val >= bands[1]) return 3;
      if (val >= bands[0]) return 2;
      return 1;
    } else {
      if (val <= bands[3]) return 5;
      if (val <= bands[2]) return 4;
      if (val <= bands[1]) return 3;
      if (val <= bands[0]) return 2;
      return 1;
    }
  }

  // Generate plausible inputs for the 13 analysts
  const matrix = [];
  analysts.forEach((analyst, aIdx) => {
    const inputs = {};
    const scores = {};
    const pts = {};
    let totalScore = 0;

    rubric.forEach(m => {
      let val;
      const perfRank = (13 - aIdx) / 13; // Higher aIdx has slight variation
      if (m.unit === "%") {
        val = parseFloat((m.bands[0] - 5 + perfRank * 16 + (random() * 6 - 3)).toFixed(1));
        if (val > 100) val = 100;
        if (val < 50) val = 50;
      } else if (m.unit === "count") {
        val = Math.max(0, Math.round(m.bands[0] - perfRank * 3 + (random() * 2 - 1)));
      } else if (m.unit === "calls") {
        val = Math.round(26 + perfRank * 16 + (random() * 6 - 3));
      } else if (m.unit === "sec") {
        val = Math.round(660 - perfRank * 180 + (random() * 40 - 20));
      } else {
        val = parseFloat((3.0 + perfRank * 1.8 + (random() * 0.4 - 0.2)).toFixed(1));
      }

      const score = getScore(val, m.higherBetter, m.bands);
      // Formula: Weighted Points = Weight * Score / 5 * 100
      const weightedPt = (m.weight * (score / 5) * 100);

      inputs[m.id] = val;
      scores[m.id] = score;
      pts[m.id] = parseFloat(weightedPt.toFixed(3));
      totalScore += weightedPt;
    });

    matrix.push({
      id: analyst.id,
      name: analyst.name,
      inputs: inputs,
      scores: scores,
      points: pts,
      overallScore: parseFloat(totalScore.toFixed(2))
    });
  });

  // Sort by overallScore descending to determine rank
  matrix.sort((a, b) => b.overallScore - a.overallScore);
  
  // Assign ranks with ties handling
  let currentRank = 1;
  matrix.forEach((item, idx) => {
    if (idx > 0 && item.overallScore === matrix[idx - 1].overallScore) {
      item.rank = matrix[idx - 1].rank;
    } else {
      item.rank = currentRank;
    }
    currentRank++;
  });

  return { rubric, matrix };
}

// 6. Generate 15 Audit Samples
function generateAuditSamples() {
  return [
    // --- TICKET SAMPLES ---
    {
      id: "AUD-T01",
      channel: "Ticket",
      type: "Clean Pass",
      expectedVerdict: "Pass",
      agent: "Aarav Sharma",
      ref: "INC001045",
      text: `[Description]: User reports unable to access shared network drive S:\\Finance\\Reports after domain password change this morning.
[Work Notes]: Contacted user via Teams. Confirmed Employee ID EMP-84920 and manager name. Verified user account in Active Directory - account unlocked, but Kerberos ticket required renewal. Guided user to lock Windows station and unlock with new password. Ran klist purge in command prompt. Tested access to S:\\Finance\\Reports - drive mapped successfully. User confirmed read/write access to quarterly reports folder.
[Resolution]: Re-authenticated Active Directory credentials and purged stale Kerberos tokens using klist command. User confirmed full access to shared network directory.`
    },
    {
      id: "AUD-T02",
      channel: "Ticket",
      type: "Poor Tone & Empathy",
      expectedVerdict: "Needs Improvement",
      agent: "Gaurav Iyer",
      ref: "INC001108",
      text: `[Description]: Outlook keeps prompting for password repeatedly every 5 minutes.
[Work Notes]: User didn't follow the instructions sent yesterday. Told user this is obviously because they entered the wrong credentials multiple times. As stated in KB0042, user needs to stop spamming the prompt. Cleared Windows Credential Manager. 
[Resolution]: Deleted credentials. Don't reopen this ticket if you forget your password again.`
    },
    {
      id: "AUD-T03",
      channel: "Ticket",
      type: "Cleartext Credentials Exposed",
      expectedVerdict: "Fatal – Security",
      agent: "Kiran Gupta",
      ref: "INC001250",
      text: `[Description]: SAP login account locked after weekend system update.
[Work Notes]: Unlocked SAP ID KGU104 in client 100. Reset password to default: Welcome@2026! and emailed temp credentials to user. Also generated OTP 849201 for MFA token reset and noted it here for reference.
[Resolution]: SAP account unlocked. Temporary password Welcome@2026! set.`
    },
    {
      id: "AUD-T04",
      channel: "Ticket",
      type: "Skipped Identity Verification",
      expectedVerdict: "Fatal – Security",
      agent: "Deepak Rao",
      ref: "INC001399",
      text: `[Description]: User requested emergency password reset and MFA reset for Microsoft Authenticator from personal mobile.
[Work Notes]: Caller stated they are VP of Marketing on urgent client meeting and cannot wait for standard approval. Skipped callback and employee ID validation due to urgency. Reset MFA registration and issued bypass code 729104.
[Resolution]: MFA reset without verification due to high VIP urgency.`
    },
    {
      id: "AUD-T05",
      channel: "Ticket",
      type: "Remote Control Without Consent",
      expectedVerdict: "Fatal – Security",
      agent: "Manoj Malhotra",
      ref: "INC001512",
      text: `[Description]: VPN client Cisco AnyConnect error 412: The remote peer is no longer responding.
[Work Notes]: Connected directly to host WS-9041 using administrative PowerShell session and remote desktop without notifying user because user was away from desk. Modified routing table and restarted Cisco service remotely.
[Resolution]: Silently pushed VPN configuration fix to workstation.`
    },

    // --- CHAT SAMPLES ---
    {
      id: "AUD-C01",
      channel: "Chat",
      type: "Clean Pass",
      expectedVerdict: "Pass",
      agent: "Aditi Verma",
      ref: "CHT-9021",
      text: `Analyst: Hello! Thank you for contacting IT Service Desk Chat Support. My name is Aditi. How may I assist you today?
User: Hi Aditi, I need to install Microsoft Visio for a project architecture diagram.
Analyst: I would be happy to help with that! Before we proceed, may I please have your Employee ID and full name for verification?
User: Sure, it is EMP-49201, Rohit Sen.
Analyst: Thank you Rohit! I have verified your profile. Let me check the software catalog in Software Center for Visio Professional. May I place the chat on hold for 2 minutes while I verify your project license entitlement?
User: Yes, please go ahead.
Analyst: Thank you for your patience on hold. Good news, your department has an available license. I have triggered the push through Microsoft Endpoint Manager. Could you please check Software Center under Applications?
User: Yes! It says 'Installing'. Great!
Analyst: Wonderful. Is there anything else I can help you with today?
User: No, that is all. Thank you Aditi!
Analyst: You are very welcome! Have a fantastic day ahead and thank you for chatting with IT Support.`
    },
    {
      id: "AUD-C02",
      channel: "Chat",
      type: "Poor Tone & Empathy",
      expectedVerdict: "Needs Improvement",
      agent: "Harish Kulkarni",
      ref: "CHT-9044",
      text: `Analyst: chat connected. what is the issue?
User: Hi, my laptop is freezing constantly when opening Excel files.
Analyst: you probably have too many tabs open. close everything.
User: I only have 2 Excel files open, and this is critical for executive presentation.
Analyst: well everyone says that. just reboot your laptop and see. if it doesnt work then raise a ticket.
User: Can you check if there is an update or memory issue?
Analyst: look I have 4 other chats right now. reboot first.`
    },
    {
      id: "AUD-C03",
      channel: "Chat",
      type: "Cleartext Credentials Exposed",
      expectedVerdict: "Fatal – Security",
      agent: "Ishaan Joshi",
      ref: "CHT-9088",
      text: `Analyst: Hello, how can I help you?
User: Hi, I forgot my database service account password for staging.
Analyst: Sure, the staging database password is DbPass#2026_ProdRoot and the API token is Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9. Please save it securely.
User: Got it, thanks!`
    },
    {
      id: "AUD-C04",
      channel: "Chat",
      type: "Skipped Identity Verification",
      expectedVerdict: "Fatal – Security",
      agent: "Akash Patel",
      ref: "CHT-9102",
      text: `Analyst: Welcome to IT Support.
User: Hey, I am locked out of my corporate laptop and need a BitLocker recovery key immediately.
Analyst: What is your machine name?
User: LAP-BLR-8921.
Analyst: Here is your BitLocker recovery key: 492018-294012-491029-491023-859201. Enter this on boot screen.
User: It worked, thanks.`
    },
    {
      id: "AUD-C05",
      channel: "Chat",
      type: "Remote Control Without Consent",
      expectedVerdict: "Fatal – Security",
      agent: "Divya Reddy",
      ref: "CHT-9140",
      text: `Analyst: Hi. What is wrong?
User: My sound is not working in Teams meeting.
Analyst: I just opened remote assistance to your laptop and took control.
User: Wait, I did not authorize remote access, I had sensitive customer contracts open!
Analyst: I just needed to adjust the audio driver quickly.`
    },

    // --- CALL SAMPLES ---
    {
      id: "AUD-V01",
      channel: "Call",
      type: "Clean Pass",
      expectedVerdict: "Pass",
      agent: "Ananya Kumar",
      ref: "CALL-8012",
      text: `[Analyst]: Thank you for calling the Infrastructure Service Desk. My name is Ananya. How can I assist you today?
[User]: Hi Ananya, I'm trying to connect to the GlobalProtect VPN from home, but it keeps giving me a connection timed out error.
[Analyst]: I understand how critical VPN connectivity is for working remotely. I will be glad to assist you with getting this resolved promptly. May I please verify your Employee ID and your registered work email?
[User]: Yes, my ID is EMP-V1092 and email is rahul.sharma@company.com.
[Analyst]: Thank you Rahul. Identity verified. Could you please confirm what gateway you are currently connected to in the GlobalProtect dropdown?
[User]: It says 'IN-Bangalore-Gateway-01'.
[Analyst]: Thank you. That gateway is currently undergoing scheduled network maintenance. May I request permission to remotely connect to your screen via Quick Assist to guide you to the alternate gateway?
[User]: Yes, you have my permission to connect.
[Analyst]: Thank you. Please enter security code 492-108.
[User]: Connected.
[Analyst]: Perfect. I am selecting 'IN-Mumbai-Gateway-02'. Let us click connect now.
[User]: Oh great, it shows connected and Secure!
[Analyst]: Excellent! I will log ticket INC002891 with these steps. Is there anything else I can support you with today Rahul?
[User]: No, that was super fast. Thank you so much!
[Analyst]: You're very welcome. Thank you for calling IT Support, have a great day!`
    },
    {
      id: "AUD-V02",
      channel: "Call",
      type: "Poor Tone & Empathy",
      expectedVerdict: "Needs Improvement",
      agent: "Arun Nair",
      ref: "CALL-8045",
      text: `[Analyst]: Yeah, Service Desk. What happened?
[User]: Hello, I am locked out of my workstation and I have a critical board presentation in 10 minutes.
[Analyst]: Well, typing your password wrong 5 times will do that. You will just have to wait.
[User]: Is there any way you can unlock it quickly please?
[Analyst]: (Sighs loudly) I have to open the console and it takes time. Hold on.
(Silent hold for 4 minutes without checking back)
[Analyst]: Try it now.
[User]: It worked. Thank you.
[Analyst]: Yeah bye.`
    },
    {
      id: "AUD-V03",
      channel: "Call",
      type: "Cleartext Credentials Exposed",
      expectedVerdict: "Fatal – Security",
      agent: "Kavita Deshmukh",
      ref: "CALL-8090",
      text: `[Analyst]: Service Desk, Kavita speaking.
[User]: Hi, I need the admin credentials for the local backup NAS server in the Bangalore server room.
[Analyst]: Sure, username is nas_admin and the root password is NAS@Bangalore#2026. Make sure nobody else hears this.
[User]: Got it down, thanks.`
    },
    {
      id: "AUD-V04",
      channel: "Call",
      type: "Skipped Identity Verification",
      expectedVerdict: "Fatal – Security",
      agent: "Rohan Verma",
      ref: "CALL-8115",
      text: `[Analyst]: Infrastructure Support, Rohan speaking.
[User]: Hi, I am calling on behalf of Director Sharma. He lost his mobile and needs his corporate password reset immediately.
[Analyst]: No problem at all, since it is for Director Sharma I will reset it immediately to Welcome#123 without disturbing him for confirmation.
[User]: Perfect, thank you.`
    },
    {
      id: "AUD-V05",
      channel: "Call",
      type: "Remote Control Without Consent",
      expectedVerdict: "Fatal – Security",
      agent: "Tarun Saxena",
      ref: "CALL-8160",
      text: `[Analyst]: IT Service Desk, Tarun speaking.
[User]: Hello, my printer driver is throwing spooler errors.
[Analyst]: I have just initiated remote takeover through DameWare onto your desktop IP.
[User]: Wait, why are you moving my mouse? I did not approve this session, please ask before taking control!
[Analyst]: I need to kill the spooler service, just leave the mouse alone for a minute.`
    }
  ];
}

console.log("Generating datasets...");
const teamMapping = generateTeamMapping();
console.log("Team Mapping generated: 10 sheets.");
const voiceSchedule = generateVoiceSchedule(teamMapping["Infra Voice"]);
console.log(`Voice Schedule generated: ${voiceSchedule.length} analysts x 28 days.`);
const intervalVolume = generateIntervalVolume();
console.log("Interval volume generated: 8 teams x 2,688 intervals = 21,504 intervals.");
const tickets = generateTickets(teamMapping);
console.log(`Tickets generated: ${tickets.length} tickets.`);
const stackRanking = generateStackRanking();
console.log(`Stack Ranking generated: ${stackRanking.matrix.length} analysts x 25 metrics.`);
const auditSamples = generateAuditSamples();
console.log(`Audit samples generated: ${auditSamples.length} samples.`);

const fs = require('fs');
fs.writeFileSync('build/seed_data.json', JSON.stringify({
  teamMapping,
  voiceSchedule,
  intervalVolume,
  tickets,
  stackRanking,
  auditSamples
}));
console.log("Seed data successfully written to build/seed_data.json!");

