/**
 * Exercices ecartes (30 octobre 2026) : « Pas dans ma salle » ou « Ça me fait mal », choisis en remplacant
 * un exercice pendant la seance. Un exercice ecarte n'est plus propose : ni comme alternative, ni dans les
 * seances des programmes (lib/v2/programmes/perso.ts, jourPourToi). Partage avec tes appareils appaires (lib/v2/synchro/cles.ts) ;
 * Reglages, « Exercices écartés », le remet. « Machine occupée » n'ecarte rien : ca ne vaut que pour la seance.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signalerASynchroniser } from '@/lib/v2/synchro/cles';

export const CLE_EXERCICES_ECARTES = 'yoroi_exercices_ecartes_v1';

export type RaisonEcart = 'salle' | 'douleur';
export type Ecarte = { nom: string; raison: RaisonEcart; le: string };

export const LIBELLE_RAISON: Record<RaisonEcart, string> = {
  salle: 'Pas dans ma salle',
  douleur: 'Ça me fait mal',
};

function nettoyer(x: unknown): Ecarte[] {
  if (!Array.isArray(x)) return [];
  const vus = new Set<string>();
  const out: Ecarte[] = [];
  for (const e of x) {
    if (!e || typeof e !== 'object') continue;
    const nom = typeof e.nom === 'string' ? e.nom.trim() : '';
    const raison = e.raison === 'salle' || e.raison === 'douleur' ? e.raison : null;
    if (!nom || !raison || vus.has(nom)) continue;
    vus.add(nom);
    out.push({ nom, raison, le: typeof e.le === 'string' ? e.le : '' });
  }
  return out;
}

/** Ajoute (ou change la raison de) un exercice ecarte, sans doublon */
export function avecEcarte(liste: readonly Ecarte[], nom: string, raison: RaisonEcart, le: string): Ecarte[] {
  const n = nom.trim();
  if (!n) return [...liste];
  return [...liste.filter((e) => e.nom !== n), { nom: n, raison, le }];
}

export function sansEcarte(liste: readonly Ecarte[], nom: string): Ecarte[] {
  return liste.filter((e) => e.nom !== nom.trim());
}

export const nomsEcartes = (liste: readonly Ecarte[]): Set<string> => new Set(liste.map((e) => e.nom));

// copie en memoire : les seances des programmes (fonctions synchrones) la lisent sans attendre
let memoire: Ecarte[] = [];
let charge = false;

export async function chargerEcartes(): Promise<Ecarte[]> {
  try {
    const raw = await AsyncStorage.getItem(CLE_EXERCICES_ECARTES);
    memoire = raw ? nettoyer(JSON.parse(raw)) : [];
  } catch {
    // illisible : on garde ce qu'on avait
  }
  charge = true;
  return memoire;
}

/** Les noms ecartes deja lus (lecture lancee au premier appel, vide en attendant) */
export function ecartesEnMemoire(): Set<string> {
  if (!charge) {
    charge = true;
    void chargerEcartes();
  }
  return nomsEcartes(memoire);
}

let file: Promise<unknown> = Promise.resolve();
function ecrire(change: (l: Ecarte[]) => Ecarte[]): Promise<Ecarte[]> {
  const suite = file.then(async () => {
    const l = change(await chargerEcartes());
    memoire = l;
    try {
      await AsyncStorage.setItem(CLE_EXERCICES_ECARTES, JSON.stringify(l));
      signalerASynchroniser();
    } catch {
      // rien a faire : la liste reste en memoire pour cette ouverture de l'app
    }
    return l;
  });
  file = suite.catch(() => {});
  return suite;
}

export function ecarterExercice(nom: string, raison: RaisonEcart, maintenant = new Date()): Promise<Ecarte[]> {
  return ecrire((l) => avecEcarte(l, nom, raison, maintenant.toISOString().slice(0, 10)));
}

export function remettreExercice(nom: string): Promise<Ecarte[]> {
  return ecrire((l) => sansEcarte(l, nom));
}

/**
 * Liste du selecteur d'exercices : les exercices ecartes restent choisissables expres, mais passent en bas,
 * dans le meme ordre qu'avant entre eux.
 */
export function ecartesEnBas<T>(liste: readonly T[], estEcarte: (x: T) => boolean): T[] {
  const gardes: T[] = [];
  const bas: T[] = [];
  for (const x of liste) (estEcarte(x) ? bas : gardes).push(x);
  return bas.length ? [...gardes, ...bas] : [...liste];
}

/** pour les tests : oublie la copie en memoire */
export function _oublierMemoire(): void {
  memoire = [];
  charge = false;
}
