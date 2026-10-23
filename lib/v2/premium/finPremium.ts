/**
 * Vague 47 : fin du Premium. Logique pure, sans stockage ni React (testee dans __tests__/unit/finPremium.test.ts).
 *
 * Decision de Houari (12 octobre) : si l'abonnement expire, les choix reserves a Premium (scene, scene qui change
 * a chaque ouverture, personnage du monde samourai) ne sont plus affiches. On revient a la derniere scene gratuite
 * choisie (sinon la scene gratuite par defaut) et au Guerrier ou a la Guerriere, sans rien effacer : le choix Premium
 * est garde de cote et revient tout seul quand l'utilisateur reprend Premium.
 *
 * Garde-fous contre les faux negatifs : rien n'est retire tant que l'etat de l'abonnement n'est pas connu
 * (chargement de RevenueCat, hors ligne sans cache, Expo Go et web), ni en mode createur ou en apercu du Studio,
 * ni sans le rang du Dojo (les scenes et personnages gagnes au Dojo restent acquis).
 */
import type { SceneId, SceneRotation } from '@/lib/v2/espace';

/** Etat de l'abonnement : confirme par RevenueCat, sinon le dernier etat mis en cache, sinon inconnu */
export type EtatAbonnement = 'inconnu' | 'actif' | 'inactif';

/** Droits du moment : Premium et abonnement annuel */
export type Droits = { premium: boolean; annuel: boolean };

/** Ce qui est ouvert : regles du catalogue (rangs du Dojo compris), injectees pour garder ce fichier pur */
export type Acces = {
  scene: (id: SceneId, d: Droits) => boolean;
  personnage: (key: string, d: Droits) => boolean;
};

/** Les choix de l'utilisateur : la scene choisie a la main (pas celle tiree au lancement), la rotation, le personnage */
export type ChoixActuels = { scene: SceneId; sceneRotation?: SceneRotation; personnage: string };

/** Choix Premium mis de cote, avec ce qui les a remplaces (pour ne jamais ecraser un choix fait depuis) */
export type MemoPremium = {
  scene?: SceneId;
  sceneRotation?: SceneRotation;
  personnage?: string;
  repliScene?: SceneId;
  repliPersonnage?: string;
};

/** Patch a appliquer a l'espace. sceneRotation: null coupe la rotation */
export type PatchChoix = { scene?: SceneId; sceneRotation?: SceneRotation | null; personnage?: string };

export const SCENE_GRATUITE_DEFAUT: SceneId = 'dojo';
export const SANS_PREMIUM: Droits = { premium: false, annuel: false };

export type Action = 'rien' | 'retirer' | 'remettre';

/**
 * Que faire maintenant. Le mode createur et les apercus du Studio gardent tout ; un etat inconnu ne retire rien ;
 * sans le rang du Dojo on ne retire rien non plus (une scene gagnee pourrait passer pour Premium).
 */
export function actionPremium(o: { etat: EtatAbonnement; createur: boolean; apercu: boolean; rangConnu: boolean }): Action {
  if (o.createur || o.apercu) return 'rien';
  if (o.etat === 'actif') return 'remettre';
  if (o.etat === 'inactif' && o.rangConnu) return 'retirer';
  return 'rien';
}

/** Personnage gratuit selon le genre choisi */
export function personnageGratuit(genre: 'h' | 'f'): string {
  return genre === 'f' ? 'guerrier_f' : 'guerrier_h';
}

/** La scene de repli : la derniere scene gratuite choisie si elle est encore ouverte, sinon la scene par defaut */
export function sceneDeRepli(derniereGratuite: SceneId | null | undefined, acces: Acces): SceneId {
  return derniereGratuite && acces.scene(derniereGratuite, SANS_PREMIUM) ? derniereGratuite : SCENE_GRATUITE_DEFAUT;
}

/** Sans Premium : ce qu'il faut changer et ce qu'il faut garder de cote. null si rien n'est reserve a Premium. */
export function planRetrait(
  choix: ChoixActuels,
  o: { derniereGratuite?: SceneId | null; genre: 'h' | 'f'; acces: Acces },
): { patch: PatchChoix; memo: MemoPremium } | null {
  const patch: PatchChoix = {};
  const memo: MemoPremium = {};
  let scene = choix.scene;
  if (!o.acces.scene(choix.scene, SANS_PREMIUM)) {
    memo.scene = choix.scene;
    scene = sceneDeRepli(o.derniereGratuite, o.acces);
    patch.scene = scene;
  }
  if (choix.sceneRotation) {
    memo.sceneRotation = choix.sceneRotation;
    patch.sceneRotation = null;
  }
  if (memo.scene || memo.sceneRotation) memo.repliScene = scene;
  if (!o.acces.personnage(choix.personnage, SANS_PREMIUM)) {
    memo.personnage = choix.personnage;
    memo.repliPersonnage = personnageGratuit(o.genre);
    patch.personnage = memo.repliPersonnage;
  }
  return Object.keys(patch).length ? { patch, memo } : null;
}

/** Deux retraits successifs : le choix Premium le plus ancien n'est jamais perdu */
export function fusionMemo(ancien: MemoPremium | null | undefined, nouveau: MemoPremium): MemoPremium {
  if (!ancien) return nouveau;
  const m: MemoPremium = { ...nouveau };
  if (ancien.scene || ancien.sceneRotation) {
    m.scene = ancien.scene ?? nouveau.scene;
    m.sceneRotation = ancien.sceneRotation ?? nouveau.sceneRotation;
    m.repliScene = nouveau.repliScene ?? ancien.repliScene;
  }
  if (ancien.personnage) {
    m.personnage = ancien.personnage;
    m.repliPersonnage = nouveau.repliPersonnage ?? ancien.repliPersonnage;
  }
  return m;
}

/**
 * Premium revenu : remet les choix gardes de cote, seulement si l'utilisateur n'a rien choisi d'autre entre-temps
 * (la scene et le personnage sont encore ceux du repli) et si le choix est bien ouvert avec ses droits.
 */
export function planRetour(choix: ChoixActuels, memo: MemoPremium | null | undefined, o: { droits: Droits; acces: Acces }): PatchChoix {
  const patch: PatchChoix = {};
  if (!memo) return patch;
  if ((memo.scene || memo.sceneRotation) && !choix.sceneRotation && choix.scene === memo.repliScene) {
    if (!memo.scene || o.acces.scene(memo.scene, o.droits)) {
      if (memo.scene) patch.scene = memo.scene;
      if (memo.sceneRotation) patch.sceneRotation = memo.sceneRotation;
    }
  }
  if (memo.personnage && choix.personnage === memo.repliPersonnage && o.acces.personnage(memo.personnage, o.droits)) {
    patch.personnage = memo.personnage;
  }
  return patch;
}
