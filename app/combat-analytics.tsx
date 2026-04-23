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
import { useI18n } from '@/lib/I18nContext';
import { useTheme } from '@/lib/ThemeContext';
import { Header } from '@/components/ui/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTrainings } from '@/lib/database';
import type { Training, CombatRound } from '@/lib/database';
import { Users, Zap, Trophy, TrendingUp, Shield, Target, ChevronRight, Activity, BookOpen, MapPin, BarChart2 } from 'lucide-react-native';
import { getMethodDisplayName } from '@/components/BJJBodyMap';

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
  const { t } = useI18n();
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

  // ── Agrégation des soumissions (methodsGiven/methodsTaken + fallback method) ──
  const submissionStats = useMemo<SubmissionStats[]>(() => {
    const map: Record<string, SubmissionStats> = {};
    const add = (name: string, side: 'given' | 'taken') => {
      const display = getMethodDisplayName(name.trim());
      const key = display.toLowerCase();
      if (!key) return;
      if (!map[key]) map[key] = { name: display, given: 0, taken: 0 };
      map[key][side]++;
    };
    for (const tr of trainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      for (const round of rounds) {
        // Priorité aux listes détaillées
        if (round.methodsGiven?.length) {
          round.methodsGiven.forEach(m => add(m, 'given'));
        }
        if (round.methodsTaken?.length) {
          round.methodsTaken.forEach(m => add(m, 'taken'));
        }
        // Fallback : champ method + résultat du round
        if (!round.methodsGiven?.length && !round.methodsTaken?.length && round.method?.trim()) {
          if (round.result === 'win') add(round.method, 'given');
          else if (round.result === 'loss') add(round.method, 'taken');
        }
      }
    }
    return Object.values(map).sort((a, b) => (b.given + b.taken) - (a.given + a.taken));
  }, [trainings]);

  // ── Ratio drilling / sparring par mois (6 derniers mois) ──
  const guardRatio = useMemo(() => {
    const isType = (tr: Training, keyword: string) => {
      if (tr.session_type?.toLowerCase().includes(keyword)) return true;
      if (tr.session_types) {
        try {
          const arr: string[] = JSON.parse(tr.session_types);
          return arr.some(s => s.toLowerCase().includes(keyword));
        } catch {}
      }
      return false;
    };

    const monthMap: Record<string, { drilling: number; sparring: number; label: string }> = {};
    let totalDrilling = 0;
    let totalSparring = 0;

    for (const tr of trainings) {
      const d = new Date(tr.date);
      const now = new Date();
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsAgo > 5) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) {
        monthMap[key] = {
          drilling: 0, sparring: 0,
          label: d.toLocaleDateString('fr-FR', { month: 'short' }),
        };
      }
      if (isType(tr, 'drilling') || isType(tr, 'drill')) {
        monthMap[key].drilling++;
        totalDrilling++;
      }
      if (isType(tr, 'sparring')) {
        monthMap[key].sparring++;
        totalSparring++;
      }
    }

    const months = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v);

    const total = totalDrilling + totalSparring;
    const drillingPct = total > 0 ? Math.round((totalDrilling / total) * 100) : 0;
    const sparringPct = total > 0 ? 100 - drillingPct : 0;

    // Recommandation (ratio idéal drilling:sparring ~ 60:40 pour BJJ)
    let advice = '';
    if (total === 0) advice = '';
    else if (drillingPct > 80) advice = 'Trop de drilling · augmente le sparring pour tester en conditions réelles.';
    else if (drillingPct < 20) advice = 'Trop de sparring · intègre plus de drilling pour ancrer les techniques.';
    else if (drillingPct >= 50 && drillingPct <= 70) advice = 'Ratio équilibré · bonne alternance drilling / sparring.';
    else advice = `${drillingPct}% drilling / ${sparringPct}% sparring.`;

    return { months, totalDrilling, totalSparring, drillingPct, sparringPct, total, advice };
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
        <Header title={t('combatAnalytics.title')} showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </View>
    );
  }

  const isEmpty = partnerStats.length === 0 && techniqueStats.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
      <Header title={t('combatAnalytics.title')} showBack />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── RACCOURCIS OUTILS AVANCÉS ── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {[
            { label: t('combatAnalytics.partners'), sub: t('combatAnalytics.tacticalNotes'), icon: <Users size={20} color="#06B6D4" />, color: '#06B6D4', route: '/sparring-partners' },
            { label: 'BJJ Map', sub: t('combatAnalytics.positionsSubmissions'), icon: <MapPin size={20} color="#22C55E" />, color: '#22C55E', route: '/bjj-positions' },
            { label: 'Benchmark', sub: t('combatAnalytics.vsPeers'), icon: <BarChart2 size={20} color="#F59E0B" />, color: '#F59E0B', route: '/benchmark' },
          ].map(item => (
            <TouchableOpacity
              key={item.route}
              onPress={() => router.push(item.route as any)}
              style={[cardStyle, { flex: 1, alignItems: 'center', padding: 12, gap: 6, marginBottom: 0 }]}
              activeOpacity={0.8}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${item.color}18`, justifyContent: 'center', alignItems: 'center' }}>
                {item.icon}
              </View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text, textAlign: 'center' }}>{item.label}</Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center', lineHeight: 12 }}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── RÉSUMÉ GLOBAL ── */}
        {!isEmpty && (
          <View style={[cardStyle, { marginBottom: 20 }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('combatAnalytics.globalSummary')}</Text>
            <View style={styles.globalGrid}>
              <GlobalStat value={globalStats.totalRounds} label={t('combatAnalytics.totalRounds')} color="#8B5CF6" />
              <GlobalStat value={partnerStats.length} label={t('combatAnalytics.partners')} color="#06B6D4" />
              <GlobalStat value={techniqueStats.length} label={t('combatAnalytics.techniques')} color="#F59E0B" />
              <GlobalStat value={globalStats.totalWins} label={t('combatAnalytics.wins')} color="#22C55E" />
              <GlobalStat value={globalStats.totalLosses} label={t('combatAnalytics.losses')} color="#EF4444" />
              <GlobalStat value={globalStats.totalSubGiven} label={t('combatAnalytics.submissions')} color="#EC4899" />
            </View>
          </View>
        )}

        {/* ── VIDE ── */}
        {isEmpty && (
          <View style={[cardStyle, { alignItems: 'center', paddingVertical: 40, marginBottom: 20 }]}>
            <Users size={48} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 16, textAlign: 'center' }}>
              {t('combatAnalytics.noData')}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 19 }}>
              {t('combatAnalytics.noDataDesc')}
            </Text>
          </View>
        )}

        {/* ── PARTENAIRES DE SPARRING ── */}
        {partnerStats.length > 0 && (
          <View style={[cardStyle, { marginBottom: 20 }]}>
            <SectionTitle
              title={t('combatAnalytics.sparringPartners')}
              subtitle={`${partnerStats.length} ${t('combatAnalytics.partnerCount', { count: partnerStats.length })}`}
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      {p.lastSession && (
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          {t('combatAnalytics.lastSession')} : {formatDate(p.lastSession)}
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={() => router.push({ pathname: '/sparring-partners', params: { partnerName: p.name } })}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#06B6D415', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}
                        activeOpacity={0.7}
                      >
                        <BookOpen size={11} color="#06B6D4" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#06B6D4' }}>Profil</Text>
                        <ChevronRight size={11} color="#06B6D4" />
                      </TouchableOpacity>
                    </View>
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
              title={t('combatAnalytics.techniquesWorked')}
              subtitle={`${techniqueStats.length} ${t('combatAnalytics.differentThemes', { count: techniqueStats.length })}`}
              icon={<Zap size={18} color="#F59E0B" />}
              color="#F59E0B"
            />
            {techniqueStats.slice(0, 10).map((tech, idx) => (
              <View key={tech.name}>
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
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 }}>{tech.name}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#F59E0B' }}>
                        {tech.count}x
                      </Text>
                    </View>
                    <ProgressBar value={tech.count} max={maxTechCount} color="#F59E0B" />
                    {tech.lastSession && (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        {t('combatAnalytics.lastTime')} : {formatDate(tech.lastSession)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── FINITIONS / SOUMISSIONS · FORCES VS FAILLES ── */}
        {submissionStats.length > 0 && (
          <View style={[cardStyle, { marginBottom: 20 }]}>
            <SectionTitle
              title={t('combatAnalytics.strengthsWeaknesses')}
              subtitle={t('combatAnalytics.submissionsGivenTaken')}
              icon={<Shield size={18} color="#EC4899" />}
              color="#EC4899"
            />

            {/* Légende */}
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#22C55E' }} />
                <Text style={{ fontSize: 11, color: colors.textMuted }}>{t('combatAnalytics.given')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#EF4444' }} />
                <Text style={{ fontSize: 11, color: colors.textMuted }}>{t('combatAnalytics.received')}</Text>
              </View>
            </View>

            {submissionStats.map((s, idx) => {
              const maxVal = Math.max(s.given, s.taken, 1);
              const givenPct = s.given / maxVal;
              const takenPct = s.taken / maxVal;
              // Ratio force/faille : > 1 = force, < 1 = faille
              const ratio = s.taken === 0 ? '∞' : (s.given / s.taken).toFixed(1);
              const isForse = s.given >= s.taken;
              return (
                <View key={s.name}>
                  {idx > 0 && <View style={[styles.sep, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />}
                  <View style={{ gap: 6 }}>
                    {/* Nom + ratio */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={1}>
                        {s.name}
                      </Text>
                      <View style={[styles.subBadge, { backgroundColor: isForse ? '#22C55E18' : '#EF444418', marginLeft: 8 }]}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: isForse ? '#22C55E' : '#EF4444' }}>
                          {isForse ? t('combatAnalytics.strength') : t('combatAnalytics.weakness')}
                        </Text>
                      </View>
                    </View>

                    {/* Barre placées */}
                    <View style={{ gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                          <View style={{ width: `${givenPct * 100}%` as any, height: '100%', backgroundColor: '#22C55E', borderRadius: 4 }} />
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#22C55E', minWidth: 20, textAlign: 'right' }}>{s.given}</Text>
                      </View>
                      {/* Barre subies */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                          <View style={{ width: `${takenPct * 100}%` as any, height: '100%', backgroundColor: '#EF4444', borderRadius: 4 }} />
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444', minWidth: 20, textAlign: 'right' }}>{s.taken}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {/* ── RATIO DRILLING / SPARRING ── */}
        {guardRatio.total > 0 && (
          <View style={[cardStyle, { marginBottom: 20 }]}>
            <SectionTitle
              title={t('combatAnalytics.drillingRatio')}
              subtitle={t('combatAnalytics.last6Months')}
              icon={<Activity size={18} color="#06B6D4" />}
              color="#06B6D4"
            />

            {/* Barres empilées globales */}
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, width: 60 }}>{t('combatAnalytics.drilling')}</Text>
                <View style={{ flex: 1, height: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                  <View style={{ width: `${guardRatio.drillingPct}%` as any, height: '100%', backgroundColor: '#06B6D4', borderRadius: 8 }} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#06B6D4', width: 44, textAlign: 'right' }}>
                  {guardRatio.totalDrilling} ({guardRatio.drillingPct}%)
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, width: 60 }}>{t('combatAnalytics.sparring')}</Text>
                <View style={{ flex: 1, height: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                  <View style={{ width: `${guardRatio.sparringPct}%` as any, height: '100%', backgroundColor: '#EF4444', borderRadius: 8 }} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444', width: 44, textAlign: 'right' }}>
                  {guardRatio.totalSparring} ({guardRatio.sparringPct}%)
                </Text>
              </View>
            </View>

            {/* Évolution mensuelle */}
            {guardRatio.months.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>{t('combatAnalytics.perMonth')}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {guardRatio.months.map((m, i) => {
                    const total = m.drilling + m.sparring;
                    const dPct = total > 0 ? (m.drilling / total) * 100 : 0;
                    const sPct = 100 - dPct;
                    const barH = 56;
                    return (
                      <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                        <View style={{ width: '100%', height: barH, borderRadius: 6, overflow: 'hidden', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                          {/* Empilé : drilling en haut (bleu), sparring en bas (rouge) */}
                          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${dPct}%` as any, backgroundColor: '#06B6D4' }} />
                          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${sPct}%` as any, backgroundColor: '#EF444480' }} />
                        </View>
                        <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center' }}>{m.label}</Text>
                        {total > 0 && <Text style={{ fontSize: 8, color: '#06B6D4', fontWeight: '700' }}>{m.drilling}D</Text>}
                        {total > 0 && <Text style={{ fontSize: 8, color: '#EF4444', fontWeight: '700' }}>{m.sparring}S</Text>}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Conseil */}
            {guardRatio.advice ? (
              <View style={{ flexDirection: 'row', gap: 8, backgroundColor: isDark ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.06)', borderRadius: 10, padding: 10, marginTop: 4 }}>
                <Target size={14} color="#06B6D4" style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>{guardRatio.advice}</Text>
              </View>
            ) : null}
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
