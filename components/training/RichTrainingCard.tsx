// ============================================
// RICH TRAINING CARD
// Carte de séance riche (RPE, étoiles technique, métriques détaillées, badges).
// Réutilisée par Planning > Séances ET Stats > Séances pour cohérence visuelle.
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ChevronRight } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { getSportIcon, getSportName, getSportColor } from '@/lib/sports';
import type { Training } from '@/lib/database';

// ─── Sous-composants ─────────────────────────────────

const SourceBadge = React.memo(({ source }: { source?: string }) => {
  const { colors } = useTheme();
  if (!source || source === 'manual') return null;
  const srcMap: Record<string, { icon: string; label: string; color: string }> = {
    apple_health: { icon: 'apple', label: 'Apple Health', color: '#FF2D55' },
    apple_watch: { icon: 'watch', label: 'Apple Watch', color: '#FF2D55' },
    garmin: { icon: 'watch-variant', label: 'Garmin', color: '#007ACC' },
    samsung: { icon: 'samsung', label: 'Samsung', color: '#1428A0' },
    strava: { icon: 'run-fast', label: 'Strava', color: '#FC4C02' },
    wahoo: { icon: 'bike', label: 'Wahoo', color: '#009BDF' },
    polar: { icon: 'heart-pulse', label: 'Polar', color: '#CC0000' },
    suunto: { icon: 'compass', label: 'Suunto', color: '#E85D04' },
  };
  const info = srcMap[source] || { icon: 'sync', label: source, color: colors.textMuted };
  return (
    <View style={[styles.sourceBadge, { backgroundColor: info.color + '18' }]}>
      <MaterialCommunityIcons name={info.icon as any} size={11} color={info.color} />
      <Text style={[styles.sourceBadgeText, { color: info.color }]}>{info.label}</Text>
    </View>
  );
});

const IntensityBar = React.memo(({ value, color }: { value: number; color: string }) => (
  <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
    {Array.from({ length: 10 }).map((_, i) => (
      <View
        key={i}
        style={{
          width: 5,
          height: i < value ? 10 + (i * 0.8) : 8,
          borderRadius: 2,
          backgroundColor: i < value ? color : 'rgba(128,128,128,0.18)',
        }}
      />
    ))}
  </View>
));

const TechniqueStars = React.memo(({ value, color }: { value: number; color: string }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <MaterialCommunityIcons
        key={i}
        name={i <= value ? 'star' : 'star-outline'}
        size={14}
        color={i <= value ? color : 'rgba(128,128,128,0.35)'}
      />
    ))}
  </View>
));

// ─── Helpers ─────────────────────────────────

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
};

const formatCalories = (kcal: number): string => {
  if (kcal >= 1000) return `${(kcal / 1000).toFixed(1)}k`;
  return String(Math.round(kcal));
};

// ─── Composant principal ─────────────────────────────────

interface RichTrainingCardProps {
  training: Training;
  /** Si true, navigue vers /workout-detail au tap (par défaut true) */
  pressable?: boolean;
}

const RichTrainingCardInner: React.FC<RichTrainingCardProps> = ({ training, pressable = true }) => {
  const { colors, isDark } = useTheme();

  const sportName = getSportName(training.sport || '');
  const sportIcon = getSportIcon(training.sport || '');
  const sportColor = getSportColor(training.sport || '') || colors.accent;

  const cardBg = isDark ? colors.backgroundCard : '#FFFFFF';
  const dividerColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  const duration = (training as any).duration_minutes || (training as any).duration || 0;
  const cal = training.calories || 0;
  const distance = training.distance || 0;
  const avgHR = training.heart_rate || 0;
  const maxHR = training.max_heart_rate || 0;

  let dateStr = '';
  let timeStr = '';
  try {
    const d = parseISO(training.date);
    dateStr = format(d, 'EEE d MMM', { locale: fr });
    if (training.start_time) {
      const [sh, sm] = training.start_time.split(':').map(Number);
      const endMin = sh * 60 + sm + duration;
      const eh = Math.floor(endMin / 60) % 24;
      const em = endMin % 60;
      timeStr = `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')} – ${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
    }
  } catch { dateStr = training.date; }

  // Types de session
  let sessionTypes: string[] = [];
  if ((training as any).session_types) {
    try { sessionTypes = JSON.parse((training as any).session_types); } catch {}
  } else if (training.session_type) {
    sessionTypes = [training.session_type];
  }

  const intensityVal = training.intensity || 0;
  const techniqueVal = (training as any).technique_rating || 0;
  const hasMetrics = duration > 0 || cal > 0 || distance > 0 || avgHR > 0 ||
    (training as any).watts || (training as any).speed || (training as any).cadence || (training as any).rounds;

  const handlePress = () => {
    if (!pressable || training.id == null) return;
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/workout-detail?id=${training.id}` as any);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderLeftColor: sportColor }]}
      activeOpacity={0.75}
      onPress={handlePress}
      disabled={!pressable}
      accessibilityRole={pressable ? 'button' : undefined}
      accessibilityLabel={`Séance ${sportName} du ${dateStr}, durée ${formatDuration(duration)}`}
    >
      {/* ── Header : icône + sport + date ── */}
      <View style={styles.cardHeader}>
        <View style={[styles.sportIconWrap, { backgroundColor: sportColor + '20' }]}>
          <MaterialCommunityIcons name={sportIcon as any} size={22} color={sportColor} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.sportTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {sportName}
            {(training as any).club_name ? (
              <Text style={[styles.clubLabel, { color: sportColor }]}>, {(training as any).club_name}</Text>
            ) : null}
          </Text>
          <View style={styles.dateRow}>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{dateStr}</Text>
            {timeStr ? <Text style={[styles.timeText, { color: colors.textMuted }]}>, {timeStr}</Text> : null}
          </View>
        </View>
        <SourceBadge source={training.source} />
        {pressable && <ChevronRight size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />}
      </View>

      {/* ── Badges types session / lieu / thème ── */}
      {(sessionTypes.length > 0 || training.location_name || (training as any).technical_theme) && (
        <View style={styles.tagsRow}>
          {sessionTypes.map((st, i) => (
            <View key={i} style={[styles.tag, { backgroundColor: sportColor + '18' }]}>
              <Text style={[styles.tagText, { color: sportColor }]}>{st}</Text>
            </View>
          ))}
          {training.location_name && (
            <View style={[styles.tag, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
              <MaterialCommunityIcons name="map-marker-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.tagText, { color: colors.textMuted }]} numberOfLines={1}>{training.location_name}</Text>
            </View>
          )}
          {(training as any).technical_theme && (
            <View style={[styles.tag, { backgroundColor: '#8B5CF618' }]}>
              <MaterialCommunityIcons name="lightbulb-outline" size={11} color="#8B5CF6" />
              <Text style={[styles.tagText, { color: '#8B5CF6' }]} numberOfLines={1}>{(training as any).technical_theme}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Métriques en grille ── */}
      {hasMetrics && (
        <View style={[styles.metricsGrid, { borderTopColor: dividerColor }]}>
          {duration > 0 && (
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="clock-outline" size={15} color={colors.textMuted} />
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatDuration(duration)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>durée</Text>
            </View>
          )}
          {cal > 0 && (
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="fire" size={15} color="#F97316" />
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatCalories(cal)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>kcal</Text>
            </View>
          )}
          {distance > 0 && (
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="map-marker-distance" size={15} color="#22C55E" />
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{distance.toFixed(2)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>km</Text>
            </View>
          )}
          {avgHR > 0 && (
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="heart-pulse" size={15} color="#EF4444" />
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{avgHR}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>bpm moy</Text>
            </View>
          )}
          {maxHR > 0 && (
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="heart-flash" size={15} color="#EF4444" />
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{maxHR}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>bpm max</Text>
            </View>
          )}
          {(training as any).rounds != null && (training as any).rounds > 0 && (
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="boxing-glove" size={15} color={sportColor} />
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {(training as any).rounds}×{(training as any).round_duration ? `${(training as any).round_duration}min` : ''}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>rounds</Text>
            </View>
          )}
          {(training as any).watts != null && (training as any).watts > 0 && (
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="lightning-bolt" size={15} color="#EAB308" />
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{(training as any).watts}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>watts</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Intensité + Technique ── */}
      {(intensityVal > 0 || techniqueVal > 0) && (
        <View style={[styles.ratingRow, { borderTopColor: dividerColor }]}>
          {intensityVal > 0 && (
            <View style={styles.ratingItem}>
              <Text style={[styles.ratingLabel, { color: colors.textMuted }]}>INTENSITÉ RPE</Text>
              <View style={styles.ratingContent}>
                <IntensityBar value={intensityVal} color={sportColor} />
                <Text style={[styles.ratingNum, { color: sportColor }]}>{intensityVal}/10</Text>
              </View>
            </View>
          )}
          {techniqueVal > 0 && (
            <View style={styles.ratingItem}>
              <Text style={[styles.ratingLabel, { color: colors.textMuted }]}>TECHNIQUE</Text>
              <View style={styles.ratingContent}>
                <TechniqueStars value={techniqueVal} color="#F59E0B" />
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const RichTrainingCard = React.memo(RichTrainingCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flex: 1, minWidth: 0 },
  sportTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  clubLabel: { fontSize: 13, fontWeight: '700' },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dateText: { fontSize: 12, fontWeight: '600' },
  timeText: { fontSize: 12, fontWeight: '500' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  metricItem: { alignItems: 'center', minWidth: 60 },
  metricValue: { fontSize: 15, fontWeight: '900', letterSpacing: -0.2, marginTop: 2 },
  metricLabel: { fontSize: 10, fontWeight: '600', textTransform: 'lowercase', marginTop: 1 },

  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ratingItem: { flex: 1, minWidth: 130 },
  ratingLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  ratingContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingNum: { fontSize: 13, fontWeight: '900' },

  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sourceBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
});
