// ============================================
// YOROI - SamuraiLoader
// Animation Lottie japonaise (pagode, soleil, sakura)
// ============================================

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import LottieView from 'lottie-react-native';

// ============================================
// SamuraiCircleLoader — cercle blanc centré
// sur fond sombre, barre de progression 7s
// ============================================
export function SamuraiCircleLoader({ duration = 7000, bgColor = '#0a0a0a' }: { duration?: number; bgColor?: string }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, []);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[circleStyles.container, { backgroundColor: bgColor }]}>
      {/* Cercle blanc avec l'animation à l'intérieur */}
      <View style={circleStyles.circle}>
        <LottieView
          source={require('@/assets/animations/samurai.json')}
          autoPlay
          loop
          style={circleStyles.lottie}
        />
      </View>

      {/* Barre de progression */}
      <View style={circleStyles.barWrap}>
        <View style={circleStyles.barRail} />
        <Animated.View style={[circleStyles.barFill, { width: barWidth }]}>
          <View style={circleStyles.barTip} />
          <View style={circleStyles.barGlow} />
        </Animated.View>
        <View style={circleStyles.barGuard} />
      </View>

      <Text style={circleStyles.label}>YOROI</Text>
    </View>
  );
}

const CIRCLE_SIZE = 200;
const circleStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#D2042D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  lottie: {
    width: CIRCLE_SIZE - 10,
    height: CIRCLE_SIZE - 10,
  },
  barWrap: {
    marginTop: 28,
    width: CIRCLE_SIZE,
    height: 8,
    position: 'relative',
    justifyContent: 'center',
  },
  barRail: {
    position: 'absolute',
    left: 12,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 1,
  },
  barFill: {
    position: 'absolute',
    left: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#D2042D',
    overflow: 'visible',
  },
  barTip: {
    position: 'absolute',
    right: -5,
    top: -4,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#D2042D',
  },
  barGlow: {
    position: 'absolute',
    right: 0,
    top: -1,
    width: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F0C040',
    opacity: 0.8,
  },
  barGuard: {
    position: 'absolute',
    left: 8,
    width: 4,
    height: 10,
    borderRadius: 1,
    top: -1,
    backgroundColor: '#F0C040',
  },
  label: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.3)',
  },
});

interface Props {
  message?: string;
  size?: number;
  isDark?: boolean;
}

function SamuraiLoaderCore({ message = 'Chargement...', size = 200, isDark = true }: Props) {
  const prog = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(prog, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(prog, { toValue: 0, duration: 400, useNativeDriver: false }),
        Animated.delay(200),
      ])
    ).start();
  }, []);

  const barWidth = prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const accent = '#D2042D';
  const gold = '#F0C040';
  const bg = isDark ? '#0f0808' : '#fff8f6';
  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)';

  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <LottieView
        source={require('@/assets/animations/samurai.json')}
        autoPlay
        loop
        style={{ width: size, height: size }}
      />

      {message ? (
        <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      ) : null}

      {/* Barre de progression façon lame */}
      <View style={styles.barWrap}>
        <View style={styles.barRail} />
        <Animated.View style={[styles.barFill, { width: barWidth, backgroundColor: accent }]}>
          <View style={[styles.barTip, { borderLeftColor: accent }]} />
          <View style={[styles.barGlow, { backgroundColor: gold }]} />
        </Animated.View>
        <View style={[styles.barGuard, { backgroundColor: gold }]} />
      </View>
    </View>
  );
}

// Version avec ThemeContext (pour les écrans internes à l'app)
function SamuraiLoaderWithTheme({ message, size }: Omit<Props, 'isDark'>) {
  let isDark = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useTheme } = require('@/lib/ThemeContext');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    isDark = useTheme().isDark;
  } catch {
    // Hors ThemeProvider (ex: _layout.tsx avant montage) → dark par défaut
  }
  return <SamuraiLoaderCore message={message} size={size} isDark={isDark} />;
}

export function SamuraiLoader(props: Omit<Props, 'isDark'>) {
  return <SamuraiLoaderWithTheme {...props} />;
}

// Version standalone sans ThemeContext (pour _layout, splash screen)
export function SamuraiSplash(props: Props) {
  return <SamuraiLoaderCore {...props} />;
}

export default SamuraiLoader;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  message: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  barWrap: {
    marginTop: 14,
    width: 160,
    height: 8,
    position: 'relative',
    justifyContent: 'center',
  },
  barRail: {
    position: 'absolute',
    left: 12,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(120,120,120,0.2)',
    borderRadius: 1,
  },
  barFill: {
    position: 'absolute',
    left: 12,
    height: 2,
    borderRadius: 1,
    overflow: 'visible',
  },
  barTip: {
    position: 'absolute',
    right: -5,
    top: -4,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  barGlow: {
    position: 'absolute',
    right: 0,
    top: -1,
    width: 6,
    height: 4,
    borderRadius: 2,
    opacity: 0.8,
  },
  barGuard: {
    position: 'absolute',
    left: 8,
    width: 4,
    height: 10,
    borderRadius: 1,
    top: -1,
  },
});
