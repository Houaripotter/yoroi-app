const path=require('path'),fs=require('fs');const ROOT=process.argv[2];
const ts=require(path.join(ROOT,'node_modules/typescript'));
const all=[];function walk(d){let e;try{e=fs.readdirSync(d,{withFileTypes:true})}catch{return}for(const x of e){const p=path.join(d,x.name);if(x.isDirectory()){if(!['node_modules','__tests__'].includes(x.name)&&!/ \d$/.test(x.name))walk(p)}else if(/\.(tsx?|jsx?)$/.test(x.name)&&!/ \d\./.test(x.name))all.push(p)}}
['app','components','lib','constants','context','hooks','src'].forEach(d=>walk(path.join(ROOT,d)));
const set=new Set(all);const exts=['.tsx','.ts','.js','.jsx','.native.ts','.ios.ts','.android.ts','.native.tsx','.ios.tsx','/index.tsx','/index.ts','/index.js'];
function res(from,spec){let b;if(spec.startsWith('@/'))b=path.join(ROOT,spec.slice(2));else if(spec.startsWith('.'))b=path.resolve(path.dirname(from),spec);else return[];
 const out=[];if(set.has(b))out.push(b);for(const e of exts)if(set.has(b+e))out.push(b+e);return out}
const edges=new Map();
for(const f of all){let s;try{s=fs.readFileSync(f,'utf8')}catch{edges.set(f,[]);continue}
 const specs=[...s.matchAll(/(?:from\s+|import\(\s*|require\(\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]);
 edges.set(f,specs.flatMap(sp=>res(f,sp)))}
// racines : _layout + routes atteignables par navigation
const appFiles=all.filter(f=>f.includes('/app/'));
const routeOf=f=>'/'+path.relative(path.join(ROOT,'app'),f).replace(/\.(tsx?|jsx?)$/,'').replace(/\/index$/,'').replace(/\(.*?\)\//g,'');
const routes=new Map(appFiles.map(f=>[routeOf(f),f]));
const seen=new Set();const q=[path.join(ROOT,'app/_layout.tsx'),...appFiles.filter(f=>/\(tabs\)\/(_layout|index)|\(tabs\)\/[^/]+\/(_layout|index)\.tsx$|onboarding/.test(f))];
while(q.length){const f=q.pop();if(!f||seen.has(f))continue;seen.add(f);
 for(const g of edges.get(f)||[])q.push(g);
 let s='';try{s=fs.readFileSync(f,'utf8')}catch{}
 for(const m of s.matchAll(/['"`](\/[a-z0-9\-_/\[\]()]+)['"`?]/gi)){let r=m[1].replace(/\(.*?\)\//g,'').replace(/\/$/,'');if(routes.has(r))q.push(routes.get(r));
  for(const [k,v] of routes){if(k.includes('[')&&r.split('/').length===k.split('/').length&&k.split('/').every((p,i)=>p.startsWith('[')||p===r.split('/')[i]))q.push(v)}}
 for(const m of s.matchAll(/pathname:\s*['"](\/[^'"]+)['"]/g)){const r=m[1];if(routes.has(r))q.push(routes.get(r))}}
const live=[...seen].map(f=>path.relative(ROOT,f));
fs.writeFileSync(process.argv[3],JSON.stringify(live));
console.log('fichiers',all.length,'atteignables',live.length,'routes atteignables',live.filter(f=>f.startsWith('app/')).length,'/',appFiles.length);
