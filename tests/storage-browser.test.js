const { chromium } = require('playwright-core');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || '/snap/bin/chromium', args:['--no-sandbox']});
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.TEST_URL || pathToFileURL(path.join(__dirname,'storage-browser.html')).href);
  const outcome = await page.evaluate(async () => {
    await new Promise((resolve,reject) => { const r = indexedDB.deleteDatabase('SD_OS_test_storage'); r.onsuccess=resolve; r.onerror=() => reject(r.error); });
    const db = await SDStorage.open(indexedDB, 'SD_OS_test_storage');
    const empty = await SDStorage.read(db);
    const saved = await SDStorage.commit(db, empty.revision, s => SDDomain.createTask(s, {title:'Follow up'}, {idempotencyKey:'one'}));
    let stale = false, rejected = false;
    try { await SDStorage.commit(db, empty.revision, s => s.tasks.push({title:'stale'})); } catch (_) { stale = true; }
    try { await SDStorage.commit(db, saved.state.revision, s => { s.tasks.push({title:'partial'}); throw new Error('fail'); }); } catch (_) { rejected = true; }
    db.close();
    return {empty:empty.tasks.length, stale, rejected};
  });
  await page.reload();
  const persisted = await page.evaluate(async () => { const db=await SDStorage.open(indexedDB, 'SD_OS_test_storage'); const s=await SDStorage.read(db); db.close(); return s; });
  assert.deepEqual(outcome,{empty:0,stale:true,rejected:true});
  assert.equal(persisted.tasks.length,1); assert.equal(persisted.tasks[0].title,'Follow up');
  assert.deepEqual(errors,[]);
  await browser.close();
  console.log('PASS: IndexedDB persists across reload, rejects stale writes and rolls back failed mutations.');
})().catch(e => { console.error(e); process.exitCode=1; });
