// Compatibility entry point for the focused Node test suite.
const {spawnSync} = require('node:child_process');
const result = spawnSync(process.execPath, ['--test', 'tests/domain.test.js'], {stdio:'inherit'});
if (result.error) { console.error(result.error); process.exit(1); }
process.exit(result.status ?? 1);
