// ============================================
// PLANNING PAGE 3 - CARNET D'ENTRAÎNEMENT
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { BookOpen, CheckCircle2, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const CARD_PADDING = 16;

interface PlanningPage3JournalProps {
  completedTrainings?: any[];
}

export const PlanningPage3Journal: React.FC<PlanningPage3JournalProps> = ({
  completedTrainings = [],
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  // Données d'exemple
  const recentTrainings = [
    {
      id: '1',
      date: 'Aujourd\'hui, 14:30',
      name: 'Push A - Pectoraux & Épaules',
      duration: 65,
      exercises: 6,
    },
    {
      id: '2',
      date: 'Hier, 10:15',
      name: 'Leg Day - Jambes Complètes',
      duration: 75,
      exercises: 8,
    },
    {
      id: '3',
      date: 'Il y a 2 jours, 18:00',
      name: 'Pull A - Dos & Biceps',
      duration: 60,
      exercises: 7,
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
        {t('planning.journal')}
      </Text>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {t('planning.journalSubtitle')}
      </Text>

      {/* Stats header */}
      <View style={[styles.statsCard, { backgroundColor: colors.backgroundCard }]}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsIcon}
        >
          <BookOpen size={24} color="#FFFFFF" strokeWidth={2.5} />
        </LinearGradient>
        <View style={styles.statsContent}>
          <Text style={[styles.statsValue, { color: colors.textPrimary }]}>
            {recentTrainings.length}
          </Text>
          <Text style={[styles.statsLabel, { color: colors.textMuted }]}>
            {t('planning.trainingsThisWeek')}
          </Text>
        </View>
      </View>

      {/* Liste des entraînements */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t('planning.recentTrainings')}
      </Text>

      <View style={styles.trainingsList}>
        {recentTrainings.map((training) => (
          <TouchableOpacity
            key={training.id}
            style={[styles.trainingCard, { backgroundColor: colors.backgroundCard }]}
            activeOpacity={0.7}
            onPress={() => {}}
          >
            <View style={styles.trainingHeader}>
              <View style={styles.checkCircle}>
                <CheckCircle2 size={20} color="#10B981" strokeWidth={2.5} />
              </View>
              <View style={styles.trainingInfo}>
                <Text style={[styles.trainingName, { color: colors.textPrimary }]}>
                  {training.name}
                </Text>
                <Text style={[styles.trainingDate, { color: colors.textMuted }]}>
                  {training.date}
                </Text>
              </View>
            </View>

            <View style={styles.trainingDetails}>
              <View style={styles.detailItem}>
                <Clock size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {training.duration} min
                </Text>
              </View>
              <View style={styles.detailSeparator} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {training.exercises} exercices
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 250,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  statsIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContent: {
    flex: 1,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  trainingsList: {
    gap: 12,
  },
  trainingCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  trainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B98110',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainingInfo: {
    flex: 1,
  },
  trainingName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  trainingDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  trainingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailSeparator: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  detailText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
