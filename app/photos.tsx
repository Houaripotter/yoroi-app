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
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera, Image as ImageIcon, GitCompare, Plus, X, Shield, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useFocusEffect, router } from 'expo-router';
import { BeforeAfterComparison } from '@/components/BeforeAfterComparison';
import { Photo, savePhotoToStorage, getPhotosFromStorage, deletePhotoFromStorage, getLatestMeasurement, getUserSettings, saveUserSettings } from '@/lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';

const PRIVACY_CHALLENGE_KEY = '@yoroi_privacy_challenge_shown';

export default function PhotosScreen() {
  const { colors: themeColors, isDark } = useTheme();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [comparisonVisible, setComparisonVisible] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false); // Option flouter la galerie
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

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

  // Vérifier si le Privacy Challenge a déjà été montré
  const checkPrivacyChallenge = useCallback(async () => {
    try {
      const hasSeenChallenge = await AsyncStorage.getItem(PRIVACY_CHALLENGE_KEY);
      if (!hasSeenChallenge) {
        setPrivacyModalVisible(true);
        await AsyncStorage.setItem(PRIVACY_CHALLENGE_KEY, 'true');
        return false; // Ne pas continuer, attendre la confirmation
      }
      return true; // Déjà montré, continuer
    } catch (error) {
      console.error('Erreur vérification Privacy Challenge:', error);
      return true; // En cas d'erreur, continuer
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPhotos();
      checkPrivacyChallenge(); // On ignore le retour ici, on veut juste vérifier et afficher le modal si nécessaire
    }, [fetchPhotos, checkPrivacyChallenge])
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
    // Vérifier si on doit afficher le Privacy Challenge
    const canContinue = await checkPrivacyChallenge();
    if (!canContinue) return; // Le modal va s'afficher, l'utilisateur pourra réessayer après

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
        { text: 'Prendre une photo', onPress: takePhoto },
        { text: 'Choisir depuis la galerie', onPress: pickImage },
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
      <View style={[styles.container, styles.centered, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Chargement des photos...</Text>
      </View>
    );
  }

  return (
    <ScreenWrapper noPadding>
      <Header
        title="Photos de Progression"
        showBack
        rightElement={
          <TouchableOpacity
            style={styles.compareButton}
            onPress={openComparison}
            activeOpacity={0.7}
          >
            <GitCompare size={20} color={themeColors.gold} strokeWidth={2.5} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.gold}
            colors={[themeColors.gold]}
          />
        }
      >
        {/* Message de sécurité */}
        <View style={styles.securityCard}>
          <View style={styles.securityIconContainer}>
            <Shield size={24} color="#27AE60" strokeWidth={2.5} />
          </View>
          <View style={styles.securityTextContainer}>
            <Text style={[styles.securityTitle, { color: themeColors.textPrimary }]}>Coffre-fort local</Text>
            <Text style={[styles.securityText, { color: themeColors.textSecondary }]}>
              Vos photos sont stockées uniquement sur cet appareil. Elles ne sont jamais envoyées sur un serveur.
            </Text>
          </View>
        </View>

        {/* Boutons d'ajout - Caméra et Galerie */}
        <View style={styles.addButtonsContainer}>
          {/* Bouton Caméra */}
          <TouchableOpacity
            style={[styles.actionButton, styles.cameraButton]}
            onPress={takePhoto}
            activeOpacity={0.8}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Camera size={28} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.actionButtonText}>Caméra</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Bouton Galerie */}
          <TouchableOpacity
            style={[styles.actionButton, styles.galleryButton]}
            onPress={pickImage}
            activeOpacity={0.8}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <ImageIcon size={28} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.actionButtonText}>Galerie</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Bouton Flouter */}
        {photos.length > 0 && (
          <TouchableOpacity
            style={[styles.blurButton, isBlurred && styles.blurButtonActive]}
            onPress={() => setIsBlurred(!isBlurred)}
            activeOpacity={0.8}
          >
            {isBlurred ? (
              <>
                <Eye size={20} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.blurButtonText}>Afficher</Text>
              </>
            ) : (
              <>
                <EyeOff size={20} color={themeColors.textSecondary} strokeWidth={2.5} />
                <Text style={[styles.blurButtonText, { color: themeColors.textSecondary }]}>Flouter</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Grille de photos */}
        {photos.length === 0 ? (
          <View style={styles.emptyState}>
            <Camera size={48} color={themeColors.textMuted} strokeWidth={2} opacity={0.6} />
            <Text style={[styles.emptyStateTitle, { color: themeColors.textPrimary }]}>Aucune photo</Text>
            <Text style={[styles.emptyStateText, { color: themeColors.textSecondary }]}>
              Commencez à capturer votre progression en ajoutant votre première photo
            </Text>
          </View>
        ) : (
          <View style={styles.photoGrid}>
            {photos.map((photo) => (
              <TouchableOpacity 
                key={photo.id} 
                style={styles.photoCard}
                onPress={() => isBlurred && setIsBlurred(false)}
                activeOpacity={isBlurred ? 0.9 : 1}
              >
                <View style={styles.photoImageContainer}>
                  <Image
                    source={{ uri: photo.file_uri }}
                    style={[styles.photoImage, isBlurred && styles.photoImageBlurred]}
                    resizeMode="cover"
                    blurRadius={isBlurred ? 25 : 0}
                  />
                  {isBlurred && (
                    <View style={styles.blurOverlay}>
                      <EyeOff size={24} color="rgba(255,255,255,0.7)" />
                    </View>
                  )}
                </View>
                {!isBlurred && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeletePhoto(photo.id)}
                    activeOpacity={0.7}
                  >
                    <X size={18} color="#FFFFFF" strokeWidth={2.5} />
                  </TouchableOpacity>
                )}
                <View style={styles.photoInfo}>
                  <Text style={styles.photoDate}>
                    {new Date(photo.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  {!isBlurred && (
                    <>
                      {photo.weight && (
                        <Text style={styles.photoWeight}>{photo.weight.toFixed(1)} kg</Text>
                      )}
                      {photo.notes && (
                        <Text style={styles.photoNotes} numberOfLines={1}>{photo.notes}</Text>
                      )}
                    </>
                  )}
                </View>
              </TouchableOpacity>
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

      {/* Modal Privacy Challenge */}
      <Modal
        visible={privacyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <View style={styles.modalHeader}>
              <Shield size={32} color="#27AE60" strokeWidth={2.5} />
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Test de Confiance</Text>
            </View>
            <Text style={[styles.modalText, { color: themeColors.textSecondary }]}>
              Passez en mode avion et essayez d'ajouter une photo. Vous verrez que ça marche, car tout reste sur votre téléphone. Aucune donnée ne part dans le cloud.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: themeColors.primary }]}
              onPress={() => setPrivacyModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Compris</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const screenWidth = Dimensions.get('window').width;
const photoSize = (screenWidth - 64) / 3;

// Constantes non-thématiques
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
const RADIUS = { md: 12, lg: 16, xl: 20, xxl: 24, full: 9999 };
const FONT_SIZE = { xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 22, display: 28 };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.display,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  compareButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F5',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: '#27AE6030',
  },
  securityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#27AE6020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTextContainer: {
    flex: 1,
  },
  securityTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#27AE60',
    marginBottom: 4,
  },
  securityText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    color: '#1E8449',
    lineHeight: FONT_SIZE.sm * 1.4,
  },
  // Nouveaux boutons Caméra et Galerie
  addButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
    borderRadius: RADIUS.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 120,
  },
  cameraButton: {
    backgroundColor: '#8B5CF6', // Violet/Purple
  },
  galleryButton: {
    backgroundColor: '#10B981', // Vert/Green
  },
  actionButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  blurButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: '#636E72',
  },
  blurButtonActive: {
    backgroundColor: '#636E72',
    borderColor: '#636E72',
  },
  blurButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl * 2,
    gap: SPACING.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 16,
  },
  modalHeader: {
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyStateTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: FONT_SIZE.md * 1.5,
    paddingHorizontal: SPACING.xl,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  photoCard: {
    width: photoSize,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  photoImageContainer: {
    position: 'relative',
    width: '100%',
    height: photoSize * 1.3,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoImageBlurred: {
    opacity: 0.8,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: RADIUS.full,
    padding: SPACING.xs,
    zIndex: 10,
  },
  photoInfo: {
    padding: SPACING.sm,
    gap: 2,
  },
  photoDate: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  photoWeight: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  photoNotes: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
    opacity: 0.7,
    marginTop: 2,
  },
});
