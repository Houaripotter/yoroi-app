/**
 * VitalityBetaWarningModal.tsx
 * Popup d'avertissement pour l'onglet Vitalité
 * Informe les utilisateurs des bugs possibles avec Apple Santé
 * Avec lien vers la boîte à idées pour signaler les problèmes
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Dimensions,
} from 'react-native';
import { X, AlertTriangle, ExternalLink, MessageSquare, Bug } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 🔗 LIEN BOÎTE À IDÉES - À REMPLACER PAR TON VRAI LIEN
const FEEDBACK_URL = 'https://forms.gle/VOTRE_FORMULAIRE_GOOGLE'; // TODO: Remplacer par le vrai lien

interface VitalityBetaWarningModalProps {
  visible: boolean;
  onClose: () => void;
}

export const VitalityBetaWarningModal: React.FC<VitalityBetaWarningModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  const handleClose = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleOpenFeedback = async () => {
    try {
      impactAsync(ImpactFeedbackStyle.Medium);
      const canOpen = await Linking.canOpenURL(FEEDBACK_URL);

      if (canOpen) {
        await Linking.openURL(FEEDBACK_URL);
        notificationAsync(NotificationFeedbackType.Success);
      } else {
        console.error('Cannot open feedback URL');
      }
    } catch (error) {
      console.error('Error opening feedback:', error);
    }
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
            {/* Header avec icône alerte */}
            <LinearGradient
              colors={['#F59E0B', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              <View style={styles.iconWrapper}>
                <AlertTriangle size={48} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.headerTitle}>⚠️ Version Bêta</Text>
              <Text style={styles.headerSubtitle}>
                Onglet Vitalité & Apple Santé
              </Text>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <X size={24} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </LinearGradient>

            {/* Contenu */}
            <View style={styles.content}>
              {/* Message principal */}
              <View style={[styles.warningBox, { backgroundColor: isDark ? '#FCD34D' + '15' : '#FEF3C7' }]}>
                <Bug size={24} color={isDark ? '#FCD34D' : '#92400E'} strokeWidth={2.5} />
                <Text style={[styles.warningText, { color: isDark ? '#FDE68A' : '#78350F' }]}>
                  Cette section intègre les données d'Apple Santé et est encore en{' '}
                  <Text style={{ fontWeight: '900' }}>version bêta</Text>.
                </Text>
              </View>

              {/* Problèmes possibles */}
              <View style={[styles.section, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Bugs possibles
                </Text>
                <View style={styles.bulletList}>
                  <View style={styles.bulletItem}>
                    <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.bulletText, { color: colors.textMuted }]}>
                      Données qui ne s'affichent pas correctement
                    </Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.bulletText, { color: colors.textMuted }]}>
                      Synchronisation Apple Santé qui redemande l'autorisation
                    </Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.bulletText, { color: colors.textMuted }]}>
                      Historiques incomplets ou valeurs incorrectes
                    </Text>
                  </View>
                  <View style={styles.bulletItem}>
                    <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.bulletText, { color: colors.textMuted }]}>
                      Estimations Apple qui ne correspondent pas à tes données réelles
                    </Text>
                  </View>
                </View>
              </View>

              {/* Appel à l'aide */}
              <View style={[styles.helpSection, { backgroundColor: isDark ? '#6366F1' + '20' : '#EEF2FF' }]}>
                <MessageSquare size={28} color={colors.accent} strokeWidth={2.5} />
                <Text style={[styles.helpTitle, { color: colors.text }]}>
                  Ton avis est précieux!
                </Text>
                <Text style={[styles.helpText, { color: colors.textMuted }]}>
                  Si tu rencontres un bug ou si quelque chose ne fonctionne pas comme prévu,{' '}
                  <Text style={{ fontWeight: '700' }}>n'hésite surtout pas</Text> à me le signaler.
                  {'\n\n'}
                  Chaque retour m'aide à améliorer l'app! 🙏
                </Text>
              </View>

              {/* Bouton boîte à idées */}
              <TouchableOpacity
                style={[styles.feedbackButton, { backgroundColor: colors.accent }]}
                onPress={handleOpenFeedback}
                activeOpacity={0.8}
              >
                <ExternalLink size={20} color={colors.textOnAccent} strokeWidth={2.5} />
                <Text style={[styles.feedbackButtonText, { color: colors.textOnAccent }]}>
                  Signaler un problème
                </Text>
              </TouchableOpacity>

              {/* Bouton OK */}
              <TouchableOpacity
                style={[styles.okButton, { borderColor: colors.border }]}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.okButtonText, { color: colors.text }]}>
                  J'ai compris
                </Text>
              </TouchableOpacity>
            </View>
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
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
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
    padding: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  bulletList: {
    gap: 10,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  helpSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  feedbackButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  okButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  okButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
