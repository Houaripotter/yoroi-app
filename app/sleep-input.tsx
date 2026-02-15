/**
 * sleep-input.tsx
 * Écran de saisie manuelle du sommeil
 * Permet d'enregistrer manuellement les heures de coucher/réveil
 * Synchronise automatiquement avec l'app Santé
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Moon, ChevronLeft, Check, Calendar, Clock } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { healthConnect } from '@/lib/healthConnect';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SleepInputScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [bedtime, setBedtime] = useState(new Date());
  const [wakeTime, setWakeTime] = useState(new Date());
  const [showBedtimePicker, setShowBedtimePicker] = useState(false);
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Calculer la durée du sommeil
  const calculateDuration = (): number => {
    const diffMs = wakeTime.getTime() - bedtime.getTime();
    return diffMs / (1000 * 60 * 60); // Convertir en heures
  };

  const duration = calculateDuration();

  // Format durée en heures et minutes
  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const min = Math.round((hours - h) * 60);
    return `${h}h ${min.toString().padStart(2, '0')}min`;
  };

  // Sauvegarder le sommeil
  const handleSave = async () => {
    try {
      // Validation
      if (duration <= 0) {
        Alert.alert(
          'Erreur',
          'L\'heure de réveil doit être après l\'heure de coucher.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (duration > 16) {
        Alert.alert(
          'Erreur',
          'La durée du sommeil ne peut pas dépasser 16 heures.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (duration < 1) {
        Alert.alert(
          'Durée courte',
          `Tu as dormi seulement ${formatDuration(duration)}. Es-tu sûr ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Confirmer', onPress: () => saveSleepData() },
          ]
        );
        return;
      }

      await saveSleepData();
    } catch (error) {
      logger.error('Error saving sleep:', error);
      Alert.alert(
        'Erreur',
        'Impossible de sauvegarder le sommeil. Vérifie que tu as autorisé l\'accès à l\'app Santé.',
        [{ text: 'OK' }]
      );
    }
  };

  const saveSleepData = async () => {
    setIsSaving(true);
    impactAsync(ImpactFeedbackStyle.Medium);

    try {
      // Écrire dans l'app Santé
      const success = await healthConnect.writeSleepData({
        startDate: bedtime,
        endDate: wakeTime,
      });

      if (success) {
        notificationAsync(NotificationFeedbackType.Success);
        Alert.alert(
          'Sommeil enregistré',
          `Durée: ${formatDuration(duration)}\n\nLes données ont été synchronisées avec l'app Santé.`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        throw new Error('Failed to write sleep data');
      }
    } catch (error) {
      logger.error('Error writing sleep data:', error);
      notificationAsync(NotificationFeedbackType.Error);
      Alert.alert(
        'Erreur',
        "Impossible d'enregistrer dans l'app Santé. Vérifie les autorisations dans Réglages > Confidentialité.",
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Status color based on duration
  const getStatusColor = (): string => {
    if (duration < 3) return '#DC2626'; // Danger
    if (duration < 6) return '#F59E0B'; // Warning
    if (duration >= 7 && duration <= 9) return '#10B981'; // Optimal
    if (duration > 9) return '#3B82F6'; // Élevé
    return '#6B7280'; // Unknown
  };

  const getStatusLabel = (): string => {
    if (duration < 3) return 'DANGER';
    if (duration < 6) return 'INSUFFISANT';
    if (duration >= 7 && duration <= 9) return 'OPTIMAL';
    if (duration > 9) return 'ÉLEVÉ';
    return '—';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <ChevronLeft size={28} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Moon size={32} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.headerTitle}>Saisir mon sommeil</Text>
          <Text style={styles.headerSubtitle}>Synchronisation l'app Santé</Text>
        </View>
      </LinearGradient>

      {/* Contenu */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte Durée */}
        <View style={[styles.durationCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.durationLabel, { color: colors.textMuted }]}>
            Durée du sommeil
          </Text>
          <Text style={[styles.durationValue, { color: getStatusColor() }]}>
            {formatDuration(duration)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
              {getStatusLabel()}
            </Text>
          </View>
        </View>

        {/* Heure de coucher */}
        <View style={[styles.timeSection, { backgroundColor: colors.card }]}>
          <View style={styles.timeSectionHeader}>
            <Moon size={20} color={colors.accent} strokeWidth={2.5} />
            <Text style={[styles.timeSectionTitle, { color: colors.text }]}>
              Heure de coucher
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.timeButton, { borderColor: colors.border }]}
            onPress={() => setShowBedtimePicker(true)}
            activeOpacity={0.7}
          >
            <Clock size={20} color={colors.textMuted} strokeWidth={2.5} />
            <Text style={[styles.timeText, { color: colors.text }]}>
              {format(bedtime, 'HH:mm', { locale: fr })}
            </Text>
            <Calendar size={18} color={colors.textMuted} strokeWidth={2.5} />
            <Text style={[styles.dateText, { color: colors.textMuted }]}>
              {format(bedtime, 'dd MMM', { locale: fr })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Heure de réveil */}
        <View style={[styles.timeSection, { backgroundColor: colors.card }]}>
          <View style={styles.timeSectionHeader}>
            <Moon size={20} color={colors.accent} strokeWidth={2.5} />
            <Text style={[styles.timeSectionTitle, { color: colors.text }]}>
              Heure de réveil
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.timeButton, { borderColor: colors.border }]}
            onPress={() => setShowWakeTimePicker(true)}
            activeOpacity={0.7}
          >
            <Clock size={20} color={colors.textMuted} strokeWidth={2.5} />
            <Text style={[styles.timeText, { color: colors.text }]}>
              {format(wakeTime, 'HH:mm', { locale: fr })}
            </Text>
            <Calendar size={18} color={colors.textMuted} strokeWidth={2.5} />
            <Text style={[styles.dateText, { color: colors.textMuted }]}>
              {format(wakeTime, 'dd MMM', { locale: fr })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info l'app Santé */}
        <View style={[styles.infoBox, { backgroundColor: isDark ? '#6366F1' + '15' : '#EEF2FF' }]}>
          <Text style={[styles.infoText, { color: isDark ? '#A5B4FC' : '#6366F1' }]}>
            💡 Ces données seront automatiquement enregistrées dans l'app Santé
            et apparaîtront dans ton historique de sommeil.
          </Text>
        </View>
      </ScrollView>

      {/* Bouton Enregistrer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.accent, opacity: isSaving ? 0.6 : 1 },
          ]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Check size={20} color={colors.textOnAccent} strokeWidth={2.5} />
          <Text style={[styles.saveButtonText, { color: colors.textOnAccent }]}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pickers */}
      {showBedtimePicker && (
        <DateTimePicker
          value={bedtime}
          mode="datetime"
          is24Hour={true}
          display="spinner"
          onChange={(event, selectedDate) => {
            setShowBedtimePicker(false);
            if (selectedDate) {
              setBedtime(selectedDate);
            }
          }}
        />
      )}

      {showWakeTimePicker && (
        <DateTimePicker
          value={wakeTime}
          mode="datetime"
          is24Hour={true}
          display="spinner"
          onChange={(event, selectedDate) => {
            setShowWakeTimePicker(false);
            if (selectedDate) {
              setWakeTime(selectedDate);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  durationCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  durationValue: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  timeSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  timeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timeSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  timeText: {
    fontSize: 24,
    fontWeight: '800',
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
