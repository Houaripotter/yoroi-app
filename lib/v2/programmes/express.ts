/**
 * Séance express (24 octobre 2026) : tu as 15, 20 ou 30 minutes, la séance du jour est raccourcie au lieu
 * d'être sautée. Les exercices gardent leur ordre (les gros mouvements sont en tête dans chaque programme),
 * chacun garde au moins 2 séries tant que le temps le permet, puis les séries reviennent du premier au
 * dernier. Ce qui ne rentre pas est reporté, et l'écran le dit : une séance raccourcie n'est pas présentée
 * comme une séance complète. Moins de séries reste utile, plus de séries reste mieux (Schoenfeld 2017).
 * Données pures, testées dans __tests__/unit/express.test.ts.
 */
import type { ExoProgramme } from './types';

export const DUREES_EXPRESS = [15, 20, 30] as const;

/** Effort moyen d'une série, en secondes (8 à 12 répétitions, environ 3 secondes chacune) */
const EFFORT_SEC = 40;
/** Repos plafonné en express : 2 minutes */
const REPOS_MAX_EXPRESS = 120;

/** Durée d'une série et de son repos, en secondes */
export function dureeSerie(e: ExoProgramme): number {
  const effort = e.secondes ? e.repsMax : EFFORT_SEC;
  return effort + Math.min(e.reposSec, REPOS_MAX_EXPRESS);
}

/** Durée estimée d'une liste d'exercices, en minutes arrondies */
export function dureeEstimee(exos: ExoProgramme[], express = false): number {
  const s = exos.reduce((t, e) => t + e.series * (e.secondes ? e.repsMax : EFFORT_SEC) + e.series * (express ? Math.min(e.reposSec, REPOS_MAX_EXPRESS) : e.reposSec), 0);
  return Math.round(s / 60);
}

export type Express<E extends ExoProgramme> = {
  exos: E[];
  /** exercices gardés avec moins de séries que prévu */
  reduits: string[];
  /** exercices qui ne rentrent pas, à faire une autre fois */
  reportes: string[];
};

export function seanceExpress<E extends ExoProgramme>(exos: E[], minutes: number): Express<E> {
  // 3 minutes d'échauffement compris dans le temps
  let reste = Math.max(0, minutes * 60 - 180);
  const series = exos.map(() => 0);
  // 1. deux séries par exercice, dans l'ordre, tant que ça rentre
  for (let i = 0; i < exos.length; i++) {
    const base = Math.min(2, exos[i].series);
    const cout = base * dureeSerie(exos[i]);
    if (cout > reste) break;
    series[i] = base;
    reste -= cout;
  }
  // 2. les séries reviennent du premier au dernier exercice gardé
  let ajoute = true;
  while (ajoute) {
    ajoute = false;
    for (let i = 0; i < exos.length; i++) {
      if (series[i] === 0 || series[i] >= exos[i].series) continue;
      const cout = dureeSerie(exos[i]);
      if (cout > reste) continue;
      series[i] += 1;
      reste -= cout;
      ajoute = true;
    }
  }
  const garde: E[] = [];
  const reduits: string[] = [];
  const reportes: string[] = [];
  exos.forEach((e, i) => {
    if (series[i] === 0) return reportes.push(e.nom);
    if (series[i] < e.series) reduits.push(e.nom);
    garde.push({ ...e, series: series[i], reposSec: Math.min(e.reposSec, REPOS_MAX_EXPRESS) });
  });
  return { exos: garde, reduits, reportes };
}
