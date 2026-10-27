/**
 * Illustrations des 36 sceaux (Gemini, detourees), avec repli sur le tampon dessine.
 */
import React from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Hanko } from './Hanko';

import { universCourant } from '@/lib/v2/dojo/univers';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';

/**
 * 27 octobre 2026 : le sticker de chaque sceau (reglage Illustrations sur Stickers, les deux univers).
 * Meme nom sauf cerisier (sakura), haltere (musculation), carte (carte_tresor) ; dans l'univers classique,
 * le torii est la cle doree (cle).
 */
export const SEAL_STICKERS: Record<string, NomSticker> = {
  bambou: 'bambou', cerisier: 'sakura', flamme: 'flamme', fuji: 'fuji', lanterne: 'lanterne', lune_soleil: 'lune_soleil', pont: 'pont', sablier: 'sablier', sentier: 'sentier',
  barre: 'barre', bras: 'bras', chaine: 'chaine', enclume: 'enclume', haltere: 'musculation', kettlebell: 'kettlebell', marteau: 'marteau', poing: 'poing', rocher: 'rocher',
  bandes: 'bandes', ceinture_nouee: 'ceinture_nouee', eventail: 'eventail', gants: 'gants', gong: 'gong', kabuto: 'kabuto', katanas: 'katanas', kimono: 'kimono', oni: 'oni',
  appareil_photo: 'appareil_photo', balance: 'balance', boussole: 'boussole', carte: 'carte_tresor', chaussure: 'chaussure', lanterne_papier: 'lanterne_papier', metre_ruban: 'metre_ruban', tapis: 'tapis', torii: 'torii',
};

/** Le sticker d'un sceau dans l'univers donne (null : pas de sticker, l'illustration d'avant) */
export function stickerDuSceau(id: string, classique: boolean): NomSticker | null {
  if (classique && id === 'torii') return 'cle';
  return SEAL_STICKERS[id] ?? null;
}

export const SEAL_IMAGES: Record<string, ImageSourcePropType> = {
  bambou: require('@/assets/avatars/app/sceaux/regularite/bambou.webp'),
  cerisier: require('@/assets/avatars/app/sceaux/regularite/cerisier.webp'),
  flamme: require('@/assets/avatars/app/sceaux/regularite/flamme.webp'),
  fuji: require('@/assets/avatars/app/sceaux/regularite/fuji.webp'),
  lanterne: require('@/assets/avatars/app/sceaux/regularite/lanterne.webp'),
  lune_soleil: require('@/assets/avatars/app/sceaux/regularite/lune_soleil.webp'),
  pont: require('@/assets/avatars/app/sceaux/regularite/pont.webp'),
  sablier: require('@/assets/avatars/app/sceaux/regularite/sablier.webp'),
  sentier: require('@/assets/avatars/app/sceaux/regularite/sentier.webp'),
  barre: require('@/assets/avatars/app/sceaux/force/barre.webp'),
  bras: require('@/assets/avatars/app/sceaux/force/bras.webp'),
  chaine: require('@/assets/avatars/app/sceaux/force/chaine.webp'),
  enclume: require('@/assets/avatars/app/sceaux/force/enclume.webp'),
  haltere: require('@/assets/avatars/app/sceaux/force/haltere.webp'),
  kettlebell: require('@/assets/avatars/app/sceaux/force/kettlebell.webp'),
  marteau: require('@/assets/avatars/app/sceaux/force/marteau.webp'),
  poing: require('@/assets/avatars/app/sceaux/force/poing.webp'),
  rocher: require('@/assets/avatars/app/sceaux/force/rocher.webp'),
  bandes: require('@/assets/avatars/app/sceaux/combat/bandes.webp'),
  ceinture_nouee: require('@/assets/avatars/app/sceaux/combat/ceinture_nouee.webp'),
  eventail: require('@/assets/avatars/app/sceaux/combat/eventail.webp'),
  gants: require('@/assets/avatars/app/sceaux/combat/gants.webp'),
  gong: require('@/assets/avatars/app/sceaux/combat/gong.webp'),
  kabuto: require('@/assets/avatars/app/sceaux/combat/kabuto.webp'),
  katanas: require('@/assets/avatars/app/sceaux/combat/katanas.webp'),
  kimono: require('@/assets/avatars/app/sceaux/combat/kimono.webp'),
  oni: require('@/assets/avatars/app/sceaux/combat/oni.webp'),
  appareil_photo: require('@/assets/avatars/app/sceaux/decouverte/appareil_photo.webp'),
  balance: require('@/assets/avatars/app/sceaux/decouverte/balance.webp'),
  boussole: require('@/assets/avatars/app/sceaux/decouverte/boussole.webp'),
  carte: require('@/assets/avatars/app/sceaux/decouverte/carte.webp'),
  chaussure: require('@/assets/avatars/app/sceaux/decouverte/chaussure.webp'),
  lanterne_papier: require('@/assets/avatars/app/sceaux/decouverte/lanterne_papier.webp'),
  metre_ruban: require('@/assets/avatars/app/sceaux/decouverte/metre_ruban.webp'),
  tapis: require('@/assets/avatars/app/sceaux/decouverte/tapis.webp'),
  torii: require('@/assets/avatars/app/sceaux/decouverte/torii.webp'),
};

/** 18 octobre 2026 : dessins sans le Japon pour l'univers Classique (memes identifiants, noms dans dojoAffichage.ts) */
export const SEAL_IMAGES_CLASSIQUE: Record<string, ImageSourcePropType> = {
  fuji: require('@/assets/avatars/app/sceaux/classique/fuji.webp'),
  cerisier: require('@/assets/avatars/app/sceaux/classique/cerisier.webp'),
  kimono: require('@/assets/avatars/app/sceaux/classique/kimono.webp'),
  katanas: require('@/assets/avatars/app/sceaux/classique/katanas.webp'),
  kabuto: require('@/assets/avatars/app/sceaux/classique/kabuto.webp'),
  oni: require('@/assets/avatars/app/sceaux/classique/oni.webp'),
  torii: require('@/assets/avatars/app/sceaux/classique/torii.webp'),
  lanterne_papier: require('@/assets/avatars/app/sceaux/classique/lanterne_papier.webp'),
};

type Props = { id: string; kanji?: string; color?: string; size?: number; earned?: boolean };

/** Sceau illustre ; non gagne : estompe. Sans image, le tampon dessine. */
export function SealMedal({ id, color, size = 62, earned = true }: Props) {
  const illus = useIllustrations();
  const classique = universCourant() === 'classique';
  const ancien = (classique ? SEAL_IMAGES_CLASSIQUE[id] : undefined) ?? SEAL_IMAGES[id];
  const st = illus.stickers ? stickerDuSceau(id, classique) : null;
  const src = st ? illus.img(st) : ancien;
  if (!src) return <Hanko glyph="etoile" color={color} size={size} earned={earned} shape="rond" />;
  return (
    <View style={{ width: size, height: size, opacity: earned ? 1 : 0.28 }} accessibilityIgnoresInvertColors>
      <Image source={src} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
}
