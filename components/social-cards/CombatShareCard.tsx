// ============================================
// COMBAT SHARE CARD : Premium fight report card
// ============================================
// Design sombre premium, données combat, partage réseaux sociaux
// Format 9:16 (Story)

import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getClubLogoSource, getSportName } from '@/lib/sports';
import { SocialCardFooter } from './SocialCardBranding';
import { Training } from '@/lib/database';
import { CombatRoundData } from './SessionCard';
import { traduire, traduirePluriel, LOCALE } from '@/lib/i18n/tr';

// ── Constantes couleurs ──
const GOLD = '#D4AF37';
const WIN_C = '#22C55E';
const LOSS_C = '#EF4444';
const DRAW_C = '#9CA3AF';
const BG = '#09090F';

function getSportAccent(sport?: string): string {
  if (!sport) return GOLD;
  const s = sport.toLowerCase();
  if (s.includes('jjb') || s.includes('bjj') || s.includes('brésil') || s.includes('bresil')) return '#3B82F6';
  if (s.includes('mma')) return '#EF4444';
  if (s.includes('boxe') || s.includes('boxing')) return '#F59E0B';
  if (s.includes('muay') || s.includes('thai')) return '#A855F7';
  if (s.includes('grappling')) return '#10B981';
  if (s.includes('judo')) return '#D97706';
  if (s.includes('lutte') || s.includes('wrestling')) return '#EC4899';
  if (s.includes('sambo')) return '#6366F1';
  if (s.includes('kick')) return '#F97316';
  return GOLD;
}

interface CombatShareCardProps {
  training: Partial<Training>;
  rounds: CombatRoundData[];
  width: number;
  backgroundImage?: string;
  userName?: string;
  rank?: string;
}

export const CombatShareCard = React.memo(React.forwardRef<View, CombatShareCardProps>(
  ({ training, rounds, width, backgroundImage, userName, rank }, ref) => {
    const CARD_HEIGHT = Math.round(width * (16 / 9));
    const sportAccent = useMemo(() => getSportAccent(training.sport), [training.sport]);
    const clubLogoSource = training.club_logo ? getClubLogoSource(training.club_logo) : null;

    const sportLabel = useMemo(() => {
      if (!training.sport) return traduire('SÉANCE COMBAT');
      return training.sport.split(',').map(s => getSportName(s.trim()) ?? s.trim()).join(' + ').toUpperCase();
    }, [training.sport]);

    const dateLabel = useMemo(() => {
      if (!training.date) return '';
      return new Date(training.date).toLocaleDateString(LOCALE, {
        day: 'numeric', month: 'short', year: 'numeric',
      }).toUpperCase();
    }, [training.date]);

    // ── Calcul stats combat ──
    const stats = useMemo(() => {
      const wins = rounds.filter(r => r.result === 'win').length;
      const losses = rounds.filter(r => r.result === 'loss').length;
      const draws = rounds.filter(r => r.result === 'draw').length;
      const totalFor = rounds.reduce((a, r) => a + (r.pointsFor ?? 0), 0);
      const totalAgainst = rounds.reduce((a, r) => a + (r.pointsAgainst ?? 0), 0);
      const isUnbeaten = wins > 0 && losses === 0 && draws === 0;
      // Top techniques (triées par fréquence)
      const techCount: Record<string, number> = {};
      rounds.forEach(r => {
        (r.usedTechniques ?? []).forEach(t => {
          techCount[t.label] = (techCount[t.label] ?? 0) + (t.count ?? 1);
        });
      });
      const topTechs = Object.entries(techCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l]) => l);
      // Toutes les soumissions données
      const givenSeen = new Set<string>();
      const allGiven = rounds.flatMap(r => r.methodsGiven ?? []).filter(m => !givenSeen.has(m) && givenSeen.add(m));
      return { wins, losses, draws, totalFor, totalAgainst, isUnbeaten, topTechs, allGiven };
    }, [rounds]);

    const durationLabel = useMemo(() => {
      const d = training.duration_minutes ?? 0;
      if (!d) return null;
      const h = Math.floor(d / 60);
      const m = d % 60;
      return h > 0 ? `${h}H${m > 0 ? String(m).padStart(2, '0') : ''}` : `${m}MIN`;
    }, [training.duration_minutes]);

    // Scale factors (tout relatif à la largeur de carte)
    const s = width / 380;

    const ROUND_COMPACT = rounds.length >= 4;

    return (
      <View ref={ref} style={[styles.card, { width, height: CARD_HEIGHT, backgroundColor: BG }]} collapsable={false}>

        {/* ── BACKGROUND GLOW top ── */}
        <LinearGradient
          colors={[sportAccent + '35', sportAccent + '10', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.bgGlow, { height: CARD_HEIGHT * 0.42 }]}
          pointerEvents="none"
        />

        {/* ── HEADER ── */}
        <View style={[styles.header, { paddingHorizontal: 18 * s, paddingTop: 14 * s, marginBottom: 4 * s }]}>
          <Text style={[styles.yoroiBrand, { fontSize: 13 * s, color: GOLD, letterSpacing: 3 * s }]}>YOROI</Text>
          {dateLabel ? (
            <View style={[styles.datePill, { borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8 * s, paddingVertical: 3 * s, borderRadius: 6 * s }]}>
              <Text style={[styles.dateText, { fontSize: 8 * s, color: 'rgba(255,255,255,0.55)' }]}>{dateLabel}</Text>
            </View>
          ) : null}
        </View>

        {/* ── SPORT HERO SECTION ── */}
        <View style={[styles.heroSection, { marginHorizontal: 18 * s, marginBottom: 12 * s, borderRadius: 14 * s, overflow: 'hidden' }]}>
          {backgroundImage ? (
            <Image source={{ uri: backgroundImage }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : null}
          <LinearGradient
            colors={[sportAccent + 'CC', sportAccent + '55', 'rgba(9,9,15,0.92)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject]}
          />
          {backgroundImage && (
            <LinearGradient
              colors={['rgba(9,9,15,0.55)', 'rgba(9,9,15,0.72)']}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <View style={[styles.heroContent, { padding: 16 * s }]}>
            {/* Club row */}
            <View style={styles.heroClubRow}>
              {clubLogoSource ? (
                <View style={[styles.clubLogoWrap, { width: 22 * s, height: 22 * s, borderRadius: 5 * s }]}>
                  <Image source={clubLogoSource} style={styles.fill} resizeMode="contain" />
                </View>
              ) : null}
              <Text style={[styles.heroClubName, { fontSize: 10 * s, color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5 * s }]}>
                {(training.club_name ?? 'SOLO').toUpperCase()}
              </Text>
            </View>
            {/* Sport name */}
            <Text style={[styles.heroSportName, { fontSize: 26 * s, color: '#FFFFFF', marginTop: 6 * s }]} numberOfLines={1}>
              {sportLabel}
            </Text>
            {/* Rank badge if available */}
            {rank ? (
              <View style={[styles.rankBadge, { borderColor: GOLD + '60', paddingHorizontal: 8 * s, paddingVertical: 2 * s, borderRadius: 5 * s, marginTop: 6 * s }]}>
                <Text style={[styles.rankText, { fontSize: 8 * s, color: GOLD }]}>{rank.toUpperCase()}</Text>
              </View>
            ) : null}
          </View>
          {/* Accent bar vertical gauche */}
          <View style={[styles.heroAccentBar, { backgroundColor: sportAccent, width: 4 * s, borderRadius: 2 * s }]} />
        </View>

        {/* ── STATS BLOC ── */}
        <View style={[styles.statsBlock, { marginHorizontal: 18 * s, marginBottom: 10 * s, borderRadius: 12 * s, padding: 14 * s, borderColor: 'rgba(255,255,255,0.07)', gap: 6 * s }]}>
          {/* Ligne 1 : W / L / D + IMBATTU */}
          <View style={styles.statsRow}>
            {stats.wins > 0 && (
              <View style={styles.statUnit}>
                <Text style={[styles.statBigNum, { color: WIN_C, fontSize: 46 * s }]}>{stats.wins}</Text>
                <Text style={[styles.statUnitLabel, { color: WIN_C, fontSize: 11 * s }]}>V</Text>
              </View>
            )}
            {stats.losses > 0 && (
              <>
                <Text style={[styles.statDivider, { color: 'rgba(255,255,255,0.15)', fontSize: 32 * s }]}> </Text>
                <View style={styles.statUnit}>
                  <Text style={[styles.statBigNum, { color: LOSS_C, fontSize: 46 * s }]}>{stats.losses}</Text>
                  <Text style={[styles.statUnitLabel, { color: LOSS_C, fontSize: 11 * s }]}>D</Text>
                </View>
              </>
            )}
            {stats.draws > 0 && (
              <>
                <Text style={[styles.statDivider, { color: 'rgba(255,255,255,0.15)', fontSize: 32 * s }]}> </Text>
                <View style={styles.statUnit}>
                  <Text style={[styles.statBigNum, { color: DRAW_C, fontSize: 46 * s }]}>{stats.draws}</Text>
                  <Text style={[styles.statUnitLabel, { color: DRAW_C, fontSize: 11 * s }]}>N</Text>
                </View>
              </>
            )}
            {/* IMBATTU badge */}
            {stats.isUnbeaten && (
              <View style={[styles.imbattuBadge, { backgroundColor: WIN_C + '20', borderColor: WIN_C + '50', paddingHorizontal: 9 * s, paddingVertical: 4 * s, borderRadius: 8 * s }]}>
                <Text style={[styles.imbattuText, { color: WIN_C, fontSize: 10 * s, letterSpacing: 1.5 * s }]}>{traduire("IMBATTU")}</Text>
              </View>
            )}
            {/* Duration badge */}
            {durationLabel && (
              <View style={[styles.durationBadge, { backgroundColor: GOLD, paddingHorizontal: 9 * s, paddingVertical: 4 * s, borderRadius: 8 * s, marginLeft: 'auto' }]}>
                <Text style={[styles.durationText, { color: '#000', fontSize: 12 * s }]}>{durationLabel}</Text>
              </View>
            )}
          </View>

          {/* Ligne 2 : pts + soumissions données */}
          <View style={styles.statsSubRow}>
            {(stats.totalFor > 0 || stats.totalAgainst > 0) && (
              <Text style={[styles.ptsText, { color: 'rgba(255,255,255,0.6)', fontSize: 11 * s }]}>
                {stats.totalFor} – {stats.totalAgainst} pts
              </Text>
            )}
            {stats.allGiven.length > 0 && (
              <Text style={[styles.subText, { color: GOLD, fontSize: 11 * s }]} numberOfLines={1}>
                ↗ {stats.allGiven.slice(0, 3).join(', ')}{stats.allGiven.length > 3 ? ` +${stats.allGiven.length - 3}` : ''}
              </Text>
            )}
          </View>
        </View>

        {/* ── DIVIDER "COMBAT LOG" ── */}
        <View style={[styles.sectionDivider, { marginHorizontal: 18 * s, marginBottom: 8 * s }]}>
          <View style={[styles.dividerLine, { backgroundColor: sportAccent + '60' }]} />
          <Text style={[styles.dividerLabel, { color: 'rgba(255,255,255,0.35)', fontSize: 8 * s, letterSpacing: 2 * s, paddingHorizontal: 8 * s }]}>{traduire("COMBAT LOG")}</Text>
          <View style={[styles.dividerLine, { backgroundColor: sportAccent + '60' }]} />
        </View>

        {/* ── ROUNDS LIST ── */}
        <View style={[styles.roundsList, { marginHorizontal: 18 * s, gap: ROUND_COMPACT ? 4 * s : 6 * s, marginBottom: 10 * s }]}>
          {rounds.slice(0, ROUND_COMPACT ? 6 : 4).map((r, i) => {
            const rc = r.result === 'win' ? WIN_C : r.result === 'loss' ? LOSS_C : DRAW_C;
            const rl = r.result === 'win' ? 'WIN' : r.result === 'loss' ? 'LOSS' : r.result === 'draw' ? 'DRAW' : '';
            const subsGiven = (r.methodsGiven ?? []).slice(0, 2);
            const subsTaken = (r.methodsTaken ?? []).slice(0, 1);
            const hasScore = (r.pointsFor ?? 0) > 0 || (r.pointsAgainst ?? 0) > 0;
            const techs = (r.usedTechniques ?? []).slice(0, ROUND_COMPACT ? 2 : 3).map(t => t.label);

            return (
              <View key={i} style={[
                styles.roundBlock,
                {
                  borderLeftColor: rc,
                  borderLeftWidth: 3 * s,
                  backgroundColor: rc + '0D',
                  borderRadius: 8 * s,
                  padding: ROUND_COMPACT ? 6 * s : 8 * s,
                  paddingLeft: 10 * s,
                }
              ]}>
                {/* Ligne header */}
                <View style={styles.roundHeaderRow}>
                  <View style={[styles.roundNumPill, { borderColor: rc + '60', paddingHorizontal: 5 * s, paddingVertical: 2 * s, borderRadius: 4 * s }]}>
                    <Text style={[styles.roundNumText, { color: rc, fontSize: 9 * s }]}>R{r.number}</Text>
                  </View>
                  {r.partner ? (
                    <Text style={[styles.roundPartner, { color: 'rgba(255,255,255,0.75)', fontSize: ROUND_COMPACT ? 9 * s : 10 * s }]} numberOfLines={1}>
                      vs {r.partner.toUpperCase()}
                    </Text>
                  ) : null}
                  {r.partnerRating ? (
                    <View style={{ backgroundColor: r.partnerRating <= 3 ? '#22C55E30' : r.partnerRating <= 6 ? '#F59E0B30' : r.partnerRating <= 8 ? '#EF444430' : '#9333EA30', borderRadius: 4 * s, paddingHorizontal: 4 * s, paddingVertical: 1 * s }}>
                      <Text style={{ fontSize: 7.5 * s, fontWeight: '800', color: r.partnerRating <= 3 ? '#22C55E' : r.partnerRating <= 6 ? '#F59E0B' : r.partnerRating <= 8 ? '#EF4444' : '#C084FC' }}>
                        {r.partnerRating}/10
                      </Text>
                    </View>
                  ) : null}
                  {rl ? (
                    <Text style={[styles.roundResultLabel, { color: rc, fontSize: ROUND_COMPACT ? 9 * s : 10 * s, marginLeft: 'auto' }]}>
                      {rl}
                    </Text>
                  ) : null}
                </View>

                {/* Ligne chips */}
                {!ROUND_COMPACT && (subsGiven.length > 0 || subsTaken.length > 0 || hasScore || techs.length > 0) && (
                  <View style={[styles.roundChipsRow, { marginTop: 4 * s, gap: 4 * s }]}>
                    {subsGiven.map((sg, si) => (
                      <View key={`g${si}`} style={[styles.chip, { backgroundColor: WIN_C + '18', borderColor: WIN_C + '40', borderRadius: 4 * s, paddingHorizontal: 5 * s, paddingVertical: 2 * s }]}>
                        <Text style={[styles.chipText, { color: WIN_C, fontSize: 7.5 * s }]}>↗ {sg}</Text>
                      </View>
                    ))}
                    {subsTaken.map((st, si) => (
                      <View key={`t${si}`} style={[styles.chip, { backgroundColor: LOSS_C + '18', borderColor: LOSS_C + '40', borderRadius: 4 * s, paddingHorizontal: 5 * s, paddingVertical: 2 * s }]}>
                        <Text style={[styles.chipText, { color: LOSS_C, fontSize: 7.5 * s }]}>↘ {st}</Text>
                      </View>
                    ))}
                    {hasScore && (
                      <View style={[styles.chip, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', borderRadius: 4 * s, paddingHorizontal: 5 * s, paddingVertical: 2 * s }]}>
                        <Text style={[styles.chipText, { color: 'rgba(255,255,255,0.55)', fontSize: 7.5 * s }]}>{r.pointsFor ?? 0}–{r.pointsAgainst ?? 0}pts</Text>
                      </View>
                    )}
                    {techs.map((t, ti) => (
                      <Text key={ti} style={[styles.techDot, { color: 'rgba(255,255,255,0.4)', fontSize: 7.5 * s }]}>{t}</Text>
                    ))}
                  </View>
                )}
                {/* Mode compact : tout sur 1 ligne */}
                {ROUND_COMPACT && (hasScore || subsGiven.length > 0 || techs.length > 0) && (
                  <Text style={[styles.roundCompactLine, { color: 'rgba(255,255,255,0.4)', fontSize: 7.5 * s, marginTop: 2 * s }]} numberOfLines={1}>
                    {[hasScore ? `${r.pointsFor ?? 0}–${r.pointsAgainst ?? 0}pts` : '', ...subsGiven.map(s => `↗${s}`), ...techs].filter(Boolean).join('  ')}
                  </Text>
                )}
              </View>
            );
          })}
          {rounds.length > (ROUND_COMPACT ? 6 : 4) && (
            <Text style={[styles.moreRoundsText, { color: 'rgba(255,255,255,0.3)', fontSize: 8 * s, marginTop: 2 * s }]}>
              {traduirePluriel(rounds.length - (ROUND_COMPACT ? 6 : 4), rounds.length - (ROUND_COMPACT ? 6 : 4) > 1, "+ {0} round supplémentaire", "+ {0} rounds supplémentaires", rounds.length - (ROUND_COMPACT ? 6 : 4))}</Text>
          )}
        </View>

        {/* ── TECHNIQUES TOP ── */}
        {stats.topTechs.length > 0 && (
          <View style={[styles.techsRow, { marginHorizontal: 18 * s, marginBottom: 8 * s, gap: 5 * s }]}>
            {stats.topTechs.map((tech, i) => (
              <View key={i} style={[styles.techChip, { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: sportAccent + '40', borderRadius: 5 * s, paddingHorizontal: 7 * s, paddingVertical: 3 * s }]}>
                <Text style={[styles.techChipText, { color: 'rgba(255,255,255,0.65)', fontSize: 8 * s, letterSpacing: 0.5 * s }]}>
                  {tech.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={{ marginTop: 'auto' }}>
          <SocialCardFooter variant="dark" />
        </View>
      </View>
    );
  }
));

CombatShareCard.displayName = 'CombatShareCard';

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    flexDirection: 'column',
  },
  bgGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yoroiBrand: {
    fontWeight: '900',
  },
  datePill: {
    borderWidth: 1,
  },
  dateText: {
    fontWeight: '700',
  },
  heroSection: {
    overflow: 'hidden',
    minHeight: 90,
  },
  heroContent: {
    justifyContent: 'flex-end',
    minHeight: 90,
  },
  heroClubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clubLogoWrap: {
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  heroClubName: {
    fontWeight: '700',
  },
  heroSportName: {
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: undefined,
  },
  rankBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  rankText: {
    fontWeight: '700',
  },
  heroAccentBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
  },
  statsBlock: {
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  statUnit: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statBigNum: {
    fontWeight: '900',
    lineHeight: undefined,
  },
  statUnitLabel: {
    fontWeight: '900',
  },
  statDivider: {
    fontWeight: '300',
  },
  imbattuBadge: {
    borderWidth: 1,
    alignSelf: 'center',
    marginLeft: 6,
  },
  imbattuText: {
    fontWeight: '800',
  },
  durationBadge: {
    alignSelf: 'center',
  },
  durationText: {
    fontWeight: '900',
  },
  statsSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  ptsText: {
    fontWeight: '700',
  },
  subText: {
    fontWeight: '700',
    flex: 1,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    fontWeight: '700',
  },
  roundsList: {
    flexDirection: 'column',
  },
  roundBlock: {
    borderWidth: 0,
  },
  roundHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roundNumPill: {
    borderWidth: 1,
  },
  roundNumText: {
    fontWeight: '900',
  },
  roundPartner: {
    fontWeight: '700',
    flex: 1,
  },
  roundResultLabel: {
    fontWeight: '900',
  },
  roundChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  chip: {
    borderWidth: 1,
  },
  chipText: {
    fontWeight: '700',
  },
  techDot: {
    fontWeight: '600',
  },
  roundCompactLine: {
    fontWeight: '600',
  },
  moreRoundsText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  techsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  techChip: {
    borderWidth: 1,
  },
  techChipText: {
    fontWeight: '700',
  },
});

export default CombatShareCard;
