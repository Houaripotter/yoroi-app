// ============================================
// ONBOARDING TOUR — 4 écrans swipeables pour les nouveaux utilisateurs.
// Présente les features clés : stats, sparring, sync, partage.
// Affiché UNE seule fois (persisté via AsyncStorage).
// Design : aligné sur le thème de l'app (dark marine) avec accent unique.
// ============================================

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BarChart2, Swords, Share2, Wifi, ChevronRight, SkipForward,
} from 'lucide-react-native';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const ONBOARDING_DONE_KEY = '@yoroi_onboarding_tour_done';

const STEPS = [
  {
    icon: BarChart2,
    title: 'Stats qui te motivent',
    description: 'Suis ton poids, tes séances et ton sommeil avec des visualisations claires. Heatmap, streak, insights automatiques — tout pour voir ta progression d\'un coup d\'œil.',
  },
  {
    icon: Swords,
    title: 'Tracker sparring pro',
    description: 'Enregistre tes séances combat round par round. Analyse tes partenaires, tes techniques préférées, tes forces et faiblesses. Indispensable pour BJJ, MMA, boxe.',
  },
  {
    icon: Wifi,
    title: '100% local, zéro cloud',
    description: 'Tes données ne quittent jamais ton téléphone. Synchronisation directe entre iPhone et iPad en WiFi/Bluetooth, sans serveur. Tu restes maître de tes données.',
  },
  {
    icon: Share2,
    title: 'Partage tes progrès',
    description: 'Génère des cartes Instagram-ready pour partager tes stats avec ta communauté. Confetti, streak, records — montre ton sérieux.',
  },
];

export default function OnboardingTourScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [step, setStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = async () => {
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    if (step < STEPS.length - 1) {
      const next = step + 1;
      setStep(next);
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    if (Platform.OS !== 'web') notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    router.replace('/(tabs)' as any);
  };

  const handleSkip = async () => {
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    await finishOnboarding();
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e: any) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        if (idx !== step) setStep(idx);
      },
    },
  );

  const isLast = step === STEPS.length - 1;

  // Palette : fond du thème + accent unique (cohérent avec l'app).
  const bgScreen = colors.background;
  const cardBg = colors.backgroundCard;
  const accent = colors.accent;
  const textPrimary = colors.text;
  const textSecondary = colors.textMuted;
  const subtleBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={[styles.container, { backgroundColor: bgScreen }]}>
      {/* Skip en haut à droite */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleSkip}
          style={[styles.skipBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.skipText, { color: textSecondary }]}>Passer</Text>
          <SkipForward size={13} color={textSecondary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Contenu swipeable */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {STEPS.map((s, i) => {
          const StepIcon = s.icon;
          return (
            <View key={i} style={[styles.slide, { width: SCREEN_WIDTH }]}>
              {/* Icon dans cercle accent */}
              <View
                style={[
                  styles.iconOuter,
                  {
                    backgroundColor: accent + '12',
                    borderColor: accent + '30',
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconInner,
                    {
                      backgroundColor: cardBg,
                      borderColor: subtleBorder,
                    },
                  ]}
                >
                  <StepIcon size={44} color={accent} strokeWidth={1.8} />
                </View>
              </View>

              {/* Numéro étape (discret) */}
              <Text style={[styles.stepNum, { color: accent }]}>
                {String(i + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
              </Text>

              <Text style={[styles.title, { color: textPrimary }]}>{s.title}</Text>
              <Text style={[styles.description, { color: textSecondary }]}>{s.description}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Indicateurs + CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === step ? 22 : 7,
                  height: 7,
                  backgroundColor: i === step ? accent : subtleBorder,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          style={[
            styles.ctaBtn,
            {
              backgroundColor: accent,
              shadowColor: accent,
            },
          ]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Commencer à utiliser Yoroi' : 'Étape suivante'}
        >
          <Text style={styles.ctaText}>{isLast ? 'Commencer' : 'Suivant'}</Text>
          <ChevronRight size={20} color="#FFFFFF" strokeWidth={3} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  skipText: {
    fontSize: 13, fontWeight: '700', letterSpacing: 0.2,
  },

  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconOuter: {
    width: 140, height: 140,
    borderRadius: 70,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  iconInner: {
    width: 104, height: 104,
    borderRadius: 52,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28, fontWeight: '900',
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 14,
  },
  description: {
    fontSize: 15, fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 340,
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 22,
  },
  dot: {
    borderRadius: 4,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16, fontWeight: '900',
    letterSpacing: 0.2,
  },
});
