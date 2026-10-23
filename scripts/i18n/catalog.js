// Catalogue YOROI 3 : unités de traduction = phrases entières
var crypto=require('crypto');
var base=require('fs').readFileSync(require('path').join(__dirname,'scan.js'),'utf8');
// réutilise FRW, ENW, frScore, SKIPCALL, SKIPPROP, ctxOf, cat, files depuis scan.js
eval(base.split('const res=[]')[0].replace(/^const /gm,'var ').replace(/;const /g,';var '));
eval('var ctxOf='+base.match(/function ctxOf[\s\S]*?\n return\{\}\}/)[0].replace('function ctxOf','function'));
eval('var cat='+base.match(/function cat\(f\)[\s\S]*?return'logique_lib'\}/)[0].replace('function cat','function'));
const PLURAL=/^(.+?)\s*(>|!==?|>=)\s*(1|2)\s*\?\s*['"`](s|x|es)['"`]\s*:\s*['"`]['"`]$/;

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
const units=new Map();let skipped={demo:0,log:0};
function addUnit(fr,meta){
  const id=crypto.createHash('sha1').update(fr).digest('hex').slice(0,10);
  if(!units.has(id))units.set(id,{id,fr,...meta,refs:[]});
  const u=units.get(id);if(u.refs.length<5)u.refs.push(meta.ref);u.count=(u.count||0)+1}
for(const f of files){const rel=path.relative(ROOT,f);
 if(/demoData|demoProfiles|csvTemplates/i.test(rel)){skipped.demo++;continue}
 let src;try{src=fs.readFileSync(f,'utf8')}catch{continue}
 const sf=ts.createSourceFile(f,src,ts.ScriptTarget.Latest,true,f.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const line=n=>sf.getLineAndCharacterOfPosition(n.getStart()).line+1;
 const handled=new Set();
 // Suffixe de pluriel : n > 1 ? 's' : ''  ou  s(n)  ou  pl(n). Renvoie {key,suffix} ou null.
 function suffixOf(ex){let m=ex.match(/^\(?\s*(.+?)\s*(>|!==?|>=)\s*(1|2)\s*\)?\s*\?\s*['"`](s|x|es|aux)['"`]\s*:\s*['"`]['"`]$/);
  if(m)return{key:m[1].trim(),suffix:m[4]};
  m=ex.match(/^(s|pl|plur|plural|sPlural)\(\s*(.+?)\s*\)$/);if(m)return{key:m[2].trim(),suffix:'s'};return null}
 function tplParts(n){let s=n.head.text,vars=[],keys=[];
  n.templateSpans.forEach((sp,i)=>{const ex=sp.expression.getText();const m=suffixNode(sp.expression);
   if(m){let k=keys.findIndex(x=>x.key===m.key);if(k<0){keys.push(m);k=keys.length-1}s+='\u0000PL'+k+'\u0000'}else{s+='{'+vars.length+'}';vars.push(ex)}
   s+=sp.literal.text});return{s,vars,keys}}
 function emit(n,text,kind,extra={}){
  const clean=text.replace(/\s+/g,' ').trim();if(!clean)return;
  if(!frScore(clean.replace(/\u0000PL\d\u0000/g,'')))return;
  const c=kind==='jsx'?{}:ctxOf(n);if(c.skip)return;
  if(c.call&&/log|Log|debug/.test(c.call)){skipped.log++;return}
  const meta={kind,ctx:c.prop||c.call||'',zone:cat(f),ref:rel+':'+line(n),...extra};
  const keys=extra.keys||[];
  if(keys.length===1){const suf=keys[0].suffix;
   addUnit(clean.replace(/\u0000PL0\u0000/g,''),{...meta,plural:'one',keys:undefined});
   addUnit(clean.replace(/\u0000PL0\u0000/g,suf),{...meta,plural:'other',keys:undefined});
  }else if(keys.length>1){
   // plusieurs nombres differents : 1 et plusieurs pour chacun, on garde une forme par combinaison
   const n=keys.length;for(let mask=0;mask<(1<<n);mask++){let t=clean;keys.forEach((k,i)=>{t=t.split('\u0000PL'+i+'\u0000').join(mask&(1<<i)?k.suffix:'')});
    addUnit(t,{...meta,plural:'multi:'+keys.map((k,i)=>(mask&(1<<i))?'other':'one').join(','),keys:undefined})}
  }else addUnit(clean,meta)}
 function visit(n){
  // JSX : regrouper texte + expressions d'un même élément en une phrase
  if((ts.isJsxElement(n)||ts.isJsxFragment(n))&&n.children.some(ch=>ts.isJsxText(ch)&&ch.getText().trim())){
   const kids=n.children;const hasExpr=kids.some(ch=>ts.isJsxExpression(ch)&&ch.expression);
   const textKids=kids.filter(ch=>ts.isJsxText(ch)&&ch.getText().trim());
   if(hasExpr||textKids.length>1){let s='',vars=0,keys=[];
    for(const ch of kids){if(ts.isJsxText(ch))s+=jsxTexte(ch).replace(/&apos;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
     else if(ts.isJsxExpression(ch)&&ch.expression){const ex=ch.expression.getText();const m=suffixNode(ch.expression);
      if(m){let k=keys.findIndex(x=>x.key===m.key);if(k<0){keys.push(m);k=keys.length-1}s+='\u0000PL'+k+'\u0000'}else s+='{'+(vars++)+'}'}
     else s+='{'+(vars++)+'}'}
    textKids.forEach(k=>handled.add(k));
    emit(n,s,'jsx_phrase',{keys});}
  }
  if(ts.isJsxText(n)&&!handled.has(n)){const t=n.getText().replace(/&apos;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&');if(t.trim())emit(n,t,'jsx')}
  else if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))emit(n,n.text,'str');
  else if(ts.isTemplateExpression(n)){const p=tplParts(n);emit(n,p.s,'tpl',{keys:p.keys})}
  ts.forEachChild(n,visit)}
 visit(sf)}
const arr=[...units.values()];
fs.writeFileSync(process.argv[3],JSON.stringify(arr,null,1));
const z={};arr.forEach(u=>z[u.zone]=(z[u.zone]||0)+1);
console.log('unites',arr.length,'occurrences',arr.reduce((a,u)=>a+u.count,0),'sautes',JSON.stringify(skipped));
console.log('par zone',JSON.stringify(z));
console.log('pluriels',arr.filter(u=>u.plural).length,'phrases jsx',arr.filter(u=>u.kind==='jsx_phrase').length,'avec variables',arr.filter(u=>/\{\d\}/.test(u.fr)).length);
console.log('mots',arr.reduce((a,u)=>a+u.fr.split(/\s+/).length,0));
