/**
 * 31 octobre 2026 (Houari : « Le personnage que tu me mets partout, j'aime pas. Soit tu mets le personnage de
 * l'utilisateur, soit tu mets rien. ») : le seul personnage qu'un écran a le droit de montrer, celui que tu as
 * choisi (Ton espace, au rang de ton armure). « Sans personnage » : null, et l'écran se met en page sans figure.
 * Le mode démo suit la même règle : l'espace du profil démo porte son personnage.
 * Tant que rien n'est lu : null (jamais une figure par défaut, même une fraction de seconde), puis la dernière
 * valeur lue est gardée en mémoire pour les écrans suivants.
 */
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { ESPACE_CHANGED_EVENT, getEspace } from '@/lib/v2/espace';
import type { Espace } from '@/lib/v2/espace';
import { ARMURE_CHANGED_EVENT, getArmureState } from '@/lib/v2/armure';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { personnageImage } from '@/components/yoroi/v2/espace/assets';

type Lu = { cle: string | null; rang: number };

let memo: Lu | null = null;

/** L'image de ton personnage, ou null (« Sans personnage », ou rien de lu) */
export function imageDuPersonnage(lu: Lu | null): ImageSourcePropType | null {
  if (!lu || !lu.cle || !aUnPersonnage(lu.cle)) return null;
  const genre: 'h' | 'f' = lu.cle.endsWith('_f') ? 'f' : 'h';
  return personnageImage(lu.cle, Math.max(0, Math.min(4, lu.rang)), genre);
}

async function lire(): Promise<Lu> {
  const [e, a] = await Promise.all([getEspace().catch(() => null as Espace | null), getArmureState().catch(() => null)]);
  return { cle: e?.personnage ?? null, rang: a?.rank?.index ?? 0 };
}

export function usePersonnageUtilisateur(): ImageSourcePropType | null {
  const [lu, setLu] = useState<Lu | null>(memo);
  useEffect(() => {
    let vivant = true;
    const relire = () => {
      void lire().then((x) => {
        memo = x;
        if (vivant) setLu(x);
      });
    };
    relire();
    const subs = [
      DeviceEventEmitter.addListener(ESPACE_CHANGED_EVENT, relire),
      DeviceEventEmitter.addListener(ARMURE_CHANGED_EVENT, relire),
      DeviceEventEmitter.addListener('YOROI_DEMO_CHANGED', relire),
      DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', relire),
    ];
    return () => {
      vivant = false;
      subs.forEach((s) => s.remove());
    };
  }, []);
  return imageDuPersonnage(lu);
}
