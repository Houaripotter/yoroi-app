/**
 * Reprise depuis Hevy (18 novembre 2026) : ce qui s'enregistre apres l'historique (enregistrerCarnet.ts).
 *  - tes exercices a toi deviennent tes machines (lib/v2/seances/machinesPerso.ts) : recherche, equivalents de leur
 *    muscle, seance en direct, records et courbes (le nom sert de cle, comme pour tout exercice) ;
 *  - ta routine devient un programme perso (monProgramme.ts), jamais a la place de ton programme en cours sans
 *    ton accord (remplacer, ou garder les deux) ; sans planning, tes seances vont dans Mes seances.
 * Tout reste sur le telephone. Les calculs sont dans repriseHevy.ts (pur, teste).
 */
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { ajouterMachinePerso, chargerMachinesPerso, machineDe, MAX_MACHINES_PERSO } from '@/lib/v2/seances/machinesPerso';
import { CLE_PROGRAMMES_PERSO, chargerProgrammesPerso, enregistrerProgrammePerso, modifierProgrammePerso, programmesVisibles } from '@/lib/v2/programmes/monProgramme';
import type { ProgrammePerso } from '@/lib/v2/programmes/monProgramme';
import { chargerProgrammeActif, enFileProgramme, suivreProgrammePerso } from '@/lib/v2/programmes/suivi';
import { chargerMesSeances, creerMaSeance, seanceIdentique } from '@/lib/v2/seance/mesSeances';
import { logger } from '@/lib/security/logger';
import { ORIGINE_HEVY } from './repriseHevy';

/** Le groupe de la bibliotheque pour un exercice YOROI, sinon null */
export function muscleBibliotheque(nom: string): string | null {
  return EXERCISE_LIBRARY.find((e) => e.name === nom)?.muscle ?? null;
}

/**
 * Tes exercices a toi, ajoutes a tes machines. Jamais au dela de la place qui reste (60 machines) : un ajout de trop
 * ferait partir tes plus vieilles machines. Les plus faits passent d'abord ; ceux deja dans tes machines gardent
 * leur muscle. Rend le nombre ajoute et celui qui n'a pas eu de place.
 */
export async function ajouterExosAToi(liste: readonly { nom: string; muscle: string | null }[]): Promise<{ ajoutes: number; sansPlace: number }> {
  let deja = await chargerMachinesPerso().catch(() => []);
  let ajoutes = 0;
  let sansPlace = 0;
  for (const e of liste) {
    if (!e.muscle || machineDe(deja, e.nom)) continue;
    if (deja.length >= MAX_MACHINES_PERSO) {
      sansPlace++;
      continue;
    }
    try {
      deja = await ajouterMachinePerso(e.nom, e.muscle);
      ajoutes++;
    } catch (err) {
      logger.warn('[RepriseHevy] exercice a toi non ajoute', err);
    }
  }
  return { ajoutes, sansPlace };
}

/** Ta routine Hevy deja creee lors d'un import precedent (pas archivee), sinon null */
export async function routineHevyExistante(): Promise<ProgrammePerso | null> {
  const l = programmesVisibles(await chargerProgrammesPerso().catch(() => []));
  return l.find((p) => p.origine === ORIGINE_HEVY) ?? null;
}

/** Le programme que tu suis en ce moment (autre que celui-ci), pour demander avant de le remplacer */
export async function autreProgrammeEnCours(id?: string): Promise<string | null> {
  const a = await chargerProgrammeActif().catch(() => null);
  return a && a.id !== id ? a.id : null;
}

/**
 * Enregistre ta routine. suivre : elle devient ton programme en cours (seance du jour, seance en direct, coach) ;
 * sinon elle rejoint Mes programmes et ton programme en cours ne bouge pas. Une routine Hevy deja la (remplacer)
 * est mise a jour en gardant son id : tes seances deja faites avec elle restent les siennes.
 */
export async function enregistrerRoutine(pp: ProgrammePerso, o: { suivre: boolean; remplacerId?: string | null }): Promise<ProgrammePerso | null> {
  let sauve: ProgrammePerso | null;
  if (o.remplacerId) {
    sauve = await enFileProgramme(CLE_PROGRAMMES_PERSO, () =>
      modifierProgrammePerso(o.remplacerId as string, (ancien) => ({
        ...ancien,
        nom: pp.nom,
        semaine: pp.semaine,
        semaineB: pp.semaineB,
        ab: pp.ab,
        depuis: pp.depuis,
        briques: undefined,
        variantesB: undefined,
        alternance: undefined,
      })),
    );
  } else {
    sauve = await enFileProgramme(CLE_PROGRAMMES_PERSO, () => enregistrerProgrammePerso(pp));
  }
  if (sauve && o.suivre) await suivreProgrammePerso(sauve);
  return sauve;
}

/** Sans planning : tes seances types dans Mes seances (une seance deja la avec les memes exercices n'est pas doublee) */
export async function garderDansMesSeances(liste: readonly { nom: string; exos: { nom: string; muscle?: string; series: number; reps: number; poids: number }[] }[]): Promise<number> {
  let n = 0;
  const deja = await chargerMesSeances().catch(() => []);
  for (const s of liste) {
    if (!s.exos.length || seanceIdentique(deja, s.exos)) continue;
    try {
      await creerMaSeance(s.nom, 'musculation', s.exos);
      n++;
    } catch (err) {
      logger.warn('[RepriseHevy] seance non gardee', err);
    }
  }
  return n;
}
