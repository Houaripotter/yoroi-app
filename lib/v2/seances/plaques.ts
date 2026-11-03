/**
 * 3 novembre 2026 (demande de Houari) : « sur certaines machines, le poids n'est ecrit nulle part. Je compte les
 * plaques de la pile. » La charge d'un exercice se note en kilos ou en plaques, au choix, exercice par exercice.
 *
 * Rangement, sans rien changer a la base :
 * - la serie garde son nombre de plaques dans le champ `plaques` de setsData (colonne exercises, du JSON) ;
 *   son `weight` reste en kilos : 0 tant que tu n'as pas dit combien pese une plaque, sinon plaques x kilos.
 *   Les kilos soulevés, le tonnage et les records en kilos ne voient donc jamais une plaque comme un kilo.
 * - l'exercice note `unite_charge: 'plaques'` (et `kg_par_plaque` si tu l'as donne) dans le meme JSON.
 * - ton choix par exercice est garde dans AsyncStorage (yoroi_unite_charge_v1), partage avec tes appareils
 *   appaires (lib/v2/synchro/cles.ts), comme le cran de la machine.
 * Rien d'invente : sans poids de plaque donne par toi, aucune conversion en kilos.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signalerASynchroniser } from '@/lib/v2/synchro/cles';
import { sansPrise } from '@/lib/v2/seance/prise';
import { nomBibliotheque, nomFr } from '@/lib/v2/seance/rechercheExo';
import { borneKgParPlaque, type ModePlaques } from './plaquesSerie';

export * from './plaquesSerie';

export const CLE_UNITE_CHARGE = 'yoroi_unite_charge_v1';

/** Le choix garde pour un exercice : kilos (choix explicite, pour que le retour aux kilos se synchronise) ou plaques */
export type ChoixUnite = { u: 'kg' } | { u: 'plaques'; kg?: number };
export type UnitesCharge = Record<string, ChoixUnite>;

function nettoyer(x: unknown): UnitesCharge {
  const out: UnitesCharge = {};
  if (!x || typeof x !== 'object') return out;
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (!k || !v || typeof v !== 'object') continue;
    const o = v as { u?: unknown; kg?: unknown };
    if (o.u === 'kg') out[k] = { u: 'kg' };
    else if (o.u === 'plaques') {
      const kg = borneKgParPlaque(o.kg);
      out[k] = kg !== null ? { u: 'plaques', kg } : { u: 'plaques' };
    }
  }
  return out;
}

/** Cle d'un exercice : son nom sans la prise, comme le cran (lib/v2/seances/reglagesMachine.ts) */
export const cleExo = (nom: string): string => sansPrise(nom ?? '').base.trim().toLowerCase();

export async function chargerUnites(): Promise<UnitesCharge> {
  try {
    const raw = await AsyncStorage.getItem(CLE_UNITE_CHARGE);
    return raw ? nettoyer(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** Le choix garde pour cet exercice (sous son nom, son nom de bibliotheque ou son nom francais), ou null */
export function choixDe(u: UnitesCharge, nom: string): ChoixUnite | null {
  if (!nom) return null;
  return u[cleExo(nom)] ?? u[cleExo(nomBibliotheque(nom))] ?? u[cleExo(nomFr(nom))] ?? null;
}

/** Le mode a l'ouverture d'un exercice : ton choix garde, sinon les plaques si ta derniere fois etait en plaques */
export function modeOuverture(u: UnitesCharge, nom: string, derniereFoisEnPlaques: boolean): ModePlaques | null {
  const c = choixDe(u, nom);
  if (c) return c.u === 'plaques' ? { kgParPlaque: c.kg ?? null } : null;
  return derniereFoisEnPlaques ? { kgParPlaque: null } : null;
}

/** Ajoute ou change le choix d'un exercice, sans toucher aux autres */
export function avecChoix(u: UnitesCharge, nom: string, mode: ModePlaques | null): UnitesCharge {
  const k = cleExo(nom);
  if (!k) return { ...u };
  const kg = mode ? borneKgParPlaque(mode.kgParPlaque) : null;
  return { ...u, [k]: mode ? (kg !== null ? { u: 'plaques', kg } : { u: 'plaques' }) : { u: 'kg' } };
}

// les ecritures passent l'une apres l'autre : deux appuis rapides ne s'ecrasent pas
let file: Promise<unknown> = Promise.resolve();
export function enregistrerUnite(nom: string, mode: ModePlaques | null): Promise<UnitesCharge> {
  const suite = file.then(async () => {
    const u = avecChoix(await chargerUnites(), nom, mode);
    try {
      await AsyncStorage.setItem(CLE_UNITE_CHARGE, JSON.stringify(u));
      signalerASynchroniser();
    } catch {
      // rien a faire : le choix reste affiche pour cette seance
    }
    return u;
  });
  file = suite.catch(() => {});
  return suite;
}
