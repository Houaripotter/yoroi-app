import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Moon,
  Sun,
  Coffee,
  Clock,
  Check,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/ThemeContext';
import { COLORS, SPACING, RADIUS, FONT, SHADOWS } from '@/constants/appTheme';
import logger from '@/lib/security/logger';

// ============================================
// MODES DE JEÛNE
// ============================================
// Ramadan, Carême, Jeûne intermittent, etc.

type FastingMode = 'none' | 'ramadan' | 'careme' | 'intermittent' | 'yom_kippour' | 'custom';

interface FastingSettings {
  mode: FastingMode;
  enabled: boolean;
  intermittentSchedule?: '16/8' | '18/6' | '20/4';
  customName?: string;
}

const FASTING_MODES = [
  {
    id: 'none' as FastingMode,
    name: 'Aucun',
    icon: '✖️',
    description: 'Pas de mode jeûne actif',
    color: COLORS.textMuted,
  },
  {
    id: 'ramadan' as FastingMode,
    name: 'Ramadan (Islam)',
    icon: '🌙',
    description: 'Pesée Fajr (aube) & Iftar (coucher)',
    color: '#8B5CF6',
  },
  {
    id: 'careme' as FastingMode,
    name: 'Carême (Christianisme)',
    icon: '✝️',
    description: 'Pesée matin & soir, 40 jours',
    color: '#6366F1',
  },
  {
    id: 'intermittent' as FastingMode,
    name: 'Jeûne intermittent',
    icon: '⏱️',
    description: '16/8, 18/6 ou 20/4',
    color: '#10B981',
  },
  {
    id: 'yom_kippour' as FastingMode,
    name: 'Yom Kippour (Judaïsme)',
    icon: '✡️',
    description: 'Jour unique de jeûne',
    color: '#3B82F6',
  },
  {
    id: 'custom' as FastingMode,
    name: 'Autre jeûne',
    icon: '🙏',
    description: 'Personnalisé',
    color: COLORS.textSecondary,
  },
];

const INTERMITTENT_SCHEDULES = [
  { id: '16/8', label: '16/8', description: '16h jeûne, 8h alimentation' },
  { id: '18/6', label: '18/6', description: '18h jeûne, 6h alimentation' },
  { id: '20/4', label: '20/4', description: '20h jeûne, 4h alimentation' },
];

export default function FastingModesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [settings, setSettings] = useState<FastingSettings>({
    mode: 'none',
    enabled: false,
    intermittentSchedule: '16/8',
  });

  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('@yoroi_fasting_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      logger.error('Error loading fasting settings:', error);
    }
  };

  const saveSettings = async (newSettings: FastingSettings) => {
    try {
      await AsyncStorage.setItem('@yoroi_fasting_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      logger.error('Error saving fasting settings:', error);
    }
  };

  const selectMode = (mode: FastingMode) => {
    const newSettings: FastingSettings = {
      ...settings,
      mode,
      enabled: mode !== 'none',
    };
    saveSettings(newSettings);
  };

  const selectIntermittentSchedule = (schedule: '16/8' | '18/6' | '20/4') => {
    saveSettings({
      ...settings,
      intermittentSchedule: schedule,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modes de Jeûne</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Moon size={24} color={colors.accent} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Adapte ton suivi</Text>
            <Text style={styles.infoText}>
              Active un mode de jeûne pour adapter les rappels et les statistiques à ta pratique.
            </Text>
          </View>
        </View>

        {/* Mode Selection */}
        <Text style={styles.sectionTitle}>Sélectionne ton mode</Text>

        {FASTING_MODES.map((mode) => {
          const isSelected = settings.mode === mode.id;
          return (
            <TouchableOpacity
              key={mode.id}
              style={[styles.modeCard, isSelected && { borderColor: mode.color, borderWidth: 2 }]}
              onPress={() => selectMode(mode.id)}
              activeOpacity={0.7}
            >
              <View style={styles.modeLeft}>
                <View style={[styles.modeIconBg, { backgroundColor: `${mode.color}20` }]}>
                  <Text style={styles.modeIcon}>{mode.icon}</Text>
                </View>
              </View>
              <View style={styles.modeCenter}>
                <Text style={styles.modeName}>{mode.name}</Text>
                <Text style={styles.modeDescription}>{mode.description}</Text>
              </View>
              <View style={styles.modeRight}>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: mode.color }]}>
                    <Check size={14} color="#FFF" strokeWidth={3} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Intermittent Schedule Selection */}
        {settings.mode === 'intermittent' && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Programme</Text>
            <View style={styles.schedulesRow}>
              {INTERMITTENT_SCHEDULES.map((schedule) => {
                const isSelected = settings.intermittentSchedule === schedule.id;
                return (
                  <TouchableOpacity
                    key={schedule.id}
                    style={[
                      styles.scheduleCard,
                      isSelected && { backgroundColor: colors.accent },
                    ]}
                    onPress={() => selectIntermittentSchedule(schedule.id as any)}
                  >
                    <Text style={[styles.scheduleLabel, isSelected && { color: '#FFF' }]}>
                      {schedule.label}
                    </Text>
                    <Text style={[styles.scheduleDesc, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>
                      {schedule.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Features based on selected mode */}
        {settings.mode !== 'none' && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Fonctionnalités activées</Text>
            <View style={styles.featuresCard}>
              <View style={styles.featureRow}>
                <Clock size={18} color={colors.accent} />
                <Text style={styles.featureText}>Rappels adaptés aux horaires</Text>
              </View>
              <View style={styles.featureRow}>
                <Moon size={18} color={colors.accent} />
                <Text style={styles.featureText}>Pas de notifications pendant le jeûne</Text>
              </View>
              <View style={styles.featureRow}>
                <Sun size={18} color={colors.accent} />
                <Text style={styles.featureText}>Statistiques spéciales</Text>
              </View>
              {settings.mode === 'ramadan' && (
                <View style={styles.featureRow}>
                  <Coffee size={18} color={colors.accent} />
                  <Text style={styles.featureText}>Suivi Suhoor & Iftar</Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONT.size.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.xl,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  infoContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  infoTitle: {
    fontSize: FONT.size.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoText: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },

  // Section Title
  sectionTitle: {
    fontSize: FONT.size.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },

  // Mode Cards
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.sm,
  },
  modeLeft: {
    marginRight: SPACING.md,
  },
  modeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIcon: {
    fontSize: 22,
  },
  modeCenter: {
    flex: 1,
  },
  modeName: {
    fontSize: FONT.size.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  modeDescription: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modeRight: {
    width: 28,
    alignItems: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Schedules
  schedulesRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  scheduleCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  scheduleLabel: {
    fontSize: FONT.size.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  scheduleDesc: {
    fontSize: FONT.size.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Features
  featuresCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  featureText: {
    fontSize: FONT.size.sm,
    color: COLORS.text,
  },
});
