/**
 * Ton espace : les choix personnels de l'utilisateur (scene, personnage, accueil, sports).
 * CONTRAT PARTAGE : les signatures et le type Espace ne doivent pas changer
 * (l'accueil, le dojo et le profil en dependent). On peut AJOUTER des champs optionnels.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, DeviceEventEmitter } from 'react-native';
import { creerTirage } from '@/lib/v2/espace/tirage';
import { setSilhouetteCourante, silhouetteActive, type SilhouetteId, type SilhouetteMode } from '@/lib/v2/silhouette';
import { LANTERNES_IDS, type LanterneSceneId } from '@/lib/v2/espace/lanternes';
import { SAMOURAI_IDS, type SamouraiSceneId } from '@/lib/v2/espace/samourai';
import { setUniversCourant, type Univers } from '@/lib/v2/dojo/univers';
import { CLASSIQUE_SCENE_IDS, type ClassiqueSceneId } from '@/lib/v2/espace/classique';
import { NATURE_SCENE_IDS, type NatureSceneId } from '@/lib/v2/espace/nature';
import { VOYAGE_SCENE_IDS, type VoyageSceneId } from '@/lib/v2/espace/voyages';
import { VIE_SCENE_IDS, type VieSceneId } from '@/lib/v2/espace/packsScenes';

/** Scenes du decor. Monde samourai : cinq en vague 12, dix de plus en vague 16, neuf en vague 25, meme cle de stockage. */
export type SceneId =
  | 'dojo' | 'nuit' | 'sakura' | 'matcha'
  | 'chateau' | 'bambous' | 'temple' | 'bataille' | 'port'
  | 'village' | 'pagode' | 'pont' | 'jardin' | 'forge' | 'salle' | 'remparts' | 'montagne' | 'plage' | 'camp'
  | 'machiya_nuit' | 'machiya_couchant' | 'machiya_aube' | 'onsen' | 'rizieres' | 'cascade' | 'festival' | 'kyudojo' | 'pavillon'
  /** vague 27 : offerte avec l'abonnement annuel */
  | 'sommet'
  /** vague 40 : le pack Lanternes de nuit (lib/v2/espace/lanternes.ts) */
  | LanterneSceneId
  /** vague 44 : le pack Samourai (lib/v2/espace/samourai.ts) */
  | SamouraiSceneId
  /** vague 45 : le pack Classique, scenes neutres (lib/v2/espace/classique.ts) */
  | ClassiqueSceneId
  /** 14 octobre 2026 : le pack Nature et ville, scenes neutres (lib/v2/espace/nature.ts) */
  | NatureSceneId
  /** 16 octobre 2026 : les scenes des packs Vie reelle (lib/v2/espace/packsScenes.ts) */
  | VieSceneId
  /** 18 octobre 2026 : le pack Voyages, scenes animees (lib/v2/espace/voyages.ts) */
  | VoyageSceneId;

/** vague 40 : la scene qui change a chaque ouverture, au choix d'un pack */
export type SceneRotation = 'lanternes' | 'samourai' | 'classique' | 'nature' | 'voyages' | 'toutes';

/** Toutes les scenes, pour la rotation « Toutes les scenes » (meme liste que le type SceneId) */
export const TOUTES_LES_SCENES: SceneId[] = [
  'dojo', 'nuit', 'sakura', 'matcha', 'chateau', 'bambous', 'temple', 'bataille', 'port',
  'village', 'pagode', 'pont', 'jardin', 'forge', 'salle', 'remparts', 'montagne', 'plage', 'camp',
  'machiya_nuit', 'machiya_couchant', 'machiya_aube', 'onsen', 'rizieres', 'cascade', 'festival', 'kyudojo', 'pavillon', 'sommet',
  ...LANTERNES_IDS,
  ...SAMOURAI_IDS,
  ...CLASSIQUE_SCENE_IDS,
  ...NATURE_SCENE_IDS,
  ...VIE_SCENE_IDS,
  ...VOYAGE_SCENE_IDS,
];

/** Les scenes de chaque pack qui tourne : la Ruelle de nuit ouvre le pack Lanternes */
export function scenesDuPack(pack: SceneRotation): SceneId[] {
  if (pack === 'lanternes') return ['machiya_nuit', ...LANTERNES_IDS];
  if (pack === 'samourai') return [...SAMOURAI_IDS];
  if (pack === 'classique') return [...CLASSIQUE_SCENE_IDS];
  if (pack === 'nature') return [...NATURE_SCENE_IDS];
  if (pack === 'voyages') return [...VOYAGE_SCENE_IDS];
  return TOUTES_LES_SCENES;
}

export type AccueilBloc = 'poids' | 'semaine' | 'prochaine_seance' | 'mensurations' | 'forme' | 'sommeil' | 'hydratation' | 'citation' | 'records' | 'competition';

export type Espace = {
  scene: SceneId;
  /** cle du personnage : 'guerrier_h', 'guerrier_f', l'id d'une legende (ex. 'kunoichi'),
   *  ou '<id>_h' | '<id>_f' pour un pack sport ou un personnage du monde (ex. 'ninja_f') */
  personnage: string;
  /** blocs affiches a l'accueil, dans l'ordre */
  accueilBlocs: AccueilBloc[];
  /** ids de lib/sports.ts, dans l'ordre de preference */
  sportsFavoris: string[];
  /** seances visees par semaine */
  objectifSemaine: number;
  /** ce qui s'affiche dans le rond de profil : le personnage ou la photo (ajout de l'agent Ton espace) */
  identite?: 'photo' | 'personnage';
  /** vrai quand l'utilisateur a lui-meme regle son objectif (onboarding ou reglages).
   *  Faux ou absent : la reprise peut proposer un objectif tire de son historique. */
  objectifChoisi?: boolean;
  /** vrai des que l'utilisateur a lui-meme regle les blocs de son accueil (ecran Ton accueil, vague 26).
   *  Absent : on lui sert les blocs par defaut du moment, sans jamais ecraser un choix qu'il a fait. */
  accueilPerso?: boolean;
  /** vague 26, « Ton personnage te ressemble » : 'classique' ou absent (dessin d'origine), 'auto' (selon tes pesees)
   *  ou une silhouette choisie (lib/v2/silhouette.ts). Absent par defaut, aussi pour les utilisateurs existants. */
  silhouette?: SilhouetteMode;
  /** derniere silhouette calculee en mode automatique */
  silhouetteAuto?: SilhouetteId;
  /** vague 27, onboarding : ce qui a freine l'utilisateur jusqu'ici (ids de lib/v2/onboarding/freins.ts).
   *  Choisit les conseils du jour de l'accueil. Absent pour les utilisateurs existants. */
  freins?: string[];
  /** vague 28 : jours d'entrainement choisis (onboarding ou Reglages), 0 = lundi a 6 = dimanche.
   *  Semaine type legere : le planning (creneaux) reste prioritaire s'il existe. Absent pour les utilisateurs existants. */
  joursSemaine?: number[];
  /** vague 29 : objectifs choisis a l'onboarding (choix multiples, lib/v2/onboarding/objectifs.ts).
   *  Le profil garde un seul objectif de poids (weight_goal) deduit de la combinaison. Absent pour les utilisateurs existants. */
  objectifs?: ('lose' | 'gain' | 'combat' | 'maintain')[];
  /** vague 40 : « Scene qui change a chaque ouverture ». Absent : la scene choisie reste fixe.
   *  Quand il est present, getEspace renvoie dans `scene` la scene tiree au lancement, et `sceneFixe` garde ton choix. */
  sceneRotation?: SceneRotation;
  /** vague 40 : la scene choisie a la main (renseignee par getEspace seulement, jamais enregistree) */
  sceneFixe?: SceneId;
  /** vague 41 : contour du rond de profil (accueil, Reglages, profil). Absent : 'fin', un cercle blanc translucide.
   *  Simple choix de style, sans lien avec le rang du Dojo. */
  contourRond?: 'aucun' | 'fin' | 'or' | 'indigo' | 'noir' | 'blanc' | 'rouge' | 'vert' | 'ciel' | 'violet' | 'rose' | 'orange';
  /** vague 45 : univers du personnage (lib/v2/dojo/univers.ts). Absent : 'japon', aussi pour les utilisateurs existants.
   *  Le choix « Sans personnage » met l'univers classique et la cle de personnage 'aucun'. */
  univers?: Univers;
};

/** Objectif de seances vise, ou 0 tant que l'utilisateur ne l'a pas choisi lui-meme. */
export function objectifVise(e: Pick<Espace, 'objectifSemaine' | 'objectifChoisi'> | null | undefined): number {
  return e && e.objectifChoisi === true ? Math.max(1, Math.min(7, Math.round(e.objectifSemaine || 0))) : 0;
}

export const ESPACE_CHANGED_EVENT = 'YOROI_ESPACE_CHANGED';
const KEY = 'yoroi_espace_v1';

export const DEFAULT_ESPACE: Espace = {
  scene: 'dojo',
  personnage: 'guerrier_h',
  // vague 26 : mensurations, eau et sommeil par defaut (le sommeil ne s'affiche que s'il a des donnees)
  accueilBlocs: ['poids', 'semaine', 'prochaine_seance', 'mensurations', 'hydratation', 'sommeil', 'forme'],
  sportsFavoris: [],
  objectifSemaine: 3,
  identite: 'personnage',
};

/** Anciennes valeurs par defaut des blocs : enregistrees telles quelles sans que l'utilisateur les ait choisies */
const LEGACY_DEFAULT_BLOCS: AccueilBloc[][] = [['poids', 'semaine', 'prochaine_seance', 'forme']];

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Vrai si l'accueil suit les blocs par defaut (jamais personnalise par l'utilisateur) */
export function accueilParDefaut(e: Pick<Espace, 'accueilBlocs' | 'accueilPerso'>): boolean {
  return e.accueilPerso !== true && sameList(e.accueilBlocs ?? [], DEFAULT_ESPACE.accueilBlocs);
}

/**
 * Vague 40 : une scene du pack tiree au hasard au lancement de l'app, jamais la meme que la derniere fois.
 * 14 octobre : sur iPhone l'app reste en memoire et n'est presque jamais relancee a froid : le tirage restait le meme
 * pendant des jours. Il est maintenant refait aussi quand l'app revient au premier plan apres 30 minutes ou plus
 * (lib/v2/espace/tirage.ts), et l'accueil est prevenu pour changer de scene.
 */
const KEY_DERNIERE = 'yoroi_scene_rotation_derniere';
const tirage = creerTirage({
  memoire: {
    lire: () => AsyncStorage.getItem(KEY_DERNIERE),
    ecrire: (scene) => AsyncStorage.setItem(KEY_DERNIERE, scene),
  },
});

async function sceneDuLancement(pack: SceneRotation): Promise<SceneId> {
  surveillerRetours();
  return tirage.scene(pack, scenesDuPack(pack));
}

/** Retour au premier plan apres 30 minutes : nouveau tirage, et tous les ecrans recoivent la nouvelle scene */
let surveille = false;
function surveillerRetours(): void {
  if (surveille) return;
  surveille = true;
  try {
    AppState.addEventListener('change', (etat) => {
      if (!tirage.etat(etat)) return;
      getEspace()
        .then((e) => {
          if (e.sceneRotation) DeviceEventEmitter.emit(ESPACE_CHANGED_EVENT, e);
        })
        .catch(() => undefined);
    });
  } catch {
    // sans AppState (tests), le tirage se fait seulement au lancement
  }
}

/** La scene a afficher : la scene tiree au lancement si la rotation est active, sinon ton choix */
async function avecRotation(e: Espace): Promise<Espace> {
  if (e.sceneRotation !== 'lanternes' && e.sceneRotation !== 'samourai' && e.sceneRotation !== 'classique' && e.sceneRotation !== 'nature' && e.sceneRotation !== 'voyages' && e.sceneRotation !== 'toutes') return e;
  try {
    return { ...e, sceneFixe: e.scene, scene: await sceneDuLancement(e.sceneRotation) };
  } catch {
    return e;
  }
}

/** Sports favoris de l'ancienne version (lecture seule, les anciennes cles ne sont jamais effacees) */
let anciensFavoris: string[] | null = null;
async function anciensSportsFavoris(): Promise<string[]> {
  if (anciensFavoris) return anciensFavoris;
  const out: string[] = [];
  for (const k of ['yoroi_favorite_sports', '@yoroi_favorite_sports']) {
    try {
      const raw = await AsyncStorage.getItem(k);
      const arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr)) for (const x of arr) if (typeof x === 'string' && x && !out.includes(x)) out.push(x);
    } catch {
      // ancienne cle illisible : ignoree
    }
  }
  anciensFavoris = out;
  return out;
}

/** Genre de l'ancienne version : profil (avatar_gender) puis ancien avatar (@yoroi_avatar_config). Lecture seule. */
let ancienFeminin: boolean | null = null;
async function ancienGenreFeminin(): Promise<boolean> {
  if (ancienFeminin !== null) return ancienFeminin;
  let femme: boolean | null = null;
  try {
    const { getProfile } = await import('@/lib/database');
    const p = await getProfile();
    if (p?.avatar_gender === 'femme') femme = true;
    else if (p?.avatar_gender === 'homme') femme = false;
  } catch {
    // base pas encore ouverte : on regarde l'ancien avatar
  }
  if (femme === null) {
    try {
      const raw = await AsyncStorage.getItem('@yoroi_avatar_config');
      femme = raw ? JSON.parse(raw)?.gender === 'female' : false;
    } catch {
      femme = false;
    }
  }
  ancienFeminin = femme;
  return femme;
}

/** Espace tel qu'il est enregistre, sans la scene du lancement */
async function getEspaceEnregistre(): Promise<Espace> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      // 13 octobre : premier lancement apres la mise a jour depuis la 2.4.2 (pas encore d'espace) :
      // on repart de ce que tu avais (Guerriere si ton profil est au feminin, tes sports favoris)
      const [anciens, femme] = await Promise.all([anciensSportsFavoris(), ancienGenreFeminin()]);
      if (!anciens.length && !femme) return DEFAULT_ESPACE;
      return { ...DEFAULT_ESPACE, ...(anciens.length ? { sportsFavoris: anciens } : {}), ...(femme ? { personnage: 'guerrier_f' } : {}) };
    }
    const saved = JSON.parse(raw) as Partial<Espace>;
    // les blocs jamais choisis par l'utilisateur suivent les nouveaux blocs par defaut ;
    // un choix fait dans « Ton accueil » (sans le poids, ou marque accueilPerso) n'est jamais touche
    if (saved.accueilPerso !== true && (!Array.isArray(saved.accueilBlocs) || LEGACY_DEFAULT_BLOCS.some((l) => sameList(saved.accueilBlocs as AccueilBloc[], l)))) {
      delete saved.accueilBlocs;
    }
    delete saved.sceneFixe;
    const e: Espace = { ...DEFAULT_ESPACE, ...saved };
    if (!saved.personnage && (await ancienGenreFeminin())) e.personnage = 'guerrier_f';
    // 13 octobre : tes sports favoris notes dans l'ancienne version (2.4.2) reviennent tant que tu n'en as pas choisi ici
    if (!Array.isArray(e.sportsFavoris) || e.sportsFavoris.length === 0) {
      const anciens = await anciensSportsFavoris();
      if (anciens.length) e.sportsFavoris = anciens;
    }
    // vague 26 : la silhouette active sert a toutes les images du Guerrier (accueil, profil, Dojo, paywall)
    setSilhouetteCourante(silhouetteActive(e.silhouette, e.silhouetteAuto));
    setUniversCourant(e.univers);
    return e;
  } catch {
    return DEFAULT_ESPACE;
  }
}

export async function getEspace(): Promise<Espace> {
  return avecRotation(await getEspaceEnregistre());
}

export async function saveEspace(patch: Partial<Espace>): Promise<Espace> {
  // tout reglage explicite de l'objectif le marque comme choisi
  const flag = patch.objectifSemaine !== undefined && patch.objectifChoisi === undefined ? { objectifChoisi: true } : {};
  // vague 40 : choisir une scene a la main arrete la rotation ; la scene du lancement n'est jamais enregistree
  const rotation = patch.scene !== undefined && !('sceneRotation' in patch) ? { sceneRotation: undefined } : {};
  const { sceneFixe: _ignore, ...propre } = patch;
  const next: Espace = { ...(await getEspaceEnregistre()), ...propre, ...flag, ...rotation };
  if (next.sceneRotation === undefined) delete next.sceneRotation;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // stockage indisponible : on garde la valeur en memoire pour cette session
  }
  setSilhouetteCourante(silhouetteActive(next.silhouette, next.silhouetteAuto));
  setUniversCourant(next.univers);
  const affiche = await avecRotation(next);
  DeviceEventEmitter.emit(ESPACE_CHANGED_EVENT, affiche);
  return affiche;
}
