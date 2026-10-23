/**
 * Vague 45 : le choix de l'univers (Japon, Classique ou Sans personnage), une seule regle pour
 * l'onboarding, les Reglages (Ton personnage) et le choix du personnage (/avatar-selection).
 *  - Japon : univers 'japon', le Guerrier ou la Guerriere ; une scene Classique repasse au Dojo.
 *  - Classique : univers 'classique', le Sportif ou la Sportive ; une scene du Japon passe a la salle de sport.
 *  - Sans personnage : univers 'classique', personnage 'aucun' ; une scene du Japon passe a la salle de sport.
 * Le genre reste garde dans le profil (avatar_gender), comme pour le Guerrier : rien ne se perd
 * quand on passe par « Sans personnage » puis qu'on revient a un personnage.
 * L'XP, les rangs et le journal d'XP ne sont jamais touches. Aucune migration : sans choix, on reste au Japon.
 */
import { DeviceEventEmitter } from 'react-native';
import { getProfile, saveProfile } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { getEspace, saveEspace, type Espace } from '@/lib/v2/espace';
import { estSceneClassique } from '@/lib/v2/espace/classique';
import { estSceneNature } from '@/lib/v2/espace/nature';
import { estSceneVie } from '@/lib/v2/espace/packsScenes';
import { estSceneVoyage } from '@/lib/v2/espace/voyages';
import { writeOldAvatar } from '@/lib/v2/watchIdentity';
import { SANS_PERSONNAGE } from './univers';
import { parsePersonnage } from './personnages';

/** Les trois choix proposes a l'utilisateur */
export type ChoixUnivers = 'japon' | 'classique' | 'aucun';

export function isChoixUnivers(v: unknown): v is ChoixUnivers {
  return v === 'japon' || v === 'classique' || v === 'aucun';
}

/** Le choix actuel, lu dans l'espace (absent : Japon) */
export function choixUniversDe(e: Pick<Espace, 'personnage' | 'univers'> | null | undefined): ChoixUnivers {
  if (!e) return 'japon';
  const k = parsePersonnage(e.personnage).kind;
  if (k === 'aucun') return 'aucun';
  if (k === 'classique') return 'classique';
  return e.univers === 'classique' ? 'classique' : 'japon';
}

/** Genre du personnage : celui de la cle (Guerrier ou Classique), sinon celui du profil */
export function genreDuPersonnage(personnage: string | null | undefined, avatarGender?: string | null): 'h' | 'f' {
  const p = parsePersonnage(personnage);
  if (p.kind === 'guerrier' && (personnage === 'guerrier_h' || personnage === 'guerrier_f')) return p.gender;
  if (p.kind === 'classique') return p.gender;
  return avatarGender === 'femme' ? 'f' : 'h';
}

/** Applique le choix de l'univers. Renvoie l'espace enregistre. */
export async function choisirUnivers(choix: ChoixUnivers, genre: 'h' | 'f'): Promise<Espace> {
  const g: 'h' | 'f' = genre === 'f' ? 'f' : 'h';
  const e = await getEspace();
  // la scene choisie a la main (pas celle tiree au lancement par la rotation)
  const sceneChoisie = e.sceneFixe ?? e.scene;
  const patch: Partial<Espace> = {};

  if (choix === 'japon') {
    patch.univers = 'japon';
    patch.personnage = `guerrier_${g}`;
    if (estSceneClassique(sceneChoisie)) patch.scene = 'dojo';
    // la rotation du pack Classique s'arrete ; les autres rotations restent
    else if (e.sceneRotation === 'classique') patch.sceneRotation = undefined;
  } else {
    patch.univers = 'classique';
    patch.personnage = choix === 'classique' ? `classique_${g}` : SANS_PERSONNAGE;
    const rotationJapon = e.sceneRotation === 'lanternes' || e.sceneRotation === 'samourai';
    // une scene du pack Nature et ville (ou Voyages, 18 octobre) est neutre aussi : elle reste
    if (!(estSceneClassique(sceneChoisie) || estSceneNature(sceneChoisie) || estSceneVie(sceneChoisie) || estSceneVoyage(sceneChoisie)) || rotationJapon) patch.scene = 'classique_salle_jour';
  }

  // le genre reste garde dans le profil (lu par l'accueil, le profil et le choix du personnage).
  // Le rond de profil n'est pas touche : sans personnage, il montre de lui-meme ta photo ou tes initiales.
  try {
    const p = await getProfile();
    const avatar = g === 'f' ? 'femme' : 'homme';
    if (p && p.avatar_gender !== avatar) {
      await saveProfile({ ...p, avatar_gender: avatar });
      DeviceEventEmitter.emit('YOROI_PROFILE_CHANGED');
    }
  } catch (err) {
    logger.warn('Genre du personnage non enregistre', err);
  }

  const next = await saveEspace(patch);
  await writeOldAvatar(patch.personnage as string);
  return next;
}

