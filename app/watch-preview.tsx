// ============================================
// YOROI - PREVIEW APPLE WATCH
// ============================================
// Reproduit visuellement l'app watchOS dans l'app iPhone
// pour previsualiser le design sans Xcode
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Watch,
  Scale,
  Droplets,
  Moon,
  Timer,
  Footprints,
  BookOpen,
  Target,
  ChevronLeft,
  ChevronRight,
  Bed,
  Sun,
  Plus,
  Shield,
  Flame,
  AlertTriangle,
  CheckCircle,
  Star,
  Heart,
  Activity,
  Wind,
  Settings,
  Wifi,
  RefreshCw,
  Info,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import { getLatestWeight, getProfile, calculateStreak } from '@/lib/database';
import { getSleepStats } from '@/lib/sleepService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUnifiedPoints } from '@/lib/gamification';
import { getCurrentRank } from '@/lib/ranks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Taille du cadran Watch (ratio Apple Watch Ultra)
const WATCH_W = Math.min(SCREEN_WIDTH - 64, 220);
const WATCH_H = WATCH_W * 1.18;
const WATCH_RADIUS = 46;

// Couleurs watchOS
const WATCH_BG = '#000000';
const GOLD = '#D4AF37';
const CYAN = '#06B6D4';
const GREEN = '#10B981';
const NIGHT_BG = '#0F1729';
const NIGHT_MID = '#2563EB';
const NIGHT_LIGHT = '#60A5FA';
const MOON_COLOR = '#FBC023';

type WatchPage = 'dashboard' | 'weight' | 'hydration' | 'sleep' | 'settings';

export default function WatchPreviewScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [currentPage, setCurrentPage] = useState<WatchPage>('dashboard');
  const pages: WatchPage[] = ['dashboard', 'weight', 'hydration', 'sleep', 'settings'];
  const pageIndex = pages.indexOf(currentPage);

  // Donnees reelles
  const [weight, setWeight] = useState(0);
  const [targetWeight, setTargetWeight] = useState(0);
  const [hydration, setHydration] = useState(0);
  const [hydrationGoal, setHydrationGoal] = useState(2500);
  const [sleepH, setSleepH] = useState(0);
  const [sleepM, setSleepM] = useState(0);
  const [sleepQuality, setSleepQuality] = useState(0);
  const [userName, setUserName] = useState('Champion');
  const [level, setLevel] = useState(1);
  const [rankName, setRankName] = useState('');
  const [streak, setStreak] = useState(0);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadData();
    // Pulse animation pour l'indicateur de connexion
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadData = async () => {
    try {
      const [profile, latestWeight, streakVal, sleepStats] = await Promise.all([
        getProfile(),
        getLatestWeight(),
        calculateStreak(),
        getSleepStats(),
      ]);

      if (profile?.name) setUserName(profile.name);
      if (profile?.target_weight) setTargetWeight(profile.target_weight);
      if (latestWeight?.weight) setWeight(latestWeight.weight);
      setStreak(streakVal);

      const totalPoints = await getUnifiedPoints();
      const rank = getCurrentRank(totalPoints);
      setLevel(totalPoints);
      if (rank) setRankName(rank.name);

      if (sleepStats) {
        const totalMin = sleepStats.lastNightDuration || 0;
        setSleepH(Math.floor(totalMin / 60));
        setSleepM(totalMin % 60);
        setSleepQuality(sleepStats.lastNightQuality || 0);
      }

      // Hydratation
      const today = new Date().toISOString().split('T')[0];
      const savedH = await AsyncStorage.getItem(`@yoroi_hydration_${today}`);
      if (savedH) setHydration(parseInt(savedH, 10));
      const savedGoal = await AsyncStorage.getItem('@yoroi_hydration_goal');
      if (savedGoal) setHydrationGoal(parseInt(savedGoal, 10));
    } catch {}
  };

  const goPage = (dir: -1 | 1) => {
    const next = pageIndex + dir;
    if (next >= 0 && next < pages.length) {
      setCurrentPage(pages[next]);
    }
  };

  // ============================================
  // RENDU DES PAGES WATCH
  // ============================================

  const renderDashboard = () => (
    <View style={watchStyles.page}>
      {/* Profile header with avatar circle */}
      <View style={watchStyles.profileRow}>
        <View style={watchStyles.avatarCircle}>
          <Text style={watchStyles.avatarInitials}>
            {userName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={watchStyles.profileName}>{userName || 'Yoroi'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Text style={[watchStyles.profileSub, { color: GOLD }]}>Niv.{level}</Text>
            {rankName ? <Text style={watchStyles.profileSub}>{rankName}</Text> : null}
          </View>
        </View>
        <Animated.View style={[watchStyles.syncDot, { backgroundColor: GREEN, opacity: pulseAnim }]} />
      </View>

      {/* Quick Actions Row - 3 circles */}
      <View style={watchStyles.quickActionsRow}>
        {/* Timer circle */}
        <View style={watchStyles.quickActionCol}>
          <View style={[watchStyles.quickActionCircle, { backgroundColor: `${GOLD}20` }]}>
            <Timer size={16} color={GOLD} />
          </View>
          <Text style={watchStyles.quickActionLabel}>Timer</Text>
        </View>

        {/* Steps circle */}
        <View style={watchStyles.quickActionCol}>
          <View style={[watchStyles.quickActionCircle, { backgroundColor: `${GREEN}20` }]}>
            <Footprints size={16} color={GREEN} />
          </View>
          <Text style={watchStyles.quickActionLabel}>--</Text>
        </View>

        {/* Carnet circle */}
        <View style={watchStyles.quickActionCol}>
          <View style={[watchStyles.quickActionCircle, { backgroundColor: `${CYAN}20` }]}>
            <BookOpen size={16} color={CYAN} />
          </View>
          <Text style={watchStyles.quickActionLabel}>Carnet</Text>
        </View>
      </View>

      {/* Health section label */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 }}>
        <Heart size={8} color="#EC4899" fill="#EC4899" />
        <Text style={{ fontSize: 7, fontWeight: '800', color: '#8E8E93', letterSpacing: 1 }}>SANTE</Text>
      </View>

      {/* Health grid 2x2 */}
      <View style={watchStyles.healthGrid}>
        <View style={watchStyles.healthRow}>
          <View style={watchStyles.healthMiniCard}>
            <View style={[watchStyles.healthMiniIcon, { backgroundColor: '#EC489920' }]}>
              <Heart size={10} color="#EC4899" fill="#EC4899" />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                <Text style={watchStyles.healthMiniValue}>--</Text>
                <Text style={watchStyles.healthMiniUnit}>BPM</Text>
              </View>
              <Text style={watchStyles.healthMiniLabel}>FC</Text>
            </View>
          </View>
          <View style={watchStyles.healthMiniCard}>
            <View style={[watchStyles.healthMiniIcon, { backgroundColor: `${CYAN}20` }]}>
              <Droplets size={10} color={CYAN} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                <Text style={watchStyles.healthMiniValue}>--</Text>
                <Text style={watchStyles.healthMiniUnit}>%</Text>
              </View>
              <Text style={watchStyles.healthMiniLabel}>SpO2</Text>
            </View>
          </View>
        </View>
        <View style={watchStyles.healthRow}>
          <View style={watchStyles.healthMiniCard}>
            <View style={[watchStyles.healthMiniIcon, { backgroundColor: '#F9731620' }]}>
              <Flame size={10} color="#F97316" />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                <Text style={watchStyles.healthMiniValue}>--</Text>
                <Text style={watchStyles.healthMiniUnit}>kcal</Text>
              </View>
              <Text style={watchStyles.healthMiniLabel}>Actives</Text>
            </View>
          </View>
          <View style={watchStyles.healthMiniCard}>
            <View style={[watchStyles.healthMiniIcon, { backgroundColor: '#3B82F620' }]}>
              <Footprints size={10} color="#3B82F6" />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                <Text style={watchStyles.healthMiniValue}>--</Text>
                <Text style={watchStyles.healthMiniUnit}>km</Text>
              </View>
              <Text style={watchStyles.healthMiniLabel}>Distance</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Streak banner */}
      {streak > 0 && (
        <View style={watchStyles.streakBanner}>
          <Flame size={12} color="#F97316" />
          <Text style={watchStyles.streakNumber}>{streak}</Text>
          <Text style={watchStyles.streakLabel}>jours</Text>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <View key={i} style={{
                width: 4, height: 4, borderRadius: 2,
                backgroundColor: i < Math.min(streak, 7) ? '#F97316' : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderWeight = () => {
    const progress = targetWeight > 0 && weight > 0
      ? Math.min(1, Math.max(0, 1 - Math.abs(weight - targetWeight) / 10))
      : 0;
    const diff = targetWeight > 0 ? weight - targetWeight : 0;

    return (
      <View style={watchStyles.page}>
        {/* Header */}
        <View style={watchStyles.sectionHeader}>
          <Scale size={10} color={GOLD} />
          <Text style={watchStyles.sectionTitle}>Poids</Text>
        </View>

        {/* Arc placeholder + poids */}
        <View style={watchStyles.arcContainer}>
          {/* Progress arc simplifie */}
          <View style={[watchStyles.arcBg, { borderColor: `${GOLD}20` }]}>
            <View style={[watchStyles.arcFill, { borderColor: GOLD, borderTopColor: 'transparent', borderRightColor: 'transparent', transform: [{ rotate: `${progress * 180}deg` }] }]} />
          </View>
          <View style={watchStyles.arcCenter}>
            <Text style={watchStyles.weightValue}>
              {weight > 0 ? weight.toFixed(1) : '--'}
            </Text>
            <Text style={watchStyles.weightUnit}>kg</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={watchStyles.statsRow}>
          <View style={watchStyles.statCol}>
            <Text style={[watchStyles.statLabel, { color: GREEN }]}>OBJECTIF</Text>
            <Text style={[watchStyles.statValue, { color: '#FFF' }]}>
              {targetWeight > 0 ? targetWeight.toFixed(1) : '--'}
            </Text>
          </View>
          <View style={[watchStyles.statDivider, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
          <View style={watchStyles.statCol}>
            <Text style={[watchStyles.statLabel, { color: diff > 0 ? '#EF4444' : GREEN }]}>RESTE</Text>
            <Text style={[watchStyles.statValue, { color: diff > 0 ? '#EF4444' : GREEN }]}>
              {targetWeight > 0 ? Math.abs(diff).toFixed(1) : '--'}
            </Text>
          </View>
        </View>

        {/* Log button */}
        <View style={[watchStyles.logBtn, { backgroundColor: `${GOLD}15`, borderColor: `${GOLD}40` }]}>
          <Plus size={10} color={GOLD} />
          <Text style={[watchStyles.logBtnText, { color: GOLD }]}>Logger poids</Text>
        </View>
      </View>
    );
  };

  const renderHydration = () => {
    const fillPct = hydrationGoal > 0 ? Math.min(1, hydration / hydrationGoal) : 0;
    const goalReached = fillPct >= 1;
    const accent = goalReached ? GREEN : CYAN;

    return (
      <View style={watchStyles.page}>
        {/* Header */}
        <View style={watchStyles.sectionHeader}>
          <Droplets size={10} color={accent} />
          <Text style={watchStyles.sectionTitle}>Hydratation</Text>
        </View>

        {/* Bottle visual */}
        <View style={[watchStyles.bottle, { borderColor: `${accent}40` }]}>
          <View style={[watchStyles.bottleFill, { backgroundColor: `${accent}30`, height: `${Math.min(100, fillPct * 100)}%` as any }]} />
          <View style={watchStyles.bottleContent}>
            <Text style={[watchStyles.bottleValue, { color: goalReached ? GREEN : '#FFF' }]}>
              {hydration}
            </Text>
            <Text style={watchStyles.bottleUnit}>ml</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={watchStyles.progressRow}>
          <Text style={[watchStyles.progressText, { color: goalReached ? GREEN : '#FFF' }]}>
            {(hydration / 1000).toFixed(1)}L
          </Text>
          <Text style={watchStyles.progressSep}> / </Text>
          <Text style={watchStyles.progressGoal}>{(hydrationGoal / 1000).toFixed(1)}L</Text>
        </View>

        {/* Progress bar */}
        <View style={watchStyles.progressBar}>
          <View style={[watchStyles.progressBarFill, { backgroundColor: accent, width: `${Math.min(100, fillPct * 100)}%` as any }]} />
        </View>
        <Text style={[watchStyles.progressPct, { color: accent }]}>{Math.round(fillPct * 100)}%</Text>

        {/* Quick buttons */}
        <View style={watchStyles.quickBtns}>
          {[250, 500].map(amt => (
            <View key={amt} style={[watchStyles.quickBtn, { borderColor: `${accent}40` }]}>
              <Text style={[watchStyles.quickBtnText, { color: accent }]}>+{amt}ml</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderSleep = () => {
    const qualityPct = sleepQuality * 20; // 0-5 -> 0-100%

    return (
      <View style={watchStyles.page}>
        {/* Header */}
        <View style={watchStyles.sectionHeader}>
          <Moon size={10} color={NIGHT_MID} />
          <Text style={watchStyles.sectionTitle}>Sommeil</Text>
        </View>

        {/* Night scene */}
        <View style={[watchStyles.nightScene, { backgroundColor: NIGHT_BG }]}>
          <Text style={watchStyles.star1}>{'\u2726'}</Text>
          <Text style={watchStyles.star2}>{'\u2726'}</Text>
          <Text style={watchStyles.star3}>{'\u2726'}</Text>
          <View style={[watchStyles.moonShape, { backgroundColor: MOON_COLOR }]} />
          <Bed size={20} color={NIGHT_LIGHT} style={{ position: 'absolute', bottom: 10 }} />
          <Text style={watchStyles.zzz1}>z</Text>
          <Text style={watchStyles.zzz2}>Z</Text>
          <Text style={watchStyles.zzz3}>Z</Text>
        </View>

        {/* Duration */}
        <Text style={watchStyles.sleepDuration}>
          {sleepH > 0 || sleepM > 0
            ? `${sleepH}h${sleepM.toString().padStart(2, '0')}`
            : '--'
          }
        </Text>

        {/* Quality */}
        <View style={watchStyles.sleepMetric}>
          {sleepQuality > 0 ? (
            <CheckCircle size={12} color={qualityPct >= 80 ? GREEN : '#F59E0B'} />
          ) : (
            <AlertTriangle size={12} color="#EF4444" />
          )}
          <Text style={watchStyles.sleepMetricLabel}>Qualite</Text>
          <Text style={[watchStyles.sleepMetricValue, { color: qualityPct >= 80 ? GREEN : qualityPct >= 60 ? '#F59E0B' : '#EF4444' }]}>
            {qualityPct > 0 ? `${qualityPct}%` : '--'}
          </Text>
        </View>

        {/* Stars */}
        <View style={watchStyles.starsRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <Star
              key={i}
              size={14}
              color={i <= sleepQuality ? MOON_COLOR : 'rgba(255,255,255,0.15)'}
              fill={i <= sleepQuality ? MOON_COLOR : 'transparent'}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderSettings = () => (
    <View style={watchStyles.page}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
        <Settings size={12} color={GOLD} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Reglages</Text>
      </View>

      {/* Connexion */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 }}>
        <Wifi size={8} color={GREEN} />
        <Text style={{ fontSize: 7, fontWeight: '800', color: '#8E8E93', letterSpacing: 1 }}>CONNEXION</Text>
      </View>
      <View style={[watchStyles.settingsCard]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN }} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: GREEN }}>Connecte</Text>
        </View>
        <View style={[watchStyles.settingsBtn, { backgroundColor: GOLD }]}>
          <RefreshCw size={10} color="#000" />
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#000' }}>Synchroniser</Text>
        </View>
      </View>

      {/* Objectifs */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 }}>
        <Target size={8} color={GREEN} />
        <Text style={{ fontSize: 7, fontWeight: '800', color: '#8E8E93', letterSpacing: 1 }}>OBJECTIFS</Text>
      </View>
      <View style={[watchStyles.settingsCard]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Footprints size={10} color={GREEN} />
          <Text style={{ fontSize: 10, color: '#8E8E93', marginLeft: 6 }}>Pas / jour</Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>10 000</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <Droplets size={10} color={CYAN} />
          <Text style={{ fontSize: 10, color: '#8E8E93', marginLeft: 6 }}>Eau / jour</Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>2500ml</Text>
        </View>
      </View>

      {/* A propos */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 }}>
        <Info size={8} color="#8E8E93" />
        <Text style={{ fontSize: 7, fontWeight: '800', color: '#8E8E93', letterSpacing: 1 }}>A PROPOS</Text>
      </View>
      <View style={[watchStyles.settingsCard]}>
        {[['App', 'Yoroi Watch'], ['Version', '2.0.0'], ['Exercices', '160+']].map(([label, val]) => (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1 }}>
            <Text style={{ fontSize: 9, color: '#8E8E93' }}>{label}</Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFF' }}>{val}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard': return renderDashboard();
      case 'weight': return renderWeight();
      case 'hydration': return renderHydration();
      case 'sleep': return renderSleep();
      case 'settings': return renderSettings();
    }
  };

  const pageLabels: Record<WatchPage, string> = {
    dashboard: 'Dashboard',
    weight: 'Poids',
    hydration: 'Hydratation',
    sleep: 'Sommeil',
    settings: 'Reglages',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.backgroundCard }]}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Watch size={20} color={colors.accent} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Apple Watch</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Label page */}
        <Text style={[styles.pageLabel, { color: colors.textMuted }]}>
          {pageLabels[currentPage]}
        </Text>

        {/* Watch frame */}
        <View style={styles.watchFrame}>
          {/* Cadran */}
          <View style={styles.watchBody}>
            {/* Crown (Digital Crown) */}
            <View style={styles.crown} />
            <View style={styles.sideBtn} />

            {/* Ecran */}
            <View style={styles.watchScreen}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 8 }}
                showsVerticalScrollIndicator={false}
              >
                {renderCurrentPage()}
              </ScrollView>
            </View>
          </View>

          {/* Bracelet haut */}
          <View style={styles.bandTop} />
          {/* Bracelet bas */}
          <View style={styles.bandBottom} />
        </View>

        {/* Page dots */}
        <View style={styles.dotsRow}>
          {pages.map((p, i) => (
            <TouchableOpacity key={p} onPress={() => setCurrentPage(p)}>
              <View style={[styles.dot, i === pageIndex && { backgroundColor: colors.accent, width: 20 }]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Navigation arrows */}
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => goPage(-1)}
            disabled={pageIndex === 0}
            style={[styles.navBtn, { backgroundColor: colors.backgroundCard, opacity: pageIndex === 0 ? 0.3 : 1 }]}
          >
            <ChevronLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.navLabel, { color: colors.textMuted }]}>
            {pageIndex + 1} / {pages.length}
          </Text>

          <TouchableOpacity
            onPress={() => goPage(1)}
            disabled={pageIndex === pages.length - 1}
            style={[styles.navBtn, { backgroundColor: colors.backgroundCard, opacity: pageIndex === pages.length - 1 ? 0.3 : 1 }]}
          >
            <ChevronRight size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}20` }]}>
          <Watch size={16} color={colors.accent} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Preview de l'app Apple Watch. L'app reelle se lance via Xcode (ios/Yoroi.xcworkspace).
          </Text>
        </View>

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES ECRAN
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 8,
  },
  pageLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  watchFrame: {
    alignItems: 'center',
  },
  watchBody: {
    width: WATCH_W,
    height: WATCH_H,
    borderRadius: WATCH_RADIUS,
    backgroundColor: '#1C1C1E',
    borderWidth: 3,
    borderColor: '#3A3A3C',
    overflow: 'hidden',
    position: 'relative',
  },
  crown: {
    position: 'absolute',
    right: -8,
    top: WATCH_H * 0.3,
    width: 8,
    height: 28,
    backgroundColor: '#3A3A3C',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    zIndex: 10,
  },
  sideBtn: {
    position: 'absolute',
    right: -6,
    top: WATCH_H * 0.55,
    width: 6,
    height: 16,
    backgroundColor: '#3A3A3C',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    zIndex: 10,
  },
  watchScreen: {
    flex: 1,
    margin: 4,
    borderRadius: WATCH_RADIUS - 6,
    backgroundColor: WATCH_BG,
    overflow: 'hidden',
  },
  bandTop: {
    width: WATCH_W * 0.55,
    height: 40,
    backgroundColor: '#2C2C2E',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: -2,
    position: 'absolute',
    top: -38,
    alignSelf: 'center',
  },
  bandBottom: {
    width: WATCH_W * 0.55,
    height: 40,
    backgroundColor: '#2C2C2E',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    marginTop: -2,
    position: 'absolute',
    bottom: -38,
    alignSelf: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 52,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 20,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginHorizontal: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
});

// ============================================
// STYLES WATCH (simulent le rendu watchOS)
// ============================================

const watchStyles = StyleSheet.create({
  page: {
    padding: 10,
    gap: 8,
  },

  // Dashboard - Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  profileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileSub: {
    fontSize: 8,
    color: '#8E8E93',
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Quick Actions Row
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 4,
  },
  quickActionCol: {
    alignItems: 'center',
    gap: 3,
  },
  quickActionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: '#8E8E93',
  },

  // Health Grid
  healthGrid: {
    gap: 4,
  },
  healthRow: {
    flexDirection: 'row',
    gap: 4,
  },
  healthMiniCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  healthMiniIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthMiniValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  healthMiniUnit: {
    fontSize: 7,
    fontWeight: '500',
    color: '#8E8E93',
  },
  healthMiniLabel: {
    fontSize: 7,
    color: '#8E8E93',
  },

  // Streak Banner
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(249,115,22,0.1)',
    gap: 6,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  streakLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#8E8E93',
  },

  // Weight
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  arcContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    position: 'relative',
  },
  arcBg: {
    width: 120,
    height: 60,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    borderWidth: 6,
    borderBottomWidth: 0,
    position: 'absolute',
  },
  arcFill: {
    width: 120,
    height: 60,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    borderWidth: 6,
    borderBottomWidth: 0,
    position: 'absolute',
  },
  arcCenter: {
    alignItems: 'center',
    marginTop: 20,
  },
  weightValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  weightUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: -2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  logBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Hydration
  bottle: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 2,
    alignSelf: 'center',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  bottleFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottleContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottleValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  bottleUnit: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.7)',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressSep: {
    fontSize: 10,
    color: '#8E8E93',
  },
  progressGoal: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(6,182,212,0.1)',
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  progressPct: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickBtns: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Sleep
  nightScene: {
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  moonShape: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    top: 8,
    right: 20,
  },
  star1: { position: 'absolute', top: 6, left: 10, fontSize: 4, color: '#FDE88A' },
  star2: { position: 'absolute', top: 16, left: 30, fontSize: 3, color: '#FDE88A' },
  star3: { position: 'absolute', top: 5, right: 50, fontSize: 4, color: '#FDE88A' },
  zzz1: { position: 'absolute', top: 30, right: 30, fontSize: 6, fontWeight: '800', fontStyle: 'italic', color: NIGHT_LIGHT, opacity: 0.6 },
  zzz2: { position: 'absolute', top: 24, right: 24, fontSize: 8, fontWeight: '800', fontStyle: 'italic', color: NIGHT_LIGHT, opacity: 0.8 },
  zzz3: { position: 'absolute', top: 16, right: 16, fontSize: 10, fontWeight: '800', fontStyle: 'italic', color: NIGHT_MID },
  sleepDuration: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1,
  },
  sleepMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sleepMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  sleepMetricValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },

  // Settings
  settingsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 4,
  },
});
