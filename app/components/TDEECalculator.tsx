import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

type Gender = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { label: string; value: number; desc: string }> = {
  sedentary: { label: 'Sedentaire', value: 1.2, desc: 'Peu ou pas d\'exercice' },
  light: { label: 'Legerement actif', value: 1.375, desc: '1-3 jours/semaine' },
  moderate: { label: 'Moderement actif', value: 1.55, desc: '3-5 jours/semaine' },
  active: { label: 'Tres actif', value: 1.725, desc: '6-7 jours/semaine' },
  very_active: { label: 'Extremement actif', value: 1.9, desc: 'Athlete, travail physique' },
};

export const TDEECalculator = React.memo(function TDEECalculator({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');

  const calculateBMR = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);
    if (!w || !h || !a) return 0;
    const base = (10 * w) + (6.25 * h) - (5 * a);
    return gender === 'male' ? base + 5 : base - 161;
  };

  const calculateTDEE = () => calculateBMR() * ACTIVITY_MULTIPLIERS[activityLevel].value;
  const tdee = calculateTDEE();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>TDEE - Besoins Caloriques</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.content} contentContainerStyle={{ padding: 20 }}>
          <View style={styles.genderToggle}>
            <TouchableOpacity style={[styles.genderButton, { backgroundColor: gender === 'male' ? colors.gold : colors.cardHover }]} onPress={() => setGender('male')}>
              <Text style={{ color: gender === 'male' ? colors.background : colors.textSecondary, fontWeight: '600' }}>Homme</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.genderButton, { backgroundColor: gender === 'female' ? colors.gold : colors.cardHover }]} onPress={() => setGender('female')}>
              <Text style={{ color: gender === 'female' ? colors.background : colors.textSecondary, fontWeight: '600' }}>Femme</Text>
            </TouchableOpacity>
          </View>

          {['Poids:kg', 'Taille:cm', 'Age:ans'].map((item) => {
            const [label, unit] = item.split(':');
            const value = label === 'Poids' ? weight : label === 'Taille' ? height : age;
            const setter = label === 'Poids' ? setWeight : label === 'Taille' ? setHeight : setAge;
            return (
              <View key={label} style={styles.inputRow}>
                <Text style={{ color: colors.textSecondary }}>{label}</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
                  <TextInput style={[styles.input, { color: colors.textPrimary }]} value={value} onChangeText={label === 'Age' ? setter : (text) => setter(text.replace(',', '.'))} keyboardType={label === 'Age' ? "number-pad" : "decimal-pad"} maxLength={5} placeholder="0" placeholderTextColor={colors.textMuted} />
                  <Text style={{ color: colors.textMuted }}>{unit}</Text>
                </View>
              </View>
            );
          })}

          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Niveau d'activite</Text>
          {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((level) => (
            <TouchableOpacity key={level} style={[styles.activityItem, { backgroundColor: activityLevel === level ? colors.goldMuted : colors.cardHover }]} onPress={() => setActivityLevel(level)}>
              <Text style={{ color: activityLevel === level ? colors.gold : colors.textPrimary, fontWeight: '600' }}>{ACTIVITY_MULTIPLIERS[level].label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{ACTIVITY_MULTIPLIERS[level].desc}</Text>
            </TouchableOpacity>
          ))}

          {tdee > 0 && (
            <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary }}>Tes besoins caloriques</Text>
              <Text style={[styles.resultValue, { color: colors.gold }]}>{Math.round(tdee)}</Text>
              <Text style={{ color: colors.gold }}>kcal/jour</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  content: { flex: 1 },
  genderToggle: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  genderButton: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12 },
  input: { fontSize: 18, fontWeight: '700', width: 70, textAlign: 'center', paddingVertical: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '600', marginTop: 8, marginBottom: 12 },
  activityItem: { padding: 14, borderRadius: 12, marginBottom: 8 },
  resultCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginTop: 20, alignItems: 'center' },
  resultValue: { fontSize: 56, fontWeight: '900' },
});
