/**
 * 18 octobre 2026 : la fete d'une scene gagnee avec la serie de jours (7, 30 et 100 jours d'affilee).
 * La scene s'affiche animee (SceneAnimee), avec un bouton pour la mettre tout de suite.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { SceneAnimee } from '@/components/yoroi/v2/scenes/SceneAnimee';
import { SCENES_VOYAGES } from '@/lib/v2/espace/voyages';
import { palierDeScene } from '@/lib/v2/dojo/recompensesScenes';
import { CarteSerie } from '@/components/yoroi/v2/dojo/CarteSerie';
import { shareCard } from '@/lib/v2/partage/capture';
import { getProfile } from '@/lib/database';

const OR = '#F2C14E';

export function SceneGagnee({ sceneId, onMettre, onClose }: { sceneId: string | null; onMettre: (id: string) => void; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const [mise, setMise] = useState(false);
  // la carte a partager, rendue hors de l'ecran puis capturee
  const carte = useRef<View>(null);
  const [prenom, setPrenom] = useState<string | null>(null);
  useEffect(() => {
    getProfile()
      .then((p) => setPrenom(p?.name?.trim().split(' ')[0] || null))
      .catch(() => setPrenom(null));
  }, []);
  const s = SCENES_VOYAGES.find((x) => x.id === sceneId) ?? null;
  const palier = sceneId ? palierDeScene(sceneId) : null;
  const w = Math.min(360, width - 48);
  const h = Math.round(w * 0.62);
  return (
    <Modal visible={!!s} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,12,22,0.94)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 18 }}>
        {s ? (
          <>
            <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center', gap: 6 }}>
              <Ink size={14} weight="extraBold" color={OR}>{palier ? `${palier} jour${palier > 1 ? 's' : ''} d’affilée` : 'Nouvelle scène'}</Ink>
              <Ink size={26} weight="black" color="#FFFFFF" style={{ textAlign: 'center' }}>Tu as gagné une scène</Ink>
            </Animated.View>
            <Animated.View entering={ZoomIn.duration(420)} style={{ borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: OR }}>
              <SceneAnimee source={s.image} scene={s.anim} width={w} height={h} accessibilityLabel={`Scène ${s.nom}`} />
            </Animated.View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Ink size={20} weight="black" color="#FFFFFF">{s.nom}</Ink>
              <Ink size={14} color="rgba(255,255,255,0.75)" style={{ textAlign: 'center' }}>Elle est à toi pour toujours, même si ta série s’arrête un jour.</Ink>
            </View>
            <View style={{ alignSelf: 'stretch', gap: 8 }}>
              <Pressable
                onPress={() => {
                  setMise(true);
                  onMettre(s.id);
                }}
                disabled={mise}
                accessibilityRole="button"
                style={({ pressed }) => ({ minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#D9A93A' : OR })}
              >
                <Ink size={17} weight="black" color="#1D2029">{mise ? 'C’est ta scène' : 'La mettre maintenant'}</Ink>
              </Pressable>
              {palier ? (
                <Pressable
                  onPress={() => void shareCard(carte, 'Partager ma série YOROI', `${palier} jours d’affilée sur YOROI`, 'serie')}
                  accessibilityRole="button"
                  style={({ pressed }) => ({ minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: OR, backgroundColor: pressed ? 'rgba(242,193,78,0.15)' : 'transparent' })}
                >
                  <Ink size={16} weight="black" color={OR}>Partager ma série</Ink>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={15} weight="bold" color="rgba(255,255,255,0.7)">{mise ? 'Fermer' : 'Plus tard'}</Ink>
              </Pressable>
            </View>
            {palier ? (
              <View pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0 }}>
                <View ref={carte} collapsable={false}>
                  <CarteSerie jours={palier} image={s.image} nomScene={s.nom} prenom={prenom} width={360} />
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </Modal>
  );
}
