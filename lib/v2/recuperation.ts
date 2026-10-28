/**
 * Ta recuperation : SOURCE UNIQUE du score sur 100 (vague 32).
 * Accueil (bloc « Ta récupération »), ecran detail (/readiness-detail) et Sante (carte du haut)
 * affichent le meme score, calcule ici. Fonctions pures, testees dans __tests__/unit/chiffres.test.ts.
 *
 * On ne combine que ce qui est vraiment mesure. Poids de chaque element (renormalises sur ce qui existe) :
 *  - sommeil de la nuit 30 % : duree comparee a ton objectif (qualite notee comptee a 30 % si tu l'as donnee) ;
 *  - charge d'entrainement 20 % : minutes des 7 derniers jours comparees a ta moyenne des 4 semaines d'avant ;
 *  - variabilite cardiaque 20 % : comparee a TA moyenne des 28 jours d'avant (5 mesures minimum),
 *    25 % au-dessus donne 100, 25 % en dessous donne 0 (Plews 2013, suivi individuel de la VFC) ;
 *  - frequence au repos 10 % : comparee a ta moyenne, 10 % en dessous donne 100, 10 % au-dessus donne 0 ;
 *  - etat du corps 15 % : gene ou blessure signalee ;
 *  - hydratation 5 % : eau notee du jour sur ton objectif.
 * Sans sommeil ni seance recente, pas de score.
 */

import { traduire, traduirePluriel } from '@/lib/i18n/tr';
export type RecupKey = 'sommeil' | 'charge' | 'hydratation' | 'corps' | 'coeur' | 'vfc';

export const RECUP_WEIGHTS: Record<RecupKey, number> = { sommeil: 0.3, charge: 0.2, vfc: 0.2, coeur: 0.1, corps: 0.15, hydratation: 0.05 };

/** Nom unique du score, partout dans l'app */
export const RECUP_NAME = traduire('Ta récupération');

/** Explication affichee sous le score (Sante et ecran detail) */
export const RECUP_METHOD: string[] = [
  traduire('YOROI ne combine que ce qui est mesuré. Sans ta nuit ni séance récente, pas de score.'),
  traduire('Sommeil de la nuit, 30 % : ta durée comparée à ton objectif de sommeil.'),
  traduire('Charge d’entraînement, 20 % : tes 7 derniers jours comparés à tes 4 semaines d’avant.'),
  traduire('Variabilité cardiaque, 20 %, et fréquence au repos, 10 % : comparées à ta propre moyenne des 28 jours d’avant.'),
  traduire('État du corps, 15 %, et eau du jour, 5 % : ce que tu as noté.'),
  traduire('Ce n’est pas la récupération WHOOP, la Body Battery Garmin ni le Readiness Oura. C’est un repère d’entraînement, pas un avis médical.'),
];

export const clamp100 = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/** Point d'une serie journaliere (Sante) */
export type RecupPoint = { date: string; value: number };

function dayNum(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
}

/** Valeur de cette nuit ou d'hier, et moyenne des 28 jours d'avant (au moins 5 mesures) */
export function todayAndBaseline(points: RecupPoint[] | undefined, today: string): { today: RecupPoint | null; base: number | null } {
  const pts = (points ?? []).filter((p) => p && p.date && p.value > 0).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const t = dayNum(today);
  let last: RecupPoint | null = null;
  for (let i = pts.length - 1; i >= 0; i--) {
    const d = t - dayNum(pts[i].date);
    if (d >= 0 && d <= 1) {
      last = pts[i];
      break;
    }
  }
  if (!last) return { today: null, base: null };
  const ld = dayNum(last.date);
  const prev = pts.filter((p) => p.date < last!.date && ld - dayNum(p.date) <= 28).map((p) => p.value);
  return { today: last, base: prev.length >= 5 ? prev.reduce((a, b) => a + b, 0) / prev.length : null };
}

/** Sommeil : duree sur objectif, avec la qualite notee (1 a 5) si elle existe */
export function scoreSleep(minutes: number, goal: number, quality?: number): number {
  const dur = Math.min(1, minutes / (goal || 480)) * 100;
  return clamp100(quality && quality > 0 ? dur * 0.7 + quality * 20 * 0.3 : dur);
}

/** Variabilite cardiaque : relative a ta moyenne si elle existe, sinon reperes absolus prudents */
export function scoreHrv(today: number, base: number | null): number {
  if (base && base > 0) return clamp100(50 + 200 * ((today - base) / base));
  return today >= 80 ? 100 : today >= 60 ? 85 : today >= 40 ? 65 : today >= 25 ? 40 : 15;
}

/** Frequence au repos : relative a ta moyenne si elle existe, sinon reperes absolus prudents */
export function scoreRhr(today: number, base: number | null): number {
  if (base && base > 0) return clamp100(50 - 500 * ((today - base) / base));
  return today < 55 ? 100 : today < 65 ? 85 : today < 75 ? 65 : today < 85 ? 45 : 20;
}

/** Charge : minutes des 7 derniers jours (aujourd'hui compris) contre la moyenne hebdo des 4 semaines d'avant */
export function scoreCharge(sessions: { date: string; minutes: number }[], today: string): { score: number; detail: string; sessions7: number; minutes7: number } | null {
  if (!sessions.length) return null;
  const t = dayNum(today);
  const ago = (d: string) => t - dayNum(d);
  const last7 = sessions.filter((s) => ago(s.date) >= 0 && ago(s.date) <= 6);
  const prev28 = sessions.filter((s) => ago(s.date) > 6 && ago(s.date) <= 34);
  const minutes7 = last7.reduce((s, x) => s + (x.minutes || 45), 0);
  const prevWeekly = prev28.reduce((s, x) => s + (x.minutes || 45), 0) / 4;
  let score: number;
  let detail: string;
  if (prevWeekly > 0) {
    const r = minutes7 / prevWeekly;
    if (r <= 1.3) {
      score = 85;
      detail = 'charge habituelle';
    } else if (r <= 1.5) {
      score = 60;
      detail = traduire('semaine plus chargée que d’habitude');
    } else {
      score = 40;
      detail = traduire('semaine bien plus chargée que d’habitude');
    }
  } else {
    score = last7.length >= 5 ? 60 : 80;
    detail = traduirePluriel(last7.length, last7.length > 1, "{0} séance en 7 jours", "{0} séances en 7 jours", last7.length);
  }
  if ([0, 1, 2].every((d) => sessions.some((s) => ago(s.date) === d))) {
    score -= 10;
    detail = traduire('trois jours d’affilée sans repos');
  }
  return { score: Math.max(0, score), detail, sessions7: last7.length, minutes7 };
}

/** Score final : moyenne ponderee de ce qui est mesure, null sans sommeil ni charge */
export function combineRecup(factors: { key: RecupKey; score: number }[]): number | null {
  if (!factors.some((f) => f.key === 'sommeil' || f.key === 'charge')) return null;
  const w = factors.reduce((s, f) => s + RECUP_WEIGHTS[f.key], 0);
  return clamp100(factors.reduce((s, f) => s + f.score * RECUP_WEIGHTS[f.key], 0) / (w || 1));
}

/** Niveau : seuils uniques (accueil, detail, Sante) */
export function recupLevelId(score: number): 'top' | 'bien' | 'moyen' | 'bas' | 'repos' {
  return score >= 80 ? 'top' : score >= 65 ? 'bien' : score >= 50 ? 'moyen' : score >= 35 ? 'bas' : 'repos';
}

/**
 * Audit du 18 octobre 2026 : un score sur 100 n'est donne comme fiable qu'a partir de deux elements mesures.
 * SOURCE UNIQUE de la regle : ecran detail (/readiness-detail) et accueil (tuile et mini carte Recuperation).
 */
export const RECUP_ELEMENTS_MIN = 2;

export function scoreRecupFiable(score: number | null | undefined, elements: number): boolean {
  return typeof score === 'number' && Number.isFinite(score) && elements >= RECUP_ELEMENTS_MIN;
}

/** Le message quand le score n'est pas encore fiable (meme texte sur l'accueil et l'ecran detail) */
export function messageScoreIncomplet(manqueNuit: boolean): string {
  return manqueNuit ? traduire('Il manque ta nuit pour un score fiable') : traduire('Il manque un élément pour un score fiable');
}

/** Une phrase courte selon le niveau, sur les memes seuils que recupLevelId (80, 65, 50, 35) */
export function phraseRecup(score: number): string {
  const id = recupLevelId(score);
  if (id === 'top') return traduire('Prêt à pousser');
  if (id === 'bien') return traduire('Séance normale');
  if (id === 'moyen' || id === 'bas') return 'Doucement aujourd’hui';
  return traduire('Récupère aujourd’hui');
}
