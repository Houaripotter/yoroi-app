// Dates et nombres dans la langue de l'app.
// 1) import { fr } from 'date-fns/locale'  devient la locale date-fns de la langue
// 2) 'fr-FR' (toLocaleString, Intl)          devient LOCALE
// 3) .replace('.', ',')                      devient .replace('.', DECIMAL)
// En français, l'affichage reste identique. Usage : node nombres.js <racine> [--ecrire]
const path=require('path'),fs=require('fs');const ROOT=path.resolve(process.argv[2]);const ECRIRE=process.argv.includes('--ecrire');
const ts=require(path.join(ROOT,'node_modules/typescript'));
const fichiers=[];function walk(d){let e;try{e=fs.readdirSync(d,{withFileTypes:true})}catch{return}
 for(const x of e){const p=path.join(d,x.name);if(x.isDirectory()){if(!['node_modules','__tests__','i18n'].includes(x.name))walk(p)}else if(/\.(tsx?|jsx?)$/.test(x.name)&&!/\.(test|spec)\./.test(x.name))fichiers.push(p)}}
['app','components','lib','constants','context','hooks','src'].forEach(d=>walk(path.join(ROOT,d)));
const st={dateFns:0,frFR:0,decimal:0,fichiers:0};
for(const f of fichiers){let src;try{src=fs.readFileSync(f,'utf8')}catch{continue}
 if(!/fr-FR|date-fns\/locale|replace\(/.test(src))continue;
 const sf=ts.createSourceFile(f,src,ts.ScriptTarget.Latest,true,f.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const ed=[];const noms=new Set();
 (function v(n){
  if(ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='date-fns/locale'){const t=n.getText();
   if(/^import\s*\{\s*fr\s*\}\s*from\s*['"]date-fns\/locale['"];?$/.test(t)){ed.push([n.getStart(),n.getEnd(),"import { DATE_FNS_LOCALE as fr } from '@/lib/i18n/dateLocale';"]);st.dateFns++}return}
  if(ts.isStringLiteral(n)&&n.text==='fr-FR'){const p=n.parent;
   const cmp=ts.isBinaryExpression(p)&&/^(===|!==|==|!=)$/.test(p.operatorToken.getText());
   if(!cmp&&!ts.isLiteralTypeNode(p)&&!(ts.isPropertyAssignment(p)&&p.name===n)&&!ts.isCaseClause(p)){ed.push([n.getStart(),n.getEnd(),ts.isJsxAttribute(p)?'{LOCALE}':'LOCALE']);noms.add('LOCALE');st.frFR++}}
  if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='replace'&&n.arguments.length===2){
   const [a,b]=n.arguments;const at=a.getText();
   if((at==="'.'"||at==='"."'||at==='/\\./g'||at==='/\\./')&&ts.isStringLiteral(b)&&b.text===','){ed.push([b.getStart(),b.getEnd(),'DECIMAL']);noms.add('DECIMAL');st.decimal++}}
  ts.forEachChild(n,v)})(sf);
 if(!ed.length)continue;
 let out=src;for(const [a,b,t] of ed.sort((x,y)=>y[0]-x[0]))out=out.slice(0,a)+t+out.slice(b);
 if(noms.size){const m=out.match(/import \{([^}]*)\} from '(?:@\/lib\/i18n|\.\/i18n|\.\.\/i18n)\/tr';/);
  if(m){const have=m[1].split(',').map(s=>s.trim()).filter(Boolean);const all=[...new Set([...have,...noms])];out=out.replace(m[0],`import { ${all.join(', ')} } from '@/lib/i18n/tr';`)}
  else{const imp=`import { ${[...noms].join(', ')} } from '@/lib/i18n/tr';`;const ms=[...out.matchAll(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm)];
   if(ms.length){const l=ms[ms.length-1];const pos=l.index+l[0].length;out=out.slice(0,pos)+'\n'+imp+out.slice(pos)}else out=imp+'\n'+out}}
 st.fichiers++;if(ECRIRE)fs.writeFileSync(f,out)}
console.log(JSON.stringify(st));
