// ============================================
// ÉTAPE 4 : SAUVEGARDE iCLOUD
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Cloud,
  FolderPlus,
  Download,
  Shield,
  ArrowRight,
  CheckCircle,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { exportDataToJSON } from '@/lib/exportService';
import { successHaptic } from '@/lib/haptics';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import ratingService from '@/lib/ratingService';
import { RatingPopup } from '@/components/RatingPopup';

export default function BackupStepScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportDataToJSON();
      successHaptic();
      // Afficher le modal de succès
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erreur export:', error);
      Alert.alert(
        'Erreur de sauvegarde',
        'Impossible d\'exporter tes données. Vérifie que tu as autorisé l\'accès à tes photos et réessaye.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Réessayer', onPress: handleExport },
        ]
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleFinish = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);

    // Vérifier si l'utilisateur a déjà noté l'app
    const hasRated = await ratingService.hasRated();

    // Naviguer vers l'accueil avec paramètre pour afficher la popup
    if (!hasRated) {
      router.replace('/(tabs)?showRating=true');
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleRatingClose = () => {
    setShowRatingPopup(false);
    ratingService.onPopupDismissed();
    router.replace('/(tabs)');
  };

  const handleRated = () => {
    setShowRatingPopup(false);
    ratingService.onRated();
    router.replace('/(tabs)');
  };

  return (
    <ScreenWrapper noPadding noContainer>
      {/* HEADER ÉTAPE 4 - SOMMET ABSOLU */}
      <View style={{
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        zIndex: 999
      }}>
        <View style={{ paddingBottom: 10, paddingTop: 5, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: colors.accent, letterSpacing: 3, marginBottom: 8 }}>ÉTAPE 4 SUR 4</Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            {/* Etapes Passées (Gold) */}
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />
            <View style={{ width: 30, height: 2, backgroundColor: colors.accent }} />
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />
            <View style={{ width: 30, height: 2, backgroundColor: colors.accent }} />
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />
            <View style={{ width: 30, height: 2, backgroundColor: colors.accent }} />

            {/* Etape 4 (Actuelle - Big Gold) */}
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.5, shadowRadius: 5 }} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '900', color: colors.textPrimary, marginTop: 4, letterSpacing: 1 }}>SÉCURISATION</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        
        {/* LOGO SYNC */}
        <View style={styles.iconContainer}>
          <Cloud size={60} color={colors.accent} />
          <View style={styles.shieldOverlay}>
            <Shield size={24} color="#10B981" fill="#10B981" />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Protège tes données ☁️
        </Text>

        <View style={[styles.warningBox, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
          <Text style={[styles.warningText, { color: colors.error }]}>
            Attention : YOROI fonctionne sans serveur pour respecter ta vie privée. Tes données sont uniquement sur cet appareil.
          </Text>
        </View>

        <View style={[styles.instructionCard, { backgroundColor: colors.backgroundCard, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }]}>
          <Text style={[styles.instructionTitle, { color: colors.accent }]}>MARCHE À SUIVRE :</Text>

          <View style={styles.stepRow}>
            <FolderPlus size={20} color={colors.accent} />
            <Text style={[styles.stepText, { color: colors.textPrimary }]}>Crée un dossier <Text style={{fontWeight: '900'}}>"Yoroi_Backup"</Text> dans ton espace de stockage cloud.</Text>
          </View>

          <View style={styles.stepRow}>
            <Download size={20} color={colors.accent} />
            <Text style={[styles.stepText, { color: colors.textPrimary }]}>Clique sur le bouton ci-dessous pour générer ton fichier de sauvegarde.</Text>
          </View>

          <View style={styles.stepRow}>
            <Cloud size={20} color={colors.accent} />
            <Text style={[styles.stepText, { color: colors.textPrimary }]}>Enregistre ce fichier dans ton cloud pour ne jamais rien perdre.</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.accent }]}
          onPress={handleExport}
          disabled={isExporting}
        >
          <Download size={24} color="#FFFFFF" />
          <Text style={styles.exportBtnText}>
            {isExporting ? 'GÉNÉRATION...' : 'GÉNÉRER MA SAUVEGARDE'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.finishBtn}
          onPress={handleFinish}
        >
          <Text style={[styles.finishBtnText, { color: '#6B7280' }]}>TERMINER LE PARCOURS</Text>
          <ArrowRight size={18} color="#6B7280" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de succès après sauvegarde */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
            <View style={[styles.successIconContainer, { backgroundColor: '#10B98120' }]}>
              <CheckCircle size={60} color="#10B981" strokeWidth={3} />
            </View>

            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
              Bravo ! 🎉
            </Text>

            <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
              Ta sauvegarde a été générée avec succès !
            </Text>

            <View style={[styles.protectionBox, { backgroundColor: colors.accent + '15', borderColor: colors.accent }]}>
              <Shield size={20} color={colors.accent} />
              <Text style={[styles.protectionText, { color: colors.textPrimary }]}>
                Tes données sont maintenant protégées en cas de perte, vol ou changement d'appareil.
              </Text>
            </View>

            <Text style={[styles.reminderText, { color: colors.textMuted }]}>
              💡 Pense à sauvegarder ce fichier dans ton cloud préféré (Google Drive, iCloud, Dropbox, etc.)
            </Text>

            <TouchableOpacity
              style={[styles.okButton, { backgroundColor: colors.accent }]}
              onPress={() => {
                setShowSuccessModal(false);
                successHaptic();
              }}
            >
              <Text style={[styles.okButtonText, { color: colors.textOnAccent }]}>
                PARFAIT !
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Popup de notation */}
      <RatingPopup
        visible={showRatingPopup}
        onClose={handleRatingClose}
        onRated={handleRated}
        actionType="session"
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  warningBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  instructionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: '100%',
    padding: 20,
    borderRadius: 24,
    gap: 16,
    marginBottom: 32,
  },
  instructionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  exportBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#D4AF37',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  successMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  finishBtn: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  finishBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  protectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  protectionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  reminderText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  okButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  okButtonText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
