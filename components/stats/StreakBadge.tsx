// ============================================
// STREAK BADGE
// Compteur de jours consécutifs avec au moins 1 séance.
// Style "🔥 12 jours d'affilée" avec animation pulse subtile.
// Inspiré Duolingo / Snapchat · addictif et motivant.
// ============================================

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import { Flame } from 'lucide-react-native';

interface DatedPoint {
  date: string;
  /** Optionnel : si défini, on ne compte ce point que si predicate(p) === true */
  [key: string]: any;
}

interface StreakBadgeProps {
  /** Tableau d'éléments datés (séances, nuits, pesées, etc.) */
  items: DatedPoint[];
  /** Filtre optionnel (ex. n => n.duration >= 420 pour 7h+ de sommeil) */
  predicate?: (p: DatedPoint) => boolean;
  /** Mot affiché après le nombre. Défaut "jour(s) d'affilée" */
  unitSingular?: string;
  unitPlural?: string;
  /** Texte contextuel sous le nombre. Défaut auto selon longueur */
  contextLabel?: string;
  /** Couleur custom (sinon palette auto selon longueur) */
  forceColor?: string;
  /** Force une streak (utile pour démo/preview) */
  forcedStreak?: number;
  /** Pour rétrocompat : alias de `items` */
  trainings?: DatedPoint[];
}

/** Calcule la streak actuelle en jours consécutifs (depuis aujourd'hui ou hier). */
const computeStreak = (items: DatedPoint[], predicate?: (p: DatedPoint) => boolean): number => {
  if (!items || items.length === 0) return 0;
  const today = startOfDay(new Date());
  const dates = new Set<number>();
  for (const t of items) {
    try {
      if (predicate && !predicate(t)) continue;
      const d = startOfDay(parseISO(t.date));
      dates.add(d.getTime());
    } catch { /* ignore */ }
  }
  let streak = 0;
  let cursor = today;
  if (!dates.has(cursor.getTime())) {
    cursor = new Date(cursor.getTime() - 86400000);
    if (!dates.has(cursor.getTime())) return 0;
  }
  while (dates.has(cursor.getTime())) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
};

const StreakBadgeInner: React.FC<StreakBadgeProps> = ({
  items,
  trainings,
  predicate,
  unitSingular = 'jour',
  unitPlural = 'jours',
  contextLabel,
  forceColor,
  forcedStreak,
}) => {
  const { colors, isDark } = useTheme();
  // Rétrocompat : si on passe `trainings` au lieu de `items`
  const source = items || trainings || [];
  const streak = useMemo(
    () => forcedStreak !== undefined ? forcedStreak : computeStreak(source, predicate),
    [source, predicate, forcedStreak],
  );

  // Animation pulse subtile sur la flamme (uniquement si streak active)
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (streak === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [streak, pulse]);

  // Pas de streak → on n'affiche rien (évite la frustration "0 jours")
  if (streak === 0) return null;

  // Couleur selon longueur de la streak.
  // Fond blanc forcé pour lisibilité (les fonds translucides disparaissent sur le thème sombre).
  const intensity = streak >= 30 ? 'epic' : streak >= 14 ? 'high' : streak >= 7 ? 'medium' : 'low';
  const palette = {
    low:    { border: '#F59E0B60', text: '#D97706', flame: '#F59E0B' },
    medium: { border: '#F9731660', text: '#EA580C', flame: '#F97316' },
    high:   { border: '#EF444460', text: '#DC2626', flame: '#EF4444' },
    epic:   { border: '#A855F760', text: '#9333EA', flame: '#A855F7' },
  };
  const p = forceColor
    ? { border: forceColor + '60', text: forceColor, flame: forceColor }
    : palette[intensity];
  const c = { ...p, bg: '#FFFFFF' };

  const label = streak === 1 ? unitSingular : unitPlural;
  const ctxLabel = contextLabel ?? (intensity === 'epic'
    ? 'Légende !'
    : intensity === 'high'
      ? 'Tu es en feu'
      : intensity === 'medium'
        ? 'Belle régularité'
        : 'Continue comme ça');

  return (
    <View style={[styles.container, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Flame size={28} color={c.flame} fill={c.flame} strokeWidth={0} />
      </Animated.View>
      <View style={styles.textContent}>
        <View style={styles.numberRow}>
          <Text style={[styles.number, { color: c.text }]}>{streak}</Text>
          <Text style={[styles.unit, { color: c.text }]}>{label} d'affilée</Text>
        </View>
        <Text style={[styles.context, { color: '#64748B' }]}>{ctxLabel}</Text>
      </View>
    </View>
  );
};

export const StreakBadge = React.memo(StreakBadgeInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  textContent: {
    flex: 1,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  number: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  unit: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  context: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
