/**
 * Camera des photos de forme (vague 39) : la derniere photo de la meme pose en transparence
 * par-dessus l'image, pour garder le meme cadrage, et un minuteur de 5 ou 10 secondes
 * pour poser le telephone et se placer.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, Linking, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { Ink } from '../Ink';
import type { Photo } from '@/lib/storage';
import { dateCourte, dernierePose, POSES } from '@/lib/v2/photos/outils';
import type { Pose } from '@/lib/v2/photos/outils';
import { logger } from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

const NOIR = '#0E0F13';
const BLANC = '#FFFFFF';

type Props = {
  visible: boolean;
  photos: Photo[];
  initialPose: Pose | null;
  onClose: () => void;
  onTaken: (uri: string, pose: Pose | null) => void;
};

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: on ? BLANC : 'rgba(255,255,255,0.14)' }}
    >
      <Ink size={14} weight="extraBold" color={on ? NOIR : BLANC}>{label}</Ink>
    </Pressable>
  );
}

export function CameraFantome({ visible, photos, initialPose, onClose, onTaken }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [pose, setPose] = useState<Pose | null>(initialPose);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [ghostOn, setGhostOn] = useState(true);
  const [ghostLevel, setGhostLevel] = useState(0.35);
  const [timer, setTimer] = useState<0 | 5 | 10>(0);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setPose(initialPose);
      setCount(null);
      if (perm && !perm.granted && perm.canAskAgain) requestPerm().catch(() => {});
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const ghost = dernierePose(photos, pose);
  const frameW = width;
  const frameH = Math.min(Math.round(width * (4 / 3)), height - insets.top - insets.bottom - 230);

  const shoot = async () => {
    if (!cam.current || busy) return;
    setBusy(true);
    try {
      const r = await cam.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (r?.uri) {
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        onTaken(r.uri, pose);
      }
    } catch (err) {
      logger.error('Prise de photo impossible', err);
    } finally {
      setBusy(false);
    }
  };

  const press = () => {
    if (count !== null) {
      // un deuxieme appui annule le compte a rebours
      if (tick.current) clearInterval(tick.current);
      setCount(null);
      return;
    }
    if (!timer) {
      impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
      shoot();
      return;
    }
    let left = timer;
    setCount(left);
    tick.current = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        if (tick.current) clearInterval(tick.current);
        setCount(null);
        shoot();
      } else {
        selectionAsync().catch(() => {});
        setCount(left);
      }
    }, 1000);
  };

  const close = () => {
    if (tick.current) clearInterval(tick.current);
    setCount(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: NOIR, paddingTop: insets.top + 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 48 }}>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={traduire("Fermer la caméra")} hitSlop={10} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' }}>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={BLANC} strokeWidth={2.6} strokeLinecap="round" /></Svg>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {POSES.map((p) => (
              <Chip key={p.value} label={traduire(p.label)} on={pose === p.value} onPress={() => setPose(pose === p.value ? null : p.value)} />
            ))}
          </View>
          <Pressable onPress={() => { selectionAsync().catch(() => {}); setFacing((f) => (f === 'back' ? 'front' : 'back')); }} accessibilityRole="button" accessibilityLabel={traduire("Changer de caméra")} hitSlop={10} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' }}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="M4 9h3l2-3h6l2 3h3v10H4zM9 13.5a3 3 0 0 1 5.3-1.9M15 13.5a3 3 0 0 1-5.3 1.9M14.5 10.5v1.5H13M9.5 16.5V15H11" stroke={BLANC} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Pressable>
        </View>

        <View style={{ width: frameW, height: frameH, marginTop: 10, overflow: 'hidden', backgroundColor: '#000' }}>
          {perm?.granted ? (
            <CameraView ref={cam} style={{ flex: 1 }} facing={facing} mirror={facing === 'front'} animateShutter />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
              <Ink size={16} weight="extraBold" color={BLANC} style={{ textAlign: 'center' }}>{traduire("YOROI a besoin de ta caméra")}</Ink>
              <Ink size={14} color="rgba(255,255,255,0.75)" style={{ textAlign: 'center' }}>{traduire("La photo reste sur ton téléphone. Si tu as refusé, autorise la caméra dans les réglages de ton téléphone.")}</Ink>
              {/* 18 octobre 2026 : refus definitif, iOS ne redemande plus, le bouton ouvre les reglages du telephone */}
              <Pressable onPress={() => (perm && !perm.canAskAgain ? Linking.openSettings().catch(() => {}) : requestPerm().catch(() => {}))} accessibilityRole="button" style={{ minHeight: 48, paddingHorizontal: 20, borderRadius: 16, backgroundColor: BLANC, justifyContent: 'center' }}>
                <Ink size={15} weight="extraBold" color={NOIR}>{perm && !perm.canAskAgain ? traduire('Ouvrir les réglages') : traduire('Autoriser la caméra')}</Ink>
              </Pressable>
            </View>
          )}
          {perm?.granted && ghost && ghostOn ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: frameW, height: frameH }}>
              <Image source={{ uri: ghost.file_uri }} style={{ width: frameW, height: frameH, opacity: ghostLevel }} resizeMode="cover" />
            </View>
          ) : null}
          {count !== null ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={120} weight="black" color={BLANC} style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 12 }}>{String(count)}</Ink>
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 12, gap: 6 }}>
          <Ink size={13} color="rgba(255,255,255,0.75)" numberOfLines={2}>
            {ghost
              ? traduire("Cale-toi sur ta photo du {0} en transparence : même place, même distance.", dateCourte(ghost.date.slice(0, 10)))
              : pose
                ? traduire('Première photo de cette pose : elle servira de repère aux suivantes.')
                : traduire('Choisis une pose en haut pour retrouver le même cadrage la prochaine fois.')}
          </Ink>
        </View>

        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: insets.bottom + 8 }}>
          <Pressable
            disabled={!ghost}
            onPress={() => {
              selectionAsync().catch(() => {});
              if (!ghostOn) {
                setGhostOn(true);
                setGhostLevel(0.35);
              } else if (ghostLevel < 0.5) setGhostLevel(0.55);
              else setGhostOn(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={traduire("Transparence de la photo repère")}
            style={{ width: 84, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', opacity: ghost ? 1 : 0.4 }}
          >
            <Ink size={12} weight="bold" color="rgba(255,255,255,0.75)">{traduire("Repère")}</Ink>
            <Ink size={14} weight="extraBold" color={BLANC}>{!ghost || !ghostOn ? traduire('Caché') : ghostLevel < 0.5 ? traduire('Léger') : 'Fort'}</Ink>
          </Pressable>

          <Pressable onPress={press} disabled={!perm?.granted || busy} accessibilityRole="button" accessibilityLabel={count !== null ? traduire('Annuler le minuteur') : traduire('Prendre la photo')} style={({ pressed }) => ({ width: 78, height: 78, borderRadius: 39, borderWidth: 5, borderColor: BLANC, alignItems: 'center', justifyContent: 'center', opacity: pressed || busy ? 0.7 : 1 })}>
            <View style={{ width: count !== null ? 28 : 60, height: count !== null ? 28 : 60, borderRadius: count !== null ? 6 : 30, backgroundColor: BLANC }} />
          </Pressable>

          <Pressable onPress={() => { selectionAsync().catch(() => {}); setTimer((t) => (t === 0 ? 5 : t === 5 ? 10 : 0)); }} accessibilityRole="button" accessibilityLabel={traduire("Minuteur")} style={{ width: 84, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: timer ? BLANC : 'rgba(255,255,255,0.14)' }}>
            <Ink size={12} weight="bold" color={timer ? NOIR : 'rgba(255,255,255,0.75)'}>{traduire("Minuteur")}</Ink>
            <Ink size={14} weight="extraBold" color={timer ? NOIR : BLANC}>{timer ? `${timer} s` : traduire('Non')}</Ink>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
