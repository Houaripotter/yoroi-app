// ============================================
// YOROI - ÉCRAN CONFIDENTIALITÉ & DONNÉES
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
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
import {
  ChevronLeft,
  Shield,
  Trash2,
  Download,
  Lock,
  Clock,
  ChevronRight,
  Scale,
  Dumbbell,
  Moon,
  Droplet,
  Camera,
  Heart,
  Smile,
  Trophy,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { LinearGradient } from 'expo-linear-gradient';
import {
  impactAsync,
  ImpactFeedbackStyle,
  notificationAsync,
  NotificationFeedbackType,
} from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';

// ============================================
// CONSTANTES
// ============================================

const DATA_RETENTION_KEY = '@yoroi_data_retention';

const RETENTION_OPTIONS = [
  { id: '0', days: 0 },
  { id: '30', days: 30 },
  { id: '90', days: 90 },
  { id: '180', days: 180 },
] as const;

const DATA_CATEGORIES = [
  { id: 'weights', key: '@yoroi_measurements', icon: Scale },
  { id: 'workouts', key: '@yoroi_workouts', icon: Dumbbell },
  { id: 'sleep', key: '@yoroi_sleep_entries', icon: Moon },
  { id: 'hydration', key: '@yoroi_hydration_log', icon: Droplet },
  { id: 'photos', key: '@yoroi_photos', icon: Camera },
  { id: 'injuries', key: '@yoroi_injuries', icon: Heart },
  { id: 'mood', key: '@yoroi_mood_log', icon: Smile },
  { id: 'badges', key: '@yoroi_user_badges', icon: Trophy },
] as const;

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function PrivacyDataScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useI18n();

  const [retention, setRetention] = useState<string>('0');
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => {
    loadRetention();
    loadCategoryCounts();
  }, []);

  const loadRetention = useCallback(async () => {
    try {
      const value = await AsyncStorage.getItem(DATA_RETENTION_KEY);
      if (value !== null) {
        setRetention(value);
      }
    } catch (error) {
      logger.error('Erreur chargement retention:', error);
    }
  }, []);

  const loadCategoryCounts = useCallback(async () => {
    try {
      const counts: Record<string, number> = {};
      for (const category of DATA_CATEGORIES) {
        try {
          const raw = await AsyncStorage.getItem(category.key);
          if (raw) {
            const parsed = JSON.parse(raw);
            counts[category.id] = Array.isArray(parsed) ? parsed.length : 0;
          } else {
            counts[category.id] = 0;
          }
        } catch {
          counts[category.id] = 0;
        }
      }
      setCategoryCounts(counts);
    } catch (error) {
      logger.error('Erreur chargement counts:', error);
    }
  }, []);

  const handleRetentionChange = useCallback(async (value: string) => {
    try {
      await impactAsync(ImpactFeedbackStyle.Light);
      setRetention(value);
      await AsyncStorage.setItem(DATA_RETENTION_KEY, value);
      logger.info('Data retention set to:', value);
    } catch (error) {
      logger.error('Erreur sauvegarde retention:', error);
    }
  }, []);

  const handleDeleteCategory = useCallback(async (categoryId: string, categoryKey: string) => {
    if (isSaving) return;

    const categoryName = t(`privacy.dataCategory.${categoryId}`);

    Alert.alert(
      t('privacy.deleteTitle'),
      t('privacy.deleteCategoryConfirm', { category: categoryName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              await AsyncStorage.removeItem(categoryKey);
              await notificationAsync(NotificationFeedbackType.Success);
              setCategoryCounts(prev => ({ ...prev, [categoryId]: 0 }));
              logger.info('Category deleted:', categoryId);
            } catch (error) {
              logger.error('Erreur suppression catégorie:', error);
            } finally {
              setIsSaving(false);
            }
          },
        },
      ],
    );
  }, [isSaving, t]);

  const handleDeleteAll = useCallback(() => {
    if (isSaving) return;

    Alert.alert(
      t('privacy.deleteAllTitle'),
      t('privacy.deleteAllConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              const { resetAllData } = await import('@/lib/storage');
              await resetAllData();
              await notificationAsync(NotificationFeedbackType.Success);
              setCategoryCounts({});
              logger.info('All data deleted');
            } catch (error) {
              logger.error('Erreur suppression totale:', error);
            } finally {
              setIsSaving(false);
            }
          },
        },
      ],
    );
  }, [isSaving, t]);

  const handleExport = useCallback(async () => {
    await impactAsync(ImpactFeedbackStyle.Light);
    try {
      router.push('/export-data' as any);
    } catch {
      Alert.alert(
        t('privacy.exportTitle'),
        t('privacy.exportInfo'),
      );
    }
  }, [t]);

  const totalEntries = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec gradient */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              router.back();
            }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <Shield size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>{t('privacy.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('privacy.subtitle')}</Text>
          </View>
        </LinearGradient>

        {/* Section: 100% Offline */}
        <View style={styles.sectionContainer}>
          <View style={styles.offlineCard}>
            <View style={styles.offlineIconContainer}>
              <Lock size={28} color="#10B981" />
            </View>
            <Text style={styles.offlineTitle}>{t('privacy.offlineTitle')}</Text>
            <Text style={styles.offlineDescription}>
              {t('privacy.offlineDescription')}
            </Text>
          </View>
        </View>

        {/* Section: Data Retention */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={colors.accent} />
            <Text style={styles.sectionTitle}>{t('privacy.retentionTitle')}</Text>
          </View>

          <View style={styles.retentionCard}>
            <Text style={styles.retentionDescription}>
              {t('privacy.retentionDescription')}
            </Text>

            <View style={styles.retentionOptions}>
              {RETENTION_OPTIONS.map((option) => {
                const isActive = retention === option.id;
                const label = option.days === 0
                  ? t('privacy.retentionNever')
                  : t('privacy.retentionDays', { days: option.days });

                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.retentionButton,
                      isActive && styles.retentionButtonActive,
                    ]}
                    onPress={() => handleRetentionChange(option.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.retentionButtonText,
                        isActive && styles.retentionButtonTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Section: My Data */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={colors.accent} />
            <Text style={styles.sectionTitle}>{t('privacy.myDataTitle')}</Text>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>
                {t('privacy.entries', { count: totalEntries })}
              </Text>
            </View>
          </View>

          <View style={styles.categoriesList}>
            {DATA_CATEGORIES.map((category) => {
              const IconComponent = category.icon;
              const count = categoryCounts[category.id] ?? 0;
              const categoryName = t(`privacy.dataCategory.${category.id}`);

              return (
                <View key={category.id} style={styles.categoryItem}>
                  <View style={styles.categoryLeft}>
                    <View style={styles.categoryIconContainer}>
                      <IconComponent size={20} color="#10B981" />
                    </View>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{categoryName}</Text>
                      <Text style={styles.categoryCount}>
                        {t('privacy.entries', { count })}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.deleteButton,
                      (count === 0 || isSaving) && styles.deleteButtonDisabled,
                    ]}
                    onPress={() => handleDeleteCategory(category.id, category.key)}
                    disabled={count === 0 || isSaving}
                    activeOpacity={0.7}
                  >
                    <Trash2
                      size={18}
                      color={count === 0 || isSaving ? colors.textMuted : '#EF4444'}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* Footer Buttons */}
        <View style={styles.footerContainer}>
          {/* Export Button */}
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExport}
            activeOpacity={0.7}
          >
            <Download size={20} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>{t('privacy.exportData')}</Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Delete All Button */}
          <TouchableOpacity
            style={[styles.deleteAllButton, isSaving && styles.deleteAllButtonDisabled]}
            onPress={handleDeleteAll}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            <Trash2 size={20} color="#FFFFFF" />
            <Text style={styles.deleteAllButtonText}>{t('privacy.deleteAll')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },

    // Header
    headerGradient: {
      paddingHorizontal: 16,
      paddingBottom: 32,
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
      gap: 8,
    },
    headerIconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: '#FFFFFF',
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: 15,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.85)',
      textAlign: 'center',
      lineHeight: 22,
    },

    // Sections
    sectionContainer: {
      marginTop: 24,
      paddingHorizontal: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },

    // Offline Card
    offlineCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: 'rgba(16,185,129,0.2)',
    },
    offlineIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(16,185,129,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    offlineTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: '#10B981',
      textAlign: 'center',
    },
    offlineDescription: {
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },

    // Retention
    retentionCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      gap: 16,
    },
    retentionDescription: {
      fontSize: 14,
      fontWeight: '400',
      color: colors.textMuted,
      lineHeight: 22,
    },
    retentionOptions: {
      flexDirection: 'row',
      gap: 8,
    },
    retentionButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    retentionButtonActive: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    retentionButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    retentionButtonTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },

    // Total Badge
    totalBadge: {
      backgroundColor: 'rgba(16,185,129,0.15)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    totalBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#10B981',
    },

    // Categories
    categoriesList: {
      backgroundColor: colors.card,
      borderRadius: 20,
      overflow: 'hidden',
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    categoryIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(16,185,129,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryInfo: {
      flex: 1,
      gap: 2,
    },
    categoryName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    categoryCount: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.textMuted,
    },
    deleteButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(239,68,68,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteButtonDisabled: {
      backgroundColor: colors.background,
      opacity: 0.4,
    },

    // Footer
    footerContainer: {
      marginTop: 32,
      paddingHorizontal: 16,
      gap: 12,
    },
    exportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#10B981',
      paddingVertical: 16,
      borderRadius: 16,
      gap: 10,
    },
    exportButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      flex: 1,
    },
    deleteAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#EF4444',
      paddingVertical: 16,
      borderRadius: 16,
      gap: 10,
    },
    deleteAllButtonDisabled: {
      opacity: 0.5,
    },
    deleteAllButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
