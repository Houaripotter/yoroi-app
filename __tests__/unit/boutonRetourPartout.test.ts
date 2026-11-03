// @ts-nocheck : moteur de lecture des imports volontairement souple (scan de fichiers)
/* eslint-disable */
/**
 * Bouton retour partout (28 octobre 2026, demande de Houari « chaque page a un petit bouton retour »).
 * Pour chaque route de app/ ouverte par navigation, on suit ses composants jusqu'au retour rond commun
 * (RetourCompact, EnTete et les cadres qui l'utilisent). Les exceptions sont listees avec leur raison.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const cache: any = {};
function resolve(from,spec){
 let base;
 if(spec.startsWith('@/'))base=path.join(root,spec.slice(2));
 else if(spec.startsWith('.'))base=path.resolve(path.dirname(from),spec);
 else return null;
 for(const c of [base+'.tsx',base+'.ts',base+'/index.tsx',base+'/index.ts',base]){if(fs.existsSync(c)&&fs.statSync(c).isFile())return c}
 return null;
}
function parse(f){
 if(cache[f])return cache[f];
 const t=fs.readFileSync(f,'utf8');
 const imports={};// localName -> [file, importedName]
 const re=/import\s+(?:type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;let m;
 while((m=re.exec(t))){const file=resolve(f,m[2]);if(!file)continue;let cl=m[1];
  const def=cl.match(/^([A-Za-z_$][\w$]*)/);if(def&&!cl.startsWith('{'))imports[def[1]]=[file,'default'];
  const br=cl.match(/\{([\s\S]*)\}/);if(br)for(const p of br[1].split(',')){const s=p.trim().replace(/^type\s+/,'');if(!s)continue;const [a,b]=s.split(/\s+as\s+/);imports[(b||a).trim()]=[file,a.trim()]}
 }
 // re-exports
 const reexp={};const rr=/export\s+\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g;
 while((m=rr.exec(t))){const file=resolve(f,m[2]);if(!file)continue;for(const p of m[1].split(',')){const s=p.trim();if(!s)continue;const [a,b]=s.split(/\s+as\s+/);reexp[(b||a).trim()]=[file,a.trim()]}}
 // bodies of top-level declarations
 const lines=t.split('\n');const bodies={};let cur=null,buf=[];
 const flush=()=>{if(cur)bodies[cur]=(bodies[cur]||'')+buf.join('\n');};
 for(const l of lines){const d=l.match(/^(export\s+)?(default\s+)?(?:async\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/);
  if(d){flush();cur=d[3];buf=[];if(d[2])bodies.__defaultName=d[3];}
  else if(/^export default ([A-Za-z_$][\w$]*)/.test(l)){bodies.__defaultName=l.match(/^export default ([A-Za-z_$][\w$]*)/)[1]}
  buf.push(l);}
 flush();
 return cache[f]={t,imports,reexp,bodies};
}
const memo: any = {};
function has(f,name,depth=0){
 const k=f+'#'+name;if(k in memo)return memo[k];memo[k]=false;if(depth>12)return false;
 const p=parse(f);
 if(name==='default')name=p.bodies.__defaultName||'default';
 if(p.reexp[name]){return memo[k]=has(p.reexp[name][0],p.reexp[name][1],depth+1)}
 let body=p.bodies[name];if(body==null){if(name==='default'){const mm=p.t.match(/export\s+\{\s*default\s*\}\s+from\s+['"]([^'"]+)['"]/);if(mm){const r=resolve(f,mm[1]);if(r)return memo[k]=has(r,'default',depth+1)}}return false}
 if(/<(RetourCompact|EnTete)\b|icon="back"|accessibilityLabel=\{traduire\(["']Retour/.test(body))return memo[k]=true;
 // local components used
 const used=new Set([...body.matchAll(/<([A-Z][\w$]*)/g)].map(x=>x[1]));
 for(const u of used){if(u===name)continue;
  if(p.bodies[u]!=null&&has(f,u,depth+1))return memo[k]=true;
  if(p.imports[u]&&has(p.imports[u][0],p.imports[u][1],depth+1))return memo[k]=true;}
 return false;
}

function aUnRetour(f: string): boolean {
  const p = parse(f);
  // import X from '...' ; export default X
  const alias = p.t.match(/^export default ([A-Za-z_$][\w$]*);?\s*$/m);
  if (alias && p.imports[alias[1]]) return has(p.imports[alias[1]][0], p.imports[alias[1]][1]);
  return has(f, 'default');
}

/** Routes sans retour rond, et pourquoi */
const EXCEPTIONS: Record<string, string> = {
  '(tabs)/index.tsx': 'onglet principal',
  '(tabs)/progres.tsx': 'onglet principal',
  '(tabs)/dojo.tsx': 'onglet principal',
  '(tabs)/seances.tsx': 'onglet principal',
  'index.tsx': 'aiguillage au lancement',
  'onboarding.tsx': 'premier lancement, retour par etape',
  'onboarding-tour.tsx': 'lance la visite guidee',
  'nouveautes.tsx': 'presentation plein ecran, bouton Passer',
  'ajouter.tsx': 'feuille transparente du bouton +, se ferme en touchant le voile',
  'seance/cardio.tsx': 'seance en cours : bouton rond Reduire ou Fermer sans enregistrer',
  'seance/combat.tsx': 'seance en cours : bouton rond Reduire ou Fermer sans enregistrer',
  'frame-selection.tsx': 'redirection',
};

function routes(): string[] {
  const out: string[] = [];
  (function walk(d: string) {
    for (const x of fs.readdirSync(d)) {
      const q = path.join(d, x);
      if (fs.statSync(q).isDirectory()) walk(q);
      else if (/\.tsx$/.test(x) && !/^_layout|^\+/.test(x)) out.push(q);
    }
  })(path.join(root, 'app'));
  return out.sort();
}

describe('bouton retour sur chaque page ouverte par navigation', () => {
  const liste = routes();

  it('le scan trouve les routes', () => {
    expect(liste.length).toBeGreaterThan(150);
  });

  it('chaque route a le retour rond commun, sauf les exceptions listees', () => {
    const manquants: string[] = [];
    for (const f of liste) {
      const rel = path.relative(path.join(root, 'app'), f);
      if (EXCEPTIONS[rel]) continue;
      const t = fs.readFileSync(f, 'utf8');
      // Studio unique (2 novembre 2026) : les anciennes routes de partage rendent <RedirectionCarte />,
      // qui s'efface tout de suite par router.replace vers /carte. Pas d'ecran a quitter, donc pas de retour.
      const viaRedirectionCarte =
        /<RedirectionCarte\b/.test(t) &&
        /router\.replace\(/.test(fs.readFileSync(path.join(root, 'components/yoroi/v2/cartes/RedirectionCarte.tsx'), 'utf8'));
      const redirection = (/<Redirect\b|router\.replace\(/.test(t) || viaRedirectionCarte) && t.split('\n').length < 40;
      if (redirection) continue;
      if (!aUnRetour(f)) manquants.push(rel);
    }
    expect(manquants).toEqual([]);
  });

  it('le retour rond garde sa forme : cercle de 40, chevron, libelle Retour', () => {
    const t = fs.readFileSync(path.join(root, 'components/yoroi/v2/entete/EnTete.tsx'), 'utf8');
    expect(t).toMatch(/width: 40,\s*height: 40,\s*borderRadius: 20/);
    expect(t).toMatch(/M15 5l-7 7 7 7/);
    expect(t).toMatch(/label = traduire\('Retour'\)/);
  });

  it('le glissement retour reste actif par defaut sur toute la pile', () => {
    const t = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
    expect(t).toMatch(/screenOptions=\{\{[\s\S]{0,120}gestureEnabled: true,\s*fullScreenGestureEnabled: true/);
  });
});
