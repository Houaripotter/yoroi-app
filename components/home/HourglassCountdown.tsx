// ============================================
// YOROI - Sablier anime spectaculaire + countdown
// En haut a droite de l'accueil
// ============================================

import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { AnimatedHourglass } from '@/components/objectives/AnimatedHourglass';

interface HourglassCountdownProps {
  targetDate?: string | null; // YYYY-MM-DD or ISO date string
  label?: string;
  createdDate?: string | null; // YYYY-MM-DD pour calculer progress
  sandColor?: string;
}

const HourglassCountdown: React.FC<HourglassCountdownProps> = memo(({ targetDate, label, createdDate, sandColor: sandColorProp }) => {
  const { colors, isDark } = useTheme();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [progress, setProgress] = useState(0);
  const [hasTarget, setHasTarget] = useState(false);

  useEffect(() => {
    if (!targetDate) {
      setHasTarget(false);
      return;
    }

    // Support both YYYY-MM-DD and ISO formats
    const targetStr = targetDate.length === 10 ? targetDate + 'T23:59:59' : targetDate;
    const target = new Date(targetStr).getTime();
    if (isNaN(target)) {
      setHasTarget(false);
      return;
    }

    setHasTarget(true);

    const created = createdDate
      ? new Date(createdDate + 'T00:00:00').getTime()
      : Date.now() - (30 * 24 * 60 * 60 * 1000); // fallback 30j avant

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });

      // Progress: 0 = debut, 1 = termine
      const totalMs = target - created;
      const elapsedMs = now - created;
      setProgress(totalMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalMs)) : 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate, createdDate]);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const accentColor = sandColorProp || colors.accent;

  return (
    <TouchableOpacity
      onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/training-goals'); }}
      activeOpacity={0.8}
    >
      <View style={[styles.container, {
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      }]}>
        {/* Sablier anime avec particules */}
        <AnimatedHourglass
          progress={hasTarget ? progress : 0.3}
          size={62}
          sandColor={hasTarget ? accentColor : colors.textMuted}
        />

        {/* Countdown */}
        {hasTarget ? (
          <View style={styles.countdownCol}>
            {timeLeft.days > 0 ? (
              <View style={styles.daysRow}>
                <Text style={[styles.countdownBig, { color: accentColor }]}>
                  {timeLeft.days}
                </Text>
                <Text style={[styles.countdownUnit, { color: colors.textMuted }]}>j</Text>
              </View>
            ) : null}
            <Text style={[styles.countdownTimer, { color: accentColor }]}>
              {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
            </Text>
          </View>
        ) : (
          <View style={styles.countdownCol}>
            <Text style={[styles.noTarget, { color: colors.textMuted }]}>--</Text>
            <Text style={[styles.countdownUnit, { color: colors.textMuted }]}>Objectif</Text>
          </View>
        )}

        {/* Label */}
        {hasTarget && label ? (
          <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>{label}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 92,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 1,
  },
  countdownCol: {
    alignItems: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  countdownBig: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  countdownUnit: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  countdownTimer: {
    fontSize: 10,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  noTarget: {
    fontSize: 18,
    fontWeight: '900',
  },
  label: {
    fontSize: 7,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 1,
    maxWidth: 84,
    textAlign: 'center',
  },
});

export { HourglassCountdown };
export default HourglassCountdown;
