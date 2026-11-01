/**
 * Composition detaillee (1er novembre 2026, demande AT, point 2) : tout ce qui est deja stocke mais n'avait pas
 * d'ecran. Masse maigre, eau en kg (et en L), muscle squelettique, proteines, poids cible, masse grasse en kg,
 * chaque mesure de la colonne JSON scale_extras (cles connues et lignes autre) et les mesures du sac
 * (lib/v2/mesures/sac.ts) qui ne sont rangees nulle part ailleurs.
 * Chaque point garde son appareil : les balances ne se comparent pas entre elles (Tanita compte tout le muscle,
 * InBody le muscle squelettique, les niveaux de graisse viscerale n'ont pas la meme echelle).
 * Une donnee absente n'existe pas ici : rien n'est invente. Fonctions pures, testees.
 */
import { BALANCE_FIELD, JSON_FIELDS, normKey, parseScaleJson } from '@/lib/v2/balance/format';
import { contexteDePesee } from './contextePesee';
import type { ContextePesee } from './contextePesee';
import type { MesureBrute } from './sac';

export type PointCompo = { date: string; valeur: number; appareil: string | null; peseeId?: number | null };

export type DonneeCompo = {
  cle: string;
  label: string;
  unite: string;
  /** chiffres apres la virgule */
  digits: number;
  /** segment (bras, jambe, tronc) : niveau Athlete pour les invitations */
  segment: boolean;
  points: PointCompo[];
  appareils: string[];
};

type LigneWeight = { id?: number | null; date: string; weight: number; fat_kg?: number | null; source?: string | null; scale_extras?: string | null };

/** L'ordre d'affichage des donnees connues ; les autres suivent par ordre alphabetique */
export const ORDRE_COMPO = [
  'masse_maigre_kg',
  'graisse_kg',
  'muscle_squelettique_kg',
  'muscle_squelettique_pct',
  'eau_kg',
  'proteines_kg',
  'proteines_pct',
  'mineraux_kg',
  'graisse_sous_cutanee_pct',
  'ratio_eau_extracellulaire',
  'angle_de_phase',
  'age_corporel',
  'score_corporel',
  'fc_repos',
  'poids_ideal_kg',
];

const LABELS_EN_PLUS: Record<string, { label: string; unite: string; digits: number }> = {
  graisse_kg: { label: 'Masse grasse en kilos', unite: 'kg', digits: 1 },
};

const digitsDe = (step: number) => (step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3);

/** Statuts du sac affiches : mesures en plus gardees, pas rangees ailleurs */
const STATUTS_AFFICHES = new Set(['autre', 'decochee']);
/** Longueurs (mensurations, plis) et biomarqueurs : leurs propres ecrans */
const UNITES_AILLEURS = /^(cm|mm|in|pouces?|mmhg|mmol\/l|mg\/dl|°c|°f)$/i;

/**
 * Les donnees de composition detaillee, une par mesure, avec leurs points dans l'ordre des dates.
 * appareilDe : le nom lisible d'une source de pesee (balance_photo, withings...) quand le contexte n'a pas d'appareil.
 */
export function donneesComposition(
  rows: LigneWeight[],
  contextes: ContextePesee[],
  brutes: MesureBrute[],
  appareilDe: (source: string) => string | null = (s) => s,
): DonneeCompo[] {
  const map = new Map<string, DonneeCompo>();
  const ajouter = (cle: string, label: string, unite: string, digits: number, segment: boolean, p: PointCompo) => {
    if (!Number.isFinite(p.valeur)) return;
    let d = map.get(cle);
    if (!d) {
      d = { cle, label, unite, digits, segment, points: [], appareils: [] };
      map.set(cle, d);
    }
    d.points.push(p);
  };
  for (const w of rows) {
    if (!w || !w.date) continue;
    const date = String(w.date).slice(0, 10);
    const ctx = contexteDePesee({ id: w.id, date, weight: Number(w.weight) }, contextes);
    const src = w.source && w.source !== 'manual' && w.source !== 'csv' ? appareilDe(w.source) : null;
    const appareil = ctx?.appareil ?? src ?? null;
    const base = { date, appareil, peseeId: w.id ?? null };
    const fk = Number(w.fat_kg);
    if (Number.isFinite(fk) && fk > 0) ajouter('graisse_kg', LABELS_EN_PLUS.graisse_kg.label, 'kg', 1, false, { ...base, valeur: fk });
    const json = parseScaleJson(w.scale_extras);
    if (!json) continue;
    for (const [k, v] of Object.entries(json.mesures ?? {})) {
      const f = BALANCE_FIELD[k];
      if (!f || !JSON_FIELDS.includes(f)) continue;
      ajouter(k, f.label, f.unit, digitsDe(f.step), !!f.segment, { ...base, valeur: v });
    }
    for (const a of json.autres ?? []) {
      const u = (a.unite ?? '').trim();
      if (UNITES_AILLEURS.test(u)) continue;
      ajouter(`autre_${normKey(a.nom)}_${normKey(u) || 'x'}`, a.nom, u, 1, false, { ...base, valeur: a.valeur });
    }
  }
  for (const m of brutes) {
    if (!m || !STATUTS_AFFICHES.has(m.statut) || m.dansPesee || m.valeur === null || !m.date) continue;
    const u = (m.uniteBase ?? m.unite ?? '').trim();
    if (UNITES_AILLEURS.test(u) || UNITES_AILLEURS.test((m.unite ?? '').trim())) continue;
    const v = m.valeurBase ?? m.valeur;
    ajouter(`autre_${normKey(m.nom)}_${normKey(u) || 'x'}`, m.nom, u, 1, !!m.segment, { date: m.date, valeur: v, appareil: m.appareil ?? null });
  }
  const out = Array.from(map.values()).map((d) => {
    const points = [...d.points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const appareils = Array.from(new Set(points.map((p) => p.appareil).filter((x): x is string => !!x)));
    return { ...d, points, appareils };
  });
  const rang = (c: string) => {
    const i = ORDRE_COMPO.indexOf(c);
    return i < 0 ? ORDRE_COMPO.length : i;
  };
  return out.sort((a, b) => (a.segment !== b.segment ? (a.segment ? 1 : -1) : rang(a.cle) - rang(b.cle) || a.label.localeCompare(b.label)));
}

/** Les appareils de toutes les donnees, le plus fourni d'abord */
export function appareilsDe(donnees: DonneeCompo[]): string[] {
  const n = new Map<string, number>();
  for (const d of donnees) for (const p of d.points) if (p.appareil) n.set(p.appareil, (n.get(p.appareil) ?? 0) + 1);
  return Array.from(n.entries()).sort((a, b) => b[1] - a[1]).map(([a]) => a);
}

/**
 * Les points a dessiner pour une donnee : ceux de l'appareil choisi ; sans choix et avec plusieurs appareils,
 * ceux de l'appareil qui a le plus de points (jamais deux balances sur la meme courbe).
 */
export function pointsCourbe(d: DonneeCompo, appareil: string | null): { points: PointCompo[]; appareil: string | null } {
  if (appareil) return { points: d.points.filter((p) => p.appareil === appareil), appareil };
  if (d.appareils.length <= 1) return { points: d.points, appareil: d.appareils[0] ?? null };
  const n = new Map<string, number>();
  for (const p of d.points) if (p.appareil) n.set(p.appareil, (n.get(p.appareil) ?? 0) + 1);
  const top = Array.from(n.entries()).sort((a, b) => b[1] - a[1])[0][0];
  return { points: d.points.filter((p) => p.appareil === top), appareil: top };
}

/** Eau en kg : environ 1 L par kg (densite de l'eau du corps proche de 1) */
export function eauEnLitres(kg: number): number {
  return Math.round(kg * 10) / 10;
}
