/**
 * Supersets gardes dans le programme (31 octobre 2026, Houari : « crunch puis roue abdominale, je veux pouvoir
 * l'ajouter »). En seance, « Toujours dans ce programme » garde ici l'exercice ajoute au bloc et son lien ; la
 * seance suivante du meme jour du programme le retrouve (app/seance/muscu.tsx, appliquerEnchainements).
 *
 * Pourquoi a part, et pas dans les exercices du programme : le bloc abdos de fin de seance est calcule a chaque
 * lecture (finSeance.ts, avecFinSeance) et n'ajoute rien si le jour a deja un exercice d'abdos. Ecrire la roue
 * abdominale dans le jour supprimerait donc la planche et le crunch. Ici, rien ne touche aux cases du programme
 * (les remplacements par case gardent leur index) : l'ajout se pose apres son exercice d'ancrage, a la lecture.
 *
 * Cle : « programme|jour ». Pour chaque jour : les exercices ajoutes (apres quel exercice) et les exercices lies
 * au suivant. Ancre absente (exercice remplace, jour change) : l'ajout ne s'applique pas, il n'est pas perdu.
 * Partage avec tes appareils appaires (lib/v2/synchro/cles.ts, un jour a la fois).
 * Donnees pures plus lecture et ecriture, testees dans __tests__/unit/superset.test.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signalerASynchroniser } from '@/lib/v2/synchro/cles';
import type { ExoProgramme } from './types';

export const CLE_ENCHAINEMENTS = 'yoroi_enchainements_v1';
export const MAX_AJOUTS_PAR_JOUR = 6;

export type AjoutBloc = { apres: string; exo: ExoProgramme };
export type BlocJour = { ajouts: AjoutBloc[]; lies: string[] };
export type Enchainements = Record<string, BlocJour>;

export const cleJour = (programme: string, jour: string): string => `${programme}|${jour}`;

const texte = (v: unknown, max = 120): string | null => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);
const borne = (n: unknown, min: number, max: number, defaut: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : defaut;
};

function lireExo(x: unknown): ExoProgramme | null {
  if (!x || typeof x !== 'object') return null;
  const e = x as Partial<ExoProgramme>;
  const nom = texte(e.nom);
  if (!nom) return null;
  const repsMin = borne(e.repsMin, 1, 100, 10);
  return {
    nom,
    muscle: typeof e.muscle === 'string' ? e.muscle.slice(0, 40) : '',
    series: borne(e.series, 1, 10, 3),
    repsMin,
    repsMax: Math.max(repsMin, borne(e.repsMax, 1, 100, 15)),
    reposSec: borne(e.reposSec, 15, 600, 60),
    ...(e.secondes ? { secondes: true } : {}),
    ...(e.poidsDuCorps ? { poidsDuCorps: true } : {}),
  };
}

/** Lecture tolerante : une entree abimee est ecartee, jamais tout */
export function nettoyerEnchainements(x: unknown): Enchainements {
  const out: Enchainements = {};
  if (!x || typeof x !== 'object' || Array.isArray(x)) return out;
  for (const [k, v] of Object.entries(x as Record<string, unknown>).slice(0, 200)) {
    if (!k || k.length > 240 || !k.includes('|') || !v || typeof v !== 'object') continue;
    const b = v as Partial<BlocJour>;
    const vus = new Set<string>();
    const ajouts = (Array.isArray(b.ajouts) ? b.ajouts : [])
      .map((a) => {
        const apres = texte(a?.apres);
        const exo = lireExo(a?.exo);
        if (!apres || !exo || vus.has(exo.nom)) return null;
        vus.add(exo.nom);
        return { apres, exo };
      })
      .filter((a): a is AjoutBloc => !!a)
      .slice(0, MAX_AJOUTS_PAR_JOUR);
    const lies = Array.from(new Set((Array.isArray(b.lies) ? b.lies : []).map((n) => texte(n)).filter((n): n is string => !!n))).slice(0, 20);
    if (ajouts.length || lies.length) out[k] = { ajouts, lies };
  }
  return out;
}

/**
 * Le jour avec ses ajouts poses apres leur ancre (dans l'ordre ou ils ont ete ajoutes) et ses liens.
 * Un ajout deja present dans le jour n'est pas ajoute deux fois ; le dernier exercice n'est jamais lie.
 */
export function appliquerEnchainements<E extends ExoProgramme>(exos: readonly E[], bloc: BlocJour | null | undefined): (E & { ajoutBloc?: true })[] {
  const liste: (E & { ajoutBloc?: true })[] = exos.map((e) => ({ ...e }));
  if (!bloc) return liste;
  const lies = new Set(bloc.lies);
  for (const a of bloc.ajouts) {
    if (liste.some((e) => e.nom === a.exo.nom)) continue;
    const i = liste.findIndex((e) => e.nom === a.apres);
    if (i < 0) continue;
    // l'ajout va a la fin du groupe de son ancre
    let fin = i;
    while (fin < liste.length - 1 && liste[fin].enchaine) fin++;
    liste[fin] = { ...liste[fin], enchaine: true };
    liste.splice(fin + 1, 0, { ...(a.exo as E), ajoutBloc: true });
  }
  return liste.map((e, i) => {
    const lie = (e.enchaine || lies.has(e.nom)) && i < liste.length - 1;
    const { enchaine: _e, ...reste } = e;
    return (lie ? { ...reste, enchaine: true } : reste) as E & { ajoutBloc?: true };
  });
}

/** Ajoute l'exercice apres `apres` dans le bloc de ce jour (un ajout du meme nom est remplace) */
export function avecAjout(t: Enchainements, cle: string, apres: string, exo: ExoProgramme): Enchainements {
  const b = t[cle] ?? { ajouts: [], lies: [] };
  const ajouts = [...b.ajouts.filter((a) => a.exo.nom !== exo.nom), { apres, exo }].slice(-MAX_AJOUTS_PAR_JOUR);
  return { ...t, [cle]: { ajouts, lies: b.lies } };
}

/** Lie (ou delie) un exercice du programme au suivant, pour ce jour */
export function avecLien(t: Enchainements, cle: string, nom: string, lie: boolean): Enchainements {
  const b = t[cle] ?? { ajouts: [], lies: [] };
  const lies = lie ? Array.from(new Set([...b.lies, nom])) : b.lies.filter((n) => n !== nom);
  return nettoyerEnchainements({ ...t, [cle]: { ajouts: b.ajouts, lies } });
}

/** Retire un exercice du bloc de ce jour : son ajout, son lien, et le lien de l'exercice qui menait a lui */
export function sansExoDuBloc(t: Enchainements, cle: string, nom: string, avant?: string | null): Enchainements {
  const b = t[cle];
  if (!b) return t;
  const ajouts = b.ajouts.filter((a) => a.exo.nom !== nom).map((a) => (a.apres === nom && avant ? { ...a, apres: avant } : a));
  const lies = b.lies.filter((n) => n !== nom && n !== avant);
  const suite = { ...t };
  if (ajouts.length || lies.length) suite[cle] = { ajouts, lies };
  else delete suite[cle];
  return suite;
}

/* ---------------------------------- stockage ---------------------------------- */

let memoire: Enchainements = {};

export async function chargerEnchainements(): Promise<Enchainements> {
  try {
    const raw = await AsyncStorage.getItem(CLE_ENCHAINEMENTS);
    memoire = raw ? nettoyerEnchainements(JSON.parse(raw)) : {};
  } catch {
    // illisible : on garde ce qu'on avait
  }
  return memoire;
}

/** Le bloc de ce jour du programme, deja lu (vide tant que rien n'est lu) */
export function blocDuJour(t: Enchainements, programme: string | null | undefined, jour: string | null | undefined): BlocJour | null {
  if (!programme || !jour) return null;
  return t[cleJour(programme, jour)] ?? null;
}

let file: Promise<unknown> = Promise.resolve();
export function modifierEnchainements(changer: (t: Enchainements) => Enchainements): Promise<Enchainements> {
  const suite = file.then(async () => {
    // relu juste avant d'ecrire : un ecrit d'un autre appareil n'est pas ecrase
    const t = nettoyerEnchainements(changer(await chargerEnchainements()));
    memoire = t;
    try {
      await AsyncStorage.setItem(CLE_ENCHAINEMENTS, JSON.stringify(t));
      signalerASynchroniser();
    } catch {
      // rien a faire : le superset vaut pour cette seance
    }
    return t;
  });
  file = suite.catch(() => {});
  return suite;
}
