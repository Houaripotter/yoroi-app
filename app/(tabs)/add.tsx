import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Scale,
  Ruler,
  Heart,
  Camera,
  X,
  ChevronRight,
  Droplets,
  Flame,
  Dumbbell,
  Check,
  Bone,
  Activity,
  Zap,
  CircleDot,
  Smile,
  Meh,
  Moon,
  Frown,
  Calendar,
  Cloud,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '@/constants/design';
import { addWeight } from '@/lib/database';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NumericInput } from '@/components/NumericInput';
import { WeightInput, WeightInputHandle } from '@/components/WeightInput';
import { backupReminderService } from '@/lib/backupReminderService';
import { exportDataToJSON, exportDataToCSV } from '@/lib/exportService';
import { draftService, WeightDraft } from '@/lib/draftService';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// ECRAN AJOUTER - DESIGN UNIFIE
// ============================================

// Mood options
const MOODS: { id: string; icon: LucideIcon; label: string; color: string }[] = [
  { id: 'amazing', icon: Flame, label: 'Au top', color: '#10B981' },
  { id: 'good', icon: Smile, label: 'Bien', color: '#3B82F6' },
  { id: 'okay', icon: Meh, label: 'Moyen', color: '#F59E0B' },
  { id: 'tired', icon: Moon, label: 'Fatigué', color: '#8B5CF6' },
  { id: 'bad', icon: Frown, label: 'Pas top', color: '#EF4444' },
];

export default function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Weight input ref - Isolé pour éviter les re-renders
  const weightInputRef = useRef<WeightInputHandle>(null);

  // Date state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Composition state - Composition corporelle complète
  const [fatPercent, setFatPercent] = useState('');
  const [musclePercent, setMusclePercent] = useState('');
  const [waterPercent, setWaterPercent] = useState('');
  const [boneMass, setBoneMass] = useState('');
  const [visceralFat, setVisceralFat] = useState('');
  const [metabolicAge, setMetabolicAge] = useState('');
  const [bmr, setBmr] = useState(''); // Métabolisme de base

  // Measurements state - Complètes
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [arm, setArm] = useState('');
  const [thigh, setThigh] = useState('');
  const [hips, setHips] = useState('');
  const [neck, setNeck] = useState('');
  const [calf, setCalf] = useState('');

  // Mood state
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedWeight, setSavedWeight] = useState<number | null>(null);

  // Auto-save timer
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Charger le brouillon au démarrage
  useEffect(() => {
    const loadDraft = async () => {
      const draft = await draftService.getWeightDraft();
      if (draft) {
        const draftAge = await draftService.getWeightDraftAgeInDays();
        const isExpiringSoon = await draftService.isWeightDraftExpiringSoon();

        let message = 'Tu as des données non sauvegardées.';

        if (draftAge !== null) {
          if (draftAge === 0) {
            message += ' Sauvegardées aujourd\'hui.';
          } else if (draftAge === 1) {
            message += ' Sauvegardées il y a 1 jour.';
          } else {
            message += ` Sauvegardées il y a ${draftAge} jours.`;
          }

          if (isExpiringSoon) {
            const daysLeft = 7 - draftAge;
            message += `\n\n⚠️ ATTENTION : Ce brouillon sera supprimé dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} ! N'oublie pas de l'enregistrer.`;
          }
        }

        message += '\n\nVeux-tu restaurer ces données ?';

        Alert.alert(
          '📝 Brouillon trouvé',
          message,
          [
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: async () => {
                await draftService.clearWeightDraft();
              },
            },
            {
              text: 'Restaurer',
              onPress: () => {
                // Restaurer les valeurs
                if (draft.weight && weightInputRef.current) {
                  weightInputRef.current.setValue(parseFloat(draft.weight));
                }
                if (draft.date) setSelectedDate(draft.date);
                if (draft.fatPercent) setFatPercent(draft.fatPercent);
                if (draft.musclePercent) setMusclePercent(draft.musclePercent);
                if (draft.waterPercent) setWaterPercent(draft.waterPercent);
                if (draft.boneMass) setBoneMass(draft.boneMass);
                if (draft.visceralFat) setVisceralFat(draft.visceralFat);
                if (draft.metabolicAge) setMetabolicAge(draft.metabolicAge);
                if (draft.bmr) setBmr(draft.bmr);
                if (draft.waist) setWaist(draft.waist);
                if (draft.chest) setChest(draft.chest);
                if (draft.arm) setArm(draft.arm);
                if (draft.thigh) setThigh(draft.thigh);
                if (draft.hips) setHips(draft.hips);
                if (draft.neck) setNeck(draft.neck);
                if (draft.calf) setCalf(draft.calf);
                if (draft.mood) setSelectedMood(draft.mood);
              },
            },
          ]
        );
      }
    };

    loadDraft();
  }, []);

  // Auto-sauvegarder quand les valeurs changent
  const autoSaveDraft = () => {
    // Annuler le timer précédent
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Créer un nouveau timer (debounce de 2 secondes)
    autoSaveTimerRef.current = setTimeout(async () => {
      const weight = weightInputRef.current?.getValue();

      // Sauvegarder seulement si au moins le poids est renseigné
      if (weight) {
        const draft: WeightDraft = {
          timestamp: new Date().toISOString(),
          weight: weight.toString(),
          date: selectedDate,
          fatPercent,
          musclePercent,
          waterPercent,
          boneMass,
          visceralFat,
          metabolicAge,
          bmr,
          waist,
          chest,
          arm,
          thigh,
          hips,
          neck,
          calf,
          mood: selectedMood || undefined,
        };

        await draftService.saveWeightDraft(draft);
        logger.info('[Draft] Auto-sauvegarde effectuée');

        // Afficher l'indicateur brièvement
        setShowAutoSaveIndicator(true);
        setTimeout(() => {
          setShowAutoSaveIndicator(false);
        }, 2000);
      }
    }, 2000); // 2 secondes après la dernière modification
  };

  // Cleanup du timer au démontage
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Déclencher l'auto-save quand les valeurs changent
  useEffect(() => {
    autoSaveDraft();
  }, [
    selectedDate,
    fatPercent,
    musclePercent,
    waterPercent,
    boneMass,
    visceralFat,
    metabolicAge,
    bmr,
    waist,
    chest,
    arm,
    thigh,
    hips,
    neck,
    calf,
    selectedMood,
  ]);

  const handleDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      triggerHaptic();
    }
  };

  const handleSave = async () => {
    const weight = weightInputRef.current?.getValue();

    // Vérifier si au moins une donnée est remplie (poids OU mensurations OU composition)
    const hasMeasurements = waist || chest || arm || thigh || hips || neck || calf;
    const hasComposition = fatPercent || musclePercent || waterPercent || boneMass || visceralFat || metabolicAge || bmr;

    if (!weight && !hasMeasurements && !hasComposition) {
      Alert.alert(
        'Aucune donnée',
        'Veuillez entrer au moins :\n• Votre poids\n• Des mensurations (tour de taille, etc.)\n• Votre composition corporelle (% de graisse, etc.)'
      );
      return;
    }

    setIsSaving(true);
    triggerHaptic();

    try {
      await addWeight({
        weight: weight ?? 0,
        date: format(selectedDate, 'yyyy-MM-dd'),
        fat_percent: fatPercent ? parseFloat(fatPercent) : undefined,
        muscle_percent: musclePercent ? parseFloat(musclePercent) : undefined,
        water_percent: waterPercent ? parseFloat(waterPercent) : undefined,
        bone_mass: boneMass ? parseFloat(boneMass) : undefined,
        visceral_fat: visceralFat ? parseInt(visceralFat) : undefined,
        metabolic_age: metabolicAge ? parseInt(metabolicAge) : undefined,
        bmr: bmr ? parseInt(bmr) : undefined,
        waist: waist ? parseFloat(waist) : undefined,
        chest: chest ? parseFloat(chest) : undefined,
        arm: arm ? parseFloat(arm) : undefined,
        thigh: thigh ? parseFloat(thigh) : undefined,
        hips: hips ? parseFloat(hips) : undefined,
        neck: neck ? parseFloat(neck) : undefined,
        calf: calf ? parseFloat(calf) : undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Effacer le brouillon car sauvegarde réussie
      await draftService.clearWeightDraft();

      // Afficher la belle modal de succès
      setSavedWeight(weight ?? null);
      setShowSuccessModal(true);
    } catch (error) {
      logger.error('Erreur:', error);
      Alert.alert('Erreur', "Impossible d'enregistrer");
    } finally {
      setIsSaving(false);
    }
  };

  // Fonction pour sauvegarder sur iCloud
  const handleBackupToCloud = async () => {
    setShowSuccessModal(false);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Proposer les deux formats
    Alert.alert(
      'Choisir le format',
      'Quel format veux-tu utiliser pour sauvegarder tes données ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
          onPress: () => setShowSuccessModal(true),
        },
        {
          text: 'CSV (Excel/Numbers)',
          onPress: async () => {
            const success = await exportDataToCSV();
            if (success) {
              await backupReminderService.reset();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setTimeout(() => router.back(), 500);
            }
          },
        },
        {
          text: 'JSON (Réimport)',
          onPress: async () => {
            const success = await exportDataToJSON();
            if (success) {
              await backupReminderService.reset();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setTimeout(() => router.back(), 500);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Fonction pour fermer la modal
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    router.back();
  };

  // Card Component
  const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }, style]}>
      {children}
    </View>
  );

  // Section Header
  const SectionHeader = ({
    icon: Icon,
    color,
    title,
    subtitle
  }: {
    icon: any;
    color: string;
    title: string;
    subtitle?: string;
  }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: `${color}20` }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );

  // Input Row - Utilise NumericInput pour éviter les crashes
  const InputRow = ({ label, value, onChangeText, placeholder, suffix, color }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    suffix: string;
    color: string;
  }) => (
    <View style={styles.inputRow}>
      <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.inputWrapper}>
        <NumericInput
          value={value}
          onValueChange={onChangeText}
          placeholder={placeholder}
          unit={suffix}
          allowDecimal={true}
          maxDecimals={1}
          maxLength={4}
          color={color}
          backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
          inputStyle={styles.input}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.backgroundCard }]}
          onPress={() => {
            triggerHaptic();
            router.back();
          }}
        >
          <X size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Ajouter</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Auto-save Indicator */}
      {showAutoSaveIndicator && (
        <View style={[styles.autoSaveIndicator, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
          <Check size={16} color={colors.success} />
          <Text style={[styles.autoSaveText, { color: colors.success }]}>
            Brouillon sauvegardé
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {/* QUICK ACTION - Ajouter une séance d'entraînement */}
        <TouchableOpacity
          style={[styles.trainingQuickAction, { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' }]}
          onPress={() => {
            triggerHaptic();
            router.push('/add-training');
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.trainingQuickIcon, { backgroundColor: '#8B5CF6' }]}>
            <Dumbbell size={24} color="#FFFFFF" />
          </View>
          <View style={styles.trainingQuickContent}>
            <Text style={[styles.trainingQuickTitle, { color: colors.textPrimary }]}>
              Ajouter une séance
            </Text>
            <Text style={[styles.trainingQuickSubtitle, { color: colors.textMuted }]}>
              Entraînement, sparring, cours...
            </Text>
          </View>
          <ChevronRight size={24} color="#8B5CF6" />
        </TouchableOpacity>

        {/* Date Selector */}
        <TouchableOpacity
          style={[styles.dateSelector, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
          onPress={() => {
            triggerHaptic();
            setShowDatePicker(true);
          }}
        >
          <Calendar size={20} color={colors.accent} />
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>
            {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
          </Text>
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════ */}
        {/* POIDS - SECTION PRINCIPALE */}
        {/* ═══════════════════════════════════════════ */}
        <Card style={styles.weightCard}>
          <SectionHeader icon={Scale} color={colors.accent} title="Mon Poids" />

          {/* Weight Input - Isolé pour éviter les bugs de re-render */}
          <WeightInput
            ref={weightInputRef}
            onAdjust={triggerHaptic}
          />
        </Card>

        {/* ═══════════════════════════════════════════ */}
        {/* COMPOSITION CORPORELLE */}
        {/* ═══════════════════════════════════════════ */}
        <Card>
          <SectionHeader
            icon={Droplets}
            color="#4ECDC4"
            title="Composition Corporelle"
            subtitle="(balance connectée)"
          />

          {/* Ligne 1: Graisse, Muscle, Eau */}
          <View style={styles.compositionGrid}>
            <View style={styles.compositionItem}>
              <View style={[styles.compIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <Flame size={18} color="#EF4444" />
              </View>
              <Text style={[styles.compLabel, { color: colors.textPrimary }]}>Graisse</Text>
              <NumericInput
                value={fatPercent}
                onValueChange={setFatPercent}
                placeholder="00.0"
                unit="%"
                allowDecimal={true}
                maxDecimals={1}
                maxLength={4}
                color="#EF4444"
                backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                style={styles.compInputWrapper}
                inputStyle={styles.compInput}
              />
            </View>

            <View style={styles.compositionItem}>
              <View style={[styles.compIcon, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                <Dumbbell size={18} color="#22C55E" />
              </View>
              <Text style={[styles.compLabel, { color: colors.textPrimary }]}>Muscle</Text>
              <NumericInput
                value={musclePercent}
                onValueChange={setMusclePercent}
                placeholder="00.0"
                unit="%"
                allowDecimal={true}
                maxDecimals={1}
                maxLength={4}
                color="#22C55E"
                backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                style={styles.compInputWrapper}
                inputStyle={styles.compInput}
              />
            </View>

            <View style={styles.compositionItem}>
              <View style={[styles.compIcon, { backgroundColor: 'rgba(6,182,212,0.15)' }]}>
                <Droplets size={18} color="#06B6D4" />
              </View>
              <Text style={[styles.compLabel, { color: colors.textPrimary }]}>Eau</Text>
              <NumericInput
                value={waterPercent}
                onValueChange={setWaterPercent}
                placeholder="00.0"
                unit="%"
                allowDecimal={true}
                maxDecimals={1}
                maxLength={4}
                color="#06B6D4"
                backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                style={styles.compInputWrapper}
                inputStyle={styles.compInput}
              />
            </View>
          </View>

          {/* Ligne 2: Os, Graisse Viscérale */}
          <View style={[styles.compositionGrid, { marginTop: SPACING.lg }]}>
            <View style={styles.compositionItem}>
              <View style={[styles.compIcon, { backgroundColor: 'rgba(168,162,158,0.15)' }]}>
                <Bone size={18} color="#A8A29E" />
              </View>
              <Text style={[styles.compLabel, { color: colors.textPrimary }]}>Os</Text>
              <NumericInput
                value={boneMass}
                onValueChange={setBoneMass}
                placeholder="0.0"
                unit="kg"
                allowDecimal={true}
                maxDecimals={1}
                maxLength={3}
                color="#A8A29E"
                backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                style={styles.compInputWrapper}
                inputStyle={styles.compInput}
              />
            </View>

            <View style={styles.compositionItem}>
              <View style={[styles.compIcon, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
                <CircleDot size={18} color="#F97316" />
              </View>
              <Text style={[styles.compLabel, { color: colors.textPrimary }]}>Viscérale</Text>
              <NumericInput
                value={visceralFat}
                onValueChange={setVisceralFat}
                placeholder="0"
                allowDecimal={false}
                maxLength={2}
                color="#F97316"
                backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                style={styles.compInputWrapper}
                inputStyle={styles.compInput}
              />
            </View>

            <View style={styles.compositionItem}>
              <View style={[styles.compIcon, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
                <Activity size={18} color="#A855F7" />
              </View>
              <Text style={[styles.compLabel, { color: colors.textPrimary }]}>Âge Méta.</Text>
              <NumericInput
                value={metabolicAge}
                onValueChange={setMetabolicAge}
                placeholder="00"
                unit="ans"
                allowDecimal={false}
                maxLength={2}
                color="#A855F7"
                backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                style={styles.compInputWrapper}
                inputStyle={styles.compInput}
              />
            </View>
          </View>

          {/* Ligne 3: BMR */}
          <View style={[styles.bmrRow, { marginTop: SPACING.lg }]}>
            <View style={[styles.compIcon, { backgroundColor: 'rgba(234,179,8,0.15)' }]}>
              <Zap size={18} color="#EAB308" />
            </View>
            <Text style={[styles.bmrLabel, { color: colors.textPrimary }]}>Métabolisme de base (BMR)</Text>
            <NumericInput
              value={bmr}
              onValueChange={setBmr}
              placeholder="0000"
              unit="kcal"
              allowDecimal={false}
              maxLength={4}
              color="#EAB308"
              backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
              style={styles.bmrInputWrapper}
              inputStyle={styles.bmrInput}
            />
          </View>
        </Card>

        {/* ═══════════════════════════════════════════ */}
        {/* MENSURATIONS */}
        {/* ═══════════════════════════════════════════ */}
        <Card>
          <SectionHeader icon={Ruler} color="#8B5CF6" title="Mensurations" />

          <InputRow
            label="Tour de taille"
            value={waist}
            onChangeText={setWaist}
            placeholder="00"
            suffix="cm"
            color="#8B5CF6"
          />
          <InputRow
            label="Hanches"
            value={hips}
            onChangeText={setHips}
            placeholder="00"
            suffix="cm"
            color="#8B5CF6"
          />
          <InputRow
            label="Poitrine"
            value={chest}
            onChangeText={setChest}
            placeholder="00"
            suffix="cm"
            color="#8B5CF6"
          />
          <InputRow
            label="Cou"
            value={neck}
            onChangeText={setNeck}
            placeholder="00"
            suffix="cm"
            color="#8B5CF6"
          />
          <InputRow
            label="Bras (biceps)"
            value={arm}
            onChangeText={setArm}
            placeholder="00"
            suffix="cm"
            color="#8B5CF6"
          />
          <InputRow
            label="Cuisse"
            value={thigh}
            onChangeText={setThigh}
            placeholder="00"
            suffix="cm"
            color="#8B5CF6"
          />
          <InputRow
            label="Mollet"
            value={calf}
            onChangeText={setCalf}
            placeholder="00"
            suffix="cm"
            color="#8B5CF6"
          />
        </Card>

        {/* ═══════════════════════════════════════════ */}
        {/* MON RESSENTI */}
        {/* ═══════════════════════════════════════════ */}
        <Card>
          <SectionHeader icon={Heart} color="#EC4899" title="Mon Ressenti" />

          <View style={styles.moodGrid}>
            {MOODS.map((mood) => {
              const MoodIcon = mood.icon;
              return (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodItem,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                    selectedMood === mood.id && {
                      backgroundColor: `${mood.color}20`,
                      borderColor: mood.color,
                      borderWidth: 2,
                    }
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    setSelectedMood(mood.id);
                  }}
                >
                  <MoodIcon
                    size={28}
                    color={selectedMood === mood.id ? mood.color : colors.textMuted}
                    strokeWidth={2}
                  />
                  <Text style={[
                    styles.moodLabel,
                    { color: colors.textSecondary },
                    selectedMood === mood.id && { color: mood.color, fontWeight: '700' }
                  ]}>{mood.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* ═══════════════════════════════════════════ */}
        {/* PHOTO TRANSFORMATION - Design amélioré */}
        {/* ═══════════════════════════════════════════ */}
        <TouchableOpacity
          style={[styles.photoTransformationCard, { backgroundColor: colors.backgroundCard }]}
          onPress={() => {
            triggerHaptic();
            router.push('/transformation');
          }}
          activeOpacity={0.7}
        >
          {/* Content */}
          <View style={styles.photoTransformationContent}>
            <View style={styles.photoHeader}>
              <View style={[styles.photoIconLarge, { backgroundColor: `${colors.accent}20` }]}>
                <Camera size={32} color={colors.accent} />
              </View>
              <View style={styles.photoTextContainer}>
                <Text style={[styles.photoTitleLarge, { color: colors.textPrimary }]}>
                  Ma Transformation
                </Text>
                <Text style={[styles.photoSubtitleLarge, { color: colors.textMuted }]}>
                  Ajoute & Compare tes photos
                </Text>
              </View>
            </View>

            {/* Visual Indicator - Avant/Après */}
            <View style={styles.photoBeforeAfterIndicator}>
              <View style={styles.photoBeforeBox}>
                <View style={[styles.photoMiniIcon, { backgroundColor: '#EF444420' }]}>
                  <Camera size={16} color="#EF4444" />
                </View>
                <Text style={[styles.photoBeforeText, { color: colors.textSecondary }]}>Avant</Text>
              </View>

              <View style={styles.photoArrowContainer}>
                <ChevronRight size={20} color={colors.accent} strokeWidth={3} />
              </View>

              <View style={styles.photoAfterBox}>
                <View style={[styles.photoMiniIcon, { backgroundColor: '#10B98120' }]}>
                  <Camera size={16} color="#10B981" />
                </View>
                <Text style={[styles.photoAfterText, { color: colors.textSecondary }]}>Après</Text>
              </View>
            </View>

            {/* CTA */}
            <View style={[styles.photoCTA, { backgroundColor: colors.accent }]}>
              <Text style={[styles.photoCTAText, { color: colors.textOnGold }]}>Comparer mes photos</Text>
              <ChevronRight size={18} color={colors.textOnGold} strokeWidth={3} />
            </View>
          </View>
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════ */}
        {/* BOUTON ENREGISTRER */}
        {/* ═══════════════════════════════════════════ */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.accent }
          ]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Check size={24} color={colors.textOnGold} />
          <Text style={[
            styles.saveButtonText,
            { color: colors.textOnGold }
          ]}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
          >
            <View style={styles.datePickerModal}>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.backgroundCard }]}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={[styles.datePickerButton, { color: colors.accent }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={[styles.datePickerButton, { color: colors.accent, fontWeight: '700' }]}>OK</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  locale="fr-FR"
                  textColor={colors.textPrimary}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )
      )}

      {/* Success Modal - Belle popup de confirmation */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseSuccessModal}
      >
        <View style={styles.successModalOverlay}>
          <View style={[styles.successModalContent, { backgroundColor: colors.backgroundCard }]}>
            {/* Icône de succès */}
            <View style={[styles.successIconContainer, { backgroundColor: colors.success + '20' }]}>
              <CheckCircle2 size={64} color={colors.success} strokeWidth={2.5} />
            </View>

            {/* Titre */}
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
              Données enregistrées !
            </Text>

            {/* Détails */}
            <View style={styles.successDetails}>
              <View style={styles.successDetailRow}>
                <Scale size={18} color={colors.accent} />
                <Text style={[styles.successDetailText, { color: colors.textSecondary }]}>
                  Poids : <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{savedWeight} kg</Text>
                </Text>
              </View>
              <View style={styles.successDetailRow}>
                <Calendar size={18} color={colors.accent} />
                <Text style={[styles.successDetailText, { color: colors.textSecondary }]}>
                  {format(selectedDate, 'dd MMMM yyyy', { locale: fr })}
                </Text>
              </View>
            </View>

            {/* Alerte importante */}
            <View style={[styles.warningBox, { backgroundColor: colors.gold + '15', borderColor: colors.gold }]}>
              <Cloud size={20} color={colors.gold} />
              <Text style={[styles.warningText, { color: colors.textPrimary }]}>
                <Text style={{ fontWeight: '700' }}>Important :</Text> Sauvegardez vos données sur iCloud pour ne jamais les perdre !
              </Text>
            </View>

            {/* Boutons */}
            <View style={styles.successButtons}>
              {/* Bouton PRINCIPAL : Sauvegarder sur iCloud */}
              <TouchableOpacity
                style={[styles.cloudButton, { backgroundColor: colors.gold }]}
                onPress={handleBackupToCloud}
                activeOpacity={0.8}
              >
                <Cloud size={24} color={colors.textOnGold} strokeWidth={2.5} />
                <Text style={[styles.cloudButtonText, { color: colors.textOnGold }]}>Sauvegarder sur iCloud</Text>
              </TouchableOpacity>

              {/* Bouton secondaire : Plus tard */}
              <TouchableOpacity
                style={[styles.laterButton, { borderColor: colors.border }]}
                onPress={handleCloseSuccessModal}
                activeOpacity={0.7}
              >
                <Text style={[styles.laterButtonText, { color: colors.textMuted }]}>
                  Plus tard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Auto-save Indicator
  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  autoSaveText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Training Quick Action
  trainingQuickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    gap: SPACING.md,
  },
  trainingQuickIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingQuickContent: {
    flex: 1,
  },
  trainingQuickTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  trainingQuickSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },

  // Date
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  dateText: {
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  datePickerContainer: {
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  datePickerButton: {
    fontSize: 16,
  },

  // Card
  card: {
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },

  // Weight Card
  weightCard: {
    alignItems: 'center',
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  weightAdjustBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  weightIntInput: {
    fontSize: 72,
    fontWeight: '900',
    minWidth: 100,
    textAlign: 'right',
  },
  weightDot: {
    fontSize: 56,
    fontWeight: '700',
  },
  weightDecInput: {
    fontSize: 48,
    fontWeight: '700',
    minWidth: 40,
  },
  weightUnit: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },

  // Composition
  compositionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  compositionItem: {
    flex: 1,
    alignItems: 'center',
  },
  compIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  compLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  compInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    width: '100%',
  },
  compInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  compSuffix: {
    fontSize: 14,
    fontWeight: '700',
  },

  // BMR Row
  bmrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  bmrLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: SPACING.md,
  },
  bmrInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  bmrInput: {
    fontSize: 18,
    fontWeight: '700',
    width: 60,
    textAlign: 'center',
  },

  // Input Row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    fontSize: 16,
    fontWeight: '700',
    width: 60,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Mood Grid
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  moodItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 4,
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Photo Transformation Card - Design amélioré
  photoTransformationCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  photoTransformationContent: {
    gap: SPACING.lg,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  photoIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTextContainer: {
    flex: 1,
  },
  photoTitleLarge: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  photoSubtitleLarge: {
    fontSize: 14,
    fontWeight: '500',
  },
  photoBeforeAfterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  photoBeforeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  photoAfterBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  photoMiniIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBeforeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  photoAfterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  photoArrowContainer: {
    paddingHorizontal: SPACING.sm,
  },
  photoCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  photoCTAText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: RADIUS.xl,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Success Modal
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  successModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  successDetails: {
    width: '100%',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  successDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  successDetailText: {
    fontSize: 15,
    flex: 1,
  },
  warningBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    marginBottom: SPACING.lg,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  successButtons: {
    width: '100%',
    gap: SPACING.md,
  },
  cloudButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: RADIUS.xl,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  cloudButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  laterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
  },
  laterButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
