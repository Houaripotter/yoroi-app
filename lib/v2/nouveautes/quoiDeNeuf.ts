/**
 * « Quoi de neuf dans YOROI » (1er novembre 2026, rubriques de la 3.0.3 le 12 novembre 2026) : la fenetre des nouveautes, une seule fois par version.
 * Logique pure, testee (__tests__/unit/quoiDeNeuf.test.ts). Fenetre : components/yoroi/v2/nouveautes/QuoiDeNeuf.tsx,
 * montee par QuoiDeNeufGate dans app/(tabs)/_layout.tsx, et revue depuis Reglages, section YOROI.
 *
 * Regles :
 *  - au lancement, sur les onglets, apres l'ecran de chargement (les onglets ne montent qu'apres app/index.tsx) ;
 *  - jamais pendant l'onboarding : un nouvel utilisateur est marque « vu » a la fin de son onboarding
 *    (markWhatsNewSeen, components/WhatsNewModal.tsx), il ne la voit donc jamais ;
 *  - jamais pendant une seance en direct, la visite guidee ou la demo : on attend, rien n'est marque ;
 *  - lecture impossible du stockage : rien (on ne derange pas au moindre doute) ;
 *  - marquee vue quand la personne la ferme.
 */

/** La version dont l'utilisateur a deja vu les nouveautes */
export const QUOI_DE_NEUF_VU_KEY = '@yoroi_quoi_de_neuf_vu_version';
/** La version que decrit la fenetre (la liste NOUVEAUTES ci dessous) */
export const VERSION_NOUVEAUTES = '3.0.3';

/** Compare deux versions « 3.0.2 » : negatif si a < b */
export function comparerVersionsApp(a: string, b: string): number {
  const pa = String(a).split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export type EtatQuoiDeNeuf = {
  /** version de l'app (app.json) ; vide si inconnue */
  versionApp: string;
  /** valeur lue de QUOI_DE_NEUF_VU_KEY : null si absente, undefined si la lecture a echoue */
  versionVue: string | null | undefined;
  /** l'ecran ouvert est un onglet (Accueil, Seances, Progres, Dojo) */
  surOnglet: boolean;
  /** une seance est en cours (brouillon), meme reduite */
  seanceEnCours?: boolean;
  /** la visite guidee est en cours */
  visiteEnCours?: boolean;
  /** la demo (Heny) est chargee */
  demo?: boolean;
};

export type DecisionQuoiDeNeuf = 'montrer' | 'attendre' | 'rien';

/** Vrai : cette version de l'app a des nouveautes que la personne n'a pas encore vues */
export function nouveautesNonVues(versionApp: string, versionVue: string | null | undefined): boolean {
  if (versionVue === undefined) return false;
  if (!versionApp || comparerVersionsApp(versionApp, VERSION_NOUVEAUTES) < 0) return false;
  return versionVue == null || comparerVersionsApp(versionVue, VERSION_NOUVEAUTES) < 0;
}

export function decisionQuoiDeNeuf(e: EtatQuoiDeNeuf): DecisionQuoiDeNeuf {
  if (!nouveautesNonVues(e.versionApp, e.versionVue)) return 'rien';
  if (e.demo || e.visiteEnCours || e.seanceEnCours || !e.surOnglet) return 'attendre';
  return 'montrer';
}

/** Les chemins des onglets (expo-router, usePathname) */
const ONGLETS = new Set(['/', '/index', '/seances', '/progres', '/dojo']);
export function estOnglet(chemin: string | null | undefined): boolean {
  if (!chemin) return false;
  return ONGLETS.has(chemin.replace(/^\/\(tabs\)/, '') || '/');
}

/** Ports du stockage, pour tester sans AsyncStorage */
export type PortsQuoiDeNeuf = {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
};

/** Lit la version vue : null si absente, undefined si la lecture echoue */
export async function lireVersionVue(p: PortsQuoiDeNeuf): Promise<string | null | undefined> {
  try {
    return await p.getItem(QUOI_DE_NEUF_VU_KEY);
  } catch {
    return undefined;
  }
}

/** Marque les nouveautes de cette version comme vues (fenetre fermee, ou nouvel utilisateur en fin d'onboarding) */
export async function marquerQuoiDeNeufVu(p: PortsQuoiDeNeuf): Promise<void> {
  try {
    await p.setItem(QUOI_DE_NEUF_VU_KEY, VERSION_NOUVEAUTES);
  } catch {
    // sans importance : au pire elle se remontre une fois
  }
}

// ── Les nouveautes de la 3.0.3 (12 novembre 2026) ──────────────────────────
// Reprend les notes de version 3.0.3 (~/Desktop/YOROI_store_2026/notes_3.0.3/NOTES_FR.md), rien de plus.
// plateforme : rubrique reservee a iOS ou a Android (jamais Apple, iCloud ni Apple Watch sur Android).
// Textes en francais, passes par traduire() a l'affichage.

export type Nouveaute = {
  id: string;
  sticker: 'sauvegarde' | 'coffre_ouvert' | 'chrono' | 'sport_marche' | 'sablier' | 'records' | 'langue';
  ton: 'peche' | 'menthe' | 'creme' | 'lilas' | 'ciel';
  titre: string;
  texte: string;
  puces?: string[];
  plateforme?: 'ios' | 'android';
};

export const NOUVEAUTES: Nouveaute[] = [
  {
    id: 'sauvegarde_ios',
    plateforme: 'ios',
    sticker: 'sauvegarde',
    ton: 'menthe',
    titre: 'Ta sauvegarde, automatique',
    texte: 'Une copie sur iCloud après chaque séance et chaque pesée. Tes photos ne quittent jamais ton téléphone.',
  },
  {
    id: 'sauvegarde_android',
    plateforme: 'android',
    sticker: 'sauvegarde',
    ton: 'menthe',
    titre: 'Ta sauvegarde, automatique',
    texte: 'Une copie dans ton cloud après chaque séance et chaque pesée. Tes photos ne quittent jamais ton téléphone.',
  },
  {
    id: 'retrouver',
    sticker: 'coffre_ouvert',
    ton: 'ciel',
    titre: 'Tes données, retrouvées en un geste',
    texte: 'Choisis ta sauvegarde dans la liste et tout revient.',
  },
  {
    id: 'repos_montre',
    plateforme: 'ios',
    sticker: 'chrono',
    ton: 'peche',
    titre: 'Le même repos sur ta montre et ton iPhone',
    texte: 'Avec le nom de l’exercice, et un clap en bois à 10 secondes de la fin.',
  },
  {
    id: 'cardio_montre',
    plateforme: 'ios',
    sticker: 'sport_marche',
    ton: 'lilas',
    titre: 'Ta marche et ton cardio de l’Apple Watch',
    texte: 'Reprends les dans ta séance, et corrige l’heure de début.',
  },
  {
    id: 'heure_debut',
    plateforme: 'android',
    sticker: 'sablier',
    ton: 'lilas',
    titre: 'Tu as commencé plus tôt ?',
    texte: 'Corrige l’heure de début de ta séance.',
  },
  {
    id: 'plaques',
    sticker: 'records',
    ton: 'creme',
    titre: 'Tes records en plaques',
    texte: 'Ils arrivent dans Progrès.',
  },
  {
    id: 'langues',
    sticker: 'langue',
    ton: 'ciel',
    titre: 'YOROI parle 28 langues',
    texte: 'Dont l’arabe. L’app suit la langue de ton téléphone.',
  },
];

/** Les rubriques a montrer sur cette plateforme */
export function nouveautesPour(os: string): Nouveaute[] {
  const p = os === 'android' ? 'android' : 'ios';
  return NOUVEAUTES.filter((n) => !n.plateforme || n.plateforme === p);
}

/** 3.0.3 : l'app parle 28 langues, le mot « les traductions arrivent bientot » n'est plus montre */
export const MOT_TRADUCTIONS = false;

/** Les textes de la fenetre, hors rubriques (pour a_traduire.json) */
export const TEXTES_QUOI_DE_NEUF = {
  titre: 'Quoi de neuf dans YOROI {0}',
  sousTitre: 'Tout ce qui arrive avec cette mise à jour.',
  traductionsTitre: 'Les traductions arrivent bientôt',
  traductionsTexte: 'Avec toutes ces nouveautés, certaines parties de l’app sont encore en français. Désolé pour la gêne, on s’en occupe.',
  bouton: 'C’est parti',
  reglage: 'Quoi de neuf',
  reglageSous: 'Les nouveautés de la version {0}',
};
