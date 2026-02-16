import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X, Info } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

type Gender = 'male' | 'female';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const BMRCalculator = React.memo(function BMRCalculator({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');

  const calculateBMR = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);
    if (!w || !h || !a || w === 0 || h === 0 || a === 0) return 0;
    const base = (10 * w) + (6.25 * h) - (5 * a);
    const bmr = gender === 'male' ? base + 5 : base - 161;
    return isNaN(bmr) || !isFinite(bmr) ? 0 : bmr;
  };

  const bmr = calculateBMR();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>BMR - Metabolisme de Base</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Gender Toggle */}
          <View style={styles.genderToggle}>
            <TouchableOpacity style={[styles.genderButton, { backgroundColor: gender === 'male' ? colors.gold : colors.cardHover }]} onPress={() => setGender('male')}>
              <Text style={[styles.genderText, { color: gender === 'male' ? colors.background : colors.textSecondary }]}>Homme</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.genderButton, { backgroundColor: gender === 'female' ? colors.gold : colors.cardHover }]} onPress={() => setGender('female')}>
              <Text style={[styles.genderText, { color: gender === 'female' ? colors.background : colors.textSecondary }]}>Femme</Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poids</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput style={[styles.input, { color: colors.textPrimary }]} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={5} placeholder="0" placeholderTextColor={colors.textMuted} />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>kg</Text>
            </View>
          </View>

          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Taille</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput style={[styles.input, { color: colors.textPrimary }]} value={height} onChangeText={setHeight} keyboardType="decimal-pad" maxLength={5} placeholder="0" placeholderTextColor={colors.textMuted} />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>cm</Text>
            </View>
          </View>

          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Age</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput style={[styles.input, { color: colors.textPrimary }]} value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} placeholder="0" placeholderTextColor={colors.textMuted} />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>ans</Text>
            </View>
          </View>

          {/* Résultat */}
          {bmr > 0 && (
            <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Ton metabolisme de base</Text>
              <Text style={[styles.resultValue, { color: colors.gold }]}>{Math.round(bmr)}</Text>
              <Text style={[styles.resultUnit, { color: colors.gold }]}>kcal/jour</Text>
              <Text style={[styles.resultExplain, { color: colors.textMuted }]}>
                C'est l'energie que ton corps depense au repos, juste pour fonctionner (respirer, digerer, etc.)
              </Text>
            </View>
          )}

          <View style={[styles.formulaCard, { backgroundColor: colors.cardHover }]}>
            <Info size={16} color={colors.textMuted} />
            <View>
              <Text style={[styles.formulaText, { color: colors.textMuted }]}>Formule Mifflin-St Jeor :</Text>
              <Text style={[styles.formulaDetail, { color: colors.textMuted }]}>H: (10×P) + (6.25×T) - (5×A) + 5</Text>
              <Text style={[styles.formulaDetail, { color: colors.textMuted }]}>F: (10×P) + (6.25×T) - (5×A) - 161</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
});

const RADIUS = { sm: 8, md: 12, lg: 16 };

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  closeButton: { padding: 4 },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  genderToggle: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  genderButton: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  genderText: { fontSize: 15, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  inputLabel: { fontSize: 15, fontWeight: '500' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, paddingHorizontal: 12 },
  input: { fontSize: 18, fontWeight: '700', width: 70, textAlign: 'center', paddingVertical: 10 },
  inputUnit: { fontSize: 14, fontWeight: '500', marginLeft: 4 },
  resultCard: { padding: 20, borderRadius: RADIUS.lg, borderWidth: 1, marginTop: 20, alignItems: 'center' },
  resultLabel: { fontSize: 14, marginBottom: 8 },
  resultValue: { fontSize: 56, fontWeight: '900', letterSpacing: -2 },
  resultUnit: { fontSize: 18, fontWeight: '600', marginTop: -4 },
  resultExplain: { fontSize: 13, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  formulaCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: RADIUS.md, marginTop: 20 },
  formulaText: { fontSize: 12 },
  formulaDetail: { fontSize: 11, fontFamily: 'monospace', marginTop: 4 },
});
