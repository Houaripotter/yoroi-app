/**
 * Ton programme a ta facon (26 octobre 2026) : sur la page du programme en cours, « Changer » remplace un
 * exercice par celui que tu choisis. Le choix est garde dans le programme en cours (suivi.ts, `remplacements`)
 * et applique partout ou le jour du programme sert : la page, la seance en direct, la seance express.
 * Series, repetitions et repos restent ceux de la case du programme. Ton choix passe en dernier :
 * il gagne sur les remplacements automatiques du materiel et des douleurs.
 * Donnees pures, testees dans __tests__/unit/perso.test.ts.
 */
import type { ExoProgramme, JourProgramme } from './types';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { protegerJour } from './blessures';
import type { ExoProtege, Region } from './blessures';
import type { Equipement, MachinesSalle } from './materiel';
import { completerContexte, contexteFinPour } from './finSeance';
import type { ContexteFin } from './finSeance';
import { avecModules } from './modules';
import type { AvecModules, ExoModule } from './modules';

/** Cle d'une case du programme : « jourId|index » (index de l'exercice dans le jour du catalogue) */
export const cleCase = (jourId: string, index: number): string => `${jourId}|${index}`;

export type Remplacements = Record<string, string>;

export type ExoPerso = {
  /** nom de l'exercice qui etait dans cette case avant ton choix */
  perso?: string;
};

/** Ajoute, change ou retire (nom vide ou identique a l'original) un remplacement, sans toucher aux autres */
export function avecRemplacement(r: Remplacements | undefined, cle: string, nom: string | null, original?: string): Remplacements {
  const suite: Remplacements = { ...(r ?? {}) };
  const n = (nom ?? '').trim();
  if (!n || (original && n === original)) delete suite[cle];
  else suite[cle] = n;
  return suite;
}

/**
 * Le jour avec tes remplacements. `jour` peut deja etre adapte (materiel, douleurs) : ses exercices gardent
 * l'ordre du catalogue, la case garde donc son index. L'exercice choisi prend la place, avec les memes series,
 * repetitions et repos ; les marques de remplacement automatique tombent (c'est toi qui as choisi).
 */
export function appliquerRemplacements<E extends ExoProgramme, J extends Omit<JourProgramme, 'exos'> & { exos: E[] }>(
  jour: J,
  remplacements: Remplacements | undefined | null,
  muscleDe?: (nom: string) => string | undefined,
): Omit<J, 'exos'> & { exos: (E & ExoPerso)[] } {
  if (!remplacements || !Object.keys(remplacements).length) return jour;
  let change = false;
  const exos = jour.exos.map((e, i) => {
    const nom = remplacements[cleCase(jour.id, i)];
    if (!nom || nom === e.nom) return e;
    change = true;
    const { remplace: _r, impossible: _i, zone: _z, conseil: _c, ...reste } = e as E & { remplace?: string; impossible?: boolean; zone?: string };
    const original = (e as { remplace?: string }).remplace ?? e.nom;
    return { ...(reste as E), nom, muscle: muscleDe?.(nom) ?? e.muscle, poidsDuCorps: undefined, perso: original } as E & ExoPerso;
  });
  return change ? { ...jour, exos } : jour;
}

/** Combien de cases tu as changees dans ce programme */
export function nombreRemplacements(remplacements: Remplacements | undefined | null, jourIds: string[]): number {
  if (!remplacements) return 0;
  return Object.keys(remplacements).filter((k) => jourIds.includes(k.split('|')[0])).length;
}

/* ------------------------------------------------------------------------------------------------
 * Le jour tel que tu le fais : ta fin de seance (abdos, cardio), ton materiel et ta salle, tes douleurs
 * declarees, puis tes choix. Un seul calcul pour la page du programme, la seance en direct et la seance express.
 * `fin` : undefined, la fin de seance et les modules du programme actif si le jour en fait partie (finSeance.ts) ;
 * null, aucune ; sinon celle donnee (sans `modules`, ceux du programme actif s'y ajoutent, lib/v2/programmes/modules.ts).
 * ---------------------------------------------------------------------------------------------- */

const muscleBiblio = (nom: string): string | undefined => EXERCISE_LIBRARY.find((e) => e.name === nom)?.muscle;

export function jourPourToi<J extends JourProgramme>(
  jour: J,
  dispo: readonly Equipement[] | null,
  regions: readonly Region[],
  machines?: MachinesSalle,
  remplacements?: Remplacements | null,
  fin?: ContexteFin | null,
): Omit<J, 'exos'> & AvecModules & { exos: (ExoProtege & ExoPerso & ExoModule)[] } {
  // les exercices ajoutes (abdo, grip, cou) passent ensuite par le materiel et les douleurs, comme les autres
  const complet = avecModules(jour, fin === undefined ? contexteFinPour(jour) : completerContexte(jour, fin));
  const protege = protegerJour(complet, dispo, regions, machines) as Omit<J, 'exos'> & AvecModules & { id: string; exos: ExoProtege[] };
  return appliquerRemplacements(protege, remplacements, muscleBiblio) as Omit<J, 'exos'> & AvecModules & { exos: (ExoProtege & ExoPerso & ExoModule)[] };
}
