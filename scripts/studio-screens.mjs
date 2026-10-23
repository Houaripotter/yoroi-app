#!/usr/bin/env node
/**
 * Genere lib/v2/creator/screens.ts : la liste des ecrans de app/ pour la rubrique
 * « Aller a un ecran » du Studio. A relancer quand un ecran est ajoute :
 *   node scripts/studio-screens.mjs
 * Ignore les gabarits (_layout), +not-found, les routes a parametre ([id]) et les dossiers
 * components/ et utils/ (ce ne sont pas des ecrans).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'app');
const OUT = path.join(ROOT, 'lib', 'v2', 'creator', 'screens.ts');

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'components' || e.name === 'utils') continue;
      walk(p);
    } else if (/\.tsx$/.test(e.name) && !/\s\d+\.tsx$/.test(e.name)) files.push(p);
  }
})(APP);

const clean = (s) =>
  s
    .replace(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/g, '')
    .replace(/[\u2014\u2013]/g, ',')
    .replace(/\u00b7/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:])/g, '$1')
    .trim();

function describe(src) {
  const m = src.match(/\/\*\*([\s\S]*?)\*\//) || src.match(/^\s*\/\/\s*(.+)$/m);
  if (!m) return '';
  const line = m[1].split('\n').map((l) => l.replace(/^\s*\*\s?/, '').replace(/^=+$/, '').trim()).find((l) => l && !/^=+$/.test(l) && !/^@/.test(l)) ?? '';
  const s = clean(line.replace(/\s*\(.*?\)\s*/g, ' '));
  return s.length > 80 ? `${s.slice(0, 77).trim()}...` : s;
}

const rows = [];
for (const f of files) {
  const rel = path.relative(APP, f).split(path.sep).join('/');
  const base = path.basename(rel);
  if (base.startsWith('_') || base.startsWith('+') || /\[.+\]/.test(rel)) continue;
  let route = '/' + rel.replace(/\.tsx$/, '');
  route = route.replace(/\/index$/, '') || '/';
  if (route === '/') continue; // aiguillage de demarrage, pas un ecran
  if (route === '/(tabs)') route = '/(tabs)';
  const src = fs.readFileSync(f, 'utf8');
  rows.push({ route, sub: describe(src) });
}
rows.sort((a, b) => a.route.localeCompare(b.route));

const body = rows.map((r) => `  { route: ${JSON.stringify(r.route)}, sub: ${JSON.stringify(r.sub)} },`).join('\n');
const out = `/**
 * Ecrans de app/, pour « Aller a un ecran » du Studio.
 * Fichier genere par scripts/studio-screens.mjs : ne pas modifier a la main.
 */
export type StudioScreen = { route: string; sub: string };

export const STUDIO_SCREENS: StudioScreen[] = [
${body}
];
`;
fs.writeFileSync(OUT, out);
console.log(`${rows.length} ecrans ecrits dans ${path.relative(ROOT, OUT)}`);
