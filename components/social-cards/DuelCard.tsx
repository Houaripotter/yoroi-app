// ============================================
// DUEL CARD · Carte de duel sparring (Format carré 375×375)
// ============================================
// Carte partageable Instagram montrant le bilan H2H
// entre l'utilisateur et un adversaire spécifique

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SocialCardFooterCompact } from './SocialCardBranding';

// ── Constantes couleurs ──
const GOLD = '#D4AF37';
const WIN_COLOR = '#22C55E';
const LOSS_COLOR = '#EF4444';
const DRAW_COLOR = '#9CA3AF';
const DARK_BG = '#0a0a0a';
const LIGHT_BG = '#f8f8f8';

const BELT_COLORS: Record<string, string> = {
  blanche: '#ffffff',
  bleue: '#3B82F6',
  violette: '#8B5CF6',
  marron: '#92400E',
  noire: '#111827',
  grise: '#6B7280',
  jaune: '#F59E0B',
  orange: '#F97316',
  verte: '#22C55E',
  rouge: '#EF4444',
};

// ── Types ──
export interface DuelCardProps {
  myName: string;
  myBelt?: string;
  opponentName: string;
  opponentBelt?: string;
  wins: number;
  losses: number;
  draws: number;
  totalRounds: number;
  topMethodGiven?: string;
  topMethodTaken?: string;
  lastSessions: ('win' | 'loss' | 'draw')[];
  backgroundType: 'dark' | 'light' | 'photo';
  backgroundImage?: string;
  sport?: string;
}

// ── Helpers ──
function getBeltColor(belt?: string): string {
  if (!belt) return BELT_COLORS.noire;
  const key = belt.toLowerCase().trim();
  return BELT_COLORS[key] ?? BELT_COLORS.noire;
}

function getResultColor(r: 'win' | 'loss' | 'draw'): string {
  if (r === 'win') return WIN_COLOR;
  if (r === 'loss') return LOSS_COLOR;
  return DRAW_COLOR;
}

// ── Composant principal ──
export const DuelCard = React.memo(
  React.forwardRef<View, DuelCardProps>(
    (
      {
        myName,
        myBelt,
        opponentName,
        opponentBelt,
        wins,
        losses,
        draws,
        totalRounds,
        topMethodGiven,
        topMethodTaken,
        lastSessions,
        backgroundType,
        backgroundImage,
        sport,
      },
      ref
    ) => {
      const isLight = backgroundType === 'light';
      const isPhoto = backgroundType === 'photo';

      // Couleurs selon thème
      const bg = isLight ? LIGHT_BG : DARK_BG;
      const textPrimary = isLight ? '#111111' : '#FFFFFF';
      const textSecondary = isLight ? '#555555' : 'rgba(255,255,255,0.6)';
      const cardBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
      const dividerColor = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';

      // Stats
      const total = wins + losses + draws;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
      const last8 = lastSessions.slice(0, 8);

      // Ceintures
      const myBeltColor = getBeltColor(myBelt);
      const oppBeltColor = getBeltColor(opponentBelt);

      return (
        <View
          ref={ref}
          style={[styles.card, { backgroundColor: isPhoto ? DARK_BG : bg }]}
          collapsable={false}
        >
          {/* ── Fond photo ── */}
          {isPhoto && backgroundImage ? (
            <Image
              source={{ uri: backgroundImage }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : null}

          {/* ── Overlay sombre sur photo ── */}
          {isPhoto ? (
            <View style={styles.photoOverlay} />
          ) : null}

          {/* ── Contenu ── */}
          <View style={styles.content}>

            {/* TOP: Badge sport */}
            <View style={styles.topRow}>
              {sport ? (
                <View style={[styles.sportBadge, { borderColor: GOLD }]}>
                  <Text style={[styles.sportBadgeText, { color: GOLD }]}>
                    {sport.toUpperCase()}
                  </Text>
                </View>
              ) : (
                <View style={[styles.sportBadge, { borderColor: GOLD }]}>
                  <Text style={[styles.sportBadgeText, { color: GOLD }]}>SPARRING</Text>
                </View>
              )}
            </View>

            {/* FIGHTERS ROW */}
            <View style={styles.fightersRow}>
              {/* ── MOI (gauche, vert) ── */}
              <View style={styles.fighterSide}>
                <View style={[styles.beltBar, { backgroundColor: myBeltColor }]} />
                <Text
                  style={[styles.fighterName, { color: WIN_COLOR }]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {myName}
                </Text>
                {myBelt ? (
                  <Text style={[styles.beltLabel, { color: textSecondary }]}>
                    Ceinture {myBelt}
                  </Text>
                ) : null}
                <View style={styles.fighterStatBox}>
                  <Text style={[styles.fighterStatValue, { color: WIN_COLOR }]}>{wins}</Text>
                  <Text style={[styles.fighterStatLabel, { color: textSecondary }]}>Victoires</Text>
                </View>
              </View>

              {/* ── VS CENTER ── */}
              <View style={styles.vsCenter}>
                <Text style={styles.vsText}>VS</Text>
                <View style={[styles.vsDividerV, { backgroundColor: dividerColor }]} />
              </View>

              {/* ── ADVERSAIRE (droite, rouge) ── */}
              <View style={[styles.fighterSide, styles.fighterSideRight]}>
                <View style={[styles.beltBar, { backgroundColor: oppBeltColor }]} />
                <Text
                  style={[styles.fighterName, { color: LOSS_COLOR }]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {opponentName}
                </Text>
                {opponentBelt ? (
                  <Text style={[styles.beltLabel, { color: textSecondary }]}>
                    Ceinture {opponentBelt}
                  </Text>
                ) : null}
                <View style={styles.fighterStatBox}>
                  <Text style={[styles.fighterStatValue, { color: LOSS_COLOR }]}>{losses}</Text>
                  <Text style={[styles.fighterStatLabel, { color: textSecondary }]}>Défaites</Text>
                </View>
              </View>
            </View>

            {/* BILAN W-L-D */}
            <View style={[styles.recordRow, { borderColor: cardBorder }]}>
              <View style={styles.recordCell}>
                <Text style={[styles.recordValue, { color: WIN_COLOR }]}>{wins}</Text>
                <Text style={[styles.recordLabel, { color: textSecondary }]}>V</Text>
              </View>
              <View style={[styles.recordDivider, { backgroundColor: dividerColor }]} />
              <View style={styles.recordCell}>
                <Text style={[styles.recordValue, { color: LOSS_COLOR }]}>{losses}</Text>
                <Text style={[styles.recordLabel, { color: textSecondary }]}>D</Text>
              </View>
              <View style={[styles.recordDivider, { backgroundColor: dividerColor }]} />
              <View style={styles.recordCell}>
                <Text style={[styles.recordValue, { color: DRAW_COLOR }]}>{draws}</Text>
                <Text style={[styles.recordLabel, { color: textSecondary }]}>N</Text>
              </View>
              <View style={[styles.recordDivider, { backgroundColor: dividerColor }]} />
              <View style={styles.recordCell}>
                <Text style={[styles.recordValue, { color: GOLD }]}>{winRate}%</Text>
                <Text style={[styles.recordLabel, { color: textSecondary }]}>Win</Text>
              </View>
            </View>

            {/* MÉTHODES */}
            {(topMethodGiven || topMethodTaken) ? (
              <View style={styles.methodsRow}>
                {topMethodGiven ? (
                  <View style={[styles.methodBadge, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)' }]}>
                    <Text style={[styles.methodLabel, { color: textSecondary }]}>↗ Donné</Text>
                    <Text style={[styles.methodValue, { color: WIN_COLOR }]} numberOfLines={1}>
                      {topMethodGiven}
                    </Text>
                  </View>
                ) : null}
                {topMethodTaken ? (
                  <View style={[styles.methodBadge, { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' }]}>
                    <Text style={[styles.methodLabel, { color: textSecondary }]}>↘ Subi</Text>
                    <Text style={[styles.methodValue, { color: LOSS_COLOR }]} numberOfLines={1}>
                      {topMethodTaken}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* HISTORIQUE · 8 dernières séances */}
            {last8.length > 0 ? (
              <View style={styles.historyRow}>
                <Text style={[styles.historyLabel, { color: textSecondary }]}>
                  8 DERNIÈRES SÉANCES
                </Text>
                <View style={styles.dotsRow}>
                  {last8.map((r, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        { backgroundColor: getResultColor(r) },
                      ]}
                    />
                  ))}
                  {/* Pastilles vides si moins de 8 */}
                  {Array.from({ length: Math.max(0, 8 - last8.length) }).map((_, i) => (
                    <View
                      key={`empty-${i}`}
                      style={[
                        styles.dot,
                        styles.dotEmpty,
                        { borderColor: dividerColor },
                      ]}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {/* TOTAL ROUNDS */}
            {totalRounds > 0 ? (
              <Text style={[styles.totalRoundsText, { color: textSecondary }]}>
                {totalRounds} round{totalRounds > 1 ? 's' : ''} au total
              </Text>
            ) : null}

            {/* FOOTER */}
            <View style={styles.footer}>
              <SocialCardFooterCompact variant={isLight ? 'light' : 'dark'} />
            </View>
          </View>
        </View>
      );
    }
  )
);

// ── Styles ──
const CARD_SIZE = 375;

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    overflow: 'hidden',
    borderRadius: 16,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 0,
    justifyContent: 'space-between',
  },

  // Top badge sport
  topRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  sportBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  sportBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Fighters
  fightersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginBottom: 6,
  },
  fighterSide: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  fighterSideRight: {
    alignItems: 'flex-end',
  },
  beltBar: {
    width: 28,
    height: 4,
    borderRadius: 2,
  },
  fighterName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    lineHeight: 20,
  },
  beltLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'capitalize',
  },
  fighterStatBox: {
    alignItems: 'center',
    marginTop: 6,
  },
  fighterStatValue: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  fighterStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // VS Center
  vsCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 6,
  },
  vsText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: 3,
  },
  vsDividerV: {
    width: 1,
    height: 50,
  },

  // Record row W-L-D
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  recordCell: {
    alignItems: 'center',
    flex: 1,
  },
  recordValue: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  recordLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  recordDivider: {
    width: 1,
    height: 28,
  },

  // Méthodes
  methodsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  methodBadge: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  methodLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  methodValue: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  // Historique
  historyRow: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  historyLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 26,
    height: 10,
    borderRadius: 5,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },

  // Total rounds
  totalRoundsText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  // Footer
  footer: {
    marginTop: 2,
  },
});

export default DuelCard;
