/**
 * Questionnaire de forme du matin (1er novembre 2026, demande AU, point 3), facon Hooper.
 * 30 secondes, 5 curseurs de 1 a 7 : sommeil ressenti, fatigue, courbatures, stress, motivation.
 * Sur chaque curseur, 1 = au mieux (tres bien dormi, aucune fatigue, aucune courbature, aucun stress, tres motive)
 * et 7 = au plus mal : c'est l'echelle du questionnaire d'origine (1 = tres, tres bien ; 7 = tres, tres mal).
 *
 * Indice de Hooper : somme des 4 items d'origine (sommeil, fatigue, stress, courbatures), de 4 a 28 ; plus il est
 * bas, mieux tu vas. La motivation est un 5e item ajoute par YOROI, hors indice.
 *   Source : Hooper SL, Mackinnon LT. Monitoring overtraining in athletes: recommendations. Sports Medicine
 *   1995;20(5):321-327.
 * Score de forme du jour (0 a 100, plus haut = mieux) : les 5 curseurs ramenes sur 100, (35 - total) / 30 x 100.
 *   C'est une mise a l'echelle de YOROI, pas un score publie.
 * Jamais impose : « Pas aujourd'hui » le cache jusqu'au lendemain. Cle yoroi_forme_matin_v1, une entree par jour.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jourLocal, lireListe, modifierListe, remplacerParId } from './listeStockee';

export const CLE_FORME_MATIN = 'yoroi_forme_matin_v1';
/** Le jour ou tu as repondu « Pas aujourd'hui » (local a ce telephone, non synchronise) */
export const CLE_FORME_PAS_AUJOURDHUI = 'yoroi_forme_matin_pas_aujourdhui';

export type ItemForme = 'sommeil' | 'fatigue' | 'courbatures' | 'stress' | 'motivation';
export const ITEMS_FORME: ItemForme[] = ['sommeil', 'fatigue', 'courbatures', 'stress', 'motivation'];
export const ITEMS_HOOPER: ItemForme[] = ['sommeil', 'fatigue', 'courbatures', 'stress'];

export type FormeMatin = { id: string; date: string } & Record<ItemForme, number> & { creeLe: string };

const ok = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 7;

export function estFormeMatin(x: unknown): x is FormeMatin {
  const f = x as FormeMatin;
  return !!f && typeof f === 'object' && typeof f.id === 'string' && typeof f.date === 'string' && ITEMS_FORME.every((k) => ok(f[k]));
}

export function creerForme(date: string, v: Partial<Record<ItemForme, number>>, maintenant: Date = new Date()): FormeMatin | null {
  const jour = String(date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour) || !ITEMS_FORME.every((k) => ok(v[k]))) return null;
  return { id: `fm_${jour}`, date: jour, sommeil: v.sommeil!, fatigue: v.fatigue!, courbatures: v.courbatures!, stress: v.stress!, motivation: v.motivation!, creeLe: maintenant.toISOString() };
}

/** Indice de Hooper (4 a 28, plus bas = mieux) */
export function indiceHooper(f: Pick<FormeMatin, ItemForme>): number {
  return ITEMS_HOOPER.reduce((s, k) => s + f[k], 0);
}

/** Score de forme du jour, 0 a 100 (plus haut = mieux) */
export function scoreForme(f: Pick<FormeMatin, ItemForme>): number {
  const total = ITEMS_FORME.reduce((s, k) => s + f[k], 0);
  return Math.round(((35 - total) / 30) * 100);
}

export type ToneForme = 'bien' | 'moyen' | 'bas';
/** Trois tons pour la couleur et la phrase : 70 et plus, 40 a 69, moins de 40 */
export function toneForme(score: number): ToneForme {
  return score >= 70 ? 'bien' : score >= 40 ? 'moyen' : 'bas';
}

/** Les 28 derniers jours (date et score), dans l'ordre */
export function courbeForme(liste: FormeMatin[], aujourdhui: string = jourLocal()): { date: string; value: number }[] {
  const d = new Date(`${aujourdhui}T12:00:00`);
  d.setDate(d.getDate() - 27);
  const debut = jourLocal(d);
  return liste
    .filter((f) => f.date >= debut && f.date <= aujourdhui)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((f) => ({ date: f.date, value: scoreForme(f) }));
}

/** Proposer le questionnaire : pas encore repondu aujourd'hui, pas de « Pas aujourd'hui » aujourd'hui */
export function aProposer(liste: FormeMatin[], pasAujourdhui: string | null, aujourdhui: string = jourLocal()): boolean {
  return pasAujourdhui !== aujourdhui && !liste.some((f) => f.date === aujourdhui);
}

export async function lireFormes(): Promise<FormeMatin[]> {
  return lireListe(CLE_FORME_MATIN, estFormeMatin);
}

export async function enregistrerForme(f: FormeMatin): Promise<boolean> {
  return modifierListe<FormeMatin>(CLE_FORME_MATIN, (avant) => remplacerParId(avant.filter(estFormeMatin), [f]));
}

export async function lirePasAujourdhui(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CLE_FORME_PAS_AUJOURDHUI);
  } catch {
    return null;
  }
}

export async function pasAujourdhui(): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_FORME_PAS_AUJOURDHUI, jourLocal());
  } catch { /* reproposee demain */ }
}
