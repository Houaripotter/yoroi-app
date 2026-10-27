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

/** Remplace toute la liste (lecture du stockage, enregistrement, archive) */
export function remplirRegistrePerso(liste: readonly Programme[]): void {
  registre = new Map(liste.map((p) => [p.id, p]));
}
