/**
 * Rond de profil : photo ou personnage. Une seule source de verite pour l'accueil et Reglages.
 * - Quand l'utilisateur ajoute une photo, le rond passe sur "Ta photo" tout seul.
 * - Il peut revenir a "Personnage" dans Apparence : ce choix est alors respecte.
 * - Sans photo, on montre toujours le personnage choisi, jamais une icone vide.
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from '@/lib/database';
import { ESPACE_CHANGED_EVENT, getEspace, saveEspace } from '@/lib/v2/espace';
import type { Espace } from '@/lib/v2/espace';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { styleRondDe, type StyleRond } from '@/components/yoroi/v2/reglages/contour';

/** pose quand l'utilisateur a choisi lui-meme photo ou personnage */
const CHOIX_KEY = '@yoroi_identite_choisie_v1';

export async function markIdentiteChoisie(): Promise<void> {
  try {
    await AsyncStorage.setItem(CHOIX_KEY, 'true');
  } catch {
    // stockage indisponible
  }
}

/** A appeler quand une photo vient d'etre ajoutee (ou retiree) dans le profil */
export async function onPhotoChanged(photo: string | null): Promise<void> {
  await saveEspace({ identite: photo ? 'photo' : 'personnage' });
}

/**
 * Rattrapage : une photo existe mais le rond est reste sur le personnage sans que
 * l'utilisateur l'ait choisi (photo ajoutee avant cette correction). On passe sur la photo une fois.
 */
export async function syncIdentite(photo: string | null | undefined, espace?: Espace): Promise<void> {
  if (!photo) return;
  try {
    const e = espace ?? (await getEspace());
    if (e.identite === 'photo') return;
    const chosen = await AsyncStorage.getItem(CHOIX_KEY);
    if (chosen === 'true') return;
    await saveEspace({ identite: 'photo' });
  } catch {
    // on garde l'etat actuel
  }
}

/** Ce que le rond affiche maintenant : la photo si elle est choisie et presente, sinon le personnage */
export function useRondProfil(initial?: { photo?: string | null; personnage?: string }): { photo: string | null; personnage: string; contour: NonNullable<Espace['contourRond']>; style: StyleRond; reload: () => void } {
  const [photo, setPhoto] = useState<string | null>(initial?.photo ?? null);
  const [personnage, setPersonnage] = useState<string>(initial?.personnage ?? 'guerrier_h');
  // vague 41 : contour choisi dans Reglages (Fin par defaut)
  const [contour, setContour] = useState<NonNullable<Espace['contourRond']>>('fin');
  // 28 octobre 2026 : forme, epaisseur et badge du rond, avec la photo comme avec le personnage
  const [style, setStyle] = useState<StyleRond>(() => styleRondDe(null));

  const reload = useCallback(() => {
    (async () => {
      try {
        const [p, e] = await Promise.all([getProfile().catch(() => null), getEspace()]);
        const ph = p?.profile_photo || null;
        await syncIdentite(ph, e);
        const e2 = ph && e.identite !== 'photo' ? await getEspace() : e;
        setPersonnage(e2.personnage || 'guerrier_h');
        setContour(e2.contourRond ?? 'fin');
        setStyle(styleRondDe(e2));
        // Vague 45 : « Sans personnage », la photo s'affiche des qu'elle existe (sinon les initiales, RondInitiales)
        setPhoto((e2.identite === 'photo' || !aUnPersonnage(e2.personnage)) && ph ? ph : null);
      } catch {
        // on garde l'affichage actuel
      }
    })();
  }, []);

  useFocusEffect(reload);

  useEffect(() => {
    const subs = [
      DeviceEventEmitter.addListener('YOROI_PROFILE_CHANGED', reload),
      DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', reload),
      DeviceEventEmitter.addListener(ESPACE_CHANGED_EVENT, reload),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [reload]);

  return { photo, personnage, contour, style, reload };
}
