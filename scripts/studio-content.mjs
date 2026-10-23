#!/usr/bin/env node
/**
 * Genere lib/v2/creator/contentReport.generated.ts : les compteurs du contenu de YOROI et des
 * controles de coherence, pour la rubrique Contenu du Studio. A relancer apres un ajout :
 *   node scripts/studio-content.mjs
 * Lit seulement les fichiers du projet (sources et assets), n'execute rien, n'envoie rien.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'lib', 'v2', 'creator', 'contentReport.generated.ts');
const read = (rel) => {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch {
    return '';
  }
};
const ls = (rel, filter = () => true) => {
  try {
    return fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }).filter(filter);
  } catch {
    return [];
  }
};
const isImg = (e) => e.isFile() && /\.(webp|png|jpe?g)$/i.test(e.name);

/** Le bloc d'un tableau exporte : de « export const NOM » au premier « ]; » en debut de ligne */
function block(src, name) {
  const i = src.search(new RegExp(`(export\\s+)?const\\s+${name}\\b[^=]*=\\s*\\[`));
  if (i < 0) return '';
  const end = src.indexOf('\n];', i);
  return src.slice(i, end < 0 ? undefined : end);
}
const all = (txt, re) => [...txt.matchAll(re)].map((m) => m[1]);

const checks = [];
const check = (id, label, problems, okText) => checks.push({ id, label, ok: problems.length === 0, detail: problems.length ? problems.slice(0, 12).join(', ') + (problems.length > 12 ? `, et ${problems.length - 12} de plus` : '') : okText, count: problems.length });

// ===== Sports =====
const sportsSrc = block(read('lib/sports.ts'), 'SPORTS');
const sportIds = all(sportsSrc, /^\s{4}id:\s*'([^']+)'/gm);
const dupSports = sportIds.filter((id, i) => sportIds.indexOf(id) !== i);
check('sports_doublons', 'Sports en double dans la liste', [...new Set(dupSports)], `${sportIds.length} sports, aucun en double`);

// ===== Sports illustres (6 images : homme et femme, 3 niveaux) =====
const sportDirs = ls('assets/avatars/app/sports', (e) => e.isDirectory() && !e.name.startsWith('_')).map((e) => e.name);
const incomplets = [];
let illustres = 0;
for (const d of sportDirs) {
  const files = new Set(ls(`assets/avatars/app/sports/${d}`, isImg).map((e) => e.name));
  const manque = [];
  for (const g of ['h', 'f']) for (const n of [1, 2, 3]) if (!files.has(`${d}_${g}_${n}.webp`)) manque.push(`${g}${n}`);
  if (manque.length) incomplets.push(`${d} (${manque.join(' ')})`);
  else illustres += 1;
}
check('sports_images', 'Sports illustrés complets (homme et femme, 3 niveaux)', incomplets, `${illustres} sports, 6 images chacun`);
// Un dossier est rattache s'il porte l'id d'un sport, ou si la table lib/v2/seance/sportArtMap.ts
// le donne a un sport de la liste (course pour running, crosstraining pour crossfit...)
const artMapSrc = read('lib/v2/seance/sportArtMap.ts');
const mapped = new Set();
for (const m of artMapSrc.matchAll(/^\s*([a-z0-9_]+):\s*\[([^\]]*)\]/gm)) {
  if (!sportIds.includes(m[1])) continue;
  for (const f of all(m[2], /'([^'@][^']*)'/g)) mapped.add(f);
}
const orphelins = sportDirs.filter((d) => !sportIds.includes(d) && !mapped.has(d));
check('sports_orphelins', 'Dossiers d’illustration sans sport dans la liste', orphelins, 'Chaque dossier correspond à un sport');

// ===== Exercices =====
const lib = block(read('constants/exerciseLibrary.ts'), 'EXERCISE_LIBRARY');
const libNames = all(lib, /name:\s*'((?:[^'\\]|\\.)+)'/g);
const tpl = block(read('lib/exercises.ts'), 'EXERCISES');
const tplIds = all(tpl, /id:\s*'([^']+)'/g);
const normEx = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const libKeys = libNames.map(normEx);
const dupEx = libNames.filter((n, i) => libKeys.indexOf(libKeys[i]) !== i);
check('exercices_doublons', 'Exercices en double dans la bibliothèque', [...new Set(dupEx)], `${libNames.length} exercices, aucun en double`);
const dupTpl = tplIds.filter((n, i) => tplIds.indexOf(n) !== i);
check('modeles_doublons', 'Identifiants d’exercice en double (saisie rapide)', [...new Set(dupTpl)], `${tplIds.length} exercices de saisie, identifiants uniques`);

// ===== Techniques du carnet =====
const carnet = read('lib/carnetService.ts');
const skillBlocks = ['JJB_GARDE_SKILLS', 'JJB_PASSAGE_SKILLS', 'JJB_SOUMISSION_SKILLS', 'JJB_NOGI_SKILLS', 'LUTTE_SKILLS', 'STRIKING_SKILLS'].map((n) => block(carnet, n)).join('\n');
const techniques = all(skillBlocks, /name:\s*'((?:[^'\\]|\\.)+)'/g);
const dupTech = techniques.filter((n, i) => techniques.indexOf(n) !== i);
check('techniques_doublons', 'Techniques en double', [...new Set(dupTech)], `${techniques.length} techniques, aucune en double`);

// ===== Citations =====
const cit = read('lib/citations.ts');
const citations = all(cit, /text:\s*(?:'((?:[^'\\]|\\.)+)'|"([^"]+)")/g).filter(Boolean);
const citTexts = [...cit.matchAll(/text:\s*(?:'((?:[^'\\]|\\.)+)'|"([^"]+)")/g)].map((m) => m[1] ?? m[2]);
const dupCit = citTexts.filter((n, i) => citTexts.indexOf(n) !== i);
check('citations_doublons', 'Citations en double', [...new Set(dupCit)].map((t) => `« ${t.slice(0, 30)} »`), `${citTexts.length} citations, aucune en double`);
void citations;

// ===== Personnages, scenes, ornements, carnet, sons =====
const guerrier = ls('assets/avatars/app/guerrier', isImg).length;
const monde = ls('assets/avatars/app/monde/personnages', isImg).length;
const packs = ls('assets/avatars/app/packs', (e) => e.isDirectory()).map((e) => e.name);
const packImages = packs.reduce((n, p) => n + ls(`assets/avatars/app/packs/${p}`, isImg).length, 0);
const scenes = ls('assets/avatars/app/monde/scenes', isImg).length;
const themes = ls('assets/avatars/app/themes', isImg).length;
const fonds = ls('assets/avatars/app/monde/fonds', isImg).length;
const ornements = ls('assets/avatars/app/ornements', isImg).length;
const carnetImgs = ls('assets/avatars/app/carnet', isImg).length;
const sons = ls('assets/sounds', (e) => e.isFile() && /\.(mp3|wav|m4a|caf|aac)$/i.test(e.name)).map((e) => e.name);

// guerrier : 5 rangs, homme et femme
const RANGS = ['1_ashigaru', '2_bushi', '3_samourai', '4_ronin', '5_shogun'];
const gFiles = new Set(ls('assets/avatars/app/guerrier', isImg).map((e) => e.name));
const gManque = [];
for (const g of ['h', 'f']) for (const r of RANGS) if (!gFiles.has(`guerrier_${g}_${r}.webp`)) gManque.push(`guerrier_${g}_${r}`);
check('guerrier', 'Guerrier et guerrière, un par rang', gManque, '10 illustrations, les 5 rangs en homme et en femme');

// personnages du monde : chacun en homme et en femme
const mFiles = ls('assets/avatars/app/monde/personnages', isImg).map((e) => e.name.replace(/\.(webp|png)$/, ''));
const mBases = [...new Set(mFiles.map((n) => n.replace(/_(h|f)$/, '')))];
const mManque = mBases.flatMap((b) => ['h', 'f'].filter((g) => !mFiles.includes(`${b}_${g}`)).map((g) => `${b}_${g}`));
check('monde', 'Personnages du monde en homme et en femme', mManque, `${mBases.length} personnages, les deux genres`);

// ===== require() vers un fichier absent (app, components, lib) =====
const absents = [];
let requires = 0;
const RX = /require\(\s*['"]([^'"]+\.(?:png|webp|jpe?g|mp3|wav|m4a|json|gif))['"]\s*\)/g;
(function walk(dir) {
  for (const e of ls(dir)) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/node_modules|_archive|^\.|\/\./.test(rel)) continue;
      walk(rel);
    } else if (/\.(ts|tsx|js)$/.test(e.name)) {
      const src = read(rel);
      for (const m of src.matchAll(RX)) {
        requires += 1;
        const raw = m[1];
        const target = raw.startsWith('@/') ? raw.slice(2) : raw.startsWith('.') ? path.normalize(path.join(path.dirname(rel), raw)) : null;
        if (target && !fs.existsSync(path.join(ROOT, target))) absents.push(`${target} (dans ${rel})`);
      }
    }
  }
})('app');
for (const d of ['components', 'lib']) {
  (function walk(dir) {
    for (const e of ls(dir)) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (/node_modules|_archive/.test(rel)) continue;
        walk(rel);
      } else if (/\.(ts|tsx|js)$/.test(e.name)) {
        const src = read(rel);
        for (const m of src.matchAll(RX)) {
          requires += 1;
          const raw = m[1];
          const target = raw.startsWith('@/') ? raw.slice(2) : raw.startsWith('.') ? path.normalize(path.join(path.dirname(rel), raw)) : null;
          if (target && !fs.existsSync(path.join(ROOT, target))) absents.push(`${target} (dans ${rel})`);
        }
      }
    }
  })(d);
}
check('requires', 'Fichiers appelés par le code et absents du projet', absents, `${requires} appels, tous les fichiers existent`);

// ===== Sons attendus par le chrono =====
const attendus = ['bell_end.mp3', 'clap10.mp3', 'gong.mp3', 'beep.mp3'];
check('sons', 'Sons du chrono présents', attendus.filter((s) => !sons.includes(s)), 'Cloche, claquettes, gong et bip présents');

const counts = [
  { id: 'sports', label: 'Sports', value: sportIds.length },
  { id: 'sports_illustres', label: 'Sports illustrés', value: illustres },
  { id: 'exercices', label: 'Exercices de la bibliothèque', value: libNames.length },
  { id: 'exercices_saisie', label: 'Exercices de saisie rapide', value: tplIds.length },
  { id: 'techniques', label: 'Techniques du carnet', value: techniques.length },
  { id: 'citations', label: 'Citations', value: citTexts.length },
  { id: 'personnages', label: 'Personnages (images)', value: guerrier + monde + packImages },
  { id: 'packs', label: 'Packs de personnages', value: packs.length },
  { id: 'scenes', label: 'Scènes', value: scenes + themes },
  { id: 'fonds', label: 'Fonds verticaux', value: fonds },
  { id: 'ornements', label: 'Ornements', value: ornements },
  { id: 'carnet', label: 'Illustrations du carnet', value: carnetImgs },
  { id: 'sons', label: 'Sons', value: sons.length },
];

const now = new Date();
const p = (n) => String(n).padStart(2, '0');
const at = `${p(now.getDate())}/${p(now.getMonth() + 1)}/${now.getFullYear()} à ${now.getHours()} h ${p(now.getMinutes())}`;

const out = `/**
 * Fichier ecrit par scripts/studio-content.mjs, ne pas modifier a la main.
 * Compteurs du contenu et controles de coherence, pour la rubrique Contenu du Studio.
 */
export type ContentCount = { id: string; label: string; value: number };
export type ContentCheck = { id: string; label: string; ok: boolean; detail: string; count: number };

export const CONTENT_REPORT_AT = ${JSON.stringify(at)};

export const CONTENT_COUNTS: ContentCount[] = ${JSON.stringify(counts, null, 2)};

export const CONTENT_CHECKS: ContentCheck[] = ${JSON.stringify(checks, null, 2)};

export const CONTENT_SOUNDS: string[] = ${JSON.stringify(sons)};
`;
fs.writeFileSync(OUT, out.replace(/\u2014/g, ',').replace(/\u00b7/g, ','));
console.log(`contentReport.generated.ts : ${counts.length} compteurs, ${checks.length} contrôles, ${checks.filter((c) => !c.ok).length} à revoir`);
