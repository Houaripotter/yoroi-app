import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Camera, ChevronRight, RefreshCw, ArrowRight, TrendingDown, TrendingUp, Calendar } from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { useTheme } from '@/lib/ThemeContext';
import { Photo, getPhotosFromStorage } from '@/lib/storage';

// ============================================
// MA TRANSFORMATION - COMPARAISON AVANT/APRES
// ============================================
// Ecran dedie pour visualiser sa progression

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TransformationScreen() {
  const { colors } = useTheme();
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
      console.error('Erreur chargement photos:', error);
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
        Alert.alert('Photo identique', 'Choisis une photo differente pour la comparaison');
      }
    }
  };

  const resetSelection = () => {
    setSelectedBefore(null);
    setSelectedAfter(null);
    setStep('select_before');
  };

  // Pas assez de photos
  if (!isLoading && photos.length < 2) {
    return (
      <ScreenWrapper>
        <Header title="Ma Transformation" showBack />
        <View style={styles.emptyContainer}>
          <Camera size={64} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Pas assez de photos
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Ajoute au moins 2 photos de progression pour utiliser la comparaison avant/apres
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.gold }]}
            onPress={() => router.push('/photos')}
            activeOpacity={0.8}
          >
            <Text style={[styles.emptyButtonText, { color: colors.background }]}>
              Ajouter des photos
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
            <Text style={[styles.selectionTitle, { color: colors.textPrimary }]}>
              Choisis ta photo AVANT
            </Text>
            <Text style={[styles.selectionSubtitle, { color: colors.textSecondary }]}>
              Selectionne la photo de depart de ta transformation
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

            <Text style={[styles.selectionTitle, { color: colors.textPrimary }]}>
              Choisis ta photo APRES
            </Text>
            <Text style={[styles.selectionSubtitle, { color: colors.textSecondary }]}>
              Selectionne ta photo la plus recente
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
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Header
  resetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Stats Card
  statsCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    gap: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statEmoji: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  statSub: {
    fontSize: 12,
  },
  motivationBanner: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  motivationText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Quick Select
  quickSelectSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  quickSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickSelectCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickSelectImage: {
    width: '100%',
    height: 100,
  },
  quickSelectBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickSelectBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  quickSelectDate: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 10,
  },
  quickSelectArrow: {
    paddingHorizontal: 12,
  },
  // Selection Section
  selectionSection: {
    gap: 12,
  },
  selectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  selectionSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  photoGrid: {
    gap: 12,
  },
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 8,
    gap: 12,
  },
  photoImage: {
    width: 80,
    height: 100,
    borderRadius: 12,
  },
  photoInfo: {
    flex: 1,
    gap: 4,
  },
  photoDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  photoWeight: {
    fontSize: 18,
    fontWeight: '700',
  },
  selectIndicator: {
    paddingRight: 8,
  },
  // Selected Preview
  selectedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    gap: 12,
  },
  selectedPreviewImage: {
    width: 60,
    height: 80,
    borderRadius: 10,
  },
  selectedPreviewInfo: {
    flex: 1,
    gap: 4,
  },
  selectedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  selectedDate: {
    fontSize: 12,
    marginTop: 4,
  },
  selectedWeight: {
    fontSize: 16,
    fontWeight: '700',
  },
  changeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
