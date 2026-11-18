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
/**
 * 18 novembre 2026 (Houari : « c'est surtout les exercices, il faut tout ») : 500 machines au lieu de 60. Rien
 * n'imposait 60 : 500 machines font environ 50 Ko, bien sous la limite de 2 Mo par cle de la sauvegarde
 * (lib/v2/sauvegarde/tailleStockage.ts) ; la synchro entre appareils fusionne par nom (lib/v2/synchro/cles.ts) ; les
 * recherches s'arretent a 30 resultats (changerExo.ts). La borne reste pour proteger le stockage d'un import fou.
 */
export const MAX_MACHINES_PERSO = 500;
/** 18 novembre 2026 : 80 caracteres (50 avant) : un nom venu d'une autre app n'est pas coupe */
export const LONGUEUR_NOM_MACHINE = 80;

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
    // 18 novembre 2026 : le nom tel qu'enregistre (une machine importee garde sa casse), borne a 80 caracteres
    const nom = String(typeof m.nom === 'string' ? m.nom : '').replace(/\s+/g, ' ').trim().slice(0, LONGUEUR_NOM_MACHINE).trim();
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

/** 18 novembre 2026 : l'index par nom d'une liste (calcule une fois par liste : des centaines de machines restent rapides) */
const index = new WeakMap<readonly MachinePerso[], Map<string, MachinePerso>>();
function indexDe(liste: readonly MachinePerso[]): Map<string, MachinePerso> {
  let m = index.get(liste);
  if (!m) {
    m = new Map();
    for (const x of liste) if (!m.has(plier(x.nom))) m.set(plier(x.nom), x);
    index.set(liste, m);
  }
  return m;
}

/** La machine de ce nom, si c'est une des tiennes */
export function machineDe(liste: readonly MachinePerso[], nom: string): MachinePerso | undefined {
  return indexDe(liste).get(plier(nom));
}

/**
 * 18 novembre 2026 : plusieurs machines d'un coup (reprise d'une autre app, liste collee), en une seule ecriture.
 * Le nom est garde tel quel (espaces en trop retires, 80 caracteres au plus) : jamais renomme. Une machine deja la
 * garde son muscle ; au dela de la place qui reste, rien n'est ajoute (tes machines d'avant ne partent jamais).
 */
export function avecMachines(liste: readonly MachinePerso[], nouvelles: readonly { nom: string; muscle: string | null }[], le: string): { liste: MachinePerso[]; ajoutees: string[]; deja: string[]; sansPlace: string[]; sansMuscle: string[] } {
  const vus = new Map(indexDe(liste));
  const out = [...liste];
  const ajoutees: string[] = [];
  const deja: string[] = [];
  const sansPlace: string[] = [];
  const sansMuscle: string[] = [];
  for (const n of nouvelles) {
    const nom = String(n.nom ?? '').replace(/\s+/g, ' ').trim().slice(0, LONGUEUR_NOM_MACHINE).trim();
    if (!nom) continue;
    if (vus.has(plier(nom))) {
      deja.push(nom);
      continue;
    }
    if (!n.muscle) {
      sansMuscle.push(nom);
      continue;
    }
    if (out.length >= MAX_MACHINES_PERSO) {
      sansPlace.push(nom);
      continue;
    }
    const m = { nom, muscle: n.muscle.trim().slice(0, 30), le };
    vus.set(plier(nom), m);
    out.push(m);
    ajoutees.push(nom);
  }
  return { liste: out, ajoutees, deja, sansPlace, sansMuscle };
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

/** 18 novembre 2026 : ajoute toute une liste en une ecriture (voir avecMachines) */
export function ajouterMachinesPerso(nouvelles: readonly { nom: string; muscle: string | null }[], maintenant = new Date()): Promise<ReturnType<typeof avecMachines>> {
  const suite = file.then(async () => {
    const r = avecMachines(await chargerMachinesPerso(), nouvelles, maintenant.toISOString().slice(0, 10));
    if (r.ajoutees.length) {
      await AsyncStorage.setItem(CLE_MACHINES_PERSO, JSON.stringify(r.liste));
      memoire = r.liste;
      signalerASynchroniser();
    }
    return r;
  });
  file = suite.catch(() => {});
  return suite;
}
