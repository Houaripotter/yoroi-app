// Langues de YOROI : ce test devient rouge dès qu'il manque quelque chose dans une langue.
// Il lit le registre de lib/i18n/tr.ts, donc une langue ajoutée au registre est contrôlée tout de suite.
// Pour réparer : python3 scripts/i18n/langues.py etat (liste), puis extraire et integrer.
import fs from 'fs';
import path from 'path';
import { LANGUES_ACTIVES, LANGUES_INFO } from '@/lib/i18n/tr';

const RACINE = path.resolve(__dirname, '..', '..');
const lire = (p: string) => fs.readFileSync(path.join(RACINE, p), 'utf8');
const existe = (p: string) => fs.existsSync(path.join(RACINE, p));
const AUTRES = LANGUES_ACTIVES.filter((l) => l !== 'fr');
const dict = (l: string): Record<string, string> => (existe(`lib/i18n/dict/${l}.json`) ? JSON.parse(lire(`lib/i18n/dict/${l}.json`)) : {});
const DICTS = Object.fromEntries(AUTRES.map((l) => [l, dict(l)])) as Record<string, Record<string, string>>;

// Phrases écrites en dur dans traduire(), traduireSens(), traduirePluriel() (même lecture que scripts/i18n/langues.py)
const LIT = String.raw`('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\`(?:[^\`\\$]|\\.)*\`)`;
const PATS = [
  new RegExp(String.raw`\btraduire\(\s*` + LIT, 'g'),
  new RegExp(String.raw`\btraduireSens\(\s*` + LIT + String.raw`\s*,\s*` + LIT, 'g'),
  new RegExp(String.raw`\btraduirePluriel\(\s*[^,]+,\s*[^,]+,\s*` + LIT + String.raw`\s*,\s*` + LIT, 'g'),
];
const STUDIO = ['app/creator-mode', 'app/studio/', 'components/yoroi/v2/studio/', 'app/marketing-kit'];
function lit(s: string): string {
  return s
    .slice(1, -1)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\(.)/g, (_, c) => ({ n: '\n', t: '\t' } as Record<string, string>)[c] ?? c)
    .replace(/\s+/g, ' ')
    .trim();
}
function fichiers(d: string, out: string[] = []): string[] {
  if (!existe(d)) return out;
  for (const e of fs.readdirSync(path.join(RACINE, d), { withFileTypes: true })) {
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '__tests__') fichiers(p, out);
    } else if (/\.tsx?$/.test(e.name) && !STUDIO.some((s) => p.startsWith(s))) out.push(p);
  }
  return out;
}
function phrasesDuCode(): Map<string, string> {
  const ref = DICTS.en ?? {};
  const out = new Map<string, string>();
  for (const d of ['app', 'components', 'lib', 'hooks', 'context', 'constants', 'data', 'utils']) {
    for (const p of fichiers(d)) {
      const src = lire(p);
      PATS.forEach((re, i) => {
        re.lastIndex = 0;
        for (let m = re.exec(src); m; m = re.exec(src)) {
          let cles: string[];
          if (i === 1) {
            const k = `${lit(m[2])}§${lit(m[1])}`;
            cles = [k in ref ? k : lit(m[2])];
          } else if (i === 2) cles = [lit(m[1]), lit(m[2])];
          else cles = [lit(m[1])];
          for (const k of cles) if (k && !out.has(k)) out.set(k, `${p}:${src.slice(0, m.index).split('\n').length}`);
        }
      });
    }
  }
  return out;
}

describe('Langues complètes', () => {
  test('chaque langue du registre a son dictionnaire, avec les mêmes phrases que l’anglais', () => {
    const ref = Object.keys(DICTS.en ?? {}).sort();
    const fautes: string[] = [];
    for (const l of AUTRES) {
      if (!existe(`lib/i18n/dict/${l}.json`)) fautes.push(`${l} : pas de dictionnaire`);
      const k = new Set(Object.keys(DICTS[l]));
      const manque = ref.filter((x) => !k.has(x));
      if (manque.length) fautes.push(`${l} : ${manque.length} phrases manquantes, ex. « ${manque[0]} »`);
    }
    expect(fautes).toEqual([]);
  });

  test('chaque phrase du code a sa traduction dans toutes les langues', () => {
    const fautes: string[] = [];
    for (const [k, ou] of phrasesDuCode()) {
      const absent = AUTRES.filter((l) => !(k in DICTS[l]));
      if (absent.length) fautes.push(`${ou} « ${k} » absent en ${absent.join(', ')}`);
    }
    expect(fautes).toEqual([]);
  });

  test('chaque langue est inscrite dans iOS, Android, Expo et la politique de confidentialité', () => {
    const app = JSON.parse(lire('app.json')).expo;
    const plug = app.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-localization')[1].supportedLocales;
    const info = lire('ios/Yoroi/Info.plist');
    const andro = lire('android/app/src/main/res/xml/locales_config.xml');
    const pbx = lire('ios/Yoroi.xcodeproj/project.pbxproj');
    const regions = /knownRegions = \(([\s\S]*?)\);/.exec(pbx)?.[1] ?? '';
    const politique = JSON.parse(lire('data/politiqueConfidentialite.json'));
    const fautes: string[] = [];
    for (const l of LANGUES_ACTIVES) {
      const s = LANGUES_INFO[l].systeme;
      if (!app.ios.infoPlist.CFBundleLocalizations.includes(s)) fautes.push(`${l} : app.json CFBundleLocalizations`);
      if (!plug.ios.includes(s) || !plug.android.includes(s)) fautes.push(`${l} : app.json expo-localization`);
      if (!info.includes(`<string>${s}</string>`)) fautes.push(`${l} : Info.plist`);
      if (!andro.includes(`android:name="${s}"`)) fautes.push(`${l} : locales_config.xml`);
      if (!new RegExp(`(^|\\s|")${s}("|,)`).test(regions)) fautes.push(`${l} : Xcode knownRegions`);
      if (!politique[l] || !politique.miseAJour[l]) fautes.push(`${l} : politique de confidentialité`);
      if (l === 'fr') continue;
      for (const c of ['ios/Yoroi', 'ios/YoroiWatch', 'ios/YoroiWatchWidgets', 'ios/YoroiWidgets']) {
        for (const f of fs.readdirSync(path.join(RACINE, c, 'fr.lproj')).filter((x) => x.endsWith('.strings'))) {
          if (!existe(`${c}/${s}.lproj/${f}`)) fautes.push(`${l} : ${c}/${s}.lproj/${f}`);
          if (!new RegExp(`path = "?(Yoroi/)?${s}\\.lproj/${f.replace('.', '\\.')}"?;`).test(pbx)) fautes.push(`${l} : Xcode ${c}/${s}.lproj/${f}`);
        }
      }
      if (l !== 'en' && !existe(`android/app/src/main/res/values-${s.split('-')[0]}/strings.xml`)) fautes.push(`${l} : Android strings.xml`);
    }
    expect(fautes).toEqual([]);
  });

  test('les textes de la montre, des widgets et de Siri ont les mêmes clés que le français', () => {
    const cles = (p: string) => (existe(p) ? lire(p).split('\n').map((x) => /^"((?:[^"\\]|\\.)*)"\s*=/.exec(x.trim())?.[1]).filter(Boolean) : []);
    const fautes: string[] = [];
    for (const c of ['ios/Yoroi', 'ios/YoroiWatch', 'ios/YoroiWatchWidgets', 'ios/YoroiWidgets']) {
      for (const f of fs.readdirSync(path.join(RACINE, c, 'fr.lproj')).filter((x) => x.endsWith('.strings'))) {
        const fr = cles(`${c}/fr.lproj/${f}`);
        for (const l of AUTRES) {
          const k = new Set(cles(`${c}/${LANGUES_INFO[l].systeme}.lproj/${f}`));
          const manque = fr.filter((x) => !k.has(x));
          if (manque.length) fautes.push(`${l} : ${c}/${f}, ${manque.length} manquantes`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });
});
