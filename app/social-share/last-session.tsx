// ============================================
// YOROI - DERNIÈRE SÉANCE (Style Strava)
// Template avec PHOTO USER mise en avant
// "J'ai réalisé..." pour faire fureur sur Instagram
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Camera,
  Image as ImageIcon,
  Share2,
  Download,
  Calendar,
  Clock,
  Flame,
  MapPin,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings } from '@/lib/database';
import { SPORTS } from '@/lib/sports';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = (CARD_WIDTH * 16) / 9; // Format Story 9:16

export default function LastSessionScreen() {
  const { colors, isDark } = useTheme();
  const cardRef = useRef<View>(null);

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTraining, setLastTraining] = useState<any>(null);
  const [transparentMode, setTransparentMode] = useState(false); // Mode transparent pour TikTok

  // ============================================
  // CHARGER DERNIÈRE SÉANCE
  // ============================================

  useEffect(() => {
    loadLastSession();
  }, []);

  const loadLastSession = async () => {
    try {
      const trainings = await getTrainings();
      if (trainings && trainings.length > 0) {
        const last = trainings[0]; // La plus récente
        setLastTraining(last);
      }
    } catch (error) {
      logger.error('[LAST_SESSION] Erreur chargement:', error);
    }
  };

  // ============================================
  // UPLOAD PHOTO USER
  // ============================================

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setUserPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger la photo');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Autorise l\'accès à la caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setUserPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  // ============================================
  // PARTAGE & TÉLÉCHARGEMENT
  // ============================================

  const shareToSocial = async () => {
    if (!cardRef.current) return;

    try {
      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: 1920,
        result: 'tmpfile',
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partage ta séance Yoroi',
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Erreur', 'Le partage n\'est pas disponible');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de partager');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = async () => {
    if (!cardRef.current) return;

    try {
      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Autorise l\'accès à la galerie');
        setIsProcessing(false);
        return;
      }

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: 1920,
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Succès', 'Image sauvegardée !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const getSportName = (sportId: string) => {
    const sport = SPORTS.find(s => s.id === sportId);
    return sport ? sport.name : sportId;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins}min` : `${mins}min`;
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Dernière Séance
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Fais-toi remarquer !
          </Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        {/* Boutons Upload Photo */}
        <View style={styles.uploadSection}>
          <TouchableOpacity
            style={[styles.uploadBtn, { backgroundColor: colors.accent }]}
            onPress={takePhoto}
            activeOpacity={0.85}
          >
            <Camera size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.uploadBtnText}>Prendre une photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.uploadBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 2 }]}
            onPress={pickImage}
            activeOpacity={0.85}
          >
            <ImageIcon size={20} color={colors.accent} strokeWidth={2.5} />
            <Text style={[styles.uploadBtnTextSecondary, { color: colors.accent }]}>Galerie</Text>
          </TouchableOpacity>
        </View>

        {/* Toggle Mode Transparent */}
        <View style={styles.transparentSection}>
          <TouchableOpacity
            style={[styles.transparentToggle, { backgroundColor: colors.card, borderColor: transparentMode ? colors.accent : colors.border }]}
            onPress={() => {
              setTransparentMode(!transparentMode);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.toggleCircle, transparentMode && { backgroundColor: colors.accent }]}>
              {transparentMode && <Text style={styles.toggleCheck}>✓</Text>}
            </View>
            <View style={styles.toggleTextContainer}>
              <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Mode Transparent</Text>
              <Text style={[styles.toggleSubtitle, { color: colors.textMuted }]}>Pour TikTok & vidéos</Text>
            </View>
          </TouchableOpacity>
          {transparentMode && (
            <View style={[styles.infoBox, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '30' }]}>
              <Text style={[styles.infoText, { color: colors.accent }]}>
                💡 Colle ce sticker transparent sur tes vidéos TikTok/Instagram !
              </Text>
            </View>
          )}
        </View>

        {/* Preview Card */}
        <View ref={cardRef} collapsable={false} style={styles.cardContainer}>
          <View style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT, backgroundColor: transparentMode ? 'transparent' : undefined }]}>
            {/* Background avec photo user ou placeholder (caché en mode transparent) */}
            {!transparentMode && (
              <>
                {userPhoto ? (
                  <Image source={{ uri: userPhoto }} style={styles.userPhoto} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={['#8B5CF6', '#A78BFA', '#C4B5FD']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.placeholderGradient}
                  >
                    <Camera size={80} color="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                    <Text style={styles.placeholderText}>TA PHOTO</Text>
                    <Text style={styles.placeholderSubtext}>Fais-toi remarquer !</Text>
                  </LinearGradient>
                )}

                {/* Gradient UNIQUEMENT en bas pour le texte */}
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
                  locations={[0, 0.5, 0.8, 1]}
                  style={styles.overlay}
                />
              </>
            )}

            {/* Fond dégradé en mode transparent pour la lisibilité */}
            {transparentMode && (
              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
                locations={[0, 0.5, 1]}
                style={styles.overlay}
              />
            )}

            {/* Contenu */}
            <View style={styles.cardContent}>
              {/* Header "J'ai réalisé" */}
              <View style={styles.cardHeader}>
                <Text style={styles.tagline}>J'AI RÉALISÉ</Text>
              </View>

              {/* Info séance */}
              {lastTraining ? (
                <View style={styles.sessionInfo}>
                  <Text style={styles.sportName}>{getSportName(lastTraining.sportId)}</Text>

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Calendar size={16} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.statText}>{formatDate(lastTraining.date)}</Text>
                    </View>

                    {lastTraining.duration && (
                      <View style={styles.statItem}>
                        <Clock size={16} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.statText}>{formatDuration(lastTraining.duration)}</Text>
                      </View>
                    )}

                    {lastTraining.intensity && (
                      <View style={styles.statItem}>
                        <Flame size={16} color="#F59E0B" strokeWidth={2.5} />
                        <Text style={styles.statText}>Intensité {lastTraining.intensity}/10</Text>
                      </View>
                    )}
                  </View>

                  {lastTraining.clubName && (
                    <View style={styles.statItem}>
                      <MapPin size={16} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.statText}>{lastTraining.clubName}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.sessionInfo}>
                  <Text style={styles.sportName}>Ta dernière séance</Text>
                  <Text style={styles.statText}>Ajoute un entraînement pour le voir ici</Text>
                </View>
              )}

              {/* Logo Yoroi */}
              <View style={styles.logoContainer}>
                <View style={styles.logoBadge}>
                  <Text style={styles.logoText}>YOROI</Text>
                  <Text style={styles.logoSubtext}>Suivi de poids & Sport</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {userPhoto && (
            <TouchableOpacity
              style={[styles.changeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={pickImage}
              activeOpacity={0.85}
            >
              <ImageIcon size={18} color={colors.textSecondary} strokeWidth={2.5} />
              <Text style={[styles.changeBtnText, { color: colors.textSecondary }]}>
                Changer la photo
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.mainActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={downloadImage}
              disabled={isProcessing}
              activeOpacity={0.85}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <>
                  <Download size={20} color={colors.accent} strokeWidth={2.5} />
                  <Text style={[styles.actionBtnText, { color: colors.accent }]}>
                    Télécharger
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnPrimary, { backgroundColor: colors.accent }]}
              onPress={shareToSocial}
              disabled={isProcessing}
              activeOpacity={0.85}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Share2 size={20} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.actionBtnTextPrimary}>Partager</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Upload Section
  uploadSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uploadBtnTextSecondary: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Transparent Toggle
  transparentSection: {
    marginBottom: 24,
  },
  transparentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCheck: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  toggleSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // Card
  cardContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  userPhoto: {
    width: '100%',
    height: '100%',
  },
  placeholderGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 28,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
  },
  placeholderSubtext: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Card Content
  cardContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 24,
    justifyContent: 'space-between',
  },
  cardHeader: {
    alignItems: 'flex-start',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  // Session Info
  sessionInfo: {
    gap: 12,
  },
  sportName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
  },
  logoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 2,
  },
  logoSubtext: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    marginTop: 2,
  },

  // Actions
  actions: {
    gap: 12,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  changeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mainActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  actionBtnTextPrimary: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
