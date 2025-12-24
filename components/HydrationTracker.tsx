import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Droplet, Plus, ChevronRight, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { Card } from '@/components/ui/Card';
import {
  getTodayHydration,
  addHydrationEntry,
  getHydrationSettings,
  hasWorkoutOnDate,
  HydrationSettings,
} from '@/lib/storage';

// ============================================
// HYDRATION TRACKER - SUIVI D'HYDRATATION
// ============================================

interface HydrationTrackerProps {
  compact?: boolean;
  currentWeight?: number;
  onPress?: () => void;
  onUpdate?: () => void;
}

const TOTAL_DROPS = 12;

export const HydrationTracker: React.FC<HydrationTrackerProps> = ({
  compact = false,
  currentWeight,
  onPress,
  onUpdate,
}) => {
  const { colors } = useTheme();
  const [todayAmount, setTodayAmount] = useState(0); // en ml
  const [dailyGoal, setDailyGoal] = useState(2500); // en ml
  const [isTrainingDay, setIsTrainingDay] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [dropAnimations] = useState(
    Array.from({ length: TOTAL_DROPS }, () => new Animated.Value(0))
  );

  const loadData = useCallback(async () => {
    try {
      const [amount, settings, hasWorkout] = await Promise.all([
        getTodayHydration(),
        getHydrationSettings(),
        hasWorkoutOnDate(new Date().toISOString().split('T')[0]),
      ]);

      setTodayAmount(amount);
      setIsTrainingDay(hasWorkout);

      // Calculer l'objectif
      let goal = (settings.customGoal || settings.dailyGoal) * 1000;
      if (hasWorkout) {
        goal += settings.trainingDayBonus * 1000;
      }
      setDailyGoal(goal);
    } catch (error) {
      console.error('Erreur chargement hydratation:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Animer les gouttes
  useEffect(() => {
    const filledDrops = Math.min(
      Math.floor((todayAmount / dailyGoal) * TOTAL_DROPS),
      TOTAL_DROPS
    );

    dropAnimations.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: index < filledDrops ? 1 : 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    });
  }, [todayAmount, dailyGoal, dropAnimations]);

  const addWater = async (amount: number) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await addHydrationEntry(amount);
      setTodayAmount(prev => prev + amount);
      onUpdate?.();
    } catch (error) {
      console.error('Erreur ajout hydratation:', error);
    }
  };

  const handleCustomAdd = () => {
    const amount = parseInt(customAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une quantite valide');
      return;
    }
    addWater(amount);
    setCustomAmount('');
    setShowModal(false);
  };

  const progress = Math.min((todayAmount / dailyGoal) * 100, 100);
  const litersConsumed = (todayAmount / 1000).toFixed(2);
  const litersGoal = (dailyGoal / 1000).toFixed(2);

  // VERSION COMPACTE (pour le dashboard)
  if (compact) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <Card style={styles.compactCard}>
          <View style={styles.compactHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.infoMuted }]}>
              <Droplet size={20} color={colors.info} fill={colors.info} />
            </View>
            <View style={styles.compactInfo}>
              <Text style={[styles.compactTitle, { color: colors.textPrimary }]}>
                Hydratation
              </Text>
              <Text style={[styles.compactAmount, { color: colors.info }]}>
                {litersConsumed} / {litersGoal} L
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>

          {/* Mini gouttes */}
          <View style={styles.compactDropsRow}>
            {dropAnimations.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.miniDrop,
                  {
                    backgroundColor: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [colors.border, colors.info],
                    }),
                    transform: [
                      {
                        scale: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>

          {/* Barre de progression */}
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.info, width: `${progress}%` },
              ]}
            />
          </View>

          {/* Boutons rapides */}
          <View style={styles.quickButtons}>
            {[250, 500].map(amount => (
              <TouchableOpacity
                key={amount}
                style={[styles.quickButton, { backgroundColor: colors.infoMuted }]}
                onPress={() => addWater(amount)}
              >
                <Plus size={12} color={colors.info} />
                <Text style={[styles.quickButtonText, { color: colors.info }]}>
                  {amount}ml
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  // VERSION COMPLETE
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconContainerLarge, { backgroundColor: colors.infoMuted }]}>
          <Droplet size={28} color={colors.info} fill={colors.info} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Hydratation</Text>
        {isTrainingDay && (
          <View style={[styles.trainingBadge, { backgroundColor: colors.successMuted }]}>
            <Text style={[styles.trainingBadgeText, { color: colors.success }]}>
              Jour training +0.5L
            </Text>
          </View>
        )}
      </View>

      {/* Gouttes animees */}
      <View style={styles.dropsContainer}>
        {dropAnimations.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.drop,
              {
                backgroundColor: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [colors.border, colors.info],
                }),
                transform: [
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.1],
                    }),
                  },
                ],
                shadowColor: colors.info,
                shadowOpacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5],
                }),
              },
            ]}
          >
            <Droplet
              size={18}
              color={colors.textOnGold}
              fill="currentColor"
              style={{ opacity: 0.6 }}
            />
          </Animated.View>
        ))}
      </View>

      {/* Affichage principal */}
      <View style={styles.mainDisplay}>
        <Text style={[styles.currentAmount, { color: colors.textPrimary }]}>
          {litersConsumed}
        </Text>
        <Text style={[styles.goalAmount, { color: colors.textSecondary }]}>
          {' '}/ {litersGoal} L
        </Text>
      </View>

      {/* Barre de progression */}
      <View style={[styles.progressBarLarge, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.progressFillLarge,
            {
              backgroundColor: colors.info,
              width: `${progress}%`,
            },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: colors.textMuted }]}>
        {Math.round(progress)}% de l'objectif
      </Text>

      {/* Boutons d'ajout */}
      <View style={styles.addButtons}>
        {[250, 500, 1000].map(amount => (
          <TouchableOpacity
            key={amount}
            style={[styles.addButton, { backgroundColor: colors.infoMuted }]}
            onPress={() => addWater(amount)}
          >
            <Plus size={16} color={colors.info} />
            <Text style={[styles.addButtonText, { color: colors.info }]}>
              {amount >= 1000 ? `${amount / 1000}L` : `${amount}ml`}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => setShowModal(true)}
        >
          <Text style={[styles.addButtonText, { color: colors.textPrimary }]}>
            Autre
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal quantite personnalisee */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Quantite personnalisee
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputContainer}>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="numeric"
                placeholder="250"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <Text style={[styles.modalUnit, { color: colors.textSecondary }]}>ml</Text>
            </View>

            <View style={styles.modalQuickOptions}>
              {[100, 150, 200, 330, 750].map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={[styles.modalQuickButton, { backgroundColor: colors.infoMuted }]}
                  onPress={() => setCustomAmount(amount.toString())}
                >
                  <Text style={[styles.modalQuickButtonText, { color: colors.info }]}>
                    {amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalSubmit, { backgroundColor: colors.info }]}
              onPress={handleCustomAdd}
            >
              <Plus size={20} color="#FFF" />
              <Text style={styles.modalSubmitText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Card>
  );
};

const styles = StyleSheet.create({
  // CARTE COMPACTE
  compactCard: {
    padding: 16,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  compactDropsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 8,
  },
  miniDrop: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // CARTE COMPLETE
  card: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconContainerLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  trainingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trainingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dropsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  drop: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  mainDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  currentAmount: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  goalAmount: {
    fontSize: 20,
    fontWeight: '500',
  },
  progressBarLarge: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFillLarge: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  addButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalInput: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalUnit: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalQuickOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  modalQuickButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalQuickButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  modalSubmitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default HydrationTracker;
