import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useFocusEffect, router } from 'expo-router';
import { Camera, ChevronRight, RefreshCw, ArrowRight, TrendingDown, TrendingUp, Calendar, Zap, Target, Award } from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { useTheme } from '@/lib/ThemeContext';
import { Photo, getPhotosFromStorage } from '@/lib/storage';
import logger from '@/lib/security/logger';

// ============================================
// MA TRANSFORMATION - COMPARAISON AVANT/APRES
// ============================================
// Ecran dedie pour visualiser sa progression

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TransformationScreen() {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBefore, setSelectedBefore] = useState<Photo | null>(null);
  const [selectedAfter, setSelectedAfter] = useState<Photo | null>(null);
  const [step, setStep] = useState<'select_before' | 'select_after' | 'compare'>('select_before');

  // Charger les photos
  const loadPhotos = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedPhotos = await getPhotosFromStorage();

      // DEBUG : Afficher les photos chargées
      logger.info('📸 Photos chargées:', fetchedPhotos.length);
      fetchedPhotos.forEach((photo, index) => {
        logger.info(`  Photo ${index + 1}:`, {
          id: photo.id,
          date: photo.date,
          weight: photo.weight,
          hasWeight: !!photo.weight,
        });
      });

      setPhotos(fetchedPhotos);

      // Auto-selectionner si assez de photos
      if (fetchedPhotos.length >= 2) {
        // Trier par date croissante pour avoir la plus ancienne en premier
        const sortedByDate = [...fetchedPhotos].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setSelectedBefore(sortedByDate[0]); // Plus ancienne
        setSelectedAfter(sortedByDate[sortedByDate.length - 1]); // Plus recente
        setStep('compare');
      }
    } catch (error) {
      logger.error('Erreur chargement photos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPhotos();
    }, [loadPhotos])
  );

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculer les stats
  const weightDifference = selectedBefore?.weight && selectedAfter?.weight
    ? selectedAfter.weight - selectedBefore.weight
    : null;

  const daysDifference = selectedBefore && selectedAfter
    ? Math.abs(
        Math.floor(
          (new Date(selectedAfter.date).getTime() - new Date(selectedBefore.date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  // Gestion de la selection
  const handleSelectPhoto = (photo: Photo) => {
    if (step === 'select_before') {
      setSelectedBefore(photo);
      setStep('select_after');
    } else if (step === 'select_after') {
      if (photo.id !== selectedBefore?.id) {
        setSelectedAfter(photo);
        setStep('compare');
      } else {
        showPopup('Photo identique', 'Choisis une photo differente pour la comparaison', [{ text: 'OK', style: 'primary' }]);
      }
    }
  };

  const resetSelection = () => {
    setSelectedBefore(null);
    setSelectedAfter(null);
    setStep('select_before');
  };

  // Pas assez de photos - Empty State amélioré
  if (!isLoading && photos.length < 2) {
    return (
      <ScreenWrapper>
        <Header title="Ma Transformation" showBack />
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.accent}15` }]}>
            <Camera size={48} color={colors.accent} strokeWidth={2} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Commence ta transformation
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Ajoute au moins 2 photos pour visualiser ta progression et te motiver !
          </Text>

          {/* Bénéfices */}
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: `${colors.gold}20` }]}>
                <Zap size={20} color={colors.gold} />
              </View>
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                Compare avant/après
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: `${colors.success}20` }]}>
                <Target size={20} color={colors.success} />
              </View>
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                Suis ta progression
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: `${colors.accent}20` }]}>
                <Award size={20} color={colors.accent} />
              </View>
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                Partage tes résultats
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/photos')}
            activeOpacity={0.8}
          >
            <Camera size={20} color={colors.textOnGold} />
            <Text style={[styles.emptyButtonText, { color: colors.textOnGold }]}>
              Ajouter mes photos
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // Chargement
  if (isLoading) {
    return (
      <ScreenWrapper>
        <Header title="Ma Transformation" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper noPadding>
      <Header
        title="Ma Transformation"
        showBack
        rightElement={
          step === 'compare' ? (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetSelection}
              activeOpacity={0.7}
            >
              <RefreshCw size={20} color={colors.gold} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* MODE COMPARAISON */}
        {step === 'compare' && selectedBefore && selectedAfter && (
          <>
            {/* Slider */}
            <BeforeAfterSlider
              before={{
                uri: selectedBefore.file_uri,
                date: selectedBefore.date,
                weight: selectedBefore.weight,
              }}
              after={{
                uri: selectedAfter.file_uri,
                date: selectedAfter.date,
                weight: selectedAfter.weight,
              }}
              height={450}
              showStats={true}
              showShareButton={true}
            />

            {/* Stats detaillees */}
            <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statsTitle, { color: colors.textPrimary }]}>
                Progression
              </Text>

              <View style={styles.statsGrid}>
                {/* Difference de poids */}
                {weightDifference !== null && (
                  <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
                    <View style={styles.statIconRow}>
                      {weightDifference <= 0 ? (
                        <TrendingDown size={20} color={colors.success} />
                      ) : (
                        <TrendingUp size={20} color={colors.danger} />
                      )}
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        Poids
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.statValue,
                        { color: weightDifference <= 0 ? colors.success : colors.danger },
                      ]}
                    >
                      {weightDifference > 0 ? '+' : ''}{weightDifference.toFixed(1)} kg
                    </Text>
                    {weightDifference < 0 && (
                      <Text style={styles.statEmoji}>Bravo !</Text>
                    )}
                  </View>
                )}

                {/* Duree */}
                {daysDifference !== null && (
                  <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
                    <View style={styles.statIconRow}>
                      <Calendar size={20} color={colors.gold} />
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        Duree
                      </Text>
                    </View>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {daysDifference} jours
                    </Text>
                    <Text style={[styles.statSub, { color: colors.textMuted }]}>
                      {Math.floor(daysDifference / 7)} semaines
                    </Text>
                  </View>
                )}
              </View>

              {/* Message de motivation */}
              {weightDifference !== null && weightDifference < 0 && (
                <View style={[styles.motivationBanner, { backgroundColor: colors.successMuted }]}>
                  <Text style={[styles.motivationText, { color: colors.success }]}>
                    Tu as perdu {Math.abs(weightDifference).toFixed(1)} kg en {daysDifference} jours !
                  </Text>
                </View>
              )}
            </View>

            {/* Selection rapide */}
            <View style={styles.quickSelectSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Changer de photos
              </Text>
              <View style={styles.quickSelectRow}>
                {/* Avant */}
                <TouchableOpacity
                  style={[styles.quickSelectCard, { backgroundColor: colors.card }]}
                  onPress={() => {
                    setStep('select_before');
                    setSelectedBefore(null);
                    setSelectedAfter(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: selectedBefore.file_uri }}
                    style={styles.quickSelectImage}
                    resizeMode="cover"
                  />
                  <View style={[styles.quickSelectBadge, { backgroundColor: colors.danger }]}>
                    <Text style={styles.quickSelectBadgeText}>AVANT</Text>
                  </View>
                  <Text style={[styles.quickSelectDate, { color: colors.textSecondary }]}>
                    {formatDateShort(selectedBefore.date)}
                  </Text>
                </TouchableOpacity>

                {/* Arrow */}
                <View style={styles.quickSelectArrow}>
                  <ArrowRight size={24} color={colors.gold} />
                </View>

                {/* Apres */}
                <TouchableOpacity
                  style={[styles.quickSelectCard, { backgroundColor: colors.card }]}
                  onPress={() => {
                    setStep('select_after');
                    setSelectedAfter(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: selectedAfter.file_uri }}
                    style={styles.quickSelectImage}
                    resizeMode="cover"
                  />
                  <View style={[styles.quickSelectBadge, { backgroundColor: colors.success }]}>
                    <Text style={styles.quickSelectBadgeText}>APRES</Text>
                  </View>
                  <Text style={[styles.quickSelectDate, { color: colors.textSecondary }]}>
                    {formatDateShort(selectedAfter.date)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* MODE SELECTION AVANT */}
        {step === 'select_before' && (
          <View style={styles.selectionSection}>
            <View style={styles.selectionHeader}>
              <View style={[styles.selectionBadge, { backgroundColor: '#EF444420' }]}>
                <Text style={[styles.selectionBadgeText, { color: '#EF4444' }]}>ÉTAPE 1/2</Text>
              </View>
            </View>
            <Text style={[styles.selectionTitle, { color: colors.textPrimary }]}>
              Choisis ta photo AVANT ⏪
            </Text>
            <Text style={[styles.selectionSubtitle, { color: colors.textSecondary }]}>
              Sélectionne la photo de départ de ta transformation
            </Text>

            <View style={styles.photoGrid}>
              {photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={[styles.photoCard, { backgroundColor: colors.card }]}
                  onPress={() => handleSelectPhoto(photo)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: photo.file_uri }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                  <View style={styles.photoInfo}>
                    <Text style={[styles.photoDate, { color: colors.textSecondary }]}>
                      {formatDate(photo.date)}
                    </Text>
                    {photo.weight && (
                      <Text style={[styles.photoWeight, { color: colors.gold }]}>
                        {photo.weight.toFixed(1)} kg
                      </Text>
                    )}
                  </View>
                  <View style={styles.selectIndicator}>
                    <ChevronRight size={20} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* MODE SELECTION APRES */}
        {step === 'select_after' && selectedBefore && (
          <View style={styles.selectionSection}>
            {/* Preview de la selection avant */}
            <View style={[styles.selectedPreview, { backgroundColor: colors.card }]}>
              <Image
                source={{ uri: selectedBefore.file_uri }}
                style={styles.selectedPreviewImage}
                resizeMode="cover"
              />
              <View style={styles.selectedPreviewInfo}>
                <View style={[styles.selectedBadge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.selectedBadgeText}>AVANT</Text>
                </View>
                <Text style={[styles.selectedDate, { color: colors.textSecondary }]}>
                  {formatDate(selectedBefore.date)}
                </Text>
                {selectedBefore.weight && (
                  <Text style={[styles.selectedWeight, { color: colors.textPrimary }]}>
                    {selectedBefore.weight.toFixed(1)} kg
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => {
                  setStep('select_before');
                  setSelectedBefore(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.changeButtonText, { color: colors.gold }]}>
                  Changer
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.selectionHeader}>
              <View style={[styles.selectionBadge, { backgroundColor: '#10B98120' }]}>
                <Text style={[styles.selectionBadgeText, { color: '#10B981' }]}>ÉTAPE 2/2</Text>
              </View>
            </View>
            <Text style={[styles.selectionTitle, { color: colors.textPrimary }]}>
              Choisis ta photo APRÈS ⏩
            </Text>
            <Text style={[styles.selectionSubtitle, { color: colors.textSecondary }]}>
              Sélectionne ta photo la plus récente
            </Text>

            <View style={styles.photoGrid}>
              {photos
                .filter((p) => p.id !== selectedBefore.id)
                .map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    style={[styles.photoCard, { backgroundColor: colors.card }]}
                    onPress={() => handleSelectPhoto(photo)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: photo.file_uri }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                    <View style={styles.photoInfo}>
                      <Text style={[styles.photoDate, { color: colors.textSecondary }]}>
                        {formatDate(photo.date)}
                      </Text>
                      {photo.weight && (
                        <Text style={[styles.photoWeight, { color: colors.gold }]}>
                          {photo.weight.toFixed(1)} kg
                        </Text>
                      )}
                    </View>
                    <View style={styles.selectIndicator}>
                      <ChevronRight size={20} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      <PopupComponent />
    </ScreenWrapper>
  );
}

const photoCardWidth = (SCREEN_WIDTH - 60) / 2;

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  // Empty State - Amélioré
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    gap: 20,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  benefitsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Header
  resetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Stats Card - Amélioré
  statsCard: {
    borderRadius: 24,
    padding: 24,
    marginTop: 20,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  statBox: {
    flex: 1,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statEmoji: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '700',
  },
  statSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  motivationBanner: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  motivationText: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Quick Select - Amélioré
  quickSelectSection: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  quickSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickSelectCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  quickSelectImage: {
    width: '100%',
    height: 120,
  },
  quickSelectBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickSelectBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  quickSelectDate: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 12,
  },
  quickSelectArrow: {
    paddingHorizontal: 8,
  },
  // Selection Section
  selectionSection: {
    gap: 12,
  },
  selectionHeader: {
    marginBottom: 4,
  },
  selectionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  selectionSubtitle: {
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 22,
  },
  photoGrid: {
    gap: 14,
  },
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    padding: 10,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  photoImage: {
    width: 90,
    height: 110,
    borderRadius: 14,
  },
  photoInfo: {
    flex: 1,
    gap: 6,
  },
  photoDate: {
    fontSize: 15,
    fontWeight: '700',
  },
  photoWeight: {
    fontSize: 20,
    fontWeight: '800',
  },
  selectIndicator: {
    paddingRight: 8,
    backgroundColor: 'transparent',
  },
  // Selected Preview - Amélioré
  selectedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    marginBottom: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedPreviewImage: {
    width: 70,
    height: 90,
    borderRadius: 12,
  },
  selectedPreviewInfo: {
    flex: 1,
    gap: 6,
  },
  selectedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  selectedDate: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  selectedWeight: {
    fontSize: 18,
    fontWeight: '800',
  },
  changeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  changeButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
