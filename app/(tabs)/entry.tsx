import React, { useState, useEffect, useCallback } from 'react';
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

const InputField = React.memo(({ label, field, icon: Icon, placeholder = "0.0", half = false, value, onChangeText }: any) => (
  <View style={[styles.inputContainer, half && styles.halfInput]}>
    <View style={styles.labelRow}>
      {Icon && <Icon size={14} color={theme.colors.primary} style={styles.icon} />}
      <Text style={styles.label}>{label}</Text>
    </View>
    <TextInput
      key={field} // Ajout d'une clé unique pour maintenir le focus
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#CCC"
      keyboardType="numeric"
      returnKeyType="done"
    />
  </View>
));

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

  const updateField = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);
}