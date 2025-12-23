import React, { useState, useRef } from 'react';
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
  type LucideIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS, FONT, SHADOWS } from '@/constants/appTheme';
import { addWeight } from '@/lib/database';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NumericInput } from '@/components/NumericInput';
import { WeightInput, WeightInputHandle } from '@/components/WeightInput';

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

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

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

    if (!weight) {
      Alert.alert('Erreur', 'Veuillez entrer votre poids');
      return;
    }

    setIsSaving(true);
    triggerHaptic();

    try {
      await addWeight({
        weight,
        date: format(selectedDate, 'yyyy-MM-dd'),
        fat_percent: fatPercent ? parseFloat(fatPercent) : undefined,
        muscle_percent: musclePercent ? parseFloat(musclePercent) : undefined,
        water_percent: waterPercent ? parseFloat(waterPercent) : undefined,
        bone_mass: boneMass ? parseFloat(boneMass) : undefined,
        visceral_fat: visceralFat ? parseInt(visceralFat) : undefined,
        metabolic_age: metabolicAge ? parseInt(metabolicAge) : undefined,
        bmr: bmr ? parseInt(bmr) : undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Enregistré !', `Poids: ${weight} kg`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', "Impossible d'enregistrer");
    } finally {
      setIsSaving(false);
    }
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
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
              <Text style={[styles.compLabel, { color: colors.textMuted }]}>Graisse</Text>
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
              <Text style={[styles.compLabel, { color: colors.textMuted }]}>Muscle</Text>
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
              <Text style={[styles.compLabel, { color: colors.textMuted }]}>Eau</Text>
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
              <Text style={[styles.compLabel, { color: colors.textMuted }]}>Os</Text>
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
              <Text style={[styles.compLabel, { color: colors.textMuted }]}>Viscérale</Text>
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
              <Text style={[styles.compLabel, { color: colors.textMuted }]}>Âge Méta.</Text>
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
            <Text style={[styles.bmrLabel, { color: colors.textMuted }]}>Métabolisme de base (BMR)</Text>
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
        {/* PHOTO */}
        {/* ═══════════════════════════════════════════ */}
        <TouchableOpacity
          style={[styles.photoCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
          onPress={() => {
            triggerHaptic();
            router.push('/transformation');
          }}
        >
          <View style={[styles.photoIcon, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
            <Camera size={28} color="#F97316" />
          </View>
          <View style={styles.photoContent}>
            <Text style={[styles.photoTitle, { color: colors.textPrimary }]}>Ajouter une Photo</Text>
            <Text style={[styles.photoSubtitle, { color: colors.textMuted }]}>Suivre ma transformation</Text>
          </View>
          <ChevronRight size={24} color={colors.textMuted} />
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
          <Check size={24} color="#FFF" />
          <Text style={[
            styles.saveButtonText,
            { color: '#FFF' }
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

  // Photo Card
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xxl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  photoIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  photoContent: {
    flex: 1,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  photoSubtitle: {
    fontSize: 13,
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
});
