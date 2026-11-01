/**
 * Indices calcules du corps (1er novembre 2026, demandes AT point 4 et AU point 2), a partir de tes vraies mesures
 * seulement : rien n'est affiche s'il manque une donnee. Fonctions pures, testees (__tests__/unit/donneesCorps.test.ts).
 *
 * WHtR, tour de taille sur taille : tour de taille (cm) / taille (cm). Repere : en dessous de 0,5, c'est la zone
 * saine couramment citee (« garde ton tour de taille sous la moitie de ta taille »).
 *   Sources : Ashwell M, Gunn P, Gibson S. Waist-to-height ratio is a better screening tool than waist circumference
 *   and BMI for adult cardiometabolic risk factors: systematic review and meta-analysis. Obesity Reviews
 *   2012;13(3):275-286. NICE, Obesity: identification, assessment and management (CG189, mise a jour 2022) :
 *   rapport tour de taille sur taille de 0,4 a 0,49 = sain.
 *
 * FFMI : masse maigre (kg) / taille (m) au carre. FFMI normalise a 1,80 m : FFMI + 6,1 x (1,8 - taille en m).
 *   Source : Kouri EM, Pope HG, Katz DL, Oliva P. Fat-free mass index in users and nonusers of anabolic-androgenic
 *   steroids. Clinical Journal of Sport Medicine 1995;5(4):223-228.
 *   Masse maigre : celle de ta balance si elle la donne, sinon poids x (1 - masse grasse %) de la meme pesee.
 *
 * Rapport epaules sur taille : tour d'epaules / tour de taille (deux mesures du meme jour ou les dernieres connues).
 *   C'est un simple rapport de silhouette, sans seuil de sante : aucun repere n'est affiche.
 *
 * Mosteller (surface corporelle) : pas affiche, il ne sert qu'aux doses medicales, pas au suivi sportif.
 */

const pos = (x: unknown): number | undefined => {
  const n = Number(x);
  return x != null && Number.isFinite(n) && n > 0 ? n : undefined;
};
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;

export const SEUIL_WHTR = 0.5;

export type Whtr = { valeur: number; sain: boolean };

/** Tour de taille sur taille ; undefined s'il manque l'un des deux ou s'ils sont hors plage */
export function whtr(tourDeTailleCm?: number | null, tailleCm?: number | null): Whtr | undefined {
  const t = pos(tourDeTailleCm);
  const h = pos(tailleCm);
  if (!t || !h || h < 100 || h > 250 || t < 40 || t > 200) return undefined;
  const valeur = r2(t / h);
  return { valeur, sain: valeur < SEUIL_WHTR };
}

/** Masse maigre : mesuree par la balance, sinon calculee depuis le poids et la masse grasse de la meme pesee */
export function masseMaigre(p: { masseMaigreKg?: number | null; poidsKg?: number | null; graissePct?: number | null }): { kg: number; mesuree: boolean } | undefined {
  const m = pos(p.masseMaigreKg);
  if (m) return { kg: r1(m), mesuree: true };
  const w = pos(p.poidsKg);
  const f = pos(p.graissePct);
  if (!w || !f || f >= 75) return undefined;
  return { kg: r1(w * (1 - f / 100)), mesuree: false };
}

export type Ffmi = { ffmi: number; normalise: number };

/** FFMI et FFMI normalise a 1,80 m (Kouri 1995) */
export function ffmi(masseMaigreKg?: number | null, tailleCm?: number | null): Ffmi | undefined {
  const m = pos(masseMaigreKg);
  const h = pos(tailleCm);
  if (!m || !h || h < 100 || h > 250) return undefined;
  const hm = h / 100;
  const v = m / (hm * hm);
  return { ffmi: r1(v), normalise: r1(v + 6.1 * (1.8 - hm)) };
}

/** Tour d'epaules sur tour de taille */
export function epaulesSurTaille(epaulesCm?: number | null, tourDeTailleCm?: number | null): number | undefined {
  const e = pos(epaulesCm);
  const t = pos(tourDeTailleCm);
  if (!e || !t) return undefined;
  return r2(e / t);
}

export type Moyenne7 = { valeur: number; n: number; precedente?: number; ecart?: number; depuis: string; jusqua: string };

const jourMoins = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Moyenne de tes poids du jour sur les 7 derniers jours (jusqu'a ta derniere pesee, une pesee par jour : celle que
 * garde la courbe), et l'ecart avec les 7 jours d'avant. undefined sans pesee. Au moins 2 pesees pour l'ecart.
 */
export function moyenne7Jours(serie: { date: string; value: number }[], aujourdhui?: string): Moyenne7 | undefined {
  const s = serie.filter((p) => p && p.value > 0 && (!aujourdhui || p.date <= aujourdhui)).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!s.length) return undefined;
  const fin = s[s.length - 1].date;
  const debut = jourMoins(fin, 6);
  const sem = s.filter((p) => p.date >= debut && p.date <= fin);
  const avDebut = jourMoins(fin, 13);
  const av = s.filter((p) => p.date >= avDebut && p.date < debut);
  const moy = (l: { value: number }[]) => l.reduce((a, p) => a + p.value, 0) / l.length;
  const valeur = r1(moy(sem));
  const precedente = av.length >= 2 && sem.length >= 2 ? r1(moy(av)) : undefined;
  return { valeur, n: sem.length, depuis: debut, jusqua: fin, ...(precedente !== undefined ? { precedente, ecart: r1(valeur - precedente) } : {}) };
}
