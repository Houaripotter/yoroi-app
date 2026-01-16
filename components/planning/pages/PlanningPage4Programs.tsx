// ============================================
// PLANNING PAGE 4 - PROGRAMMES
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Dumbbell, Clock, Target, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const CARD_PADDING = 16;

interface PlanningPage4ProgramsProps {
  availablePrograms?: any[];
}

export const PlanningPage4Programs: React.FC<PlanningPage4ProgramsProps> = ({
  availablePrograms = [],
}) => {
  const { colors, isDark } = useTheme();

  // Programmes d'exemple
  const programs = [
    {
      id: '1',
      name: 'Push Pull Legs',
      description: 'Programme classique 6 jours par semaine',
      duration: '12 semaines',
      level: 'Intermédiaire',
      sessions: 6,
      gradient: ['#3B82F6', '#2563EB'] as const,
    },
    {
      id: '2',
      name: 'Full Body 3x',
      description: 'Corps complet 3 fois par semaine',
      duration: '8 semaines',
      level: 'Débutant',
      sessions: 3,
      gradient: ['#10B981', '#059669'] as const,
    },
    {
      id: '3',
      name: 'Upper Lower Split',
      description: 'Split haut/bas 4 jours par semaine',
      duration: '10 semaines',
      level: 'Intermédiaire',
      sessions: 4,
      gradient: ['#F97316', '#EA580C'] as const,
    },
    {
      id: '4',
      name: 'Hypertrophie Avancée',
      description: 'Programme intensif volume élevé',
      duration: '16 semaines',
      level: 'Avancé',
      sessions: 5,
      gradient: ['#8B5CF6', '#7C3AED'] as const,
    },
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Débutant':
        return '#10B981';
      case 'Intermédiaire':
        return '#F59E0B';
      case 'Avancé':
        return '#EF4444';
      default:
        return colors.accent;
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
        Programmes
      </Text>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Choisissez ton programme d'entraînement
      </Text>

      <View style={styles.programsList}>
        {programs.map((program) => (
          <TouchableOpacity
            key={program.id}
            style={[styles.programCard, { backgroundColor: colors.backgroundCard }]}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={program.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.programHeader}
            >
              <Dumbbell size={32} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>

            <View style={styles.programContent}>
              <View style={styles.programTitleRow}>
                <Text style={[styles.programName, { color: colors.textPrimary }]}>
                  {program.name}
                </Text>
                <View
                  style={[
                    styles.levelBadge,
                    { backgroundColor: `${getLevelColor(program.level)}15` },
                  ]}
                >
                  <Text
                    style={[styles.levelText, { color: getLevelColor(program.level) }]}
                  >
                    {program.level}
                  </Text>
                </View>
              </View>

              <Text style={[styles.programDesc, { color: colors.textSecondary }]}>
                {program.description}
              </Text>

              <View style={styles.programDetails}>
                <View style={styles.detailItem}>
                  <Clock size={14} color={colors.textMuted} strokeWidth={2} />
                  <Text style={[styles.detailText, { color: colors.textMuted }]}>
                    {program.duration}
                  </Text>
                </View>

                <View style={styles.detailSeparator} />

                <View style={styles.detailItem}>
                  <Target size={14} color={colors.textMuted} strokeWidth={2} />
                  <Text style={[styles.detailText, { color: colors.textMuted }]}>
                    {program.sessions}x/semaine
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* CTA pour créer un programme personnalisé */}
      <TouchableOpacity
        style={[styles.createCard, { backgroundColor: colors.backgroundCard }]}
        activeOpacity={0.8}
      >
        <View style={styles.createContent}>
          <TrendingUp size={24} color={colors.accent} strokeWidth={2} />
          <Text style={[styles.createTitle, { color: colors.textPrimary }]}>
            Créer un programme personnalisé
          </Text>
          <Text style={[styles.createDesc, { color: colors.textMuted }]}>
            Concevez ton propre programme adapté à tes objectifs
          </Text>
        </View>
      </TouchableOpacity>
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
  programsList: {
    gap: 16,
    marginBottom: 24,
  },
  programCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  programHeader: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  programContent: {
    padding: 20,
  },
  programTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  programName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    flex: 1,
  },
  levelBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  programDesc: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 20,
  },
  programDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  createCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  createContent: {
    alignItems: 'center',
    gap: 8,
  },
  createTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  createDesc: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
