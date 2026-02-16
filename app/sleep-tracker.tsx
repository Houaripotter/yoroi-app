import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { ChevronLeft, Moon, Sun, Clock, TrendingUp, Bed, AlertCircle } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';

// ============================================
// SLEEP TRACKER - SUIVI DU SOMMEIL
// ============================================

interface SleepEntry {
  date: string;
  bedtime: string;
  wakeTime: string;
  duration: number; // heures
  quality: 'bad' | 'ok' | 'good' | 'great';
}

const SLEEP_STORAGE_KEY = '@yoroi_sleep_entries';

export default function SleepTrackerScreen() {
  const { colors, isDark } = useTheme();
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [avgSleep, setAvgSleep] = useState(0);
  const [sleepDebt, setSleepDebt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadSleepData = async () => {
      try {
        const stored = await AsyncStorage.getItem(SLEEP_STORAGE_KEY);
        if (cancelled) return;
        if (stored) {
          const entries: SleepEntry[] = JSON.parse(stored);
          setSleepEntries(entries);

          // Calculer moyenne
          if (entries.length > 0) {
            const avg = entries.reduce((sum, e) => sum + e.duration, 0) / entries.length;
            setAvgSleep(avg);
            setSleepDebt(Math.max(0, (8 - avg) * entries.length));
          }
        }
      } catch (error) {
        logger.error('Erreur chargement sommeil:', error);
      }
    };
    loadSleepData();
    return () => { cancelled = true; };
  }, []);

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'great': return '#10B981';
      case 'good': return '#22C55E';
      case 'ok': return '#F59E0B';
      case 'bad': return '#EF4444';
      default: return colors.textMuted;
    }
  };

  const getQualityLabel = (quality: string) => {
    switch (quality) {
      case 'great': return 'Excellent';
      case 'good': return 'Bien';
      case 'ok': return 'Correct';
      case 'bad': return 'Mauvais';
      default: return '-';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Sommeil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={[styles.introCard, { backgroundColor: colors.backgroundCard }]}>
          <Moon size={32} color="#6366F1" />
          <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
            Suivi du Sommeil
          </Text>
          <Text style={[styles.introText, { color: colors.textMuted }]}>
            Le sommeil est essentiel pour la récupération musculaire et la performance.
          </Text>
        </View>

        {/* Stats globales */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Bed size={24} color="#6366F1" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {avgSleep.toFixed(1)}h
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Moyenne</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <AlertCircle size={24} color={sleepDebt > 5 ? '#EF4444' : '#F59E0B'} />
            <Text style={[styles.statValue, { color: sleepDebt > 5 ? '#EF4444' : colors.textPrimary }]}>
              {sleepDebt.toFixed(0)}h
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Dette</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <TrendingUp size={24} color="#10B981" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              8h
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Objectif</Text>
          </View>
        </View>

        {/* Conseils */}
        <View style={[styles.tipsCard, { backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)' }]}>
          <Text style={[styles.tipsTitle, { color: '#6366F1' }]}>Conseils pour mieux dormir</Text>
          <View style={styles.tipsList}>
            <Text style={[styles.tipItem, { color: colors.textPrimary }]}>
              • Couche-toi à heure fixe chaque soir
            </Text>
            <Text style={[styles.tipItem, { color: colors.textPrimary }]}>
              • Évite les écrans 1h avant de dormir
            </Text>
            <Text style={[styles.tipItem, { color: colors.textPrimary }]}>
              • Garde ta chambre fraîche (18-20°C)
            </Text>
            <Text style={[styles.tipItem, { color: colors.textPrimary }]}>
              • Évite la caféine après 14h
            </Text>
            <Text style={[styles.tipItem, { color: colors.textPrimary }]}>
              • Fais de l'exercice mais pas tard le soir
            </Text>
          </View>
        </View>

        {/* Historique */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Historique récent
          </Text>

          {sleepEntries.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.backgroundCard }]}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Aucune donnée de sommeil.{'\n'}
                Connecte l'app Santé ou ajoute manuellement tes nuits.
              </Text>
              <TouchableOpacity
                style={[styles.connectButton, { backgroundColor: '#6366F1' }]}
                onPress={() => router.push('/health-connect')}
              >
                <Text style={styles.connectButtonText}>Connecter l'app Santé</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sleepEntries.slice(0, 7).map((entry, index) => (
              <View
                key={index}
                style={[styles.sleepEntry, { backgroundColor: colors.backgroundCard }]}
              >
                <View style={styles.sleepDate}>
                  <Text style={[styles.sleepDateText, { color: colors.textPrimary }]}>
                    {new Date(entry.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.sleepTimes}>
                  <View style={styles.sleepTime}>
                    <Moon size={14} color={colors.textMuted} />
                    <Text style={[styles.sleepTimeText, { color: colors.textMuted }]}>{entry.bedtime}</Text>
                  </View>
                  <View style={styles.sleepTime}>
                    <Sun size={14} color={colors.textMuted} />
                    <Text style={[styles.sleepTimeText, { color: colors.textMuted }]}>{entry.wakeTime}</Text>
                  </View>
                </View>
                <View style={styles.sleepDuration}>
                  <Text style={[styles.sleepDurationText, { color: colors.textPrimary }]}>
                    {entry.duration.toFixed(1)}h
                  </Text>
                  <Text style={[styles.sleepQuality, { color: getQualityColor(entry.quality) }]}>
                    {getQualityLabel(entry.quality)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  introCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  introTitle: { fontSize: 18, fontWeight: '800', marginTop: 12, marginBottom: 8 },
  introText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  tipsCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  tipsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  tipsList: { gap: 8 },
  tipItem: { fontSize: 14, lineHeight: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyCard: {
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  connectButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  connectButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  sleepEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  sleepDate: { width: 60 },
  sleepDateText: { fontSize: 13, fontWeight: '600' },
  sleepTimes: { flex: 1, gap: 4 },
  sleepTime: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sleepTimeText: { fontSize: 12 },
  sleepDuration: { alignItems: 'flex-end' },
  sleepDurationText: { fontSize: 16, fontWeight: '700' },
  sleepQuality: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
