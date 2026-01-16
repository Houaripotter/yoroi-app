import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { ChevronLeft, Camera, Trash2, Check, AlertTriangle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadScreenshotDemoData, clearScreenshotDemoData, isScreenshotModeEnabled, cleanDuplicateTrainings, resetCompleteDatabase } from '@/lib/screenshotDemoData';
import * as Haptics from 'expo-haptics';

export default function ScreenshotModeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [loading, setLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    checkScreenshotMode();
  }, []);

  const checkScreenshotMode = async () => {
    setChecking(true);
    const enabled = await isScreenshotModeEnabled();
    setIsEnabled(enabled);
    setChecking(false);
  };

  const handleActivateScreenshotMode = async () => {
    showPopup(
      'Activer le mode Screenshot',
      'Cela va charger des données de démonstration complètes pour tous les écrans de l\'app. Tes données actuelles seront écrasées.\n\nContinuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Activer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              const result = await loadScreenshotDemoData();

              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showPopup(
                  'Mode Screenshot activé !',
                  'TOUTES les données de démonstration ont été chargées :\n\n✅ 6 onglets Stats complets\n✅ Gamification (XP, badges, avatars, défis)\n✅ Compétitions & Palmares\n✅ Planning & Carnet\n✅ Apple Health (pas, calories, distance, FC)\n✅ Jeûne intermittent\n✅ Historique Timer\n✅ Photos transformation\n\nTu peux maintenant prendre de PARFAITS screenshots pour l\'App Store !',
                  [
                    {
                      text: 'OK',
                      style: 'primary',
                      onPress: () => {
                        setIsEnabled(true);
                        router.back();
                      }
                    }
                  ]
                );
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showPopup('Erreur', result.error || 'Une erreur est survenue', [
                  { text: 'OK', style: 'primary' }
                ]);
              }
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              showPopup('Erreur', 'Impossible de charger les données de démonstration', [
                { text: 'OK', style: 'primary' }
              ]);
              console.error(error);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeactivateScreenshotMode = async () => {
    showPopup(
      'Désactiver le mode Screenshot',
      'Cela va effacer TOUTES les données de démonstration et réinitialiser complètement l\'app.\n\nIMPORTANT : Ferme et réouvre l\'app après pour appliquer les changements.\n\nContinuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'TOUT EFFACER',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            try {
              const result = await clearScreenshotDemoData();

              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showPopup(
                  'Mode Screenshot désactivé',
                  `${result.message}\n\nIMPORTANT : Ferme et réouvre l\'app maintenant pour que les changements soient visibles !`,
                  [
                    {
                      text: 'OK',
                      style: 'primary',
                      onPress: () => {
                        setIsEnabled(false);
                        router.replace('/(tabs)');
                      }
                    }
                  ]
                );
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showPopup('Erreur', result.message, [
                  { text: 'OK', style: 'primary' }
                ]);
              }
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              showPopup('Erreur', 'Impossible d\'effacer les données', [
                { text: 'OK', style: 'primary' }
              ]);
              console.error(error);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCleanTrainings = async () => {
    showPopup(
      'Nettoyer les entraînements',
      'Cela va supprimer TOUS les entraînements actuels et en générer de nouveaux propres (~70 sessions sur 90 jours, 1 par jour max).\n\nContinuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Nettoyer',
          style: 'destructive',
          onPress: async () => {
            setCleaning(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              const result = await cleanDuplicateTrainings();

              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showPopup(
                  'Entraînements nettoyés !',
                  `${result.removed} entraînements supprimés.\n\nTu as maintenant un planning propre et lisible avec ~70 sessions sur 3 mois (5 par semaine, 1 par jour max).\n\nCalendrier lisible\nLogos des clubs visibles\nPlanning réaliste\n\nIMPORTANT : Ferme et réouvre l'app pour voir les changements !`,
                  [
                    {
                      text: 'OK',
                      style: 'primary',
                      onPress: () => {
                        // Naviguer vers l'accueil pour forcer un refresh
                        router.replace('/(tabs)');
                      }
                    }
                  ]
                );
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showPopup('Erreur', 'Une erreur est survenue lors du nettoyage', [
                  { text: 'OK', style: 'primary' }
                ]);
              }
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              showPopup('Erreur', 'Impossible de nettoyer les entraînements', [
                { text: 'OK', style: 'primary' }
              ]);
              console.error(error);
            } finally {
              setCleaning(false);
            }
          }
        }
      ]
    );
  };

  const handleResetComplete = async () => {
    showPopup(
      'RESET COMPLET',
      'ATTENTION : Cela va TOUT effacer :\n\nTOUS les entraînements\nTOUS les clubs\nTOUTES les pesées\nTOUT le profil\nAsyncStorage\n\nTu repartiras de ZÉRO.\n\nVraiment continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'TOUT EFFACER',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            try {
              const result = await resetCompleteDatabase();

              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showPopup(
                  'RESET COMPLET RÉUSSI !',
                  `${result.message}\n\nBase de données complètement vidée\nAsyncStorage effacé\n\nIMPORTANT : Ferme et réouvre l'app maintenant !`,
                  [
                    {
                      text: 'OK',
                      style: 'primary',
                      onPress: () => {
                        setIsEnabled(false);
                        router.replace('/(tabs)');
                      }
                    }
                  ]
                );
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showPopup('Erreur', result.message, [
                  { text: 'OK', style: 'primary' }
                ]);
              }
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              showPopup('Erreur', 'Impossible de réinitialiser la base de données', [
                { text: 'OK', style: 'primary' }
              ]);
              console.error(error);
            } finally {
              setResetting(false);
            }
          }
        }
      ]
    );
  };

  if (checking) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Mode Screenshot
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.statusHeader}>
            <Camera size={28} color={isEnabled ? '#10B981' : '#9CA3AF'} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
                Mode Screenshot
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.textMuted }]}>
                {isEnabled ? 'Activé' : 'Désactivé'}
              </Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={() => {
                if (isEnabled) {
                  handleDeactivateScreenshotMode();
                } else {
                  handleActivateScreenshotMode();
                }
              }}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor="#FFFFFF"
              disabled={loading}
            />
          </View>

          {isEnabled && (
            <View style={[styles.statusBanner, { backgroundColor: '#10B98115' }]}>
              <Check size={16} color="#10B981" />
              <Text style={[styles.statusBannerText, { color: '#10B981' }]}>
                Données de démo chargées
              </Text>
            </View>
          )}
        </View>

        {/* Clean Trainings Button (only when enabled) */}
        {isEnabled && (
          <>
            <TouchableOpacity
              style={[styles.cleanButton, { backgroundColor: colors.backgroundCard, borderColor: '#F59E0B' }]}
              onPress={handleCleanTrainings}
              disabled={cleaning}
              activeOpacity={0.7}
            >
              {cleaning ? (
                <ActivityIndicator color="#F59E0B" />
              ) : (
                <>
                  <RefreshCw size={20} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cleanButtonTitle, { color: colors.textPrimary }]}>
                      Nettoyer les entraînements
                    </Text>
                    <Text style={[styles.cleanButtonSubtitle, { color: colors.textMuted }]}>
                      Si tu as trop d'entraînements par jour (13+)
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* RESET COMPLET Button - DANGER */}
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: colors.backgroundCard, borderColor: '#EF4444' }]}
              onPress={handleResetComplete}
              disabled={resetting}
              activeOpacity={0.7}
            >
              {resetting ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <>
                  <Trash2 size={20} color="#EF4444" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resetButtonTitle, { color: '#EF4444' }]}>
                      RESET COMPLET (DANGER)
                    </Text>
                    <Text style={[styles.cleanButtonSubtitle, { color: colors.textMuted }]}>
                      Efface TOUT : entraînements, clubs, pesées, profil
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            À propos
          </Text>
          <Text style={[styles.sectionText, { color: colors.textMuted }]}>
            Le mode Screenshot charge des données de démonstration complètes pour tous les écrans de l'app,
            parfait pour prendre de beaux screenshots pour l'App Store.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Données générées
          </Text>

          <View style={styles.featuresList}>
            {[
              { icon: '📊', text: '6 onglets Stats (Poids, Composition, Mensurations, Discipline, Performance, Vitalité)' },
              { icon: '⚖️', text: '180 jours (6 mois) de pesées avec composition complète - Transformation visible!' },
              { icon: '🏋️', text: 'Entraînements 4 clubs (JJB, Muscu, MMA, Grappling) avec logos' },
              { icon: '📓', text: 'Carnet: 10 benchmarks + 9 techniques JJB' },
              { icon: '🎮', text: 'Gamification: Grade Empereur, XP 9850, Niveau 24, Streak 178j' },
              { icon: '🎭', text: '15 avatars débloqués (Ninja, Samurai, Boxer, etc.)' },
              { icon: '🎖️', text: '24 badges + 3 défis quotidiens + 2 défis hebdo + 3 quêtes' },
              { icon: '🏆', text: 'Compétitions: 2 à venir + 3 palmares (Bronze, Argent, HYROX)' },
              { icon: '❤️', text: 'Apple Health: 180j pas (6000-18000), calories (350-1100), distance (5-15km), FC, SpO2, HRV' },
              { icon: '💧', text: 'Hydratation: 30 jours (2.2-3.5L/jour, aujourd\'hui 3.2L/3.5L)' },
              { icon: '😴', text: 'Sommeil: 180 nuits (7-9h, 26% profond, qualité 89%)' },
              { icon: '🔋', text: 'Charge: 14 jours + Batterie 180j (optimal 92%)' },
              { icon: '🍽️', text: 'Jeûne intermittent: 14 jours (16/8 et 18/6)' },
              { icon: '⏱️', text: 'Timer: 8 sessions (Combat, HIIT, EMOM, AMRAP, Tabata)' },
              { icon: '📸', text: '3 photos transformation + cartes de partage' },
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Warning */}
        <View style={[styles.warningCard, { backgroundColor: '#EF444415' }]}>
          <AlertTriangle size={20} color="#EF4444" />
          <Text style={[styles.warningText, { color: '#EF4444' }]}>
            Attention : Activer le mode screenshot écrasera toutes tes données actuelles.
            Pense à faire une sauvegarde avant si nécessaire.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          {!isEnabled ? (
            <TouchableOpacity
              style={[styles.activateButton, { backgroundColor: colors.accent }]}
              onPress={handleActivateScreenshotMode}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Camera size={20} color="#FFFFFF" />
                  <Text style={styles.activateButtonText}>
                    Activer le mode Screenshot
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.deactivateButton, { backgroundColor: '#EF4444' }]}
              onPress={handleDeactivateScreenshotMode}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Trash2 size={20} color="#FFFFFF" />
                  <Text style={styles.deactivateButtonText}>
                    Désactiver et effacer les données
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  buttonsContainer: {
    gap: 12,
  },
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deactivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  deactivateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cleanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
  },
  cleanButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cleanButtonSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
  },
  resetButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});
