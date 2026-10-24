/**
 * Progression des charges d'un programme (24 octobre 2026). Donnees pures, testees dans
 * __tests__/unit/programmes.test.ts.
 *
 * Regle de l'ACSM (position stand 2009, Progression models in resistance training for healthy adults) :
 * quand tu fais une ou deux repetitions de plus que prevu sur deux seances d'affilee, la charge monte
 * de 2 a 10 %. Ici : si tes DEUX dernieres seances sur l'exercice ont atteint le haut de la fourchette
 * sur toutes les series, a la meme charge, la charge monte d'environ 5 % (arrondie a 1,25 kg, au moins
 * 1,25 kg) et tu repars du bas de la fourchette. Sinon tu gardes la charge et tu cherches une repetition
 * de plus. Au poids du corps, la progression passe par les repetitions.
 */
import type { ExoProgramme } from './types';

export type SerieFaite = { weight: number; reps: number };

export type Proposition = {
  /** series pre-remplies (charge en kg, repetitions visees) */
  series: SerieFaite[];
  /** ce qui a ete decide, pour l'afficher */
  raison: 'premiere' | 'monte' | 'garde' | 'poids_du_corps' | 'variante' | 'legere';
  /** nouvelle charge quand elle monte, en kg */
  nouvelleCharge?: number;
};

const PAS_KG = 1.25;
export const HAUSSE = 0.05;

function arrondi(kg: number): number {
  return Math.round(kg / PAS_KG) * PAS_KG;
}

/** Charge de travail d'une seance : la plus lourde, les series d'echauffement plus legeres ne comptent pas */
export function chargeDeTravail(series: SerieFaite[]): number {
  return series.reduce((m, s) => Math.max(m, Number(s.weight) || 0), 0);
}

/** Toutes les series a la charge de travail ont atteint au moins `reps` repetitions */
export function hautAtteint(series: SerieFaite[], reps: number): boolean {
  const w = chargeDeTravail(series);
  const travail = series.filter((s) => (Number(s.weight) || 0) === w && (Number(s.reps) || 0) > 0);
  return travail.length > 0 && travail.every((s) => s.reps >= reps);
}

/** Charge suivante : environ +5 %, arrondie a 1,25 kg, jamais moins de +1,25 kg */
export function chargeSuivante(kg: number): number {
  return Math.max(arrondi(kg * (1 + HAUSSE)), arrondi(kg) + PAS_KG);
}

/**
 * Propose les series d'un exercice du programme.
 * `dernieres` : les seances passees sur cet exercice, de la plus recente a la plus ancienne.
 */
export function proposer(exo: ExoProgramme, dernieres: SerieFaite[][]): Proposition {
  const n = exo.series;
  const recentes = dernieres.filter((s) => s && s.length > 0);
  const derniere = recentes[0];

  if (!derniere) {
    return { series: Array.from({ length: n }, () => ({ weight: 0, reps: exo.repsMin })), raison: exo.poidsDuCorps ? 'poids_du_corps' : 'premiere' };
  }

  const w = chargeDeTravail(derniere);

  if (exo.poidsDuCorps || w === 0) {
    // au poids du corps : une repetition de plus que la derniere fois, jusqu'au haut de la fourchette
    const best = derniere.reduce((m, s) => Math.max(m, Number(s.reps) || 0), 0);
    if (hautAtteint(derniere, exo.repsMax) && recentes[1] && hautAtteint(recentes[1], exo.repsMax)) {
      return { series: Array.from({ length: n }, () => ({ weight: w, reps: exo.repsMax })), raison: 'variante' };
    }
    // exercice tenu : quelques secondes de plus (5), sinon une repetition
    const pas = exo.secondes ? 5 : 1;
    const vise = Math.min(exo.repsMax, Math.max(exo.repsMin, best + pas));
    return { series: Array.from({ length: n }, () => ({ weight: w, reps: vise })), raison: 'poids_du_corps' };
  }

  const avant = recentes[1];
  const deuxFois = !!avant && chargeDeTravail(avant) === w && hautAtteint(derniere, exo.repsMax) && hautAtteint(avant, exo.repsMax);
  if (deuxFois) {
    const nouvelle = chargeSuivante(w);
    return { series: Array.from({ length: n }, () => ({ weight: nouvelle, reps: exo.repsMin })), raison: 'monte', nouvelleCharge: nouvelle };
  }

  // meme charge : on vise une repetition de plus que la meilleure serie de la derniere fois, sans depasser le haut
  const travail = derniere.filter((s) => (Number(s.weight) || 0) === w);
  const best = travail.reduce((m, s) => Math.max(m, Number(s.reps) || 0), 0);
  const vise = Math.min(exo.repsMax, Math.max(exo.repsMin, best + (best < exo.repsMax ? 1 : 0)));
  return { series: Array.from({ length: n }, () => ({ weight: w, reps: vise })), raison: 'garde' };
}

/** Seances passees d'un exercice, de la plus recente a la plus ancienne (series lues comme dans l'historique) */
export function seancesDeLExo(
  trainings: { date: string; start_time?: string | null; exercises?: { name?: string; sets?: number; reps?: number; weight?: number; setsData?: { weight: number; reps: number; type?: string }[] }[] | null }[],
  nom: string,
  combien = 2,
): SerieFaite[][] {
  const plier = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const cle = plier(nom);
  const tri = [...trainings].sort((a, b) => (`${a.date.slice(0, 10)} ${a.start_time ?? '00:00'}` < `${b.date.slice(0, 10)} ${b.start_time ?? '00:00'}` ? 1 : -1));
  const out: SerieFaite[][] = [];
  for (const t of tri) {
    const e = (t.exercises ?? []).find((x) => x && x.name && plier(x.name) === cle);
    if (!e) continue;
    let series: SerieFaite[];
    if (Array.isArray(e.setsData) && e.setsData.length > 0) {
      // les series d'echauffement ne comptent pas dans la progression
      series = e.setsData.filter((s) => s?.type !== 'warmup').map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 }));
    } else {
      const n = Math.max(1, Math.min(Number(e.sets) || 1, 20));
      series = Array.from({ length: n }, () => ({ weight: Number(e.weight) || 0, reps: Number(e.reps) || 0 }));
    }
    series = series.filter((s) => s.weight > 0 || s.reps > 0);
    if (series.length === 0) continue;
    out.push(series);
    if (out.length >= combien) break;
  }
  return out;
}

/**
 * Semaine legere (Bell 2023, consensus Delphi : baisser les series ou les repetitions en gardant la charge) :
 * moitie moins de series (arrondi au-dessus), la charge de ta derniere seance, le bas de la fourchette.
 */
export function proposerLegere(exo: ExoProgramme, dernieres: SerieFaite[][]): Proposition {
  const n = Math.max(1, Math.ceil(exo.series / 2));
  const derniere = dernieres.find((s) => s && s.length > 0);
  const w = derniere ? chargeDeTravail(derniere) : 0;
  return { series: Array.from({ length: n }, () => ({ weight: w, reps: exo.repsMin })), raison: 'legere' };
}

/**
 * Seance libre, hors programme (24 octobre 2026) : la meme regle de l'ACSM 2009, sans fourchette ecrite.
 * La cible, c'est ta meilleure serie de la derniere fois. Tu l'as tenue sur TOUTES tes series de travail deux
 * seances de suite, a la meme charge : la charge monte d'environ 5 %. Sinon : meme charge, la meme cible partout.
 * null : premiere fois, poids du corps, ou rien d'exploitable (on ne propose rien plutot que d'inventer).
 */
export type PropositionLibre = { raison: 'monte' | 'garde'; charge: number; reps: number };

export function proposerLibre(dernieres: SerieFaite[][]): PropositionLibre | null {
  const recentes = dernieres.filter((s) => s && s.length > 0);
  const derniere = recentes[0];
  if (!derniere) return null;
  const w = chargeDeTravail(derniere);
  if (!(w > 0)) return null;
  const cible = derniere.filter((s) => (Number(s.weight) || 0) === w).reduce((m, s) => Math.max(m, Number(s.reps) || 0), 0);
  if (!(cible > 0) || cible > 30) return null;
  const avant = recentes[1];
  if (avant && chargeDeTravail(avant) === w && hautAtteint(derniere, cible) && hautAtteint(avant, cible)) {
    return { raison: 'monte', charge: chargeSuivante(w), reps: cible };
  }
  return { raison: 'garde', charge: w, reps: cible };
}
