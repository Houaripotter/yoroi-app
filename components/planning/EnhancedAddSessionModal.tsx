import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, X, Check, Clock, Plus } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { Club, Training } from '@/lib/database';
import { getClubLogoSource } from '@/lib/sports';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';
import logger from '@/lib/security/logger';

interface EnhancedAddSessionModalProps {
  visible: boolean;
  date: Date | null;
  clubs: Club[];
  onClose: () => void;
  onSave: (session: Omit<Training, 'id' | 'created_at'>) => Promise<void>;
}

type Step = 'club' | 'details';

// Groupes musculaires
const MUSCLE_GROUPS = [
  { id: 'pecs', label: 'Pectoraux' },
  { id: 'dos', label: 'Dos' },
  { id: 'epaules', label: 'Épaules' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'jambes', label: 'Jambes' },
  { id: 'fessiers', label: 'Fessiers' },
  { id: 'abdos', label: 'Abdominaux' },
  { id: 'mollets', label: 'Mollets' },
  { id: 'avantbras', label: 'Avant-bras' },
];

// Types de séance musculation
const MUSCLE_SESSION_TYPES = [
  { id: 'libre', label: 'Séance libre' },
  { id: 'push', label: 'Push (Poussée)' },
  { id: 'pull', label: 'Pull (Tirage)' },
  { id: 'legs', label: 'Legs (Jambes)' },
  { id: 'upper', label: 'Haut du corps' },
  { id: 'lower', label: 'Bas du corps' },
  { id: 'full', label: 'Full Body' },
  { id: 'cardio', label: 'Cardio' },
];

// Types de séance JJB
const JJB_SESSION_TYPES = [
  { id: 'cours', label: 'Cours' },
  { id: 'sparring', label: 'Sparring' },
  { id: 'drilling', label: 'Drilling' },
  { id: 'openmat', label: 'Open Mat' },
  { id: 'competition', label: 'Compétition' },
  { id: 'prive', label: 'Cours Privé' },
];

// Types de séance MMA
const MMA_SESSION_TYPES = [
  { id: 'cours', label: 'Cours' },
  { id: 'sparring', label: 'Sparring' },
  { id: 'drilling', label: 'Drilling' },
  { id: 'bagwork', label: 'Sac/Pads' },
  { id: 'conditioning', label: 'Conditioning' },
  { id: 'competition', label: 'Compétition' },
];

// Suggestions de thèmes techniques JJB
const JJB_THEMES = [
  'Passage de garde',
  'Sweeps',
  'Soumissions',
  'Takedowns',
  'Guard retention',
  'Back control',
];

// Presets de durée
const DURATION_PRESETS = [
  { value: 30, label: '30min' },
  { value: 45, label: '45min' },
  { value: 60, label: '1h' },
  { value: 75, label: '1h15' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2h' },
];

export function EnhancedAddSessionModal({
  visible,
  date,
  clubs,
  onClose,
  onSave,
}: EnhancedAddSessionModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Debug: afficher le nombre de clubs
  useEffect(() => {
    if (visible) {
      logger.info('📋 Clubs disponibles:', clubs.length);
      logger.info('📋 Liste des clubs:', clubs.map(c => c.name).join(', '));
    }
  }, [visible, clubs]);

  // États
  const [step, setStep] = useState<Step>('club');
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  // Nouveaux états pour multi-sélection
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [selectedSessionTypes, setSelectedSessionTypes] = useState<string[]>([]);
  const [customMuscle, setCustomMuscle] = useState('');
  const [showCustomMuscleInput, setShowCustomMuscleInput] = useState(false);
  const [technicalTheme, setTechnicalTheme] = useState('');

  // États existants
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [duration, setDuration] = useState(60);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [note, setNote] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset quand la modal se ferme
  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible]);

  // Mettre à jour les types de séances quand le club change
  useEffect(() => {
    if (selectedClub) {
      const sport = selectedClub.sport.toLowerCase();
      if (sport.includes('jjb') || sport.includes('jiu-jitsu')) {
        setSelectedSessionTypes(['cours']);
      } else if (sport.includes('mma')) {
        setSelectedSessionTypes(['cours']);
      } else if (sport.includes('muscu') || sport.includes('fitness')) {
        setSelectedSessionTypes(['libre']);
      } else {
        setSelectedSessionTypes(['cours']);
      }
    }
  }, [selectedClub]);

  const reset = () => {
    setStep('club');
    setSelectedClub(null);
    setSelectedMuscles([]);
    setSelectedSessionTypes([]);
    setCustomMuscle('');
    setShowCustomMuscleInput(false);
    setTechnicalTheme('');
    setStartTime(new Date());
    setDuration(60);
    setShowCustomDuration(false);
    setNote('');
    setShowTimePicker(false);
    setIsSaving(false);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reset();
    onClose();
  };

  const handleClubSelect = (club: Club) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedClub(club);
    setStep('details');
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('club');
    setSelectedClub(null);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      setStartTime(selectedDate);
    }
  };

  // Toggle muscle (multi-sélection)
  const toggleMuscle = (muscleId: string) => {
    setSelectedMuscles((prev) =>
      prev.includes(muscleId)
        ? prev.filter((m) => m !== muscleId)
        : [...prev, muscleId]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Toggle session type (multi-sélection)
  const toggleSessionType = (typeId: string) => {
    setSelectedSessionTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((t) => t !== typeId)
        : [...prev, typeId]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Ajouter un muscle personnalisé
  const handleAddCustomMuscle = () => {
    if (customMuscle.trim()) {
      setSelectedMuscles((prev) => [...prev, customMuscle.trim()]);
      setCustomMuscle('');
      setShowCustomMuscleInput(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleSave = async () => {
    if (!selectedClub || !date || isSaving) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const timeStr = format(startTime, 'HH:mm');

    // Récupérer les labels des types sélectionnés
    const sport = selectedClub.sport.toLowerCase();
    let sessionTypeLabels: string[] = [];

    if (sport.includes('muscu') || sport.includes('fitness')) {
      sessionTypeLabels = selectedSessionTypes.map(
        (id) => MUSCLE_SESSION_TYPES.find((t) => t.id === id)?.label || id
      );
    } else if (sport.includes('jjb') || sport.includes('jiu-jitsu')) {
      sessionTypeLabels = selectedSessionTypes.map(
        (id) => JJB_SESSION_TYPES.find((t) => t.id === id)?.label || id
      );
    } else if (sport.includes('mma')) {
      sessionTypeLabels = selectedSessionTypes.map(
        (id) => MMA_SESSION_TYPES.find((t) => t.id === id)?.label || id
      );
    } else {
      sessionTypeLabels = selectedSessionTypes;
    }

    // Récupérer les labels des muscles
    const muscleLabels = selectedMuscles.map(
      (id) => MUSCLE_GROUPS.find((m) => m.id === id)?.label || id
    );

    try {
      await onSave({
        date: format(date, 'yyyy-MM-dd'),
        club_id: selectedClub.id === -1 ? undefined : selectedClub.id, // Activité libre n'a pas de club_id
        sport: selectedClub.sport,
        session_types: JSON.stringify(sessionTypeLabels),
        start_time: timeStr,
        duration_minutes: duration,
        muscles: muscleLabels.length > 0 ? JSON.stringify(muscleLabels) : undefined,
        technical_theme: technicalTheme.trim() || undefined,
        notes: note.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Ne pas appeler handleClose() ici - le parent gère la fermeture
      reset(); // Juste reset les champs pour la prochaine fois
    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  const getClubDisplay = (club: Club) => {
    if (club.logo_uri) {
      const logoSource = getClubLogoSource(club.logo_uri);
      if (logoSource) {
        return { type: 'image' as const, source: logoSource };
      }
    }
    return { type: 'color' as const, color: club.color || colors.accent };
  };

  const formatDateTitle = (d: Date) => {
    return format(d, 'EEEE d MMMM', { locale: fr });
  };

  // Déterminer les types de séances selon le sport
  const getSessionTypesForSport = () => {
    if (!selectedClub) return [];
    const sport = selectedClub.sport.toLowerCase();
    if (sport.includes('muscu') || sport.includes('fitness')) {
      return MUSCLE_SESSION_TYPES;
    } else if (sport.includes('jjb') || sport.includes('jiu-jitsu')) {
      return JJB_SESSION_TYPES;
    } else if (sport.includes('mma')) {
      return MMA_SESSION_TYPES;
    }
    return [{ id: 'cours', label: 'Cours' }];
  };

  const isMusculation = selectedClub?.sport.toLowerCase().includes('muscu') ||
                        selectedClub?.sport.toLowerCase().includes('fitness');
  const isCombat = selectedClub?.sport.toLowerCase().includes('jjb') ||
                   selectedClub?.sport.toLowerCase().includes('mma') ||
                   selectedClub?.sport.toLowerCase().includes('jiu-jitsu');

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View
          style={[
            styles.modal,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* ETAPE 1: Selection du club */}
          {step === 'club' && (
            <View style={styles.clubStepContainer}>
              {/* Header */}
              <View style={styles.header}>
                <View style={{ width: 40 }} />
                <View style={styles.headerCenter}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>
                    Choisir ton club
                  </Text>
                  {date && (
                    <Text
                      style={[styles.dateSubtitle, { color: colors.textSecondary }]}
                    >
                      {formatDateTitle(date)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                  <X size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Grille des clubs */}
              <ScrollView
                style={styles.clubsScroll}
                contentContainerStyle={styles.clubsGrid}
                showsVerticalScrollIndicator={false}
              >
                {/* Bouton Activité Libre */}
                <TouchableOpacity
                  style={[
                    styles.clubCard,
                    styles.freeActivityCard,
                    {
                      backgroundColor: colors.accent + '15',
                      borderColor: colors.accent,
                      borderWidth: 2,
                      borderStyle: 'dashed',
                    },
                  ]}
                  onPress={() => handleClubSelect({
                    id: -1,
                    name: 'Activité libre',
                    sport: 'Libre',
                    color: colors.accent,
                    logo_uri: undefined,
                    created_at: new Date().toISOString(),
                  } as Club)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.clubLogo,
                      {
                        backgroundColor: colors.accent + '20',
                      },
                    ]}
                  >
                    <Plus size={32} color={colors.accent} />
                  </View>
                  <Text
                    style={[styles.clubName, { color: colors.accent }]}
                    numberOfLines={1}
                  >
                    Activité libre
                  </Text>
                  <Text
                    style={[styles.clubSport, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    Sans club
                  </Text>
                </TouchableOpacity>

                {clubs.map((club) => {
                  const display = getClubDisplay(club);
                  return (
                    <TouchableOpacity
                      key={club.id}
                      style={[
                        styles.clubCard,
                        {
                          backgroundColor: colors.backgroundCard,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleClubSelect(club)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.clubLogo,
                          {
                            backgroundColor:
                              display.type === 'color'
                                ? `${display.color}20`
                                : colors.backgroundElevated,
                          },
                        ]}
                      >
                        {display.type === 'image' ? (
                          <Image
                            source={display.source}
                            style={styles.clubLogoImage}
                          />
                        ) : (
                          <View
                            style={[
                              styles.clubColorDot,
                              { backgroundColor: display.color },
                            ]}
                          />
                        )}
                      </View>
                      <Text
                        style={[styles.clubName, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {club.name}
                      </Text>
                      <Text
                        style={[styles.clubSport, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {club.sport}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Bouton Annuler */}
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: colors.backgroundCard,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleClose}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ETAPE 2: Details de la seance */}
          {step === 'details' && selectedClub && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.detailsContent}
            >
              {/* Header avec retour */}
              <View style={styles.detailsHeader}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <ChevronLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.detailsClubInfo}>
                  {(() => {
                    const display = getClubDisplay(selectedClub);
                    return (
                      <View
                        style={[
                          styles.detailsClubLogo,
                          {
                            backgroundColor:
                              display.type === 'color'
                                ? `${display.color}20`
                                : colors.backgroundElevated,
                          },
                        ]}
                      >
                        {display.type === 'image' ? (
                          <Image
                            source={display.source}
                            style={styles.detailsClubLogoImage}
                          />
                        ) : (
                          <View
                            style={[
                              styles.detailsClubColorDot,
                              { backgroundColor: display.color },
                            ]}
                          />
                        )}
                      </View>
                    );
                  })()}
                  <View>
                    <Text
                      style={[
                        styles.detailsClubName,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {selectedClub.name}
                    </Text>
                    {date && (
                      <Text
                        style={[
                          styles.detailsDate,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {formatDateTitle(date)}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                  <X size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Type de séance - Multi-sélection */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                TYPE DE SÉANCE
              </Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                {isMusculation
                  ? 'Sélectionne un ou plusieurs types'
                  : isCombat
                  ? 'Sélectionne le type de séance'
                  : 'Type de séance'}
              </Text>
              <View style={styles.typeGrid}>
                {getSessionTypesForSport().map((type) => {
                  const isSelected = selectedSessionTypes.includes(type.id);
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeButton,
                        {
                          backgroundColor: isSelected
                            ? colors.accent
                            : colors.backgroundCard,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => toggleSessionType(type.id)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          { color: isSelected ? colors.textOnAccent : colors.textPrimary },
                        ]}
                      >
                        {type.label}
                      </Text>
                      {isSelected && (
                        <Check size={14} color={colors.textOnAccent} style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Section Muscles (pour musculation) */}
              {isMusculation && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                    GROUPES MUSCULAIRES
                  </Text>
                  <Text
                    style={[styles.sectionHint, { color: colors.textSecondary }]}
                  >
                    Sélectionne un ou plusieurs muscles
                  </Text>
                  <View style={styles.tagsContainer}>
                    {MUSCLE_GROUPS.map((muscle) => {
                      const isSelected = selectedMuscles.includes(muscle.id);
                      return (
                        <TouchableOpacity
                          key={muscle.id}
                          style={[
                            styles.tag,
                            {
                              backgroundColor: isSelected
                                ? colors.accent
                                : colors.backgroundCard,
                              borderColor: isSelected ? colors.accent : colors.border,
                            },
                          ]}
                          onPress={() => toggleMuscle(muscle.id)}
                        >
                          <Text
                            style={[
                              styles.tagText,
                              { color: isSelected ? colors.textOnAccent : colors.textPrimary },
                            ]}
                          >
                            {muscle.label}
                          </Text>
                          {isSelected && (
                            <Check
                              size={14}
                              color={colors.textOnAccent}
                              style={{ marginLeft: 4 }}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}

                    {/* Bouton Ajouter personnalisé */}
                    <TouchableOpacity
                      style={[
                        styles.tag,
                        styles.addCustomTag,
                        {
                          backgroundColor: colors.backgroundCard,
                          borderColor: colors.accent,
                        },
                      ]}
                      onPress={() => setShowCustomMuscleInput(true)}
                    >
                      <Plus size={14} color={colors.accent} />
                      <Text style={[styles.tagText, { color: colors.accent }]}>
                        Autre
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Input personnalisé */}
                  {showCustomMuscleInput && (
                    <View style={styles.customInputContainer}>
                      <TextInput
                        style={[
                          styles.customInput,
                          {
                            backgroundColor: colors.backgroundCard,
                            color: colors.textPrimary,
                            borderColor: colors.border,
                          },
                        ]}
                        placeholder="Ex: Trapèzes, Hip Thrust..."
                        placeholderTextColor={colors.textSecondary}
                        value={customMuscle}
                        onChangeText={setCustomMuscle}
                        onSubmitEditing={handleAddCustomMuscle}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={[
                          styles.customInputButton,
                          { backgroundColor: colors.accent },
                        ]}
                        onPress={handleAddCustomMuscle}
                      >
                        <Check size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Affichage des muscles sélectionnés */}
                  {selectedMuscles.length > 0 && (
                    <View style={styles.selectedContainer}>
                      <Text
                        style={[
                          styles.selectedLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Sélection :
                      </Text>
                      <Text
                        style={[styles.selectedValue, { color: colors.accent }]}
                      >
                        {selectedMuscles
                          .map(
                            (id) =>
                              MUSCLE_GROUPS.find((m) => m.id === id)?.label || id
                          )
                          .join(' • ')}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Section Thème Technique (pour combat) */}
              {isCombat && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                    THÈME TECHNIQUE
                  </Text>
                  <Text
                    style={[styles.sectionHint, { color: colors.textSecondary }]}
                  >
                    Optionnel - Ce que tu vas travailler
                  </Text>
                  <TextInput
                    style={[
                      styles.themeInput,
                      {
                        backgroundColor: colors.backgroundCard,
                        color: colors.textPrimary,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="Ex: Passage de garde, Triangle, Kimura..."
                    placeholderTextColor={colors.textSecondary}
                    value={technicalTheme}
                    onChangeText={setTechnicalTheme}
                  />

                  {/* Suggestions rapides */}
                  <Text
                    style={[
                      styles.suggestionsLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Suggestions :
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionsScroll}
                  >
                    {JJB_THEMES.map((suggestion) => (
                      <TouchableOpacity
                        key={suggestion}
                        style={[
                          styles.suggestionChip,
                          {
                            backgroundColor: colors.backgroundCard,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => setTechnicalTheme(suggestion)}
                      >
                        <Text
                          style={[
                            styles.suggestionText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {suggestion}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Heure de début */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                HEURE DE DÉBUT
              </Text>
              <TouchableOpacity
                style={[
                  styles.timeButton,
                  {
                    backgroundColor: colors.backgroundCard,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={20} color={colors.accent} />
                <Text style={[styles.timeText, { color: colors.textPrimary }]}>
                  {format(startTime, 'HH:mm')}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  style={styles.timePicker}
                />
              )}

              {Platform.OS === 'ios' && showTimePicker && (
                <TouchableOpacity
                  style={[
                    styles.doneTimeButton,
                    { backgroundColor: colors.accent },
                  ]}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.doneTimeButtonText}>OK</Text>
                </TouchableOpacity>
              )}

              {/* Durée */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                DURÉE
              </Text>
              <View style={styles.durationGrid}>
                {DURATION_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.value}
                    style={[
                      styles.durationButton,
                      {
                        backgroundColor:
                          duration === preset.value && !showCustomDuration
                            ? colors.accent
                            : colors.backgroundCard,
                        borderColor:
                          duration === preset.value && !showCustomDuration
                            ? colors.accent
                            : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDuration(preset.value);
                      setShowCustomDuration(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.durationButtonText,
                        {
                          color:
                            duration === preset.value && !showCustomDuration
                              ? '#FFFFFF'
                              : colors.textPrimary,
                        },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Bouton Personnalisé */}
                <TouchableOpacity
                  style={[
                    styles.durationButton,
                    {
                      backgroundColor: showCustomDuration
                        ? colors.accent
                        : colors.backgroundCard,
                      borderColor: showCustomDuration
                        ? colors.accent
                        : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowCustomDuration(true);
                  }}
                >
                  <Text
                    style={[
                      styles.durationButtonText,
                      {
                        color: showCustomDuration
                          ? '#FFFFFF'
                          : colors.textPrimary,
                      },
                    ]}
                  >
                    Perso
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Durée personnalisée */}
              {showCustomDuration && (
                <View style={styles.customDurationContainer}>
                  <Text
                    style={[
                      styles.customDurationLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Durée en minutes (15 - 180)
                  </Text>
                  <TextInput
                    style={[
                      styles.customDurationInput,
                      {
                        backgroundColor: colors.backgroundCard,
                        color: colors.textPrimary,
                        borderColor: colors.accent,
                      },
                    ]}
                    keyboardType="number-pad"
                    value={duration === 0 ? '' : duration.toString()}
                    onChangeText={(text) => {
                      // Permettre de vider le champ
                      if (text === '') {
                        setDuration(0);
                        return;
                      }
                      const num = parseInt(text);
                      // Accepter TOUS les nombres pendant la saisie (pas de limite min)
                      if (!isNaN(num) && num >= 0) {
                        // Seulement limiter le maximum à 180
                        setDuration(Math.min(180, num));
                      }
                    }}
                    onBlur={() => {
                      // Seulement appliquer la limite minimale quand on quitte le champ
                      if (duration === 0 || duration < 15) {
                        setDuration(60);
                      } else if (duration > 180) {
                        setDuration(180);
                      }
                    }}
                    placeholder="60"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={3}
                    selectTextOnFocus={true}
                  />
                  <Text
                    style={[
                      styles.customDurationValue,
                      { color: colors.accent },
                    ]}
                  >
                    {duration} minutes
                  </Text>
                </View>
              )}

              {/* Notes */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                NOTE (OPTIONNEL)
              </Text>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: colors.backgroundCard,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Ajoute une note personnelle..."
                placeholderTextColor={colors.textSecondary}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
              />

              {/* Bouton Sauvegarder */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.accent },
                  isSaving && { opacity: 0.6 },
                ]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>

              {/* Espace en bas */}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    minHeight: '80%',
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },

  // Club Step Container
  clubStepContainer: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
  },
  dateSubtitle: {
    fontSize: FONT.size.sm,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Clubs
  emptyClubs: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyClubsText: {
    fontSize: FONT.size.md,
    marginBottom: 8,
  },
  emptyClubsSubtext: {
    fontSize: FONT.size.sm,
  },
  clubsScroll: {
    flex: 1,
  },
  clubsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  clubCard: {
    width: '47%',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  freeActivityCard: {
    // Style spécial pour l'activité libre
  },
  clubLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  clubLogoImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  clubColorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  clubName: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    textAlign: 'center',
    marginBottom: 2,
  },
  clubSport: {
    fontSize: FONT.size.xs,
  },
  cancelButton: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
  },

  // Details
  detailsContent: {
    paddingHorizontal: SPACING.xl,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsClubInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginLeft: SPACING.sm,
  },
  detailsClubLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsClubLogoImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  detailsClubColorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  detailsClubName: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
  },
  detailsDate: {
    fontSize: FONT.size.sm,
    marginTop: 2,
    textTransform: 'capitalize',
  },

  // Sections
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONT.weight.bold,
    letterSpacing: 1,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  sectionHint: {
    fontSize: FONT.size.xs,
    marginBottom: SPACING.md,
  },

  // Type Grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  typeButtonText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },

  // Tags (Muscles)
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  tagText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
  },
  addCustomTag: {
    borderStyle: 'dashed',
  },

  // Custom Input
  customInputContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  customInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    fontSize: FONT.size.sm,
    borderWidth: 1,
  },
  customInputButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Selected
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  selectedLabel: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
  },
  selectedValue: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
    flex: 1,
  },

  // Theme Input
  themeInput: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    fontSize: FONT.size.sm,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },

  // Suggestions
  suggestionsLabel: {
    fontSize: FONT.size.sm,
    marginBottom: SPACING.sm,
  },
  suggestionsScroll: {
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  suggestionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
  },

  // Time
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  timeText: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
  },
  timePicker: {
    marginBottom: SPACING.md,
  },
  doneTimeButton: {
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  doneTimeButtonText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    color: '#FFFFFF',
  },

  // Duration
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  durationButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  durationButtonText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },

  // Custom Duration
  customDurationContainer: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  customDurationLabel: {
    fontSize: FONT.size.sm,
    textAlign: 'center',
  },
  customDurationInput: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    fontSize: 24,
    fontWeight: FONT.weight.bold,
    textAlign: 'center',
    borderWidth: 2,
  },
  customDurationValue: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.semibold,
    textAlign: 'center',
  },

  // Note
  noteInput: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    fontSize: FONT.size.sm,
    borderWidth: 1,
    marginBottom: SPACING.xl,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Save Button
  saveButton: {
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
    color: '#FFFFFF',
  },
});
