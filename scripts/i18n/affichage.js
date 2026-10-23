// Traduction à l'affichage : {x.name} devient {traduire(x.name)}, title={x.label} devient title={traduire(x.label)}.
// La donnée reste en français (elle peut être enregistrée ou comparée), seul l'écran est traduit.
// Usage : node affichage.js <racine> [--ecrire]
const path=require('path'),fs=require('fs');const ROOT=path.resolve(process.argv[2]);const ECRIRE=process.argv.includes('--ecrire');
const ts=require(path.join(ROOT,'node_modules/typescript'));
const VIV=new Set(JSON.parse(fs.readFileSync(path.join(ROOT,'scripts/i18n/fichiers-vivants.json'),'utf8')));
const CHAMPS=/^(name|nom|label|title|titre|sub|subtitle|description|desc|libelle|court|texte|text|short|full|phrase|tag|categorie|category|muscle|zone|type_label|sport|sportName|activity|session_type)$/;
const ATTR=/^(title|label|sub|subtitle|description|accessibilityLabel|placeholder|text|caption|hint|header|value_label)$/;
const cfg=ts.readConfigFile(path.join(ROOT,'tsconfig.json'),ts.sys.readFile);
const opt=ts.parseJsonConfigFileContent(cfg.config,ts.sys,ROOT).options;
const files=[...VIV].filter(f=>/\.tsx$/.test(f)).map(f=>path.join(ROOT,f)).filter(f=>fs.existsSync(f));
const prog=ts.createProgram(files,{...opt,noEmit:true,skipLibCheck:true});const ck=prog.getTypeChecker();
const st={fichiers:0,enveloppes:0};
function estTexte(e){try{const t=ck.getTypeAtLocation(e);const parts=t.isUnion()?t.types:[t];
 return parts.some(x=>x.flags&(ts.TypeFlags.String|ts.TypeFlags.StringLiteral))&&parts.every(x=>x.flags&(ts.TypeFlags.String|ts.TypeFlags.StringLiteral|ts.TypeFlags.Undefined|ts.TypeFlags.Null))}catch{return false}}
function cible(e){let x=e;while(ts.isParenthesizedExpression(x))x=x.expression;
 if(ts.isNonNullExpression(x))x=x.expression;
 return (ts.isPropertyAccessExpression(x))&&CHAMPS.test(x.name.text)}
for(const f of files){const sf=prog.getSourceFile(f);if(!sf)continue;const src=sf.getFullText();const ed=[];
 (function v(n){
  if(ts.isCallExpression(n)&&/^traduire/.test(n.expression.getText()))return;
  if(ts.isJsxExpression(n)&&n.expression&&cible(n.expression)&&estTexte(n.expression)){
   const p=n.parent;const enfant=ts.isJsxElement(p)||ts.isJsxFragment(p);
   const attr=ts.isJsxAttribute(p)&&ATTR.test(p.name.getText());
   if(enfant||attr){ed.push([n.expression.getStart(),n.expression.getEnd(),`traduire(${n.expression.getText()})`]);return}}
  ts.forEachChild(n,v)})(sf);
 if(!ed.length)continue;let out=src;for(const [a,b,t] of ed.sort((x,y)=>y[0]-x[0]))out=out.slice(0,a)+t+out.slice(b);
 const m=out.match(/import \{([^}]*)\} from '@\/lib\/i18n\/tr';/);
 if(m){if(!/\btraduire\b/.test(m[1]))out=out.replace(m[0],`import {${m[1].replace(/\s*$/,'')}, traduire } from '@/lib/i18n/tr';`)}
 else{const ms=[...out.matchAll(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm)];const imp="import { traduire } from '@/lib/i18n/tr';";
  if(ms.length){const l=ms[ms.length-1];const pos=l.index+l[0].length;out=out.slice(0,pos)+'\n'+imp+out.slice(pos)}else out=imp+'\n'+out}
 st.fichiers++;st.enveloppes+=ed.length;if(ECRIRE)fs.writeFileSync(f,out)}
console.log(JSON.stringify(st));
