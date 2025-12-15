import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, ArrowRight, ArrowLeft, ChevronLeft } from 'lucide-react-native';
import { theme } from '@/lib/theme';

interface ProgressPhoto {
  id: string;
  photo_url?: string; // Pour compatibilité
  file_uri?: string; // Format réel utilisé dans storage.ts
  date: string;
  weight?: number | null;
  notes?: string | null;
  created_at: string;
}

interface BeforeAfterComparisonProps {
  visible: boolean;
  onClose: () => void;
  photos: ProgressPhoto[];
}

export function BeforeAfterComparison({ visible, onClose, photos }: BeforeAfterComparisonProps) {
  const [selectedBefore, setSelectedBefore] = useState<ProgressPhoto | null>(null);
  const [selectedAfter, setSelectedAfter] = useState<ProgressPhoto | null>(null);
  const [step, setStep] = useState<'before' | 'after' | 'compare'>('before');

  const handleBeforeSelect = (photo: ProgressPhoto) => {
    setSelectedBefore(photo);
    setStep('after');
  };

  const handleAfterSelect = (photo: ProgressPhoto) => {
    setSelectedAfter(photo);
    setStep('compare');
  };

  const reset = () => {
    setSelectedBefore(null);
    setSelectedAfter(null);
    setStep('before');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Calculer toutes les statistiques de progression
  const weightDifference = selectedBefore && selectedAfter && selectedBefore.weight && selectedAfter.weight
    ? selectedAfter.weight - selectedBefore.weight
    : null;
  
  const weightDifferencePercent = selectedBefore && selectedAfter && selectedBefore.weight && selectedAfter.weight && selectedBefore.weight > 0
    ? ((weightDifference! / selectedBefore.weight) * 100)
    : null;
  
  const daysDifference = selectedBefore && selectedAfter
    ? Math.abs(
        Math.floor(
          (new Date(selectedAfter.date).getTime() - new Date(selectedBefore.date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;
  
  const averageWeightLossPerWeek = daysDifference && daysDifference > 0 && weightDifference && weightDifference < 0
    ? Math.abs((weightDifference / daysDifference) * 7)
    : null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Helper function to normalize image source (handle both file_uri and photo_url, and ensure proper URI format)
  const getImageSource = (photo: ProgressPhoto) => {
    const uri = photo.file_uri || photo.photo_url || '';
    // If it's already a URI (starts with file://, http://, https://, or data:), use it directly
    if (uri.startsWith('file://') || uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:')) {
      return { uri };
    }
    // If it's a local path without file:// prefix, add it
    if (uri && !uri.startsWith('/')) {
      return { uri: `file://${uri}` };
    }
    return { uri };
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {step === 'before' ? (
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => {
              if (step === 'after') {
                setStep('before');
                setSelectedBefore(null);
              } else if (step === 'compare') {
                setStep('after');
                setSelectedAfter(null);
              }
            }} style={styles.backButton}>
              <ChevronLeft size={24} color={theme.colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>
            {step === 'before' && 'Choisir la photo AVANT'}
            {step === 'after' && 'Choisir la photo APRÈS'}
            {step === 'compare' && 'Comparaison'}
          </Text>
          {step !== 'before' && (
            <TouchableOpacity onPress={reset} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
          )}
          {step === 'before' && (
            <View style={styles.placeholderButton} />
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 'compare' && selectedBefore && selectedAfter ? (
            /* Vue de comparaison */
            <View style={styles.comparisonContainer}>
              {/* Comparaison côte à côte */}
              <View style={styles.comparisonRow}>
                <View style={styles.comparisonCard}>
                  <Text style={styles.comparisonLabel}>AVANT</Text>
                  <View style={styles.comparisonImageContainer}>
                  <Image
                      source={getImageSource(selectedBefore)}
                      style={[styles.comparisonImage, { height: '100%', width: '100%', backgroundColor: '#E1E1E1', borderRadius: 12 }]}
                    resizeMode="cover"
                  />
                  </View>
                  <View style={styles.comparisonInfo}>
                    <Text style={styles.comparisonDate} numberOfLines={1}>
                      {formatDate(selectedBefore.date)}
                    </Text>
                    {selectedBefore.weight ? (
                      <Text style={styles.comparisonWeight}>
                        {selectedBefore.weight.toFixed(1)} kg
                      </Text>
                    ) : (
                      <Text style={[styles.comparisonWeight, { opacity: 0.5 }]}>
                        Poids non renseigné
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.arrowContainer}>
                  <ArrowRight size={32} color={theme.colors.primary} strokeWidth={2.5} />
                </View>

                <View style={styles.comparisonCard}>
                  <Text style={styles.comparisonLabel}>APRÈS</Text>
                  <View style={styles.comparisonImageContainer}>
                  <Image
                      source={getImageSource(selectedAfter)}
                      style={[styles.comparisonImage, { height: '100%', width: '100%', backgroundColor: '#E1E1E1', borderRadius: 12 }]}
                    resizeMode="cover"
                  />
                  </View>
                  <View style={styles.comparisonInfo}>
                    <Text style={styles.comparisonDate} numberOfLines={1}>
                      {formatDate(selectedAfter.date)}
                    </Text>
                    {selectedAfter.weight ? (
                      <Text style={styles.comparisonWeight}>
                        {selectedAfter.weight.toFixed(1)} kg
                      </Text>
                    ) : (
                      <Text style={[styles.comparisonWeight, { opacity: 0.5 }]}>
                        Poids non renseigné
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Statistiques de Progression - Toujours affichées */}
              {selectedBefore && selectedAfter && (
                <View style={styles.statsCard}>
                  <Text style={styles.statsTitle}>📊 Progression</Text>
                  
                  {/* Ligne principale avec différence de poids et période */}
                  <View style={styles.statsRow}>
                    {weightDifference !== null ? (
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Différence de poids</Text>
                        <Text
                          style={[
                            styles.statValue,
                            { color: weightDifference < 0 ? theme.colors.primary : theme.colors.secondary },
                          ]}
                        >
                          {weightDifference > 0 ? '+' : ''}
                          {weightDifference.toFixed(1)} kg
                        </Text>
                        {weightDifferencePercent !== null && (
                          <Text style={[styles.statSubValue, { color: weightDifference < 0 ? theme.colors.primary : theme.colors.secondary }]}>
                            ({weightDifferencePercent > 0 ? '+' : ''}{weightDifferencePercent.toFixed(1)}%)
                          </Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Différence de poids</Text>
                        <Text style={[styles.statValue, { color: theme.colors.textSecondary }]}>
                          Non disponible
                        </Text>
                      </View>
                    )}
                    
                    {daysDifference !== null ? (
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Période</Text>
                        <Text style={styles.statValue}>
                          {daysDifference} {daysDifference === 1 ? 'jour' : 'jours'}
                        </Text>
                        {daysDifference >= 7 && (
                          <Text style={styles.statSubValue}>
                            ({Math.floor(daysDifference / 7)} {Math.floor(daysDifference / 7) === 1 ? 'semaine' : 'semaines'})
                          </Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Période</Text>
                        <Text style={[styles.statValue, { color: theme.colors.textSecondary }]}>
                          Non disponible
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Ligne supplémentaire avec statistiques avancées */}
                  {(averageWeightLossPerWeek !== null || weightDifference !== null) && (
                    <View style={styles.statsRow}>
                      {averageWeightLossPerWeek !== null && (
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Perte moyenne / semaine</Text>
                          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                            {averageWeightLossPerWeek.toFixed(2)} kg
                          </Text>
                        </View>
                      )}
                      
                      {selectedBefore.weight && selectedAfter.weight && (
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Poids initial → Final</Text>
                          <Text style={styles.statValue}>
                            {selectedBefore.weight.toFixed(1)} → {selectedAfter.weight.toFixed(1)} kg
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Message motivationnel basé sur la progression */}
                  {weightDifference !== null && weightDifference < 0 && daysDifference !== null && daysDifference > 0 && (
                    <View style={styles.motivationCard}>
                      <Text style={styles.motivationText}>
                        🎯 Excellent travail ! Vous avez perdu {Math.abs(weightDifference).toFixed(1)} kg en {daysDifference} {daysDifference === 1 ? 'jour' : 'jours'}.
                        {averageWeightLossPerWeek !== null && ` C'est une perte moyenne de ${averageWeightLossPerWeek.toFixed(2)} kg par semaine !`}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            /* Grille de sélection */
            <View style={styles.selectionGrid}>
              {photos
                .filter((photo) => {
                  if (step === 'after' && selectedBefore) {
                    // Pour l'étape "après", montrer toutes les photos SAUF celle déjà sélectionnée en "before"
                    return photo.id !== selectedBefore.id;
                  }
                  if (step === 'before' && selectedAfter) {
                    // Pour l'étape "before", ne pas montrer la photo déjà sélectionnée en "after"
                    return photo.id !== selectedAfter.id;
                  }
                  return true;
                })
                .map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    style={styles.selectionCard}
                    onPress={() => {
                      if (step === 'before') {
                        handleBeforeSelect(photo);
                      } else {
                        handleAfterSelect(photo);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={getImageSource(photo)}
                      style={[styles.selectionImage, { height: 150, width: '100%', backgroundColor: '#E1E1E1', borderRadius: 10 }]}
                      resizeMode="cover"
                    />
                    <View style={styles.selectionInfo}>
                      <Text style={styles.selectionDate}>{formatDate(photo.date)}</Text>
                      {photo.weight && (
                        <Text style={styles.selectionWeight}>{photo.weight.toFixed(1)} kg</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const screenWidth = Dimensions.get('window').width;
const selectionPhotoSize = (screenWidth - 64) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  placeholderButton: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  resetButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  resetButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  selectionCard: {
    width: selectionPhotoSize,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  selectionImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#E1E1E1',
    borderRadius: 10,
    resizeMode: 'cover',
  },
  selectionInfo: {
    padding: theme.spacing.md,
    gap: 4,
  },
  selectionDate: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  selectionWeight: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  comparisonContainer: {
    gap: theme.spacing.xl,
    width: '100%',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    width: '100%',
    minHeight: 420,
  },
  comparisonCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    overflow: 'visible',
    ...theme.shadow.md,
    minHeight: 380,
    width: '48%',
  },
  comparisonImageContainer: {
    height: 280,
    width: '100%',
    backgroundColor: '#E1E1E1',
    borderRadius: 12,
    overflow: 'hidden',
  },
  comparisonLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    textAlign: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.borderLight,
  },
  comparisonImage: {
    width: '100%',
    height: '100%', // Hérite de la hauteur du conteneur parent (280px)
    backgroundColor: '#E1E1E1',
    borderRadius: 12,
    resizeMode: 'cover',
  },
  comparisonInfo: {
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 20,
    paddingTop: 16,
    gap: 6,
    alignItems: 'center',
    minHeight: 60,
  },
  comparisonDate: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  comparisonWeight: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  arrowContainer: {
    paddingHorizontal: theme.spacing.xs,
  },
  statsCard: {
    backgroundColor: theme.colors.mintPastel,
    borderRadius: theme.radius.xxl,
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  statsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: theme.spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  statSubValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  motivationCard: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  motivationText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
