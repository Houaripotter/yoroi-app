// ============================================
// YOROI WRAPPED · Story annuelle style Spotify
// ============================================

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, StatusBar, Easing, Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronRight, Share2, Trophy, Flame, Target, Calendar, Zap, Crown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { heavyHaptic, lightHaptic, successHaptic } from '@/lib/haptics';
import { generateWrappedStats, type WrappedStats } from '@/lib/yoroiWrappedService';
import logger from '@/lib/security/logger';

const { width: W, height: H } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5s par slide

interface Slide {
  bg: readonly [string, string];
  icon: React.ComponentType<any>;
  label: string;
  bigText: string | number;
  subtitle?: string;
  footer?: string;
}

export default function WrappedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    heavyHaptic().catch(() => {});
    generateWrappedStats().then(setStats).catch(e => logger.warn('[Wrapped]', e));
  }, []);

  const slides: Slide[] = stats ? [
    {
      bg: ['#1a1a2e', '#16213e'] as const,
      icon: Calendar,
      label: `YOROI ${stats.year}`,
      bigText: 'Ton annee',
      subtitle: 'Prets pour le voyage ?',
      footer: 'Tap pour continuer →',
    },
    {
      bg: ['#D4AF37', '#8B6914'] as const,
      icon: Zap,
      label: 'SESSIONS',
      bigText: stats.totalSessions,
      subtitle: `${stats.uniqueDays} jours actifs sur 365`,
      footer: `${(stats.avgPerWeek).toFixed(1)} par semaine en moyenne`,
    },
    {
      bg: ['#EF4444', '#991B1B'] as const,
      icon: Flame,
      label: 'STREAK MAX',
      bigText: `${stats.longestStreak}`,
      subtitle: `jours d'affilee`,
      footer: 'La discipline, c\'est toi',
    },
    {
      bg: ['#3B82F6', '#1E3A8A'] as const,
      icon: Target,
      label: 'TON SPORT',
      bigText: stats.topSport.toUpperCase() || '—',
      subtitle: `${stats.topSportCount} sessions`,
      footer: stats.topSport ? `Ton arme de predilection en ${stats.year}` : '',
    },
    {
      bg: ['#8B5CF6', '#4C1D95'] as const,
      icon: Trophy,
      label: 'TEMPS TOTAL',
      bigText: formatMinutes(stats.totalMinutes),
      subtitle: `investis sur le tatami`,
      footer: 'Chaque minute t\'a rapproche de ta meilleure version',
    },
    {
      bg: ['#10B981', '#064E3B'] as const,
      icon: Crown,
      label: 'MEILLEUR MOIS',
      bigText: stats.bestMonth.name,
      subtitle: `${stats.bestMonth.sessions} sessions`,
      footer: `Ton pic de forme`,
    },
    {
      bg: ['#F59E0B', '#78350F'] as const,
      icon: Trophy,
      label: 'BADGES',
      bigText: stats.badgesUnlocked,
      subtitle: 'debloques',
      footer: 'Ta galerie de trophees grandit',
    },
    {
      bg: ['#D4AF37', '#1a1a2e'] as const,
      icon: Crown,
      label: 'BILAN',
      bigText: `${stats.year}`,
      subtitle: 'Une annee de guerrier',
      footer: 'Rendez-vous dans 12 mois',
    },
  ] : [];

  useEffect(() => {
    if (!stats || slides.length === 0) return;
    progressAnim.setValue(0);
    contentAnim.setValue(0);

    Animated.parallel([
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: STORY_DURATION,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished && slideIdx < slides.length - 1) {
        setSlideIdx(i => i + 1);
        lightHaptic().catch(() => {});
      }
    });
  }, [slideIdx, stats]);

  const handleNext = () => {
    lightHaptic().catch(() => {});
    if (slideIdx < slides.length - 1) {
      setSlideIdx(i => i + 1);
    } else {
      handleClose();
    }
  };
  const handlePrev = () => {
    lightHaptic().catch(() => {});
    if (slideIdx > 0) setSlideIdx(i => i - 1);
  };
  const handleClose = () => {
    lightHaptic().catch(() => {});
    router.back();
  };
  const handleShare = async () => {
    if (!stats) return;
    successHaptic().catch(() => {});
    await Share.share({
      message: `Mon Yoroi Wrapped ${stats.year} : ${stats.totalSessions} sessions, ${stats.longestStreak} jours d'affilee, ${formatMinutes(stats.totalMinutes)} sur le tatami. #Yoroi #${stats.topSport || 'Sport'}`,
    }).catch(() => {});
  };

  if (!stats) {
    return (
      <View style={[styles.wrap, { backgroundColor: '#1a1a2e', paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: H / 2 - 20 }}>
          Preparation de ton bilan...
        </Text>
      </View>
    );
  }

  if (!stats.ready) {
    return (
      <View style={[styles.wrap, { backgroundColor: '#1a1a2e', paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <TouchableOpacity style={styles.close} onPress={handleClose}>
          <X size={28} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Calendar size={64} color="#D4AF37" />
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 24, textAlign: 'center' }}>
            Ton bilan {stats.year} arrive...
          </Text>
          <Text style={{ color: '#aaa', fontSize: 15, marginTop: 16, textAlign: 'center', lineHeight: 22 }}>
            Il te faut au moins 5 sessions enregistrees pour debloquer ton Yoroi Wrapped. Continue d'alimenter ton journal et reviens bientot.
          </Text>
        </View>
      </View>
    );
  }

  const slide = slides[slideIdx];
  const Icon = slide.icon;
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const contentScale = contentAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const contentOpacity = contentAnim;

  return (
    <View style={styles.wrap}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={slide.bg} style={StyleSheet.absoluteFill} />

      {/* Progress bars */}
      <View style={[styles.progressRow, { top: insets.top + 12 }]}>
        {slides.map((_, i) => (
          <View key={i} style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: i < slideIdx ? '100%' : i === slideIdx ? progressWidth : '0%',
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Close / Share */}
      <TouchableOpacity style={[styles.close, { top: insets.top + 30 }]} onPress={handleClose}>
        <X size={26} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.shareBtn, { top: insets.top + 30 }]} onPress={handleShare}>
        <Share2 size={22} color="#fff" />
      </TouchableOpacity>

      {/* Tap zones */}
      <TouchableOpacity style={[styles.tapZone, { left: 0 }]} onPress={handlePrev} activeOpacity={1} />
      <TouchableOpacity style={[styles.tapZone, { right: 0 }]} onPress={handleNext} activeOpacity={1} />

      {/* Contenu slide */}
      <Animated.View
        style={[
          styles.content,
          { opacity: contentOpacity, transform: [{ scale: contentScale }] },
        ]}
      >
        <View style={styles.iconCircle}>
          <Icon size={42} color="#fff" strokeWidth={2.4} />
        </View>
        <Text style={styles.label}>{slide.label}</Text>
        <Text style={styles.big} numberOfLines={2} adjustsFontSizeToFit>
          {slide.bigText}
        </Text>
        {slide.subtitle && <Text style={styles.sub}>{slide.subtitle}</Text>}
        {slide.footer && <Text style={styles.footer}>{slide.footer}</Text>}
      </Animated.View>

      {/* CTA partage sur dernier slide */}
      {slideIdx === slides.length - 1 && (
        <TouchableOpacity
          style={[styles.finalCTA, { bottom: insets.bottom + 40 }]}
          onPress={handleShare}
          activeOpacity={0.85}
        >
          <Share2 size={18} color="#1a1a2e" />
          <Text style={styles.finalCTAText}>PARTAGER MON BILAN</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h < 24) return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return `${d}j ${rh}h`;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  progressRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  close: {
    position: 'absolute',
    left: 16,
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  shareBtn: {
    position: 'absolute',
    right: 16,
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  tapZone: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: W / 2,
    zIndex: 5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 90, height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  label: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 16,
  },
  big: {
    color: '#fff',
    fontSize: 88,
    fontWeight: '900',
    letterSpacing: -3,
    textAlign: 'center',
    lineHeight: 92,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 12,
  },
  sub: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  footer: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 24,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  finalCTA: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 30,
    zIndex: 10,
  },
  finalCTAText: {
    color: '#1a1a2e',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
