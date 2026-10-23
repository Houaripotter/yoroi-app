// Scanner YOROI : texte français en dur, par AST TypeScript
const path=require('path'),fs=require('fs');
const ROOT=process.argv[2];const ts=require(path.join(ROOT,'node_modules/typescript'));
const DIRS=['app','components','lib','constants','context','hooks','src'];
const SKIPDIR=new Set(['node_modules','i18n','__tests__','__mocks__']);
const files=[];
function walk(d){let e;try{e=fs.readdirSync(d,{withFileTypes:true})}catch{return}
 for(const x of e){const p=path.join(d,x.name);if(x.isDirectory()){if(!SKIPDIR.has(x.name)&&!/ \d$/.test(x.name))walk(p)}
 else if(/\.(tsx?|jsx?)$/.test(x.name)&&!/\.(test|spec)\./.test(x.name)&&!/ \d\.\w+$/.test(x.name)&&!x.name.endsWith('.d.ts'))files.push(p)}}
DIRS.forEach(d=>walk(path.join(ROOT,d)));
const FRW=new Set(`le la les un une des du de au aux et ou est sont pas plus avec pour par sur dans sans sous ton ta tes votre vos ton mon ma mes ce cette ces qui que quoi tu te toi vous nous il elle ils elles ne jour jours semaine semaines mois an ans année heure heures minute minutes seconde secondes séance séances entraînement entrainement poids taille sommeil eau repos ajouter supprimer modifier enregistrer annuler valider fermer retour suivant précédent terminer commencer démarrer aujourd hier demain matin soir nuit lundi mardi mercredi jeudi vendredi samedi dimanche janvier février mars avril mai juin juillet août septembre octobre novembre décembre restant restante restants restantes total objectif objectifs niveau rang ceinture blanche bleue violette marron noire victoire défaite combat combats erreur succès attention impossible aucun aucune nouveau nouvelle nouveaux toutes tous tout toute très bien bravo super réglages paramètres profil accueil statistiques historique données sauvegarde exporter importer partager oui non chargement mesures mesure perte gain cible actuel actuelle depuis encore déjà fois série séries répétitions exercice exercices durée distance vitesse fréquence cardiaque blessure blessures douleur santé hydratation calories glucides protéines lipides repas faim jeûne débloqué débloquer gratuit essai abonnement mensuel annuel acheter restaurer premium illimité choisir sélectionner rechercher aucune semaine chaque votre ici voir lire plus moins avant après pendant entre`.split(/\s+/));
const ENW=new Set('the and you your with for this that is are of to in on at from all not no yes day days week'.split(' '));
function frScore(s){const t=s.replace(/&apos;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
 if(!/[A-Za-zÀ-ÿ]/.test(t))return 0;
 if(/^[\w.\-]+$/.test(t)&&/[._]/.test(t))return 0; // cles
 if(/^(https?:|\/|#|\.\.?\/|@)/.test(t.trim()))return 0;
 if(/^[a-z]+([A-Z][a-z0-9]*)+$/.test(t.trim()))return 0; // camelCase
 if(/^[A-Z0-9_]+$/.test(t.trim())&&t.trim().length<4) return 0;
 const words=t.toLowerCase().match(/[a-zà-ÿœ']+/g)||[];
 let fr=0,en=0;
 for(let w of words){w=w.replace(/^(l|d|j|n|s|t|qu|c)'/,'');if(FRW.has(w))fr++;if(ENW.has(w))en++}
 if(/[éèêëàâçùûôîïœ]/i.test(t))fr+=2;
 if(/\b(l|d|j|n|s|t|qu|c)'[a-zà-ÿ]/i.test(t))fr+=1;
 return fr>en?fr:0}
const SKIPCALL=/^(console\.|logger\.|log\.|require$|t$|i18n\.t$|getTranslation$|StyleSheet\.create$|AsyncStorage\.|router\.(push|replace|navigate)$|Platform\.select$|Sentry\.|crashReporter\.|addBreadcrumb$|captureException$|throw|new Error$|Error$|\w+\.getItem$|\w+\.setItem$|\w+\.removeItem$|db\.|execAsync$|runAsync$|getAllAsync$|getFirstAsync$|.*\.execute$|.*Sql$|querySelector$)/;
const SKIPPROP=new Set(['testID','style','key','name','id','route','screen','href','icon','iconName','color','type','storageKey','nativeID','source','fontFamily','mode','variant']);
const UIPROP=/^(placeholder|title|label|subtitle|description|message|text|accessibilityLabel|accessibilityHint|header|headerTitle|tabBarLabel|buttonText|confirmText|cancelText|emptyText|hint|caption|body|content|desc|tooltip|cta|ctaLabel|badge|tag|unit)$/i;
const res=[];let plural=0,toFixed=0,hardLocale=0,unreadable=[];
function ctxOf(n){let p=n.parent,depth=0;
 while(p&&depth<6){
  if(ts.isCallExpression(p)){const c=p.expression.getText();if(SKIPCALL.test(c))return{skip:true};return{call:c}}
  if(ts.isJsxAttribute(p)){const nm=p.name.getText();if(SKIPPROP.has(nm))return{skip:true};return{prop:nm}}
  if(ts.isPropertyAssignment(p)){const nm=p.name.getText().replace(/['"]/g,'');if(SKIPPROP.has(nm))return{skip:true};return{prop:nm}}
  if(ts.isImportDeclaration(p)||ts.isExportDeclaration(p)||ts.isTypeNode(p)||ts.isLiteralTypeNode(p))return{skip:true};
  if(ts.isCaseClause(p)||(ts.isBinaryExpression(p)&&/^(===|!==|==|!=)$/.test(p.operatorToken.getText())))return{skip:true};
  if(ts.isElementAccessExpression(p))return{skip:true};
  if(ts.isThrowStatement(p)||ts.isNewExpression(p))return{skip:true};
  p=p.parent;depth++}
 return{}}
function cat(f){const r=path.relative(ROOT,f);
 if(/notif|reminder|Notification/i.test(r))return'notifications';
 if(/pdf|export|share|csv|report|social-cards|wrapped/i.test(r))return'exports_pdf_partage';
 if(/paywall|premium|Premium|Paywall/i.test(r))return'paywall_premium';
 if(r.startsWith('app/'))return'ecrans';
 if(r.startsWith('components/'))return'composants';
 if(/exercises|citations|badges|ranks|achievements|challenges|quests|sports|sportPacks|techniques|combat|competitions|programs|templates|healthRanges|infirmary|nutrition|fasting|gamification|teamYoroi|funComparisons|healthTips|Tips|demo|avatar|weightCategories|hrZones|records|ronin|fighter|partner|coach|dynamicTitle|insights|Insights|playbook/i.test(r))return'donnees';
 return'logique_lib'}
for(const f of files){let src;try{src=fs.readFileSync(f,'utf8')}catch(e){unreadable.push(path.relative(ROOT,f));continue}
 if(!/[A-Za-zÀ-ÿ]/.test(src))continue;
 const sf=ts.createSourceFile(f,src,ts.ScriptTarget.Latest,true,f.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 plural+=(src.match(/>\s*1\s*\?\s*['"`]s['"`]\s*:\s*['"`]['"`]/g)||[]).length+(src.match(/!==?\s*1\s*\?\s*['"`]s['"`]\s*:\s*['"`]['"`]/g)||[]).length;
 toFixed+=(src.match(/\.toFixed\(/g)||[]).length;
 hardLocale+=(src.match(/['"]fr-FR['"]|['"]fr['"]\s*\)|locale:\s*fr\b|date-fns\/locale/g)||[]).length;
 function add(n,text,kind){const s=frScore(text);if(!s)return;const c=kind==='jsx'?{}:ctxOf(n);if(c.skip)return;
  const line=sf.getLineAndCharacterOfPosition(n.getStart()).line+1;
  res.push({f:path.relative(ROOT,f),line,kind,ctx:c.prop||c.call||'',text:text.replace(/\s+/g,' ').trim().slice(0,160),cat:cat(f)})}
 function visit(n){
  if(ts.isJsxText(n)){const t=n.getText();if(t.trim())add(n,t,'jsx')}
  else if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))add(n,n.text,'str');
  else if(ts.isTemplateExpression(n)){const t=n.head.text+n.templateSpans.map(s=>'{x}'+s.literal.text).join('');add(n,t,'tpl')}
  ts.forEachChild(n,visit)}
 visit(sf)}
fs.writeFileSync(process.argv[3],JSON.stringify(res,null,1));
const byCat={},byFile={};for(const r of res){byCat[r.cat]=(byCat[r.cat]||0)+1;byFile[r.f]=(byFile[r.f]||0)+1}
console.log('fichiers',files.length,'illisibles',unreadable);
console.log('TEXTES FRANCAIS EN DUR',res.length,'dans',Object.keys(byFile).length,'fichiers');
console.log('par type',JSON.stringify(res.reduce((a,r)=>(a[r.kind]=(a[r.kind]||0)+1,a),{})));
console.log('par zone',JSON.stringify(byCat));
console.log('pluriels s/vide',plural,'toFixed',toFixed,'locale fr en dur',hardLocale);
console.log('TOP fichiers');Object.entries(byFile).sort((a,b)=>b[1]-a[1]).slice(0,40).forEach(([k,v])=>console.log(v,k));
