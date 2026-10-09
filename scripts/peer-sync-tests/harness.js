process.removeAllListeners('warning');
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname,'../../lib/database.native.ts'),'utf8') + fs.readFileSync(require('path').join(__dirname,'../../lib/trainingJournalService.native.ts'),'utf8');
const creates = [...src.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\n\s*\);/g)];
const seen=new Set(); const schema=[];
for (const m of creates){ if(seen.has(m[1])) continue; seen.add(m[1]); schema.push(`CREATE TABLE IF NOT EXISTS ${m[1]} (${m[2]});`); }
const extraCols = [...[...src.matchAll(/safeAddColumn\(\w+, '(\w+)', '(\w+)', '([^']+)'\)/g)].map(m=>[m[1],m[2],m[3]]), ['trainings','combat_rounds','TEXT'],['trainings','weekly_plan_id','INTEGER'],['trainings','min_heart_rate','INTEGER'],['trainings','source','TEXT'],['trainings','heart_rate','INTEGER'],['trainings','max_heart_rate','INTEGER']];

function makeDb(){
  const d = new DatabaseSync(':memory:'); d.exec('PRAGMA foreign_keys=OFF');
  for (const s of schema) { try { d.exec(s); } catch(e){ /* skip */ } }
  for (const [t,c,ty] of extraCols){ try{ d.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${ty}`);}catch{} }
  const norm = (p)=> (p||[]).map(v => v===undefined?null: typeof v==='boolean'? (v?1:0): v);
  return {
    raw: d,
    getAllAsync: async (sql,p)=> d.prepare(sql).all(...norm(p)).map(r=>({...r})),
    getFirstAsync: async (sql,p)=> { const r=d.prepare(sql).get(...norm(p)); return r?{...r}:null; },
    runAsync: async (sql,p)=> { const r=d.prepare(sql).run(...norm(p)); return {changes:Number(r.changes), lastInsertRowId:Number(r.lastInsertRowid)}; },
    execAsync: async (sql)=> { d.exec(sql); },
  };
}

const network = { queue: [], devices: [] };
function makeDevice(name){
  const ctx = { name, db: makeDb(), kv: new Map(), logs: [], events: [], connected: true };
  ctx.peers = () => network.devices.filter(x=>x!==ctx && x.connected && ctx.connected).map(x=>x.name);
  ctx.send = (data) => { for (const o of network.devices) if (o!==ctx && o.connected && ctx.connected) network.queue.push({to:o, peer:name, data}); ctx.sentBytes=(ctx.sentBytes||0)+data.length; ctx.sentMsgs=(ctx.sentMsgs||0)+1; };
  globalThis.__CTX = ctx;
  delete require.cache[require.resolve('./bundle.js')];
  ctx.svc = require('./bundle.js');
  network.devices.push(ctx);
  return ctx;
}
async function settle(){
  for (let idle=0; idle<30;){
    if (network.queue.length){ idle=0; const m=network.queue.shift(); await m.to.onData({peer:m.peer, data:m.data}); }
    else { idle++; await new Promise(r=>setTimeout(r,5)); }
  }
}
async function connectAll(){
  for (const d of network.devices){ d.connected=true; }
  for (const d of network.devices){ for (const o of network.devices) if(o!==d) await d.onPeer({peer:o.name,state:'connected'}); }
  await settle();
}
module.exports = { makeDevice, settle, connectAll, network, sleep: (ms)=>new Promise(r=>setTimeout(r,ms)) };
