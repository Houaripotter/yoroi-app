// ============================================
// YOROI - TIKTOK / INSTA STATS CARD
// ============================================
// Carte transparente avec stats selectionnables
// Parfait pour superposer sur videos/stories

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import {
  X,
  Share2,
  Download,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Check,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { TikTokStatsCard, TikTokStatsData, StatType } from '@/components/social-cards/TikTokStatsCard';
import { getAllWorkouts, getUserClubs } from '@/lib/storage';
import logger from '@/lib/security/logger';
import { useCustomPopup } from '@/components/CustomPopup';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Stats selectionnables groupees par categorie
const STAT_GROUPS = [
  {
    title: 'Entrainements',
    stats: [
      { key: 'totalTrainings' as StatType, label: 'Total entrainements' },
      { key: 'weekTrainings' as StatType, label: 'Cette semaine' },
      { key: 'monthTrainings' as StatType, label: 'Ce mois' },
      { key: 'yearTrainings' as StatType, label: 'Cette annee' },
    ],
  },
  {
    title: 'Records',
    stats: [
      { key: 'bestWeek' as StatType, label: 'Record semaine' },
      { key: 'totalMinutes' as StatType, label: 'Temps total' },
    ],
  },
  {
    title: 'Progression',
    stats: [
      { key: 'rank' as StatType, label: 'Rang actuel' },
    ],
  },
];

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function TikTokStatsScreen() {
  const { colors } = useTheme();
  const cardRef = useRef<View>(null);
  const { showPopup, PopupComponent } = useCustomPopup();

  const [stats, setStats] = useState<TikTokStatsData>({
    totalTrainings: 0,
    weekTrainings: 0,
    monthTrainings: 0,
    yearTrainings: 0,
    bestWeek: 0,
    totalMinutes: 0,
    rank: 'Debutant',
  });
  const [selectedStats, setSelectedStats] = useState<StatType[]>(['totalTrainings', 'monthTrainings', 'bestWeek', 'rank']);
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
  const [backgroundType, setBackgroundType] = useState<'transparent' | 'gradient' | 'photo'>('transparent');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [format] = useState<'stories' | 'square'>('stories');

  // ============================================
  // CHARGEMENT DES STATS
  // ============================================

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const workouts = await getAllWorkouts();
      const clubs = await getUserClubs();

      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Calculer les stats
      const weekTrainings = workouts.filter(w => new Date(w.date) >= startOfWeek).length;
      const monthTrainings = workouts.filter(w => new Date(w.date) >= startOfMonth).length;
      const yearTrainings = workouts.filter(w => new Date(w.date) >= startOfYear).length;

      // Trouver le club principal
      const clubCounts: Record<string, number> = {};
      workouts.forEach(w => {
        if (w.club_id) {
          clubCounts[w.club_id] = (clubCounts[w.club_id] || 0) + 1;
        } else if (w.type) {
          clubCounts[w.type] = (clubCounts[w.type] || 0) + 1;
        }
      });
      const mainClubId = Object.entries(clubCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const mainClub = clubs.find(c => c.id === mainClubId);

      // Calculer temps total (estimation: 60min par seance)
      const totalMinutes = workouts.length * 60;

      // Calculer record semaine
      const weekCounts: Record<string, number> = {};
      workouts.forEach(w => {
        const d = new Date(w.date);
        const weekKey = `${d.getFullYear()}-W${Math.ceil((d.getDate() + 6 - d.getDay()) / 7)}`;
        weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1;
      });
      const weekCountValues = Object.values(weekCounts);
      const bestWeek = weekCountValues.length > 0 ? Math.max(...weekCountValues) : 0;

      // Rang basé sur le nombre total d'entrainements
      const rankNames = ['Debutant', 'Initie', 'Pratiquant', 'Confirme', 'Expert', 'Elite', 'Maitre', 'Legende'];
      const rankIndex = Math.min(Math.floor(workouts.length / 20), rankNames.length - 1);

      setStats({
        totalTrainings: workouts.length,
        weekTrainings,
        monthTrainings,
        yearTrainings,
        bestWeek,
        mainClub: mainClub?.name || mainClubId || undefined,
        mainClubLogo: mainClub?.logoUri || undefined,
        mainSport: mainClub?.type,
        totalMinutes,
        rank: rankNames[rankIndex],
      });
    } catch (error) {
      logger.error('Erreur chargement stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // SELECTION DES STATS
  // ============================================

  const toggleStat = (statKey: StatType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSelectedStats(prev => {
      if (prev.includes(statKey)) {
        if (prev.length <= 2) {
          showPopup('Minimum 2 stats', 'Tu dois afficher au moins 2 statistiques.', [{ text: 'OK', style: 'primary' }]);
          return prev;
        }
        return prev.filter(s => s !== statKey);
      } else {
        if (prev.length >= 4) {
          showPopup('Maximum 4 stats', 'Tu peux afficher maximum 4 statistiques.', [{ text: 'OK', style: 'primary' }]);
          return prev;
        }
        return [...prev, statKey];
      }
    });
  };

  // ============================================
  // PHOTO PICKER
  // ============================================

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission refusee', 'Autorise l\'acces a la camera.', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBackgroundImage(result.assets[0].uri);
        setBackgroundType('photo');
      }
    } catch (error) {
      logger.error('Erreur photo:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission refusee', 'Autorise l\'acces a tes photos.', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBackgroundImage(result.assets[0].uri);
        setBackgroundType('photo');
      }
    } catch (error) {
      logger.error('Erreur galerie:', error);
    }
  };

  // ============================================
  // SHARE & SAVE
  // ============================================

  const shareCard = async () => {
    if (!cardRef.current) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager mes stats',
        });
      }
    } catch (error) {
      logger.error('Erreur partage:', error);
      showPopup('Erreur', 'Impossible de partager', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsSaving(false);
    }
  };

  const saveToGallery = async () => {
    if (!cardRef.current) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission requise', 'Autorise l\'acces a ta galerie.', [{ text: 'OK', style: 'primary' }]);
        setIsSaving(false);
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showPopup('Sauvegarde', 'Carte ajoutee a ta galerie!', [{ text: 'OK', style: 'primary' }]);
    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
      showPopup('Erreur', 'Impossible de sauvegarder', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement de tes stats...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Sparkles size={20} color={colors.accent} />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              TikTok, Insta...
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Preview */}
          <View style={styles.cardContainer}>
            <TikTokStatsCard
              ref={cardRef}
              stats={stats}
              selectedStats={selectedStats}
              format={format}
              backgroundImage={backgroundImage}
              backgroundType={backgroundType}
            />
          </View>

          {/* Background Type Selector */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Style de fond</Text>
          </View>
          <View style={styles.templateRow}>
            {([
              { key: 'transparent', label: 'Transparent' },
              { key: 'gradient', label: 'Gradient' },
              { key: 'photo', label: 'Photo' },
            ] as const).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.templateBtn,
                  {
                    backgroundColor: backgroundType === key ? colors.accent : colors.backgroundCard,
                    borderColor: backgroundType === key ? colors.accent : colors.border,
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setBackgroundType(key);
                }}
              >
                <Text style={[
                  styles.templateBtnText,
                  { color: backgroundType === key ? colors.textOnAccent : colors.textPrimary }
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Photo picker if photo mode */}
          {backgroundType === 'photo' && (
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.accent }]}
                onPress={takePhoto}
              >
                <Camera size={18} color={colors.textOnAccent} />
                <Text style={[styles.photoBtnText, { color: colors.textOnAccent }]}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: colors.border }]}
                onPress={pickImage}
              >
                <ImageIcon size={18} color={colors.textPrimary} />
                <Text style={[styles.photoBtnText, { color: colors.textPrimary }]}>Galerie</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Stats Selector - Par groupe */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Choisis tes stats ({selectedStats.length}/4)
            </Text>
          </View>

          {STAT_GROUPS.map(group => (
            <View key={group.title} style={styles.statGroup}>
              <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
                {group.title}
              </Text>
              <View style={styles.statsSelector}>
                {group.stats.map(stat => {
                  const isSelected = selectedStats.includes(stat.key);
                  const value = stats[stat.key as keyof TikTokStatsData];

                  return (
                    <TouchableOpacity
                      key={stat.key}
                      style={[
                        styles.statOption,
                        {
                          backgroundColor: isSelected ? colors.accent + '20' : colors.backgroundCard,
                          borderColor: isSelected ? colors.accent : colors.border,
                        }
                      ]}
                      onPress={() => toggleStat(stat.key)}
                    >
                      <View style={styles.statOptionContent}>
                        <Text style={[styles.statOptionLabel, { color: colors.textPrimary }]}>
                          {stat.label}
                        </Text>
                        <Text style={[styles.statOptionValue, { color: colors.textSecondary }]}>
                          {value !== undefined && value !== null ? String(value) : '0'}
                        </Text>
                      </View>
                      <View style={[
                        styles.checkCircle,
                        {
                          backgroundColor: isSelected ? colors.accent : 'transparent',
                          borderColor: isSelected ? colors.accent : colors.border,
                        }
                      ]}>
                        {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Share Actions */}
          <View style={styles.shareActions}>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: colors.accent }]}
              onPress={shareCard}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Share2 size={20} color="#FFFFFF" />
                  <Text style={styles.shareBtnText}>Partager</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
              onPress={saveToGallery}
              disabled={isSaving}
            >
              <Download size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Tips */}
          <View style={[styles.tipCard, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.tipTitle, { color: colors.accent }]}>Astuce</Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Mode transparent = parfait pour TikTok et Reels ! Superpose cette carte sur tes videos.
            </Text>
          </View>

          <View style={{ height: 40 }} />
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
  container: {
    flex: 1,
  },
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // Card
  cardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  // Section
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Template Selector
  templateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  templateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  templateBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Photo Actions
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Stats Groups
  statGroup: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsSelector: {
    gap: 8,
  },
  statOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statOptionContent: {
    flex: 1,
  },
  statOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  statOptionValue: {
    fontSize: 13,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Share Actions
  shareActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  saveBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tips
  tipCard: {
    padding: 16,
    borderRadius: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
