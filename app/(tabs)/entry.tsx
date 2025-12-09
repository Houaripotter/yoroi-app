import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Ruler, 
  Weight, 
  Activity, 
  Droplet, 
  Flame, 
  Bone, 
  Dna, 
  Save, 
  Calendar as CalendarIcon, 
  ChevronDown,
  CircleDashed,
  Accessibility
} from 'lucide-react-native';
import { theme } from '@/lib/theme'; // Chemin corrigé
import { addMeasurement } from '@/lib/storage';   // Chemin corrigé et fonction renommée
import DateTimePicker from '@react-native-community/datetimepicker';

export default function EntryScreen() {
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ÉTAT DU FORMULAIRE COMPLETC --- 
  const [formData, setFormData] = useState({
    weight: '',
    // Haut du corps
    shoulders: '',
    chest: '',
    arm_left: '',
    arm_right: '',
    // Tronc
    waist: '',
    navel: '',
    hips: '',
    // Bas du corps
    thigh_left: '',
    thigh_right: '',
    // Tanita / Composition
    fat_percent: '',
    fat_kg: '',
    muscle_kg: '',
    visceral: '',
    water_percent: '',
    water_kg: '',
    bone_mass: '',
    metabolic_age: '',
    bmr: '',
    bmi: ''
  });

  const handleSave = async () => {
    try {
      if (!formData.weight) {
        Alert.alert('Erreur', 'Le poids est obligatoire.');
        return;
      }
      setIsSubmitting(true);
      const numericData: any = {
        date: date.toISOString(),
      };

      // Conversion sécurisée en nombres
      Object.keys(formData).forEach(key => {
        const value = formData[key as keyof typeof formData];
        if (value && value.trim() !== '') {
          numericData[key] = parseFloat(value.replace(',', '.'));
        }
      });

      // La fonction saveMeasurement du storage est utilisée
      await addMeasurement(numericData); // Assuming addMeasurement handles the full object
      
      Alert.alert('Succès', 'Mesures enregistrées', [
        { text: 'OK', onPress: () => router.push('/(tabs)') }
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- COMPOSANTS UI REUTILISABLES ---
  const InputField = ({ label, field, icon: Icon, placeholder = "0.0", half = false }: any) => (
    <View style={[styles.inputContainer, half && styles.halfInput]}>
      <View style={styles.labelRow}>
        {Icon && <Icon size={14} color={theme.colors.primary} style={styles.icon} />}
        <Text style={styles.label}>{label}</Text>
      </View>
      <TextInput
        style={styles.input}
        value={formData[field as keyof typeof formData]}
        onChangeText={(text) => updateField(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#CCC"
        keyboardType="numeric"
        returnKeyType="done"
      />
    </View>
  );

  const SectionTitle = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* HEADER & DATE */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nouvelle Saisie</Text>
          <TouchableOpacity 
            style={styles.dateSelector} 
            onPress={() => setShowDatePicker(true)}
          >
            <CalendarIcon size={18} color={theme.colors.textSecondary} />
            <Text style={styles.dateText}>
              {format(date, 'EEEE d MMMM', { locale: fr })}
            </Text>
            <ChevronDown size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {/* --- POIDS (HERO) --- */}
        <View style={styles.weightCard}>
          <Text style={styles.weightLabel}>POIDS ACTUEL</Text>
          <View style={styles.weightInputRow}>
            <TextInput
              style={styles.weightInput}
              value={formData.weight}
              onChangeText={(t) => updateField('weight', t)}
              placeholder="0.0"
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={styles.unitText}>KG</Text>
          </View>
        </View>

        {/* --- ZONE 1 : HAUT DU CORPS --- */}
        <SectionTitle title="HAUT DU CORPS" />
        <View style={styles.card}>
          <InputField label="Épaules (CM)" field="shoulders" icon={Accessibility} />
          <View style={styles.separator} />
          <InputField label="Thorax / Poitrine (CM)" field="chest" icon={CircleDashed} />
          <View style={styles.separator} />
          <View style={styles.row}>
            <InputField label="Bras Gauche" field="arm_left" icon={Ruler} half />
            <InputField label="Bras Droit" field="arm_right" icon={Ruler} half />
          </View>
        </View>

        {/* --- ZONE 2 : TRONC --- */}
        <SectionTitle title="SANGLE ABDOMINALE" />
        <View style={styles.card}>
          <InputField label="Taille (Au plus fin)" field="waist" icon={CircleDashed} />
          <View style={styles.separator} />
          <InputField label="Nombril" field="navel" icon={CircleDashed} />
          <View style={styles.separator} />
          <InputField label="Hanches (Au plus large)" field="hips" icon={CircleDashed} />
        </View>

        {/* --- ZONE 3 : BAS DU CORPS --- */}
        <SectionTitle title="BAS DU CORPS" />
        <View style={styles.card}>
          <View style={styles.row}>
            <InputField label="Cuisse Gauche" field="thigh_left" icon={Ruler} half />
            <InputField label="Cuisse Droite" field="thigh_right" icon={Ruler} half />
          </View>
        </View>

        {/* --- ZONE 4 : TANITA --- */}
        <SectionTitle title="ANALYSE CORPORELLE (Tanita)" />
        <View style={styles.card}>
          <View style={styles.row}>
            <InputField label="Graisse %" field="fat_percent" icon={Activity} half />
            <InputField label="Graisse KG" field="fat_kg" icon={Weight} half />
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <InputField label="Muscle KG" field="muscle_kg" icon={Dna} half />
            <InputField label="Viscéral" field="visceral" icon={Activity} half />
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <InputField label="Eau %" field="water_percent" icon={Droplet} half />
            <InputField label="Eau KG" field="water_kg" icon={Droplet} half />
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <InputField label="Masse Osseuse" field="bone_mass" icon={Bone} half />
            <InputField label="Age Métab." field="metabolic_age" icon={Activity} half />
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <InputField label="BMR (Kcal)" field="bmr" icon={Flame} half />
            <InputField label="IMC" field="bmi" icon={Activity} half />
          </View>
        </View>

        {/* ESPACE POUR LE BOUTON */}
        <View style={{ height: 100 }} />

      </ScrollView>

      {/* BOUTON FLOTTANT FIXE EN BAS */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, isSubmitting && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <Save size={24} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>
            {isSubmitting ? 'ENREGISTREMENT...' : 'ENREGISTRER'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100, // Espace pour le bouton de sauvegarde flottant
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    ...theme.shadow.sm,
  },
  dateText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    marginRight: theme.spacing.xs,
  },
  weightCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadow.md,
  },
  weightLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.lg,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.md,
  },
  weightInput: {
    fontSize: theme.fontSize.display,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    width: Platform.OS === 'web' ? 'auto' : 150, // Ajustement pour web/mobile
    padding: 0, // Supprimer le padding par défaut de TextInput
  },
  unitText: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    marginBottom: 8, // Ajustement pour alignement visuel
    marginLeft: theme.spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginRight: theme.spacing.md,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadow.sm,
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: theme.spacing.xs, // Adjusted for spacing in rows
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  icon: {
    marginRight: theme.spacing.xs,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -theme.spacing.xs, // Compensate for halfInput margin
    marginBottom: theme.spacing.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : theme.spacing.lg, // Ajustement pour iPhone X et plus
    ...theme.shadow.lg,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.md,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
});
