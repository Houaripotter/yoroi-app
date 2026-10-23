/**
 * Changer ton objectif de poids (18 octobre 2026, Houari : « pouvoir changer facilement la date de début, le poids
 * objectif et la date du cap »). Aucun nouveau stockage : chaque valeur va la ou elle vivait deja.
 *  - debut (date et poids) : le profil, start_date et start_weight (lib/v2/pesee/debutObjectif.ts) ;
 *  - poids objectif : le profil, target_weight, et son sens weight_goal (perte ou prise de masse) ;
 *  - date du cap : la date du torii gardee dans le telephone (yoroi_torii_v1, lib/v2/pesee/usePlanPoids.ts),
 *    marquee « choisie » pour ne plus bouger toute seule.
 * Chaque changement previent tout ce qui lit ton plan (courbes, torii, montre, widgets, bilan, predictions) : tout
 * se recalcule aussitot. Les garde-fous sont dans lib/v2/pesee/etatObjectif.ts (testes).
 */
import { getProfile, saveProfile } from '@/lib/database';
import { annoncerDebut, changerDebutObjectif } from './debutObjectif';
import { choisirDateCap } from './usePlanPoids';
import { sensPourObjectif, validerDateCap, validerDebut, validerObjectif } from './etatObjectif';
import { traduire } from '@/lib/i18n/tr';

type PeseeJour = { date: string; value: number; trend?: number };

export type Resultat = { ok: true } | { ok: false; raison: string };

/** Le debut de ton objectif : la date (jamais dans le futur) et ton poids ce jour-la */
export async function enregistrerDebut(date: string, poids: number | null, series: PeseeJour[], today: string): Promise<Resultat> {
  const r = validerDebut(date, poids, today);
  if (r) return { ok: false, raison: r };
  const n = await changerDebutObjectif(date, series, today, poids);
  return n ? { ok: true } : { ok: false, raison: traduire('Ton profil n’a pas pu être enregistré.') };
}

/** Ton poids objectif (different de ton poids actuel) ; le sens suit : au-dessus de ton debut, prise de masse */
export async function enregistrerObjectif(poids: number, actuel: number | null, debut: number | null): Promise<Resultat> {
  const r = validerObjectif(poids, actuel);
  if (r) return { ok: false, raison: r };
  const profil = await getProfile();
  if (!profil) return { ok: false, raison: traduire('Ton profil n’a pas pu être lu.') };
  const cap = Math.round(poids * 10) / 10;
  await saveProfile({ ...profil, target_weight: cap, weight_goal: sensPourObjectif(cap, debut ?? profil.start_weight ?? actuel) });
  annoncerDebut();
  return { ok: true };
}

/** Ta date du cap (apres aujourd'hui) */
export async function enregistrerDateCap(date: string, cle: string | null, today: string): Promise<Resultat> {
  const r = validerDateCap(date, today);
  if (r) return { ok: false, raison: r };
  const ok = await choisirDateCap(date, cle, today);
  return ok ? { ok: true } : { ok: false, raison: traduire('Ta date n’a pas pu être enregistrée.') };
}
