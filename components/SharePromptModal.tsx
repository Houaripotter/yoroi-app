// ============================================
// YOROI - MODAL DE PROMPT PARTAGE (Version simplifiée)
// Popup simple qui demande si l'utilisateur veut partager
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Share2, X, Camera, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SharePromptModalProps {
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
  sportName: string;
}

export const SharePromptModal: React.FC<SharePromptModalProps> = ({
  visible,
  onClose,
  onShare,
  sportName,
}) => {
  const { colors, isDark } = useTheme();

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShare();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <BlurView intensity={isDark ? 40 : 20} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />

        <View style={styles.container}>
          {/* Modal Card */}
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            {/* Gold accent bar */}
            <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />

            {/* Content */}
            <View style={styles.content}>
              {/* Logo */}
              <View style={styles.logoContainer}>
                <Image
                  source={require('@/assets/images/logo2010.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              {/* Title avec check */}
              <View style={styles.titleRow}>
                <View style={[styles.checkCircle, { backgroundColor: '#10B981' }]}>
                  <Check size={16} color="#FFFFFF" strokeWidth={3} />
                </View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Seance enregistree !
                </Text>
              </View>

              {/* Sport name */}
              <Text style={[styles.sportText, { color: colors.accent }]}>
                {sportName}
              </Text>

              {/* Message */}
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                Partage ta seance sur Instagram et TikTok avec une carte stylée !
              </Text>

              {/* Features mini */}
              <View style={styles.features}>
                <View style={styles.featureItem}>
                  <Camera size={16} color={colors.accent} />
                  <Text style={[styles.featureText, { color: colors.textMuted }]}>
                    Ajoute ta photo
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Share2 size={16} color={colors.accent} />
                  <Text style={[styles.featureText, { color: colors.textMuted }]}>
                    Design story 9:16
                  </Text>
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: colors.accent }]}
                onPress={handleShare}
                activeOpacity={0.85}
              >
                <Share2 size={20} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.shareButtonText}>Créer ma carte</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.skipButton, { backgroundColor: colors.backgroundElevated }]}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                  Plus tard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 340,
  },
  modalCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  content: {
    padding: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  sportText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  features: {
    flexDirection: 'row',
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
  },
  buttonsContainer: {
    padding: 16,
    paddingTop: 8,
    gap: 10,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
