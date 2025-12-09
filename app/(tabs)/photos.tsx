import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera, Image as ImageIcon, GitCompare, Plus, X } from 'lucide-react-native';
import { theme } from '@/lib/theme';
import { useFocusEffect, router } from 'expo-router';
import { BeforeAfterComparison } from '@/components/BeforeAfterComparison';
import { documentDirectory } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { Photo, savePhotoToStorage, getPhotosFromStorage, deletePhotoFromStorage, getLatestMeasurement } from '@/lib/storage';

export default function PhotosScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [comparisonVisible, setComparisonVisible] = useState(false);

  const fetchPhotos = useCallback(async () => {
    try {
      const fetchedPhotos = await getPhotosFromStorage();
      setPhotos(fetchedPhotos || []);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des photos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleDeletePhoto = useCallback(async (id: string) => {
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const success = await deletePhotoFromStorage(id);
            if (success) {
              fetchPhotos();
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } else {
              Alert.alert('Erreur', 'Impossible de supprimer la photo.');
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
            }
          },
        },
      ]
    );
  }, [fetchPhotos]);

  useFocusEffect(
    useCallback(() => {
      fetchPhotos();
    }, [fetchPhotos])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPhotos();
  }, [fetchPhotos]);

  const requestPermissions = async () => {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus.status !== 'granted' || mediaStatus.status !== 'granted') {
      Alert.alert(
        'Permissions requises',
        'Nous avons besoin d\'accéder à votre caméra et à votre galerie pour cette fonctionnalité.'
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const latestMeasurement = await getLatestMeasurement();
        await savePhotoToStorage(
          result.assets[0].uri,
          new Date().toISOString().split('T')[0],
          latestMeasurement?.weight
        );
        setUploading(false);
        fetchPhotos();
      }
    } catch (error) {
      console.error('❌ Erreur caméra:', error);
      setUploading(false);
    }
  };

  const pickImage = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const latestMeasurement = await getLatestMeasurement();
        await savePhotoToStorage(
          result.assets[0].uri,
          new Date().toISOString().split('T')[0],
          latestMeasurement?.weight
        );
        setUploading(false);
        fetchPhotos();
      }
    } catch (error) {
      console.error('❌ Erreur galerie:', error);
      setUploading(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Ajouter une photo',
      'Choisissez une option',
      [
        { text: '📷 Prendre une photo', onPress: takePhoto },
        { text: '🖼️ Choisir depuis la galerie', onPress: pickImage },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const openComparison = () => {
    if (photos.length < 2) {
      Alert.alert('Pas assez de photos', 'Ajoutez au moins 2 photos pour utiliser la comparaison');
      return;
    }
    setComparisonVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Chargement des photos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Photos de Progression</Text>
        <TouchableOpacity
          style={styles.compareButton}
          onPress={openComparison}
          activeOpacity={0.7}
        >
          <GitCompare size={20} color={theme.colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Bouton d'ajout */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={showPhotoOptions}
          activeOpacity={0.8}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.addButtonText}>Ajouter une photo</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Grille de photos */}
        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📸</Text>
            <Text style={styles.emptyStateTitle}>Aucune photo</Text>
            <Text style={styles.emptyStateText}>
              Commencez à capturer votre progression en ajoutant votre première photo
            </Text>
          </View>
        ) : (
          <View style={styles.photoGrid}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoCard}>
                <Image
                  source={{ uri: photo.file_uri }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePhoto(photo.id)}
                  activeOpacity={0.7}
                >
                  <X size={18} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={styles.photoInfo}>
                  <Text style={styles.photoDate}>
                    {new Date(photo.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  {photo.weight && (
                    <Text style={styles.photoWeight}>{photo.weight.toFixed(1)} kg</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de comparaison */}
      <BeforeAfterComparison
        visible={comparisonVisible}
        onClose={() => setComparisonVisible(false)}
        photos={photos}
      />
    </View>
  );
}

const screenWidth = Dimensions.get('window').width;
const photoSize = (screenWidth - 64) / 3; // 3 colonnes avec padding

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.display,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  compareButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    ...theme.shadow.md,
  },
  addButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.black,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl * 2,
    gap: theme.spacing.md,
  },
  emptyStateIcon: {
    fontSize: 64,
    opacity: 0.3,
    marginBottom: theme.spacing.md,
  },
  emptyStateTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.fontSize.md * 1.5,
    paddingHorizontal: theme.spacing.xl,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  photoCard: {
    width: photoSize,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  photoImage: {
    width: '100%',
    height: photoSize * 1.3,
    backgroundColor: theme.colors.borderLight,
  },
  deleteButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: theme.radius.full,
    padding: theme.spacing.xs,
    zIndex: 10,
  },
  photoInfo: {
    padding: theme.spacing.sm,
    gap: 2,
  },
  photoDate: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: 0.2,
  },
  photoWeight: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    letterSpacing: -0.2,
  },
});
