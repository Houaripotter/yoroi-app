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
import { X, ArrowRight } from 'lucide-react-native';
import { theme } from '@/lib/theme';

interface ProgressPhoto {
  id: string;
  photo_url: string;
  date: string;
  weight: number | null;
  notes: string | null;
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

  const weightDifference = selectedBefore && selectedAfter && selectedBefore.weight && selectedAfter.weight
    ? selectedAfter.weight - selectedBefore.weight
    : null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
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
                  <Image
                    source={{ uri: selectedBefore.photo_url }}
                    style={styles.comparisonImage}
                    resizeMode="cover"
                  />
                  <View style={styles.comparisonInfo}>
                    <Text style={styles.comparisonDate}>{formatDate(selectedBefore.date)}</Text>
                    {selectedBefore.weight && (
                      <Text style={styles.comparisonWeight}>{selectedBefore.weight.toFixed(1)} kg</Text>
                    )}
                  </View>
                </View>

                <View style={styles.arrowContainer}>
                  <ArrowRight size={32} color={theme.colors.primary} strokeWidth={2.5} />
                </View>

                <View style={styles.comparisonCard}>
                  <Text style={styles.comparisonLabel}>APRÈS</Text>
                  <Image
                    source={{ uri: selectedAfter.photo_url }}
                    style={styles.comparisonImage}
                    resizeMode="cover"
                  />
                  <View style={styles.comparisonInfo}>
                    <Text style={styles.comparisonDate}>{formatDate(selectedAfter.date)}</Text>
                    {selectedAfter.weight && (
                      <Text style={styles.comparisonWeight}>{selectedAfter.weight.toFixed(1)} kg</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Statistiques */}
              {weightDifference !== null && (
                <View style={styles.statsCard}>
                  <Text style={styles.statsTitle}>Progression</Text>
                  <View style={styles.statsRow}>
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
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Période</Text>
                      <Text style={styles.statValue}>
                        {Math.abs(
                          Math.floor(
                            (new Date(selectedAfter.date).getTime() - new Date(selectedBefore.date).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        )}{' '}
                        jours
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ) : (
            /* Grille de sélection */
            <View style={styles.selectionGrid}>
              {photos
                .filter((photo) => {
                  if (step === 'after' && selectedBefore) {
                    // Pour l'étape "après", ne montrer que les photos postérieures à celle sélectionnée
                    return new Date(photo.date) > new Date(selectedBefore.date);
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
                      source={{ uri: photo.photo_url }}
                      style={styles.selectionImage}
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
    height: selectionPhotoSize * 1.3,
    backgroundColor: theme.colors.borderLight,
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
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  comparisonCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    overflow: 'hidden',
    ...theme.shadow.md,
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
    aspectRatio: 3 / 4,
    backgroundColor: theme.colors.borderLight,
  },
  comparisonInfo: {
    padding: theme.spacing.md,
    gap: 4,
    alignItems: 'center',
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
});
