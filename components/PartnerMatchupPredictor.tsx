// ============================================
// PARTNER MATCHUP PREDICTOR
// ============================================
// Predit le % de victoire avant un sparring, base sur :
//  - Historique global
//  - Momentum (5 derniers rounds)
//  - Niveau de menace
//  - Ecarts physiques
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface Props {
  partnerName: string;
  wins: number;
  losses: number;
  draws: number;
  recentResults?: Array<'V' | 'D' | 'N'>; // 5 derniers
  weightDeltaKg?: number;
  heightDeltaCm?: number;
  experienceLevel?: 'debutant' | 'experimente' | 'competiteur' | 'pro';
}

export const PartnerMatchupPredictor: React.FC<Props> = ({
  partnerName, wins, losses, draws,
  recentResults = [],
  weightDeltaKg, heightDeltaCm, experienceLevel,
}) => {
  const { colors, isDark } = useTheme();

  const { prediction, confidence, trend } = useMemo(() => {
    const total = wins + losses + draws;

    // Pas assez de donnees
    if (total < 3) {
      return { prediction: 50, confidence: 'faible', trend: 'neutral' as const };
    }

    // Base : winrate global
    let p = ((wins + draws * 0.5) / total) * 100;

    // Ajustement momentum : 5 derniers
    if (recentResults.length >= 3) {
      const recentWins = recentResults.filter(r => r === 'V').length;
      const recentPct = (recentWins / recentResults.length) * 100;
      // Moyenne ponderee (momentum 40%, historique 60%)
      p = p * 0.6 + recentPct * 0.4;
    }

    // Ajustement ecarts physiques
    if (weightDeltaKg && weightDeltaKg > 10) p -= 4;
    if (weightDeltaKg && weightDeltaKg < -10) p += 3;
    if (heightDeltaCm && heightDeltaCm > 10) p -= 2;

    // Niveau d'experience
    if (experienceLevel === 'pro') p -= 5;
    else if (experienceLevel === 'debutant') p += 5;

    // Clamp
    p = Math.max(5, Math.min(95, Math.round(p)));

    // Confiance
    const confidence = total >= 10 ? 'elevee' : total >= 5 ? 'moyenne' : 'faible';

    // Trend (compare les 2 derniers a la moyenne)
    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    if (recentResults.length >= 3) {
      const recentW = recentResults.filter(r => r === 'V').length;
      const globalWR = (wins / Math.max(1, wins + losses)) * 100;
      const recentWR = (recentW / recentResults.length) * 100;
      if (recentWR > globalWR + 10) trend = 'up';
      else if (recentWR < globalWR - 10) trend = 'down';
    }

    return { prediction: p, confidence, trend };
  }, [wins, losses, draws, recentResults, weightDeltaKg, heightDeltaCm, experienceLevel]);

  const barColor =
    prediction >= 70 ? '#10B981' :
    prediction >= 50 ? '#3B82F6' :
    prediction >= 30 ? '#F59E0B' : '#EF4444';

  const mood =
    prediction >= 70 ? 'Tu pars favori' :
    prediction >= 50 ? 'Match equilibre' :
    prediction >= 30 ? 'Challenge reel' : 'Prends des risques, rien a perdre';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : colors.textMuted;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: barColor + '40' }]}>
      <LinearGradient
        colors={[barColor + '18', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <Text style={[styles.label, { color: barColor }]}>PREDICTEUR : AVANT DE ROULER</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <TrendIcon size={14} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]}>
            {trend === 'up' ? 'En forme' : trend === 'down' ? 'Creux' : 'Stable'}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.mood, { color: colors.text }]}>{mood}</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            Confiance : {confidence}
          </Text>
        </View>
        <View style={[styles.scoreBox, { backgroundColor: barColor }]}>
          <Text style={styles.scoreNum}>{prediction}</Text>
          <Text style={styles.scorePct}>%</Text>
        </View>
      </View>

      {/* Barre de probabilite */}
      <View style={[styles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <View style={[styles.trackFill, { width: `${prediction}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.trackLabels}>
        <Text style={[styles.trackLabel, { color: colors.textMuted }]}>Defaite probable</Text>
        <Text style={[styles.trackLabel, { color: colors.textMuted }]}>Victoire probable</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  trendText: { fontSize: 10, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  mood: { fontSize: 14, fontWeight: '800' },
  sub: { fontSize: 11, marginTop: 2 },
  scoreBox: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  scoreNum: { fontSize: 26, fontWeight: '900', color: '#fff' },
  scorePct: { fontSize: 12, fontWeight: '800', color: '#fff' },
  track: {
    height: 8, borderRadius: 4, overflow: 'hidden',
    marginTop: 12,
  },
  trackFill: { height: '100%', borderRadius: 4 },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  trackLabel: { fontSize: 9, fontWeight: '600' },
});

export default React.memo(PartnerMatchupPredictor);
