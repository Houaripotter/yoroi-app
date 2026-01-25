/**
 * AppleHealthEstimationModal.tsx
 * Modal explicative sur les estimations Apple Health
 * Affiche une explication complète sur comment Apple détecte automatiquement le sommeil
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, Moon, Smartphone, Activity, Brain, Clock, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AppleHealthEstimationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AppleHealthEstimationModal: React.FC<AppleHealthEstimationModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  const handleClose = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <BlurView
        intensity={isDark ? 60 : 40}
        tint={isDark ? 'dark' : 'light'}
        style={styles.backdrop}
      >
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View
            style={[styles.modalContainer, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            {/* Header avec gradient */}
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              <View style={styles.headerIcon}>
                <Moon size={32} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.headerTitle}>Estimation Apple Health</Text>
              <Text style={styles.headerSubtitle}>
                Détection automatique du sommeil
              </Text>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <X size={24} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </LinearGradient>

            {/* Contenu scrollable */}
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.contentContainer}
            >
              {/* Section explication principale */}
              <View style={[styles.section, { backgroundColor: colors.background }]}>
                <View style={[styles.iconBadge, { backgroundColor: '#6366F1' + '20' }]}>
                  <Brain size={24} color="#6366F1" strokeWidth={2.5} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Qu'est-ce qu'une estimation Apple ?
                </Text>
                <Text style={[styles.sectionText, { color: colors.textMuted }]}>
                  Apple Health détecte automatiquement ton sommeil même sans Apple Watch,
                  en analysant plusieurs indicateurs de ton iPhone et de tes habitudes.
                </Text>
              </View>

              {/* Comment ça marche */}
              <View style={[styles.section, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Comment Apple détecte ton sommeil ?
                </Text>

                {/* Capteurs iPhone */}
                <View style={styles.detectionMethod}>
                  <View style={[styles.methodIcon, { backgroundColor: '#06B6D4' + '20' }]}>
                    <Smartphone size={20} color="#06B6D4" strokeWidth={2.5} />
                  </View>
                  <View style={styles.methodContent}>
                    <Text style={[styles.methodTitle, { color: colors.text }]}>
                      Capteurs de mouvement
                    </Text>
                    <Text style={[styles.methodText, { color: colors.textMuted }]}>
                      L'accéléromètre et le gyroscope de ton iPhone détectent quand tu ne bouges
                      plus pendant une période prolongée (typiquement la nuit).
                    </Text>
                  </View>
                </View>

                {/* Utilisation écran */}
                <View style={styles.detectionMethod}>
                  <View style={[styles.methodIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                    <Activity size={20} color="#F59E0B" strokeWidth={2.5} />
                  </View>
                  <View style={styles.methodContent}>
                    <Text style={[styles.methodTitle, { color: colors.text }]}>
                      Activité de l'écran
                    </Text>
                    <Text style={[styles.methodText, { color: colors.textMuted }]}>
                      Apple analyse quand tu n'utilises pas ton téléphone. Une longue période
                      d'inactivité nocturne indique que tu dors probablement.
                    </Text>
                  </View>
                </View>

                {/* Mode Ne pas déranger */}
                <View style={styles.detectionMethod}>
                  <View style={[styles.methodIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
                    <Moon size={20} color="#8B5CF6" strokeWidth={2.5} />
                  </View>
                  <View style={styles.methodContent}>
                    <Text style={[styles.methodTitle, { color: colors.text }]}>
                      Modes Focus et Sommeil
                    </Text>
                    <Text style={[styles.methodText, { color: colors.textMuted }]}>
                      Si tu actives le mode "Ne pas déranger" ou "Sommeil" programmé,
                      Apple l'utilise pour détecter tes heures de coucher et réveil.
                    </Text>
                  </View>
                </View>

                {/* Habitudes */}
                <View style={styles.detectionMethod}>
                  <View style={[styles.methodIcon, { backgroundColor: '#10B981' + '20' }]}>
                    <Clock size={20} color="#10B981" strokeWidth={2.5} />
                  </View>
                  <View style={styles.methodContent}>
                    <Text style={[styles.methodTitle, { color: colors.text }]}>
                      Apprentissage de tes habitudes
                    </Text>
                    <Text style={[styles.methodText, { color: colors.textMuted }]}>
                      Avec le temps, Apple apprend tes routines de sommeil et affine ses
                      estimations en fonction de tes horaires habituels.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Précision */}
              <View style={[styles.section, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Quelle est la précision ?
                </Text>
                <Text style={[styles.sectionText, { color: colors.textMuted }]}>
                  Les estimations Apple sont <Text style={{ fontWeight: '700' }}>assez fiables</Text> pour
                  détecter <Text style={{ fontWeight: '700' }}>les périodes de sommeil</Text>, mais moins
                  précises qu'une Apple Watch qui mesure:
                </Text>

                <View style={styles.comparisonList}>
                  <View style={styles.comparisonItem}>
                    <CheckCircle2 size={16} color={colors.accent} strokeWidth={2.5} />
                    <Text style={[styles.comparisonText, { color: colors.textMuted }]}>
                      Phases de sommeil détaillées (léger, profond, paradoxal)
                    </Text>
                  </View>
                  <View style={styles.comparisonItem}>
                    <CheckCircle2 size={16} color={colors.accent} strokeWidth={2.5} />
                    <Text style={[styles.comparisonText, { color: colors.textMuted }]}>
                      Fréquence cardiaque et variabilité (HRV)
                    </Text>
                  </View>
                  <View style={styles.comparisonItem}>
                    <CheckCircle2 size={16} color={colors.accent} strokeWidth={2.5} />
                    <Text style={[styles.comparisonText, { color: colors.textMuted }]}>
                      Mouvements précis pendant la nuit
                    </Text>
                  </View>
                  <View style={styles.comparisonItem}>
                    <CheckCircle2 size={16} color={colors.accent} strokeWidth={2.5} />
                    <Text style={[styles.comparisonText, { color: colors.textMuted }]}>
                      Analyse respiratoire
                    </Text>
                  </View>
                </View>
              </View>

              {/* Note importante */}
              <View style={[styles.importantNote, { backgroundColor: isDark ? '#FCD34D' + '15' : '#FEF3C7' }]}>
                <Text style={[styles.importantTitle, { color: isDark ? '#FCD34D' : '#92400E' }]}>
                  💡 Bon à savoir
                </Text>
                <Text style={[styles.importantText, { color: isDark ? '#FDE68A' : '#78350F' }]}>
                  Pour obtenir des données plus précises, utilise une Apple Watch ou configure
                  manuellement tes heures de sommeil dans l'app Santé d'Apple.
                </Text>
              </View>

              {/* Espace en bas */}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  detectionMethod: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  methodText: {
    fontSize: 14,
    lineHeight: 20,
  },
  comparisonList: {
    marginTop: 12,
    gap: 12,
  },
  comparisonItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  comparisonText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  importantNote: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  importantTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  importantText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
