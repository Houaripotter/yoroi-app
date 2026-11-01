/**
 * Perte d'eau sur une seance (1er novembre 2026, demande AT, point 5) : poids avant moins poids apres, plus l'eau
 * bue pendant si tu l'as notee. En kg et en % du poids d'avant. Fonctions pures, testees.
 *
 * Repere : au-dela de 2 % du poids perdus, conseiller de se rehydrater (environ 1,5 L par kg perdu).
 *   Source : American College of Sports Medicine, Sawka MN et al. Exercise and fluid replacement, position stand.
 *   Medicine & Science in Sports & Exercise 2007;39(2):377-390 (eviter de perdre plus de 2 % du poids en eau ;
 *   apres l'effort, boire environ 1,5 L par kg perdu).
 */
import type { ContextePesee } from './contextePesee';

export const SEUIL_PERTE_PCT = 2;
export const LITRES_PAR_KG = 1.5;

export type PerteEau = { avant: number; apres: number; eauBueL: number; perteKg: number; pct: number; aRehydrater: boolean; aBoireL: number };

const r1 = (x: number) => Math.round(x * 10 + 1e-9) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** undefined si un poids manque ou si l'ecart n'est pas plausible (plus de 10 % : faute de frappe) */
export function perteEau(avant?: number | null, apres?: number | null, eauBueL?: number | null): PerteEau | undefined {
  if (!avant || !apres || avant <= 20 || apres <= 20) return undefined;
  const eau = eauBueL && eauBueL > 0 && eauBueL < 10 ? eauBueL : 0;
  const perteKg = r2(avant - apres + eau);
  if (Math.abs(perteKg) > avant * 0.1) return undefined;
  const pct = r1((perteKg / avant) * 100);
  return { avant, apres, eauBueL: eau, perteKg, pct, aRehydrater: pct > SEUIL_PERTE_PCT, aBoireL: perteKg > 0 ? r1(perteKg * LITRES_PAR_KG) : 0 };
}

const minutes = (h?: string | null) => {
  const m = /^(\d{2}):(\d{2})$/.exec(h ?? '');
  return m ? +m[1] * 60 + +m[2] : null;
};

/**
 * Les pesees avant et apres d'une seance : le meme jour, moment avant_seance et apres_seance.
 * Avec l'heure de debut : la derniere pesee avant faite au plus 30 min apres le debut, la premiere apres faite apres
 * le debut. Sans heure : la derniere de chaque.
 */
export function peseesDeSeance(
  liste: ContextePesee[],
  seance: { date: string; debut?: string | null },
): { avant?: ContextePesee; apres?: ContextePesee } {
  const jour = String(seance.date).slice(0, 10);
  const duJour = liste.filter((c) => c && c.date === jour && c.poids !== null && (c.moment === 'avant_seance' || c.moment === 'apres_seance'));
  const d = minutes(seance.debut ?? null);
  const tri = (l: ContextePesee[]) => [...l].sort((a, b) => (minutes(a.heure) ?? 0) - (minutes(b.heure) ?? 0));
  let av = tri(duJour.filter((c) => c.moment === 'avant_seance'));
  let ap = tri(duJour.filter((c) => c.moment === 'apres_seance'));
  if (d !== null) {
    const avOk = av.filter((c) => minutes(c.heure) === null || (minutes(c.heure) as number) <= d + 30);
    const apOk = ap.filter((c) => minutes(c.heure) === null || (minutes(c.heure) as number) >= d);
    if (avOk.length) av = avOk;
    if (apOk.length) ap = apOk;
    return { avant: av[av.length - 1], apres: ap[0] };
  }
  return { avant: av[av.length - 1], apres: ap[ap.length - 1] };
}

/** Une perte par jour ou il y a une pesee avant et une apres, la plus recente d'abord */
export function pertesRecentes(liste: ContextePesee[], max = 6): ({ date: string } & PerteEau)[] {
  const jours = Array.from(new Set(liste.filter((c) => c.moment === 'apres_seance').map((c) => c.date))).sort().reverse();
  const out: ({ date: string } & PerteEau)[] = [];
  for (const j of jours) {
    const { avant, apres } = peseesDeSeance(liste, { date: j });
    const p = perteEau(avant?.poids, apres?.poids, apres?.eauBueL);
    if (p) out.push({ date: j, ...p });
    if (out.length >= max) break;
  }
  return out;
}
