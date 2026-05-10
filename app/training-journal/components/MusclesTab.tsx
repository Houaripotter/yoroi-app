// ============================================
// MUSCLES TAB · volume par groupe musculaire + équilibre
// Parse les thèmes et benchmarks pour déduire les groupes travaillés
// ============================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, DeviceEventEmitter, TouchableOpacity,
} from 'react-native';
import { Zap, AlertCircle, CheckCircle2, TrendingUp, Film } from 'lucide-react-native';
import VideoLibraryModal from './VideoLibraryModal';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { StatsEmptyState } from '@/components/stats/StatsEmptyState';
import { SkeletonGrid } from '@/components/stats/SkeletonCard';
import logger from '@/lib/security/logger';

const MUSCLE_GROUPS = [
  { key: 'pecs',      label: 'Pectoraux',    color: '#DC2626', keywords: ['pecs', 'pectoraux', 'pectoral', 'pec', 'développé couché', 'dc', 'bench', 'push', 'écartés', 'dips'] },
  { key: 'dos',       label: 'Dos',          color: '#3B82F6', keywords: ['dos', 'back', 'rowing', 'tirage', 'tractions', 'pull', 'lat', 'soulevé de terre', 'sdt', 'deadlift'] },
  { key: 'epaules',   label: 'Épaules',      color: '#F59E0B', keywords: ['épaules', 'epaule', 'shoulder', 'développé militaire', 'dm', 'ohp', 'latéral', 'face pull'] },
  { key: 'biceps',    label: 'Biceps',       color: '#8B5CF6', keywords: ['biceps', 'curl', 'bicep', 'arm'] },
  { key: 'triceps',   label: 'Triceps',      color: '#EC4899', keywords: ['triceps', 'skull crusher', 'extension triceps'] },
  { key: 'jambes',    label: 'Jambes',       color: '#10B981', keywords: ['jambes', 'legs', 'quadri', 'ischio', 'squat', 'fente', 'presse', 'leg press', 'leg extension', 'leg curl'] },
  { key: 'fessiers',  label: 'Fessiers',     color: '#F97316', keywords: ['fessiers', 'fesses', 'glutes', 'hip thrust', 'hip-thrust'] },
  { key: 'mollets',   label: 'Mollets',      color: '#06B6D4', keywords: ['mollets', 'mollet', 'calves', 'calf'] },
  { key: 'abdos',     label: 'Abdos / Core', color: '#A855F7', keywords: ['abdos', 'abs', 'core', 'gainage', 'planche', 'crunch'] },
  { key: 'avant_bras',label: 'Avant-bras',   color: '#14B8A6', keywords: ['avant-bras', 'avant bras', 'grip', 'forearm'] },
];

export default function MusclesTab() {
  const { colors, isDark, screenBackground } = useTheme();
  const accent = screenBackground || '#EC4899';
  const cardBg = colors.backgroundCard;
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const bgColor = isDark ? colors.background : '#F2F2F7';

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [videoLibraryGroup, setVideoLibraryGroup] = useState<{ key: string; label: string; color: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await getTrainings();
      setTrainings(all.filter(t => ['musculation', 'bodybuilding', 'fitness', 'powerlifting'].includes(t.sport)));
    } catch (e) {
      logger.error('[MusclesTab] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', load);
    return () => sub.remove();
  }, [load]);

  const muscleData = useMemo(() => {
    const now = Date.now();
    // Stats sur 30 derniers jours
    const cutoff30 = now - 30 * 86400000;

    const byGroup: Record<string, { total: number; last30: number; lastDate: string | null }> = {};
    for (const t of trainings) {
      const theme = (t.technical_theme || '').toLowerCase();
      const tDate = new Date(t.date).getTime();
      for (const group of MUSCLE_GROUPS) {
        if (group.keywords.some(kw => theme.includes(kw))) {
          if (!byGroup[group.key]) byGroup[group.key] = { total: 0, last30: 0, lastDate: null };
          byGroup[group.key].total++;
          if (tDate >= cutoff30) byGroup[group.key].last30++;
          if (!byGroup[group.key].lastDate || t.date > byGroup[group.key].lastDate!) {
            byGroup[group.key].lastDate = t.date;
          }
        }
      }
    }

    const groupsWithData = MUSCLE_GROUPS.map(g => ({
      ...g,
      ...byGroup[g.key],
      total: byGroup[g.key]?.total || 0,
      last30: byGroup[g.key]?.last30 || 0,
      lastDate: byGroup[g.key]?.lastDate || null,
      daysSinceLast: byGroup[g.key]?.lastDate
        ? Math.floor((now - new Date(byGroup[g.key].lastDate!).getTime()) / 86400000)
        : null,
    }));

    const maxTotal = Math.max(...groupsWithData.map(g => g.total), 1);

    // Groupes négligés (> 14 jours sans travail)
    const neglected = groupsWithData.filter(g => g.daysSinceLast !== null && g.daysSinceLast > 14 && g.total > 0);
    // Groupes bien travaillés (>= 4 séances dans les 30 derniers jours)
    const wellTrained = groupsWithData.filter(g => g.last30 >= 4);

    return { groupsWithData, maxTotal, neglected, wellTrained };
  }, [trainings]);

  if (loading) return <View style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}><SkeletonGrid count={5} /></View>;

  if (trainings.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatsEmptyState
          icon={<Zap size={48} color={colors.textMuted} />}
          title="Aucune donnée muscu"
          description="Ajoute tes séances avec les groupes musculaires dans le thème (ex: Push pecs, Pull dos, Jambes)."
          ctaLabel="Ajouter une séance"
          ctaHref="/add-training"
          accentColor="#EC4899"
        />
      </View>
    );
  }

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: bgColor }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={accent} />}
    >

      {/* Groupes bien travaillés */}
      {muscleData.wellTrained.length > 0 && (
        <View style={[styles.card, { backgroundColor: '#10B98115', borderColor: '#10B981' }]}>
          <View style={styles.head}>
            <CheckCircle2 size={14} color="#10B981" />
            <Text style={[styles.title, { color: '#10B981' }]}>GROUPES BIEN SOLLICITÉS (30J)</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {muscleData.wellTrained.map(g => (
              <View key={g.key} style={[styles.chip, { backgroundColor: g.color + '22', borderColor: g.color }]}>
                <Text style={{ fontSize: 12, fontWeight: '900', color: g.color }}>
                  {g.label} · {g.last30}×
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Groupes négligés */}
      {muscleData.neglected.length > 0 && (
        <View style={[styles.card, { backgroundColor: '#EF444415', borderColor: '#EF4444' }]}>
          <View style={styles.head}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={[styles.title, { color: '#EF4444' }]}>GROUPES À RELANCER</Text>
          </View>
          <View style={{ gap: 6, marginTop: 10 }}>
            {muscleData.neglected.map(g => (
              <View key={g.key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: g.color }}>{g.label}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>
                  {g.daysSinceLast} jours sans
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Volume total par groupe */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <TrendingUp size={14} color="#8B5CF6" />
          <Text style={[styles.title, { color: colors.text }]}>VOLUME PAR GROUPE MUSCULAIRE</Text>
        </View>
        <View style={{ gap: 8, marginTop: 12 }}>
          {muscleData.groupsWithData
            .filter(g => g.total > 0)
            .sort((a, b) => b.total - a.total)
            .map(g => {
              const pct = (g.total / muscleData.maxTotal) * 100;
              return (
                <View key={g.key}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: g.color }}>{g.label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700' }}>
                        {g.total} total
                      </Text>
                      <Text style={{ fontSize: 11, color: g.last30 >= 4 ? '#10B981' : colors.textMuted, fontWeight: '800' }}>
                        {g.last30} en 30j
                      </Text>
                      <TouchableOpacity
                        onPress={() => setVideoLibraryGroup({ key: g.label, label: g.label, color: g.color })}
                        style={[styles.videoBtn, { backgroundColor: g.color + '20' }]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Film size={12} color={g.color} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={[styles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                    <View style={{ height: '100%', width: `${pct}%`, backgroundColor: g.color, borderRadius: 4 }} />
                  </View>
                </View>
              );
            })}
        </View>
        {muscleData.groupsWithData.filter(g => g.total > 0).length === 0 && (
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 10, fontStyle: 'italic', textAlign: 'center' }}>
            Mentionne le groupe musculaire dans le thème de tes séances pour voir le volume.
          </Text>
        )}
      </View>

    </ScrollView>

    {videoLibraryGroup && (
      <VideoLibraryModal
        visible={!!videoLibraryGroup}
        onClose={() => setVideoLibraryGroup(null)}
        muscleGroup={videoLibraryGroup.key}
        muscleGroupLabel={videoLibraryGroup.label}
        muscleGroupColor={videoLibraryGroup.color}
      />
    )}
  </>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  videoBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
