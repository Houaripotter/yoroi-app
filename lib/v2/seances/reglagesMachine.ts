/**
 * Reglage de la machine ou de la poulie (30 octobre 2026, retour de Houari : « a la poulie, je m'y suis repris
 * 3 fois pour trouver le bon cran »). Le cran note pendant la seance est garde par exercice, sur ce telephone
 * seulement, et propose a la seance suivante (« Dernière fois : cran 17 »).
 * Cle d'un exercice : son nom sans la prise (meme machine, meme reglage).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { besoinDe } from '@/lib/v2/programmes/materiel';
import { MACHINES } from '@/lib/v2/seance/machines';
import { sansPrise } from '@/lib/v2/seance/prise';

export const CLE_REGLAGES_MACHINE = 'yoroi_reglages_machine_v1';
export const CRAN_MIN = 1;
export const CRAN_MAX = 40;

export type Reglages = Record<string, number>;

export const cleExo = (nom: string): string => sansPrise(nom ?? '').base.trim().toLowerCase();

/** Un cran entre 1 et 40, ou null (champ vide, valeur folle) */
export function borneCran(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= CRAN_MIN && r <= CRAN_MAX ? r : null;
}

function nettoyer(x: unknown): Reglages {
  const out: Reglages = {};
  if (!x || typeof x !== 'object') return out;
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    const c = borneCran(v);
    if (k && c !== null) out[k] = c;
  }
  return out;
}

export async function chargerReglages(): Promise<Reglages> {
  try {
    const raw = await AsyncStorage.getItem(CLE_REGLAGES_MACHINE);
    return raw ? nettoyer(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** Le cran de la derniere fois pour cet exercice, ou null */
export function cranDe(r: Reglages, nom: string): number | null {
  return r[cleExo(nom)] ?? null;
}

/** Ajoute, change ou retire (null) le cran d'un exercice, sans toucher aux autres */
export function avecCran(r: Reglages, nom: string, cran: number | null): Reglages {
  const k = cleExo(nom);
  const suite = { ...r };
  const c = borneCran(cran);
  if (!k) return suite;
  if (c === null) delete suite[k];
  else suite[k] = c;
  return suite;
}

// les ecritures passent l'une apres l'autre : deux appuis rapides ne s'ecrasent pas
let file: Promise<unknown> = Promise.resolve();
export function enregistrerCran(nom: string, cran: number | null): Promise<Reglages> {
  const suite = file.then(async () => {
    const r = avecCran(await chargerReglages(), nom, cran);
    try {
      await AsyncStorage.setItem(CLE_REGLAGES_MACHINE, JSON.stringify(r));
    } catch {
      // rien a faire : le cran reste affiche pour cette seance
    }
    return r;
  });
  file = suite.catch(() => {});
  return suite;
}

const MACHINE_DANS_LE_NOM = /machine|poulie|cable|câble|presse|pec deck|butterfly|smith|leg curl|leg extension|hack squat|pulldown|seated row/i;

/**
 * Faut il montrer le champ Reglage ? « ouvert » : exercice a la poulie ou a la machine (materiel de sa fiche,
 * catalogue des machines, ou nom explicite) ; « replie » : rien ne permet de savoir, le champ s'ouvre d'un appui ;
 * « aucun » : exercice connu qui ne se fait pas sur une machine reglable (haltères, barre, poids du corps).
 */
export function typeReglage(nom: string): 'ouvert' | 'replie' | 'aucun' {
  const base = sansPrise(nom ?? '').base;
  const besoin = besoinDe(base);
  const machine = (c: string[]) => c.includes('poulie') || c.includes('machines');
  if (besoin) {
    if (besoin[0] && machine(besoin[0])) return 'ouvert';
    if (besoin.some(machine)) return 'replie';
    return 'aucun';
  }
  if (MACHINES.some((m) => m.exercices.includes(base))) return 'ouvert';
  if (MACHINE_DANS_LE_NOM.test(base)) return 'ouvert';
  return 'replie';
}
