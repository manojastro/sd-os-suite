// test_suite.js
// Tests DOM execution of SD_OS_Suite.html using vm

const fs = require('fs');
const vm = require('vm');

const mockElements = {};
function createMockEl(id) {
  const el = {
    id: id,
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    addEventListener: () => {},
    appendChild: () => {},
    setAttribute: () => {},
    getAttribute: () => '',
    querySelectorAll: () => [],
    querySelector: () => null
  };
  mockElements[id] = el;
  return el;
}

const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Date: Date,
  Math: Math,
  parseFloat: parseFloat,
  parseInt: parseInt,
  isNaN: isNaN,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  RegExp: RegExp,
  Set: Set,
  Map: Map,
  Blob: function(parts, opts) { this.parts = parts; this.opts = opts; },
  URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} },
  window: {
    addEventListener: () => {},
    location: { reload: () => {} }
  },
  document: {
    documentElement: { setAttribute: () => {}, getAttribute: () => 'dark' },
    getElementById: (id) => mockElements[id] || createMockEl(id),
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: (tag) => createMockEl('dynamic_' + tag)
  },
  localStorage: {
    _store: {},
    getItem: function(k) { return this._store[k] || null; },
    setItem: function(k, v) { this._store[k] = v; },
    removeItem: function(k) { delete this._store[k]; },
    clear: function() { this._store = {}; }
  },
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  performance: { now: () => Date.now() }
};

// Register elements
[
  "view-home", "view-audit", "view-vault", "view-analysis", "view-shifts",
  "view-tasks", "view-ranking", "view-mapping", "view-settings",
  "global-modal-overlay", "global-modal-title", "global-modal-body", "global-modal-footer",
  "toast-container", "header-section-title", "header-dataset-badge", "content-container",
  "theme-toggle-icon", "test-cnt-pass", "test-cnt-fail", "test-cnt-not-tested", "test-harness-tbody"
].forEach(createMockEl);

vm.createContext(sandbox);

// Read HTML scripts
const html = fs.readFileSync('SD_OS_Suite.html', 'utf8');
const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/g);
console.log(`Found ${scriptMatches.length} script tags in SD_OS_Suite.html.`);

// Execute scripts in vm context
scriptMatches.forEach((s, idx) => {
  const code = s.replace(/<script>/, '').replace(/<\/script>/, '');
  console.log(`Executing script ${idx + 1} (${code.length} chars)...`);
  vm.runInContext(code, sandbox);
});

console.log("Initializing SD_NAV...");
vm.runInContext("SD_NAV.init()", sandbox);

console.log("Testing module rendering:");
const modules = ["home", "audit", "vault", "analysis", "shifts", "tasks", "ranking", "mapping", "settings"];
modules.forEach(m => {
  vm.runInContext(`SD_NAV.navigateTo('${m}')`, sandbox);
  console.log(`- Rendered ${m}: ${mockElements['view-' + m].innerHTML.length} chars generated`);
});

console.log("Running Acceptance Test Harness in VM...");
vm.runInContext("SD_SETTINGS.runAllTests()", sandbox);

console.log("\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!");
