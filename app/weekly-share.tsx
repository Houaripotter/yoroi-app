import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useRouter } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { saveToLibraryAsync, requestPermissionsAsync } from 'expo-media-library';
import { Share2, Download, RefreshCw } from 'lucide-react-native';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { WeeklyShareCard, WeeklyStats, BACKGROUND_COLORS } from '@/components/WeeklyShareCard';
import { useTheme } from '@/lib/ThemeContext';
import { getAllMeasurements, getAllWorkouts, getUserSettings } from '@/lib/storage';
import { getMeasurements } from '@/lib/database';
import { successHaptic } from '@/lib/haptics';
import logger from '@/lib/security/logger';

// ============================================
// WEEKLY SHARE - PARTAGE INSTAGRAM
// ============================================

// Calcul du rang basé sur le nombre de jours
const RANKS = [
  { minDays: 0, name: 'Recrue', emoji: '' },
  { minDays: 7, name: 'Ashigaru', emoji: '' },
  { minDays: 30, name: 'Samurai', emoji: '🥷' },
  { minDays: 90, name: 'Ronin', emoji: '' },
  { minDays: 180, name: 'Sensei', emoji: '🎌' },
  { minDays: 365, name: 'Shogun', emoji: '' },
];

const getRank = (days: number) => {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (days >= RANKS[i].minDays) {
      return RANKS[i];
    }
  }
  return RANKS[0];
};

export default function WeeklyShareScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const cardRef = useRef<View>(null);
  const { showPopup, PopupComponent } = useCustomPopup();

  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | undefined>();
  const [selectedBackgroundId, setSelectedBackgroundId] = useState('dark');

  useEffect(() => {
    loadWeeklyStats();
  }, []);

  const loadWeeklyStats = async () => {
    setIsLoading(true);
    try {
      const settings = await getUserSettings();
      setUsername(settings.username);

      // Dates de la semaine
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const lastWeekStart = subDays(weekStart, 7);

      // Charger les donnees
      const allMeasurements = await getAllMeasurements();
      const allWorkouts = await getAllWorkouts();
      const allBodyMeasurements = await getMeasurements();

      // Filtrer cette semaine
      const thisWeekMeasurements = allMeasurements.filter(m => {
        const date = new Date(m.date);
        return date >= weekStart && date <= weekEnd;
      });

      const lastWeekMeasurements = allMeasurements.filter(m => {
        const date = new Date(m.date);
        return date >= lastWeekStart && date < weekStart;
      });

      const thisWeekWorkouts = allWorkouts.filter(w => {
        const date = new Date(w.date);
        return date >= weekStart && date <= weekEnd;
      });

      // Poids actuel et changement
      const latestMeasurement = thisWeekMeasurements[0] || allMeasurements[0];
      const lastWeekLatest = lastWeekMeasurements[0];
      const weightChange = latestMeasurement && lastWeekLatest
        ? latestMeasurement.weight - lastWeekLatest.weight
        : undefined;

      // Composition
      const bodyFat = latestMeasurement?.bodyFat ?? latestMeasurement?.body_fat;
      const lastWeekBodyFat = lastWeekLatest?.bodyFat ?? lastWeekLatest?.body_fat;
      const bodyFatChange = bodyFat && lastWeekBodyFat ? bodyFat - lastWeekBodyFat : undefined;

      // Mensurations
      const latestBodyMeasurement = allBodyMeasurements[0];
      const previousBodyMeasurement = allBodyMeasurements.length > 1 ? allBodyMeasurements[1] : null;

      // Entrainements par type
      const workoutsByType: { [key: string]: number } = {};
      thisWeekWorkouts.forEach(w => {
        const type = w.type || 'autre';
        workoutsByType[type] = (workoutsByType[type] || 0) + 1;
      });

      // Streak (jours consecutifs avec pesee)
      let streak = 0;
      const sortedMeasurements = [...allMeasurements].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      if (sortedMeasurements.length > 0) {
        let currentDate = new Date();
        for (const m of sortedMeasurements) {
          const measurementDate = new Date(m.date);
          const daysDiff = Math.floor(
            (currentDate.getTime() - measurementDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysDiff <= 1) {
            streak++;
            currentDate = measurementDate;
          } else {
            break;
          }
        }
      }

      // Rang
      const totalDays = allMeasurements.length;
      const currentRankData = getRank(totalDays);
      const previousRankData = getRank(totalDays - thisWeekMeasurements.length);
      const rankUp = currentRankData.name !== previousRankData.name;

      setStats({
        weekStart: format(weekStart, 'd MMM', { locale: fr }),
        weekEnd: format(weekEnd, 'd MMM', { locale: fr }),
        currentWeight: latestMeasurement?.weight,
        weightChange,
        waist: latestBodyMeasurement?.waist,
        waistChange: previousBodyMeasurement?.waist
          ? (latestBodyMeasurement?.waist || 0) - previousBodyMeasurement.waist
          : undefined,
        hips: latestBodyMeasurement?.hips,
        hipsChange: previousBodyMeasurement?.hips
          ? (latestBodyMeasurement?.hips || 0) - previousBodyMeasurement.hips
          : undefined,
        totalWorkouts: thisWeekWorkouts.length,
        workoutsByType,
        streak,
        currentRank: `${currentRankData.emoji} ${currentRankData.name}`,
        previousRank: rankUp ? `${previousRankData.emoji} ${previousRankData.name}` : undefined,
        rankUp,
        bodyFat,
        bodyFatChange,
      });
    } catch (error) {
      logger.error('Erreur chargement stats:', error);
      showPopup('Erreur', 'Impossible de charger les statistiques', [
        { text: 'OK', style: 'primary' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;

    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      const canShare = await isAvailableAsync();
      if (canShare) {
        await shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager ma progression Yoroi',
          UTI: 'public.png',
        });
        successHaptic();
      } else {
        showPopup('Erreur', 'Le partage n\'est pas disponible sur cet appareil', [
          { text: 'OK', style: 'primary' },
        ]);
      }
    } catch (error) {
      logger.error('Erreur partage:', error);
      showPopup('Erreur', 'Impossible de partager l\'image', [
        { text: 'OK', style: 'primary' },
      ]);
    }
  };

  const handleSaveToGallery = async () => {
    if (!cardRef.current) return;

    try {
      // Demander la permission
      const { status } = await requestPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission requise', 'Autorise l\'accès à la galerie pour sauvegarder l\'image', [
          { text: 'OK', style: 'primary' },
        ]);
        return;
      }

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      await saveToLibraryAsync(uri);
      successHaptic();
      showPopup('Sauvegardé !', 'L\'image a été ajoutée à ta galerie', [
        { text: 'OK', style: 'primary' },
      ]);
    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
      showPopup('Erreur', 'Impossible de sauvegarder l\'image', [
        { text: 'OK', style: 'primary' },
      ]);
    }
  };

  if (isLoading || !stats) {
    return (
      <ScreenWrapper>
        <Header title="Ma Semaine" showBack />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper noPadding>
      <Header title="Ma Semaine" showBack />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Info */}
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Partage ta progression sur Instagram, Snapchat ou TikTok !
        </Text>

        {/* Color Picker */}
        <View style={styles.colorPickerSection}>
          <Text style={[styles.colorPickerLabel, { color: colors.textSecondary }]}>
            Couleur de fond
          </Text>
          <View style={styles.colorPicker}>
            {BACKGROUND_COLORS.map((bg) => (
              <TouchableOpacity
                key={bg.id}
                style={[
                  styles.colorOption,
                  { backgroundColor: bg.colors[1] },
                  selectedBackgroundId === bg.id && {
                    borderColor: colors.gold,
                    borderWidth: 3,
                  },
                ]}
                onPress={() => setSelectedBackgroundId(bg.id)}
                activeOpacity={0.7}
              >
                {selectedBackgroundId === bg.id && (
                  <View style={[styles.colorCheckmark, { backgroundColor: colors.gold }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Card Preview */}
        <View style={styles.cardContainer}>
          <WeeklyShareCard
            ref={cardRef}
            stats={stats}
            username={username}
            backgroundId={selectedBackgroundId}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.gold }]}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Share2 size={22} color={colors.background} />
            <Text style={[styles.actionButtonText, { color: colors.background }]}>
              Partager
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={handleSaveToGallery}
            activeOpacity={0.8}
          >
            <Download size={22} color={colors.textPrimary} />
            <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
              Sauvegarder
            </Text>
          </TouchableOpacity>
        </View>

        {/* Refresh */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadWeeklyStats}
          activeOpacity={0.7}
        >
          <RefreshCw size={18} color={colors.textSecondary} />
          <Text style={[styles.refreshText, { color: colors.textSecondary }]}>
            Actualiser les stats
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
        <PopupComponent />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  cardContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    padding: 12,
  },
  refreshText: {
    fontSize: 14,
  },
  // Color Picker
  colorPickerSection: {
    width: '100%',
    marginBottom: 20,
  },
  colorPickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCheckmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
});
