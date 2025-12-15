import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Building2,
  Camera,
  Image as ImageIcon,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import { getClubs, addClub, updateClub, deleteClub, Club } from '@/lib/database';
import { SPORTS, getSportIcon, getSportColor, getSportName } from '@/lib/sports';

// ============================================
// GESTION DES CLUBS / SALLES
// ============================================

const CLUB_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E',
  '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6',
  '#A855F7', '#EC4899', '#6B7280', '#D4AF37',
];

export default function ClubsScreen() {
  const { colors, gradients } = useTheme();
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [selectedSport, setSelectedSport] = useState('jjb');
  const [selectedColor, setSelectedColor] = useState(CLUB_COLORS[0]);
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const loadClubs = useCallback(async () => {
    try {
      const data = await getClubs();
      setClubs(data);
    } catch (error) {
      console.error('Erreur chargement clubs:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClubs();
    }, [loadClubs])
  );

  const resetForm = () => {
    setName('');
    setSelectedSport('jjb');
    setSelectedColor(CLUB_COLORS[0]);
    setLogoUri(null);
    setEditingClub(null);
  };

  const handleOpenModal = (club?: Club) => {
    if (club) {
      setEditingClub(club);
      setName(club.name);
      setSelectedSport(club.sport);
      setSelectedColor(club.color || CLUB_COLORS[0]);
      setLogoUri(club.logo_uri || null);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const requestPermission = async (type: 'camera' | 'gallery') => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    }
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermission('gallery');
    if (!hasPermission) {
      Alert.alert('Permission requise', 'Autorisez l\'acces a la galerie pour ajouter un logo');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermission('camera');
    if (!hasPermission) {
      Alert.alert('Permission requise', 'Autorisez l\'acces a la camera pour prendre une photo');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Logo du club',
      'Comment voulez-vous ajouter le logo ?',
      [
        { text: 'Galerie', onPress: pickImageFromGallery },
        { text: 'Camera', onPress: takePhoto },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom du club est requis');
      return;
    }

    try {
      if (editingClub) {
        await updateClub(editingClub.id!, {
          name: name.trim(),
          sport: selectedSport,
          color: selectedColor,
          logo_uri: logoUri || undefined,
        });
      } else {
        await addClub({
          name: name.trim(),
          sport: selectedSport,
          color: selectedColor,
          logo_uri: logoUri || undefined,
        });
      }

      await loadClubs();
      handleCloseModal();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le club');
    }
  };

  const handleDelete = (club: Club) => {
    Alert.alert(
      'Supprimer le club ?',
      `Voulez-vous vraiment supprimer "${club.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClub(club.id!);
              await loadClubs();
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le club');
            }
          },
        },
      ]
    );
  };

  const renderClubLogo = (club: Club, size: number = 50) => {
    if (club.logo_uri) {
      return (
        <Image
          source={{ uri: club.logo_uri }}
          style={[styles.clubLogoImage, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
        />
      );
    }
    return (
      <View
        style={[
          styles.clubIcon,
          {
            backgroundColor: club.color || getSportColor(club.sport),
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Text style={[styles.clubEmoji, { fontSize: size * 0.48 }]}>{getSportIcon(club.sport)}</Text>
      </View>
    );
  };

  return (
    <ScreenWrapper noPadding>
      <Header
        title="Mes Clubs"
        showBack
        rightElement={
          <TouchableOpacity
            onPress={() => handleOpenModal()}
            style={styles.addButton}
          >
            <Plus size={24} color={colors.gold} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* DESCRIPTION */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Ajoute tes salles et clubs pour suivre tes entrainements
        </Text>

        {/* LISTE DES CLUBS */}
        {clubs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Building2 size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Aucun club</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Ajoute ton premier club ou salle de sport
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => handleOpenModal()}
            >
              <LinearGradient
                colors={gradients.gold}
                style={styles.emptyButtonGradient}
              >
                <Plus size={20} color={colors.background} />
                <Text style={[styles.emptyButtonText, { color: colors.background }]}>Ajouter un club</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Card>
        ) : (
          <View style={styles.clubsList}>
            {clubs.map((club) => (
              <Card key={club.id} style={styles.clubCard}>
                <View style={styles.clubRow}>
                  {renderClubLogo(club, 50)}

                  <View style={styles.clubInfo}>
                    <Text style={[styles.clubName, { color: colors.textPrimary }]}>{club.name}</Text>
                    <Text style={[styles.clubSport, { color: colors.textSecondary }]}>{getSportName(club.sport)}</Text>
                  </View>

                  <View style={styles.clubActions}>
                    <TouchableOpacity
                      onPress={() => handleOpenModal(club)}
                      style={[styles.actionButton, { backgroundColor: colors.cardHover }]}
                    >
                      <Edit3 size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(club)}
                      style={[styles.actionButton, { backgroundColor: colors.cardHover }]}
                    >
                      <Trash2 size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODAL AJOUT/EDITION */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleCloseModal} style={styles.modalClose}>
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {editingClub ? 'Modifier le club' : 'Nouveau club'}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.modalSave}>
              <Check size={24} color={colors.gold} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* LOGO */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Logo du club</Text>
              <View style={styles.logoSection}>
                <TouchableOpacity
                  style={styles.logoPreview}
                  onPress={showImageOptions}
                  activeOpacity={0.7}
                >
                  {logoUri ? (
                    <Image
                      source={{ uri: logoUri }}
                      style={styles.logoImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.logoPlaceholder, { backgroundColor: selectedColor }]}>
                      <Text style={styles.logoPlaceholderEmoji}>
                        {getSportIcon(selectedSport)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.logoEditBadge}>
                    <Camera size={14} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <View style={styles.logoButtons}>
                  <TouchableOpacity
                    style={styles.logoButton}
                    onPress={pickImageFromGallery}
                  >
                    <ImageIcon size={18} color={colors.gold} />
                    <Text style={styles.logoButtonText}>Galerie</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.logoButton}
                    onPress={takePhoto}
                  >
                    <Camera size={18} color={colors.gold} />
                    <Text style={styles.logoButtonText}>Camera</Text>
                  </TouchableOpacity>
                  {logoUri && (
                    <TouchableOpacity
                      style={[styles.logoButton, styles.logoButtonDelete]}
                      onPress={() => setLogoUri(null)}
                    >
                      <X size={18} color={colors.danger} />
                      <Text style={[styles.logoButtonText, { color: colors.danger }]}>
                        Supprimer
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* NOM */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom du club</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ex: Gracie Barra, Basic Fit..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* SPORT */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sport</Text>
              <View style={styles.sportsGrid}>
                {SPORTS.map((sport) => (
                  <TouchableOpacity
                    key={sport.id}
                    style={[
                      styles.sportItem,
                      selectedSport === sport.id && styles.sportItemActive,
                    ]}
                    onPress={() => setSelectedSport(sport.id)}
                  >
                    <Text style={styles.sportIcon}>{sport.icon}</Text>
                    <Text
                      style={[
                        styles.sportName,
                        selectedSport === sport.id && styles.sportNameActive,
                      ]}
                    >
                      {sport.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* COULEUR */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Couleur (si pas de logo)</Text>
              <View style={styles.colorsGrid}>
                {CLUB_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorItem,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorItemActive,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <Check size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* BOUTON ENREGISTRER */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <LinearGradient
                colors={gradients.gold}
                style={styles.saveButtonGradient}
              >
                <Text style={[styles.saveButtonText, { color: colors.background }]}>
                  {editingClub ? 'Mettre a jour' : 'Ajouter le club'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

// Constantes non-thématiques
const RADIUS = { sm: 8, md: 12 };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // HEADER
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },

  // EMPTY STATE
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // CLUBS LIST
  clubsList: {
    gap: 12,
  },
  clubCard: {
    padding: 0,
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  clubIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubLogoImage: {},
  clubEmoji: {
    textAlign: 'center',
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '700',
  },
  clubSport: {
    fontSize: 13,
    marginTop: 2,
  },
  clubActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },

  // MODAL
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalSave: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalFooter: {
    padding: 20,
    paddingBottom: 40,
  },

  // LOGO SECTION
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoPreview: {
    position: 'relative',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderEmoji: {
    fontSize: 36,
  },
  logoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  logoButtons: {
    flex: 1,
    gap: 8,
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  logoButtonDelete: {},
  logoButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // FORM
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  input: {
    borderRadius: RADIUS.md,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },

  // SPORTS GRID
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sportItem: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    minWidth: 80,
  },
  sportItemActive: {},
  sportIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  sportName: {
    fontSize: 11,
    fontWeight: '600',
  },
  sportNameActive: {},

  // COLORS GRID
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorItemActive: {},

  // SAVE BUTTON
  saveButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
