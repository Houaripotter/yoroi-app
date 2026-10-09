// ============================================
// COMPETITIONS TAB · historique combats + palmarès + coupe poids
// ============================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, DeviceEventEmitter,
} from 'react-native';
import {
  Trophy, Medal, Target, TrendingUp, Calendar, Scale,
  Award, Users, Flag, ChevronRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { getCombats } from '@/lib/fighterModeService';
import { getCompetitions } from '@/lib/database';
import type { Combat } from '@/lib/fighterMode';
import type { Competition } from '@/lib/database';
import { StatsEmptyState } from '@/components/stats/StatsEmptyState';
import { SkeletonGrid } from '@/components/stats/SkeletonCard';
import logger from '@/lib/security/logger';

export default function CompetitionsTab() {
  const router = useRouter();
  const { colors, isDark, screenBackground } = useTheme();
  const accent = screenBackground || '#DC2626';
  const cardBg = colors.backgroundCard;
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const bgColor = isDark ? colors.background : '#F2F2F7';

  const [combats, setCombats] = useState<Combat[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, comps] = await Promise.all([getCombats(), getCompetitions()]);
      setCombats(c);
      setCompetitions(comps);
    } catch (e) {
      logger.error('[CompetitionsTab] load error', e);
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

  // ── Stats globales ──
  const stats = useMemo(() => {
    const wins = combats.filter(c => c.resultat === 'victoire').length;
    const losses = combats.filter(c => c.resultat === 'defaite').length;
    const draws = combats.filter(c => c.resultat === 'nul').length;
    const total = wins + losses + draws;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : null;
    // Soumissions données en compétition
    const subs = combats.filter(c => c.resultat === 'victoire' && c.methode === 'soumission').length;
    return { wins, losses, draws, total, winRate, subs };
  }, [combats]);

  // ── Top techniques de victoire ──
  const topTechniques = useMemo(() => {
    const map: Record<string, number> = {};
    combats.forEach(c => {
      if (c.resultat === 'victoire' && c.technique) {
        map[c.technique] = (map[c.technique] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [combats]);

  // ── Répartition des méthodes ──
  const methodsBreakdown = useMemo(() => {
    const wins = combats.filter(c => c.resultat === 'victoire');
    const byMethod: Record<string, number> = {};
    wins.forEach(c => {
      const m = c.methode || 'autre';
      byMethod[m] = (byMethod[m] || 0) + 1;
    });
    const total = wins.length;
    return Object.entries(byMethod)
      .map(([method, count]) => ({ method, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [combats]);

  // ── Prochaine compétition ──
  const nextCompetition = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = competitions
      .filter(c => new Date(c.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcoming[0] ?? null;
  }, [competitions]);

  const daysUntilNext = nextCompetition
    ? Math.ceil((new Date(nextCompetition.date).getTime() - Date.now()) / 86400000)
    : null;

  // ── Dernier combat ──
  const lastCombat = useMemo(() => {
    return [...combats].sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [combats]);

  // ── Adversaires les plus affrontés ──
  const topOpponents = useMemo(() => {
    const map: Record<string, { count: number; wins: number; losses: number; club?: string }> = {};
    combats.forEach(c => {
      const name = c.adversaire_nom?.trim();
      if (!name) return;
      if (!map[name]) map[name] = { count: 0, wins: 0, losses: 0, club: c.adversaire_club };
      map[name].count++;
      if (c.resultat === 'victoire') map[name].wins++;
      else if (c.resultat === 'defaite') map[name].losses++;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  }, [combats]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}>
        <SkeletonGrid count={6} />
      </View>
    );
  }

  if (combats.length === 0 && competitions.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatsEmptyState
          icon={<Trophy size={48} color={colors.textMuted} />}
          title="Pas encore de compétition"
          description="Ajoute tes combats et compétitions pour voir ton palmarès ici."
          ctaLabel="Aller aux compétitions"
          ctaHref="/competitions"
          accentColor="#DC2626"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bgColor }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={accent}
        />
      }
    >

      {/* ── STATS GLOBALES ── */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.sectionHead}>
          <Trophy size={14} color="#FBBF24" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>PALMARÈS GLOBAL</Text>
        </View>
        <View style={styles.globalStatsRow}>
          <GlobalStat value={stats.total} label="Combats" color="#8B5CF6" />
          <GlobalStat value={stats.wins} label="Victoires" color="#22C55E" />
          <GlobalStat value={stats.losses} label="Défaites" color="#EF4444" />
          <GlobalStat
            value={stats.winRate !== null ? `${stats.winRate}%` : '·'}
            label="Taux"
            color="#3B82F6"
          />
        </View>
      </View>

      {/* ── PROCHAINE COMPÉTITION ── */}
      {nextCompetition && daysUntilNext !== null && (
        <TouchableOpacity
          onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/competitions' as any); }}
          activeOpacity={0.85}
          style={[styles.card, { backgroundColor: '#DC262618', borderColor: '#DC2626' }]}
        >
          <View style={styles.sectionHead}>
            <Flag size={14} color="#DC2626" />
            <Text style={[styles.sectionTitle, { color: '#DC2626' }]}>PROCHAINE COMPÉTITION</Text>
            <View style={{ flex: 1 }} />
            <View style={[styles.urgencyBadge, {
              backgroundColor: daysUntilNext <= 7 ? '#DC2626' : daysUntilNext <= 30 ? '#F59E0B' : '#22C55E',
            }]}>
              <Text style={styles.urgencyBadgeText}>
                {daysUntilNext === 0 ? "AUJOURD'HUI" : `J-${daysUntilNext}`}
              </Text>
            </View>
          </View>
          <Text style={[styles.nextCompetitionName, { color: colors.text }]} numberOfLines={2}>
            {nextCompetition.nom}
          </Text>
          <Text style={[styles.nextCompetitionMeta, { color: colors.textMuted }]}>
            {new Date(nextCompetition.date).toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
            {nextCompetition.lieu ? ` · ${nextCompetition.lieu}` : ''}
          </Text>
          {nextCompetition.categorie_poids && (
            <View style={[styles.weightChip, { backgroundColor: '#DC262622', marginTop: 8 }]}>
              <Scale size={11} color="#DC2626" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>
                {nextCompetition.categorie_poids}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* ── DERNIER COMBAT ── */}
      {lastCombat && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHead}>
            <Medal size={14} color={lastCombat.resultat === 'victoire' ? '#22C55E' : lastCombat.resultat === 'defaite' ? '#EF4444' : '#F59E0B'} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>DERNIER COMBAT</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <View style={[styles.resultPill, {
              backgroundColor: lastCombat.resultat === 'victoire' ? '#22C55E' : lastCombat.resultat === 'defaite' ? '#EF4444' : '#F59E0B',
            }]}>
              <Text style={styles.resultPillText}>
                {lastCombat.resultat === 'victoire' ? 'V' : lastCombat.resultat === 'defaite' ? 'D' : 'N'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lastCombatTitle, { color: colors.text }]} numberOfLines={1}>
                vs {lastCombat.adversaire_nom ?? 'Adversaire'}
              </Text>
              {lastCombat.adversaire_club && (
                <Text style={[styles.lastCombatMeta, { color: colors.textMuted }]} numberOfLines={1}>
                  {lastCombat.adversaire_club}
                </Text>
              )}
              {(lastCombat.methode || lastCombat.technique) && (
                <Text style={[styles.lastCombatMeta, { color: colors.textMuted }]}>
                  {lastCombat.methode === 'soumission' ? 'Soumission' : lastCombat.methode === 'points' ? 'Points' : lastCombat.methode === 'decision' ? 'Décision' : lastCombat.methode ?? ''}
                  {lastCombat.technique ? ` · ${lastCombat.technique}` : ''}
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700' }}>
              {new Date(lastCombat.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>
      )}

      {/* ── RÉPARTITION DES VICTOIRES ── */}
      {methodsBreakdown.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHead}>
            <Award size={14} color="#8B5CF6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>MÉTHODES DE VICTOIRE</Text>
          </View>
          <View style={{ gap: 10, marginTop: 10 }}>
            {methodsBreakdown.map(m => (
              <View key={m.method}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, textTransform: 'capitalize' }}>
                    {m.method}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>
                    {m.count} · {m.pct}%
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                  <View style={{
                    height: '100%',
                    width: `${m.pct}%`,
                    backgroundColor: m.method === 'soumission' ? '#8B5CF6' : m.method === 'points' ? '#3B82F6' : m.method === 'décision' ? '#F59E0B' : '#6B7280',
                    borderRadius: 4,
                  }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── TOP TECHNIQUES DE FINITION ── */}
      {topTechniques.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHead}>
            <Target size={14} color="#22C55E" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>TES FINITIONS PRÉFÉRÉES</Text>
          </View>
          <View style={{ gap: 6, marginTop: 10 }}>
            {topTechniques.map(([technique, count], idx) => (
              <View key={technique} style={[styles.techRow, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
              }]}>
                <View style={[styles.techRank, {
                  backgroundColor: idx === 0 ? '#FBBF24' : idx === 1 ? '#A1A1AA' : idx === 2 ? '#D97706' : '#6B7280',
                }]}>
                  <Text style={styles.techRankText}>{idx + 1}</Text>
                </View>
                <Text style={[styles.techName, { color: colors.text }]} numberOfLines={1}>{technique}</Text>
                <Text style={[styles.techCount, { color: '#22C55E' }]}>×{count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── TOP ADVERSAIRES AFFRONTÉS ── */}
      {topOpponents.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHead}>
            <Users size={14} color="#3B82F6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>ADVERSAIRES RÉCURRENTS</Text>
          </View>
          <View style={{ gap: 6, marginTop: 10 }}>
            {topOpponents.map(([name, data]) => {
              const finishedTotal = data.wins + data.losses;
              const wr = finishedTotal > 0 ? Math.round((data.wins / finishedTotal) * 100) : null;
              return (
                <View key={name} style={[styles.opponentRow, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
                }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.opponentName, { color: colors.text }]} numberOfLines={1}>
                      {name}
                    </Text>
                    {data.club && (
                      <Text style={[styles.opponentClub, { color: colors.textMuted }]} numberOfLines={1}>
                        {data.club}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {data.wins > 0 && (
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#22C55E' }}>{data.wins}V</Text>
                    )}
                    {data.losses > 0 && (
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444' }}>{data.losses}D</Text>
                    )}
                    {wr !== null && (
                      <View style={[styles.wrBadge, {
                        backgroundColor: wr >= 60 ? '#22C55E22' : wr >= 40 ? '#F59E0B22' : '#EF444422',
                      }]}>
                        <Text style={{
                          fontSize: 10, fontWeight: '900',
                          color: wr >= 60 ? '#22C55E' : wr >= 40 ? '#F59E0B' : '#EF4444',
                        }}>
                          {wr}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── BOUTON VOIR TOUS LES COMBATS ── */}
      <TouchableOpacity
        onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/competitions' as any); }}
        activeOpacity={0.85}
        style={[styles.seeAllBtn, { backgroundColor: accent }]}
      >
        <Text style={styles.seeAllBtnText}>Voir tous les combats ({stats.total})</Text>
        <ChevronRight size={16} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );
}

function GlobalStat({ value, label, color }: { value: number | string; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.globalStatItem}>
      <Text style={[styles.globalStatValue, { color }]}>{value}</Text>
      <Text style={[styles.globalStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  globalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  globalStatItem: { flex: 1, alignItems: 'center' },
  globalStatValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  globalStatLabel: { fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 0.3 },

  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urgencyBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },

  nextCompetitionName: { fontSize: 16, fontWeight: '900', marginTop: 10, lineHeight: 20 },
  nextCompetitionMeta: { fontSize: 11, marginTop: 3, fontWeight: '600' },
  weightChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  resultPill: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  resultPillText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  lastCombatTitle: { fontSize: 14, fontWeight: '900' },
  lastCombatMeta: { fontSize: 11, marginTop: 2, fontWeight: '600' },

  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },

  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
  },
  techRank: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  techRankText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  techName: { flex: 1, fontSize: 13, fontWeight: '800' },
  techCount: { fontSize: 13, fontWeight: '900' },

  opponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
  },
  opponentName: { fontSize: 13, fontWeight: '800' },
  opponentClub: { fontSize: 10, marginTop: 1, fontWeight: '600' },
  wrBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },

  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  seeAllBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.3 },
});
