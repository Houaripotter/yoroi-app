/**
 * Vague 47 : fin du Premium, cote stockage. Applique la logique pure de ./finPremium a l'espace de l'utilisateur.
 * Les choix Premium mis de cote restent dans le telephone (AsyncStorage) et reviennent avec Premium.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEspace, saveEspace, type Espace, type SceneId } from '@/lib/v2/espace';
import { choisirPersonnage } from '@/lib/v2/espace/personnage';
import { getProfile } from '@/lib/database';
import { essaiEnCours } from '@/lib/v2/dojo/recompensesScenes';
import { isPackUnlocked, isThemeUnlocked, parsePersonnage, THEMES } from '@/lib/v2/dojo/personnages';
import {
  fusionMemo,
  planRetour,
  planRetrait,
  SANS_PREMIUM,
  type Acces,
  type ChoixActuels,
  type Droits,
  type MemoPremium,
  type PatchChoix,
} from './finPremium';

const KEY_MEMO = 'yoroi_premium_choix_v1';
const KEY_GRATUITE = 'yoroi_scene_gratuite_v1';
const KEY_FENETRE = 'yoroi_premium_fin_vue_v1';

/** Les regles du catalogue au rang donne : scenes (rangs du Dojo, annuel) et personnages du monde */
export function accesAuRang(rankIndex: number): Acces {
  return {
    scene: (id, d) => {
      const t = THEMES.find((x) => x.id === id);
      return t ? isThemeUnlocked(t, rankIndex, d.premium, d.annuel) : true;
    },
    personnage: (key, d) => {
      const p = parsePersonnage(key);
      // vague 45 : le Guerrier, le Sportif et « Sans personnage » sont offerts
      if (p.kind !== 'pack') return true;
      // seuls les personnages du monde dependent de Premium ; les packs sport et legendes s'achetent a part
      if (p.pack.kind !== 'monde') return true;
      return isPackUnlocked(p.pack, [], rankIndex, d.premium);
    },
  };
}

function choixDe(e: Espace): ChoixActuels {
  return { scene: e.sceneFixe ?? e.scene, sceneRotation: e.sceneRotation, personnage: e.personnage };
}

async function lireMemo(): Promise<MemoPremium | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_MEMO);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' ? (v as MemoPremium) : null;
  } catch {
    return null;
  }
}

async function appliquer(patch: PatchChoix): Promise<void> {
  const p: Partial<Espace> = {};
  if (patch.scene) p.scene = patch.scene;
  if (patch.sceneRotation === null) p.sceneRotation = undefined;
  else if (patch.sceneRotation) p.sceneRotation = patch.sceneRotation;
  if (patch.scene || 'sceneRotation' in patch) await saveEspace(p);
  if (patch.personnage) await choisirPersonnage(patch.personnage);
}

/** Note la scene choisie si elle est ouverte sans Premium (la scene de repli si Premium prend fin) */
export async function noterSceneGratuite(e: Espace, rankIndex: number): Promise<void> {
  const id = e.sceneFixe ?? e.scene;
  // 18 octobre : une scene en essai 24 h (grand coffre) n'est pas une scene de repli
  if (essaiEnCours()?.id === id) return;
  if (!accesAuRang(rankIndex).scene(id, SANS_PREMIUM)) return;
  try { await AsyncStorage.setItem(KEY_GRATUITE, id); } catch { /* sans stockage, repli sur la scene par defaut */ }
}

/**
 * Sans Premium : retire ce qui lui est reserve et le garde de cote.
 * Renvoie premiereFois a vrai la premiere fois qu'un choix est retire (pour la fenetre douce).
 */
export async function retirerChoixPremium(rankIndex: number): Promise<{ change: boolean; premiereFois: boolean }> {
  const e = await getEspace();
  const [derniere, profil] = await Promise.all([
    AsyncStorage.getItem(KEY_GRATUITE).catch(() => null),
    getProfile().catch(() => null),
  ]);
  const parse = parsePersonnage(e.personnage);
  const genre: 'h' | 'f' = profil?.avatar_gender === 'femme' ? 'f' : profil?.avatar_gender === 'homme' ? 'h' : parse.gender;
  const plan = planRetrait(choixDe(e), { derniereGratuite: (derniere as SceneId | null) ?? null, genre, acces: accesAuRang(rankIndex) });
  if (!plan) return { change: false, premiereFois: false };
  const memo = fusionMemo(await lireMemo(), plan.memo);
  // le choix Premium est garde AVANT d'etre remplace : rien ne se perd si l'app se ferme entre les deux
  await AsyncStorage.setItem(KEY_MEMO, JSON.stringify(memo));
  await appliquer(plan.patch);
  let premiereFois = false;
  try {
    premiereFois = (await AsyncStorage.getItem(KEY_FENETRE)) !== '1';
    if (premiereFois) await AsyncStorage.setItem(KEY_FENETRE, '1');
  } catch {
    premiereFois = false;
  }
  return { change: true, premiereFois };
}

/** Premium revenu : remet les choix gardes de cote, puis les oublie */
export async function remettreChoixPremium(rankIndex: number, annuel: boolean): Promise<boolean> {
  const memo = await lireMemo();
  if (!memo) return false;
  const droits: Droits = { premium: true, annuel };
  const patch = planRetour(choixDe(await getEspace()), memo, { droits, acces: accesAuRang(rankIndex) });
  await appliquer(patch);
  try { await AsyncStorage.removeItem(KEY_MEMO); } catch { /* reessaye au prochain lancement, sans effet si rien ne correspond */ }
  return Object.keys(patch).length > 0;
}
