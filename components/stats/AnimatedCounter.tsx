// ============================================
// ANIMATED COUNTER (refonte v2 : gros chiffres Archivo Black, chasse fixe)
// Animation count-up (smooth ease-out) sur les KPI numériques.
// Effet "wow" instantané quand l'écran apparaît.
// ============================================

import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleProp, TextStyle, AccessibilityInfo, StyleSheet } from 'react-native';
import { fontStyle } from '@/components/yoroi/fonts';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';

interface AnimatedCounterProps {
  /** Valeur cible */
  value: number;
  /** Durée de l'animation en ms (défaut 900) */
  duration?: number;
  /** Nombre de décimales (défaut 0) */
  decimals?: number;
  /** Préfixe ex. "$" (optionnel) */
  prefix?: string;
  /** Suffixe ex. "kg" (optionnel) */
  suffix?: string;
  /** Style du Text */
  style?: StyleProp<TextStyle>;
  /** Format du nombre (ex. 12345 → "12 345"). Défaut : oui pour ≥ 1000 */
  formatThousands?: boolean;
  /** Si true → affiche en milliers compact ("1.2k", "12k") */
  compact?: boolean;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const formatNumber = (n: number, decimals: number, formatThousands: boolean, compact: boolean): string => {
  if (compact) {
    if (n >= 1000) {
      const k = n / 1000;
      return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
    }
    return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
  }
  const fixed = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
  if (!formatThousands) return fixed;
  // Sépare partie entière et décimale, ajoute espace entre milliers
  const [int, dec] = fixed.split('.');
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return dec ? `${withSep},${dec}` : withSep;
};

const AnimatedCounterInner: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 900,
  decimals = 0,
  prefix = '',
  suffix = '',
  style,
  formatThousands,
  compact = false,
}) => {
  const { theme } = useYoroiTheme();
  const [displayed, setDisplayed] = useState(value);
  const previousRef = useRef<number>(value);
  const reduceMotionRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

  // Détecte Reduce Motion → si actif, pas d'animation
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(v => { reduceMotionRef.current = v; });
  }, []);

  useEffect(() => {
    const from = previousRef.current;
    const to = value;
    if (from === to || reduceMotionRef.current) {
      setDisplayed(to);
      previousRef.current = to;
      return;
    }
    const startTs = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTs;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const current = from + (to - from) * eased;
      setDisplayed(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        previousRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const useThousands = formatThousands ?? value >= 1000;
  const formatted = formatNumber(displayed, decimals, useThousands, compact);

  return (
    <Text style={[fontStyle('black'), styles.base, { color: theme.colors.ink, letterSpacing: letterSpacingFor(style) }, style]} accessibilityLabel={`${prefix}${formatted}${suffix}`}>
      {prefix}{formatted}{suffix}
    </Text>
  );
};

// Chasse legerement resserree, proportionnelle a la taille (signature v2)
function letterSpacingFor(style: StyleProp<TextStyle>): number {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const size = typeof flat?.fontSize === 'number' ? flat.fontSize : 24;
  return -Math.round(size * 0.04 * 10) / 10;
}

const styles = StyleSheet.create({
  base: {
    fontVariant: ['tabular-nums'],
  },
});

export const AnimatedCounter = React.memo(AnimatedCounterInner);
