// ============================================
// YOROI - MODAL D'AJOUT DE CLUB UTILISATEUR
// ============================================
// Permet d'ajouter un club avec objectif hebdomadaire obligatoire

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
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  X,
  Check,
  Plus,
  Minus,
  Camera,
  Image as ImageIcon,
  Target,
  AlertCircle,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import { SPORTS, getSportIcon, getSportColor } from '@/lib/sports';
import { addClub, updateClub, Club } from '@/lib/database';
import { setGoal, getGoalBySport } from '@/lib/trainingGoalsService';

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

// ============================================
// COMPOSANT
// ============================================

export const AddClubModal: React.FC<AddClubModalProps> = ({
  visible,
  onClose,
  onSave,
  editingClub,
}) => {
  const { colors, gradients } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  // Form state
  const [name, setName] = useState('');
  const [selectedSport, setSelectedSport] = useState('jjb');
  const [selectedColor, setSelectedColor] = useState(CLUB_COLORS[0]);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(0); // 0 par defaut = non rempli
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form quand le modal s'ouvre
  useEffect(() => {
    if (visible) {
      if (editingClub) {
        // Mode edition
        setName(editingClub.name);
        setSelectedSport(editingClub.sport);
        setSelectedColor(editingClub.color || CLUB_COLORS[0]);
        setLogoUri(editingClub.logo_uri || null);
        // Charger l'objectif existant
        loadExistingGoal(editingClub.sport);
      } else {
        // Nouveau club
        resetForm();
      }
      setErrors({});
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
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Le nom du club est obligatoire';
    }

    if (weeklyGoal < 1) {
      newErrors.weeklyGoal = 'Tu dois definir un objectif (minimum 1x/semaine)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Sauvegarde
  const handleSave = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingClub?.id) {
        // Mise a jour
        await updateClub(editingClub.id, {
          name: name.trim(),
          sport: selectedSport,
          color: selectedColor,
          logo_uri: logoUri || undefined,
        });
      } else {
        // Creation
        await addClub({
          name: name.trim(),
          sport: selectedSport,
          color: selectedColor,
          logo_uri: logoUri || undefined,
        });
      }

      // Sauvegarder l'objectif
      await setGoal(selectedSport, weeklyGoal);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave();
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde club:', error);
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
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showPopup('Permission requise', 'Autorise l\'acces a la camera', [{ text: 'OK', style: 'primary' }]);
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showPopup('Permission requise', 'Autorise l\'acces a la galerie', [{ text: 'OK', style: 'primary' }]);
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
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
      console.error('Erreur image:', error);
    }
  };

  // Categories de sports
  const categoryLabels: Record<string, string> = {
    combat_striking: 'Sports de Frappe',
    combat_grappling: 'Sports de Prehension',
    fitness: 'Musculation',
    cardio: 'Cardio',
    collectif: 'Collectifs',
    raquettes: 'Raquettes',
    autre: 'Autres',
  };

  const categories = ['combat_grappling', 'combat_striking', 'fitness', 'cardio', 'collectif', 'raquettes', 'autre'];

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
            <TouchableOpacity
              style={styles.logoPreview}
              onPress={() => {
                showPopup('Logo du club', 'Comment ajouter le logo ?', [
                  { text: 'Galerie', onPress: () => pickImage('gallery'), style: 'primary' },
                  { text: 'Camera', onPress: () => pickImage('camera'), style: 'primary' },
                  { text: 'Annuler', style: 'cancel' },
                ]);
              }}
            >
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoImage} />
              ) : (
                <View style={[styles.logoPlaceholder, { backgroundColor: selectedColor }]}>
                  <MaterialCommunityIcons
                    name={getSportIcon(selectedSport) as any}
                    size={40}
                    color="#FFFFFF"
                  />
                </View>
              )}
              <View style={[styles.logoBadge, { backgroundColor: colors.accent }]}>
                <Camera size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
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

          {/* Sport */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Sport</Text>
            {categories.map((category) => {
              const sportsInCategory = SPORTS.filter(s => s.category === category);
              if (sportsInCategory.length === 0) return null;

              return (
                <View key={category} style={styles.categoryBlock}>
                  <Text style={[styles.categoryTitle, { color: colors.textMuted }]}>
                    {categoryLabels[category]}
                  </Text>
                  <View style={styles.sportsGrid}>
                    {sportsInCategory.map((sport) => (
                      <TouchableOpacity
                        key={sport.id}
                        style={[
                          styles.sportItem,
                          {
                            backgroundColor: selectedSport === sport.id ? colors.accent + '20' : colors.backgroundCard,
                            borderColor: selectedSport === sport.id ? colors.accent : colors.border,
                          },
                        ]}
                        onPress={() => setSelectedSport(sport.id)}
                      >
                        <MaterialCommunityIcons
                          name={sport.icon as any}
                          size={22}
                          color={selectedSport === sport.id ? colors.accent : colors.textPrimary}
                        />
                        <Text
                          style={[
                            styles.sportName,
                            { color: selectedSport === sport.id ? colors.accent : colors.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {sport.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
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
                  setWeeklyGoal(weeklyGoal + 1);
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
              <Text style={[styles.goalInfo, { color: colors.accent }]}>
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

  // Sports
  categoryBlock: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 75,
  },
  sportName: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
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
