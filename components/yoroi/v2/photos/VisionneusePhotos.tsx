/**
 * Visionneuse plein ecran du coffre (vague 39) : glisse d'une photo a l'autre,
 * date complete, poids, pose a choisir, suppression avec confirmation dans l'app.
 */
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { Ink } from '../Ink';
import { Sheet } from '../progres/Sheet';
import type { Photo } from '@/lib/storage';
import { dateComplete, kg, poseOf, POSES } from '@/lib/v2/photos/outils';
import type { Pose } from '@/lib/v2/photos/outils';
import { traduire } from '@/lib/i18n/tr';

const NOIR = '#0E0F13';
const BLANC = '#FFFFFF';

type Props = {
  photos: Photo[];
  startId: string | null;
  onClose: () => void;
  onDelete: (p: Photo) => void;
  onPose: (p: Photo, pose: Pose | null) => void;
};

export function VisionneusePhotos({ photos, startId, onClose, onDelete, onPose }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const startIndex = Math.max(0, photos.findIndex((p) => p.id === startId));
  const [index, setIndex] = useState(startIndex);
  const [confirm, setConfirm] = useState<Photo | null>(null);
  const list = useRef<FlatList<Photo>>(null);

  useEffect(() => {
    if (startId) setIndex(startIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startId]);

  const visible = !!startId && photos.length > 0;
  const cur = photos[Math.min(index, photos.length - 1)];

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: NOIR }}>
        {visible ? (
          <FlatList
            ref={list}
            data={photos}
            keyExtractor={(p) => p.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={startIndex}
            getItemLayout={(_d, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / width);
              if (i !== index) {
                selectionAsync().catch(() => {});
                setIndex(i);
              }
            }}
            onScroll={(e) => {
              // sur le web, onMomentumScrollEnd n'arrive pas toujours
              const i = Math.round(e.nativeEvent.contentOffset.x / width);
              if (i !== index && Math.abs(e.nativeEvent.contentOffset.x - i * width) < 2) setIndex(i);
            }}
            scrollEventThrottle={32}
            renderItem={({ item }) => <Image source={{ uri: item.file_uri }} style={{ width, height }} resizeMode="contain" />}
          />
        ) : null}

        <View style={{ position: 'absolute', top: insets.top + 10, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={traduire("Fermer")} hitSlop={10} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' }}>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={BLANC} strokeWidth={2.6} strokeLinecap="round" /></Svg>
          </Pressable>
          <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)' }}>
            <Ink size={13} weight="extraBold" color={BLANC}>{traduire("{0} sur {1}", index + 1, photos.length)}</Ink>
          </View>
          <Pressable onPress={() => cur && setConfirm(cur)} accessibilityRole="button" accessibilityLabel={traduire("Supprimer la photo")} hitSlop={10} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' }}>
            <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"><Path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" stroke={BLANC} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
        </View>

        {cur ? (
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16, padding: 16, borderRadius: 22, backgroundColor: 'rgba(14,15,19,0.72)', gap: 10 }}>
            <View style={{ gap: 2 }}>
              <Ink size={17} weight="extraBold" color={BLANC}>{dateComplete(cur.date.slice(0, 10))}</Ink>
              <Ink size={14} color="rgba(255,255,255,0.75)" numberOfLines={2}>{[cur.weight ? kg(cur.weight) : 'Sans poids associé', cur.notes].filter(Boolean).join(', ')}</Ink>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Ink size={12} weight="bold" color="rgba(255,255,255,0.75)" style={{ marginRight: 4 }}>{traduire("Pose")}</Ink>
              {POSES.map((p) => {
                const on = poseOf(cur) === p.value;
                return (
                  <Pressable key={p.value} onPress={() => { selectionAsync().catch(() => {}); onPose(cur, on ? null : p.value); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center', backgroundColor: on ? BLANC : 'rgba(255,255,255,0.14)' }}>
                    <Ink size={13} weight="extraBold" color={on ? NOIR : BLANC}>{traduire(p.label)}</Ink>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {confirm ? (
          <Sheet
            visible
            onClose={() => setConfirm(null)}
            title={traduire("Supprimer cette photo ?")}
            text={traduire("La photo du {0} sera effacée de ton coffre. Ce n’est pas réversible.", dateComplete(confirm.date.slice(0, 10)))}
            actions={[
              { label: traduire('Supprimer'), tone: 'danger', onPress: () => { const p = confirm; setConfirm(null); if (index >= photos.length - 1) setIndex(Math.max(0, photos.length - 2)); onDelete(p); } },
              { label: traduire('Garder'), onPress: () => setConfirm(null) },
            ]}
          />
        ) : null}
      </View>
    </Modal>
  );
}
