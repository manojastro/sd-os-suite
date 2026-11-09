/* IndexedDB storage: one atomic, revisioned workspace record. */
(function (root, factory) {
  const domain = typeof module === 'object' && module.exports ? require('./domain.js') : root.SDDomain;
  const api = factory(domain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SDStorage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D) {
  'use strict';
  const DB_NAME = 'SD_OS_workspace', STORE = 'workspace', KEY = 'current';
  function open(indexedDB, databaseName = DB_NAME) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(databaseName, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
      req.onerror = () => reject(req.error || new Error('IndexedDB unavailable.'));
      req.onblocked = () => reject(new Error('Database upgrade blocked by another tab.'));
      req.onsuccess = () => resolve(req.result);
    });
  }
  function read(db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => { try { resolve(req.result ? D.validateState(req.result) : D.defaults()); } catch (e) { reject(e); } };
      req.onerror = () => reject(req.error);
    });
  }
  function commit(db, expectedRevision, mutator) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE), get = store.get(KEY);
      let result, next, failure;
      get.onsuccess = () => {
        try {
          const current = get.result ? D.validateState(get.result) : D.defaults();
          if (current.revision !== expectedRevision) throw new Error('Workspace changed in another tab. Reload before applying.');
          next = D.clone(current); result = mutator(next);
          if (result && typeof result.then === 'function') throw new Error('Mutation must be synchronous.');
          next.revision = current.revision + 1;
          D.validateState(next); store.put(next, KEY);
        } catch (e) { failure = e; tx.abort(); }
      };
      get.onerror = () => { failure = get.error; };
      tx.oncomplete = () => resolve({state:next, result});
      tx.onabort = tx.onerror = () => reject(failure || tx.error || new Error('Save failed.'));
    });
  }
  // Preserve the previous format without treating uncertain records as verified data.
  function captureLegacy(storage) {
    const prefix = 'SD_OS_v2_', result = {};
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !key.startsWith(prefix) || /apikey|token|secret/i.test(key)) continue;
      const value = storage.getItem(key);
      try { result[key] = JSON.parse(value); } catch (_) { result[key] = value; }
    }
    // Settings may contain old provider credentials. Keep only operational non-secret fields.
    if (result[prefix+'settings']) {
      const s = result[prefix+'settings'];
      result[prefix+'settings'] = Object.fromEntries(['timezone','operationalCutoffHour','slaTargetPercent','slaTargetSeconds','shrinkagePercent','maxOccupancyPercent','minRestHours','maxConsecutiveDays','maxWeeklyWorkingDays','theme'].filter(k => Object.hasOwn(s,k)).map(k => [k,s[k]]));
    }
    return result;
  }
  function backup(state) {
    D.validateState(state);
    // Explicit fields only; never serialize session provider settings or arbitrary keys.
    const settings = Object.fromEntries(['timezone','cutoffHour','theme','minRestHours','maxWeeklyWorkingDays','maxConsecutiveDays','rubric','rubricVersion','rosterDraft'].map(k => [k,state.settings[k]]));
    return {app:'SD_OS_Suite', version:D.VERSION, exportedAt:new Date().toISOString(), workspace:{version:D.VERSION, revision:state.revision, settings, ...Object.fromEntries(D.collections.map(k => [k,D.clone(state[k])]))}};
  }
  function parseBackup(text) {
    let parsed;
    try { parsed = JSON.parse(text); } catch (_) { throw new Error('Backup is not valid JSON.'); }
    if (!parsed || parsed.app !== 'SD_OS_Suite' || parsed.version !== D.VERSION) throw new Error('Unsupported backup.');
    return D.validateState(parsed.workspace);
  }
  return {open, read, commit, captureLegacy, backup, parseBackup};
});
