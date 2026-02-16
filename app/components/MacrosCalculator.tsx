import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

type Gender = 'male' | 'female';
type Goal = 'lose' | 'maintain' | 'gain';

const MACROS_BY_GOAL: Record<Goal, { protein: number; carbs: number; fat: number; label: string }> = {
  lose: { protein: 40, carbs: 30, fat: 30, label: 'Perte de poids' },
  maintain: { protein: 30, carbs: 40, fat: 30, label: 'Maintien' },
  gain: { protein: 35, carbs: 45, fat: 20, label: 'Prise de muscle' },
};

export const MacrosCalculator = React.memo(function MacrosCalculator({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [goal, setGoal] = useState<Goal>('lose');

  const calculateBMR = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);
    if (!w || !h || !a) return 0;
    const base = (10 * w) + (6.25 * h) - (5 * a);
    return gender === 'male' ? base + 5 : base - 161;
  };

  const calculateMacros = () => {
    const tdee = calculateBMR() * 1.55; // moderate activity
    let targetCal = tdee;
    if (goal === 'lose') targetCal = tdee - 500;
    else if (goal === 'gain') targetCal = tdee + 300;

    const macros = MACROS_BY_GOAL[goal];
    return {
      calories: Math.round(targetCal),
      protein: Math.round((targetCal * macros.protein / 100) / 4),
      carbs: Math.round((targetCal * macros.carbs / 100) / 4),
      fat: Math.round((targetCal * macros.fat / 100) / 9),
      percentages: macros,
    };
  };

  const result = calculateMacros();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Repartition Macros</Text>
          <TouchableOpacity onPress={onClose}><X size={24} color={colors.textSecondary} /></TouchableOpacity>
        </View>
        <ScrollView style={styles.content} contentContainerStyle={{ padding: 20 }}>
          <View style={styles.genderToggle}>
            {(['male', 'female'] as Gender[]).map((g) => (
              <TouchableOpacity key={g} style={[styles.button, { backgroundColor: gender === g ? colors.gold : colors.cardHover }]} onPress={() => setGender(g)}>
                <Text style={{ color: gender === g ? colors.background : colors.textSecondary, fontWeight: '600' }}>{g === 'male' ? 'Homme' : 'Femme'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {['Poids:kg', 'Taille:cm', 'Age:ans'].map((item) => {
            const [label, unit] = item.split(':');
            const value = label === 'Poids' ? weight : label === 'Taille' ? height : age;
            const setter = label === 'Poids' ? setWeight : label === 'Taille' ? setHeight : setAge;
            const maxLen = label === 'Age' ? 3 : 5;
            return (
              <View key={label} style={styles.inputRow}>
                <Text style={{ color: colors.textSecondary }}>{label}</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
                  <TextInput style={[styles.input, { color: colors.textPrimary }]} value={value} onChangeText={label === 'Age' ? setter : (text) => setter(text.replace(',', '.'))} keyboardType={label === 'Age' ? "number-pad" : "decimal-pad"} placeholder="0" placeholderTextColor={colors.textMuted} maxLength={maxLen} />
                  <Text style={{ color: colors.textMuted }}>{unit}</Text>
                </View>
              </View>
            );
          })}

          <Text style={{ color: colors.textPrimary, fontWeight: '600', marginTop: 8, marginBottom: 12 }}>Objectif</Text>
          <View style={styles.goalToggle}>
            {(['lose', 'maintain', 'gain'] as Goal[]).map((g) => (
              <TouchableOpacity key={g} style={[styles.goalButton, { backgroundColor: goal === g ? colors.gold : colors.cardHover }]} onPress={() => setGoal(g)}>
                <Text style={{ color: goal === g ? colors.background : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{MACROS_BY_GOAL[g].label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {result.calories > 0 && (
            <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.resultValue, { color: colors.gold }]}>{result.calories}</Text>
              <Text style={{ color: colors.gold }}>kcal/jour</Text>
              <View style={styles.macrosGrid}>
                <View style={[styles.macroItem, { backgroundColor: colors.successMuted }]}>
                  <Text style={{ color: colors.success, fontSize: 20, fontWeight: '800' }}>{result.protein}g</Text>
                  <Text style={{ color: colors.success }}>Proteines</Text>
                </View>
                <View style={[styles.macroItem, { backgroundColor: colors.warningMuted }]}>
                  <Text style={{ color: colors.warning, fontSize: 20, fontWeight: '800' }}>{result.carbs}g</Text>
                  <Text style={{ color: colors.warning }}>Glucides</Text>
                </View>
                <View style={[styles.macroItem, { backgroundColor: colors.infoMuted }]}>
                  <Text style={{ color: colors.info, fontSize: 20, fontWeight: '800' }}>{result.fat}g</Text>
                  <Text style={{ color: colors.info }}>Lipides</Text>
                </View>
              </View>
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
  button: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12 },
  input: { fontSize: 18, fontWeight: '700', width: 70, textAlign: 'center', paddingVertical: 10 },
  goalToggle: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  goalButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  resultCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginTop: 20, alignItems: 'center' },
  resultValue: { fontSize: 42, fontWeight: '900' },
  macrosGrid: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 16 },
  macroItem: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
});
