/**
 * Le poids du jour quand il y a plusieurs pesees le meme jour (28 octobre 2026).
 * Houari : « fais ce qui est le mieux pour les utilisateurs ». Une pesee saisie a la main n'est plus jamais
 * remplacee en silence par une deuxieme du meme jour : chacune reste, avec son heure (created_at).
 *
 * LA REGLE, une seule pour toute l'app (courbe, tendance, projection, estimation, accueil, widgets, montre,
 * serie, IMC) :
 *  - la PREMIERE pesee du jour si elle a ete faite avant midi (le conseil classique : se peser le matin,
 *    a jeun, c'est la reference la plus stable) ;
 *  - sinon la DERNIERE pesee du jour.
 * « Premiere » et « derniere » suivent l'ordre d'enregistrement (id). L'heure vient de created_at (UTC en base,
 * lu en heure locale) ; elle ne compte que si elle tombe le jour de la pesee (une pesee saisie pour un autre jour
 * n'a pas d'heure connue). Sans heure connue : la derniere pesee, comme avant.
 * Les pesees restent toutes dans l'historique et dans l'export.
 */
import type { Weight } from '@/lib/database';

export const MIDI = 12;

const jourDe = (d: unknown) => String(d ?? '').slice(0, 10);
const p2 = (n: number) => String(n).padStart(2, '0');

/** created_at en Date : « 2026-10-28 07:12:00 » (SQLite, UTC) ou ISO ; null si illisible */
export function instantPesee(w: Pick<Weight, 'created_at'>): Date | null {
  const s = String(w?.created_at ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (!m) return null;
  const zone = /(Z|[+-]\d{2}:?\d{2})$/.test(s);
  const d = zone ? new Date(s.replace(' ', 'T')) : new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0)));
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * L'heure locale de la pesee (« 07:12 ») : celle portee par la date (AAAA-MM-JJTHH:MM, heure locale) si elle
 * en a une, sinon created_at, seulement s'il tombe le jour de la pesee ; null sinon
 */
export function heurePesee(w: Pick<Weight, 'created_at' | 'date'>): { h: number; m: number; texte: string } | null {
  const dansDate = /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/.exec(String(w?.date ?? ''));
  if (dansDate && !/(Z|[+-]\d{2}:?\d{2})$/.test(String(w.date))) {
    const h = +dansDate[1];
    const m = +dansDate[2];
    if (h || m) return { h, m, texte: `${p2(h)}:${p2(m)}` };
  }
  const d = instantPesee(w);
  if (!d) return null;
  const local = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  if (local !== jourDe(w.date)) return null;
  return { h: d.getHours(), m: d.getMinutes(), texte: `${p2(d.getHours())}:${p2(d.getMinutes())}` };
}

const valide = (w: Weight | null | undefined): w is Weight => !!w && !!w.date && Number(w.weight) > 0;
const parOrdre = (a: Weight, b: Weight) => (a.id ?? 0) - (b.id ?? 0);

/** Le poids du jour parmi les pesees d'UN jour (la regle ci-dessus) ; null s'il n'y en a pas */
export function poidsDuJour<T extends Weight>(peseesDuJour: T[]): T | null {
  const l = peseesDuJour.filter(valide).sort(parOrdre) as T[];
  if (!l.length) return null;
  const premiere = l[0];
  const h = heurePesee(premiere);
  return h && h.h < MIDI ? premiere : l[l.length - 1];
}

/** Les pesees d'un jour, le poids du jour d'abord, puis les autres de la plus recente a la plus ancienne */
export function peseesDuJourOrdonnees<T extends Weight>(rows: T[], jour: string): T[] {
  const l = rows.filter((w) => valide(w) && jourDe(w.date) === jour);
  const ref = poidsDuJour(l);
  const autres = l.filter((w) => w !== ref).sort((a, b) => parOrdre(b, a));
  return ref ? [ref, ...autres] : autres;
}

/** Une pesee par jour (le poids du jour), du jour le plus recent au plus ancien */
export function unePeseeParJour<T extends Weight>(rows: T[]): T[] {
  const parJour = new Map<string, T[]>();
  for (const w of rows) {
    if (!valide(w)) continue;
    const j = jourDe(w.date);
    const l = parJour.get(j);
    if (l) l.push(w);
    else parJour.set(j, [w]);
  }
  return [...parJour.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([, l]) => poidsDuJour(l))
    .filter(valide) as T[];
}

/** Le poids du jour le plus recent (accueil, IMC, widgets) ; null sans pesee */
export function dernierPoidsDuJour<T extends Weight>(rows: T[]): T | null {
  return unePeseeParJour(rows)[0] ?? null;
}

/** Jours de suite avec au moins une pesee, en finissant aujourd'hui (plusieurs pesees le meme jour comptent pour un) */
export function joursDeSuitePesee(rows: Weight[], aujourdhui: Date = new Date()): number {
  const jours = new Set(rows.filter(valide).map((w) => jourDe(w.date)));
  let n = 0;
  const d = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate(), 12);
  for (;;) {
    const j = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    if (!jours.has(j)) return n;
    n++;
    d.setDate(d.getDate() - 1);
  }
}

/**
 * Lecture de toutes les pesees (getWeights, jour le plus recent d'abord) : dans chaque jour, le poids du jour
 * vient en premier, puis les autres de la plus recente a la plus ancienne. Ainsi un ecran qui lit « la
 * premiere pesee » (weights[0]) ou « la premiere de chaque jour » suit la meme regle, sans rien changer d'autre.
 */
export function poidsDuJourDabord<T extends Weight>(rows: T[]): T[] {
  const out: T[] = [];
  let i = 0;
  while (i < rows.length) {
    const j0 = jourDe(rows[i]?.date);
    let k = i;
    while (k < rows.length && jourDe(rows[k]?.date) === j0) k++;
    const bloc = rows.slice(i, k);
    if (bloc.length > 1) {
      const ref = poidsDuJour(bloc);
      const autres = bloc.filter((w) => w !== ref).sort((a, b) => parOrdre(b, a));
      out.push(...(ref ? [ref, ...autres] : autres));
    } else out.push(...bloc);
    i = k;
  }
  return out;
}
