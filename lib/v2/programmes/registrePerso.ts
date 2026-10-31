/**
 * Tes programmes construits (27 octobre 2026), vus comme les programmes du catalogue : programmeParId (catalogue.ts)
 * les trouve ici. Ce fichier ne garde qu'une liste en mémoire, remplie par lib/v2/programmes/monProgramme.ts
 * (chargerProgrammesPerso) ; il n'importe rien du catalogue pour ne pas faire de boucle d'imports.
 * Un programme archivé reste ici : tes séances déjà faites gardent leur nom et leur page.
 */
import type { Programme } from './types';

export const PREFIXE_PERSO = 'perso-';

/** Même valeur que PROGRAMME_CHANGED_EVENT (suivi.ts), sans l'importer */
export const EVENEMENT_PROGRAMME = 'YOROI_PROGRAMME_CHANGED';

let registre = new Map<string, Programme>();

export function estProgrammePerso(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(PREFIXE_PERSO);
}

export function programmePersoParId(id: string | null | undefined): Programme | undefined {
  if (!estProgrammePerso(id)) return undefined;
  return registre.get(id as string);
}

const memeContenu = (a: Programme, b: Programme): boolean => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

/**
 * Remplace toute la liste (lecture du stockage, enregistrement, archive).
 * 31 octobre 2026 (Houari : « j'ai fait le Lower, je n'ai pas vu ma séance de cardio ») : un programme relu sans
 * changement garde le MEME objet. Avant, chaque relecture (chargerProgrammeActif la refait) creait de nouveaux
 * objets : la seance en direct tenait le jour de l'ancienne copie, et la fin de seance du programme actif, qui
 * reconnait ses jours par identite (finSeance.ts, contexteFinPour), ne s'appliquait plus. Ni abdos ni cardio ajoutes.
 */
export function remplirRegistrePerso(liste: readonly Programme[]): void {
  const avant = registre;
  registre = new Map(liste.map((p) => {
    const a = avant.get(p.id);
    return [p.id, a && memeContenu(a, p) ? a : p];
  }));
}
