/**
 * 27 octobre 2026 : l'apercu de TA scene et de TON personnage dans Personnaliser et les Reglages, exactement comme
 * l'accueil (meme scene du jour, meme image retournee pour les scenes en miroir, meme dojo qui suit l'heure), relu
 * a chaque retour sur l'ecran. Avant, ces apercus passaient par sceneMeta, qui ne connaissait que les premieres
 * scenes et montrait le Dojo pour les autres (Paris a moto, par exemple).
 */
import { useCallback, useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { Espace, SceneId } from '@/lib/v2/espace';
import { getEspace } from '@/lib/v2/espace';
import { imageMiroir } from '@/lib/v2/espace/miroir';
import { devNow } from '@/lib/v2/creator/devClock';
import { sceneForNow } from '@/components/yoroi/v2/accueil/images';
import { sceneMeta } from './assets';

/** L'image de la scene telle que sur ton accueil a cet instant */
export function imageDeTaScene(scene: SceneId, date: Date = devNow()): ImageSourcePropType {
  return imageMiroir(scene) ?? sceneForNow(scene, date);
}

/** Le nom de la scene (« Paris à moto »), pour toutes les scenes */
export function nomDeTaScene(scene: SceneId): string {
  return sceneMeta(scene).nom;
}

/**
 * Ton espace, relu au retour sur l'ecran (useFocusEffect) : la scene et le personnage choisis dans un autre ecran
 * apparaissent des que tu reviens, meme si l'evenement de mise a jour est passe pendant que l'ecran etait cache.
 */
export function useEspaceAuRetour(espace: Espace): Espace {
  const [frais, setFrais] = useState<Espace>(espace);
  useEffect(() => setFrais(espace), [espace]);
  useFocusEffect(
    useCallback(() => {
      let vivant = true;
      getEspace()
        .then((e) => {
          if (vivant && e) setFrais(e);
        })
        .catch(() => {});
      return () => {
        vivant = false;
      };
    }, []),
  );
  return frais;
}
