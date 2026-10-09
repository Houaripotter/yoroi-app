// ============================================
// YOROI - MONTHLY RECAP V2 (Design VictoryShareModal)
// ============================================
// Design identique au WeeklyRecapV2 avec Photo/Sombre/Clair

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  X,
  Share2,
  Download,
  Camera,
  Image as ImageIcon,
  Calendar,
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
import { MonthlyRecapCardV2 } from '@/components/social-cards/MonthlyRecapCardV2';
import { useMonthStats } from '@/lib/social-cards/useMonthStats';
import logger from '@/lib/security/logger';
import { useCustomPopup } from '@/components/CustomPopup';
import { getProfile, calculateStreak } from '@/lib/database';
import { useAvatar } from '@/lib/AvatarContext';
import { getCurrentRank } from '@/lib/ranks';
import { getUnifiedPoints } from '@/lib/gamification';
import { useI18n } from '@/lib/I18nContext';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function MonthlyRecapV2Screen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { avatarImage: contextAvatar } = useAvatar();
  const cardRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { showPopup, PopupComponent } = useCustomPopup();
  const { autoShare } = useLocalSearchParams<{ autoShare?: string }>();
  const autoShareTriggered = useRef(false);

  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
  const [selectedTemplate, setSelectedTemplate] = useState<'photo' | 'dark' | 'light'>('photo');
  const [backgroundType, setBackgroundType] = useState<'photo' | 'black' | 'white'>('black');
  const [isLandscapeImage, setIsLandscapeImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // User data
  const [userName, setUserName] = useState<string>('');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<any>(null);
  const [userRank, setUserRank] = useState<string>('Ashigaru');
  const [userLevel, setUserLevel] = useState<number>(1);

  // Charger les stats du mois actuel
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  const { stats, isLoading: statsLoading, error } = useMonthStats(currentYear, currentMonth);

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

  // Auto-partage si ouvert depuis une notification
  useEffect(() => {
    if (autoShare !== '1' || statsLoading || autoShareTriggered.current) return;
    autoShareTriggered.current = true;
    const timer = setTimeout(() => { shareCard(); }, 1200);
    return () => clearTimeout(timer);
  }, [autoShare, statsLoading]);

  // ============================================
  // PHOTO PICKER
  // ============================================

  const takePhoto = async () => {
    try {
      const { status } = await requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPopup(t('socialShare.permissionDeniedTitle'), t('socialShare.permissionDeniedCamera'), [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const result = await launchCameraAsync({
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        impactAsync(ImpactFeedbackStyle.Light);
        const resized = await resizeForCard(asset.uri);
        setBackgroundImage(resized);
        setSelectedTemplate('photo');
        const isLandscape = (asset.width || 0) > (asset.height || 0);
        setIsLandscapeImage(isLandscape);
      }
    } catch (error) {
      logger.error('Erreur photo:', error);
      showPopup(t('socialShare.errorTitle'), t('socialShare.errorPhoto'), [{ text: 'OK', style: 'primary' }]);
    }
  };

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

  const pickImage = async () => {
    try {
      const { status } = await requestMediaLibraryPermissionsAsync();
      if ((status as string) !== 'granted' && (status as string) !== 'limited') {
        showPopup(t('socialShare.permissionDeniedTitle'), t('socialShare.permissionDeniedGallery'), [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const result = await launchImageLibraryAsync({
        allowsEditing: false,
        quality: 1,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        impactAsync(ImpactFeedbackStyle.Light);
        const resized = await resizeForCard(asset.uri);
        setBackgroundImage(resized);
        setSelectedTemplate('photo');
        const isLandscape = (asset.width || 0) > (asset.height || 0);
        setIsLandscapeImage(isLandscape);
      }
    } catch (error) {
      logger.error('Erreur galerie:', error);
      showPopup(t('socialShare.errorTitle'), t('socialShare.errorGallery'), [{ text: 'OK', style: 'primary' }]);
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
          dialogTitle: t('socialShare.shareMonthDialog'),
        });
      } else {
        const { status } = await requestPermissionsAsync();
        if (status === 'granted') {
          await saveToLibraryAsync(uri);
          notificationAsync(NotificationFeedbackType.Success);
          showPopup(t('socialShare.imageSaved'), t('socialShare.imageSavedMsg'), [{ text: 'OK', style: 'primary' }]);
        } else {
          showPopup(t('socialShare.shareUnavailable'), t('socialShare.shareUnavailableMsg'), [{ text: 'OK', style: 'primary' }]);
        }
      }
    } catch (error) {
      logger.error('Error sharing:', error);
      showPopup(t('socialShare.errorTitle'), t('socialShare.errorShare'), [{ text: 'OK', style: 'primary' }]);
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
        showPopup(t('socialShare.permissionRequired'), t('socialShare.permissionGallery'), [{ text: 'OK', style: 'primary' }]);
        setIsLoading(false);
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      await saveToLibraryAsync(uri);
      notificationAsync(NotificationFeedbackType.Success);
      showPopup(t('socialShare.saved'), t('socialShare.savedMsg'), [{ text: 'OK', style: 'primary' }]);
    } catch (error) {
      logger.error('Error saving:', error);
      showPopup(t('socialShare.errorTitle'), t('socialShare.errorSave'), [{ text: 'OK', style: 'primary' }]);
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
            {t('socialShare.loadingStats')}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error || !stats) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {error || t('socialShare.cannotLoadStats')}
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.addButtonText, { color: colors.textOnGold }]}>{t('socialShare.back')}</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  if (stats.activeDays === 0) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {t('socialShare.noDataThisMonth').replace('{{month}}', stats.monthName).replace('{{year}}', String(stats.year))}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('socialShare.startTraining')}
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/add-training')}
          >
            <Text style={[styles.addButtonText, { color: colors.textOnGold }]}>{t('socialShare.addTraining')}</Text>
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
            <Calendar size={20} color={colors.accent} />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {t('socialShare.monthlyTitle')}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Preview */}
          <View style={styles.cardContainer}>
            <MonthlyRecapCardV2
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
            <Text style={[styles.templateLabel, { color: colors.textMuted }]}>{t('socialShare.styleLabel')}</Text>
            {([
              { key: 'photo', label: t('socialShare.stylePhoto') },
              { key: 'dark', label: t('socialShare.styleDark') },
              { key: 'light', label: t('socialShare.styleLight') },
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
                  // Scroll auto si photo
                  if (key === 'photo') {
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
                {t('socialShare.addYourPhoto')}
              </Text>
              <View style={styles.photoPickerButtons}>
                <TouchableOpacity
                  style={[styles.photoPickerBtn, { backgroundColor: colors.accent }]}
                  onPress={takePhoto}
                >
                  <Camera size={20} color={colors.textOnAccent} />
                  <Text style={[styles.photoPickerBtnText, { color: colors.textOnAccent }]}>{t('socialShare.photo')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoPickerBtn, { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: colors.border }]}
                  onPress={pickImage}
                >
                  <ImageIcon size={20} color={colors.textPrimary} />
                  <Text style={[styles.photoPickerBtnText, { color: colors.textPrimary }]}>{t('socialShare.gallery')}</Text>
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
                <Text style={[styles.photoBtnText, { color: colors.textPrimary }]}>{t('socialShare.change')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                onPress={takePhoto}
              >
                <Camera size={18} color={colors.textPrimary} />
                <Text style={[styles.photoBtnText, { color: colors.textPrimary }]}>{t('socialShare.newPhoto')}</Text>
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
                  <Text style={[styles.shareBtnText, { color: colors.textOnAccent }]}>{t('socialShare.share')}</Text>
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
            <Text style={[styles.skipText, { color: colors.textMuted }]}>{t('socialShare.close')}</Text>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
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

  // Card
  cardContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },

  // Template Selector
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  templateLabel: {
    fontSize: 13,
    marginRight: 8,
  },
  templateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  templateBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Photo Picker (when no photo selected)
  photoPickerContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  photoPickerTitle: {
    fontSize: 16,
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
    borderRadius: 12,
    gap: 8,
  },
  photoPickerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Photo Actions (when photo exists)
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
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

  // Share Actions
  shareActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  saveBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
  },
});
