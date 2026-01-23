import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import {
  AlertTriangle,
  X,
  Lightbulb,
  RefreshCw,
  ThumbsUp,
  TrendingDown,
  ChevronRight,
  Award,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import logger from '@/lib/security/logger';
import {
  detectPlateau,
  dismissPlateau,
  getNewSuggestion,
  PlateauResult,
  PlateauSuggestion,
  getPlateauStats,
} from '@/lib/plateauDetection';

// ============================================
// COMPOSANT ALERTE PLATEAU
// ============================================

interface PlateauAlertProps {
  onDismiss?: () => void;
  compact?: boolean;
}

export const PlateauAlert: React.FC<PlateauAlertProps> = ({
  onDismiss,
  compact = false,
}) => {
  const { colors } = useTheme();
  const [plateau, setPlateau] = useState<PlateauResult | null>(null);
  const [currentSuggestion, setCurrentSuggestion] = useState<PlateauSuggestion | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Animation
  const pulseAnim = useState(new Animated.Value(1))[0];
  const shakeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    checkPlateau();
  }, []);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (plateau) {
      // Animation de pulsation
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [plateau]);

  const checkPlateau = async () => {
    setLoading(true);
    try {
      const result = await detectPlateau();
      if (result) {
        setPlateau(result);
        setCurrentSuggestion(result.suggestion);
      }
    } catch (error) {
      logger.error('Erreur detection plateau:', error);
    }
    setLoading(false);
  };

  const handleDismiss = async () => {
    if (plateau) {
      await dismissPlateau(plateau.averageWeight);
    }
    setPlateau(null);
    setShowModal(false);
    onDismiss?.();
  };

  const handleNewSuggestion = () => {
    // Animation shake
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();

    const newSuggestion = getNewSuggestion(currentSuggestion?.id);
    setCurrentSuggestion(newSuggestion);
  };

  const handleAction = () => {
    if (currentSuggestion?.action) {
      setShowModal(false);
      router.push(currentSuggestion.action.route as any);
    }
  };

  // Ne rien afficher si pas de plateau ou en chargement
  if (loading || !plateau) {
    return null;
  }

  // Version compacte (bandeau)
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactAlert, { backgroundColor: colors.warningMuted }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <AlertTriangle size={18} color={colors.warning} />
        <Text style={[styles.compactText, { color: colors.warning }]}>
          Plateau detecte ({plateau.duration} jours)
        </Text>
        <ChevronRight size={18} color={colors.warning} />
      </TouchableOpacity>
    );
  }

  return (
    <>
      {/* Carte principale */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.alertCard, { backgroundColor: colors.warningMuted, borderColor: colors.warning }]}
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.alertHeader}>
            <View style={[styles.alertIcon, { backgroundColor: colors.warning }]}>
              <AlertTriangle size={24} color={colors.background} />
            </View>
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: colors.warning }]}>
                Plateau detecte
              </Text>
              <Text style={[styles.alertSubtitle, { color: colors.textSecondary }]}>
                Ton poids stagne depuis {plateau.duration} jours
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.alertStats, { borderTopColor: colors.warning + '30' }]}>
            <View style={styles.alertStat}>
              <Text style={[styles.alertStatValue, { color: colors.textPrimary }]}>
                {plateau.averageWeight} kg
              </Text>
              <Text style={[styles.alertStatLabel, { color: colors.textMuted }]}>
                Moyenne
              </Text>
            </View>
            <View style={[styles.alertStatDivider, { backgroundColor: colors.warning + '30' }]} />
            <View style={styles.alertStat}>
              <Text style={[styles.alertStatValue, { color: colors.textPrimary }]}>
                ±{plateau.variation} kg
              </Text>
              <Text style={[styles.alertStatLabel, { color: colors.textMuted }]}>
                Variation
              </Text>
            </View>
            <View style={[styles.alertStatDivider, { backgroundColor: colors.warning + '30' }]} />
            <View style={styles.alertStat}>
              <Text style={[styles.alertStatValue, { color: colors.textPrimary }]}>
                {plateau.duration}j
              </Text>
              <Text style={[styles.alertStatLabel, { color: colors.textMuted }]}>
                Duree
              </Text>
            </View>
          </View>

          <View style={styles.tapHint}>
            <Text style={[styles.tapHintText, { color: colors.warning }]}>
              Appuie pour des conseils
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Modal detaille */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Plateau de poids
            </Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.modalContent}>
            {/* Message principal */}
            <View style={[styles.messageCard, { backgroundColor: colors.warningMuted }]}>
              <AlertTriangle size={32} color={colors.warning} />
              <Text style={[styles.messageTitle, { color: colors.warning }]}>
                Ton poids stagne depuis {plateau.duration} jours
              </Text>
              <Text style={[styles.messageSubtitle, { color: colors.textSecondary }]}>
                C'est NORMAL et temporaire !
              </Text>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.gold }]}>
                  {plateau.averageWeight} kg
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Poids moyen
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  ±{plateau.variation} kg
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Variation
                </Text>
              </View>
            </View>

            {/* Encouragement */}
            {plateau.previousPlateaus > 0 && (
              <View style={[styles.encouragementCard, { backgroundColor: colors.successMuted }]}>
                <Award size={20} color={colors.success} />
                <Text style={[styles.encouragementText, { color: colors.success }]}>
                  {plateau.encouragement}
                </Text>
              </View>
            )}

            {/* Suggestion */}
            {currentSuggestion && (
              <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                <View style={[styles.suggestionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.suggestionHeader}>
                    <Lightbulb size={20} color={colors.gold} />
                    <Text style={[styles.suggestionTitle, { color: colors.textPrimary }]}>
                      Suggestion
                    </Text>
                    <TouchableOpacity
                      onPress={handleNewSuggestion}
                      style={[styles.refreshButton, { backgroundColor: colors.cardHover }]}
                    >
                      <RefreshCw size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionIcon}>{currentSuggestion.icon}</Text>
                    <View style={styles.suggestionText}>
                      <Text style={[styles.suggestionName, { color: colors.gold }]}>
                        {currentSuggestion.title}
                      </Text>
                      <Text style={[styles.suggestionDesc, { color: colors.textSecondary }]}>
                        {currentSuggestion.text}
                      </Text>
                    </View>
                  </View>

                  {currentSuggestion.action && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.gold }]}
                      onPress={handleAction}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.background }]}>
                        {currentSuggestion.action.label}
                      </Text>
                      <ChevronRight size={18} color={colors.background} />
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            )}

            {/* Info */}
            <View style={[styles.infoCard, { backgroundColor: colors.cardHover }]}>
              <Text style={[styles.infoTitle, { color: colors.textSecondary }]}>
                Pourquoi un plateau ?
              </Text>
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                Ton corps s'adapte aux changements. C'est un mecanisme de protection naturel.
                Les plateaux durent generalement 2-4 semaines puis la perte reprend.
              </Text>
            </View>

            {/* Bouton dismiss */}
            <TouchableOpacity
              style={[styles.dismissButton, { backgroundColor: colors.cardHover }]}
              onPress={handleDismiss}
            >
              <ThumbsUp size={20} color={colors.textSecondary} />
              <Text style={[styles.dismissButtonText, { color: colors.textSecondary }]}>
                J'ai compris, masquer pour 7 jours
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ============================================
// COMPOSANT CELEBRATION FIN DE PLATEAU
// ============================================

interface PlateauResolvedProps {
  weightLost: number;
  onClose: () => void;
}

export const PlateauResolvedAlert: React.FC<PlateauResolvedProps> = ({
  weightLost,
  onClose,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.resolvedCard, { backgroundColor: colors.successMuted, borderColor: colors.success }]}>
      <View style={styles.resolvedHeader}>
        <View style={[styles.resolvedIcon, { backgroundColor: colors.success }]}>
          <TrendingDown size={24} color={colors.background} />
        </View>
        <View style={styles.resolvedContent}>
          <Text style={[styles.resolvedTitle, { color: colors.success }]}>
            Plateau depasse !
          </Text>
          <Text style={[styles.resolvedSubtitle, { color: colors.textSecondary }]}>
            Tu as perdu {weightLost.toFixed(1)} kg depuis ton plateau
          </Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.resolvedMessage, { color: colors.success }]}>
        Bravo champion ! Tu as prouve que tu peux surmonter les obstacles.
      </Text>
    </View>
  );
};

const RADIUS = { sm: 8, md: 12, lg: 16 };

const styles = StyleSheet.create({
  // Compact Alert
  compactAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 16,
  },
  compactText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },

  // Alert Card
  alertCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  alertSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },

  alertStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  alertStat: {
    flex: 1,
    alignItems: 'center',
  },
  alertStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  alertStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  alertStatDivider: {
    width: 1,
    height: '100%',
  },

  tapHint: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  // Message Card
  messageCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: RADIUS.lg,
    marginBottom: 20,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  messageSubtitle: {
    fontSize: 16,
    marginTop: 8,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  // Encouragement
  encouragementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: RADIUS.md,
    marginBottom: 16,
  },
  encouragementText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  // Suggestion Card
  suggestionCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  suggestionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  suggestionIcon: {
    fontSize: 32,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  suggestionDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    marginTop: 16,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Info Card
  infoCard: {
    padding: 16,
    borderRadius: RADIUS.md,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Dismiss Button
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Resolved Card
  resolvedCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  resolvedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  resolvedIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolvedContent: {
    flex: 1,
  },
  resolvedTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  resolvedSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  resolvedMessage: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default PlateauAlert;
