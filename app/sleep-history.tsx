/**
 * sleep-history.tsx
 * Écran dédié à l'historique complet du sommeil
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  ArrowLeft,
  Moon,
  Sun,
  Star,
  Calendar,
  Clock,
  Trash2,
} from 'lucide-react-native';
import { format, Locale } from 'date-fns';
import { fr, enUS, es, pt, de, it, ru, ar, zhCN } from 'date-fns/locale';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useCustomPopup } from '@/components/CustomPopup';
import {
  getSleepEntries,
  formatSleepDuration,
  SleepEntry,
} from '@/lib/sleepService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const DATE_LOCALES: Record<string, Locale> = {
  fr, en: enUS, es, pt, de, it, ru, ar, zh: zhCN
};

const getDurationColor = (minutes: number): string => {
  if (minutes < 300) return '#EF4444';
  if (minutes < 420) return '#F59E0B';
  if (minutes <= 540) return '#10B981';
  return '#3B82F6';
};

const getQualityColor = (quality: number): string => {
  if (quality <= 1) return '#EF4444';
  if (quality <= 2) return '#F97316';
  if (quality <= 3) return '#F59E0B';
  if (quality <= 4) return '#10B981';
  return '#8B5CF6';
};

export default function SleepHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const dateLocale = DATE_LOCALES[language] || fr;

  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    getSleepEntries().then(setEntries);
  }, []);

  const handleDeleteEntry = (entry: SleepEntry) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    showPopup(
      t('common.delete'),
      `${format(new Date(entry.date), 'EEEE d MMMM', { locale: dateLocale })} - ${formatSleepDuration(entry.duration)}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = entries.filter(e => e.id !== entry.id);
              setEntries(updated);
              await AsyncStorage.setItem('@yoroi_sleep_entries', JSON.stringify(updated));
            } catch (error) {
              logger.error('Error deleting sleep entry:', error);
            }
          },
        },
      ]
    );
  };

  // Grouper les entrées par mois
  const groupedEntries: { month: string; entries: SleepEntry[] }[] = [];
  let currentMonth = '';
  for (const entry of entries) {
    const month = format(new Date(entry.date), 'MMMM yyyy', { locale: dateLocale });
    if (month !== currentMonth) {
      currentMonth = month;
      groupedEntries.push({ month, entries: [entry] });
    } else {
      groupedEntries[groupedEntries.length - 1].entries.push(entry);
    }
  }

  // Stats rapides
  const totalEntries = entries.length;
  const avgDuration = totalEntries > 0
    ? Math.round(entries.reduce((sum, e) => sum + e.duration, 0) / totalEntries)
    : 0;
  const avgQuality = totalEntries > 0
    ? entries.reduce((sum, e) => sum + e.quality, 0) / totalEntries
    : 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.backgroundCard }]}>
        <TouchableOpacity
          disabled={isNavigating}
          onPress={() => {
            if (!isNavigating) {
              setIsNavigating(true);
              setTimeout(() => setIsNavigating(false), 1000);
              router.back();
            }
          }}
          style={styles.backBtn}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('sleep.history')}</Text>
        <Calendar size={24} color="#8B5CF6" />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Résumé global */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.summaryValue, { color: '#8B5CF6' }]}>{totalEntries}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Nuits</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.summaryValue, { color: getDurationColor(avgDuration) }]}>
              {totalEntries > 0 ? formatSleepDuration(avgDuration) : '--'}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('sleep.average')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.summaryValue, { color: getQualityColor(Math.round(avgQuality)) }]}>
              {totalEntries > 0 ? (avgQuality % 1 === 0 ? `${avgQuality}` : `${avgQuality.toFixed(1)}`) : '--'}/5
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('sleep.quality')}</Text>
          </View>
        </View>

        {/* Entrées groupées par mois */}
        {entries.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.backgroundCard }]}>
            <Moon size={40} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Aucune nuit enregistrée
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: '#8B5CF6' }]}
              onPress={() => router.push('/sleep-input')}
            >
              <Text style={styles.emptyBtnText}>{t('sleep.recordMyNight')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groupedEntries.map((group) => (
            <View key={group.month}>
              {/* Header de mois */}
              <View style={styles.monthHeader}>
                <View style={[styles.monthDot, { backgroundColor: '#8B5CF6' }]} />
                <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
                  {group.month}
                </Text>
                <Text style={[styles.monthCount, { color: colors.textMuted }]}>
                  {group.entries.length} nuit{group.entries.length > 1 ? 's' : ''}
                </Text>
              </View>

              {/* Entrées du mois */}
              {group.entries.map((entry) => {
                const dColor = getDurationColor(entry.duration);
                const durationHours = entry.duration / 60;
                const progressWidth = Math.min((durationHours / 10) * 100, 100);

                return (
                  <View key={entry.id} style={[styles.entryCard, { backgroundColor: colors.backgroundCard }]}>
                    <View style={[styles.entryColorBar, { backgroundColor: dColor }]} />

                    <View style={styles.entryContent}>
                      {/* Ligne du haut */}
                      <View style={styles.entryTopRow}>
                        <Text style={[styles.entryDate, { color: colors.textPrimary }]}>
                          {format(new Date(entry.date), 'EEEE d', { locale: dateLocale })}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ flexDirection: 'row', gap: 2 }}>
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                size={12}
                                color={i <= entry.quality ? getQualityColor(entry.quality) : colors.border}
                                fill={i <= entry.quality ? getQualityColor(entry.quality) : 'transparent'}
                                strokeWidth={2}
                              />
                            ))}
                          </View>
                          <TouchableOpacity
                            onPress={() => handleDeleteEntry(entry)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Trash2 size={14} color={colors.textMuted} strokeWidth={2} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Ligne du bas */}
                      <View style={styles.entryBottomRow}>
                        <Text style={[styles.entryDuration, { color: dColor }]}>
                          {formatSleepDuration(entry.duration)}
                        </Text>
                        <View style={styles.entryTimeRange}>
                          <Moon size={10} color={colors.textMuted} strokeWidth={2} />
                          <Text style={[styles.entryTimeText, { color: colors.textMuted }]}>
                            {entry.bedTime}
                          </Text>
                          <Text style={[styles.entryTimeSep, { color: colors.textMuted }]}>{'\u2192'}</Text>
                          <Sun size={10} color={colors.textMuted} strokeWidth={2} />
                          <Text style={[styles.entryTimeText, { color: colors.textMuted }]}>
                            {entry.wakeTime}
                          </Text>
                        </View>
                      </View>

                      {/* Barre de progression */}
                      <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressFill, { width: `${progressWidth}%`, backgroundColor: dColor + '60' }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '800' },
  scrollView: { flex: 1 },
  content: { padding: 16 },

  // Summary
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  summaryLabel: { fontSize: 10, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Empty
  emptyCard: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: { fontSize: 15, fontWeight: '600' },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Month
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    marginTop: 8,
  },
  monthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'capitalize',
    flex: 1,
  },
  monthCount: { fontSize: 12, fontWeight: '600' },

  // Entry
  entryCard: {
    flexDirection: 'row',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  entryColorBar: { width: 4 },
  entryContent: { flex: 1, padding: 14, gap: 8 },
  entryTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryDate: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  entryBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryDuration: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  entryTimeRange: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  entryTimeText: { fontSize: 11, fontWeight: '600' },
  entryTimeSep: { fontSize: 11 },
  progressBg: { height: 3, borderRadius: 2 },
  progressFill: { height: 3, borderRadius: 2 },
});
