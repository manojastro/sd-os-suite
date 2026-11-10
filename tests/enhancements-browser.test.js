const {chromium}=require('playwright-core');
const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/snap/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:900}});const p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.TEST_URL||pathToFileURL(path.join(__dirname,'../SD_OS_Suite.html')).href);
 await p.getByRole('heading',{name:'Overview'}).waitFor();
 const conversation=()=>p.locator('#conversation').innerText();
 const send=async text=>{await p.locator('#assistant-input').fill(text);await p.locator('#assistant-form button.primary').click();};

 // Assistant starters, expand control, and archive/undo through the local grammar.
 await p.getByRole('button',{name:'Ask SD OS'}).click();
 assert.equal(await p.locator('#assistant-starters button').count(),4);
 await p.locator('#assistant-starters button',{hasText:'Open tasks'}).click();
 await p.getByText('No open tasks.').waitFor();
 assert.equal(await p.locator('#assistant-starters').isVisible(),false,'starters hide once the conversation starts');
 await p.getByRole('button',{name:'Expand',exact:true}).click();
 assert.equal(await p.locator('#assistant-expand').getAttribute('aria-pressed'),'true');
 assert.equal(await p.locator('#assistant').evaluate(el=>el.classList.contains('expanded')),true);
 await p.getByRole('button',{name:'Collapse',exact:true}).click();
 await send('create task Browser check');
 await p.getByText(/Created task Browser check \(/).waitFor();
 const id=(await conversation()).match(/Created task Browser check \(([^)]+)\)/)[1];
 await send('list tasks');await p.getByText(/1 open task\(s\)[\s\S]*Browser check/).waitFor();
 await send('archive task '+id);await p.getByText('Assistant: Archived task Browser check.').waitFor();
 await send('undo');await p.getByText('Assistant: Action undone.').waitFor();
 await send('list tasks');
 assert.match(await conversation(),/1 open task\(s\)/,'undo restores the task as open');
 await p.getByRole('button',{name:'Clear conversation'}).click();
 assert.equal(await p.locator('#assistant-starters').isVisible(),true,'starters return after clearing');
 await p.keyboard.press('Escape');assert.equal(await p.locator('#assistant').isVisible(),false);

 // Roster checks use saved policy and block invalid shift edits.
 await p.getByRole('button',{name:'Team Directory',exact:true}).click();
 await p.getByRole('button',{name:'Add employee'}).click();
 await p.locator('#employee-id').fill('e1');await p.locator('#employee-name').fill('Ada');await p.locator('#employee-form button').click();
 await p.getByText('Ada',{exact:true}).waitFor();
 await p.getByRole('button',{name:'Shifts',exact:true}).click();
 await p.getByRole('button',{name:'Add shift'}).click();
 await p.locator('#shift-employee').selectOption('e1');await p.locator('#shift-start').fill('2026-11-04T09:00');await p.locator('#shift-end').fill('2026-11-04T17:00');await p.locator('#shift-form button').click();
 await p.getByRole('button',{name:'Add shift'}).click();
 await p.locator('#shift-employee').selectOption('e1');await p.locator('#shift-start').fill('2026-11-05T02:00');await p.locator('#shift-end').fill('2026-11-05T10:00');await p.locator('#shift-form button').click();
 await p.getByText('Less than 10 hours rest.').waitFor();
 assert.equal(await p.locator('#dialog').evaluate(d=>d.open),true,'a blocked shift stays in the dialog');
 await p.locator('#shift-start').fill('2026-11-05T03:30');await p.locator('#shift-end').fill('2026-11-05T11:30');await p.locator('#shift-form button').click();
 await p.getByText(/Saved for this session only|Saved\./).waitFor();
 await p.getByRole('button',{name:'Settings',exact:true}).click();
 await p.locator('#policy-rest').fill('12');await p.getByRole('button',{name:'Preview policy'}).click();await p.getByRole('button',{name:'Apply policy'}).click();await p.getByText('Policy saved.').waitFor();
 await p.getByRole('button',{name:'Shifts',exact:true}).click();await p.getByRole('button',{name:'Validate roster'}).click();
 await p.getByText('Less than 12 hours rest.').waitFor();

 for(const width of [1440,390]){await p.setViewportSize({width,height:800});await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width}`);}
 assert.deepEqual(errors,[]);await browser.close();
 console.log('PASS: assistant starters, expand, archive and undo; shift rest checks use saved policy.');
})().catch(e=>{console.error(e);process.exitCode=1});
