import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Defs, LinearGradient, Stop, G, Path, Circle } from 'react-native-svg';
import {
  ArrowLeft,
  Battery,
  Droplets,
  Moon,
  Dumbbell,
  Flame,
  TrendingUp,
  Zap,
  Target,
  ChevronRight,
  Activity,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useTheme } from '@/lib/ThemeContext';
import { calculateStreak, getTrainings, Training } from '@/lib/database';
import { getSleepStats, formatSleepDuration, SleepStats } from '@/lib/sleepService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HYDRATION_KEY = '@yoroi_hydration_today';
const HYDRATION_GOAL = 2500;

// ============================================
// ÉCRAN ÉNERGIE - BATTERIE INTERACTIVE
// ============================================

export default function EnergyScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [batteryPercent, setBatteryPercent] = useState(0);
  const [hydration, setHydration] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sleepStats, setSleepStats] = useState<SleepStats | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [lastTrainingDays, setLastTrainingDays] = useState<number | null>(null);

  // Animation batterie
  const batteryAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Détails de contribution
  const [contributions, setContributions] = useState({
    hydration: { value: 0, max: 20, label: 'Hydratation' },
    sleep: { value: 0, max: 25, label: 'Sommeil' },
    streak: { value: 0, max: 20, label: 'Régularité' },
    training: { value: 0, max: 20, label: 'Entraînement récent' },
    base: { value: 15, max: 15, label: 'Énergie de base' },
  });

  const loadData = useCallback(async () => {
    try {
      // Hydratation
      const today = format(new Date(), 'yyyy-MM-dd');
      const storedHydration = await AsyncStorage.getItem(`${HYDRATION_KEY}_${today}`);
      const hydrationValue = storedHydration ? parseInt(storedHydration, 10) : 0;
      setHydration(hydrationValue);

      // Autres données
      const [streakDays, sleep, allTrainings] = await Promise.all([
        calculateStreak(),
        getSleepStats(),
        getTrainings(),
      ]);

      setStreak(streakDays);
      setSleepStats(sleep);
      setTrainings(allTrainings);

      // Jours depuis dernier entraînement
      let daysSinceLast: number | null = null;
      if (allTrainings.length > 0) {
        const lastDate = new Date(allTrainings[0].date);
        daysSinceLast = differenceInDays(new Date(), lastDate);
        setLastTrainingDays(daysSinceLast);
      }

      // Calculer les contributions
      const hydrationContrib = Math.min(20, (hydrationValue / HYDRATION_GOAL) * 20);
      let sleepContrib = 0;
      if (sleep && sleep.averageDuration >= 420) sleepContrib = 25;
      else if (sleep && sleep.averageDuration >= 360) sleepContrib = 15;
      else if (sleep && sleep.averageDuration >= 300) sleepContrib = 5;
      
      const streakContrib = Math.min(20, streakDays * 2);
      
      let trainingContrib = 0;
      if (daysSinceLast !== null) {
        if (daysSinceLast === 0) trainingContrib = 20;
        else if (daysSinceLast === 1) trainingContrib = 15;
        else if (daysSinceLast === 2) trainingContrib = 10;
        else if (daysSinceLast <= 4) trainingContrib = 5;
      }

      const newContributions = {
        hydration: { value: Math.round(hydrationContrib), max: 20, label: 'Hydratation' },
        sleep: { value: Math.round(sleepContrib), max: 25, label: 'Sommeil' },
        streak: { value: Math.round(streakContrib), max: 20, label: 'Régularité' },
        training: { value: Math.round(trainingContrib), max: 20, label: 'Entraînement récent' },
        base: { value: 15, max: 15, label: 'Énergie de base' },
      };
      setContributions(newContributions);

      // Total
      const total = Object.values(newContributions).reduce((sum, c) => sum + c.value, 0);
      setBatteryPercent(Math.min(100, total));

      // Animation
      Animated.timing(batteryAnim, {
        toValue: Math.min(1, total / 100),
        duration: 1500,
        useNativeDriver: false,
      }).start();
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Animation pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const getBatteryColor = () => {
    if (batteryPercent >= 80) return '#10B981';
    if (batteryPercent >= 60) return '#84CC16';
    if (batteryPercent >= 40) return '#F59E0B';
    if (batteryPercent >= 20) return '#F97316';
    return '#EF4444';
  };

  const getStatusMessage = () => {
    if (batteryPercent >= 80) return { text: 'Prêt à tout donner !', advice: 'Séance intense recommandée', iconType: 'flame' as const };
    if (batteryPercent >= 60) return { text: 'Bonne forme', advice: 'Tu peux y aller sereinement', iconType: 'zap' as const };
    if (batteryPercent >= 40) return { text: 'Fatigue modérée', advice: 'Privilégie le technique léger', iconType: 'activity' as const };
    if (batteryPercent >= 20) return { text: 'Énergie basse', advice: 'Repos ou stretching conseillé', iconType: 'moon' as const };
    return { text: 'Recharge nécessaire', advice: 'Prends soin de toi aujourd\'hui', iconType: 'battery' as const };
  };

  const status = getStatusMessage();
  const batteryColor = getBatteryColor();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.backgroundCard }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Énergie du Jour</Text>
        <Battery size={24} color={batteryColor} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* BATTERIE GÉANTE ANIMÉE */}
        <View style={styles.batterySection}>
          <Animated.View style={[styles.batteryContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Svg width={160} height={280} viewBox="0 0 160 280">
              <Defs>
                <LinearGradient id="batteryGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={batteryColor} stopOpacity={0.9} />
                  <Stop offset="100%" stopColor={batteryColor} stopOpacity={0.6} />
                </LinearGradient>
              </Defs>
              
              {/* Tête de la batterie */}
              <Rect x="50" y="0" width="60" height="15" rx="5" fill={colors.border} />
              
              {/* Corps de la batterie */}
              <Rect x="10" y="15" width="140" height="260" rx="15" fill={colors.backgroundCard} stroke={colors.border} strokeWidth="3" />
              
              {/* Remplissage animé */}
              <AnimatedRect
                x="15"
                width="130"
                rx="12"
                fill="url(#batteryGradient)"
                batteryAnim={batteryAnim}
              />
              
              {/* Effet brillance */}
              <Rect x="20" y="25" width="40" height="8" rx="4" fill="white" opacity={0.2} />
            </Svg>
            
            {/* Pourcentage */}
            <View style={styles.batteryPercentOverlay}>
              <Text style={[styles.batteryPercentText, { color: batteryPercent >= 50 ? '#FFFFFF' : colors.textPrimary }]}>
                {Math.round(batteryPercent)}%
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Status */}
        <View style={[styles.statusCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIconWrap, { backgroundColor: `${batteryColor}20` }]}>
              {status.iconType === 'flame' && <Flame size={20} color={batteryColor} />}
              {status.iconType === 'zap' && <Zap size={20} color={batteryColor} />}
              {status.iconType === 'activity' && <Activity size={20} color={batteryColor} />}
              {status.iconType === 'moon' && <Moon size={20} color={batteryColor} />}
              {status.iconType === 'battery' && <Battery size={20} color={batteryColor} />}
            </View>
            <Text style={[styles.statusText, { color: colors.textPrimary }]}>{status.text}</Text>
          </View>
          <Text style={[styles.adviceText, { color: colors.textMuted }]}>{status.advice}</Text>
        </View>

        {/* DÉTAIL DES CONTRIBUTIONS */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CE QUI REMPLIT TA BATTERIE</Text>
        
        {Object.entries(contributions).map(([key, contrib]) => {
          const icon = key === 'hydration' ? <Droplets size={18} color="#06B6D4" />
            : key === 'sleep' ? <Moon size={18} color="#8B5CF6" />
            : key === 'streak' ? <Flame size={18} color="#F97316" />
            : key === 'training' ? <Dumbbell size={18} color={colors.accent} />
            : <Zap size={18} color="#F59E0B" />;
          
          const percent = (contrib.value / contrib.max) * 100;
          
          return (
            <View key={key} style={[styles.contribCard, { backgroundColor: colors.backgroundCard }]}>
              <View style={styles.contribHeader}>
                {icon}
                <Text style={[styles.contribLabel, { color: colors.textPrimary }]}>{contrib.label}</Text>
                <Text style={[styles.contribValue, { color: batteryColor }]}>+{contrib.value}%</Text>
              </View>
              <View style={[styles.contribBar, { backgroundColor: colors.border }]}>
                <View style={[styles.contribFill, { width: `${percent}%`, backgroundColor: batteryColor }]} />
              </View>
              <Text style={[styles.contribMax, { color: colors.textMuted }]}>Max: {contrib.max}%</Text>
            </View>
          );
        })}

        {/* CONSEILS POUR AMÉLIORER */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>AMÉLIORE TON ÉNERGIE</Text>
        
        <TouchableOpacity style={[styles.tipCard, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/hydration')}>
          <Droplets size={20} color="#06B6D4" />
          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, { color: colors.textPrimary }]}>Hydratation</Text>
            <Text style={[styles.tipDesc, { color: colors.textMuted }]}>
              {hydration >= HYDRATION_GOAL ? '✅ Objectif atteint !' : `${((hydration / HYDRATION_GOAL) * 100).toFixed(0)}% - Continue !`}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tipCard, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/sleep')}>
          <Moon size={20} color="#8B5CF6" />
          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, { color: colors.textPrimary }]}>Sommeil</Text>
            <Text style={[styles.tipDesc, { color: colors.textMuted }]}>
              {sleepStats ? `Moyenne: ${formatSleepDuration(sleepStats.averageDuration)}` : 'Enregistre ton sommeil'}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tipCard, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/add-training')}>
          <Dumbbell size={20} color={colors.accent} />
          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, { color: colors.textPrimary }]}>Entraînement</Text>
            <Text style={[styles.tipDesc, { color: colors.textMuted }]}>
              {lastTrainingDays === 0 ? '✅ Entraîné aujourd\'hui !'
                : lastTrainingDays === 1 ? 'Dernier entraînement hier'
                : lastTrainingDays !== null ? `Il y a ${lastTrainingDays} jours` : 'Aucun entraînement récent'}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* BOUTON GO */}
        <TouchableOpacity 
          style={[styles.goButton, { backgroundColor: batteryColor }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); router.push('/add-training'); }}
        >
          <Zap size={24} color="#FFFFFF" />
          <Text style={styles.goButtonText}>GO ENTRAÎNEMENT !</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// Composant animé pour le remplissage
const AnimatedRect = ({ batteryAnim, ...props }: any) => {
  const AnimatedRectComponent = Animated.createAnimatedComponent(Rect);
  
  const animatedY = batteryAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [265, 20], // De vide (bas) à plein (haut)
  });
  
  const animatedHeight = batteryAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 245], // De 0 à hauteur max
  });

  return (
    <AnimatedRectComponent
      {...props}
      y={animatedY}
      height={animatedHeight}
    />
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: '800' },
  scrollView: { flex: 1 },
  content: { padding: 16 },

  // Batterie
  batterySection: { alignItems: 'center', marginVertical: 20 },
  batteryContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  batteryPercentOverlay: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  batteryPercentText: { fontSize: 42, fontWeight: '900' },

  // Status
  statusCard: { padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 20, fontWeight: '800' },
  adviceText: { fontSize: 13, marginTop: 8, textAlign: 'center' },

  // Section title
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginTop: 10 },

  // Contributions
  contribCard: { padding: 14, borderRadius: 12, marginBottom: 8 },
  contribHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  contribLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  contribValue: { fontSize: 16, fontWeight: '800' },
  contribBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  contribFill: { height: '100%', borderRadius: 4 },
  contribMax: { fontSize: 10, textAlign: 'right' },

  // Tips
  tipCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '700' },
  tipDesc: { fontSize: 11, marginTop: 2 },

  // Go Button
  goButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, borderRadius: 16, marginTop: 16 },
  goButtonText: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
});

