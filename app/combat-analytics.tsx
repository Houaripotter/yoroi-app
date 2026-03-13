// ============================================
// YOROI - ANALYSE DE COMBAT
// Partenaires de sparring + techniques les plus pratiquées
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { Header } from '@/components/ui/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTrainings } from '@/lib/database';
import type { Training, CombatRound } from '@/lib/database';
import { Users, Zap, Trophy, TrendingUp, Shield, Target, ChevronRight } from 'lucide-react-native';

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

// ============================================
// HELPERS
// ============================================

function parseCombatRounds(raw: any): CombatRound[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

// ============================================
// SOUS-COMPOSANTS
// ============================================

const SectionTitle: React.FC<{ title: string; subtitle?: string; icon: React.ReactNode; color: string }> = ({
  title, subtitle, icon, color,
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconBg, { backgroundColor: `${color}18` }]}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
};

// Barre de progression horizontale
const ProgressBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
  const { isDark } = useTheme();
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
      <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
};

// Badge victoire/défaite/nul
const RecordBadge: React.FC<{ wins: number; losses: number; draws: number }> = ({ wins, losses, draws }) => (
  <View style={styles.recordRow}>
    <View style={[styles.recordBadge, { backgroundColor: '#22C55E18' }]}>
      <Text style={[styles.recordNum, { color: '#22C55E' }]}>{wins}</Text>
      <Text style={[styles.recordLbl, { color: '#22C55E' }]}>V</Text>
    </View>
    <View style={[styles.recordBadge, { backgroundColor: '#EF444418' }]}>
      <Text style={[styles.recordNum, { color: '#EF4444' }]}>{losses}</Text>
      <Text style={[styles.recordLbl, { color: '#EF4444' }]}>D</Text>
    </View>
    {draws > 0 && (
      <View style={[styles.recordBadge, { backgroundColor: '#F59E0B18' }]}>
        <Text style={[styles.recordNum, { color: '#F59E0B' }]}>{draws}</Text>
        <Text style={[styles.recordLbl, { color: '#F59E0B' }]}>N</Text>
      </View>
    )}
  </View>
);

// ============================================
// ÉCRAN PRINCIPAL
// ============================================

export default function CombatAnalyticsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrainings(3650).then(data => {
      setTrainings(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ── Agrégation des partenaires de sparring ──
  const partnerStats = useMemo<PartnerStats[]>(() => {
    const map: Record<string, PartnerStats> = {};
    for (const tr of trainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      for (const round of rounds) {
        if (!round.partner?.trim()) continue;
        const key = round.partner.trim().toLowerCase();
        if (!map[key]) {
          map[key] = {
            name: round.partner.trim(),
            totalRounds: 0, wins: 0, losses: 0, draws: 0,
            submissionsGiven: 0, submissionsTaken: 0,
            lastSession: tr.date,
          };
        }
        const p = map[key];
        p.totalRounds++;
        if (round.result === 'win') p.wins++;
        else if (round.result === 'loss') p.losses++;
        else if (round.result === 'draw') p.draws++;
        p.submissionsGiven += round.submissionsGiven ?? 0;
        p.submissionsTaken += round.submissionsTaken ?? 0;
        // Garder la date la plus récente
        if (!p.lastSession || tr.date > p.lastSession) p.lastSession = tr.date;
      }
    }
    return Object.values(map).sort((a, b) => b.totalRounds - a.totalRounds);
  }, [trainings]);

  // ── Agrégation des techniques ──
  const techniqueStats = useMemo<TechniqueStats[]>(() => {
    const map: Record<string, TechniqueStats> = {};
    for (const tr of trainings) {
      if (!tr.technical_theme?.trim()) continue;
      const key = tr.technical_theme.trim().toLowerCase();
      if (!map[key]) {
        map[key] = { name: tr.technical_theme.trim(), count: 0, lastSession: tr.date };
      }
      map[key].count++;
      if (!map[key].lastSession || tr.date > (map[key].lastSession ?? '')) {
        map[key].lastSession = tr.date;
      }
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [trainings]);

  // ── Agrégation des soumissions ──
  const submissionStats = useMemo<SubmissionStats[]>(() => {
    const map: Record<string, SubmissionStats> = {};
    for (const tr of trainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      for (const round of rounds) {
        if (!round.method?.trim()) continue;
        const key = round.method.trim().toLowerCase();
        if (!map[key]) map[key] = { name: round.method.trim(), given: 0, taken: 0 };
        if (round.result === 'win') map[key].given++;
        else if (round.result === 'loss') map[key].taken++;
      }
    }
    return Object.values(map).sort((a, b) => (b.given + b.taken) - (a.given + a.taken));
  }, [trainings]);

  // ── Totaux globaux ──
  const globalStats = useMemo(() => {
    let totalRounds = 0, totalWins = 0, totalLosses = 0, totalDraws = 0;
    let totalSubGiven = 0, totalSubTaken = 0;
    for (const p of partnerStats) {
      totalRounds += p.totalRounds;
      totalWins += p.wins;
      totalLosses += p.losses;
      totalDraws += p.draws;
      totalSubGiven += p.submissionsGiven;
      totalSubTaken += p.submissionsTaken;
    }
    return { totalRounds, totalWins, totalLosses, totalDraws, totalSubGiven, totalSubTaken };
  }, [partnerStats]);

  const maxRounds = partnerStats[0]?.totalRounds ?? 1;
  const maxTechCount = techniqueStats[0]?.count ?? 1;

  const cardStyle = [styles.card, {
    backgroundColor: colors.backgroundCard,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  }];

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
        <Header title="Analyse de combat" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </View>
    );
  }

  const isEmpty = partnerStats.length === 0 && techniqueStats.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
      <Header title="Analyse de combat" showBack />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── RÉSUMÉ GLOBAL ── */}
        {!isEmpty && (
          <View style={[cardStyle, { marginBottom: 20 }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Résumé global</Text>
            <View style={styles.globalGrid}>
              <GlobalStat value={globalStats.totalRounds} label="Rounds total" color="#8B5CF6" />
              <GlobalStat value={partnerStats.length} label="Partenaires" color="#06B6D4" />
              <GlobalStat value={techniqueStats.length} label="Techniques" color="#F59E0B" />
              <GlobalStat value={globalStats.totalWins} label="Victoires" color="#22C55E" />
              <GlobalStat value={globalStats.totalLosses} label="Défaites" color="#EF4444" />
              <GlobalStat value={globalStats.totalSubGiven} label="Soumissions" color="#EC4899" />
            </View>
          </View>
        )}

        {/* ── VIDE ── */}
        {isEmpty && (
          <View style={[cardStyle, { alignItems: 'center', paddingVertical: 40, marginBottom: 20 }]}>
            <Users size={48} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16, textAlign: 'center' }}>
              Pas encore de données
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
              Ajoute des séances avec des rounds de sparring{'\n'}pour voir tes statistiques ici.
            </Text>
          </View>
        )}

        {/* ── PARTENAIRES DE SPARRING ── */}
        {partnerStats.length > 0 && (
          <View style={[cardStyle, { marginBottom: 20 }]}>
            <SectionTitle
              title="Partenaires de sparring"
              subtitle={`${partnerStats.length} partenaire${partnerStats.length > 1 ? 's' : ''}`}
              icon={<Users size={18} color="#06B6D4" />}
              color="#06B6D4"
            />
            {partnerStats.map((p, idx) => (
              <View key={p.name}>
                {idx > 0 && <View style={[styles.sep, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />}
                <View style={styles.partnerRow}>
                  {/* Rang */}
                  <View style={[styles.rankBadge, {
                    backgroundColor: idx === 0 ? '#F59E0B18' : idx === 1 ? '#94A3B818' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  }]}>
                    <Text style={[styles.rankText, {
                      color: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : colors.textMuted,
                    }]}>
                      {idx === 0 ? '1er' : idx === 1 ? '2e' : `${idx + 1}e`}
                    </Text>
                  </View>

                  {/* Infos */}
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{p.name}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B5CF6' }}>
                        {p.totalRounds} round{p.totalRounds > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <ProgressBar value={p.totalRounds} max={maxRounds} color="#8B5CF6" />
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <RecordBadge wins={p.wins} losses={p.losses} draws={p.draws} />
                      {(p.submissionsGiven > 0 || p.submissionsTaken > 0) && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {p.submissionsGiven > 0 && (
                            <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '600' }}>
                              {p.submissionsGiven} sub+
                            </Text>
                          )}
                          {p.submissionsTaken > 0 && (
                            <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '600' }}>
                              {p.submissionsTaken} sub-
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                    {p.lastSession && (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        Dernière séance : {formatDate(p.lastSession)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── TECHNIQUES LES PLUS TRAVAILLÉES ── */}
        {techniqueStats.length > 0 && (
          <View style={[cardStyle, { marginBottom: 20 }]}>
            <SectionTitle
              title="Techniques travaillées"
              subtitle={`${techniqueStats.length} thème${techniqueStats.length > 1 ? 's' : ''} différent${techniqueStats.length > 1 ? 's' : ''}`}
              icon={<Zap size={18} color="#F59E0B" />}
              color="#F59E0B"
            />
            {techniqueStats.slice(0, 10).map((t, idx) => (
              <View key={t.name}>
                {idx > 0 && <View style={[styles.sep, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />}
                <View style={styles.techniqueRow}>
                  {/* Médaille top 3 */}
                  <View style={[styles.techRankDot, {
                    backgroundColor: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : idx === 2 ? '#CD7C32' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'),
                  }]}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFF' }}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 }}>{t.name}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#F59E0B' }}>
                        {t.count}x
                      </Text>
                    </View>
                    <ProgressBar value={t.count} max={maxTechCount} color="#F59E0B" />
                    {t.lastSession && (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        Dernière fois : {formatDate(t.lastSession)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── FINITIONS / SOUMISSIONS ── */}
        {submissionStats.length > 0 && (
          <View style={[cardStyle, { marginBottom: 20 }]}>
            <SectionTitle
              title="Finitions"
              subtitle="Méthodes utilisées en sparring"
              icon={<Target size={18} color="#EC4899" />}
              color="#EC4899"
            />
            {submissionStats.map((s, idx) => (
              <View key={s.name}>
                {idx > 0 && <View style={[styles.sep, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />}
                <View style={styles.submissionRow}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 }}>{s.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {s.given > 0 && (
                      <View style={[styles.subBadge, { backgroundColor: '#22C55E18' }]}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#22C55E' }}>{s.given}</Text>
                        <Text style={{ fontSize: 10, color: '#22C55E' }}>placée{s.given > 1 ? 's' : ''}</Text>
                      </View>
                    )}
                    {s.taken > 0 && (
                      <View style={[styles.subBadge, { backgroundColor: '#EF444418' }]}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>{s.taken}</Text>
                        <Text style={{ fontSize: 10, color: '#EF4444' }}>prise{s.taken > 1 ? 's' : ''}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================
// MINI-COMPOSANT STAT GLOBALE
// ============================================

const GlobalStat: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.globalStatItem}>
      <Text style={[styles.globalStatValue, { color }]}>{value}</Text>
      <Text style={[styles.globalStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  globalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  globalStatItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  globalStatValue: {
    fontSize: 26,
    fontWeight: '800',
  },
  globalStatLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  // Partenaire
  partnerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
  },
  recordRow: {
    flexDirection: 'row',
    gap: 6,
  },
  recordBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  recordNum: {
    fontSize: 13,
    fontWeight: '800',
  },
  recordLbl: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Barre progression
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Technique
  techniqueRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  techRankDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  // Soumissions
  submissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
