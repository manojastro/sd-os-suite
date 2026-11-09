// Assemble the new workspace as a self-contained HTML file.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'), src=path.join(root,'src');
let html=fs.readFileSync(path.join(src,'template.html'),'utf8');
const rubric='const SD_DEFAULT_RUBRIC = '+fs.readFileSync(path.join(src,'default-rubric.json'),'utf8')+';\n';
const scripts=rubric+['domain.js','storage.js','imports.js','roster.js','capacity.js','performance.js','audit.js','reconciliation.js','insights.js','assistant.js','provider.js','ui.js'].map(f=>fs.readFileSync(path.join(src,f),'utf8')).join('\n');
html=html.replace('/* __STYLES_PLACEHOLDER__ */',()=>fs.readFileSync(path.join(src,'styles.css'),'utf8')).replace('/* __XLSX_PLACEHOLDER__ */',()=>fs.readFileSync(path.join(root,'xlsx.full.min.js'),'utf8')).replace('/* __SCRIPTS_PLACEHOLDER__ */',()=>scripts);
fs.writeFileSync(path.join(root,'SD_OS_Suite.html'),html.trimEnd()+'\n');
console.log('Built SD_OS_Suite.html');
