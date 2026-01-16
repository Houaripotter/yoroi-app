// ============================================
// YOROI - BRIEFING SETTINGS COMPONENT
// ============================================
// Configure morning briefing notifications

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Bell, Clock } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { briefingService, BriefingSettings as BriefingSettingsType } from '@/lib/briefingService';

export function BriefingSettings() {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<BriefingSettingsType>({
    enabled: false,
    time: '07:00',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const briefingSettings = await briefingService.getSettings();
    setSettings(briefingSettings);
  };

  const handleToggle = async (value: boolean) => {
    const newSettings = { ...settings, enabled: value };
    setSettings(newSettings);
    await briefingService.saveSettings(newSettings);
  };

  const handleTimeChange = async (time: string) => {
    const newSettings = { ...settings, time };
    setSettings(newSettings);
    await briefingService.saveSettings(newSettings);
  };

  const timePresets = [
    { label: '06:00', value: '06:00' },
    { label: '07:00', value: '07:00' },
    { label: '08:00', value: '08:00' },
    { label: '09:00', value: '09:00' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.accentMuted }]}>
            <Bell size={20} color={colors.accent} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Briefing du matin
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Notification quotidienne personnalisée
            </Text>
          </View>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={handleToggle}
          trackColor={{ false: colors.border, true: colors.accentMuted }}
          thumbColor={settings.enabled ? colors.accent : colors.textMuted}
          ios_backgroundColor={colors.border}
        />
      </View>

      {/* Time Selection - Only show when enabled */}
      {settings.enabled && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.timeSection}>
            <View style={styles.timeSectionHeader}>
              <Clock size={16} color={colors.textMuted} />
              <Text style={[styles.timeSectionTitle, { color: colors.textSecondary }]}>
                Heure du briefing
              </Text>
            </View>

            <View style={styles.timePresets}>
              {timePresets.map((preset) => (
                <TouchableOpacity
                  key={preset.value}
                  style={[
                    styles.timePresetButton,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    settings.time === preset.value && {
                      backgroundColor: colors.accentMuted,
                      borderColor: colors.accent,
                    }
                  ]}
                  onPress={() => handleTimeChange(preset.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timePresetText,
                      { color: colors.textSecondary },
                      settings.time === preset.value && {
                        color: colors.accent,
                        fontWeight: '700',
                      }
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.timeHelperText, { color: colors.textMuted }]}>
              Tu recevras un résumé personnalisé chaque jour à {settings.time}
            </Text>
          </View>

          {/* What's included */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.featuresSection}>
            <Text style={[styles.featuresTitle, { color: colors.textSecondary }]}>
              Contenu du briefing :
            </Text>
            <View style={styles.featuresList}>
              <FeatureItem icon="⚖️" text="Ton poids actuel" colors={colors} />
              <FeatureItem icon="" text="Ta série de jours consécutifs" colors={colors} />
              <FeatureItem icon="" text="Entraînement prévu du jour" colors={colors} />
              <FeatureItem icon="" text="Rappel des blessures actives" colors={colors} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

interface FeatureItemProps {
  icon: string;
  text: string;
  colors: any;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text, colors }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={[styles.featureText, { color: colors.textSecondary }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: SPACING.lg,
  },
  timeSection: {
    padding: SPACING.lg,
  },
  timeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  timeSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timePresets: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  timePresetButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 2,
  },
  timePresetText: {
    fontSize: 15,
    fontWeight: '600',
  },
  timeHelperText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  featuresSection: {
    padding: SPACING.lg,
  },
  featuresTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  featuresList: {
    gap: SPACING.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 4,
  },
  featureIcon: {
    fontSize: 16,
    width: 24,
  },
  featureText: {
    fontSize: 14,
  },
});
