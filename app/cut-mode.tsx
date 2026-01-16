import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Target,
  Scale,
  Calendar,
  TrendingDown,
  AlertTriangle,
  Check,
  Flame,
  Droplets,
  Moon,
  Dumbbell,
  Trophy,
  Zap,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { format, differenceInDays, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWeights } from '@/lib/database';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

interface CutModeData {
  isActive: boolean;
  startDate: string;
  targetDate: string;
  startWeight: number;
  targetWeight: number;
  category?: string; // Catégorie de poids (MMA, JJB, etc.)
  notes: string;
}

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEY = '@yoroi_cut_mode';

// Catégories de poids courantes
const WEIGHT_CATEGORIES = {
  mma: [
    { name: 'Paille', maxKg: 52.2 },
    { name: 'Mouche', maxKg: 56.7 },
    { name: 'Coq', maxKg: 61.2 },
    { name: 'Plume', maxKg: 65.8 },
    { name: 'Léger', maxKg: 70.3 },
    { name: 'Mi-moyen', maxKg: 77.1 },
    { name: 'Moyen', maxKg: 83.9 },
    { name: 'Mi-lourd', maxKg: 93 },
    { name: 'Lourd', maxKg: 120.2 },
  ],
  jjb: [
    { name: 'Galo', maxKg: 57.5 },
    { name: 'Pluma', maxKg: 64 },
    { name: 'Pena', maxKg: 70 },
    { name: 'Leve', maxKg: 76 },
    { name: 'Medio', maxKg: 82.3 },
    { name: 'Meio-Pesado', maxKg: 88.3 },
    { name: 'Pesado', maxKg: 94.3 },
    { name: 'Super-Pesado', maxKg: 100.5 },
    { name: 'Ultra-Pesado', maxKg: 999 },
  ],
  boxe: [
    { name: 'Mouche', maxKg: 50.8 },
    { name: 'Coq', maxKg: 53.5 },
    { name: 'Plume', maxKg: 57.2 },
    { name: 'Léger', maxKg: 61.2 },
    { name: 'Super-léger', maxKg: 63.5 },
    { name: 'Welter', maxKg: 66.7 },
    { name: 'Moyen', maxKg: 72.6 },
    { name: 'Lourd-léger', maxKg: 79.4 },
    { name: 'Lourd', maxKg: 90.7 },
  ],
};

export default function CutModeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [cutData, setCutData] = useState<CutModeData | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form states
  const [targetWeight, setTargetWeight] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedSport, setSelectedSport] = useState<'mma' | 'jjb' | 'boxe'>('mma');
  
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (cutData?.isActive && currentWeight > 0) {
      const progress = calculateProgress();
      Animated.spring(progressAnim, {
        toValue: progress,
        tension: 50,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }
  }, [cutData, currentWeight]);

  const loadData = async () => {
    try {
      // Charger les données du cut
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCutData(JSON.parse(saved));
      }

      // Charger le poids actuel
      const weights = await getWeights();
      if (weights.length > 0) {
        setCurrentWeight(weights[0].weight);
      }
    } catch (error) {
      logger.error('Erreur chargement cut mode:', error);
    }
  };

  const startCut = async () => {
    const target = parseFloat(targetWeight);
    if (isNaN(target) || target <= 0) {
      showPopup('Erreur', 'Entre un poids cible valide');
      return;
    }

    if (target >= currentWeight) {
      showPopup('Attention', 'Le poids cible doit être inférieur à ton poids actuel');
      return;
    }

    const dateMatch = targetDate.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (!dateMatch) {
      showPopup('Erreur', 'Format de date invalide (JJ/MM)');
      return;
    }

    const [, day, month] = dateMatch;
    const year = new Date().getFullYear();
    const targetDateObj = new Date(year, parseInt(month) - 1, parseInt(day));
    
    if (targetDateObj < new Date()) {
      targetDateObj.setFullYear(year + 1);
    }

    const newCutData: CutModeData = {
      isActive: true,
      startDate: new Date().toISOString(),
      targetDate: targetDateObj.toISOString(),
      startWeight: currentWeight,
      targetWeight: target,
      notes: '',
    };

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newCutData));
      setCutData(newCutData);
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      logger.error('Erreur sauvegarde cut mode:', error);
      showPopup('Erreur', 'Impossible de sauvegarder');
    }
  };

  const stopCut = async () => {
    showPopup(
      'Arrêter le Cut ?',
      'Es-tu sûr de vouloir arrêter ton cut ? Les données seront effacées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Arrêter',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
              setCutData(null);
              progressAnim.setValue(0);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (error) {
              logger.error('Erreur arrêt cut mode:', error);
            }
          },
        },
      ]
    );
  };

  const calculateProgress = (): number => {
    if (!cutData) return 0;
    const totalToLose = cutData.startWeight - cutData.targetWeight;
    const lost = cutData.startWeight - currentWeight;
    return Math.min(100, Math.max(0, (lost / totalToLose) * 100));
  };

  const getDaysRemaining = (): number => {
    if (!cutData) return 0;
    return Math.max(0, differenceInDays(new Date(cutData.targetDate), new Date()));
  };

  const getWeightRemaining = (): number => {
    if (!cutData) return 0;
    return Math.max(0, currentWeight - cutData.targetWeight);
  };

  const getDailyTarget = (): number => {
    const days = getDaysRemaining();
    const weight = getWeightRemaining();
    if (days <= 0) return weight;
    return weight / days;
  };

  const getRiskLevel = (): 'safe' | 'moderate' | 'danger' => {
    const daily = getDailyTarget();
    if (daily <= 0.3) return 'safe';
    if (daily <= 0.5) return 'moderate';
    return 'danger';
  };

  const progress = calculateProgress();
  const daysRemaining = getDaysRemaining();
  const weightRemaining = getWeightRemaining();
  const dailyTarget = getDailyTarget();
  const riskLevel = getRiskLevel();

  const riskColors = {
    safe: '#10B981',
    moderate: '#F59E0B',
    danger: '#EF4444',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Mode Compétition
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Cut actif */}
        {cutData?.isActive && !isEditing ? (
          <>
            {/* Progression principale */}
            <View style={[styles.mainCard, { backgroundColor: colors.backgroundCard }]}>
              <View style={styles.targetHeader}>
                <Target size={24} color={colors.accent} />
                <Text style={[styles.targetTitle, { color: colors.textPrimary }]}>
                  Objectif : {cutData.targetWeight} kg
                </Text>
              </View>

              {/* Gauge circulaire */}
              <View style={styles.gaugeContainer}>
                <View style={[styles.gaugeOuter, { borderColor: colors.border }]}>
                  <Animated.View 
                    style={[
                      styles.gaugeFill,
                      {
                        backgroundColor: riskColors[riskLevel],
                        height: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                  <View style={styles.gaugeContent}>
                    <Text style={[styles.gaugePercent, { color: colors.textPrimary }]}>
                      {Math.round(progress)}%
                    </Text>
                    <Text style={[styles.gaugeLabel, { color: colors.textMuted }]}>
                      complété
                    </Text>
                  </View>
                </View>
              </View>

              {/* Stats rapides */}
              <View style={styles.quickStats}>
                <View style={styles.quickStat}>
                  <Scale size={18} color={colors.accent} />
                  <Text style={[styles.quickStatValue, { color: colors.textPrimary }]}>
                    {currentWeight} kg
                  </Text>
                  <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>
                    Actuel
                  </Text>
                </View>
                <View style={styles.quickStat}>
                  <TrendingDown size={18} color={riskColors[riskLevel]} />
                  <Text style={[styles.quickStatValue, { color: riskColors[riskLevel] }]}>
                    -{weightRemaining.toFixed(1)} kg
                  </Text>
                  <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>
                    Reste
                  </Text>
                </View>
                <View style={styles.quickStat}>
                  <Calendar size={18} color="#8B5CF6" />
                  <Text style={[styles.quickStatValue, { color: colors.textPrimary }]}>
                    {daysRemaining}
                  </Text>
                  <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>
                    Jours
                  </Text>
                </View>
              </View>
            </View>

            {/* Alerte risque */}
            {riskLevel !== 'safe' && (
              <View style={[styles.alertCard, { backgroundColor: `${riskColors[riskLevel]}15` }]}>
                <AlertTriangle size={20} color={riskColors[riskLevel]} />
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: riskColors[riskLevel] }]}>
                    {riskLevel === 'danger' ? 'Cut dangereux !' : 'Attention'}
                  </Text>
                  <Text style={[styles.alertText, { color: colors.textSecondary }]}>
                    Tu dois perdre {dailyTarget.toFixed(2)} kg/jour. 
                    {riskLevel === 'danger' 
                      ? ' Consulte un médecin.'
                      : ' Reste vigilant sur ton hydratation.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Conseils */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              CONSEILS CUT
            </Text>
            
            <View style={[styles.tipsCard, { backgroundColor: colors.backgroundCard }]}>
              {[
                { icon: Droplets, color: '#06B6D4', text: 'Bois 3-4L d\'eau par jour, puis réduis avant la pesée' },
                { icon: Moon, color: '#8B5CF6', text: 'Dors 8h minimum pour optimiser la récupération' },
                { icon: Dumbbell, color: '#F59E0B', text: 'Réduis l\'intensité la dernière semaine' },
                { icon: Flame, color: '#EF4444', text: 'Sauna modéré : max 15min à la fois' },
              ].map((tip, i) => (
                <View key={i} style={[styles.tipRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <tip.icon size={18} color={tip.color} />
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    {tip.text}
                  </Text>
                </View>
              ))}
            </View>

            {/* Date cible */}
            <View style={[styles.dateCard, { backgroundColor: colors.backgroundCard }]}>
              <Trophy size={20} color={colors.gold} />
              <View style={styles.dateInfo}>
                <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
                  Jour de la pesée
                </Text>
                <Text style={[styles.dateValue, { color: colors.textPrimary }]}>
                  {format(new Date(cutData.targetDate), 'EEEE d MMMM', { locale: fr })}
                </Text>
              </View>
            </View>

            {/* Bouton arrêter */}
            <TouchableOpacity 
              style={[styles.stopBtn, { borderColor: '#EF4444' }]}
              onPress={stopCut}
            >
              <X size={18} color="#EF4444" />
              <Text style={[styles.stopBtnText, { color: '#EF4444' }]}>
                Arrêter le cut
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Formulaire nouveau cut */
          <>
            <View style={[styles.formCard, { backgroundColor: colors.backgroundCard }]}>
              <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
                Nouveau Cut
              </Text>
              <Text style={[styles.formSubtitle, { color: colors.textMuted }]}>
                Prépare-toi pour ta compétition
              </Text>

              {/* Poids actuel */}
              <View style={styles.formRow}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                  Poids actuel
                </Text>
                <Text style={[styles.formValue, { color: colors.accent }]}>
                  {currentWeight > 0 ? `${currentWeight} kg` : 'Fais une pesée d\'abord'}
                </Text>
              </View>

              {/* Poids cible */}
              <View style={styles.formRow}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                  Poids cible (kg)
                </Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  keyboardType="decimal-pad"
                  placeholder="Ex: 70.0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Date cible */}
              <View style={styles.formRow}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                  Date de pesée (JJ/MM)
                </Text>
                <TextInput
                  style={[styles.formInput, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={targetDate}
                  onChangeText={setTargetDate}
                  placeholder="Ex: 15/02"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Catégories rapides */}
              <Text style={[styles.categoryTitle, { color: colors.textMuted }]}>
                Ou choisis une catégorie :
              </Text>
              
              <View style={styles.sportTabs}>
                {(['mma', 'jjb', 'boxe'] as const).map((sport) => (
                  <TouchableOpacity
                    key={sport}
                    style={[
                      styles.sportTab,
                      { backgroundColor: selectedSport === sport ? colors.accent : colors.background },
                    ]}
                    onPress={() => setSelectedSport(sport)}
                  >
                    <Text style={[
                      styles.sportTabText,
                      { color: selectedSport === sport ? '#000000' : colors.textMuted },
                    ]}>
                      {sport.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoriesRow}>
                  {WEIGHT_CATEGORIES[selectedSport].map((cat, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.categoryBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => setTargetWeight(cat.maxKg.toString())}
                    >
                      <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
                        {cat.name}
                      </Text>
                      <Text style={[styles.categoryWeight, { color: colors.accent }]}>
                        {cat.maxKg} kg
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Bouton démarrer */}
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: colors.accent }]}
              onPress={startCut}
              disabled={currentWeight === 0}
            >
              <Zap size={20} color={colors.textOnGold} />
              <Text style={[styles.startBtnText, { color: colors.textOnGold }]}>Démarrer le Cut</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  
  // Main card
  mainCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  targetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  targetTitle: { fontSize: 20, fontWeight: '800' },
  
  // Gauge
  gaugeContainer: { alignItems: 'center', marginBottom: 20 },
  gaugeOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  gaugeFill: { width: '100%', position: 'absolute', bottom: 0 },
  gaugeContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugePercent: { fontSize: 32, fontWeight: '900' },
  gaugeLabel: { fontSize: 12 },
  
  // Quick stats
  quickStats: { flexDirection: 'row', justifyContent: 'space-around' },
  quickStat: { alignItems: 'center', gap: 4 },
  quickStatValue: { fontSize: 18, fontWeight: '800' },
  quickStatLabel: { fontSize: 11 },
  
  // Alert
  alertCard: { flexDirection: 'row', padding: 14, borderRadius: 12, marginBottom: 16, gap: 12 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  alertText: { fontSize: 12, lineHeight: 18 },
  
  // Section
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  
  // Tips
  tipsCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  tipRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
  
  // Date card
  dateCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, marginBottom: 16, gap: 12 },
  dateInfo: { flex: 1 },
  dateLabel: { fontSize: 11 },
  dateValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  
  // Stop button
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  stopBtnText: { fontSize: 14, fontWeight: '600' },
  
  // Form
  formCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  formTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  formSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  formRow: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  formValue: { fontSize: 18, fontWeight: '700' },
  formInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  categoryTitle: { fontSize: 12, marginTop: 8, marginBottom: 10 },
  sportTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sportTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  sportTabText: { fontSize: 12, fontWeight: '700' },
  categoriesRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  categoryBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  categoryName: { fontSize: 12, fontWeight: '600' },
  categoryWeight: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  
  // Start button
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  startBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
});

