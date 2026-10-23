import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable, Modal, useWindowDimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Hanko } from '@/components/yoroi/v2/dojo/Hanko';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import type { GlyphKind } from '@/components/yoroi/v2/ornements/Glyph';
import { traduire } from '@/lib/i18n/tr';

// ============================================
// CELEBRATION (refonte v2) : le tampon hanko s'imprime, l'XP tombe en plaques.
// API inchangee.
// ============================================

export type CelebrationType =
  | 'goal_reached' // Objectif de poids atteint
  | 'rank_up' // Montee de rang
  | 'challenge_complete' // Defi hebdomadaire complete
  | 'streak_record' // Nouveau record de serie
  | 'milestone' // Etape (100e pesee, etc.)
  | 'new_pr' // Nouveau record personnel
  | 'badge_unlocked'; // Badge debloque

interface CelebrationProps {
  visible: boolean;
  type: CelebrationType;
  title: string;
  subtitle?: string;
  xpGained?: number;
  icon?: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

// Pictogramme du tampon et ton par type
const CELEBRATION_CONFIG: Record<CelebrationType, { glyph: GlyphKind; tone: 'red' | 'gold' | 'indigo' | 'moss' | 'record'; label: string }> = {
  goal_reached: { glyph: 'laurier', tone: 'gold', label: traduire('Objectif atteint') },
  rank_up: { glyph: 'laurier', tone: 'gold', label: traduire('Nouveau rang') },
  challenge_complete: { glyph: 'etoile', tone: 'red', label: traduire('Défi relevé') },
  streak_record: { glyph: 'etoile', tone: 'red', label: traduire('Nouvelle série record') },
  milestone: { glyph: 'eventail', tone: 'indigo', label: traduire('Étape franchie') },
  new_pr: { glyph: 'laurier', tone: 'record', label: traduire('Nouveau record') },
  badge_unlocked: { glyph: 'sakura', tone: 'moss', label: traduire('Sceau gagné') },
};


export const Celebration: React.FC<CelebrationProps> = ({
  visible,
  type,
  title,
  subtitle,
  xpGained,
  icon,
  onClose,
  autoClose = true,
  autoCloseDelay = 4000,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const config = CELEBRATION_CONFIG[type] ?? CELEBRATION_CONFIG.milestone;
  const toneColor = config.tone === 'gold' ? c.goldDeep : config.tone === 'indigo' ? c.indigo : config.tone === 'moss' ? c.successText : config.tone === 'record' ? c.record : c.accent;
  void icon; // l'ancienne icone (kanji ou emoji) n'est plus affichee
  const confettiRef = useRef<any>(null);
  const closingRef = useRef(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const stamp = useRef(new Animated.Value(0)).current;
  const xp = useRef(new Animated.Value(0)).current;

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.9, duration: 260, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      onClose();
    });
  };

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    overlayOpacity.setValue(0);
    cardScale.setValue(0.85);
    cardOpacity.setValue(0);
    stamp.setValue(0);
    xp.setValue(0);

    try {
      void Promise.resolve(notificationAsync(NotificationFeedbackType.Success)).catch(() => undefined);
    } catch {
      // sans importance
    }

    const confettiTimer = setTimeout(() => confettiRef.current?.start(), 380);

    Animated.sequence([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      // Le tampon tombe et s'imprime
      Animated.timing(stamp, { toValue: 1, duration: 360, easing: Easing.out(Easing.back(2.2)), useNativeDriver: true }),
      ...(xpGained ? [Animated.spring(xp, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true })] : []),
    ]).start();

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (autoClose) {
      timer = setTimeout(() => handleClose(), autoCloseDelay);
    }
    return () => {
      clearTimeout(confettiTimer);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  const stampScale = stamp.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] });
  const stampOpacity = stamp.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] });
  const xpY = xp.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityRole="button" accessibilityLabel={traduire("Fermer")} />
        </Animated.View>

        <ConfettiCannon
          ref={confettiRef}
          count={90}
          origin={{ x: screenWidth / 2, y: -20 }}
          fadeOut
          colors={[c.accent, c.gold, c.goldLight, c.indigo, '#FFFFFF']}
          explosionSpeed={350}
          fallSpeed={3000}
          autoStart={false}
        />

        <Animated.View
          style={[
            styles.card,
            {
              width: Math.min(screenWidth - 40, 360),
              backgroundColor: c.background,
              borderColor: '#FFFFFF',
              shadowColor: c.shadow,
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          <View pointerEvents="none" style={styles.watermark}>
            <Glyph kind="sakura" size={200} color={c.fillSoft} />
          </View>

          <Ink size={14} weight="extraBold" color={toneColor} style={styles.center}>
            {traduire(config.label)}
          </Ink>

          <Animated.View style={[styles.stamp, { opacity: stampOpacity, transform: [{ scale: stampScale }] }]}>
            <View style={[styles.stampBg, { backgroundColor: c.surface, shadowColor: toneColor }]}>
              <Hanko glyph={config.glyph} color={toneColor} size={104} rotate={-7} />
            </View>
          </Animated.View>

          <Ink size={28} weight="black" tight style={styles.center}>
            {title}
          </Ink>

          {subtitle ? (
            <Ink size={15} weight="medium" color={c.textSecondary} style={[styles.center, styles.subtitle]}>
              {subtitle}
            </Ink>
          ) : null}

          {xpGained && xpGained > 0 ? (
            <Animated.View style={[styles.xp, { backgroundColor: c.ink, opacity: xp, transform: [{ translateY: xpY }, { scale: xp.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
              <Svg width={16} height={20} viewBox="0 0 52 66">
                <Path d="M5 12 Q5 4 13 4 H39 Q47 4 47 12 V62 H5 Z" fill={c.goldLight} />
                <Rect x={0} y={30} width={52} height={5} fill={c.accent} />
                <Rect x={0} y={46} width={52} height={5} fill={c.accent} />
                <Circle cx={16} cy={20} r={2.4} fill={c.ink} />
                <Circle cx={36} cy={20} r={2.4} fill={c.ink} />
              </Svg>
              <Ink size={22} weight="black" tight color={c.goldLight}>
                {`+${xpGained} XP`}
              </Ink>
            </Animated.View>
          ) : null}

          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={traduire("Continuer")}
            style={({ pressed }) => [styles.continueButton, { backgroundColor: pressed ? c.accentPressed : c.accent }]}
          >
            <Ink size={16} weight="extraBold" color={c.onAccent}>
              {traduire("Continuer")}</Ink>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(29,32,41,0.55)',
  },
  card: {
    borderRadius: 32,
    borderWidth: 1,
    paddingTop: 26,
    paddingBottom: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 16,
  },
  watermark: {
    position: 'absolute',
    right: -40,
    top: -30,
  },
  center: {
    textAlign: 'center',
  },
  stamp: {
    marginVertical: 18,
  },
  stampBg: {
    width: 132,
    height: 132,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
  subtitle: {
    marginTop: 8,
    lineHeight: 21,
  },
  xp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
  },
  continueButton: {
    alignSelf: 'stretch',
    marginTop: 22,
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Celebration;
