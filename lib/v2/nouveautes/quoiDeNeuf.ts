/**
 * « Quoi de neuf dans YOROI 3.0.2 » (1er novembre 2026) : la fenetre des nouveautes, une seule fois par version.
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
export const VERSION_NOUVEAUTES = '3.0.2';

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

// ── Les nouveautes de la 3.0.2 ─────────────────────────────────────────────
// Uniquement ce qui est livre dans l'app (verifie dans _propositions/SUIVI_DEMANDES.md, points X, Z, AD a AY).
// Ecartes : les grands widgets iPad et Mac et la sonnerie de fin de repos (etape Xcode pas encore faite).
// Textes en francais, passes par traduire() a l'affichage.

export type Nouveaute = {
  id: string;
  sticker: 'calendrier' | 'musculation' | 'zones_corps' | 'metre_ruban' | 'scan_ia' | 'partager' | 'telephone' | 'etincelles';
  ton: 'peche' | 'menthe' | 'creme' | 'lilas' | 'ciel';
  titre: string;
  texte: string;
  puces?: string[];
};

export const NOUVEAUTES: Nouveaute[] = [
  {
    id: 'programme',
    sticker: 'calendrier',
    ton: 'ciel',
    titre: 'Ton programme, jour par jour',
    texte: 'Touche un jour et tu vois toute ta séance. Tes prochaines séances sont prêtes à l’avance.',
    puces: ['Séances A et B', 'Chaque muscle 2 fois', 'Changer un exercice pour un jour'],
  },
  {
    id: 'seance',
    sticker: 'musculation',
    ton: 'peche',
    titre: 'La séance en direct',
    texte: 'Plus rapide à remplir, plus simple à suivre.',
    puces: ['Poids plus rapide', 'Séries prévues visibles', 'Corriger une série', 'Superset', 'Changer de machine', 'Cardio avec pente et vitesse', 'Zone 2'],
  },
  {
    id: 'muscles',
    sticker: 'zones_corps',
    ton: 'lilas',
    titre: 'Les muscles travaillés',
    texte: 'Chaque exercice allume ses vrais muscles, sur ta séance comme sur ta semaine.',
  },
  {
    id: 'corps',
    sticker: 'metre_ruban',
    ton: 'menthe',
    titre: 'Les données de ton corps',
    texte: 'Suis ce qui compte pour toi. Une donnée enregistrée n’est jamais cachée.',
    puces: ['Composition détaillée', 'Nouvelles mensurations', 'Pesée avant et après séance', 'Forme du matin', 'Ce que tu suis, en 3 niveaux'],
  },
  {
    id: 'import',
    sticker: 'scan_ia',
    ton: 'creme',
    titre: 'L’import par photo avec ton IA',
    texte: 'Ta balance, ton app ou ton bilan en photo : ton IA lit, YOROI range chaque valeur à sa place.',
  },
  {
    id: 'cartes',
    sticker: 'partager',
    ton: 'lilas',
    titre: 'Tes cartes à partager',
    texte: 'Une bibliothèque de cartes faites avec tes vraies séances, tes records, ton mois et ton année.',
    puces: ['10 styles', 'Avec ta photo', 'Story ou autocollant'],
  },
  {
    id: 'grand_ecran',
    sticker: 'telephone',
    ton: 'ciel',
    titre: 'YOROI sur iPad et Mac',
    texte: 'Le menu passe sur le côté et tes pages s’ouvrent en tableau de bord.',
  },
  {
    id: 'vivant',
    sticker: 'etincelles',
    ton: 'peche',
    titre: 'Plus vivant partout',
    texte: 'Des exercices animés, des stickers partout et un nouvel écran de chargement sur la Corniche.',
  },
];

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
