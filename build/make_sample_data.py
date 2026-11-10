#!/usr/bin/env python3
"""Convert the SIMULATED workbooks into src/sample-data.json for the demo 'Sample upload' action.

Usage: python3 build/make_sample_data.py [path-to-simulated-outputs]
All people, IDs and numbers come from the fictitious generator (seed 42).
"""
import datetime as dt
import json
import os
import sys

from openpyxl import load_workbook

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = sys.argv[1] if len(sys.argv) > 1 else "/home/manojkumar9080/outputs"
OUT = os.path.join(ROOT, "src", "sample-data.json")


def path(name):
    return os.path.join(SRC, name)


def rows_of(ws, start=2):
    return [r for r in ws.iter_rows(min_row=start, values_only=True) if r[0] is not None]


def fmt_dt(d, hm=None):
    if hm is None:
        return d.strftime("%Y-%m-%d")
    return f"{d.strftime('%Y-%m-%d')} {hm}"


# ---- employees (Overall Infra)
emp_rows = rows_of(load_workbook(path("Team Mapping-Nov'26 (SIMULATED).xlsx"), read_only=True)["Overall Infra"])
employees = []
name_to_id = {}
for r in emp_rows:
    emp_id, name, team, role, manager, location = str(r[0]), r[1], r[5], r[6], r[4], r[10]
    employees.append({"id": emp_id, "name": name, "team": team, "role": role, "manager": manager,
                      "location": location, "active": "yes"})
    name_to_id[name] = emp_id

# ---- tickets (Ticket Dump): drop repeated numbers, keep the first occurrence
ticket_rows = rows_of(load_workbook(path("Ticket Dump (SIMULATED).xlsx"), read_only=True)["Tickets"])
seen, tickets, dropped = set(), [], 0
STATUS = {"Resolved": "resolved", "Closed": "resolved", "New": "new", "In Progress": "in progress"}
for r in ticket_rows:
    num = r[0]
    if num in seen:
        dropped += 1
        continue
    seen.add(num)
    opened, resolved = r[1], r[2]
    tickets.append({
        "id": num,
        "status": STATUS[r[3]],
        "openedAt": opened.strftime("%Y-%m-%d %H:%M"),
        "resolvedAt": resolved.strftime("%Y-%m-%d %H:%M") if resolved else "",
        "team": "Infra Voice",
        "ownerId": name_to_id[r[5]],
        "slaMet": "no" if r[10] == "Yes" else "yes",
    })

# ---- roster (Planned Shift grid) and leave
wb_roster = load_workbook(path("Infra SD Voice Shift Schedule Nov'26 (SIMULATED).xlsx"), read_only=True)
grid = list(wb_roster["Planned Shift"].iter_rows(values_only=True))
day_header = grid[0]           # row 1: dates from column F
day_cols = [(i, day_header[i]) for i in range(5, len(day_header)) if isinstance(day_header[i], dt.datetime)]
roster = []
for row in grid[2:20]:
    emp_id = str(row[1])
    for i, day in day_cols:
        code = row[i]
        if not code or code == "OFF":
            continue
        a, b = [x.strip() for x in code.split(" - ")]
        start = day.replace(hour=int(a[:2]), minute=int(a[2:]))
        end = day.replace(hour=int(b[:2]), minute=int(b[2:]))
        if end <= start:
            end += dt.timedelta(days=1)
        roster.append({"id": f"SMP-{emp_id}-{day:%Y%m%d}", "employeeId": emp_id, "start": start.strftime("%Y-%m-%d %H:%M"),
                       "end": end.strftime("%Y-%m-%d %H:%M"), "team": "Infra Voice", "kind": "shift"})

leave_rows = rows_of(load_workbook(path("Leave and Holidays (SIMULATED).xlsx"), read_only=True)["Leave"])
leave_count = 0
for r in leave_rows:
    emp_id, typ, frm, to = r[1], r[3], r[4], r[5]
    if typ == "Holiday" or not emp_id:
        continue
    leave_count += 1
    roster.append({"id": f"SMP-LV-{emp_id}-{frm:%Y%m%d}", "employeeId": str(emp_id),
                   "start": fmt_dt(frm, "00:00"), "end": fmt_dt(to + dt.timedelta(days=1), "00:00"),
                   "team": "Infra Voice", "kind": "leave"})

# ---- demand: one week of Voice intervals (26 Oct - 1 Nov 2026), 30-minute intervals
calls = load_workbook(path("Call Volume Interval (SIMULATED).xlsx"), read_only=True)["Interval Data"]
demand = []
week_start, week_end = dt.date(2026, 10, 26), dt.date(2026, 11, 1)
for r in calls.iter_rows(min_row=2, values_only=True):
    if r[0] != "Infra Voice" or r[1] is None:
        continue
    day = r[1].date() if isinstance(r[1], dt.datetime) else r[1]
    if not (week_start <= day <= week_end):
        continue
    hm = r[2].strftime("%H:%M")
    demand.append({"id": f"DEM-{day:%Y%m%d}-{hm.replace(':', '')}", "team": "Infra Voice",
                   "start": f"{day:%Y-%m-%d} {hm}", "volume": r[3], "intervalMinutes": 30,
                   "ahtSeconds": r[6], "concurrency": 1, "mode": "voice"})

# ---- audit samples
samples = rows_of(load_workbook(path("Audit Samples (SIMULATED).xlsx"), read_only=True)["Samples"])
audits = []
for r in samples:
    audits.append({"id": f"sample-{r[0]}", "channel": r[1], "ref": f"{r[0]} · {r[2]}", "analyst": "Sample analyst",
                   "date": "2026-11-03", "transcript": r[3],
                   "sample": {"scenario": r[2], "expectedVerdict": r[4], "expectedVulnerabilities": r[5]}})

out = {
    "notice": "SIMULATED sample data. All people, IDs and numbers are fictitious.",
    "counts": {"employees": len(employees), "tickets": len(tickets), "duplicateTicketsRemoved": dropped,
               "roster": len(roster), "leaveEntries": leave_count, "demand": len(demand), "audits": len(audits)},
    "employees": employees, "tickets": tickets, "roster": roster, "demand": demand, "audits": audits,
}
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
print("wrote", OUT, out["counts"])
