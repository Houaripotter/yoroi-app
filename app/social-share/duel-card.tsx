// ============================================
// YOROI - DUEL CARD SHARE
// ============================================
// Écran de partage de la carte de duel sparring (bilan H2H)
// Format carré 375×375 (Instagram)

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Moon, Sun, Image as ImageIcon, Camera, Share2, Download } from 'lucide-react-native';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { saveToLibraryAsync, requestPermissionsAsync } from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  launchImageLibraryAsync,
  launchCameraAsync,
  requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
} from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { getMethodDisplayName } from '@/components/BJJBodyMap';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainingsByPartnerName, getProfile, Training, CombatRound } from '@/lib/database';
import { DuelCard } from '@/components/social-cards/DuelCard';
import { useCustomPopup } from '@/components/CustomPopup';
import logger from '@/lib/security/logger';

// ── Constantes ──
const STORAGE_KEY = '@yoroi_sparring_partners';
const GOLD = '#D4AF37';

// ── Types ──
type BackgroundType = 'dark' | 'light' | 'photo';

interface PartnerRecord {
  id: string;
  name: string;
  belt?: string;
  sport?: string;
}

// ── Helpers ──

/** Réduit l'image à 1200px max côté le plus long */
const resizeForCard = async (uri: string): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri;
  }
};

/** Calcule le bilan W/L/D + méthodes depuis les trainings du partenaire */
function computeDuelStats(trainings: Training[], partnerNameLower: string) {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let totalRounds = 0;
  const methodsGivenCount: Record<string, number> = {};
  const methodsTakenCount: Record<string, number> = {};
  const sessionResults: ('win' | 'loss' | 'draw')[] = [];

  for (const t of trainings) {
    const rounds: CombatRound[] = Array.isArray(t.combat_rounds) ? t.combat_rounds : [];
    const partnerRounds = rounds.filter(
      r => r.partner && r.partner.toLowerCase().includes(partnerNameLower)
    );
    if (partnerRounds.length === 0) continue;

    // Bilan de séance = résultat du round avec ce partenaire
    let sessionW = 0, sessionL = 0, sessionD = 0;
    for (const r of partnerRounds) {
      totalRounds++;
      if (r.result === 'win') { wins++; sessionW++; }
      else if (r.result === 'loss') { losses++; sessionL++; }
      else if (r.result === 'draw') { draws++; sessionD++; }

      // Méthodes données
      if (Array.isArray(r.methodsGiven)) {
        for (const m of r.methodsGiven) {
          const key = getMethodDisplayName(m);
          methodsGivenCount[key] = (methodsGivenCount[key] ?? 0) + 1;
        }
      }
      // Méthodes subies
      if (Array.isArray(r.methodsTaken)) {
        for (const m of r.methodsTaken) {
          const key = getMethodDisplayName(m);
          methodsTakenCount[key] = (methodsTakenCount[key] ?? 0) + 1;
        }
      }
    }

    // Résultat dominant de la séance
    if (sessionW > sessionL) sessionResults.push('win');
    else if (sessionL > sessionW) sessionResults.push('loss');
    else if (sessionD > 0) sessionResults.push('draw');
    else if (sessionW > 0) sessionResults.push('win');
  }

  // Top méthode donnée / subie
  const topMethodGiven = Object.entries(methodsGivenCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topMethodTaken = Object.entries(methodsTakenCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Dernières 8 séances (les trainings sont déjà triés DESC depuis la DB)
  const last8 = sessionResults.slice(0, 8) as ('win' | 'loss' | 'draw')[];

  return { wins, losses, draws, totalRounds, topMethodGiven, topMethodTaken, last8 };
}

// ============================================
// ÉCRAN PRINCIPAL
// ============================================

export default function DuelCardScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const params = useLocalSearchParams<{ partnerName?: string; partnerBelt?: string }>();
  const { showPopup, PopupComponent } = useCustomPopup();

  const CARD_SIZE = Math.min(SCREEN_WIDTH - 40, 375);

  // ── Refs ──
  const cardRef = useRef<View>(null);

  // ── Data states ──
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [myName, setMyName] = useState('Moi');
  const [opponentName, setOpponentName] = useState(params.partnerName ?? 'Adversaire');
  const [opponentBelt, setOpponentBelt] = useState<string | undefined>(params.partnerBelt);
  const [opponentSport, setOpponentSport] = useState<string | undefined>(undefined);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [draws, setDraws] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [topMethodGiven, setTopMethodGiven] = useState<string | undefined>(undefined);
  const [topMethodTaken, setTopMethodTaken] = useState<string | undefined>(undefined);
  const [lastSessions, setLastSessions] = useState<('win' | 'loss' | 'draw')[]>([]);

  // ── UI states ──
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('dark');
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  useEffect(() => {
    const loadData = async () => {
      try {
        const partnerNameParam = params.partnerName ?? '';

        // 1. Profil utilisateur
        const profile = await getProfile();
        if (profile?.name) setMyName(profile.name);

        // 2. Récupérer la ceinture du partenaire depuis AsyncStorage (si pas passée en param)
        if (!params.partnerBelt && partnerNameParam) {
          try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            if (raw) {
              const partners: PartnerRecord[] = JSON.parse(raw);
              const found = partners.find(
                p => p.name.toLowerCase() === partnerNameParam.toLowerCase()
              );
              if (found) {
                if (found.belt) setOpponentBelt(found.belt);
                if (found.sport) setOpponentSport(found.sport);
              }
            }
          } catch (e) {
            logger.error('DuelCard: erreur lecture AsyncStorage partenaires', e);
          }
        }

        // 3. Séances contre ce partenaire
        if (partnerNameParam) {
          const trainings = await getTrainingsByPartnerName(partnerNameParam);
          const stats = computeDuelStats(trainings, partnerNameParam.toLowerCase());
          setWins(stats.wins);
          setLosses(stats.losses);
          setDraws(stats.draws);
          setTotalRounds(stats.totalRounds);
          setTopMethodGiven(stats.topMethodGiven);
          setTopMethodTaken(stats.topMethodTaken);
          setLastSessions(stats.last8);

          // Sport depuis la première séance si non trouvé en AsyncStorage
          if (!opponentSport && trainings.length > 0) {
            const firstSport = trainings[0].sport?.split(',')[0]?.trim();
            if (firstSport) setOpponentSport(firstSport);
          }
        }
      } catch (error) {
        logger.error('DuelCard: erreur chargement données', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  // ============================================
  // PHOTO PICKER
  // ============================================

  const takePhoto = async () => {
    try {
      const { status } = await requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPopup(
          'Permission refusée',
          'Autorise l\'accès à la caméra pour prendre une photo.',
          [{ text: 'OK', style: 'primary' }]
        );
        return;
      }
      const result = await launchCameraAsync({ allowsEditing: true, quality: 0.9 });
      if (!result.canceled && result.assets[0]) {
        impactAsync(ImpactFeedbackStyle.Light);
        const resized = await resizeForCard(result.assets[0].uri);
        setBackgroundImage(resized);
        setBackgroundType('photo');
      }
    } catch (error) {
      logger.error('DuelCard: erreur caméra', error);
      showPopup('Erreur', 'Impossible de prendre la photo', [{ text: 'OK', style: 'primary' }]);
    }
  };

  const pickImage = async () => {
    try {
      const result = await launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85, selectionLimit: 1 });
      if (!result.canceled && result.assets[0]) {
        impactAsync(ImpactFeedbackStyle.Light);
        const resized = await resizeForCard(result.assets[0].uri);
        setBackgroundImage(resized);
        setBackgroundType('photo');
      }
    } catch (error) {
      logger.error('DuelCard: erreur galerie', error);
      showPopup('Erreur', 'Impossible de choisir l\'image', [{ text: 'OK', style: 'primary' }]);
    }
  };

  // ============================================
  // PARTAGE & SAUVEGARDE
  // ============================================

  const shareCard = async () => {
    if (!cardRef.current) return;
    setIsLoading(true);
    impactAsync(ImpactFeedbackStyle.Medium);
    try {
      const uri = await captureRef(cardRef.current, { format: 'png', quality: 1 });
      const available = await isAvailableAsync();
      if (available) {
        await shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Carte de duel · ${opponentName}`,
        });
      } else {
        const { status } = await requestPermissionsAsync();
        if (status === 'granted') {
          await saveToLibraryAsync(uri);
          notificationAsync(NotificationFeedbackType.Success);
          showPopup(
            'Image sauvegardée !',
            'Le partage n\'est pas disponible. La carte a été sauvegardée dans ta galerie.',
            [{ text: 'OK', style: 'primary' }]
          );
        } else {
          showPopup(
            'Partage indisponible',
            'Le partage n\'est pas disponible sur cet appareil.',
            [{ text: 'OK', style: 'primary' }]
          );
        }
      }
    } catch (error) {
      logger.error('DuelCard: erreur partage', error);
      showPopup('Erreur', 'Impossible de partager la carte', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToGallery = async () => {
    if (!cardRef.current) return;
    setIsLoading(true);
    impactAsync(ImpactFeedbackStyle.Medium);
    try {
      const { status } = await requestPermissionsAsync();
      if ((status as string) !== 'granted' && (status as string) !== 'limited') {
        showPopup(
          'Permission requise',
          'Autorise l\'accès à ta galerie pour sauvegarder l\'image.',
          [{ text: 'OK', style: 'primary' }]
        );
        setIsLoading(false);
        return;
      }
      const uri = await captureRef(cardRef.current, { format: 'png', quality: 1 });
      await saveToLibraryAsync(uri);
      notificationAsync(NotificationFeedbackType.Success);
      showPopup('Sauvegardé !', 'Ta carte de duel a été ajoutée à ta galerie.', [
        { text: 'OK', style: 'primary' },
      ]);
    } catch (error) {
      logger.error('DuelCard: erreur sauvegarde', error);
      showPopup('Erreur', 'Impossible de sauvegarder la carte', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // RENDER · LOADING
  // ============================================

  if (isLoadingData) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement du bilan...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  // ============================================
  // RENDER · PRINCIPAL
  // ============================================

  const templates: { key: BackgroundType; label: string; Icon: any }[] = [
    { key: 'dark', label: 'SOMBRE', Icon: Moon },
    { key: 'light', label: 'CLAIR', Icon: Sun },
    { key: 'photo', label: 'PHOTO', Icon: ImageIcon },
  ];

  return (
    <ScreenWrapper noPadding noContainer>
      <View style={[stylesMain.container, { backgroundColor: colors.background }]}>

        {/* ── HEADER ── */}
        <View
          style={[
            stylesMain.header,
            {
              backgroundColor: colors.backgroundElevated,
              borderBottomColor: colors.border,
              paddingTop: insets.top + 8,
            },
          ]}
        >
          <TouchableOpacity
            style={stylesMain.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[stylesMain.headerTitle, { color: colors.textPrimary }]}>
            Carte de duel
          </Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[stylesMain.scrollContent, { paddingBottom: 60 }]}
          showsVerticalScrollIndicator={false}
        >

          {/* ── SOUS-TITRE ── */}
          <Text style={[stylesMain.subtitle, { color: colors.textSecondary }]}>
            vs {opponentName}
          </Text>

          {/* ── SÉLECTEUR TEMPLATE ── */}
          <View style={stylesMain.sectionBlock}>
            <Text style={[stylesMain.sectionLabel, { color: colors.textSecondary }]}>
              TEMPLATE
            </Text>
            <View style={[stylesMain.pillSelector, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              {templates.map(({ key, label, Icon }) => {
                const isActive = backgroundType === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      stylesMain.pillBtn,
                      isActive && {
                        backgroundColor: colors.accent,
                        shadowColor: colors.accent,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                      },
                    ]}
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      if (key === 'photo') {
                        pickImage();
                      } else {
                        setBackgroundType(key);
                        setBackgroundImage(undefined);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon
                      size={15}
                      color={isActive ? colors.textOnAccent : colors.textPrimary}
                    />
                    <Text
                      style={[
                        stylesMain.pillBtnText,
                        { color: isActive ? colors.textOnAccent : colors.textSecondary },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── BOUTONS PHOTO ── */}
          <View style={[stylesMain.sectionBlock, { flexDirection: 'row', gap: 10 }]}>
            <TouchableOpacity
              style={[stylesMain.photoBtn, { backgroundColor: colors.backgroundElevated, borderColor: colors.border, flex: 1 }]}
              onPress={takePhoto}
              activeOpacity={0.7}
            >
              <Camera size={18} color={colors.textPrimary} />
              <Text style={[stylesMain.photoBtnText, { color: colors.textPrimary }]}>Caméra</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[stylesMain.photoBtn, { backgroundColor: colors.backgroundElevated, borderColor: colors.border, flex: 1 }]}
              onPress={pickImage}
              activeOpacity={0.7}
            >
              <ImageIcon size={18} color={colors.textPrimary} />
              <Text style={[stylesMain.photoBtnText, { color: colors.textPrimary }]}>Galerie</Text>
            </TouchableOpacity>
          </View>

          {/* ── APERÇU CARTE ── */}
          <View style={stylesMain.cardWrapper}>
            <DuelCard
              ref={cardRef}
              myName={myName}
              opponentName={opponentName}
              opponentBelt={opponentBelt}
              wins={wins}
              losses={losses}
              draws={draws}
              totalRounds={totalRounds}
              topMethodGiven={topMethodGiven}
              topMethodTaken={topMethodTaken}
              lastSessions={lastSessions}
              backgroundType={backgroundType}
              backgroundImage={backgroundImage}
              sport={opponentSport}
            />
          </View>

          {/* ── ACTIONS ── */}
          <View style={{ gap: 12, marginTop: 24 }}>
            <TouchableOpacity
              style={[stylesMain.actionBtn, { backgroundColor: colors.accent }]}
              onPress={shareCard}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.textOnAccent} />
              ) : (
                <>
                  <Share2 size={20} color={colors.textOnAccent} />
                  <Text style={[stylesMain.actionBtnText, { color: colors.textOnAccent }]}>
                    Partager la carte
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                stylesMain.actionBtn,
                {
                  backgroundColor: colors.backgroundElevated,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              onPress={saveToGallery}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <>
                  <Download size={20} color={colors.textPrimary} />
                  <Text style={[stylesMain.actionBtnText, { color: colors.textPrimary }]}>
                    Sauvegarder dans la galerie
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      <PopupComponent />
    </ScreenWrapper>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

const stylesMain = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.3,
  },

  // Section bloc
  sectionBlock: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  // Pill selector
  pillSelector: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 4,
    gap: 4,
  },
  pillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 16,
    gap: 6,
  },
  pillBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Photo buttons
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  photoBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Card preview
  cardWrapper: {
    alignItems: 'center',
    marginVertical: 4,
  },

  // Action buttons
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 14,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
