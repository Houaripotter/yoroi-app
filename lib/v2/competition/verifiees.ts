/**
 * Competitions verifiees (16 octobre 2026). Houari ne savait pas d'ou venait « Championnat Regional PACA,
 * 7 novembre, Gymnase Borely, -80kg » : c'etait une competition inventee par une ancienne version de la demo
 * (profil Heny, lib/demoDataService.ts, aout 2026), restee dans la base de son iPhone.
 *
 * Ici, seulement des competitions a venir verifiees sur la page officielle de l'organisateur : nom, dates, lieu,
 * organisateur et lien. Elles servent a la demo (sa competition a venir est une vraie) et a nettoyer les anciennes
 * competitions inventees par la demo. Detail des verifications : _propositions/competitions/sources.md.
 * N'ajoute ici qu'une competition verifiee sur la page de l'organisateur.
 * Aucun import React Native ici : tout se teste avec jest.
 */

export const VERIFIEES_LE = '16 octobre 2026';

export type CompetitionVerifiee = {
  nom: string;
  /** premier jour, AAAA-MM-JJ */
  debut: string;
  /** dernier jour si l'evenement dure deux jours */
  fin?: string;
  lieu: string;
  ville: string;
  organisateur: string;
  source: string;
};

export const COMPETITIONS_VERIFIEES: CompetitionVerifiee[] = [
  {
    nom: 'Open de Toulouse',
    debut: '2026-11-07',
    fin: '2026-11-08',
    lieu: 'MAM, Maison des activités multidisciplinaires',
    ville: 'Saint-Orens-de-Gameville',
    organisateur: 'CFJJB',
    source: 'https://cfjjb.com/competitions/info/e39512cd-e9db-4163-b94e-40d15466dbc3/adulte-gi',
  },
  {
    nom: 'Open de Corse',
    debut: '2026-11-14',
    lieu: 'Complexe sportif Calvi Balagne',
    ville: 'Calvi',
    organisateur: 'CFJJB',
    source: 'https://cfjjb.com/competitions/info/e0fe9f9b-aee2-4592-a304-e10141e56a21/adulte-gi',
  },
  {
    nom: 'Paris Fall International Open IBJJF',
    debut: '2026-11-28',
    fin: '2026-11-29',
    lieu: 'Salle Charpy, stade Charléty',
    ville: 'Paris',
    organisateur: 'IBJJF',
    source: 'https://ibjjf.com/events/paris-fall-international-open-ibjjf-jiu-jitsu-championship-2026',
  },
  {
    nom: 'Open de Guilherand-Granges',
    debut: '2026-12-12',
    fin: '2026-12-13',
    lieu: 'Salle omnisports',
    ville: 'Guilherand-Granges',
    organisateur: 'CFJJB',
    source: 'https://cfjjb.com/competitions/info/c32b6717-1ef6-4ef6-913e-56c27189090e/adulte-gi',
  },
  {
    nom: 'Open de Chilly Mazarin',
    debut: '2026-12-19',
    fin: '2026-12-20',
    lieu: 'Complexe sportif Jesse Owens',
    ville: 'Chilly-Mazarin',
    organisateur: 'CFJJB',
    source: 'https://cfjjb.com/competitions/info/d289cad0-bc69-4e6f-90c3-8388e71c0b6b/adulte-gi',
  },
];

/**
 * Competitions inventees par les versions de la demo (aout puis octobre 2026). En mode demo seulement,
 * celles a venir sont retirees au demarrage (trimDemoFuture). Les competitions passees de la demo
 * (Open des Garrigues, Tournoi des Collines) restent : elles portent l'historique de combats de Heny.
 */
export const COMPETITIONS_INVENTEES_DEMO: string[] = [
  'Open de Marseille JJB',
  'IBJJF Paris Open',
  'Coupe de France Grappling',
  'Championnat Regional PACA',
  'Open de la Côte',
];

/** Meme cle que DEMO_ACTIVE_KEY de lib/demoDataService.ts (verifie par un test) */
export const CLE_DEMO_ACTIVE = '@yoroi_demo_data_active';

/** Les competitions verifiees encore a venir (dernier jour inclus), dans l'ordre */
export function verifieesAVenir(aujourdhui: string): CompetitionVerifiee[] {
  return COMPETITIONS_VERIFIEES.filter((c) => (c.fin ?? c.debut) >= aujourdhui.slice(0, 10)).sort((a, b) => a.debut.localeCompare(b.debut));
}

export function verifieeParNom(nom: string | null | undefined): CompetitionVerifiee | null {
  const n = (nom ?? '').trim().toLowerCase();
  return COMPETITIONS_VERIFIEES.find((c) => c.nom.toLowerCase() === n) ?? null;
}

/** D'ou vient la competition, dit en clair sur la tuile de l'accueil */
export function origineCompetition(nom: string | null | undefined, demoActive: boolean): string {
  const v = verifieeParNom(nom);
  if (demoActive) return v ? `Exemple de la démo, une vraie compétition vérifiée sur le site ${v.organisateur}` : 'Exemple de la démo';
  return 'Ajoutée par toi';
}
