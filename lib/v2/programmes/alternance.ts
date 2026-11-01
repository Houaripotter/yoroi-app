/**
 * A et B au choix (1er novembre 2026). Houari : « L'objectif est de travailler chaque muscle 2 fois par semaine.
 * J'aimerais alterner entre A et B, mais c'est l'utilisateur qui choisit : alterner A et B, ou refaire la même séance. »
 *
 * Le réglage « Tes séances » (ProgrammePerso.alternance, champ facultatif : absent, rien ne change) :
 *  - « Alterner A et B » ('ab') : chaque séance alterne à chaque fois que tu la refais, A, puis B, puis A.
 *    C'est la logique la plus naturelle pour tous les programmes : une séance posée 2 fois dans la semaine (Upper
 *    Lower 4 jours : Haut lundi et jeudi) fait A le lundi et B le jeudi, chaque semaine ; une séance posée 1 fois
 *    (PPL 3 jours) fait A une semaine, B la suivante. Les séances dont le titre dit déjà A et B (« Upper A »,
 *    « Upper B » du catalogue) alternent déjà ainsi, on n'y touche pas. Les autres prennent leur version B
 *    (ProgrammePerso.variantesB, préparée par varianteB.ts avec de vrais exercices de la base).
 *  - « Toujours la même » ('meme') : une séance B qui a sa séance A dans la semaine devient la séance A (« Upper B »
 *    devient « Upper A »). Les versions B préparées restent gardées, elles ne servent plus.
 *  - Ta semaine B à toi (« Semaines A et B », ProgrammePerso.ab) garde la main : ta semaine A, puis ta semaine B.
 *
 * Tout se calcule à la lecture (monProgramme.ts, versProgramme) en une semaine A et une semaine B (semaineLibre.ts) :
 * la séance du jour, la suite, les rappels et la séance en direct suivent sans rien de plus. Données pures, testées
 * dans __tests__/unit/alternance.test.ts.
 */
import type { ProgrammePerso, SeancePerso } from './monProgramme';

export type Alternance = 'ab' | 'meme';

export function lireAlternance(v: unknown): Alternance | undefined {
  return v === 'ab' || v === 'meme' ? v : undefined;
}

/** La phrase de l'écran, une par choix (texte français, traduit à l'affichage) */
export const PHRASE_ALTERNANCE: Record<Alternance, string> = {
  ab: 'Chaque séance alterne à chaque fois que tu la refais : A, puis B, puis A.',
  meme: 'Tu refais toujours la même version de chaque séance : A à chaque fois.',
};
/** Ta semaine B à toi, quand « Semaines A et B » est allumé dans Ta semaine */
export const PHRASE_SEMAINES_AB = 'Ta semaine A, puis ta semaine B, une semaine sur deux.';

/* ---------------------------------- les lettres des titres ---------------------------------- */

const LETTRE = /^(.*?\S)\s+([AB])(?=$|\s*[:,])/;

/**
 * La lettre d'un titre de séance : « Upper A : haut du corps », « Push B, hypertrophie », « Haut du corps A »,
 * « Séance B ». base : ce qui précède la lettre, en minuscules, pour trouver sa jumelle.
 */
export function lettreDe(titre: string | null | undefined): { base: string; lettre: 'A' | 'B' } | null {
  const m = typeof titre === 'string' ? LETTRE.exec(titre.trim()) : null;
  return m ? { base: m[1].trim().toLowerCase(), lettre: m[2] as 'A' | 'B' } : null;
}

const titreDe = (s: SeancePerso): string => (s.titre ?? '').trim();
/** La clé d'une séance de ta semaine : sa brique (toujours là après lecture, monProgramme.ts), sinon son titre */
export const cleSeance = (s: SeancePerso): string => s.brique ?? `t:${titreDe(s)}`;
const pleine = (s: SeancePerso | null | undefined): s is SeancePerso => !!s && s.exos.length > 0;

/** Les séances B de la semaine qui ont leur jumelle A (même nom avant la lettre) : clé B vers clé A */
export function pairesNaturelles(semaine: readonly (SeancePerso | null)[]): Map<string, string> {
  const a = new Map<string, string>();
  const b: { base: string; cle: string }[] = [];
  for (const s of semaine) {
    if (!pleine(s)) continue;
    const l = lettreDe(titreDe(s));
    if (!l) continue;
    if (l.lettre === 'A' && !a.has(l.base)) a.set(l.base, cleSeance(s));
    if (l.lettre === 'B') b.push({ base: l.base, cle: cleSeance(s) });
  }
  const out = new Map<string, string>();
  for (const x of b) {
    const twin = a.get(x.base);
    if (twin && twin !== x.cle) out.set(x.cle, twin);
  }
  return out;
}

/** Le programme a déjà ses versions A et B écrites dans les titres */
export const aDesPaires = (semaine: readonly (SeancePerso | null)[]): boolean => pairesNaturelles(semaine).size > 0;

/* ---------------------------------- de ta semaine aux deux lignes ---------------------------------- */

/** Ce que fait un jour : la séance posée ce jour-là dans ta semaine (A), ou la version B d'une séance */
export type SourceJour = { jour: number } | { variante: string };

export type PlanAlternance = {
  /** semaine A (paire depuis `depuis`) et semaine B, sept cases, null = repos */
  a: (SourceJour | null)[];
  b: (SourceJour | null)[];
  /** les séances qui ont pris leur version B, dans l'ordre de la semaine */
  variantes: string[];
};

/**
 * Le jour de chaque version, pour une séance posée `n` fois dans la semaine : la i-ième fois (0 = la première) est
 * une B une fois sur deux en comptant d'une semaine à l'autre. Semaine paire : i impair ; semaine impaire : n + i impair.
 */
export function estVersionB(i: number, n: number, semaineImpaire: boolean): boolean {
  return ((semaineImpaire ? n + i : i) % 2) === 1;
}

/**
 * Les deux semaines de ton réglage. null : rien ne change (pas de réglage, ta semaine B à toi, rien à alterner).
 */
export function planAlternance(pp: Pick<ProgrammePerso, 'semaine' | 'semaineB' | 'ab' | 'alternance' | 'variantesB'>): PlanAlternance | null {
  if (!pp.alternance || (pp.ab && pp.semaineB)) return null;
  const s = pp.semaine;
  const base: (SourceJour | null)[] = s.map((x, d) => (pleine(x) ? { jour: d } : null));
  const naturelles = pairesNaturelles(s);
  if (pp.alternance === 'meme') {
    if (!naturelles.size) return null;
    const premier = new Map<string, number>();
    s.forEach((x, d) => { if (pleine(x) && !premier.has(cleSeance(x))) premier.set(cleSeance(x), d); });
    const ligne = s.map((x, d): SourceJour | null => {
      if (!pleine(x)) return null;
      const twin = naturelles.get(cleSeance(x));
      const dA = twin !== undefined ? premier.get(twin) : undefined;
      return { jour: dA ?? d };
    });
    return { a: ligne, b: ligne.slice(), variantes: [] };
  }
  const variantes = new Set((pp.variantesB ?? []).filter((v) => pleine(v) && !!v.brique).map((v) => v.brique!));
  const dansPaire = new Set([...naturelles.keys(), ...naturelles.values()]);
  const jours = new Map<string, number[]>();
  s.forEach((x, d) => {
    if (!pleine(x)) return;
    const k = cleSeance(x);
    if (dansPaire.has(k) || !variantes.has(k)) return;
    jours.set(k, [...(jours.get(k) ?? []), d]);
  });
  if (!jours.size) return null;
  const a = base.slice();
  const b = base.slice();
  for (const [k, ds] of jours) {
    ds.forEach((d, i) => {
      if (estVersionB(i, ds.length, false)) a[d] = { variante: k };
      if (estVersionB(i, ds.length, true)) b[d] = { variante: k };
    });
  }
  return { a, b, variantes: Array.from(jours.keys()) };
}

/** Les séances de ta semaine qui n'ont ni jumelle écrite ni version B : celles que YOROI doit préparer */
export function seancesSansVersionB(pp: Pick<ProgrammePerso, 'semaine' | 'variantesB'>): SeancePerso[] {
  const naturelles = pairesNaturelles(pp.semaine);
  const dansPaire = new Set([...naturelles.keys(), ...naturelles.values()]);
  const ont = new Set((pp.variantesB ?? []).map((v) => v.brique).filter((x): x is string => !!x));
  const vues = new Set<string>();
  const out: SeancePerso[] = [];
  for (const s of pp.semaine) {
    if (!pleine(s)) continue;
    const k = cleSeance(s);
    if (vues.has(k) || dansPaire.has(k) || ont.has(k)) continue;
    vues.add(k);
    out.push(s);
  }
  return out;
}

/** Le choix montré : le tien, sinon « alterner » quand ta semaine a déjà A et B (titres ou semaines), sinon « la même » */
export function alternanceAffichee(pp: Pick<ProgrammePerso, 'semaine' | 'semaineB' | 'ab' | 'alternance'>): Alternance {
  if (pp.ab && pp.semaineB) return 'ab';
  return pp.alternance ?? (aDesPaires(pp.semaine) ? 'ab' : 'meme');
}
