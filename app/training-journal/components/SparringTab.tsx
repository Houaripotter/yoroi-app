// ============================================
// SPARRING TAB — Onglet Combat du Carnet
// Analyse sparring : partenaires, techniques, finitions
// ============================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings } from '@/lib/database';
import type { Training, CombatRound } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import {
  Users, Zap, Target, TrendingUp, BarChart2, X, ChevronRight,
  Calendar, Clock, CheckCircle, Circle, Flame, Settings, Star,
} from 'lucide-react-native';
import { BarChart } from 'react-native-gifted-charts';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEEKLY_GOAL_KEY = '@sparring_weekly_goal';

// ============================================
// TYPES
// ============================================

interface PartnerStats {
  name: string;
  totalRounds: number;
  wins: number;
  losses: number;
  draws: number;
  submissionsGiven: number;
  submissionsTaken: number;
  lastSession?: string;
  sessions: PartnerSession[];
}

interface PartnerSession {
  date: string;
  sport: string;
  rounds: CombatRound[];
  technicalTheme?: string;
}

interface TechniqueStats {
  name: string;
  count: number;
  lastSession?: string;
}

interface SubmissionStats {
  name: string;
  given: number;
  taken: number;
}

interface WeeklyBar {
  value: number;
  label: string;
  frontColor: string;
  wins: number;
  total: number;
}

interface RecentSession {
  id: number | undefined;
  date: string;
  sport: string;
  roundsCount: number;
  partners: string[];
  technicalTheme?: string;
  wins: number;
  losses: number;
}

// ============================================
// HELPERS
// ============================================

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const week = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function currentWeekKey(): string {
  return isoWeekKey(new Date().toISOString().slice(0, 10));
}

function weekLabel(key: string): string {
  return key.split('-W')[1] ? `S${key.split('-W')[1]}` : key;
}

function parseCombatRounds(raw: any): CombatRound[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function formatDateShort(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

function formatDateFull(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

function resultColor(result: string) {
  if (result === 'win') return '#22C55E';
  if (result === 'loss') return '#EF4444';
  return '#F59E0B';
}

function resultLabel(result: string) {
  if (result === 'win') return 'V';
  if (result === 'loss') return 'D';
  return 'N';
}

function isCombatSport(sport: string): boolean {
  const s = sport.toLowerCase();
  const prefixes = ['bo_', 'mt_', 'kb_', 'mma_', 'jjb_', 'j_', 'lu_', 'g_', 'p_', 's_', 't_'];
  const keywords = ['boxe', 'muay', 'kick', 'mma', 'jiu', 'judo', 'lutte', 'grappling', 'sparring', 'combat', 'karate', 'taekwondo', 'wrestling'];
  return prefixes.some(p => s.startsWith(p)) || keywords.some(k => s.includes(k));
}

// Hash simple pour couleur d'avatar
function nameToColor(name: string): string {
  // Palette de couleurs visuellement harmonieuses (pas de roses/saumons garish)
  const palette = [
    '#6366F1', '#0EA5E9', '#10B981', '#F59E0B',
    '#8B5CF6', '#14B8A6', '#3B82F6', '#22C55E',
    '#7C3AED', '#0284C7', '#059669', '#D97706',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % palette.length;
  return palette[Math.abs(hash)];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

interface SparringTabProps {
  refreshTrigger?: number;
}

export default function SparringTab({ refreshTrigger }: SparringTabProps) {
  const { colors, isDark, screenBackground } = useTheme();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtres
  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  // Objectif hebdo
  const [weeklyGoal, setWeeklyGoal] = useState<number>(20);
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [goalInput, setGoalInput] = useState('20');

  // Modal partenaire
  const [selectedPartner, setSelectedPartner] = useState<PartnerStats | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getTrainings(3650);
      setTrainings(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [refreshTrigger]);

  useEffect(() => {
    AsyncStorage.getItem(WEEKLY_GOAL_KEY).then(v => {
      if (v) { setWeeklyGoal(parseInt(v, 10)); setGoalInput(v); }
    });
  }, []);

  const saveGoal = useCallback(async () => {
    const val = parseInt(goalInput, 10);
    if (!isNaN(val) && val > 0) {
      setWeeklyGoal(val);
      await AsyncStorage.setItem(WEEKLY_GOAL_KEY, String(val));
    }
    setShowGoalEditor(false);
  }, [goalInput]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  // ── Sports uniques ayant des données combat ──
  const combatSports = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const tr of trainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      if (rounds.length > 0 || tr.technical_theme?.trim()) {
        if (tr.sport) set.add(tr.sport);
      }
    }
    return Array.from(set).sort();
  }, [trainings]);

  // ── Trainings filtrés ──
  const filteredTrainings = useMemo(() => {
    return trainings.filter(tr => {
      const rounds = parseCombatRounds(tr.combat_rounds);
      const hasCombat = rounds.length > 0 || tr.technical_theme?.trim();
      if (!hasCombat) return false;
      if (selectedSport && tr.sport !== selectedSport) return false;
      return true;
    });
  }, [trainings, selectedSport]);

  // ── Partenaires ──
  const partnerStats = useMemo<PartnerStats[]>(() => {
    const map: Record<string, PartnerStats> = {};
    for (const tr of filteredTrainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      const partnersInSession: Record<string, CombatRound[]> = {};
      for (const r of rounds) {
        if (!r.partner?.trim()) continue;
        const key = r.partner.trim().toLowerCase();
        if (!map[key]) map[key] = {
          name: r.partner.trim(), totalRounds: 0, wins: 0, losses: 0, draws: 0,
          submissionsGiven: 0, submissionsTaken: 0, lastSession: tr.date, sessions: [],
        };
        const p = map[key];
        p.totalRounds++;
        if (r.result === 'win') p.wins++;
        else if (r.result === 'loss') p.losses++;
        else if (r.result === 'draw') p.draws++;
        // Compter les finitions : champ legacy + nouvelles listes multi-select
        p.submissionsGiven += Math.max(r.submissionsGiven ?? 0, r.methodsGiven?.length ?? 0);
        p.submissionsTaken += Math.max(r.submissionsTaken ?? 0, r.methodsTaken?.length ?? 0);
        if (!p.lastSession || tr.date > p.lastSession) p.lastSession = tr.date;
        if (!partnersInSession[key]) partnersInSession[key] = [];
        partnersInSession[key].push(r);
      }
      // Ajouter la session à chaque partenaire rencontré
      for (const [key, pRounds] of Object.entries(partnersInSession)) {
        if (map[key]) {
          map[key].sessions.push({
            date: tr.date,
            sport: tr.sport,
            rounds: pRounds,
            technicalTheme: tr.technical_theme,
          });
        }
      }
    }
    // Trier les sessions de chaque partenaire par date desc
    for (const p of Object.values(map)) {
      p.sessions.sort((a, b) => b.date.localeCompare(a.date));
    }
    return Object.values(map).sort((a, b) => b.totalRounds - a.totalRounds);
  }, [filteredTrainings]);

  // ── Techniques ──
  const techniqueStats = useMemo<TechniqueStats[]>(() => {
    const map: Record<string, TechniqueStats> = {};
    for (const tr of filteredTrainings) {
      if (!tr.technical_theme?.trim()) continue;
      const key = tr.technical_theme.trim().toLowerCase();
      if (!map[key]) map[key] = { name: tr.technical_theme.trim(), count: 0, lastSession: tr.date };
      map[key].count++;
      if (tr.date > (map[key].lastSession ?? '')) map[key].lastSession = tr.date;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredTrainings]);

  // ── Finitions ──
  const submissionStats = useMemo<SubmissionStats[]>(() => {
    const map: Record<string, SubmissionStats> = {};
    for (const tr of filteredTrainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      for (const r of rounds) {
        if (!r.method?.trim()) continue;
        const key = r.method.trim().toLowerCase();
        if (!map[key]) map[key] = { name: r.method.trim(), given: 0, taken: 0 };
        if (r.result === 'win') map[key].given++;
        else if (r.result === 'loss') map[key].taken++;
      }
    }
    return Object.values(map).sort((a, b) => (b.given + b.taken) - (a.given + a.taken));
  }, [filteredTrainings]);

  // ── Séances récentes ──
  const recentSessions = useMemo<RecentSession[]>(() => {
    return filteredTrainings
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
      .map(tr => {
        const rounds = parseCombatRounds(tr.combat_rounds);
        const partners = Array.from(new Set(rounds.map(r => r.partner).filter(Boolean) as string[]));
        const wins = rounds.filter(r => r.result === 'win').length;
        const losses = rounds.filter(r => r.result === 'loss').length;
        return {
          id: tr.id,
          date: tr.date,
          sport: tr.sport,
          roundsCount: rounds.length > 0 ? rounds.length : (tr.rounds ?? 0),
          partners,
          technicalTheme: tr.technical_theme,
          wins,
          losses,
        };
      });
  }, [filteredTrainings]);

  // ── Graphique rounds par semaine ──
  const weeklyBars = useMemo<WeeklyBar[]>(() => {
    const map: Record<string, { rounds: number; wins: number; total: number }> = {};
    for (const tr of filteredTrainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      if (rounds.length === 0 && !(tr.rounds && tr.rounds > 0)) continue;
      const key = isoWeekKey(tr.date);
      if (!map[key]) map[key] = { rounds: 0, wins: 0, total: 0 };
      const count = rounds.length > 0 ? rounds.length : (tr.rounds ?? 0);
      map[key].rounds += count;
      for (const r of rounds) {
        if (r.result === 'win') map[key].wins++;
        if (r.result === 'win' || r.result === 'loss') map[key].total++;
      }
    }
    const sorted = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12);
    const maxVal = Math.max(...sorted.map(([, v]) => v.rounds), 1);
    return sorted.map(([key, v]) => ({
      value: v.rounds,
      label: weekLabel(key),
      frontColor: v.rounds >= maxVal * 0.8 ? (screenBackground || '#8B5CF6') : v.rounds >= maxVal * 0.4 ? '#A78BFA' : '#C4B5FD',
      wins: v.wins,
      total: v.total,
    }));
  }, [filteredTrainings, screenBackground]);

  // ── Rounds cette semaine (pour objectif) ──
  const thisWeekRounds = useMemo(() => {
    const key = currentWeekKey();
    const bar = weeklyBars.find(b => {
      // On retrouve la semaine courante via le label
      const curLabel = weekLabel(key);
      return b.label === curLabel;
    });
    // Recalcul direct pour être sûr
    let count = 0;
    const curKey = currentWeekKey();
    for (const tr of filteredTrainings) {
      if (isoWeekKey(tr.date) !== curKey) continue;
      const rounds = parseCombatRounds(tr.combat_rounds);
      count += rounds.length > 0 ? rounds.length : (tr.rounds ?? 0);
    }
    return count;
  }, [filteredTrainings, weeklyBars]);

  // ── Win rate mensuel ──
  const monthlyWinRate = useMemo(() => {
    const map: Record<string, { wins: number; total: number }> = {};
    for (const tr of filteredTrainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      for (const r of rounds) {
        if (r.result !== 'win' && r.result !== 'loss') continue;
        const key = tr.date.slice(0, 7);
        if (!map[key]) map[key] = { wins: 0, total: 0 };
        if (r.result === 'win') map[key].wins++;
        map[key].total++;
      }
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, v]) => ({
        value: v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0,
        label: new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'short' }),
        total: v.total,
      }));
  }, [filteredTrainings]);

  // ── Totaux ──
  const totals = useMemo(() => {
    let rounds = 0, wins = 0, losses = 0;
    for (const p of partnerStats) { rounds += p.totalRounds; wins += p.wins; losses += p.losses; }
    const winRate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
    return { rounds, wins, losses, winRate, partners: partnerStats.length, techniques: techniqueStats.length };
  }, [partnerStats, techniqueStats]);

  const maxRounds = partnerStats[0]?.totalRounds ?? 1;
  const maxTech = techniqueStats[0]?.count ?? 1;

  const accent = screenBackground || '#06B6D4';
  const bgColor = isDark ? colors.background : '#F2F2F7';
  const cardBg = colors.backgroundCard;
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const sepColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const trackBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  const isEmpty = partnerStats.length === 0 && techniqueStats.length === 0;

  // Segments pour la barre de progression hebdo
  const goalSegments = Math.max(weeklyGoal, 1);
  const filledSegments = Math.min(thisWeekRounds, goalSegments);
  const progressPercent = Math.min((thisWeekRounds / weeklyGoal) * 100, 100);
  const goalReached = thisWeekRounds >= weeklyGoal;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: bgColor }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} colors={[accent]} />}
      >
        {/* ── FILTRE PAR SPORT ── */}
        {combatSports.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
          >
            <TouchableOpacity
              style={[styles.sportPill, {
                backgroundColor: selectedSport === null ? accent : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                borderColor: selectedSport === null ? accent : cardBorder,
              }]}
              onPress={() => setSelectedSport(null)}
            >
              <Text style={[styles.sportPillText, { color: selectedSport === null ? '#FFF' : colors.textMuted }]}>
                Tous
              </Text>
            </TouchableOpacity>
            {combatSports.map(sport => (
              <TouchableOpacity
                key={sport}
                style={[styles.sportPill, {
                  backgroundColor: selectedSport === sport ? accent : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                  borderColor: selectedSport === sport ? accent : cardBorder,
                }]}
                onPress={() => setSelectedSport(sport === selectedSport ? null : sport)}
              >
                <Text style={[styles.sportPillText, { color: selectedSport === sport ? '#FFF' : colors.textMuted }]}>
                  {getSportName(sport)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── VIDE ── */}
        {isEmpty && (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Pas encore de données</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Ajoute des séances avec des partenaires de sparring ou des thèmes techniques pour voir tes statistiques ici.
            </Text>
          </View>
        )}

        {/* ── PODIUM TOP 3 — tout en haut ── */}
        {partnerStats.length >= 2 && (
          <PodiumSection
            partners={partnerStats.slice(0, 3)}
            accent={accent}
            colors={colors}
            isDark={isDark}
            onSelect={setSelectedPartner}
          />
        )}

        {/* ── VUE D'ENSEMBLE — grille 2×2 ── */}
        {!isEmpty && (
          <View style={styles.overviewGrid}>
            {/* Rounds */}
            <View style={[styles.overviewBox, { backgroundColor: '#8B5CF620' }]}>
              <Text style={[styles.overviewValue, { color: '#8B5CF6' }]}>{totals.rounds}</Text>
              <Text style={[styles.overviewLabel, { color: '#8B5CF6' }]}>Rounds</Text>
            </View>
            {/* Partenaires */}
            <View style={[styles.overviewBox, { backgroundColor: `${accent}20` }]}>
              <Text style={[styles.overviewValue, { color: accent }]}>{totals.partners}</Text>
              <Text style={[styles.overviewLabel, { color: accent }]}>Partenaires</Text>
            </View>
            {/* Techniques */}
            <View style={[styles.overviewBox, { backgroundColor: '#F59E0B20' }]}>
              <Text style={[styles.overviewValue, { color: '#F59E0B' }]}>{totals.techniques}</Text>
              <Text style={[styles.overviewLabel, { color: '#F59E0B' }]}>Techniques</Text>
            </View>
            {/* Win rate */}
            <View style={[styles.overviewBox, { backgroundColor: '#22C55E20' }]}>
              <Text style={[styles.overviewValue, { color: '#22C55E' }]}>
                {totals.winRate !== null ? `${totals.winRate}%` : '--'}
              </Text>
              <Text style={[styles.overviewLabel, { color: '#22C55E' }]}>Win rate</Text>
            </View>
          </View>
        )}

        {/* ── OBJECTIF HEBDOMADAIRE ── */}
        {!isEmpty && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Objectif semaine</Text>
              <TouchableOpacity
                onPress={() => { setGoalInput(String(weeklyGoal)); setShowGoalEditor(true); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Settings size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Compteur + statut */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={{ fontSize: 36, fontWeight: '900', color: goalReached ? '#22C55E' : colors.text, lineHeight: 42 }}>
                  {thisWeekRounds}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '500', color: colors.textMuted }}>
                  / {weeklyGoal} rounds
                </Text>
              </View>
              {goalReached ? (
                <View style={[styles.goalBadge, { backgroundColor: '#22C55E18' }]}>
                  <CheckCircle size={13} color="#22C55E" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#22C55E' }}>Objectif atteint!</Text>
                </View>
              ) : (
                <View style={[styles.goalBadge, { backgroundColor: '#F59E0B14' }]}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#F59E0B' }}>
                    {weeklyGoal - thisWeekRounds} restants
                  </Text>
                </View>
              )}
            </View>

            {/* Barre de progression segmentée */}
            <View style={{ marginTop: 10, gap: 6 }}>
              <View style={[styles.progressTrack, { backgroundColor: trackBg }]}>
                <View style={[styles.progressFill, {
                  width: `${progressPercent}%` as any,
                  backgroundColor: goalReached ? '#22C55E' : '#F59E0B',
                }]} />
                {/* Ligne pointillée objectif (quand pas encore atteint) */}
                {!goalReached && (
                  <View style={[styles.goalLine, { right: 0 }]} />
                )}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>0</Text>
                <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '600' }}>
                  objectif : {weeklyGoal}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── SÉANCES RÉCENTES ── */}
        {recentSessions.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Séances récentes</Text>
              <View style={[styles.countBadge, { backgroundColor: `${accent}18` }]}>
                <Text style={[styles.countBadgeText, { color: accent }]}>{recentSessions.length}</Text>
              </View>
            </View>

            <View style={{ gap: 8, marginTop: 4 }}>
              {recentSessions.map((s, idx) => (
                <View
                  key={s.id ?? idx}
                  style={[styles.recentCard, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)',
                    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                    borderLeftColor: accent,
                  }]}
                >
                  {/* Date badge */}
                  <View style={[styles.recentDateBadge, { backgroundColor: `${accent}18` }]}>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: accent, lineHeight: 20 }}>
                      {new Date(s.date).getDate()}
                    </Text>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: accent, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      {new Date(s.date).toLocaleDateString('fr-FR', { month: 'short' })}
                    </Text>
                  </View>

                  {/* Contenu */}
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
                        {getSportName(s.sport)}
                      </Text>
                      {s.roundsCount > 0 && (
                        <View style={[styles.roundsBadge, { backgroundColor: '#8B5CF620' }]}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B5CF6' }}>
                            {s.roundsCount} round{s.roundsCount > 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </View>

                    {s.technicalTheme && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Zap size={10} color="#F59E0B" />
                        <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '600' }} numberOfLines={1}>
                          {s.technicalTheme}
                        </Text>
                      </View>
                    )}

                    {s.partners.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Users size={10} color={colors.textMuted} />
                        <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
                          {s.partners.join(', ')}
                        </Text>
                      </View>
                    )}

                    {(s.wins > 0 || s.losses > 0) && (
                      <View style={{ flexDirection: 'row', gap: 5, marginTop: 2 }}>
                        {s.wins > 0 && <RecordPill value={s.wins} label="V" color="#22C55E" />}
                        {s.losses > 0 && <RecordPill value={s.losses} label="D" color="#EF4444" />}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── GRAPHIQUE ROUNDS PAR SEMAINE ── */}
        {weeklyBars.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Rounds par semaine</Text>
            </View>
            {weeklyBars.length < 3 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
                  Pas encore assez de données
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', opacity: 0.7 }}>
                  Continue pour voir l'évolution sur plusieurs semaines
                </Text>
              </View>
            ) : (
              <>
                <View style={{ marginTop: 8, marginLeft: -8 }}>
                  <BarChart
                    data={weeklyBars}
                    barWidth={Math.min(40, Math.max(14, Math.floor((SCREEN_WIDTH - 80) / Math.max(weeklyBars.length, 8)) - 4))}
                    spacing={8}
                    roundedTop
                    hideRules
                    hideAxesAndRules
                    xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9, fontWeight: '600' }}
                    noOfSections={3}
                    maxValue={Math.max(...weeklyBars.map(b => b.value), weeklyGoal, 1) + 1}
                    yAxisThickness={0}
                    xAxisThickness={0}
                    isAnimated
                    animationDuration={600}
                    width={SCREEN_WIDTH - 80}
                    height={100}
                    referenceLine1Config={{ color: '#F59E0B', dashWidth: 4, dashGap: 4, thickness: 1 }}
                    referenceLine1Position={weeklyGoal}
                  />
                </View>
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
                  Dernières {weeklyBars.length} semaines actives{'  '}
                  <Text style={{ color: '#F59E0B' }}>— objectif {weeklyGoal}</Text>
                </Text>
              </>
            )}
          </View>
        )}

        {/* ── GRAPHIQUE WIN RATE MENSUEL ── */}
        {monthlyWinRate.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Win rate mensuel</Text>
              <View style={[styles.countBadge, { backgroundColor: '#22C55E18' }]}>
                <Text style={[styles.countBadgeText, { color: '#22C55E' }]}>
                  {monthlyWinRate[monthlyWinRate.length - 1]?.value ?? 0}%
                </Text>
              </View>
            </View>
            {monthlyWinRate.length < 3 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
                  Pas encore assez de données
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', opacity: 0.7 }}>
                  Continue pour voir l'évolution sur plusieurs mois
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 8, marginLeft: -8 }}>
                <BarChart
                  data={monthlyWinRate.map(m => ({
                    value: m.value,
                    label: m.label,
                    frontColor: m.value >= 60 ? '#22C55E' : m.value >= 40 ? '#F59E0B' : '#EF4444',
                    topLabelComponent: () => (
                      <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '700', marginBottom: 2 }}>
                        {m.value}%
                      </Text>
                    ),
                  }))}
                  barWidth={Math.min(44, Math.max(20, Math.floor((SCREEN_WIDTH - 80) / Math.max(monthlyWinRate.length, 6)) - 8))}
                  spacing={10}
                  roundedTop
                  hideRules
                  hideAxesAndRules
                  xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10, fontWeight: '600' }}
                  maxValue={100}
                  yAxisThickness={0}
                  xAxisThickness={0}
                  isAnimated
                  animationDuration={600}
                  width={SCREEN_WIDTH - 80}
                  height={110}
                />
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
                <Text style={{ fontSize: 10, color: colors.textMuted }}>60%+ Dominant</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
                <Text style={{ fontSize: 10, color: colors.textMuted }}>40-60% Équilibré</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                <Text style={{ fontSize: 10, color: colors.textMuted }}>{'<'}40% À travailler</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── PARTENAIRES ── */}
        {partnerStats.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Partenaires de sparring</Text>
              <View style={[styles.countBadge, { backgroundColor: `${accent}18` }]}>
                <Text style={[styles.countBadgeText, { color: accent }]}>{partnerStats.length}</Text>
              </View>
            </View>

            <View style={{ gap: 10, marginTop: 4 }}>
              {partnerStats.map((p, idx) => {
                const avatarColor = nameToColor(p.name);
                const initials = getInitials(p.name);
                const winRate = (p.wins + p.losses) > 0
                  ? Math.round((p.wins / (p.wins + p.losses)) * 100)
                  : null;
                const isTop = idx === 0;

                return (
                  <TouchableOpacity
                    key={p.name}
                    style={[styles.partnerCard, {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)',
                      borderColor: isTop
                        ? '#F59E0B'
                        : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
                      borderWidth: isTop ? 1.5 : 1,
                    }]}
                    onPress={() => setSelectedPartner(p)}
                    activeOpacity={0.75}
                  >
                    {/* Avatar */}
                    <View style={[styles.avatarCircle, {
                      backgroundColor: `${avatarColor}28`,
                      borderColor: isTop ? '#F59E0B' : `${avatarColor}50`,
                      borderWidth: isTop ? 2 : 1.5,
                    }]}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: avatarColor }}>
                        {initials}
                      </Text>
                    </View>

                    {/* Infos */}
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Text style={[styles.partnerName, { color: colors.text }]} numberOfLines={1}>
                            {p.name}
                          </Text>
                          {winRate !== null && (
                            <View style={[styles.winRateBadge, {
                              backgroundColor: winRate >= 60 ? '#22C55E18' : winRate >= 40 ? '#F59E0B18' : '#EF444418',
                            }]}>
                              <Text style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: winRate >= 60 ? '#22C55E' : winRate >= 40 ? '#F59E0B' : '#EF4444',
                              }}>
                                {winRate}%
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#8B5CF6' }}>
                            {p.totalRounds} round{p.totalRounds > 1 ? 's' : ''}
                          </Text>
                          <ChevronRight size={13} color={colors.textMuted} />
                        </View>
                      </View>

                      {/* Barre */}
                      <View style={[styles.track, { backgroundColor: trackBg }]}>
                        <View style={[styles.fill, { width: `${(p.totalRounds / maxRounds) * 100}%` as any, backgroundColor: avatarColor }]} />
                      </View>

                      {/* Résultats + subs */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', gap: 5 }}>
                          {(p.wins > 0 || p.losses > 0 || p.draws > 0) && (
                            <>
                              {p.wins > 0 && <RecordPill value={p.wins} label="V" color="#22C55E" />}
                              {p.losses > 0 && <RecordPill value={p.losses} label="D" color="#EF4444" />}
                              {p.draws > 0 && <RecordPill value={p.draws} label="N" color="#F59E0B" />}
                            </>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          {p.submissionsGiven > 0 && (
                            <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '700' }}>{p.submissionsGiven} sub+</Text>
                          )}
                          {p.submissionsTaken > 0 && (
                            <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '700' }}>{p.submissionsTaken} sub-</Text>
                          )}
                        </View>
                      </View>

                      {p.lastSession && (
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          Dernière séance : {formatDateShort(p.lastSession)}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── TECHNIQUES ── */}
        {techniqueStats.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Techniques travaillées</Text>
              <View style={[styles.countBadge, { backgroundColor: '#F59E0B18' }]}>
                <Text style={[styles.countBadgeText, { color: '#F59E0B' }]}>{techniqueStats.length}</Text>
              </View>
            </View>

            <View style={{ gap: 10, marginTop: 4 }}>
              {techniqueStats.slice(0, 10).map((t, idx) => (
                <View key={t.name} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <View style={[styles.techBadge, {
                    backgroundColor: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : idx === 2 ? '#CD7C32' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'),
                  }]}>
                    <Text style={styles.rankText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.techName, { color: colors.text }]} numberOfLines={1}>{t.name}</Text>
                      <Text style={[styles.techCount, { color: '#F59E0B' }]}>{t.count}x</Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: trackBg }]}>
                      <View style={[styles.fill, { width: `${(t.count / maxTech) * 100}%` as any, backgroundColor: '#F59E0B' }]} />
                    </View>
                    {t.lastSession && (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        Dernière fois : {formatDateShort(t.lastSession)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── FINITIONS ── */}
        {submissionStats.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Finitions</Text>
              <View style={[styles.countBadge, { backgroundColor: '#EC489918' }]}>
                <Text style={[styles.countBadgeText, { color: '#EC4899' }]}>{submissionStats.length}</Text>
              </View>
            </View>
            <View style={{ gap: 8, marginTop: 4 }}>
              {submissionStats.map((s, idx) => (
                <View key={s.name} style={[styles.subRow, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 10,
                  padding: 10,
                }]}>
                  <Text style={[styles.subName, { color: colors.text }]}>{s.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {s.given > 0 && (
                      <View style={[styles.subPill, { backgroundColor: '#22C55E18' }]}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#22C55E' }}>{s.given}</Text>
                        <Text style={{ fontSize: 10, color: '#22C55E' }}>placée{s.given > 1 ? 's' : ''}</Text>
                      </View>
                    )}
                    {s.taken > 0 && (
                      <View style={[styles.subPill, { backgroundColor: '#EF444418' }]}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#EF4444' }}>{s.taken}</Text>
                        <Text style={{ fontSize: 10, color: '#EF4444' }}>prise{s.taken > 1 ? 's' : ''}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── MODAL OBJECTIF ── */}
      <Modal
        visible={showGoalEditor}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGoalEditor(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.goalModal, { backgroundColor: cardBg }]}>
            <Text style={[styles.goalModalTitle, { color: colors.text }]}>Objectif hebdomadaire</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16, textAlign: 'center' }}>
              Nombre de rounds de sparring par semaine
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => setGoalInput(String(Math.max(1, parseInt(goalInput || '1', 10) - 5)))}
                style={[styles.goalStepBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>-5</Text>
              </TouchableOpacity>
              <TextInput
                value={goalInput}
                onChangeText={setGoalInput}
                keyboardType="number-pad"
                style={[styles.goalInput, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]}
              />
              <TouchableOpacity
                onPress={() => setGoalInput(String(parseInt(goalInput || '0', 10) + 5))}
                style={[styles.goalStepBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>+5</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={[styles.goalCancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => setShowGoalEditor(false)}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.goalSaveBtn, { backgroundColor: accent }]}
                onPress={saveGoal}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL PARTENAIRE ── */}
      {selectedPartner && (
        <PartnerDetailModal
          partner={selectedPartner}
          onClose={() => setSelectedPartner(null)}
          colors={colors}
          isDark={isDark}
        />
      )}
    </>
  );
}

// ============================================
// MODAL DÉTAIL PARTENAIRE
// ============================================

interface PartnerDetailModalProps {
  partner: PartnerStats;
  onClose: () => void;
  colors: any;
  isDark: boolean;
}

function PartnerDetailModal({ partner, onClose, colors, isDark }: PartnerDetailModalProps) {
  const winRate = (partner.wins + partner.losses) > 0
    ? Math.round((partner.wins / (partner.wins + partner.losses)) * 100)
    : null;

  // Finitions les plus utilisées contre ce partenaire (legacy + multi-select)
  const subMap: Record<string, { name: string; given: number; taken: number }> = {};
  const addSub = (name: string, isWin: boolean) => {
    const key = name.trim().toLowerCase();
    if (!subMap[key]) subMap[key] = { name: name.trim(), given: 0, taken: 0 };
    if (isWin) subMap[key].given++;
    else subMap[key].taken++;
  };
  for (const s of partner.sessions) {
    for (const r of s.rounds) {
      const isWin = r.result === 'win';
      const isLoss = r.result === 'loss';
      if (r.method?.trim()) addSub(r.method, isWin);
      if (isWin) r.methodsGiven?.forEach(m => addSub(m, true));
      if (isLoss) r.methodsTaken?.forEach(m => addSub(m, false));
    }
  }
  const topSubs = Object.values(subMap)
    .map(v => ({ ...v, total: v.given + v.taken }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.partnerModal, { backgroundColor: colors.backgroundCard }]}>
          {/* Header */}
          <View style={styles.partnerModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.partnerModalName, { color: colors.text }]}>{partner.name}</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>
                {partner.sessions.length} séance{partner.sessions.length > 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Stats globales */}
          <View style={[styles.partnerStatsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 12 }]}>
            <MiniStat value={partner.totalRounds} label="Rounds" color="#8B5CF6" />
            <MiniStat value={partner.wins} label="Victoires" color="#22C55E" />
            <MiniStat value={partner.losses} label="Défaites" color="#EF4444" />
            {winRate !== null && <MiniStat value={`${winRate}%`} label="Win rate" color={winRate >= 60 ? '#22C55E' : winRate >= 40 ? '#F59E0B' : '#EF4444'} />}
          </View>

          {/* Top finitions */}
          {topSubs.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.partnerSectionLabel, { color: colors.textMuted }]}>FINITIONS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {topSubs.map((sub, i) => (
                  <View key={i} style={[styles.subChip, {
                    backgroundColor: sub.given > sub.taken
                      ? (isDark ? 'rgba(22,163,74,0.12)' : 'rgba(22,163,74,0.08)')
                      : sub.taken > sub.given
                        ? (isDark ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.08)')
                        : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                  }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                      {sub.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>
                      {sub.given > 0 ? `${sub.given} placée${sub.given > 1 ? 's' : ''}` : ''}
                      {sub.given > 0 && sub.taken > 0 ? '  ·  ' : ''}
                      {sub.taken > 0 ? `${sub.taken} prise${sub.taken > 1 ? 's' : ''}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Historique des séances */}
          <Text style={[styles.partnerSectionLabel, { color: colors.textMuted, marginBottom: 8 }]}>HISTORIQUE</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {partner.sessions.map((session, sIdx) => (
              <View key={sIdx} style={[styles.sessionBlock, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }]}>
                {/* Date + sport */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#8B5CF6' }}>
                    {formatDateFull(session.date)}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{getSportName(session.sport)}</Text>
                </View>

                {/* Thème technique */}
                {session.technicalTheme && (
                  <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '600', marginBottom: 6 }}>
                    {session.technicalTheme}
                  </Text>
                )}

                {/* Rounds avec ce partenaire */}
                {session.rounds.map((r, rIdx) => {
                  const allGiven = r.methodsGiven?.length ? r.methodsGiven : (r.method && r.result === 'win' ? [r.method] : []);
                  const allTaken = r.methodsTaken?.length ? r.methodsTaken : (r.method && r.result === 'loss' ? [r.method] : []);
                  return (
                    <View key={rIdx} style={[styles.roundLine, {
                      borderLeftColor: resultColor(r.result ?? ''),
                    }]}>
                      {/* En-tête : numéro + résultat */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.resultDot, { backgroundColor: resultColor(r.result ?? '') }]}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFF' }}>
                            {resultLabel(r.result ?? '')}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                          Round {r.number ?? rIdx + 1}
                        </Text>
                      </View>
                      {/* Finitions données */}
                      {allGiven.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                          {allGiven.map((m, mi) => (
                            <View key={mi} style={{ backgroundColor: isDark ? 'rgba(22,163,74,0.15)' : 'rgba(22,163,74,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '600' }}>{m}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Finitions reçues */}
                      {allTaken.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {allTaken.map((m, mi) => (
                            <View key={mi} style={{ backgroundColor: isDark ? 'rgba(220,38,38,0.15)' : 'rgba(220,38,38,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>{m}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Notes du round */}
                      {r.notes?.trim() && (
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, lineHeight: 15 }} numberOfLines={3}>
                          {r.notes}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// PODIUM
// ============================================

const MEDAL_COLORS = ['#F59E0B', '#9CA3AF', '#CD7C32'];
const MEDAL_BG     = ['#FEF3C7', '#F3F4F6', '#FDF2E9'];
const MEDAL_LABELS = ['1', '2', '3'];
const PODIUM_HEIGHTS = [110, 80, 58];  // hauteur du socle (1er plus grand)
const PODIUM_ORDER   = [1, 0, 2];      // affichage: 2ème | 1er | 3ème

interface PodiumSectionProps {
  partners: PartnerStats[];
  accent: string;
  colors: any;
  isDark: boolean;
  onSelect: (p: PartnerStats) => void;
}

function PodiumSection({ partners, accent, colors, isDark, onSelect }: PodiumSectionProps) {
  const displayOrder = PODIUM_ORDER.filter(i => i < partners.length);

  return (
    <View style={[styles.podiumCard, {
      backgroundColor: colors.backgroundCard,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    }]}>
      {/* ── Bande titre ── */}
      <View style={[styles.podiumTitleBar, { backgroundColor: `${accent}12` }]}>
        <View style={[styles.podiumTitleDot, { backgroundColor: accent }]} />
        <Text style={[styles.podiumTitle, { color: accent }]}>TOP SPARRING</Text>
        <View style={[styles.podiumTitleDot, { backgroundColor: accent }]} />
      </View>

      {/* ── Scène ── */}
      <View style={styles.podiumStage}>
        {displayOrder.map((partnerIdx) => {
          const p = partners[partnerIdx];
          const rank       = partnerIdx;
          const medalColor = MEDAL_COLORS[rank];
          const medalBg    = isDark ? `${medalColor}25` : MEDAL_BG[rank];
          const podiumH    = PODIUM_HEIGHTS[rank];
          const isFirst    = rank === 0;
          const avatarColor = nameToColor(p.name);
          const firstName  = p.name.trim().split(/\s+/)[0];
          const winRate = (p.wins + p.losses) > 0
            ? Math.round((p.wins / (p.wins + p.losses)) * 100)
            : null;

          return (
            <TouchableOpacity
              key={p.name}
              style={[styles.podiumSlot, isFirst && { marginTop: -18 }]}
              onPress={() => onSelect(p)}
              activeOpacity={0.75}
            >
              {/* Étoile sur le 1er */}
              {isFirst && (
                <View style={{ alignItems: 'center', marginBottom: 2 }}>
                  <Star size={18} color={MEDAL_COLORS[0]} fill={MEDAL_COLORS[0]} />
                </View>
              )}

              {/* Avatar */}
              <View style={[
                styles.podiumAvatarWrap,
                isFirst && {
                  shadowColor: medalColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
                  shadowRadius: 10,
                  elevation: 8,
                },
              ]}>
                <View style={[
                  styles.podiumAvatar,
                  {
                    backgroundColor: `${avatarColor}18`,
                    borderColor: medalColor,
                    borderWidth: isFirst ? 3 : 2,
                    width: isFirst ? 68 : 52,
                    height: isFirst ? 68 : 52,
                    borderRadius: isFirst ? 34 : 26,
                  },
                ]}>
                  <Text
                    style={{
                      fontSize: isFirst ? 16 : 12,
                      fontWeight: '900',
                      color: avatarColor,
                      paddingHorizontal: 4,
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {firstName}
                  </Text>
                </View>
                {/* Badge médaille rond */}
                <View style={[styles.podiumMedalBadge, {
                  backgroundColor: medalColor,
                  borderColor: colors.backgroundCard,
                  width: isFirst ? 26 : 22,
                  height: isFirst ? 26 : 22,
                  borderRadius: isFirst ? 13 : 11,
                }]}>
                  <Text style={[styles.podiumMedalText, { fontSize: isFirst ? 11 : 9 }]}>
                    {MEDAL_LABELS[rank]}
                  </Text>
                </View>
              </View>

              {/* Nom */}
              <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
                {p.name}
              </Text>

              {/* Win rate */}
              {winRate !== null ? (
                <Text style={[styles.podiumWinRate, {
                  color: winRate >= 60 ? '#16A34A' : winRate >= 40 ? '#D97706' : '#DC2626',
                }]}>
                  {winRate}%
                </Text>
              ) : (
                <Text style={[styles.podiumWinRate, { color: colors.textMuted }]}>—</Text>
              )}

              {/* Socle coloré */}
              <View style={[styles.podiumBase, {
                height: podiumH,
                backgroundColor: medalBg,
                borderTopColor: medalColor,
                borderLeftColor: `${medalColor}40`,
                borderRightColor: `${medalColor}40`,
                borderBottomColor: `${medalColor}40`,
              }]}>
                <View style={{ gap: 4, alignItems: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: isFirst ? 13 : 11, fontWeight: '900', color: medalColor }}>
                    #{MEDAL_LABELS[rank]}
                  </Text>
                  {p.wins > 0 && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>{p.wins}V</Text>
                  )}
                  {p.losses > 0 && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>{p.losses}D</Text>
                  )}
                  {p.draws > 0 && (
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#D97706' }}>{p.draws}N</Text>
                  )}
                  <Text style={{ fontSize: 10, color: isDark ? `${medalColor}99` : `${medalColor}CC` }}>
                    {p.totalRounds} round{p.totalRounds > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.podiumHint, { color: colors.textMuted }]}>Appuie pour voir le détail</Text>
    </View>
  );
}

// ============================================
// MINI-COMPOSANTS
// ============================================

const GlobalStat: React.FC<{ value: number | string; label: string; color: string }> = ({ value, label, color }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.globalStatItem}>
      <Text style={[styles.globalStatValue, { color }]}>{value}</Text>
      <Text style={[styles.globalStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
};

const MiniStat: React.FC<{ value: number | string; label: string; color: string }> = ({ value, label, color }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.globalStatItem}>
      <Text style={{ fontSize: 20, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
};

const RecordPill: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => (
  <View style={[styles.recordPill, { backgroundColor: `${color}18` }]}>
    <Text style={{ fontSize: 12, fontWeight: '800', color }}>{value}</Text>
    <Text style={{ fontSize: 10, fontWeight: '700', color }}>{label}</Text>
  </View>
);

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Cards
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    gap: 0,
  },

  // Filtres sport
  sportPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sportPillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Vue d'ensemble — rangée compacte horizontale
  overviewGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  overviewBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  overviewLabel: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.85,
    textAlign: 'center',
  },

  // Objectif hebdo
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  goalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#F59E0B',
    borderRadius: 1,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  // Section header
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Séances récentes — cartes
  recentCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 10,
  },
  recentDateBadge: {
    width: 42,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    flexShrink: 0,
  },
  roundsBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // Partenaires — cartes avatar
  partnerCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderRadius: 14,
    padding: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  winRateBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },

  // Barre de progression
  track: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },

  // Pills résultat
  recordPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },

  // Technique
  techBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  techName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  techCount: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Soumissions
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  subName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  subPill: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 1,
  },

  // Vide
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Globaux (pour MiniStat / GlobalStat)
  globalStatItem: {
    alignItems: 'center',
  },
  globalStatValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  globalStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  // Overlays / Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },

  // Modal objectif
  goalModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  goalModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  goalInput: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    width: 90,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
  },
  goalStepBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  goalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  goalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  // Modal partenaire
  partnerModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
    flex: 1,
  },
  partnerModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  partnerModalName: {
    fontSize: 22,
    fontWeight: '800',
  },
  partnerStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 16,
  },
  partnerSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  sessionBlock: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  roundLine: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 6,
    gap: 2,
  },
  resultDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Séparateur (conservé pour compatibilité interne)
  sep: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },

  // Podium
  podiumCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  podiumTitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  podiumTitleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  podiumTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  podiumStage: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  podiumAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  podiumAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumMedalBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  podiumMedalText: {
    fontWeight: '900',
    color: '#FFFFFF',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  podiumWinRate: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  podiumBase: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderTopWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  podiumHint: {
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 10,
    letterSpacing: 0.3,
  },
});
