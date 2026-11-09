/* Bounded, deterministic assistant tools; callers own persistence and consent. */
(function (root, factory) {
  const D = typeof module === 'object' && module.exports ? require('./domain.js') : root.SDDomain;
  const R = typeof module === 'object' && module.exports ? require('./roster.js') : root.SDRoster;
  const Audit = typeof module === 'object' && module.exports ? require('./audit.js') : root.SDAudit;
  const Insights = typeof module === 'object' && module.exports ? require('./insights.js') : root.SDInsights;
  const api = factory(D,R,Audit,Insights);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.SDAssistant = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D,R,Audit,Insights) {
  'use strict';
  const registry = {
    navigate: {write:false,schema:{type:'object',properties:{page:{type:'string',enum:['overview','audits','operations','shifts','tasks','performance','directory','settings']}},required:['page'],additionalProperties:false}},
    start_import: {write:false,schema:{type:'object',properties:{},required:[],additionalProperties:false}},
    export_backup: {write:false,schema:{type:'object',properties:{},required:[],additionalProperties:false}},
    search_records: {write:false, schema:{type:'object',properties:{collection:{type:'string',enum:['employees','tickets','tasks','audits','roster','demand','performance','baselines']},query:{type:'string',maxLength:100}},required:['collection','query'],additionalProperties:false}},
    get_metric: {write:false,schema:{type:'object',properties:{name:{type:'string',enum:['tickets']}},required:['name'],additionalProperties:false}},
    run_audit: {write:false,schema:{type:'object',properties:{transcript:{type:'string',maxLength:10000}},required:['transcript'],additionalProperties:false}},
    validate_roster: {write:false,schema:{type:'object',properties:{},required:[],additionalProperties:false}},
    compare_periods: {write:false,schema:{type:'object',properties:{from:{type:'string'},to:{type:'string'},comparisonFrom:{type:'string'}},required:['from','to','comparisonFrom'],additionalProperties:false}},
    get_record: {write:false,schema:{type:'object',properties:{collection:{type:'string',enum:['employees','tickets','tasks','audits','roster','demand','performance','baselines']},id:{type:'string',maxLength:100}},required:['collection','id'],additionalProperties:false}},
    get_source_rows: {write:false,schema:{type:'object',properties:{importId:{type:'string',maxLength:100},offset:{type:'integer',minimum:0,maximum:100000}},required:['importId','offset'],additionalProperties:false}},
    get_data_provenance: {write:false,schema:{type:'object',properties:{},required:[],additionalProperties:false}},
    update_task: {write:true,schema:{type:'object',properties:{id:{type:'string',maxLength:100},status:{type:'string',enum:['Open','In progress','Blocked','Done']},priority:{type:'string',enum:['Low','Normal','High','Urgent']},dueDate:{type:'string',maxLength:10},ownerId:{type:'string',maxLength:100}},required:['id'],additionalProperties:false}},
    create_task: {write:true,schema:{type:'object',properties:{title:{type:'string',maxLength:300},ownerId:{type:'string'},dueDate:{type:'string'},priority:{type:'string',enum:['Low','Normal','High','Urgent']},idempotencyKey:{type:'string',maxLength:100}},required:['title','idempotencyKey'],additionalProperties:false}}
  };
  function validate(name, args) {
    const tool=registry[name]; if (!tool) throw new Error('Unknown tool.');
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Tool arguments must be an object.');
    const s=tool.schema;
    for (const k of Object.keys(args)) if (!s.properties[k]) throw new Error(`Unexpected field: ${k}.`);
    for (const k of s.required) if (!(k in args) || (typeof args[k] === 'string' && !args[k].trim())) throw new Error(`Missing field: ${k}.`);
    for (const [k,v] of Object.entries(args)) { const p=s.properties[k]; if ((p.type==='integer'?!Number.isInteger(v):typeof v!==p.type) || (p.maxLength && v.length>p.maxLength) || (p.minimum!==undefined&&v<p.minimum) || (p.maximum!==undefined&&v>p.maximum) || (p.enum && !p.enum.includes(v))) throw new Error(`Invalid field: ${k}.`); }
    return tool;
  }
  function execute(state, name, args) {
    try {
      validate(name,args);
      if (name==='navigate') return {ok:true,navigate:args.page,affectedIds:[]};
      if (name==='start_import') return {ok:true,interaction:'import',message:'Select a local file in the import wizard.',affectedIds:[]};
      if (name==='export_backup') return {ok:true,interaction:'backup',message:'Backup is ready for download.',affectedIds:[]};
      if (name==='search_records') {
        const query=args.query.toLocaleLowerCase();
        const fields={employees:['id','name','team'],tickets:['id','team','status'],tasks:['id','title','status'],audits:['id','ref','analyst'],roster:['id','employeeId','team','start','end'],demand:['id','team','start','volume'],performance:['id','employeeId','period','metric','value'],baselines:['id','team','period','metric','expected']}[args.collection];
        const matches=state[args.collection].filter(r=>fields.some(k=>String(r[k] || '').toLocaleLowerCase().includes(query)));
        return {ok:true,results:matches.slice(0,20).map(r=>Object.fromEntries(fields.map(k=>[k,r[k] || '']))),total:matches.length,scope:'All data',affectedIds:[]};
      }
      if (name==='run_audit')return {ok:true,result:Audit.run(args.transcript),message:'Keyword flags require human review; this is not an LLM quality assessment.',affectedIds:[]};
      if (name==='validate_roster')return {ok:true,result:R.validate(state.roster.filter(r=>r.kind!=='leave'),state.roster.filter(r=>r.kind==='leave'),{minRestHours:state.settings.minRestHours??10,maxWeeklyWorkingDays:state.settings.maxWeeklyWorkingDays??5,maxConsecutiveDays:state.settings.maxConsecutiveDays??6}),scope:'All roster data',affectedIds:[]};
      if (name==='compare_periods')return {ok:true,result:Insights.compare(state.tickets,state.settings,args.from,args.to,args.comparisonFrom),scope:'All tickets',affectedIds:[]};
      if (name==='get_record') {
        const item=state[args.collection].find(r=>r.id===args.id);if(!item)throw Error('Record not found.');
        // Do not expose full transcripts or notes to an external provider.
        const safe={...item};delete safe.transcript;delete safe.notes;delete safe.sourceData;return {ok:true,record:safe,scope:'All data',affectedIds:[]};
      }
      if (name==='get_source_rows') {const imp=state.imports.find(x=>x.id===args.importId);if(!imp)throw Error('Import not found.');const rows=(imp.sourceRows||[]).slice(args.offset,args.offset+20).map(r=>({sourceRow:r.sourceRow,data:Object.fromEntries(Object.entries(r.data||{}).map(([k,v])=>[k,/password|token|secret|email|phone/i.test(k)?'[masked]':String(v).slice(0,500)]))}));return {ok:true,rows,total:(imp.sourceRows||[]).length,offset:args.offset,scope:'Up to 20 rows; sensitive columns masked',affectedIds:[]};}
      if (name==='get_data_provenance') return {ok:true,imports:state.imports.slice(-20).map(({id,kind,filename,sheet,importedAt,revision,mode,rowIds})=>({id,kind,filename,sheet,importedAt,revision,mode,rowCount:rowIds?.length||0})),scope:'Most recent 20 imports; source rows available on request',affectedIds:[]};
      if (name==='update_task') {const task=state.tasks.find(t=>t.id===args.id);if(!task)throw Error('Task not found; supply its exact ID.');const patch=Object.fromEntries(Object.entries(args).filter(([k])=>k!=='id'));if(!Object.keys(patch).length)throw Error('Provide at least one task change.');const before=Object.fromEntries(Object.keys(patch).map(k=>[k,task[k]||'']));D.updateTask(state,args.id,patch);return {ok:true,task,before,affectedIds:[task.id]};}
      if (name==='get_metric') return {ok:true,metric:D.ticketMetrics(state.tickets,state.settings.timezone,state.settings.cutoffHour),scope:'All tickets',affectedIds:[]};
      const result=D.createTask(state,args,{idempotencyKey:args.idempotencyKey});
      return {ok:true,task:result.record,duplicate:result.duplicate,affectedIds:[result.record.id]};
    } catch (e) { return {ok:false,error:e.message,affectedIds:[]}; }
  }
  function localCommand(text) {
    const trimmed=String(text).trim();
    if (/^help$/i.test(trimmed)) return {help:'Commands: help; tickets; search employees|tickets|tasks|audits|roster|demand|performance|baselines <text>; create task <title>; complete task <ID>; reopen task <ID>; assign task <ID> to <employee ID>; set task <ID> priority <priority>; set task <ID> due <YYYY-MM-DD>; open <page>; import data; export backup; validate roster; audit <transcript>; undo.'};
    const nav=/^open (overview|audits|operations|shifts|tasks|performance|directory|settings)$/i.exec(trimmed);if(nav)return {name:'navigate',args:{page:nav[1].toLowerCase()}};
    if(/^validate roster$/i.test(trimmed))return {name:'validate_roster',args:{}};
    const audit=/^audit\s+([\s\S]+)$/i.exec(trimmed);if(audit)return {name:'run_audit',args:{transcript:audit[1]}};
    if(/^import data$/i.test(trimmed))return {name:'start_import',args:{}};
    if(/^export backup$/i.test(trimmed))return {name:'export_backup',args:{}};
    if (/^tickets$/i.test(trimmed)) return {name:'get_metric',args:{name:'tickets'}};
    const search=/^search (employees|tickets|tasks|audits|roster|demand|performance|baselines)\s+(.+)$/i.exec(trimmed);
    if (search) return {name:'search_records',args:{collection:search[1].toLowerCase(),query:search[2]}};
    const assignment=/^assign task (\S+) to (\S+)$/i.exec(trimmed);if(assignment)return {name:'update_task',args:{id:assignment[1],ownerId:assignment[2]}};
    const priority=/^set task (\S+) priority (low|normal|high|urgent)$/i.exec(trimmed);if(priority)return {name:'update_task',args:{id:priority[1],priority:priority[2][0].toUpperCase()+priority[2].slice(1).toLowerCase()}};
    const due=/^set task (\S+) due (\d{4}-\d\d-\d\d)$/i.exec(trimmed);if(due)return {name:'update_task',args:{id:due[1],dueDate:due[2]}};
    const update=/^(complete|reopen) task\s+(.+)$/i.exec(trimmed);
    if(update)return {name:'update_task',args:{id:update[2],status:update[1].toLowerCase()==='complete'?'Done':'Open'}};
    const task=/^create task\s+(.+)$/i.exec(trimmed);
    if (task) return {name:'create_task',args:{title:task[1],idempotencyKey:globalThis.crypto.randomUUID()}};
    return {error:'Unsupported local command. Type help for the supported grammar.'};
  }
  return {registry,validate,execute,localCommand};
});
