/**
 * Les apps de muscu dont YOROI lit l'export (18 novembre 2026). Houari : « tous les exercices de l'utilisateur sur
 * Hevy etc., pas que Hevy ». Et : « dans l'onboarding, ne marque pas Hevy ».
 *
 * AFFICHER_NOMS_APPS : le seul interrupteur des noms d'apps. true : l'ecran d'import (onglet Seances) montre la liste
 * des apps reconnues avec leur nom, pour choisir la sienne et voir son chemin d'export. false : aucun nom nulle part,
 * un guide general et la detection automatique du fichier. L'onboarding ne montre jamais de nom (nomsVisibles).
 *
 * Les chemins d'export sont ecrits avec prudence, d'apres les aides publiques des apps et des guides de migration
 * (sources dans le rapport du 18 novembre 2026) ; ils peuvent changer avec les versions des apps.
 * Pur, teste dans __tests__/unit/importAutresApps.test.ts.
 */
import type { NomSticker } from '@/components/yoroi/v2/stickers';

export const AFFICHER_NOMS_APPS = true;

export type IdApp = 'hevy' | 'strong' | 'fitnotes' | 'autre';
export type EtapeGuide = { sticker: NomSticker; texte: string };
export type AppReconnue = { id: IdApp; nom: string; etapes: EtapeGuide[] };

const FIN: EtapeGuide = { sticker: 'telephone', texte: 'Reviens ici et choisis le fichier.' };

export const APPS: AppReconnue[] = [
  {
    id: 'hevy',
    nom: 'Hevy',
    etapes: [
      { sticker: 'profil', texte: 'Dans Hevy, ouvre ton Profil, puis les Réglages.' },
      { sticker: 'engrenage', texte: 'Touche Exporter et importer les données, puis Exporter les données.' },
      { sticker: 'tableur', texte: 'Choisis Exporter les séances : Hevy prépare un fichier CSV.' },
      { sticker: 'partager', texte: 'Enregistre le fichier dans Fichiers, ou envoie le toi.' },
      FIN,
    ],
  },
  {
    id: 'strong',
    nom: 'Strong',
    etapes: [
      { sticker: 'engrenage', texte: 'Dans Strong, ouvre les Réglages.' },
      { sticker: 'langue', texte: 'Si Strong n’est pas en anglais, passe le en anglais le temps de l’export : le fichier se lit mieux.' },
      { sticker: 'tableur', texte: 'Touche Export Strong Data et choisis le format CSV.' },
      { sticker: 'partager', texte: 'Enregistre le fichier dans Fichiers, ou envoie le toi.' },
      FIN,
    ],
  },
  {
    id: 'fitnotes',
    nom: 'FitNotes',
    etapes: [
      { sticker: 'engrenage', texte: 'Dans FitNotes, ouvre les Réglages.' },
      { sticker: 'tableur', texte: 'Cherche l’export en tableur (CSV) de tes séances et lance le.' },
      { sticker: 'partager', texte: 'Enregistre le fichier dans Fichiers, ou envoie le toi.' },
      FIN,
    ],
  },
  {
    id: 'autre',
    nom: 'Autre fichier',
    etapes: [
      { sticker: 'engrenage', texte: 'Dans ton ancienne app, ouvre les Réglages.' },
      { sticker: 'tableur', texte: 'Cherche Exporter ou Sauvegarder tes séances, en fichier CSV.' },
      { sticker: 'partager', texte: 'Enregistre le fichier dans Fichiers, ou envoie le toi.' },
      { sticker: 'telephone', texte: 'Reviens ici et choisis le fichier. Si YOROI ne reconnaît pas l’app, tu choisis les colonnes.' },
    ],
  },
];

/** Les noms d'apps se voient-ils ici ? Jamais dans l'onboarding. */
export const nomsVisibles = (depuisOnboarding: boolean): boolean => AFFICHER_NOMS_APPS && !depuisOnboarding;

/** Le guide : celui de l'app choisie quand les noms se voient, sinon le guide general (sans aucun nom) */
export function guideDe(id: IdApp | null, depuisOnboarding: boolean): EtapeGuide[] {
  const app = nomsVisibles(depuisOnboarding) && id ? APPS.find((a) => a.id === id) : undefined;
  return (app ?? APPS.find((a) => a.id === 'autre')!).etapes;
}

/** Le nom de l'app d'un fichier lu (format), ou null quand les noms ne se voient pas */
export function nomDuFormat(format: string | undefined, depuisOnboarding: boolean): string | null {
  if (!nomsVisibles(depuisOnboarding) || !format) return null;
  const id = format === 'hevy_texte' ? 'hevy' : format;
  return APPS.find((a) => a.id === id && a.id !== 'autre')?.nom ?? null;
}

/** L'origine gardee sur la routine creee (ProgrammePerso.origine), pour la retrouver a l'import suivant */
export const origineDe = (format: string | undefined): string => (format === 'hevy' || format === 'hevy_texte' || !format ? 'hevy' : `import_${format}`);

/**
 * 22 novembre 2026 : l'app d'origine d'un fichier lu (format), pour la confirmation de l'onboarding et la ligne du
 * paywall (« Tes séances Hevy sont déjà dans YOROI »). Houari veut maintenant nommer Hevy et Strong a l'entree.
 * null pour un tableur quelconque (colonnes choisies a la main) ou des notes : on ne devine jamais l'app.
 */
export type AppOrigine = Exclude<IdApp, 'autre'>;
export function appDuFormat(format: string | undefined): AppOrigine | null {
  if (format === 'hevy' || format === 'hevy_texte') return 'hevy';
  if (format === 'strong' || format === 'fitnotes') return format;
  return null;
}

/** Le nom affiche d'une app d'origine (Hevy, Strong, FitNotes), null si on ne la connait pas */
export function nomAppOrigine(id: string | null | undefined): string | null {
  if (!id || id === 'autre') return null;
  return APPS.find((a) => a.id === id)?.nom ?? null;
}
