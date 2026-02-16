// ============================================
// YOROI - MODAL D'AJOUT DE CLUB UTILISATEUR
// ============================================
// Permet d'ajouter un club avec objectif hebdomadaire obligatoire
// Selecteur de sport identique a "Configuration de seance"

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { launchImageLibraryAsync, launchCameraAsync, requestMediaLibraryPermissionsAsync, requestCameraPermissionsAsync } from 'expo-image-picker';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import {
  X,
  Check,
  Plus,
  Minus,
  Camera,
  Target,
  AlertCircle,
  ChevronRight,
  ChevronDown,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import { SPORTS, getSportIcon, getSportColor } from '@/lib/sports';
import { addClub, updateClub, Club } from '@/lib/database';
import { setGoal, getGoalBySport } from '@/lib/trainingGoalsService';
import { logger } from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

interface AddClubModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  editingClub?: Club | null;
}

interface FormErrors {
  name?: string;
  weeklyGoal?: string;
}

const CLUB_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E',
  '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6',
  '#A855F7', '#EC4899', '#6B7280', '#D4AF37',
];

// Categories config - meme ordre que add-training
const CATEGORIES_LIST = ['cardio', 'fitness', 'combat_grappling', 'combat_striking', 'danse', 'collectif', 'raquettes', 'glisse', 'nature', 'autre'];

const CATEGORY_LABELS: Record<string, string> = {
  cardio: 'Cardio',
  fitness: 'Musculation & Fitness',
  combat_grappling: 'Combat (Grappling)',
  combat_striking: 'Combat (Pieds-Poings)',
  danse: 'Danse',
  collectif: 'Sports Collectifs',
  raquettes: 'Raquettes',
  glisse: 'Sports de Glisse',
  nature: 'Sports Nature',
  autre: 'Autres',
};

const CATEGORY_ICONS: Record<string, string> = {
  cardio: 'run-fast',
  fitness: 'dumbbell',
  combat_grappling: 'kabaddi',
  combat_striking: 'boxing-glove',
  danse: 'dance-ballroom',
  collectif: 'soccer',
  raquettes: 'tennis',
  glisse: 'snowboard',
  nature: 'hiking',
  autre: 'dots-horizontal',
};

const CATEGORY_COLORS: Record<string, string> = {
  cardio: '#10B981',
  fitness: '#8B5CF6',
  combat_grappling: '#3B82F6',
  combat_striking: '#EF4444',
  danse: '#EC4899',
  collectif: '#F59E0B',
  raquettes: '#06B6D4',
  glisse: '#0EA5E9',
  nature: '#22C55E',
  autre: '#6B7280',
};

// ============================================
// COMPOSANT
// ============================================

export const AddClubModal: React.FC<AddClubModalProps> = ({
  visible,
  onClose,
  onSave,
  editingClub,
}) => {
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  // Form state
  const [name, setName] = useState('');
  const [selectedSport, setSelectedSport] = useState('jjb');
  const [selectedColor, setSelectedColor] = useState(CLUB_COLORS[0]);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sport selector state
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset form quand le modal s'ouvre
  useEffect(() => {
    if (visible) {
      if (editingClub) {
        setName(editingClub.name);
        setSelectedSport(editingClub.sport);
        setSelectedColor(editingClub.color || CLUB_COLORS[0]);
        setLogoUri(editingClub.logo_uri || null);
        loadExistingGoal(editingClub.sport);
        // Expand la categorie du sport edite
        const sportData = SPORTS.find(s => s.id === editingClub.sport);
        if (sportData) setExpandedCategories([sportData.category]);
      } else {
        resetForm();
      }
      setErrors({});
      setSearchQuery('');
    }
  }, [visible, editingClub]);

  const loadExistingGoal = async (sportId: string) => {
    const goal = await getGoalBySport(sportId);
    setWeeklyGoal(goal?.weekly_target || 0);
  };

  const resetForm = () => {
    setName('');
    setSelectedSport('jjb');
    setSelectedColor(CLUB_COLORS[0]);
    setLogoUri(null);
    setWeeklyGoal(0);
    setErrors({});
    setExpandedCategories([]);
  };

  const toggleCategory = (category: string) => {
    selectionAsync();
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Le nom du club est obligatoire';
    }

    if (weeklyGoal < 1) {
      newErrors.weeklyGoal = 'Configure ton objectif hebdomadaire avant de valider (minimum 1x/semaine)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Sauvegarde
  const handleSave = async () => {
    if (!validate()) {
      notificationAsync(NotificationFeedbackType.Error);
      // Popup visible pour indiquer l'erreur
      const msgs: string[] = [];
      if (!name.trim()) msgs.push('• Le nom du club est obligatoire');
      if (weeklyGoal < 1) msgs.push('• Configure ton objectif hebdomadaire (minimum 1x/semaine)');
      if (msgs.length > 0) {
        showPopup('Informations manquantes', msgs.join('\n'), [{ text: 'Compris', style: 'primary' }]);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingClub?.id) {
        await updateClub(editingClub.id, {
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

      await setGoal(selectedSport, weeklyGoal);

      notificationAsync(NotificationFeedbackType.Success);
      onSave();
      onClose();
    } catch (error) {
      logger.error('Erreur sauvegarde club:', error);
      showPopup('Erreur', 'Impossible de sauvegarder le club', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Image picker
  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      if (source === 'camera') {
        const permission = await requestCameraPermissionsAsync();
        if (!permission.granted) {
          showPopup('Permission requise', 'Autorise l\'acces a la camera', [{ text: 'OK', style: 'primary' }]);
          return;
        }
        result = await launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const permission = await requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showPopup('Permission requise', 'Autorise l\'acces a la galerie', [{ text: 'OK', style: 'primary' }]);
          return;
        }
        result = await launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setLogoUri(result.assets[0].uri);
      }
    } catch (error) {
      logger.error('Erreur image:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {editingClub ? 'Modifier le club' : 'Nouveau club'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerButton}
            disabled={isSubmitting}
          >
            <Check size={24} color={colors.accentText} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoPreview}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoImage} resizeMode="cover" />
              ) : (
                <View style={[styles.logoPlaceholder, { backgroundColor: selectedColor }]}>
                  <MaterialCommunityIcons
                    name={getSportIcon(selectedSport) as any}
                    size={40}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </View>

            {/* Boutons photo directs (pas de popup intermédiaire) */}
            <View style={styles.logoButtons}>
              <TouchableOpacity
                style={[styles.logoPickerBtn, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
                onPress={() => pickImage('gallery')}
              >
                <Camera size={16} color={colors.accent} />
                <Text style={[styles.logoPickerBtnText, { color: colors.textPrimary }]}>Galerie</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logoPickerBtn, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
                onPress={() => pickImage('camera')}
              >
                <Camera size={16} color={colors.accent} />
                <Text style={[styles.logoPickerBtnText, { color: colors.textPrimary }]}>Camera</Text>
              </TouchableOpacity>
            </View>
            {logoUri && (
              <TouchableOpacity
                style={[styles.removeLogoButton, { borderColor: colors.danger }]}
                onPress={() => setLogoUri(null)}
              >
                <X size={20} color={colors.danger} />
                <Text style={[styles.removeLogoText, { color: colors.danger }]}>Supprimer</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Nom du club */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Nom du club <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.backgroundCard,
                  borderColor: errors.name ? colors.danger : colors.border,
                },
              ]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              placeholder="Ex: Gracie Barra, Basic Fit..."
              placeholderTextColor={colors.textMuted}
            />
            {errors.name && (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{errors.name}</Text>
              </View>
            )}
          </View>

          {/* ================================================ */}
          {/* SPORT - Style "Configuration de seance"           */}
          {/* ================================================ */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Sport <Text style={{ color: colors.danger }}>*</Text>
            </Text>

            {/* Barre de recherche */}
            <View style={[styles.searchBar, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="magnify" size={24} color={colors.accent} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Rechercher un sport..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Categories expandables */}
            {(() => {
              const filteredCategories = CATEGORIES_LIST.filter(category => {
                let sports = SPORTS.filter(s => s.category === category);
                if (searchQuery.length > 0) {
                  sports = sports.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
                }
                return sports.length > 0;
              });

              if (filteredCategories.length === 0 && searchQuery.length > 0) {
                return (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                      Aucun sport trouve pour "{searchQuery}"
                    </Text>
                  </View>
                );
              }

              return filteredCategories.map((category) => {
                let sportsInCategory = SPORTS.filter(s => s.category === category);
                if (searchQuery.length > 0) {
                  sportsInCategory = sportsInCategory.filter(s =>
                    s.name.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                }
                if (sportsInCategory.length === 0) return null;

                const isExpanded = expandedCategories.includes(category) || searchQuery.length > 0;
                const hasSelectedSport = sportsInCategory.some(s => s.id === selectedSport);
                const catColor = CATEGORY_COLORS[category] || '#6B7280';

                return (
                  <View key={category} style={styles.categorySection}>
                    {/* Header de categorie cliquable */}
                    <TouchableOpacity
                      style={[
                        styles.categoryHeader,
                        {
                          backgroundColor: isExpanded ? catColor + '10' : colors.card,
                          borderColor: hasSelectedSport ? catColor : colors.border,
                        },
                        hasSelectedSport && { backgroundColor: catColor + '15' },
                      ]}
                      onPress={() => toggleCategory(category)}
                    >
                      <View style={styles.categoryHeaderLeft}>
                        <View style={[styles.categoryIconBadge, { backgroundColor: catColor + '20' }]}>
                          <MaterialCommunityIcons
                            name={CATEGORY_ICONS[category] as any}
                            size={20}
                            color={catColor}
                          />
                        </View>
                        <Text style={[
                          styles.categoryLabel,
                          { color: hasSelectedSport ? catColor : colors.textPrimary },
                        ]}>
                          {CATEGORY_LABELS[category]}
                        </Text>
                      </View>
                      <View style={styles.categoryHeaderRight}>
                        <Text style={[styles.categorySportCount, { color: colors.textMuted }]}>
                          {sportsInCategory.length}
                        </Text>
                        {isExpanded ? (
                          <ChevronDown size={20} color={colors.textMuted} />
                        ) : (
                          <ChevronRight size={20} color={colors.textMuted} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Grille de sports - 4 colonnes */}
                    {isExpanded && (
                      <View style={styles.sportsGrid}>
                        {sportsInCategory.map((sport) => {
                          const isSelected = selectedSport === sport.id;

                          return (
                            <TouchableOpacity
                              key={sport.id}
                              style={[
                                styles.sportGridItem,
                                {
                                  backgroundColor: colors.card,
                                  borderColor: colors.border,
                                },
                                isSelected && {
                                  borderColor: colors.gold,
                                  backgroundColor: colors.gold + '15',
                                },
                              ]}
                              onPress={() => {
                                setSelectedSport(sport.id);
                                selectionAsync();
                              }}
                            >
                              <View style={[styles.sportGridIcon, { backgroundColor: sport.color + '20' }]}>
                                <MaterialCommunityIcons
                                  name={sport.icon as any}
                                  size={28}
                                  color={isSelected ? colors.gold : sport.color}
                                />
                              </View>
                              <Text
                                style={[
                                  styles.sportGridName,
                                  { color: colors.textPrimary },
                                  isSelected && { color: colors.gold, fontWeight: '700' },
                                ]}
                                numberOfLines={1}
                              >
                                {sport.name}
                              </Text>
                              {isSelected && (
                                <View style={[styles.sportGridCheck, { backgroundColor: colors.gold }]}>
                                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              });
            })()}
          </View>

          {/* OBJECTIF HEBDOMADAIRE - OBLIGATOIRE */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Target size={16} color={colors.accentText} />
              <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>
                Objectif hebdomadaire <Text style={{ color: colors.danger }}>*</Text>
              </Text>
            </View>
            <Text style={[styles.labelHint, { color: colors.textMuted }]}>
              Combien de fois par semaine veux-tu t'entrainer dans ce club ?
            </Text>

            <View
              style={[
                styles.goalSelector,
                {
                  backgroundColor: colors.backgroundCard,
                  borderColor: errors.weeklyGoal ? colors.danger : colors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.goalButton, { backgroundColor: colors.backgroundElevated }]}
                onPress={() => {
                  setWeeklyGoal(Math.max(0, weeklyGoal - 1));
                  if (errors.weeklyGoal) setErrors({ ...errors, weeklyGoal: undefined });
                }}
              >
                <Minus size={24} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.goalDisplay}>
                <Text
                  style={[
                    styles.goalValue,
                    { color: weeklyGoal === 0 ? colors.danger : colors.textPrimary },
                  ]}
                >
                  {weeklyGoal}
                </Text>
                <Text style={[styles.goalUnit, { color: colors.textSecondary }]}>
                  fois / semaine
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.goalButton, { backgroundColor: colors.backgroundElevated }]}
                onPress={() => {
                  setWeeklyGoal(Math.min(14, weeklyGoal + 1));
                  if (errors.weeklyGoal) setErrors({ ...errors, weeklyGoal: undefined });
                }}
              >
                <Plus size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {errors.weeklyGoal && (
              <View style={styles.errorRow}>
                <AlertCircle size={14} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{errors.weeklyGoal}</Text>
              </View>
            )}

            {weeklyGoal > 0 && (
              <Text style={[styles.goalInfo, { color: isDark ? colors.accent : colors.textPrimary }]}>
                = {weeklyGoal * 4} / mois | {weeklyGoal * 52} / an
              </Text>
            )}
          </View>

          {/* Couleur */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Couleur (si pas de logo)</Text>
            <View style={styles.colorsGrid}>
              {CLUB_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorItem,
                    { backgroundColor: color },
                    selectedColor === color && { borderColor: '#FFFFFF', borderWidth: 3 },
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && <Check size={18} color="#FFFFFF" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Bouton Enregistrer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.accent }]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Text style={[styles.saveButtonText, { color: colors.textOnGold }]}>
              {editingClub ? 'Mettre a jour' : 'Ajouter le club'}
            </Text>
          </TouchableOpacity>
        </View>
        <PopupComponent />
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoPreview: {
    position: 'relative',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  logoPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoPickerBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  removeLogoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  removeLogoText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Form
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  labelHint: {
    fontSize: 13,
    marginBottom: 12,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  // Category sections - style "Configuration de seance"
  categorySection: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categorySportCount: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Sports grid - 4 colonnes comme add-training
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 4,
    marginTop: 8,
  },
  sportGridItem: {
    width: '23.5%',
    aspectRatio: 0.85,
    borderRadius: 14,
    borderWidth: 1,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  sportGridIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  sportGridName: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  sportGridCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Goal Selector
  goalSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    padding: 12,
  },
  goalButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  goalValue: {
    fontSize: 48,
    fontWeight: '800',
  },
  goalUnit: {
    fontSize: 14,
    marginTop: -6,
  },
  goalInfo: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },

  // Colors
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
  },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AddClubModal;
