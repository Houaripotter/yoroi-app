// ============================================
// YOROI - SAISIE RAPIDE D'ENTRAÎNEMENT
// Interface simple pour logger rapidement
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Dumbbell,
  Heart,
  Users,
  Zap,
  Activity,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ActivityType = 'musculation' | 'running' | 'combat' | 'autre';

interface ActivityOption {
  id: ActivityType;
  labelKey: string;
  icon: string;
  color: string;
  descriptionKey: string;
  iconType: 'lucide' | 'material';
}

const ACTIVITIES: ActivityOption[] = [
  {
    id: 'musculation',
    labelKey: 'quickLog.musculation',
    icon: 'dumbbell',
    color: '#F97316',
    descriptionKey: 'quickLog.musculationDesc',
    iconType: 'lucide',
  },
  {
    id: 'running',
    labelKey: 'quickLog.running',
    icon: 'run',
    color: '#3B82F6',
    descriptionKey: 'quickLog.runningDesc',
    iconType: 'material',
  },
  {
    id: 'combat',
    labelKey: 'quickLog.combat',
    icon: 'karate',
    color: '#EF4444',
    descriptionKey: 'quickLog.combatDesc',
    iconType: 'material',
  },
  {
    id: 'autre',
    labelKey: 'quickLog.other',
    icon: 'activity',
    color: '#10B981',
    descriptionKey: 'quickLog.otherDesc',
    iconType: 'lucide',
  },
];

export default function QuickLogScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useI18n();

  const handleSelectActivity = (activityId: ActivityType) => {
    impactAsync(ImpactFeedbackStyle.Medium);

    // Router vers l'écran de saisie spécifique
    switch (activityId) {
      case 'musculation':
        router.push('/quick-log-muscu');
        break;
      case 'running':
        router.push('/quick-log-running');
        break;
      case 'combat':
        router.push('/quick-log-combat');
        break;
      case 'autre':
        router.push('/quick-log-other');
        break;
    }
  };

  const renderIcon = (activity: ActivityOption, size: number) => {
    if (activity.iconType === 'material') {
      return <MaterialCommunityIcons name={activity.icon as any} size={size} color={activity.color} />;
    }

    // Icons Lucide
    switch (activity.icon) {
      case 'dumbbell':
        return <Dumbbell size={size} color={activity.color} strokeWidth={2.5} />;
      case 'activity':
        return <Activity size={size} color={activity.color} strokeWidth={2.5} />;
      default:
        return <Zap size={size} color={activity.color} />;
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('quickLog.title')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Message d'intro */}
        <View style={styles.introSection}>
          <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
            {t('quickLog.question')}
          </Text>
          <Text style={[styles.introSubtitle, { color: colors.textMuted }]}>
            {t('quickLog.subtitle')}
          </Text>
        </View>

        {/* Grille d'activités */}
        <View style={styles.grid}>
          {ACTIVITIES.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={[
                styles.activityCard,
                { backgroundColor: colors.backgroundCard }
              ]}
              onPress={() => handleSelectActivity(activity.id)}
              activeOpacity={0.7}
            >
              {/* Icône avec fond coloré */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${activity.color}15` }
                ]}
              >
                {renderIcon(activity, 32)}
              </View>

              {/* Label */}
              <Text style={[styles.activityLabel, { color: colors.textPrimary }]}>
                {t(activity.labelKey)}
              </Text>

              {/* Description */}
              <Text style={[styles.activityDescription, { color: colors.textMuted }]}>
                {t(activity.descriptionKey)}
              </Text>

              {/* Indicateur visuel de sélection */}
              <View
                style={[
                  styles.selectionIndicator,
                  { backgroundColor: activity.color }
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Accès rapide au carnet complet */}
        <TouchableOpacity
          style={[
            styles.fullJournalButton,
            {
              backgroundColor: colors.backgroundElevated,
              borderColor: colors.border,
            }
          ]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.push('/training-journal');
          }}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="notebook" size={20} color={colors.accent} />
          <Text style={[styles.fullJournalText, { color: colors.textPrimary }]}>
            {t('quickLog.viewFullJournal')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  introSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  grid: {
    gap: 12,
  },
  activityCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  activityDescription: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectionIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  fullJournalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
    borderWidth: 1,
  },
  fullJournalText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
