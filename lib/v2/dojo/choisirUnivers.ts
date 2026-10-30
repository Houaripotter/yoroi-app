/**
 * Vague 45 : le choix de l'univers (Japon, Classique ou Sans personnage), une seule regle pour
 * l'onboarding, les Reglages (Ton personnage) et le choix du personnage (/avatar-selection).
 *  - Japon : univers 'japon', le Guerrier ou la Guerriere ; une scene Classique repasse au Dojo.
 *  - Classique : univers 'classique', le Sportif ou la Sportive ; une scene du Japon passe a la salle de sport.
 *  - Sans personnage : univers 'classique', personnage 'aucun' ; une scene du Japon passe a la salle de sport.
 * Le genre reste garde dans le profil (avatar_gender), comme pour le Guerrier : rien ne se perd
 * quand on passe par « Sans personnage » puis qu'on revient a un personnage.
 * L'XP, les rangs et le journal d'XP ne sont jamais touches. Aucune migration : sans choix, on reste au Japon.
 * 30 octobre 2026 (Houari : choisir un personnage changeait la scene qu'il avait choisie) : la scene choisie n'est
 * plus jamais touchee, ni sa rotation. La scene assortie a l'univers n'est posee que si aucune scene n'a jamais ete
 * choisie (sceneJamaisChoisie), et elle ne compte pas comme un choix.
 */
import { DeviceEventEmitter } from 'react-native';
import { getProfile, saveProfile } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { getEspace, saveEspace, sceneJamaisChoisie, type Espace } from '@/lib/v2/espace';
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
  // 30 octobre 2026 : une scene deja choisie (ou une rotation) reste telle quelle
  const libre = sceneJamaisChoisie(e);

  if (choix === 'japon') {
    patch.univers = 'japon';
    patch.personnage = `guerrier_${g}`;
    if (libre && estSceneClassique(sceneChoisie)) patch.scene = 'dojo';
  } else {
    patch.univers = 'classique';
    patch.personnage = choix === 'classique' ? `classique_${g}` : SANS_PERSONNAGE;
    // une scene du pack Nature et ville (ou Voyages, 18 octobre) est neutre aussi : elle reste
    if (libre && !(estSceneClassique(sceneChoisie) || estSceneNature(sceneChoisie) || estSceneVie(sceneChoisie) || estSceneVoyage(sceneChoisie))) patch.scene = 'classique_salle_jour';
  }
  // la scene par defaut d'un personnage n'est pas un choix : la suivante pourra encore suivre le personnage
  if (patch.scene !== undefined) patch.sceneChoisie = false;

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

