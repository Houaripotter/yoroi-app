/**
 * Dictée dans les autres langues (23 octobre 2026). Le lecteur de dictee.ts comprend le français.
 * Pour l'anglais, l'allemand, le néerlandais, l'espagnol, le portugais et l'italien, chaque suite de mots
 * de la langue trouvée dans son lexique (dicteeLexiques/<langue>.json) est remplacée par les mots français
 * que le lecteur attend, juste après le découpage de la phrase. Les positions dans le texte tapé sont
 * gardées, pour que le surlignage de ce qui a été compris reste juste. En français, rien ne change.
 */
import type { Lang } from '@/lib/i18n/tr';

type Paire = [string, string];
type Entree = { mots: string[]; fr: string[] };

function charger(lang: Lang): Paire[] {
  try {
    switch (lang) {
      case 'en': return require('./dicteeLexiques/en.json');
      case 'de': return require('./dicteeLexiques/de.json');
      case 'nl': return require('./dicteeLexiques/nl.json');
      case 'es': return require('./dicteeLexiques/es.json');
      case 'pt': return require('./dicteeLexiques/pt.json');
      case 'it': return require('./dicteeLexiques/it.json');
      default: return [];
    }
  } catch {
    return [];
  }
}

const index = new Map<Lang, Map<string, Entree[]>>();

function indexDe(lang: Lang): Map<string, Entree[]> {
  const hit = index.get(lang);
  if (hit) return hit;
  const m = new Map<string, Entree[]>();
  for (const [src, fr] of charger(lang)) {
    const mots = String(src).trim().split(/\s+/).filter(Boolean);
    if (!mots.length) continue;
    const e = { mots, fr: String(fr).trim().split(/\s+/).filter(Boolean) };
    const l = m.get(mots[0]) ?? [];
    l.push(e);
    m.set(mots[0], l);
  }
  for (const l of m.values()) l.sort((a, b) => b.mots.length - a.mots.length);
  index.set(lang, m);
  return m;
}

/** Remplace les suites de mots de la langue par les mots français du lexique (positions gardées). */
export function traduireJetons<T extends { t: string; s: number; e: number; cap: boolean }>(toks: T[], lang: Lang): T[] {
  if (lang === 'fr') return toks;
  const m = indexDe(lang);
  if (!m.size) return toks;
  const out: T[] = [];
  for (let i = 0; i < toks.length; i += 1) {
    const cands = m.get(toks[i].t);
    const e = cands?.find((c) => c.mots.every((w, j) => toks[i + j]?.t === w));
    if (!e) {
      out.push(toks[i]);
      continue;
    }
    const a = toks[i];
    const b = toks[i + e.mots.length - 1];
    for (const w of e.fr) out.push({ ...a, t: w, s: a.s, e: b.e, cap: false });
    i += e.mots.length - 1;
  }
  return out;
}
