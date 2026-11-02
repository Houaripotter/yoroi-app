/**
 * Ce qu'un exercice de la seance en direct ajoute a l'exercice enregistre (revue du 30 octobre 2026) : sa note,
 * et pour un exercice cardio sa duree reelle (minutes) et sa distance. Donnees pures, testees dans
 * __tests__/unit/exerciceEnregistre.test.ts.
 */
import { bilanCardio, infoCardio, typeDeNom } from './cardioChoix';
import type { SegmentCardio, TypeCardio } from './cardioChoix';
import type { ChronoCardio } from './cardioFin';
export type ExoLive = { notes?: string; cardio?: Pick<ChronoCardio, 'distanceKm' | 'type' | 'segments' | 'fcMoy' | 'zone2' | 'parler'> | null };
/**
 * 31 octobre 2026 : le resume du cardio garde avec l'exercice (le JSON des exercices de la seance, sans nouvelle
 * colonne) : type, pente, vitesse ou niveau moyens, segments s'il y en a plusieurs, FC moyenne et zone 2.
 */
export type ResumeCardio = {
  type: TypeCardio;
  penteMoy?: number;
  vitesseMoy?: number;
  niveauMoy?: number;
  segments?: SegmentCardio[];
  fcMoy?: number;
  zone2?: { min: number; max: number };
  parler?: boolean;
  /** la distance vient de la vitesse du tapis et du temps */
  distanceCalculee?: true;
};
export type ExoEnregistre = { notes?: string; duration?: number; distance?: number; cardio?: ResumeCardio };

export function completerExercice<T extends ExoEnregistre>(out: T, e: ExoLive, dureeSec: number): T {
  // le bloc cardio avait ete pose entre le « if » de la note et son « else » : toute note de musculation
  // etait effacee a l'enregistrement (commit b27183e3). La note et le cardio sont maintenant separes.
  if (e.notes && e.notes.trim()) out.notes = e.notes.trim();
  else delete out.notes;
  if (e.cardio) {
    out.duration = Math.round((dureeSec || 0) / 60);
    const type = e.cardio.type ?? typeDeNom((out as { name?: string }).name) ?? null;
    const b = type ? bilanCardio(e.cardio.segments, dureeSec, infoCardio(type).mesure) : null;
    // la distance saisie a la main passe avant celle calculee depuis la vitesse du tapis
    if (e.cardio.distanceKm && e.cardio.distanceKm > 0) out.distance = e.cardio.distanceKm;
    else if (b?.distanceKm && b.distanceKm > 0) out.distance = b.distanceKm;
    if (type) {
      const r: ResumeCardio = { type };
      if (b?.penteMoy !== undefined) r.penteMoy = b.penteMoy;
      if (b?.vitesseMoy !== undefined) r.vitesseMoy = b.vitesseMoy;
      if (b?.niveauMoy !== undefined) r.niveauMoy = b.niveauMoy;
      if (e.cardio.segments && e.cardio.segments.length > 1) r.segments = e.cardio.segments.map((x) => ({ ...x }));
      if (typeof e.cardio.fcMoy === 'number' && e.cardio.fcMoy > 0) r.fcMoy = Math.round(e.cardio.fcMoy);
      if (e.cardio.zone2) r.zone2 = { ...e.cardio.zone2 };
      if (typeof e.cardio.parler === 'boolean') r.parler = e.cardio.parler;
      if (!(e.cardio.distanceKm && e.cardio.distanceKm > 0) && b?.distanceKm) r.distanceCalculee = true;
      out.cardio = r;
    }
  }
  return out;
}

/** Le resume du cardio d'un exercice enregistre, lu prudemment (anciennes seances : null) */
export function resumeCardioDe(x: unknown): ResumeCardio | null {
  const r = (x as { cardio?: unknown } | null)?.cardio as ResumeCardio | undefined;
  return r && typeof r === 'object' && typeof r.type === 'string' ? r : null;
}

/**
 * Les chiffres cles du cardio d'une seance de musculation, pour les cartes de seance : distance (saisie ou calculee
 * depuis la vitesse du tapis), pente moyenne, vitesse moyenne et FC moyenne du cardio (avec sa zone 2 gardee),
 * sur le premier cardio qui les a.
 */
export type ChiffresCardio = {
  distanceKm?: number;
  penteMoy?: number;
  fcMoy?: number;
  /** 2 novembre 2026 : vitesse moyenne du tapis (km/h), telle qu'enregistree avec le cardio */
  vitesseMoy?: number;
  /** 2 novembre 2026 : la zone 2 gardee avec le cardio qui a la FC moyenne (bpm), absente si elle n'a pas ete gardee */
  zone2?: { min: number; max: number };
};

export function chiffresCardio(exos: readonly unknown[] | null | undefined): ChiffresCardio {
  const out: ChiffresCardio = {};
  for (const e of exos ?? []) {
    const r = resumeCardioDe(e);
    if (!r) continue;
    const d = Number((e as { distance?: unknown }).distance);
    if (out.distanceKm === undefined && Number.isFinite(d) && d > 0) out.distanceKm = d;
    if (out.penteMoy === undefined && typeof r.penteMoy === 'number') out.penteMoy = r.penteMoy;
    if (out.vitesseMoy === undefined && typeof r.vitesseMoy === 'number' && r.vitesseMoy > 0) out.vitesseMoy = r.vitesseMoy;
    if (out.fcMoy === undefined && typeof r.fcMoy === 'number' && r.fcMoy > 0) {
      out.fcMoy = r.fcMoy;
      // la zone 2 du meme cardio que la FC : celle du moment de la seance
      const z = r.zone2;
      if (z && typeof z.min === 'number' && typeof z.max === 'number' && z.max > z.min) out.zone2 = { min: z.min, max: z.max };
    }
  }
  return out;
}
