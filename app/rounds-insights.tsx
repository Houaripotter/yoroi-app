// ============================================
// SUIVI DES DÉBRIEFS DE ROUNDS
// Agrège les rounds de toutes les séances de combat pour donner
// à l'utilisateur un retour sur ce qu'il note (sinon il note dans le vide).
// ============================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, TrendingUp, Flame, Target, AlertTriangle, Check,
  Rocket, Activity, Award, Zap,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings, Training, CombatRound } from '@/lib/database';
import { SPORTS, getSportName } from '@/lib/sports';
import logger from '@/lib/security/logger';

// ─── Moods de référence (mêmes que dans add-combat-session) ──────────────────
const MOODS: Record<string, { emoji: string; label: string; color: string }> = {
  fire:       { emoji: '🔥', label: 'Au top',     color: '#EF4444' },
  strong:     { emoji: '💪', label: 'En forme',   color: '#22C55E' },
  focus:      { emoji: '🎯', label: 'Focus',      color: '#3B82F6' },
  flow:       { emoji: '🌊', label: 'Dans le flow', color: '#06B6D4' },
  gassed:     { emoji: '😮‍💨', label: 'Essoufflé',   color: '#F59E0B' },
  tired:      { emoji: '😓', label: 'Fatigué',    color: '#6B7280' },
  confused:   { emoji: '🤯', label: 'Perdu',      color: '#F97316' },
  frustrated: { emoji: '😤', label: 'Frustré',    color: '#DC2626' },
};

// ─── Helpers texte ───────────────────────────────────────────────────────────
/** Extrait les "items" d'un champ texte : séparés par virgule, nettoyés. */
function extractItems(text?: string): string[] {
  if (!text) return [];
  return text
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 2 && s.length <= 80);
}

/** Groupe case-insensitive et compte les occurrences. */
function countByKey(items: string[]): Array<{ label: string; count: number }> {
  const map = new Map<string, { label: string; count: number }>();
  for (const it of items) {
    const k = it.toLowerCase();
    if (!map.has(k)) map.set(k, { label: it, count: 0 });
    map.get(k)!.count += 1;
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// ─── Écran principal ─────────────────────────────────────────────────────────
export default function RoundsInsightsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [sportFilter, setSportFilter] = useState<string | 'all'>('all');

  const load = useCallback(async () => {
    try {
      const all = await getTrainings();
      // Ne garder que les séances qui ont au moins un round débrief
      const withRounds = all.filter(t =>
        Array.isArray(t.combat_rounds) && t.combat_rounds.length > 0
      );
      setTrainings(withRounds);
    } catch (e) {
      logger.error('[RoundsInsights] Erreur chargement:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  // ─── Agrégation ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    // Filtre sport
    const filtered = sportFilter === 'all'
      ? trainings
      : trainings.filter(t => t.sport === sportFilter);

    // Aplatir tous les rounds avec leur contexte
    const allRounds: Array<CombatRound & { date: string; sport: string }> = [];
    for (const t of filtered) {
      if (!t.combat_rounds) continue;
      for (const r of t.combat_rounds) {
        allRounds.push({ ...r, date: t.date, sport: t.sport });
      }
    }

    // Ne garder que ceux qui ont AU MOINS un des champs de débrief remplis
    const debriefed = allRounds.filter(r =>
      !!(r.selfRating || r.mood || r.gamePlan || r.whatWorked || r.whatDidntWork || r.counteredBy || r.improvement)
    );

    // Note moyenne
    const ratings = debriefed.map(r => r.selfRating).filter((v): v is number => typeof v === 'number' && v > 0);
    const avgRating = ratings.length > 0
      ? ratings.reduce((s, v) => s + v, 0) / ratings.length
      : 0;

    // Mood dominant
    const moodCounts = new Map<string, number>();
    for (const r of debriefed) {
      if (r.mood) moodCounts.set(r.mood, (moodCounts.get(r.mood) ?? 0) + 1);
    }
    const moodBreakdown = Array.from(moodCounts.entries())
      .map(([id, count]) => ({ id, count, info: MOODS[id] }))
      .filter(m => m.info) // ignorer moods inconnus
      .sort((a, b) => b.count - a.count);
    const dominantMood = moodBreakdown[0] ?? null;
    const totalMoods = moodBreakdown.reduce((s, m) => s + m.count, 0) || 1;

    // Top items (tokenisé sur virgules)
    const whatWorkedItems = debriefed.flatMap(r => extractItems(r.whatWorked));
    const whatDidntItems = debriefed.flatMap(r => extractItems(r.whatDidntWork));
    const counteredItems = debriefed.flatMap(r => extractItems(r.counteredBy));
    const objectiveItems = debriefed.flatMap(r => extractItems(r.improvement));

    const topWorked = countByKey(whatWorkedItems).slice(0, 5);
    // Mélange "ce qui n'a pas marché" et "contré par" → problèmes
    const topProblems = countByKey([...whatDidntItems, ...counteredItems]).slice(0, 5);
    const topObjectives = countByKey(objectiveItems).slice(0, 5);

    // Évolution : note moyenne par séance (max 12 dernières)
    const bySession = new Map<string, number[]>();
    for (const r of debriefed) {
      if (typeof r.selfRating !== 'number') continue;
      const key = r.date;
      if (!bySession.has(key)) bySession.set(key, []);
      bySession.get(key)!.push(r.selfRating);
    }
    const evolutionAll = Array.from(bySession.entries())
      .map(([date, arr]) => ({ date, avg: arr.reduce((s, v) => s + v, 0) / arr.length }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const evolution = evolutionAll.slice(-12);

    return {
      nbSessions: filtered.length,
      nbRounds: allRounds.length,
      nbDebriefed: debriefed.length,
      avgRating,
      dominantMood,
      moodBreakdown,
      totalMoods,
      topWorked,
      topProblems,
      topObjectives,
      evolution,
    };
  }, [trainings, sportFilter]);

  // Sports présents dans les données
  const availableSports = useMemo(() => {
    const set = new Set<string>();
    trainings.forEach(t => set.add(t.sport));
    return Array.from(set).sort();
  }, [trainings]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent ?? '#8B5CF6'} />
      </View>
    );
  }

  // ─── Vide ─────────────────────────────────────────────────────────────────
  if (stats.nbDebriefed === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Suivi des débriefs</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Target size={56} color={colors.textMuted ?? '#888'} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun round débrifé</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted ?? '#888' }]}>
            Tes débriefs de rounds apparaîtront ici. Plus tu notes, plus tu vois ce qui marche et ce qui bloque.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/add-combat-session')}
            style={[styles.ctaBtn, { backgroundColor: colors.accent ?? '#8B5CF6' }]}
          >
            <Text style={styles.ctaBtnText}>Ajouter une séance de combat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Suivi des débriefs</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted ?? '#888' }]}>
            {stats.nbDebriefed} round{stats.nbDebriefed > 1 ? 's' : ''} débrifé{stats.nbDebriefed > 1 ? 's' : ''} · {stats.nbSessions} séance{stats.nbSessions > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* ─── Filtre sport ─── */}
        {availableSports.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6 }}>
            <Chip label="Tous sports" active={sportFilter === 'all'} onPress={() => setSportFilter('all')} color={colors.accent ?? '#8B5CF6'} />
            {availableSports.map(s => (
              <Chip key={s} label={getSportName(s) || s} active={sportFilter === s} onPress={() => setSportFilter(s)} color={colors.accent ?? '#8B5CF6'} />
            ))}
          </ScrollView>
        )}

        {/* ─── KPI principaux (3 cards) ─── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <KpiCard
            icon={<Activity size={18} color="#8B5CF6" />}
            label="Rounds débrifés"
            value={`${stats.nbDebriefed}`}
            color="#8B5CF6"
            isDark={isDark}
          />
          <KpiCard
            icon={<Award size={18} color="#F59E0B" />}
            label="Note moyenne"
            value={stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)}/10` : '·'}
            color="#F59E0B"
            isDark={isDark}
          />
          <KpiCard
            icon={<Flame size={18} color="#EF4444" />}
            label="Ressenti dominant"
            value={stats.dominantMood ? `${stats.dominantMood.info.emoji}` : '·'}
            subValue={stats.dominantMood ? stats.dominantMood.info.label : ''}
            color="#EF4444"
            isDark={isDark}
          />
        </View>

        {/* ─── Évolution des notes ─── */}
        {stats.evolution.length > 1 && (
          <Card title="Évolution de tes notes" subtitle={`${stats.evolution.length} dernière${stats.evolution.length > 1 ? 's' : ''} séance${stats.evolution.length > 1 ? 's' : ''}`} isDark={isDark} colors={colors} icon={<TrendingUp size={18} color="#22C55E" />}>
            <EvolutionChart data={stats.evolution} isDark={isDark} />
          </Card>
        )}

        {/* ─── Breakdown moods ─── */}
        {stats.moodBreakdown.length > 0 && (
          <Card title="Répartition de tes ressentis" isDark={isDark} colors={colors} icon={<Zap size={18} color="#06B6D4" />}>
            {stats.moodBreakdown.map(m => {
              const pct = Math.round((m.count / stats.totalMoods) * 100);
              return (
                <View key={m.id} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 16 }}>{m.info.emoji}</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.text }}>{m.info.label}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: m.info.color }}>{pct}% · {m.count}</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: `${m.info.color}20`, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: m.info.color, borderRadius: 3 }} />
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* ─── Top ce qui marche ─── */}
        {stats.topWorked.length > 0 && (
          <Card title="Ce qui marche pour toi" subtitle="Techniques/positions les plus citées" isDark={isDark} colors={colors} icon={<Check size={18} color="#22C55E" />}>
            <TopList items={stats.topWorked} color="#22C55E" colors={colors} />
          </Card>
        )}

        {/* ─── Top problèmes (fusion whatDidntWork + counteredBy) ─── */}
        {stats.topProblems.length > 0 && (
          <Card title="Ce qui te pose problème" subtitle="Points à travailler en priorité" isDark={isDark} colors={colors} icon={<AlertTriangle size={18} color="#EF4444" />}>
            <TopList items={stats.topProblems} color="#EF4444" colors={colors} showAlerts />
          </Card>
        )}

        {/* ─── Objectifs récurrents ─── */}
        {stats.topObjectives.length > 0 && (
          <Card title="Tes objectifs récurrents" subtitle="Si un objectif revient souvent = attention à ce point" isDark={isDark} colors={colors} icon={<Rocket size={18} color="#8B5CF6" />}>
            <TopList items={stats.topObjectives} color="#8B5CF6" colors={colors} showAlerts />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

interface ChipProps { label: string; active: boolean; onPress: () => void; color: string }
const Chip: React.FC<ChipProps> = ({ label, active, onPress, color }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={{
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
      backgroundColor: active ? color : `${color}15`,
      borderWidth: 1, borderColor: active ? color : `${color}30`,
    }}
  >
    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : color }}>{label}</Text>
  </TouchableOpacity>
);

interface KpiCardProps {
  icon: React.ReactNode; label: string; value: string; subValue?: string; color: string; isDark: boolean;
}
const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, subValue, color, isDark }) => (
  <View style={{
    flex: 1, borderRadius: 12, padding: 12,
    backgroundColor: isDark ? '#1E1E22' : '#fff',
    borderWidth: 1, borderColor: `${color}30`,
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
      {icon}
      <Text style={{ fontSize: 9, fontWeight: '900', color, letterSpacing: 0.5, flex: 1 }} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
    </View>
    <Text style={{ fontSize: 22, fontWeight: '900', color: isDark ? '#fff' : '#000' }}>{value}</Text>
    {subValue && (
      <Text style={{ fontSize: 10, fontWeight: '600', color: isDark ? '#999' : '#666', marginTop: 2 }}>{subValue}</Text>
    )}
  </View>
);

interface CardProps {
  title: string; subtitle?: string; icon?: React.ReactNode;
  isDark: boolean; colors: any;
  children: React.ReactNode;
}
const Card: React.FC<CardProps> = ({ title, subtitle, icon, isDark, colors, children }) => (
  <View style={{
    borderRadius: 14, padding: 14, marginBottom: 14,
    backgroundColor: isDark ? '#1E1E22' : '#fff',
    borderWidth: 1, borderColor: isDark ? '#2A2A2E' : '#E5E7EB',
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: subtitle ? 2 : 10 }}>
      {icon}
      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, flex: 1 }}>{title}</Text>
    </View>
    {subtitle && (
      <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888', marginBottom: 10 }}>{subtitle}</Text>
    )}
    {children}
  </View>
);

interface TopListProps {
  items: Array<{ label: string; count: number }>;
  color: string;
  colors: any;
  showAlerts?: boolean;
}
const TopList: React.FC<TopListProps> = ({ items, color, colors, showAlerts }) => {
  const maxCount = items[0]?.count ?? 1;
  return (
    <View style={{ gap: 8 }}>
      {items.map((it, i) => {
        const pct = Math.round((it.count / maxCount) * 100);
        const isRecurrent = showAlerts && it.count >= 3;
        return (
          <View key={`${it.label}_${i}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: `${color}20`, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color }}>#{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={2}>{it.label}</Text>
              {isRecurrent && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${color}15`, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <AlertTriangle size={10} color={color} />
                  <Text style={{ fontSize: 9, fontWeight: '900', color }}>RÉCURRENT</Text>
                </View>
              )}
              <Text style={{ fontSize: 12, fontWeight: '800', color, minWidth: 28, textAlign: 'right' }}>×{it.count}</Text>
            </View>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: `${color}15`, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: color, borderRadius: 2 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ─── Chart d'évolution : barres simples (pas de lib externe nécessaire) ─────
interface EvolutionChartProps {
  data: Array<{ date: string; avg: number }>;
  isDark: boolean;
}
const EvolutionChart: React.FC<EvolutionChartProps> = ({ data, isDark }) => {
  const max = 10; // échelle fixe 0-10
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4, paddingHorizontal: 2 }}>
      {data.map((d, i) => {
        const pct = Math.max(8, Math.round((d.avg / max) * 100));
        const color = d.avg <= 4 ? '#EF4444' : d.avg <= 6 ? '#F59E0B' : d.avg <= 8 ? '#22C55E' : '#9333EA';
        const dateShort = d.date.slice(5); // MM-DD
        return (
          <View key={`${d.date}_${i}`} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color }}>{d.avg.toFixed(1)}</Text>
            <View style={{
              width: '100%',
              height: `${pct}%` as any,
              backgroundColor: color,
              borderRadius: 4,
              shadowColor: color,
              shadowOpacity: 0.3,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            }} />
            <Text style={{ fontSize: 8, color: isDark ? '#999' : '#666' }} numberOfLines={1}>{dateShort}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  ctaBtn: { marginTop: 24, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  ctaBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
