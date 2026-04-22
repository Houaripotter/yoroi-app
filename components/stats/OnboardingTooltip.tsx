// ============================================
// ONBOARDING TOOLTIP
// Petite bulle qui apparaît au-dessus d'un élément la première fois.
// Persiste dans AsyncStorage pour ne s'afficher qu'une seule fois.
// Design aligné sur le thème de l'app : carte avec accent, pas de bulle sombre.
// ============================================

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface OnboardingTooltipProps {
  /** Clé unique persistée dans AsyncStorage pour ne montrer qu'une fois */
  id: string;
  /** Titre court (max 30 chars) */
  title: string;
  /** Texte explicatif (max 80 chars) */
  text: string;
  /** Direction de la flèche (vers où pointe le tooltip) */
  arrow?: 'up' | 'down' | 'left' | 'right';
  /** Délai avant apparition (ms) */
  delay?: number;
  /** Si true, force l'affichage (debug) */
  forceShow?: boolean;
}

const KEY_PREFIX = '@yoroi_onboarding_';

const OnboardingTooltipInner: React.FC<OnboardingTooltipProps> = ({
  id,
  title,
  text,
  arrow = 'up',
  delay = 600,
  forceShow,
}) => {
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(arrow === 'up' ? -6 : 6)).current;

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (forceShow) {
        if (!cancelled) animateIn();
        return;
      }
      try {
        const seen = await AsyncStorage.getItem(KEY_PREFIX + id);
        if (!seen && !cancelled) {
          setTimeout(() => { if (!cancelled) animateIn(); }, delay);
        }
      } catch { /* ignore */ }
    };
    check();
    return () => { cancelled = true; };
  }, [id, delay, forceShow]);

  const animateIn = () => {
    setVisible(true);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const handleDismiss = async () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: arrow === 'up' ? -6 : 6, duration: 200, useNativeDriver: true }),
    ]).start(() => setVisible(false));
    try { await AsyncStorage.setItem(KEY_PREFIX + id, '1'); } catch {}
  };

  if (!visible) return null;

  // Design: carte du thème avec bordure accent fine + icône accent.
  // S'intègre naturellement au fond au lieu de créer une bulle sombre qui contraste.
  const bg = colors.backgroundCard;
  const borderColor = colors.accent + '40'; // 25% opacity
  const titleColor = colors.text;
  const textColor = colors.textMuted;
  const accentBg = colors.accent + '18'; // 9% opacity

  return (
    <Animated.View
      style={[
        styles.tooltip,
        {
          backgroundColor: bg,
          borderColor,
          opacity,
          transform: [{ translateY }],
          shadowColor: isDark ? '#000' : colors.accent,
        },
      ]}
      pointerEvents="auto"
    >
      {arrow === 'up' && (
        <View style={[styles.arrowUpWrap]}>
          <View style={[styles.arrowUpBorder, { borderBottomColor: borderColor }]} />
          <View style={[styles.arrowUp, { borderBottomColor: bg }]} />
        </View>
      )}
      <View style={styles.content}>
        <View style={[styles.iconBadge, { backgroundColor: accentBg }]}>
          <Sparkles size={14} color={colors.accent} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.text, { color: textColor }]}>{text}</Text>
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
        >
          <X size={12} color={colors.textMuted} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
      {arrow === 'down' && (
        <View style={[styles.arrowDownWrap]}>
          <View style={[styles.arrowDownBorder, { borderTopColor: borderColor }]} />
          <View style={[styles.arrowDown, { borderTopColor: bg }]} />
        </View>
      )}
    </Animated.View>
  );
};

export const OnboardingTooltip = React.memo(OnboardingTooltipInner);

/** Helper pour réinitialiser tous les tooltips (debug). */
export const resetAllTooltips = async () => {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter(k => k.startsWith(KEY_PREFIX)));
};

const styles = StyleSheet.create({
  tooltip: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  iconBadge: {
    width: 28, height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  text: {
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 15,
  },
  closeBtn: {
    width: 22, height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowUpWrap: {
    position: 'absolute',
    top: -7,
    left: 26,
    width: 14,
    height: 7,
  },
  arrowUpBorder: {
    position: 'absolute',
    top: -1,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowUp: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowDownWrap: {
    position: 'absolute',
    bottom: -7,
    left: 26,
    width: 14,
    height: 7,
  },
  arrowDownBorder: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowDown: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
