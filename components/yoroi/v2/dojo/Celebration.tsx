/**
 * Ecran plein, montre une seule fois : passage de rang (ou de dan) avec la nouvelle armure,
 * nouvelle etape de la piece d'armure en construction (vague 40, dans le Dojo), ou recapitulatif des sceaux gagnes
 * (un seul ecran, jamais vingt celebrations).
 * Vague 16 : un fond d'epoque vertical plein ecran (chateau sous la lune pour un rang, torii a l'aube
 * pour une plaque, pagode sous la neige pour les sceaux), sous un voile de nuit pour le texte blanc.
 * Vague 45 : l'univers du personnage (« Tu passes Régulier » dans l'univers Classique), et rien sur
 * le personnage quand l'utilisateur a choisi « Sans personnage » (la piece seule).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XP_VALUES, danLabel } from '@/lib/v2/armure';
import { Ink } from '@/components/yoroi/v2/Ink';
import { SealMedal } from './SealMedal';
import { ArmureEnConstruction, EtapesPiece } from './ArmureEnConstruction';
import { construction, pieceDuRang, piecesDe } from '@/lib/v2/dojo/pieces';
import { libelleConstruction, rangNom, rangTenue, universCourant } from '@/lib/v2/dojo/univers';
import type { Univers } from '@/lib/v2/dojo/univers';
import { nomSceau } from '@/lib/v2/dojo/dojoAffichage';
import { DOJO } from './parts';
import { useYoroiTheme } from '@/components/yoroi';
import type { ArmureRank, SealView } from '@/lib/v2/armure';
import { familyOf } from '@/lib/v2/dojo/seals';
import { FondEpoque } from '@/components/yoroi/v2/fonds/FondEpoque';

type Props = {
  visible: boolean;
  rankUp: ArmureRank | null;
  seals: SealView[];
  recap: boolean;
  /** plaque d'armure gagnee sans passage de rang (Dojo seulement) */
  plate?: { index: number; earned: number; total: number } | null;
  /** XP actuelle, pour nommer le palier vise par la plaque */
  xp?: number;
  image: ImageSourcePropType;
  /** garde pour compatibilite : la celebration utilise desormais un fond d'epoque vertical */
  scene?: ImageSourcePropType;
  /** Vague 45 : univers du personnage, l'univers actif par defaut */
  univers?: Univers;
  /** Vague 45 : faux pour « Sans personnage », aucune figure ni texte sur le personnage */
  avecPersonnage?: boolean;
  onClose: () => void;
};

export function Celebration({ visible, rankUp, seals, recap, plate, xp = 0, image, univers, avecPersonnage = true, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    rise.setValue(0);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    Animated.spring(rise, { toValue: 1, useNativeDriver: true, friction: 7, tension: 50 }).start();
  }, [visible, rise]);

  const showRank = !!rankUp;
  const showPlate = !showRank && !!plate;
  const isDan = !!rankUp && (rankUp.dan ?? 0) > 0;
  // vague 40 : la piece gagnee au rang, ou la piece en construction pour une nouvelle etape
  // Vague 45 : noms et pieces dans l'univers choisi
  const u: Univers = univers ?? universCourant();
  const nomRang = rankUp ? rangNom(rankUp.index, u) : '';
  const pieceRang = rankUp ? (isDan ? piecesDe(u).dan : pieceDuRang(rankUp.index, u)) : null;
  const cons = construction(xp, u);
  const etapeFaite = plate ? Math.max(1, Math.min(3, plate.earned)) : 0;
  const nomEtape = plate ? cons.piece.etapes[etapeFaite - 1] : '';
  const sealTitle = recap ? 'Tes sceaux déjà mérités' : seals.length > 1 ? 'Nouveaux sceaux' : 'Nouveau sceau';

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#14161E' }}>
        <FondEpoque fond={showRank ? 'chateau' : showPlate ? 'aube' : 'neige'} voile="sombre" />
        <LinearGradient colors={['rgba(20,22,30,0)', 'rgba(20,22,30,0.25)', 'rgba(20,22,30,0.7)']} locations={[0, 0.5, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none" />
        {/* tout defile au-dessus du bouton : rien ne passe dessous */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: showRank || showPlate ? 'flex-start' : 'flex-end', paddingTop: insets.top + 24, paddingBottom: 16, paddingHorizontal: 20, alignItems: 'center', gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {showRank ? (
            <>
              {/* Vague 45 : la figure seulement s'il y a un personnage */}
              {avecPersonnage ? (
                <Animated.View style={{ transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }, { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }], opacity: rise }}>
                  <Image
                    source={image}
                    style={{ width: 290, height: 380, shadowColor: DOJO.gold, shadowOpacity: 0.6, shadowRadius: 30 }}
                    resizeMode="contain"
                    accessibilityLabel={`Ton personnage au rang ${nomRang}`}
                  />
                </Animated.View>
              ) : (
                <View style={{ height: 40 }} />
              )}
              <Ink size={16} weight="bold" color="#B9BBC4">{isDan ? 'Nouveau dan' : 'Nouveau rang'}</Ink>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
                <Ink size={38} weight="black" tight color="#F2F1EC" numberOfLines={2} style={{ flexShrink: 1, textAlign: 'center' }}>{isDan ? nomRang : `Tu passes ${nomRang}`}</Ink>
              </View>
              {isDan ? (
                <Ink size={22} weight="black" color={DOJO.goldLight}>{danLabel(rankUp!.dan ?? 1)}</Ink>
              ) : avecPersonnage ? (
                <Ink size={16} color="#D9D6CC" style={{ textAlign: 'center' }}>{`Nouvelle tenue : ${rangTenue(rankUp!.index, u)}`}</Ink>
              ) : pieceRang ? (
                <Ink size={16} color="#D9D6CC" style={{ textAlign: 'center' }}>{`Nouvelle pièce : ${pieceRang.nom}`}</Ink>
              ) : null}
              {pieceRang ? (
                <ArmureEnConstruction piece={pieceRang} progres={1} taille={84} ton="sombre" eclat={visible} style={{ marginTop: 10 }} accessibilityLabel={`${pieceRang.nom}, pièce complète`} />
              ) : null}
            </>
          ) : showPlate ? (
            <>
              {avecPersonnage ? (
                <Animated.View style={{ transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }], opacity: rise }}>
                  <Image source={image} style={{ width: 230, height: 300 }} resizeMode="contain" accessibilityLabel="Ton personnage" />
                </Animated.View>
              ) : (
                <View style={{ height: 40 }} />
              )}
              <Ink size={16} weight="bold" color="#B9BBC4">{libelleConstruction(u)}</Ink>
              <Ink size={30} weight="black" tight color="#F2F1EC" style={{ textAlign: 'center' }}>{`${nomEtape.charAt(0).toUpperCase()}${nomEtape.slice(1)}`}</Ink>
              <Ink size={16} color="#D9D6CC" style={{ textAlign: 'center' }}>{`${cons.titre}, ${etapeFaite} sur 3.`}</Ink>
              <ArmureEnConstruction piece={cons.piece} progres={etapeFaite / 3} taille={110} ton="sombre" eclat={visible} style={{ marginTop: 12 }} accessibilityLabel={`${cons.titre}, ${etapeFaite} étapes sur 3`} />
              <EtapesPiece faites={etapeFaite} ton="sombre" />
            </>
          ) : (
            <View style={{ minHeight: 160 }} />
          )}

          {seals.length ? (
            <View style={{ alignSelf: 'stretch', marginTop: showRank || showPlate ? 22 : 0, borderRadius: 22, paddingVertical: 16, paddingHorizontal: 10, backgroundColor: 'rgba(20,22,30,0.72)', gap: 14 }}>
              <View style={{ paddingHorizontal: 6, gap: 6 }}>
                <Ink size={20} weight="black" color="#F2F1EC">{sealTitle}</Ink>
                {recap ? <Ink size={14} color="#B9BBC4">{`Calculés à partir de tout ton historique. Chacun t’a rapporté ${XP_VALUES.sceau} XP.`}</Ink> : null}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
                {seals.map((s) => (
                  <View key={s.id} style={{ width: '33.333%', alignItems: 'center', gap: 6, paddingHorizontal: 4 }} accessible accessibilityLabel={`Sceau ${nomSceau(s, u)}`}>
                    <SealMedal id={s.id} color={familyOf(s.family).ink} size={72} />
                    <Ink size={12} weight="bold" color="#F2F1EC" style={{ textAlign: 'center' }} numberOfLines={2}>{nomSceau(s, u)}</Ink>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 20, backgroundColor: 'transparent' }}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Continuer"
            style={({ pressed }) => ({ height: 56, borderRadius: 18, backgroundColor: pressed ? c.accentPressed : c.accent, alignItems: 'center', justifyContent: 'center' })}
          >
            <Ink size={16} weight="extraBold" color={c.onAccent}>Continuer</Ink>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default Celebration;
