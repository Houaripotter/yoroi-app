/**
 * Machine d'états de la connexion à Apple Santé ou Health Connect (14 octobre 2026, SANTÉ CONNEXION).
 * Pure (aucun import natif), testée dans __tests__/unit/connexionSante.test.ts.
 *
 * Pourquoi : la roue tournait sans fin et « Connecté » s'affichait sans rien vérifier. La connexion attendait
 * la fenêtre d'Apple, puis une deuxième fenêtre, puis toute la synchro, sans délai ni vérification.
 *
 * Règles :
 * - une seule demande à la fois (les appels en même temps partagent la même promesse) ;
 * - la fenêtre a un délai de sécurité ; au retour au premier plan (Réglages, app Santé), on revérifie
 *   pour de vrai au lieu d'attendre une promesse qui ne revient pas ;
 * - « connecté » seulement si une lecture réelle renvoie quelque chose ;
 * - sinon un message clair avec les étapes dans Réglages.
 */

import { traduire } from '@/lib/i18n/tr';
export type StatutDemande = 'a_demander' | 'repondu' | 'inconnu';

export type IssueConnexion =
  /** une lecture réelle a renvoyé des données */
  | 'connecte'
  /** fenêtre répondue mais rien de lisible : refus (iOS ne le dit pas) ou aucune donnée */
  | 'rien_lu'
  /** Android : aucune permission accordée */
  | 'refuse'
  /** la fenêtre n'a pas été répondue (quittée, délai dépassé) */
  | 'abandon'
  | 'indisponible'
  | 'erreur';

export type EtapeConnexion = 'repos' | 'fenetre' | 'verification' | 'import' | 'termine';

export type DepsConnexion = {
  disponible: () => Promise<boolean>;
  /** Ouvre la fenêtre du système. Peut ne jamais revenir. */
  demander: () => Promise<unknown>;
  /** iOS : getRequestStatusForAuthorization. Android : 'repondu' si au moins une permission est accordée. */
  statut: () => Promise<StatutDemande>;
  /** Essai de lecture réel (poids, pas, FC, séances, sommeil sur 60 jours) */
  lectureReelle: () => Promise<boolean>;
  /** Abonnement au retour au premier plan, renvoie la fonction de désabonnement */
  surRetour?: (cb: () => void) => () => void;
  /** Suivi des étapes pour l'écran */
  etape?: (e: EtapeConnexion) => void;
  delaiFenetreMs?: number;
  delaiLectureMs?: number;
  /** Attente après le retour au premier plan avant de revérifier (iOS met à jour le statut juste après) */
  pauseRetourMs?: number;
  attendre?: (ms: number) => Promise<void>;
};

const attendreDefaut = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

async function avecDelai<T>(p: Promise<T>, ms: number, attendre: (ms: number) => Promise<void>): Promise<T | 'delai'> {
  return Promise.race([p, attendre(ms).then(() => 'delai' as const)]);
}

/** Décision finale, à partir du statut de la fenêtre et de la lecture réelle */
export function decider(statut: StatutDemande, lecture: boolean, plateforme: string): IssueConnexion {
  if (lecture) return 'connecte';
  if (statut === 'a_demander') return 'abandon';
  if (plateforme === 'android') return statut === 'repondu' ? 'rien_lu' : 'refuse';
  return 'rien_lu';
}

export async function connecterAvecVerification(deps: DepsConnexion, plateforme: string): Promise<IssueConnexion> {
  const attendre = deps.attendre ?? attendreDefaut;
  const delaiFenetre = deps.delaiFenetreMs ?? 120000;
  const delaiLecture = deps.delaiLectureMs ?? 12000;
  const pauseRetour = deps.pauseRetourMs ?? 900;
  const etape = deps.etape ?? (() => {});

  let dispo = false;
  try {
    dispo = await deps.disponible();
  } catch {
    dispo = false;
  }
  if (!dispo) return 'indisponible';

  etape('fenetre');
  let erreur = false;
  const abo: { stop?: () => void } = {};
  try {
    const demande = deps.demander().then(
      () => 'fini' as const,
      () => {
        erreur = true;
        return 'fini' as const;
      },
    );
    // Retour au premier plan : si la fenêtre a été répondue (ou les Réglages ouverts), on n'attend plus
    const retour = new Promise<'retour'>((res) => {
      if (!deps.surRetour) return;
      abo.stop = deps.surRetour(() => {
        void attendre(pauseRetour).then(async () => {
          try {
            if ((await deps.statut()) !== 'a_demander') res('retour');
          } catch {
            /* on laisse la demande ou le délai trancher */
          }
        });
      });
    });
    await avecDelai(Promise.race([demande, retour]), delaiFenetre, attendre);
  } finally {
    abo.stop?.();
  }

  etape('verification');
  let statut: StatutDemande = 'inconnu';
  try {
    statut = await deps.statut();
  } catch {
    statut = 'inconnu';
  }
  let lecture = false;
  try {
    const l = await avecDelai(deps.lectureReelle(), delaiLecture, attendre);
    lecture = l === true;
  } catch {
    lecture = false;
  }
  const issue = decider(statut, lecture, plateforme);
  if (issue !== 'connecte' && erreur && statut === 'inconnu') return 'erreur';
  return issue;
}

/** Une seule demande à la fois : les appels pendant une demande en cours reçoivent le même résultat */
export function uneSeuleFois<A extends unknown[], T>(fn: (...a: A) => Promise<T>): ((...a: A) => Promise<T>) & { enCours: () => boolean } {
  let courante: Promise<T> | null = null;
  const f = ((...a: A) => {
    if (courante) return courante;
    courante = fn(...a).finally(() => {
      courante = null;
    });
    return courante;
  }) as ((...a: A) => Promise<T>) & { enCours: () => boolean };
  f.enCours = () => courante !== null;
  return f;
}

// ============================================
// MESSAGES
// ============================================

export const ETAPES_REGLAGES_IOS = [
  traduire('Ouvre Réglages sur ton iPhone.'),
  traduire('Touche Santé, puis Accès aux données et appareils.'),
  traduire('Touche YOROI, puis Tout activer.'),
  traduire('Reviens dans YOROI.'),
];

export const ETAPES_REGLAGES_ANDROID = [
  'Ouvre Health Connect.',
  traduire('Touche Autorisations des applications, puis YOROI.'),
  traduire('Touche Tout autoriser.'),
  traduire('Reviens dans YOROI.'),
];

export type MessageConnexion = { titre: string; texte: string; reglages: boolean };

export function messageConnexion(issue: IssueConnexion, plateforme: string): MessageConnexion {
  const android = plateforme === 'android';
  const nom = android ? 'Health Connect' : 'Apple Santé';
  const etapes = (android ? ETAPES_REGLAGES_ANDROID : ETAPES_REGLAGES_IOS).map((e, i) => `${i + 1}. ${e}`).join('\n');
  switch (issue) {
    case 'connecte':
      return { titre: traduire("{0} est relié", nom), texte: traduire('Import en cours. Tes pesées et tes séances arrivent dans YOROI.'), reglages: false };
    case 'rien_lu':
      return {
        titre: traduire("YOROI ne lit rien dans {0}", nom),
        texte: android
          ? traduire("L’accès n’est pas ouvert, ou {0} est vide. Pour l’ouvrir :\n{1}", nom, etapes)
          : traduire("Soit l’accès est coupé, soit ton iPhone n’a encore rien enregistré. Apple ne dit pas lequel. Pour vérifier :\n{0}", etapes),
        reglages: true,
      };
    case 'refuse':
      return { titre: traduire('Accès refusé'), texte: traduire("Rien n’est autorisé pour YOROI. Pour l’ouvrir :\n{0}", etapes), reglages: true };
    case 'abandon':
      return {
        titre: traduire('La fenêtre n’a pas été validée'),
        texte: android ? traduire('Réessaie, ou ouvre l’accès toi-même :\n') + etapes : traduire('Réessaie et touche Autoriser en haut à droite. Ou ouvre l’accès toi-même :\n') + etapes,
        reglages: true,
      };
    case 'indisponible':
      return { titre: `${nom} indisponible`, texte: android ? traduire('Installe Health Connect depuis le Play Store, puis réessaie.') : traduire('L’app Santé n’existe pas sur cet appareil.'), reglages: false };
    default:
      return { titre: traduire('Connexion impossible'), texte: traduire("Réessaie dans un instant. Si ça recommence :\n{0}", etapes), reglages: true };
  }
}

// ============================================
// IMPORT
// ============================================

export type CompteImport = { weights?: number; workouts?: number; sleep?: number; steps?: number };

/** « 120 pesées, 45 séances » (rien si tout est à zéro) */
export function texteCompte(c: CompteImport | null | undefined): string {
  if (!c) return '';
  const p = (n: number | undefined, un: string, plusieurs: string) => (n && n > 0 ? `${n} ${n > 1 ? plusieurs : un}` : null);
  return [p(c.weights, traduire('pesée'), traduire('pesées')), p(c.workouts, traduire('séance'), traduire('séances')), p(c.sleep, 'nuit', 'nuits')].filter(Boolean).join(', ');
}

export function texteImport(enCours: boolean, c: CompteImport | null | undefined): string {
  const t = texteCompte(c);
  if (enCours) return t ? `Import en cours : ${t}` : 'Import en cours';
  return t ? traduire("Import terminé : {0}", t) : traduire('Import terminé');
}
