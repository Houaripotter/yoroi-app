/**
 * Ta tendance de poids (18 octobre 2026, calcul du poids d'apres les etudes) : ce que pese vraiment ton corps,
 * sans l'eau du jour. Fonctions pures, testees (__tests__/unit/calculPoidsEtudes.test.ts).
 *
 * Pourquoi pas une simple moyenne : la moyenne mobile exponentielle de The Hacker's Diet (10 % par jour) lisse bien,
 * mais elle est en retard sur une perte reguliere (environ 1 kg de retard a 0,75 kg par semaine), et elle ne sait pas
 * quoi faire d'un jour sans pesee. Ici, un filtre de Kalman a deux etats (ton niveau et ta pente), le meme principe
 * que les applis de suivi qui lissent par le temps et non par le nombre de pesees :
 *  - chaque pesee est comparee a ce que le filtre attendait ce jour-la ; l'ecart corrige le niveau et la pente ;
 *  - un jour sans pesee : le filtre avance sur ta pente et devient moins sur de lui, la pesee suivante compte plus ;
 *  - une pesee tres loin de l'attendu (balance, faute de frappe, grosse soiree salee) est bornee : elle ne peut pas
 *    tirer ta tendance de plus de 2,5 ecarts types, et elle est signalee ;
 *  - pas de retard sur une perte ou une prise reguliere, puisque la pente fait partie du modele.
 * Reglages (choix de YOROI, verifies sur des series simulees a plus ou moins 1 kg d'eau) : 0,5 kg de bruit par
 * pesee, une derive du niveau de 50 g par jour et de la pente de 10 g par jour.
 */
import { ecartJours } from './ligneDirectrice';

/** bruit d'une pesee (eau, sel, glucides, transit, balance), ecart type en kg */
export const BRUIT_PESEE = 0.5;
/** derive du niveau (kg par racine de jour) et de la pente (kg par jour, par racine de jour) */
const DERIVE_NIVEAU = 0.05;
const DERIVE_PENTE = 0.01;
/** incertitude de depart sur la pente : 100 g par jour, environ 0,7 kg par semaine */
const PENTE_DEPART = 0.1;
/** au-dela de 2,5 ecarts types, la pesee est bornee et signalee */
const SEUIL_ABERRANT = 2.5;
/** moins de 3 pesees : pas de tendance */
export const MIN_PESEES_TENDANCE = 3;

const ISO = /^\d{4}-\d{2}-\d{2}/;

export type PointTendance = {
  date: string;
  /** ta pesee */
  value: number;
  /** ta tendance ce jour-la, en kg */
  tendance: number;
  /** ta pente ce jour-la, en kg par semaine (negative : tu descends) */
  kgSemaine: number;
  /** ta pesee moins ta tendance (positif : au-dessus) */
  ecart: number;
  /** pesee tres loin de l'attendu, bornee */
  aberrante: boolean;
};

/** Une pesee par jour (la derniere donnee du jour), dans l'ordre, jamais apres aujourd'hui */
export function peseesDuJour(series: { date: string; value: number }[], today?: string): { date: string; value: number }[] {
  const m = new Map<string, number>();
  for (const p of series) {
    if (!p || !(p.value > 0) || !ISO.test(p.date)) continue;
    const d = p.date.slice(0, 10);
    if (today && d > today) continue;
    m.set(d, p.value);
  }
  return Array.from(m.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([date, value]) => ({ date, value }));
}

/** Ta tendance, pesee par pesee (vide sous 1 pesee) */
export function filtrerTendance(series: { date: string; value: number }[], today?: string): PointTendance[] {
  const pts = peseesDuJour(series, today);
  if (!pts.length) return [];
  const R = BRUIT_PESEE * BRUIT_PESEE;
  const ql = DERIVE_NIVEAU * DERIVE_NIVEAU;
  const qs = DERIVE_PENTE * DERIVE_PENTE;
  let L = pts[0].value;
  let S = 0;
  let p00 = R;
  let p01 = 0;
  let p11 = PENTE_DEPART * PENTE_DEPART;
  const out: PointTendance[] = [{ date: pts[0].date, value: pts[0].value, tendance: L, kgSemaine: 0, ecart: 0, aberrante: false }];
  for (let i = 1; i < pts.length; i++) {
    const dt = Math.max(0, ecartJours(pts[i - 1].date, pts[i].date));
    // prediction : tu avances sur ta pente, le filtre devient moins sur de lui
    L += S * dt;
    const n00 = p00 + 2 * dt * p01 + dt * dt * p11 + ql * dt + (qs * dt * dt * dt) / 3;
    const n01 = p01 + dt * p11 + (qs * dt * dt) / 2;
    const n11 = p11 + qs * dt;
    // correction par ta pesee, bornee si elle est tres loin de l'attendu
    const sv = n00 + R;
    const lim = SEUIL_ABERRANT * Math.sqrt(sv);
    const brut = pts[i].value - L;
    const aberrante = Math.abs(brut) > lim;
    const nu = aberrante ? Math.sign(brut) * lim : brut;
    const k0 = n00 / sv;
    const k1 = n01 / sv;
    L += k0 * nu;
    S += k1 * nu;
    p00 = (1 - k0) * n00;
    p01 = (1 - k0) * n01;
    p11 = n11 - k1 * n01;
    out.push({ date: pts[i].date, value: pts[i].value, tendance: L, kgSemaine: S * 7, ecart: pts[i].value - L, aberrante });
  }
  return out;
}

export type Tendance = {
  /** date de ta derniere pesee */
  date: string;
  /** ta tendance ce jour-la, en kg */
  poids: number;
  /** ta pente, en kg par semaine */
  kgSemaine: number;
  /** ta derniere pesee moins ta tendance */
  ecart: number;
  /** pesees prises en compte */
  n: number;
  /** jours couverts */
  jours: number;
};

/** Ta tendance a ta derniere pesee, ou null sous 3 pesees */
export function tendanceActuelle(series: { date: string; value: number }[], today?: string): Tendance | null {
  const f = filtrerTendance(series, today);
  if (f.length < MIN_PESEES_TENDANCE) return null;
  const last = f[f.length - 1];
  return { date: last.date, poids: last.tendance, kgSemaine: last.kgSemaine, ecart: last.ecart, n: f.length, jours: ecartJours(f[0].date, last.date) };
}
