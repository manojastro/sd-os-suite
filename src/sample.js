/* Demo sample upload: plans the SIMULATED sample datasets through the normal import pipeline,
   runs the audit engine on the sample transcripts and summarises the analysis. No browser dependencies. */
(function (root, factory) {
  const deps = typeof module === 'object' && module.exports
    ? { D: require('./domain.js'), I: require('./imports.js'), R: require('./roster.js'), A: require('./audit.js') }
    : { D: root.SDDomain, I: root.SDImports, R: root.SDRoster, A: root.SDAudit };
  const api = factory(deps);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.SDSample = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deps) {
  'use strict';
  const { D, I, R, A } = deps;
  // Employees must exist before tickets and roster rows that reference them.
  const ORDER = ['employees', 'tickets', 'roster', 'demand'];

  function identityMapping(kind) {
    return Object.fromEntries(I.schemas[kind].fields.map(f => [f, f]));
  }

  // Preview one dataset against the current state. Apply with I.apply inside a revision-checked mutation.
  function planDataset(state, sample, kind) {
    return I.preview(state, {
      kind, mode: 'upsert', filename: 'Sample upload (SIMULATED)', sheet: 'Sample ' + kind,
      mapping: identityMapping(kind), rows: sample[kind],
    });
  }

  // Audit records with deterministic IDs, so running the sample twice does not duplicate them.
  function auditRecords(sample, now = new Date().toISOString()) {
    return sample.audits.map(a => ({
      id: a.id, channel: a.channel, ref: a.ref, analyst: a.analyst, date: a.date, transcript: a.transcript,
      result: A.run(a.transcript), createdAt: now, sample: a.sample,
    }));
  }

  function analyse(state, audits) {
    const tz = state.settings.timezone, cutoff = state.settings.cutoffHour;
    const tickets = D.ticketMetrics(state.tickets, tz, cutoff);
    const shifts = state.roster.filter(r => r.kind !== 'leave');
    const leave = state.roster.filter(r => r.kind === 'leave');
    const policy = {
      minRestHours: state.settings.minRestHours ?? 10,
      maxWeeklyWorkingDays: state.settings.maxWeeklyWorkingDays ?? 5,
      maxConsecutiveDays: state.settings.maxConsecutiveDays ?? 6,
    };
    const roster = R.validate(shifts, leave, policy);
    const byRule = {};
    const samples = audits.map(a => {
      const labels = a.result.findings.map(f => f.label);
      labels.forEach(l => { byRule[l] = (byRule[l] || 0) + 1; });
      const detected = labels.length > 0;
      const expectedPass = a.sample.expectedVerdict === 'Pass';
      return {
        id: a.id, channel: a.channel, scenario: a.sample.scenario,
        expectedVerdict: a.sample.expectedVerdict, expectedVulnerabilities: a.sample.expectedVulnerabilities,
        flags: labels, matchesExpectation: expectedPass ? !detected : detected,
      };
    });
    return {
      tickets, roster: { valid: roster.valid, problems: roster.problems.length, shifts: shifts.length, leave: leave.length },
      audits: { total: audits.length, flagged: samples.filter(s => s.flags.length).length, byRule }, samples,
      expectationsMet: samples.filter(s => s.matchesExpectation).length,
    };
  }

  return { ORDER, planDataset, auditRecords, analyse };
});
