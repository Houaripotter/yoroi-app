/**
 * Studio, Tests de l'appareil : « Aperçu des scènes animées » (18 octobre 2026).
 * Fait defiler les 12 scenes du pack Voyages avec leur mouvement reel (19 octobre 2026 : video en boucle
 * ou calques mobiles, lib/v2/scenes/medias.ts) et leurs effets en code (components/yoroi/v2/scenes/SceneAnimee.tsx).
 * Deux boutons pour comparer : le mouvement, les effets.
 * Seule la scene affichee s'anime ; les voisines sont montees mais figees, les autres pas montees du tout.
 */
import React, { useRef, useState } from 'react';
import { Modal, ScrollView, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, RoundButton } from '@/components/yoroi/v2/espace/ui';
import { SceneAnimee } from '@/components/yoroi/v2/scenes/SceneAnimee';
import { useReduireAnimations } from '@/components/yoroi/v2/accueil/SceneAnimee';
import { MAX_PARTICULES, RATIO_SCENES, SCENES_ANIMEES_CODE, particulesScene, resumeEffets } from '@/lib/v2/scenes/animations';
import { videoDeScene } from '@/lib/v2/scenes/medias';
import type { SceneAnimeeId } from '@/lib/v2/scenes/animations';
import { Chip, ChipWrap, Note } from './parts';
import { traduire } from '@/lib/i18n/tr';

/** Images fixes des scenes du pack Voyages */
const IMAGES_APERCU: Partial<Record<SceneAnimeeId, ImageSourcePropType>> = {
  yatai_pont: require('@/assets/avatars/app/scenes_voyages/sc01_yatai_pont.webp'),
  moto_tour_eiffel: require('@/assets/avatars/app/scenes_voyages/sc02_moto_tour_eiffel.webp'),
  rue_tokyo: require('@/assets/avatars/app/scenes_voyages/sc03_rue_tokyo.webp'),
  passage_niveau_mer: require('@/assets/avatars/app/scenes_voyages/sc04_passage_niveau_mer.webp'),
  toit_train: require('@/assets/avatars/app/scenes_voyages/sc05_toit_train.webp'),
  hublot_avion: require('@/assets/avatars/app/scenes_voyages/sc06_hublot_avion.webp'),
  aile_avion: require('@/assets/avatars/app/scenes_voyages/sc07_aile_avion.webp'),
  balancoire_plage: require('@/assets/avatars/app/scenes_voyages/sc08_balancoire_plage.webp'),
  bivouac_desert: require('@/assets/avatars/app/scenes_voyages/sc09_bivouac_desert.webp'),
  voie_lactee_nuages: require('@/assets/avatars/app/scenes_voyages/sc10_voie_lactee_nuages.webp'),
  lampadaire_hiver: require('@/assets/avatars/app/scenes_voyages/sc11_lampadaire_hiver.webp'),
  voie_lactee_cote: require('@/assets/avatars/app/scenes_voyages/sc12_voie_lactee_cote.webp'),
};

export function ApercuScenes({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const reduire = useReduireAnimations();
  const [index, setIndex] = useState(0);
  const [effets, setEffets] = useState(true);
  const [mouvement, setMouvement] = useState(true);
  const [format, setFormat] = useState<'image' | 'dojo'>('image');
  const pager = useRef<ScrollView>(null);

  const sw = W - 32;
  // le format reel des images (1200 x 670, paysage), puis en dessous la scene recadree comme dans le Dojo
  // format reel des images (1200 x 670, paysage), ou le cadre haut de la scene du Dojo (image rognee)
  const shImage = Math.round(sw / RATIO_SCENES);
  const shDojo = Math.round(Math.max(shImage, Math.min(370, Math.max(320, W), H - insets.top - insets.bottom - 280)));
  const sh = format === 'image' ? shImage : shDojo;
  const total = SCENES_ANIMEES_CODE.length;
  const courante = SCENES_ANIMEES_CODE[index];

  const aller = (i: number) => {
    const n = Math.max(0, Math.min(total - 1, i));
    setIndex(n);
    pager.current?.scrollTo({ x: n * W, animated: true });
  };
  const finDefilement = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const n = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, W));
    if (n !== index) setIndex(Math.max(0, Math.min(total - 1, n)));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, marginBottom: 10 }}>
          <RoundButton icon="close" label={traduire("Fermer")} onPress={onClose} />
          <View style={{ flex: 1 }}>
            <Ink size={17} weight="extraBold" numberOfLines={1}>{traduire("Aperçu des scènes animées")}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire("{0} sur {1}, glisse pour changer", index + 1, total)}</Ink>
          </View>
        </View>

        <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={finDefilement} style={{ flexGrow: 0 }}>
          {SCENES_ANIMEES_CODE.map((s, i) => (
            <View key={s.id} style={{ width: W, alignItems: 'center' }}>
              {Math.abs(i - index) <= 1 ? (
                <SceneAnimee scene={s.id} source={IMAGES_APERCU[s.id] ?? null} width={sw} height={sh} actif={visible && i === index} effets={effets} mobiles={mouvement} video={mouvement ? undefined : false} borderRadius={24} />
              ) : (
                <View style={{ width: sw, height: sh, borderRadius: 24, backgroundColor: s.fond[1] }} />
              )}
            </View>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8, flex: 1 }}>
          <Ink size={16} weight="extraBold" numberOfLines={1}>{`${courante.numero}. ${courante.nom}`}</Ink>
          {courante.mouvement ? (
            <Ink size={13} numberOfLines={3}>
              {`${videoDeScene(courante.id) != null ? traduire('Vidéo en boucle') : 'Calques mobiles'} : ${courante.mouvement}`}
            </Ink>
          ) : null}
          <Ink size={13} color={c.textSecondary} numberOfLines={2}>
            {traduire("Effets en plus : {0}. {1} éléments animés sur {2}.", resumeEffets(courante).join(', '), particulesScene(courante), MAX_PARTICULES)}
          </Ink>
          <ChipWrap>
            <Chip label={mouvement ? 'Mouvement visible' : traduire('Mouvement masqué')} on={mouvement} onPress={() => setMouvement((v) => !v)} accessibilityLabel={traduire("Montrer ou masquer le mouvement de la scène")} />
            <Chip label={effets ? 'Effets visibles' : traduire('Effets masqués')} on={effets} onPress={() => setEffets((v) => !v)} accessibilityLabel={traduire("Montrer ou masquer les effets")} />
            <Chip label={traduire("Image entière")} on={format === 'image'} onPress={() => setFormat('image')} />
            <Chip label={traduire("Cadre du Dojo")} on={format === 'dojo'} onPress={() => setFormat('dojo')} />
          </ChipWrap>
          {reduire ? <Note tone="warn">{traduire("« Réduire les animations » est activé sur ce téléphone : les scènes restent fixes, c’est voulu.")}</Note> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 'auto' }}>
            <View style={{ flex: 1 }}>
              <Button tone="ghost" small icon="back" label={traduire("Précédente")} disabled={index === 0} onPress={() => aller(index - 1)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button tone="ink" small icon="chevron" label="Suivante" disabled={index === total - 1} onPress={() => aller(index + 1)} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default ApercuScenes;
