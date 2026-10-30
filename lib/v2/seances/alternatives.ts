/**
 * Remplacer un exercice pendant la seance (30 octobre 2026) : 3 a 5 alternatives qui travaillent le meme
 * muscle principal. D'abord les remplacants ecrits a la main pour les programmes (lib/v2/programmes/materiel.ts),
 * puis les exercices du meme muscle de la bibliotheque (constants/exerciseLibrary.ts).
 * En premier, ceux qui demandent un autre materiel (halteres, barre, poids du corps, poulie) : la machine
 * prevue est souvent justement celle qu'on ne peut pas prendre. Sans les exercices ecartes, sans ceux deja
 * dans la seance. Donnees pures.
 */
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { besoinDe, remplacantsDe } from '@/lib/v2/programmes/materiel';
import { sansPrise } from '@/lib/v2/seance/prise';

export const MAX_ALTERNATIVES = 5;

type Famille = 'halteres' | 'barre' | 'rien' | 'poulie' | 'machines' | 'autre';
const AUTRE_MATERIEL_EN_PREMIER: Famille[] = ['halteres', 'barre', 'rien', 'poulie'];

const sansAccent = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

/** Le materiel principal d'un exercice : sa fiche, sinon son nom ; null si on ne sait pas */
export function familleMateriel(nom: string): Famille | null {
  const b = besoinDe(nom);
  if (b && b[0]) {
    const c = b[0];
    if (c.length === 0) return 'rien';
    if (c.includes('machines')) return 'machines';
    if (c.includes('poulie')) return 'poulie';
    if (c.includes('barre') || c.includes('trap_bar')) return 'barre';
    if (c.includes('halteres') || c.includes('kettlebell')) return 'halteres';
    return 'autre';
  }
  if (/machine|presse|smith|pec deck|butterfly|hack squat|leg curl|leg extension/i.test(nom)) return 'machines';
  if (/poulie|cable|câble|pulldown/i.test(nom)) return 'poulie';
  if (/halt[eè]re|kettlebell/i.test(nom)) return 'halteres';
  if (/\bbarre\b|\(barre\)|ez\b/i.test(nom)) return 'barre';
  if (/poids du corps|pompes|tractions|dips|gainage/i.test(nom)) return 'rien';
  return null;
}

const muscleBiblio = (nom: string): string | undefined => EXERCISE_LIBRARY.find((e) => e.name === nom && e.category === 'musculation')?.muscle;

export function alternativesPour(
  nom: string,
  o: { muscle?: string; ecartes?: Iterable<string>; deja?: Iterable<string>; max?: number } = {},
): string[] {
  const base = sansPrise(nom ?? '').base;
  const muscle = sansAccent(muscleBiblio(base) ?? o.muscle ?? '');
  const exclus = new Set<string>([base, ...(o.ecartes ?? []), ...Array.from(o.deja ?? [], (n) => sansPrise(n).base)]);
  const vus = new Set<string>();
  const candidats: { nom: string; source: number }[] = [];
  const ajouter = (n: string, source: number) => {
    if (!n || vus.has(n) || exclus.has(n)) return;
    vus.add(n);
    candidats.push({ nom: n, source });
  };
  // les remplacants ecrits a la main (meme muscle, meme geste autant que possible)
  for (const n of remplacantsDe(base)) {
    const m = muscleBiblio(n);
    if (!muscle || !m || sansAccent(m) === muscle) ajouter(n, 0);
  }
  if (muscle) {
    for (const e of EXERCISE_LIBRARY) {
      if (e.category !== 'musculation' || (e.unit !== 'reps' && e.unit !== 'time')) continue;
      if (sansAccent(e.muscle ?? '') === muscle) ajouter(e.name, 1);
    }
  }
  const origine = familleMateriel(base);
  const rang = (n: string): number => {
    const f = familleMateriel(n);
    if (f === null) return 2;
    if (origine !== null && f === origine) return 3;
    return AUTRE_MATERIEL_EN_PREMIER.includes(f) ? 0 : 1;
  };
  return candidats
    .map((c, i) => ({ ...c, i, r: rang(c.nom) }))
    .sort((a, b) => a.r - b.r || a.source - b.source || a.i - b.i)
    .slice(0, Math.max(1, o.max ?? MAX_ALTERNATIVES))
    .map((c) => c.nom);
}
