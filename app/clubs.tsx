import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { launchImageLibraryAsync, launchCameraAsync, requestMediaLibraryPermissionsAsync, getMediaLibraryPermissionsAsync, requestCameraPermissionsAsync, getCameraPermissionsAsync } from 'expo-image-picker';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import { getClubs, addClub, updateClub, deleteClub, Club } from '@/lib/database';
import { SPORTS, getSportIcon, getSportColor, getSportName, getClubLogoSource } from '@/lib/sports';
import { useI18n } from '@/lib/I18nContext';
import { logger } from '@/lib/security/logger';

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
  const { t } = useI18n();
  const router = useRouter();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
      logger.error('Erreur chargement clubs:', error);
    }
  }, []);

  // Charger les clubs au montage (les mises à jour sont gérées par handleSave/handleDelete)
  useEffect(() => {
    loadClubs();
  }, []);

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
      const { status } = await requestCameraPermissionsAsync();
      return status === 'granted';
    } else {
      const { status } = await requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    }
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermission('gallery');
    if (!hasPermission) {
      showPopup(t('screens.clubs.permissionRequired'), t('screens.clubs.galleryPermission'), [
        { text: t('common.ok'), style: 'primary' }
      ]);
      return;
    }

    const result = await launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setLogoUri(result.assets?.[0]?.uri || null);
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermission('camera');
    if (!hasPermission) {
      showPopup(t('screens.clubs.permissionRequired'), t('screens.clubs.cameraPermission'), [
        { text: t('common.ok'), style: 'primary' }
      ]);
      return;
    }

    const result = await launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setLogoUri(result.assets?.[0]?.uri || null);
    }
  };

  const showImageOptions = () => {
    showPopup(
      t('screens.clubs.clubLogo'),
      t('screens.clubs.howToAddLogo'),
      [
        { text: t('screens.clubs.gallery'), onPress: pickImageFromGallery, style: 'primary' },
        { text: t('screens.clubs.camera'), onPress: takePhoto, style: 'primary' },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showPopup(t('common.error'), t('screens.clubs.nameRequired'), [
        { text: t('common.ok'), style: 'primary' }
      ]);
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
      logger.error('Erreur sauvegarde:', error);
      showPopup(t('common.error'), t('screens.clubs.saveError'), [
        { text: t('common.ok'), style: 'primary' }
      ]);
    }
  };

  const handleDelete = (club: Club) => {
    showPopup(
      t('screens.clubs.deleteClub'),
      t('screens.clubs.deleteConfirm', { name: club.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClub(club.id!);
              await loadClubs();
            } catch (error) {
              logger.error('Erreur suppression:', error);
              showPopup(t('common.error'), t('screens.clubs.deleteError'), [
                { text: t('common.ok'), style: 'primary' }
              ]);
            }
          },
        },
      ]
    );
  };

  const renderClubLogo = (club: Club, size: number = 50) => {
    const logoSource = club.logo_uri ? getClubLogoSource(club.logo_uri) : null;
    if (logoSource) {
      return (
        <Image
          source={logoSource}
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
        <MaterialCommunityIcons
          name={getSportIcon(club.sport) as any}
          size={size * 0.48}
          color="#FFFFFF"
        />
      </View>
    );
  };

  return (
    <ScreenWrapper noPadding>
      <Header
        title={t('screens.clubs.title')}
        showBack
        rightElement={
          <TouchableOpacity
            onPress={() => router.push('/add-club' as any)}
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
          {t('screens.clubs.description')}
        </Text>

        {/* LISTE DES CLUBS */}
        {clubs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Building2 size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('screens.clubs.noClubs')}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('screens.clubs.addFirstClub')}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/add-club' as any)}
            >
              <LinearGradient
                colors={gradients.gold}
                style={styles.emptyButtonGradient}
              >
                <Plus size={20} color={colors.textOnGold} />
                <Text style={[styles.emptyButtonText, { color: colors.textOnGold }]}>{t('screens.clubs.addClub')}</Text>
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
              {editingClub ? t('screens.clubs.editClub') : t('screens.clubs.newClub')}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.modalSave}>
              <Check size={24} color={colors.gold} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* LOGO */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('screens.clubs.clubLogo')}</Text>
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
                      <MaterialCommunityIcons
                        name={getSportIcon(selectedSport) as any}
                        size={32}
                        color="#FFFFFF"
                      />
                    </View>
                  )}
                  <View style={styles.logoEditBadge}>
                    <Camera size={14} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <View style={styles.logoButtons}>
                  <TouchableOpacity
                    style={[styles.logoButton, { borderColor: colors.border }]}
                    onPress={pickImageFromGallery}
                  >
                    <ImageIcon size={18} color={colors.gold} />
                    <Text style={[styles.logoButtonText, { color: colors.textPrimary }]}>{t('screens.clubs.gallery')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.logoButton, { borderColor: colors.border }]}
                    onPress={takePhoto}
                  >
                    <Camera size={18} color={colors.gold} />
                    <Text style={[styles.logoButtonText, { color: colors.textPrimary }]}>{t('screens.clubs.camera')}</Text>
                  </TouchableOpacity>
                  {logoUri && (
                    <TouchableOpacity
                      style={[styles.logoButton, styles.logoButtonDelete]}
                      onPress={() => setLogoUri(null)}
                    >
                      <X size={18} color={colors.danger} />
                      <Text style={[styles.logoButtonText, { color: colors.danger }]}>
                        {t('common.delete')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* NOM */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('screens.clubs.clubName')}</Text>
              <TextInput
                style={[styles.input, {
                  color: colors.textPrimary,
                  backgroundColor: colors.backgroundCard,
                  borderColor: colors.border
                }]}
                value={name}
                onChangeText={setName}
                placeholder={t('screens.clubs.clubNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                maxLength={50}
              />
            </View>

            {/* SPORT - STYLE CARTE COMME AJOUT SEANCE */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('screens.clubs.sport')}</Text>

              {(() => {
                const categoryLabels: Record<string, string> = {
                  combat_striking: t('screens.clubs.categories.striking'),
                  combat_grappling: t('screens.clubs.categories.grappling'),
                  fitness: t('screens.clubs.categories.fitness'),
                  cardio: t('screens.clubs.categories.cardio'),
                  collectif: t('screens.clubs.categories.team'),
                  raquettes: t('screens.clubs.categories.racket'),
                  autre: t('screens.clubs.categories.other'),
                };

                const categories = ['combat_striking', 'combat_grappling', 'fitness', 'cardio', 'collectif', 'raquettes', 'autre'];

                return categories.map((category) => {
                  const sportsInCategory = SPORTS.filter(s => s.category === category);
                  if (sportsInCategory.length === 0) return null;

                  return (
                    <View key={category} style={styles.categoryBlock}>
                      <Text style={[styles.categoryTitle, { color: colors.textMuted }]}>
                        {categoryLabels[category]}
                      </Text>
                      <View style={styles.sportsGridCards}>
                        {sportsInCategory.map((sport) => {
                          const isSelected = selectedSport === sport.id;
                          const sportColor = getSportColor(sport.id);
                          return (
                            <TouchableOpacity
                              key={sport.id}
                              style={[
                                styles.sportCard,
                                {
                                  backgroundColor: colors.backgroundCard,
                                  borderColor: isSelected ? sportColor : colors.border,
                                  borderWidth: isSelected ? 2 : 1,
                                },
                              ]}
                              onPress={() => setSelectedSport(sport.id)}
                              activeOpacity={0.7}
                            >
                              {/* Cercle avec icone */}
                              <View style={[styles.sportCardLogo, { backgroundColor: `${sportColor}20` }]}>
                                <MaterialCommunityIcons
                                  name={sport.icon as any}
                                  size={28}
                                  color={sportColor}
                                />
                              </View>
                              {/* Nom du sport */}
                              <Text
                                style={[styles.sportCardName, { color: colors.textPrimary }]}
                                numberOfLines={1}
                              >
                                {sport.name}
                              </Text>
                              {/* Categorie */}
                              <Text
                                style={[styles.sportCardCategory, { color: colors.textMuted }]}
                                numberOfLines={1}
                              >
                                {categoryLabels[category]}
                              </Text>
                              {/* Indicateur de selection */}
                              {isSelected && (
                                <View style={[styles.sportCardCheck, { backgroundColor: sportColor }]}>
                                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                });
              })()}
            </View>

            {/* COULEUR */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('screens.clubs.color')}</Text>
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
                <Text style={[styles.saveButtonText, { color: colors.textOnGold }]}>
                  {editingClub ? t('screens.clubs.update') : t('screens.clubs.addClub')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <PopupComponent />
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

  // SPORTS GRID - Ancien style (garde pour compatibilite)
  categoryBlock: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
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

  // SPORTS GRID CARDS - Nouveau style comme AddSessionModal
  sportsGridCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  sportCard: {
    width: '30%',
    aspectRatio: 0.85,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    position: 'relative',
  },
  sportCardLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sportCardName: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  sportCardCategory: {
    fontSize: 9,
    textAlign: 'center',
  },
  sportCardCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
