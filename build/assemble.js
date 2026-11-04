// build/assemble.js
// Assembles the final self-contained SD_OS_Suite.html

const fs = require('fs');
const path = require('path');

console.log("Beginning build assembly for SD OS Suite...");

const templatePath = path.join(__dirname, 'template.html');
const stylesPath = path.join(__dirname, 'styles.css');
const xlsxPath = path.join(__dirname, '..', 'xlsx.full.min.js');

const jsFiles = [
  'seed_generator.js',
  'core.js',
  'xlsx_helpers.js',
  'module_home.js',
  'module_audit.js',
  'module_vault.js',
  'module_analysis.js',
  'module_shifts.js',
  'module_tasks.js',
  'module_ranking.js',
  'module_mapping.js',
  'module_settings.js',
  'app_init.js'
];

let template = fs.readFileSync(templatePath, 'utf8');
const styles = fs.readFileSync(stylesPath, 'utf8');
const xlsxCode = fs.readFileSync(xlsxPath, 'utf8');

let combinedScripts = "";
jsFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  console.log(`Inlining ${file}...`);
  const content = fs.readFileSync(filePath, 'utf8');
  combinedScripts += `\n// --- ${file} ---\n` + content + `\n`;
});

// Use function replacement or split/join to avoid $1, $& interpolation corruption
template = template.split('/* __STYLES_PLACEHOLDER__ */').join(styles);
template = template.split('/* __XLSX_PLACEHOLDER__ */').join(xlsxCode);
template = template.split('/* __SCRIPTS_PLACEHOLDER__ */').join(combinedScripts);

const outputPath = path.join(__dirname, '..', 'SD_OS_Suite.html');
fs.writeFileSync(outputPath, template, 'utf8');

const stats = fs.statSync(outputPath);
console.log(`Build SUCCESS: SD_OS_Suite.html generated!`);
console.log(`Output Path: ${outputPath}`);
console.log(`File Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size.toLocaleString()} bytes)`);
