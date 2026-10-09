// ============================================
// YOROI · MON GAME PLAN
// Playbook personnel : checklist prochaine séance,
// ce qui marche, dangers à défendre, journal des game plans
// ============================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SkeletonCard, SkeletonMessage } from '@/components/stats/SkeletonCard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Target,
  CheckCircle2,
  Circle,
  Zap,
  Shield,
  BookOpen,
  TrendingUp,
  Flame,
  Sparkles,
  User,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings, Training, CombatRound } from '@/lib/database';
import logger from '@/lib/security/logger';
import { getMethodDisplayName } from '@/components/BJJBodyMap';
import { PremiumGate } from '@/components/premium/PremiumGate';

const CHECKED_KEY = '@yoroi_gameplan_checked';

// ─── Helpers ────────────────────────────────────────────────────────────────
const parseRounds = (raw: any): CombatRound[] => {
  if (!raw) return [];
  try { return Array.isArray(raw) ? raw : JSON.parse(raw); } catch { return []; }
};

const tokenize = (text: string): string[] => {
  return text
    .split(/[,;.\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);
};

const countFreq = (items: string[]): Array<[string, number]> => {
  const map: Record<string, number> = {};
  for (const i of items) {
    const key = i.trim();
    if (!key) continue;
    map[key] = (map[key] ?? 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
};

// ─── Écran principal ────────────────────────────────────────────────────────
export default function GamePlanScreen() {
  const { colors, isDark, screenBackground } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ partnerName?: string }>();

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getTrainings(3650);
      setTrainings(data);
      const raw = await AsyncStorage.getItem(CHECKED_KEY);
      if (raw) setChecked(new Set(JSON.parse(raw)));
    } catch (e) {
      logger.error('GamePlan load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleCheck = async (id: string) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      AsyncStorage.setItem(CHECKED_KEY, JSON.stringify(Array.from(next))).catch(() => {});
      return next;
    });
  };

  // ── Extraction et agrégation ────────────────────────────────────────────
  const data = useMemo(() => {
    // Filtrer par partenaire si param
    const filter = (r: CombatRound) => {
      if (!params.partnerName) return true;
      return (r.partner ?? '').toLowerCase().includes(params.partnerName.toLowerCase().trim());
    };

    // Entrées triées par date DESC (récent d'abord)
    type Entry = { date: string; trainingId?: number; round: CombatRound; sport: string };
    const entries: Entry[] = [];
    for (const t of trainings) {
      const rounds = parseRounds(t.combat_rounds);
      for (const r of rounds) {
        if (!filter(r)) continue;
        entries.push({ date: t.date, trainingId: t.id, round: r, sport: t.sport });
      }
    }
    entries.sort((a, b) => b.date.localeCompare(a.date));

    // Checklist = tous les `improvement` non cochés, max 10
    const checklistRaw = entries
      .filter(e => e.round.improvement && e.round.improvement.trim().length > 0)
      .map(e => ({
        id: `imp_${e.trainingId ?? 0}_${e.round.number}`,
        text: e.round.improvement!.trim(),
        date: e.date,
        partner: e.round.partner ?? null,
        source: 'improvement' as const,
      }));

    // Ajouter aussi les counteredBy comme "à défendre"
    const defendRaw = entries
      .filter(e => e.round.counteredBy && e.round.counteredBy.trim().length > 0)
      .slice(0, 15)
      .map(e => ({
        id: `def_${e.trainingId ?? 0}_${e.round.number}`,
        text: `Défendre : ${e.round.counteredBy!.trim()}`,
        date: e.date,
        partner: e.round.partner ?? null,
        source: 'defense' as const,
      }));

    // Dedup par texte + trier par date desc
    const seen = new Set<string>();
    const checklist = [...checklistRaw, ...defendRaw]
      .filter(item => {
        const key = item.text.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 12);

    // Playbook : agrégation "ce qui a marché"
    const whatWorkedItems = entries
      .flatMap(e => e.round.whatWorked ? tokenize(e.round.whatWorked) : [])
      .filter(s => s.length > 0);
    const methodsGivenItems = entries
      .flatMap(e => (e.round.methodsGiven ?? []).map(m => getMethodDisplayName(m)));
    const playbook = countFreq([...whatWorkedItems, ...methodsGivenItems]).slice(0, 8);

    // Dangers : agrégation "ce qui n'a pas marché" + "contré par" + methodsTaken
    const whatDidntItems = entries
      .flatMap(e => e.round.whatDidntWork ? tokenize(e.round.whatDidntWork) : []);
    const counteredByItems = entries
      .flatMap(e => e.round.counteredBy ? tokenize(e.round.counteredBy) : []);
    const methodsTakenItems = entries
      .flatMap(e => (e.round.methodsTaken ?? []).map(m => getMethodDisplayName(m)));
    const dangers = countFreq([...whatDidntItems, ...counteredByItems, ...methodsTakenItems]).slice(0, 8);

    // Journal des game plans
    const gamePlans = entries
      .filter(e => e.round.gamePlan && e.round.gamePlan.trim().length > 0)
      .slice(0, 20)
      .map(e => ({
        id: `gp_${e.trainingId ?? 0}_${e.round.number}`,
        text: e.round.gamePlan!.trim(),
        date: e.date,
        partner: e.round.partner ?? null,
        roundNum: e.round.number,
        result: e.round.result,
        whatWorked: e.round.whatWorked,
      }));

    // Stats d'exécution
    const totalGamePlans = entries.filter(e => e.round.gamePlan).length;
    const executedGamePlans = entries.filter(e => e.round.gamePlan && e.round.whatWorked).length;
    const executionRate = totalGamePlans > 0 ? Math.round((executedGamePlans / totalGamePlans) * 100) : 0;

    // ── Fiabilité des game plans (groupement par texte similaire) ──
    const gpReliability: Record<string, { total: number; success: number; lastDate: string }> = {};
    for (const e of entries) {
      if (!e.round.gamePlan?.trim()) continue;
      const key = e.round.gamePlan.trim().toLowerCase();
      if (!gpReliability[key]) gpReliability[key] = { total: 0, success: 0, lastDate: e.date };
      gpReliability[key].total++;
      if (e.round.whatWorked?.trim() && e.round.result === 'win') gpReliability[key].success++;
      if (e.date > gpReliability[key].lastDate) gpReliability[key].lastDate = e.date;
    }
    const gpStats = Object.entries(gpReliability)
      .map(([text, v]) => ({
        text: entries.find(e => e.round.gamePlan?.trim().toLowerCase() === text)?.round.gamePlan ?? text,
        total: v.total,
        success: v.success,
        rate: v.total > 0 ? Math.round((v.success / v.total) * 100) : 0,
        lastDate: v.lastDate,
      }))
      .filter(s => s.total >= 1)
      .sort((a, b) => b.total - a.total || b.rate - a.rate)
      .slice(0, 10);

    return { entries, checklist, playbook, dangers, gamePlans, totalGamePlans, executedGamePlans, executionRate, gpStats };
  }, [trainings, params.partnerName]);

  // Prochaine date estimée (sept jours depuis dernière séance)
  const nextSessionHint = useMemo(() => {
    if (data.entries.length === 0) return 'Ta prochaine séance';
    const last = new Date(data.entries[0].date);
    const daysSince = Math.floor((Date.now() - last.getTime()) / 86400000);
    if (daysSince === 0) return "Aujourd'hui";
    if (daysSince === 1) return 'Hier · prochaine séance';
    return `Dernière séance il y a ${daysSince}j`;
  }, [data.entries]);

  const uncheckedCount = data.checklist.filter(c => !checked.has(c.id)).length;
  const bgColor = isDark ? colors.background : '#F2F2F7';
  const cardBg = colors.backgroundCard ?? (isDark ? '#1a1a1a' : '#fff');
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  return (
    <PremiumGate featureTitle="Mon Game Plan">
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* ── Header ── */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' }}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text, letterSpacing: 0.3 }}>
          {params.partnerName ? `Game Plan · ${params.partnerName}` : 'Mon Game Plan'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 280 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(true); }} />}
      >
        {/* Skeleton pendant le chargement initial */}
        {loading && (
          <View style={{ gap: 12 }}>
            <SkeletonCard height={130} width="100%" />
            <SkeletonCard height={180} width="100%" />
            <SkeletonCard height={180} width="100%" />
            <SkeletonCard height={150} width="100%" />
            <SkeletonMessage />
          </View>
        )}
        {!loading && (
        <>
        {/* ════════════════════════════════════════════════
            🔥 HERO "PROCHAINE SÉANCE"
            ════════════════════════════════════════════════ */}
        <LinearGradient
          colors={['#8B5CF6', '#6D28D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 18, marginBottom: 12, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Flame size={16} color="#FBBF24" />
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 1.5 }}>PROCHAINE SÉANCE</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 0.3, marginBottom: 4 }}>
            {nextSessionHint}
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18 }}>
            {uncheckedCount > 0
              ? `${uncheckedCount} objectif${uncheckedCount > 1 ? 's' : ''} en attente · coche quand c'est travaillé`
              : data.checklist.length > 0
                ? 'Checklist complète. Ajoute de nouveaux objectifs dans tes rounds.'
                : 'Remplis tes analyses de round pour générer ta checklist automatiquement.'}
          </Text>

          {/* Stats d'exécution */}
          {data.totalGamePlans > 0 && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{data.totalGamePlans}</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '700', letterSpacing: 0.5 }}>GAME PLANS</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{data.executedGamePlans}</Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '700', letterSpacing: 0.5 }}>EXÉCUTÉS</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(251,191,36,0.25)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FBBF24' }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#FBBF24' }}>{data.executionRate}%</Text>
                <Text style={{ fontSize: 10, color: '#FBBF24', fontWeight: '700', letterSpacing: 0.5 }}>TAUX</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* ════════════════════════════════════════════════
            ✅ CHECKLIST PROCHAINE SÉANCE
            ════════════════════════════════════════════════ */}
        {data.checklist.length > 0 ? (
          <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' }}>
                <CheckCircle2 size={17} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>À travailler</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>
                  {checked.size > 0 ? `${checked.size}/${data.checklist.length} cochés` : `${data.checklist.length} objectifs`}
                </Text>
              </View>
              {checked.size > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    setChecked(new Set());
                    AsyncStorage.removeItem(CHECKED_KEY).catch(() => {});
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted ?? '#888' }}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ gap: 8 }}>
              {data.checklist.map(item => {
                const isChecked = checked.has(item.id);
                const isDefense = item.source === 'defense';
                const color = isDefense ? '#F59E0B' : '#22C55E';
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => toggleCheck(item.id)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                      backgroundColor: isChecked ? (isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)') : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                      borderRadius: 10, padding: 10,
                      borderLeftWidth: 3,
                      borderLeftColor: isChecked ? '#22C55E' : color,
                      opacity: isChecked ? 0.6 : 1,
                    }}
                  >
                    <View style={{ marginTop: 1 }}>
                      {isChecked ? <CheckCircle2 size={20} color="#22C55E" /> : <Circle size={20} color={color} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 18, textDecorationLine: isChecked ? 'line-through' : 'none' }}>
                        {item.text}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        {item.partner && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <User size={9} color={colors.textMuted ?? '#888'} />
                            <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888' }}>{item.partner}</Text>
                          </View>
                        )}
                        <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888' }}>·</Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888' }}>
                          {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </Text>
                        {isDefense && (
                          <View style={{ backgroundColor: '#F59E0B20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#F59E0B' }}>DÉFENSE</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 20, alignItems: 'center', marginBottom: 12 }}>
            <Target size={36} color={colors.textMuted ?? '#888'} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 10, textAlign: 'center' }}>
              Pas encore d'objectifs
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888', marginTop: 4, textAlign: 'center', lineHeight: 15 }}>
              Remplis le champ "Objectif prochain round" dans tes séances pour alimenter ta checklist automatiquement.
            </Text>
          </View>
        )}

        {/* ════════════════════════════════════════════════
            📈 FIABILITÉ DES GAME PLANS · % de réussite par plan
            ════════════════════════════════════════════════ */}
        {data.gpStats.length > 0 && (
          <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' }}>
                <TrendingUp size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>Fiabilité de mes plans</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>Quel % de réussite pour chaque plan testé</Text>
              </View>
            </View>
            <View style={{ gap: 8 }}>
              {data.gpStats.map((gp, i) => {
                const rateColor = gp.rate >= 60 ? '#22C55E' : gp.rate >= 30 ? '#F59E0B' : '#EF4444';
                return (
                  <View key={i} style={{ backgroundColor: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)', borderRadius: 12, padding: 10, borderLeftWidth: 3, borderLeftColor: rateColor }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 17 }} numberOfLines={2}>{gp.text}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: rateColor }}>{gp.rate}%</Text>
                        <Text style={{ fontSize: 9, color: colors.textMuted ?? '#888', fontWeight: '700' }}>
                          {gp.success}/{gp.total} tests
                        </Text>
                      </View>
                    </View>
                    <View style={{ height: 4, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                      <View style={{ width: `${gp.rate}%` as any, height: '100%', backgroundColor: rateColor, borderRadius: 2 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════
            ⚡ PLAYBOOK · ce qui marche
            ════════════════════════════════════════════════ */}
        {data.playbook.length > 0 && (
          <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' }}>
                <Zap size={17} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>Mon Playbook</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>Ce qui fonctionne chez moi · à reproduire</Text>
              </View>
            </View>
            <View style={{ gap: 7 }}>
              {data.playbook.map(([tech, count], idx) => {
                const pct = (count / data.playbook[0][1]) * 100;
                const isTop = idx === 0;
                return (
                  <View key={tech} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: isTop ? '#22C55E' : '#22C55E30', justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: isTop ? '#fff' : '#22C55E' }}>#{idx + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.text }}>{tech}</Text>
                    <View style={{ width: 80, height: 6, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: '#22C55E', borderRadius: 3 }} />
                    </View>
                    <Text style={{ width: 30, textAlign: 'right', fontSize: 12, fontWeight: '900', color: '#22C55E' }}>×{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════
            🛡️ DANGERS · ce qui me pose problème
            ════════════════════════════════════════════════ */}
        {data.dangers.length > 0 && (
          <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}>
                <Shield size={17} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>À défendre</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>Ce qui te pose problème en sparring</Text>
              </View>
            </View>
            <View style={{ gap: 7 }}>
              {data.dangers.map(([tech, count], idx) => {
                const pct = (count / data.dangers[0][1]) * 100;
                const isTop = idx === 0;
                return (
                  <View key={tech} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: isTop ? '#EF4444' : '#EF444430', justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: isTop ? '#fff' : '#EF4444' }}>#{idx + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.text }}>{tech}</Text>
                    <View style={{ width: 80, height: 6, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: '#EF4444', borderRadius: 3 }} />
                    </View>
                    <Text style={{ width: 30, textAlign: 'right', fontSize: 12, fontWeight: '900', color: '#EF4444' }}>×{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════
            📖 JOURNAL · timeline de mes game plans
            ════════════════════════════════════════════════ */}
        {data.gamePlans.length > 0 && (
          <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: border, padding: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' }}>
                <BookOpen size={17} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>Journal de game plan</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>Tes stratégies round par round</Text>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              {data.gamePlans.map((gp, i) => {
                const resultColor = gp.result === 'win' ? '#22C55E' : gp.result === 'loss' ? '#EF4444' : gp.result === 'draw' ? '#F59E0B' : '#6B7280';
                const resultLabel = gp.result === 'win' ? 'V' : gp.result === 'loss' ? 'D' : gp.result === 'draw' ? 'N' : '·';
                const hasExecuted = !!gp.whatWorked;
                return (
                  <TouchableOpacity
                    key={gp.id}
                    onPress={() => gp.id.startsWith('gp_') && router.push(`/workout-detail?id=${gp.id.split('_')[1]}` as any)}
                    activeOpacity={0.75}
                    style={{
                      backgroundColor: isDark ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)',
                      borderRadius: 12, padding: 12,
                      borderLeftWidth: 3, borderLeftColor: '#3B82F6',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: resultColor, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff' }}>{resultLabel}</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#3B82F6' }}>
                        R{gp.roundNum}
                      </Text>
                      {gp.partner && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>· vs</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{gp.partner}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }} />
                      <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888' }}>
                        {new Date(gp.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </Text>
                      {hasExecuted && (
                        <View style={{ backgroundColor: '#22C55E', borderRadius: 10, width: 14, height: 14, justifyContent: 'center', alignItems: 'center' }}>
                          <CheckCircle2 size={10} color="#fff" />
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>
                      {gp.text}
                    </Text>
                    {gp.whatWorked && (
                      <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                          <CheckCircle2 size={10} color="#22C55E" />
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#22C55E' }}>CE QUI A MARCHÉ</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: colors.text, lineHeight: 16 }} numberOfLines={2}>{gp.whatWorked}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* État vide global */}
        {data.checklist.length === 0 && data.playbook.length === 0 && data.dangers.length === 0 && data.gamePlans.length === 0 && !loading && (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 14 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#8B5CF620', justifyContent: 'center', alignItems: 'center' }}>
              <Sparkles size={40} color="#8B5CF6" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, textAlign: 'center' }}>
              Ton playbook est vide
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted ?? '#888', textAlign: 'center', maxWidth: 300, lineHeight: 19 }}>
              Enregistre une séance de sparring et remplis les champs d'analyse (game plan, ce qui a marché, contré par, amélioration) pour alimenter automatiquement ton game plan.
            </Text>
            <TouchableOpacity
              onPress={() => { impactAsync(ImpactFeedbackStyle.Medium); router.push('/add-combat-session' as any); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#8B5CF6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginTop: 6 }}
            >
              <TrendingUp size={15} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#fff' }}>Commencer une séance</Text>
            </TouchableOpacity>
          </View>
        )}
        </>
        )}
      </ScrollView>
    </View>
    </PremiumGate>
  );
}
