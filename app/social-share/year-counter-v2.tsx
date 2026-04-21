// ============================================ 
// YOROI - YEAR COUNTER V2 (Design VictoryShareModal) 
// ============================================ 
// Design identique au VictoryShareModal avec Photo/Sombre/Clair

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import {
  X,
  Share2,
  Download,
  Camera,
  Image as ImageIcon,
  Trophy,
} from 'lucide-react-native';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { saveToLibraryAsync, requestPermissionsAsync } from 'expo-media-library';
import { launchImageLibraryAsync, launchCameraAsync, requestMediaLibraryPermissionsAsync, requestCameraPermissionsAsync } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { captureRef } from 'react-native-view-shot';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { YearCounterCardV2 } from '@/components/social-cards/YearCounterCardV2';
import { useYearStats } from '@/lib/social-cards/useYearStats';
import logger from '@/lib/security/logger';
import { useCustomPopup } from '@/components/CustomPopup';
import { getProfile, calculateStreak } from '@/lib/database';
import { useAvatar } from '@/lib/AvatarContext';
import { getCurrentRank } from '@/lib/ranks';
import { getUnifiedPoints } from '@/lib/gamification';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function YearCounterV2Screen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { avatarImage: contextAvatar } = useAvatar();
  const cardRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { showPopup, PopupComponent } = useCustomPopup();

  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
  const [selectedTemplate, setSelectedTemplate] = useState<'dark' | 'light' | 'photo'>('dark');
  const [isLandscapeImage, setIsLandscapeImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // User data
  const [userName, setUserName] = useState<string>('');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<any>(null);
  const [userRank, setUserRank] = useState<string>('Ashigaru');
  const [userLevel, setUserLevel] = useState<number>(1);

  const currentYear = new Date().getFullYear();
  const { stats, isLoading: statsLoading, error } = useYearStats(currentYear);

  // Charger les données utilisateur au montage
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [profile, streak] = await Promise.all([
          getProfile(),
          calculateStreak(),
        ]);

        if (profile) {
          setUserName(profile.name || '');
          if (profile.profile_photo) {
            setUserPhoto(profile.profile_photo);
          }
        }

        if (contextAvatar) {
          setUserAvatar(contextAvatar);
        }

        const totalPoints = await getUnifiedPoints();
        const rank = getCurrentRank(totalPoints);
        setUserRank(rank.name);
        setUserLevel(totalPoints);
      } catch (error) {
        logger.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // ============================================
  // PHOTO PICKER
  // ============================================

  const resizeForCard = async (uri: string): Promise<string> => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    } catch {
      return uri;
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPopup(t('yearCounter.permDenied'), t('yearCounter.permCameraMsg'), [{ text: t('yearCounter.ok'), style: 'primary' }]);
        return;
      }

      const result = await launchCameraAsync({
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        impactAsync(ImpactFeedbackStyle.Light);
        const finalUri = await resizeForCard(asset.uri);
        setBackgroundImage(finalUri);
        setSelectedTemplate('photo');
        const isLandscape = (asset.width || 0) > (asset.height || 0);
        setIsLandscapeImage(isLandscape);
      }
    } catch (error) {
      logger.error('Erreur photo:', error);
      showPopup(t('yearCounter.errorTitle'), t('yearCounter.errorShare'), [{ text: t('yearCounter.ok'), style: 'primary' }]);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await requestMediaLibraryPermissionsAsync();
      if ((status as string) !== 'granted' && (status as string) !== 'limited') {
        showPopup(t('yearCounter.permDenied'), t('yearCounter.permGalleryMsg'), [{ text: t('yearCounter.ok'), style: 'primary' }]);
        return;
      }

      const result = await launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.85,
        base64: false,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        impactAsync(ImpactFeedbackStyle.Light);
        const finalUri = await resizeForCard(asset.uri);
        setBackgroundImage(finalUri);
        setSelectedTemplate('photo');
        const isLandscape = (asset.width || 0) > (asset.height || 0);
        setIsLandscapeImage(isLandscape);
      }
    } catch (error) {
      logger.error('Erreur galerie:', error);
      showPopup(t('yearCounter.errorTitle'), t('yearCounter.errorSave'), [{ text: t('yearCounter.ok'), style: 'primary' }]);
    }
  };

  // ============================================ 
  // SHARE & SAVE 
  // ============================================ 

  const shareCard = async () => {
    if (!cardRef.current) return;

    setIsLoading(true);
    impactAsync(ImpactFeedbackStyle.Medium);

    try {
      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      const available = await isAvailableAsync();
      if (available) {
        await shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager mon Compteur Annuel',
        });
      } else {
        const { status } = await requestPermissionsAsync();
        if (status === 'granted') {
          await saveToLibraryAsync(uri);
          notificationAsync(NotificationFeedbackType.Success);
          showPopup(t('yearCounter.imageSaved'), t('yearCounter.imageSavedMsg'), [{ text: t('yearCounter.ok'), style: 'primary' }]);
        } else {
          showPopup(t('yearCounter.shareUnavailable'), t('yearCounter.shareUnavailableMsg'), [{ text: t('yearCounter.ok'), style: 'primary' }]);
        }
      }
    } catch (error) {
      logger.error('Error sharing:', error);
      showPopup(t('yearCounter.errorTitle'), t('yearCounter.errorShare'), [{ text: t('yearCounter.ok'), style: 'primary' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToGallery = async () => {
    if (!cardRef.current) return;

    setIsLoading(true);
    impactAsync(ImpactFeedbackStyle.Medium);

    try {
      const { status } = await requestPermissionsAsync();
      if ((status as string) !== 'granted' && (status as string) !== 'limited') {
        showPopup(t('yearCounter.permDenied'), t('yearCounter.permSaveMsg'), [{ text: t('yearCounter.ok'), style: 'primary' }]);
        setIsLoading(false);
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      await saveToLibraryAsync(uri);
      notificationAsync(NotificationFeedbackType.Success);
      showPopup(t('yearCounter.saved'), t('yearCounter.savedMsg'), [{ text: t('yearCounter.ok'), style: 'primary' }]);
    } catch (error) {
      logger.error('Error saving:', error);
      showPopup(t('yearCounter.errorTitle'), t('yearCounter.errorSave'), [{ text: t('yearCounter.ok'), style: 'primary' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get background type for card component
  const getBackgroundType = (): 'photo' | 'black' | 'white' => {
    if (selectedTemplate === 'photo' && backgroundImage) return 'photo';
    if (selectedTemplate === 'light') return 'white';
    return 'black';
  };

  // ============================================ 
  // RENDER 
  // ============================================ 

  if (statsLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('yearCounter.loadingStats')}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error || !stats) {
    return (
      <ScreenWrapper>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>
            {error || 'Impossible de charger les statistiques'}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.card }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>{t('yearCounter.back')}</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  if (stats.totalDays === 0) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {t('yearCounter.noDataTitle').replace('{{year}}', String(currentYear))}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('yearCounter.noDataText')}
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/add-training')}
          >
            <Text style={[styles.addButtonText, { color: colors.textOnGold }]}>
              {t('yearCounter.addTraining')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Trophy size={20} color="#F59E0B" />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {t('yearCounter.year')} {currentYear}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Scrollable Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Preview */}
          <View style={styles.cardContainer}>
            <YearCounterCardV2
              ref={cardRef}
              stats={stats}
              format="stories"
              backgroundImage={selectedTemplate === 'photo' ? backgroundImage : undefined}
              backgroundType={getBackgroundType()}
              isLandscape={isLandscapeImage}
              username={userName}
              userAvatar={userAvatar}
              profilePhoto={userPhoto}
              rank={userRank}
              userLevel={userLevel}
            />
          </View>

          {/* Template Selector */}
          <View style={styles.templateRow}>
            <Text style={[styles.templateLabel, { color: colors.textMuted }]}>{t('yearCounter.styleLabel')}</Text>
            {([
              { key: 'photo', label: t('yearCounter.stylePhoto') },
              { key: 'dark', label: t('yearCounter.styleDark') },
              { key: 'light', label: t('yearCounter.styleLight') },
            ] as const).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.templateBtn,
                  {
                    backgroundColor: selectedTemplate === key ? colors.accent : colors.backgroundCard,
                    borderColor: selectedTemplate === key ? colors.accent : colors.border,
                  }
                ]}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setSelectedTemplate(key);
                  // Si on sélectionne Photo et pas d\'image, scroll vers le bas pour montrer les options
                  if (key === 'photo' && !backgroundImage) {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }
                }}
              >
                <Text style={[
                  styles.templateBtnText,
                  { color: selectedTemplate === key ? colors.textOnAccent : colors.textPrimary }
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Photo Actions - Show picker when NO photo, show change buttons when photo exists */}
          {selectedTemplate === 'photo' && !backgroundImage && (
            <View style={styles.photoPickerContainer}>
              <Text style={[styles.photoPickerTitle, { color: colors.textPrimary }]}>
                {t('yearCounter.addPhoto')}
              </Text>
              <View style={styles.photoPickerButtons}>
                <TouchableOpacity
                  style={[styles.photoPickerBtn, { backgroundColor: colors.accent }]}
                  onPress={takePhoto}
                >
                  <Camera size={20} color={colors.textOnAccent} />
                  <Text style={[styles.photoPickerBtnText, { color: colors.textOnAccent }]}>{t('yearCounter.photoBtn')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoPickerBtn, { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: colors.border }]}
                  onPress={pickImage}
                >
                  <ImageIcon size={20} color={colors.textPrimary} />
                  <Text style={[styles.photoPickerBtnText, { color: colors.textPrimary }]}>{t('yearCounter.galleryBtn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {selectedTemplate === 'photo' && backgroundImage && (
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                onPress={pickImage}
              >
                <ImageIcon size={18} color={colors.textPrimary} />
                <Text style={[styles.photoBtnText, { color: colors.textPrimary }]}>{t('yearCounter.changeBtn')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                onPress={takePhoto}
              >
                <Camera size={18} color={colors.textPrimary} />
                <Text style={[styles.photoBtnText, { color: colors.textPrimary }]}>{t('yearCounter.newBtn')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Share Actions */}
          <View style={styles.shareActions}>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: colors.accent }]}
              onPress={shareCard}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.textOnAccent} />
              ) : (
                <>
                  <Share2 size={20} color={colors.textOnAccent} />
                  <Text style={[styles.shareBtnText, { color: colors.textOnAccent }]}>{t('yearCounter.shareBtn')}</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
              onPress={saveToGallery}
              disabled={isLoading}
            >
              <Download size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.skipBtn} onPress={() => router.back()}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>{t('yearCounter.close')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      <PopupComponent />
    </ScreenWrapper>
  );
}

// ============================================ 
// STYLES 
// ============================================ 

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  templateLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  templateBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  templateBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  photoPickerContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  photoPickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  photoPickerButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  photoPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  photoPickerBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
    justifyContent: 'center',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  saveBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});