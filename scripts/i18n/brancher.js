// Branchement des traductions : remplace le texte français par tr("...") ou trp(...).
// Usage : node brancher.js <racine> <catalogue-fr.json> [--ecrire] [--rapport sortie.json]
// Par défaut : simulation, rien n'est écrit.
const path=require('path'),fs=require('fs');
const ROOT=path.resolve(process.argv[2]);const CAT=process.argv[3];
const ECRIRE=process.argv.includes('--ecrire');
const RAP=process.argv.includes('--rapport')?process.argv[process.argv.indexOf('--rapport')+1]:null;
const ts=require(path.join(ROOT,'node_modules/typescript'));
const catalogue=JSON.parse(fs.readFileSync(CAT,'utf8'));
const CONNU=new Set(catalogue.map(u=>u.fr));
const VIVANTS=new Set(JSON.parse(fs.readFileSync(path.join(path.dirname(CAT),'fichiers-vivants.json'),'utf8')));
const norm=s=>s.replace(/\s+/g,' ').trim();
const decode=s=>s.replace(/&apos;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
const fichiers=[];
function walk(d){let e;try{e=fs.readdirSync(d,{withFileTypes:true})}catch{return}
 for(const x of e){const p=path.join(d,x.name);
  if(x.isDirectory()){if(!['node_modules','__tests__','__mocks__','i18n'].includes(x.name)&&!/ \d$/.test(x.name))walk(p)}
  else if(/\.(tsx?|jsx?)$/.test(x.name)&&!/\.(test|spec)\./.test(x.name)&&!x.name.endsWith('.d.ts'))fichiers.push(p)}}
['app','components','lib','constants','context','hooks','src'].forEach(d=>walk(path.join(ROOT,d)));
const VALEURS=new Set();
const METH_LOGIQUE=/\.(includes|indexOf|lastIndexOf|startsWith|endsWith|match|matchAll|test|replace|replaceAll|split|search|localeCompare|has|get|set|delete|add|getItem|setItem|removeItem|find|findIndex|filter|some|every)$/;
const sources={};
for(const f of fichiers){let s;try{s=fs.readFileSync(f,'utf8')}catch{continue}sources[f]=s;
 const sf=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,f.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 (function v(n){
  if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)){const p=n.parent;
   if(ts.isBinaryExpression(p)&&/^(===|!==|==|!=)$/.test(p.operatorToken.getText()))VALEURS.add(norm(n.text));
   else if(ts.isCaseClause(p))VALEURS.add(norm(n.text));
   else if(ts.isPropertyAssignment(p)&&p.name===n)VALEURS.add(norm(n.text));
   else if(ts.isElementAccessExpression(p))VALEURS.add(norm(n.text));
   else if(ts.isCallExpression(p)&&METH_LOGIQUE.test(p.expression.getText()))VALEURS.add(norm(n.text));
   else if(ts.isLiteralTypeNode(p))VALEURS.add(norm(n.text));
  }
  ts.forEachChild(n,v)})(sf)}
const PROP_CODE=new Set(['id','key','cle','kind','type','slug','value','route','path','pathname','href','icon','iconName','testID','nativeID','storageKey','sql','table','column','field','source','uri','url','screen','event','eventName','style','color','fontFamily','mode','variant','code','ref','image','asset','lottie','sound','channelId','identifier','categoryIdentifier','format','pattern','regex','locale','lang','language','version','mime','mimeType','UTI','filename','fileName','extension','aliases','mots','motsCles','keywords','synonymes','synonyms','alias','tags','statut','plan']);
const PROP_JSX_CODE=new Set(['key','style','testID','nativeID','name','source','type','mode','variant','color','icon','href','id','pointerEvents','resizeMode','keyboardType','autoCapitalize','autoComplete','textContentType','returnKeyType','importantForAccessibility','accessibilityRole','role','fontFamily','weight','tone','kind','size','align']);
const APPEL_CODE=/^(console\.|logger\.|log\b|log\.|require$|t$|traduire$|traduirePluriel$|i18n\.t$|StyleSheet\.create$|AsyncStorage\.|SecureStore\.|router\.|navigation\.|Platform\.select$|Sentry\.|crashReporter\.|addBreadcrumb$|captureException$|captureMessage$|logEvent$|track$|trackEvent$|setProprietes$|setUserProperties$|setUserProperty$|identify$|analytics\.|db\.|.*\.exec(Async)?$|.*\.run(Async)?$|.*\.getAll(Async)?$|.*\.getFirst(Async)?$|.*\.prepare(Async)?$|.*Sql$|querySelector$|RegExp$|Symbol$|.*\.on$|.*\.emit$|.*\.addListener$|setItem$|getItem$|fetch$|.*Storage.*|Linking\.|.*\.postMessage$|.*\.sendMessage$|.*\.updateApplicationContext$|.*\.transferUserInfo$|JSON\.parse$|parseInt$|parseFloat$|Number$|Date$)/;
function raisonCode(n){
 const p=n.parent;
 if(ts.isPropertyAssignment(p)&&p.name===n)return'nom de propriété';
 if(ts.isImportDeclaration(p)||ts.isExportDeclaration(p)||ts.isExternalModuleReference(p))return'import';
 if(ts.isLiteralTypeNode(p))return'type';
 if(ts.isElementAccessExpression(p))return'index';
 if(ts.isCaseClause(p)||(ts.isBinaryExpression(p)&&/^(===|!==|==|!=|in)$/.test(p.operatorToken.getText())))return'comparaison';
 if(ts.isAsExpression(p)&&p.type.getText()==='const')return'as const';
 let q=n,d=0;
 while(q.parent&&d<8){q=q.parent;d++;
  if(ts.isCallExpression(q)||ts.isNewExpression(q)){const c=q.expression.getText();
   if(APPEL_CODE.test(c))return'appel technique '+c.slice(0,30);
   if(METH_LOGIQUE.test(c))return'recherche '+c.slice(-20);
   break}
  if(ts.isJsxAttribute(q)){if(PROP_JSX_CODE.has(q.name.getText()))return'attribut '+q.name.getText();break}
  if(ts.isPropertyAssignment(q)){const nm=q.name.getText().replace(/['"]/g,'');if(PROP_CODE.has(nm))return'propriété '+nm;continue}
  if(ts.isVariableDeclaration(q)||ts.isReturnStatement(q)||ts.isJsxExpression(q))break;
  if(ts.isAsExpression(q)&&q.type.getText()==='const')return'as const';
  if(ts.isArrayLiteralExpression(q)&&q.parent&&ts.isPropertyAccessExpression(q.parent)&&/^(includes|indexOf|some|every|find|findIndex|filter|has)$/.test(q.parent.name.text))return'tableau de recherche';
 }
 let r=n;while(r){if(ts.isFunctionLike(r)&&r.body&&r.body.statements&&r.body.statements[0]&&ts.isExpressionStatement(r.body.statements[0])&&/^['"]worklet['"]$/.test(r.body.statements[0].expression.getText()))return'worklet';r=r.parent}
 return null}
function identifiant(s){return /^[A-Za-z0-9_.:\-$\/#@]+$/.test(s)&&/[_.:\-$\/#@]/.test(s)}
function suffixOf(ex){let m=ex.match(/^\(?\s*(.+?)\s*(>|!==?|>=)\s*(1|2)\s*\)?\s*\?\s*['"`](s|x|es|aux)['"`]\s*:\s*['"`]['"`]$/);
 if(m)return{key:m[1].trim(),suffix:m[4],cond:ex.replace(/\s*\?[\s\S]*$/,'')};
 m=ex.match(/^(s|pl|plur|plural|sPlural)\(\s*(.+?)\s*\)$/);if(m)return{key:m[2].trim(),suffix:'s',cond:'('+ex+") !== ''"};return null}

// Texte JSX tel que React l'affiche : les lignes sont rognées et jointes par un espace
function jsxTexte(ch){const raw=ch.getFullText();const lines=raw.split(/\r?\n/);if(lines.length===1)return raw;
 const out=[];lines.forEach((l,i)=>{let t=l;if(i>0)t=t.replace(/^[ \t]+/,'');if(i<lines.length-1)t=t.replace(/[ \t]+$/,'');if(t)out.push(t)});return out.join(' ')}
// Suffixe de pluriel, lu dans l'arbre : (n > 1 ? 's' : '') ou s(n)
function suffixNode(e){while(e&&ts.isParenthesizedExpression(e))e=e.expression;if(!e)return null;
 const str=x=>x&&(ts.isStringLiteral(x)||ts.isNoSubstitutionTemplateLiteral(x))?x.text:null;
 if(ts.isConditionalExpression(e)){const a=str(e.whenTrue),b=str(e.whenFalse);
  if(['s','x','es','aux'].includes(a)&&b===''){const c=e.condition;let key;
   const cc=ts.isParenthesizedExpression(c)?c.expression:c;
   if(ts.isBinaryExpression(cc)&&/^(>|>=|!==|!=)$/.test(cc.operatorToken.getText())&&/^(1|2)$/.test(cc.right.getText()))key=cc.left.getText();
   else key='('+c.getText()+' ? 2 : 1)';
   return{key,suffix:a,cond:c.getText()}}}
 if(ts.isCallExpression(e)&&/^(s|pl|plur|plural|sPlural)$/.test(e.expression.getText())&&e.arguments.length===1)return{key:e.arguments[0].getText(),suffix:'s',cond:'('+e.getText()+") !== ''"};
 return null}
// Vérificateur de types : un texte attendu comme valeur littérale (union de chaînes) est un identifiant
const cfgTs=ts.readConfigFile(path.join(ROOT,'tsconfig.json'),ts.sys.readFile);
const optTs=ts.parseJsonConfigFileContent(cfgTs.config,ts.sys,ROOT).options;
const racines=fichiers.filter(f=>VIVANTS.has(path.relative(ROOT,f))&&/\.tsx?$/.test(f));
const programme=ts.createProgram(racines,{...optTs,noEmit:true,skipLibCheck:true});
const checker=programme.getTypeChecker();
function attenduLitteral(n){try{const t=checker.getContextualType(n);if(!t)return false;
 const parts=t.isUnion()?t.types:[t];const lit=parts.filter(x=>x.isStringLiteral());
 const autres=parts.filter(x=>!x.isStringLiteral()&&!(x.flags&ts.TypeFlags.Undefined)&&!(x.flags&ts.TypeFlags.Null));
 return lit.length>0&&autres.length===0}catch{return false}}
const stats={fichiers:0,remplaces:0,pluriels:0,phrasesJsx:0,ignores:{},inconnus:0};
const ignores=[];const modifs={};
function ign(f,n,raison,txt){const k=raison.split(' ')[0];stats.ignores[k]=(stats.ignores[k]||0)+1;ignores.push({f:path.relative(ROOT,f),l:n.getSourceFile().getLineAndCharacterOfPosition(n.getStart()).line+1,raison,txt:txt.slice(0,80)})}
const q=JSON.stringify;
for(const f of fichiers){const rel=path.relative(ROOT,f);if(!VIVANTS.has(rel))continue;
 const src=sources[f];if(!src)continue;
 const sf=programme.getSourceFile(f)||ts.createSourceFile(f,src,ts.ScriptTarget.Latest,true,f.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const edits=[];const vus=new Set();
 function ok(n,txt){const k=norm(txt);
  if(!CONNU.has(k)){stats.inconnus++;return false}
  if(VALEURS.has(k)){ign(f,n,'valeur utilisée par le code',k);return false}
  if(identifiant(k)){ign(f,n,'identifiant',k);return false}
  const r=raisonCode(n);if(r){ign(f,n,r,k);return false}
  if((ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))&&attenduLitteral(n)){ign(f,n,'type littéral',k);return false}
  return true}
 function visit(n){
  if((ts.isJsxElement(n)||ts.isJsxFragment(n))&&n.children.some(ch=>ts.isJsxText(ch)&&ch.getText().trim())){
   const kids=n.children;const hasExpr=kids.some(ch=>ts.isJsxExpression(ch)&&ch.expression);
   const textKids=kids.filter(ch=>ts.isJsxText(ch)&&ch.getText().trim());
   if(hasExpr||textKids.length>1){
    const nested=kids.some(ch=>ts.isJsxElement(ch)||ts.isJsxSelfClosingElement(ch)||ts.isJsxFragment(ch));
    let s='',vars=[],keys=[];
    for(const ch of kids){if(ts.isJsxText(ch))s+=decode(jsxTexte(ch));
     else if(ts.isJsxExpression(ch)&&ch.expression){const ex=ch.expression.getText();const m=suffixNode(ch.expression);
      if(m){let k=keys.findIndex(x=>x.key===m.key);if(k<0){keys.push(m);k=keys.length-1}s+='\u0000PL'+k+'\u0000'}else{s+='{'+vars.length+'}';vars.push(ex)}}
     else{s+='{'+vars.length+'}';vars.push(null)}}
    textKids.forEach(k=>vus.add(k));
    const clean=norm(s);
    if(nested){if(CONNU.has(clean.replace(/\u0000PL\d\u0000/g,'')))ign(f,n,'phrase avec balise imbriquée',clean);ts.forEachChild(n,visit);return}
    if(keys.length>1){ign(f,n,'plusieurs pluriels',clean);return}
    const a=kids[0].getStart(),b=kids[kids.length-1].getEnd();
    if(keys.length===1){const one=norm(clean.replace(/\u0000PL0\u0000/g,'')),other=norm(clean.replace(/\u0000PL0\u0000/g,keys[0].suffix));
     if(ok(n,one)&&CONNU.has(other)){edits.push([a,b,`{traduirePluriel(${keys[0].key}, ${keys[0].cond}, ${q(one)}, ${q(other)}${vars.map(v=>', '+v).join('')})}`]);stats.pluriels++;stats.phrasesJsx++}}
    else if(ok(n,clean)){edits.push([a,b,`{traduire(${q(clean)}${vars.map(v=>', '+v).join('')})}`]);stats.phrasesJsx++}
    return}}
  if(ts.isJsxText(n)&&!vus.has(n)){const t=decode(n.getText());if(t.trim()&&ok(n,t)){edits.push([n.getStart(),n.getEnd(),`{traduire(${q(norm(t))})}`]);}return}
  if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)){
   if(n.text.trim()&&CONNU.has(norm(n.text))&&ok(n,n.text)){
    const inAttr=ts.isJsxAttribute(n.parent);const call=`traduire(${n.getText()})`;edits.push([n.getStart(),n.getEnd(),inAttr?`{${call}}`:call]);}
   return}
  if(ts.isTemplateExpression(n)){let s=n.head.text,vars=[],keys=[];
   n.templateSpans.forEach(sp=>{const ex=sp.expression.getText();const m=suffixNode(sp.expression);
    if(m){let k=keys.findIndex(x=>x.key===m.key);if(k<0){keys.push(m);k=keys.length-1}s+='\u0000PL'+k+'\u0000'}else{s+='{'+vars.length+'}';vars.push(ex)}
    s+=sp.literal.text});
   if(keys.length>1){if(CONNU.has(norm(s.replace(/\u0000PL\d\u0000/g,''))))ign(f,n,'plusieurs pluriels',norm(s))}
   else if(keys.length===1){const one=s.replace(/\u0000PL0\u0000/g,''),other=s.replace(/\u0000PL0\u0000/g,keys[0].suffix);
    if(CONNU.has(norm(one))&&ok(n,one)){edits.push([n.getStart(),n.getEnd(),`traduirePluriel(${keys[0].key}, ${keys[0].cond}, ${q(one)}, ${q(other)}${vars.map(v=>', '+v).join('')})`]);stats.pluriels++;return}}
   else if(CONNU.has(norm(s))&&ok(n,s)){edits.push([n.getStart(),n.getEnd(),`traduire(${q(s)}${vars.map(v=>', '+v).join('')})`]);return}
  }
  ts.forEachChild(n,visit)}
 visit(sf);
 if(!edits.length)continue;
 edits.sort((a,b)=>a[0]-b[0]);const finaux=[];let fin=-1;
 for(const e of edits){if(e[0]>=fin){finaux.push(e);fin=e[1]}}
 let out=src;for(const [a,b,t] of finaux.slice().reverse())out=out.slice(0,a)+t+out.slice(b);
 const besoin=['traduire','traduirePluriel'].filter(x=>finaux.some(e=>e[2].includes(x+'(')));
 if(!/from ['"]@\/lib\/i18n\/tr['"]/.test(out)){
  const imp=`import { ${besoin.join(', ')} } from '@/lib/i18n/tr';`;
  const m=[...out.matchAll(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm)];
  if(m.length){const last=m[m.length-1];const pos=last.index+last[0].length;out=out.slice(0,pos)+'\n'+imp+out.slice(pos)}
  else{const dir=out.match(/^(\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/\s*\n)*/);const at=dir?dir[0].length:0;out=out.slice(0,at)+imp+'\n'+out.slice(at)}}
 stats.fichiers++;stats.remplaces+=finaux.length;modifs[rel]=finaux.length;
 if(ECRIRE)fs.writeFileSync(f,out);
}
console.log(JSON.stringify(stats,null,1));
if(RAP)fs.writeFileSync(RAP,JSON.stringify({stats,modifs,ignores},null,1));
