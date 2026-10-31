/**
 * Tes machines (31 octobre 2026, Houari : « dans ma salle au Mali, mollets assis c'est une machine où on est
 * debout, avec peut-être un autre nom »). Une machine qui n'est pas dans la base s'ajoute depuis « Changer
 * d'exercice » : un nom libre et le muscle cible. Elle devient un exercice a toi, que l'on retrouve dans la
 * recherche et parmi les equivalents de son muscle, avec son historique, ses records et son cran comme les autres
 * (le nom sert de cle, comme pour tout exercice). Partagee avec tes appareils appaires (lib/v2/synchro/cles.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signalerASynchroniser } from '@/lib/v2/synchro/cles';

export const CLE_MACHINES_PERSO = 'yoroi_machines_perso_v1';
export const MAX_MACHINES_PERSO = 60;
export const LONGUEUR_NOM_MACHINE = 50;

export type MachinePerso = { nom: string; muscle: string; le: string };

const plier = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Le nom tape, propre : espaces en trop retires, premiere lettre en capitale, 50 caracteres au plus */
export function nomMachinePropre(nom: string): string {
  const n = String(nom ?? '').replace(/\s+/g, ' ').trim().slice(0, LONGUEUR_NOM_MACHINE).trim();
  return n ? n.charAt(0).toLocaleUpperCase('fr') + n.slice(1) : '';
}

export function nettoyerMachines(x: unknown): MachinePerso[] {
  if (!Array.isArray(x)) return [];
  const vus = new Set<string>();
  const out: MachinePerso[] = [];
  for (const m of x) {
    if (!m || typeof m !== 'object') continue;
    const nom = nomMachinePropre(typeof m.nom === 'string' ? m.nom : '');
    const muscle = typeof m.muscle === 'string' ? m.muscle.trim().slice(0, 30) : '';
    if (!nom || !muscle || vus.has(plier(nom))) continue;
    vus.add(plier(nom));
    out.push({ nom, muscle, le: typeof m.le === 'string' ? m.le.slice(0, 10) : '' });
  }
  return out.slice(-MAX_MACHINES_PERSO);
}

/** Ajoute la machine, ou change son muscle si elle existe deja (meme nom, sans accents ni majuscules) */
export function avecMachine(liste: readonly MachinePerso[], nom: string, muscle: string, le: string): MachinePerso[] {
  const n = nomMachinePropre(nom);
  if (!n || !muscle) return [...liste];
  return nettoyerMachines([...liste.filter((m) => plier(m.nom) !== plier(n)), { nom: n, muscle, le }]);
}

export function sansMachine(liste: readonly MachinePerso[], nom: string): MachinePerso[] {
  return liste.filter((m) => plier(m.nom) !== plier(nom));
}

/** La machine de ce nom, si c'est une des tiennes */
export function machineDe(liste: readonly MachinePerso[], nom: string): MachinePerso | undefined {
  const k = plier(nom);
  return liste.find((m) => plier(m.nom) === k);
}

let memoire: MachinePerso[] = [];

export async function chargerMachinesPerso(): Promise<MachinePerso[]> {
  try {
    const raw = await AsyncStorage.getItem(CLE_MACHINES_PERSO);
    memoire = raw ? nettoyerMachines(JSON.parse(raw)) : [];
  } catch {
    // illisible : on garde ce qu'on avait
  }
  return memoire;
}

/** Tes machines deja lues (vide tant que rien n'est lu) */
export const machinesEnMemoire = (): MachinePerso[] => memoire;

let file: Promise<unknown> = Promise.resolve();
export function ajouterMachinePerso(nom: string, muscle: string, maintenant = new Date()): Promise<MachinePerso[]> {
  const suite = file.then(async () => {
    const l = avecMachine(await chargerMachinesPerso(), nom, muscle, maintenant.toISOString().slice(0, 10));
    memoire = l;
    try {
      await AsyncStorage.setItem(CLE_MACHINES_PERSO, JSON.stringify(l));
      signalerASynchroniser();
    } catch {
      // rien a faire : la machine reste en memoire pour cette ouverture de l'app
    }
    return l;
  });
  file = suite.catch(() => {});
  return suite;
}
