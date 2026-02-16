import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X, Info, Droplet } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const WaterCalculator = React.memo(function WaterCalculator({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const [weight, setWeight] = useState('');
  const [exerciseHours, setExerciseHours] = useState(1);

  const calculateWater = () => {
    const w = parseFloat(weight);
    if (!w || w === 0) return { base: 0, withExercise: 0 };
    const base = w * 0.033;
    const withExercise = base + (exerciseHours * 0.5);
    return {
      base: Math.round(base * 10) / 10,
      withExercise: Math.round(withExercise * 10) / 10,
    };
  };

  const water = calculateWater();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Eau Quotidienne</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poids</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput style={[styles.input, { color: colors.textPrimary }]} value={weight} onChangeText={(text) => setWeight(text.replace(',', '.'))} keyboardType="decimal-pad" maxLength={5} placeholder="0" placeholderTextColor={colors.textMuted} />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>kg</Text>
            </View>
          </View>

          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Heures d'exercice/jour</Text>
            <View style={styles.exerciseButtons}>
              {[0, 0.5, 1, 1.5, 2].map((h) => (
                <TouchableOpacity key={h} style={[styles.exerciseButton, { backgroundColor: exerciseHours === h ? colors.gold : colors.cardHover }]} onPress={() => setExerciseHours(h)}>
                  <Text style={[styles.exerciseButtonText, { color: exerciseHours === h ? colors.background : colors.textSecondary }]}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {water.base > 0 && (
            <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Tes besoins en eau</Text>
              <View style={styles.waterResults}>
                <View style={styles.waterResultItem}>
                  <Droplet size={28} color="#3B82F6" />
                  <Text style={[styles.waterResultValue, { color: '#3B82F6' }]}>{water.base}L</Text>
                  <Text style={[styles.waterResultLabel, { color: colors.textMuted }]}>Minimum (repos)</Text>
                </View>
                {exerciseHours > 0 && (
                  <View style={styles.waterResultItem}>
                    <Droplet size={28} color={colors.gold} />
                    <Text style={[styles.waterResultValue, { color: colors.gold }]}>{water.withExercise}L</Text>
                    <Text style={[styles.waterResultLabel, { color: colors.textMuted }]}>Avec exercice</Text>
                  </View>
                )}
              </View>
              <View style={[styles.waterTip, { backgroundColor: colors.infoMuted }]}>
                <Info size={16} color={colors.info} />
                <Text style={[styles.waterTipText, { color: colors.info }]}>+0.5L par heure d'exercice intense</Text>
              </View>
            </View>
          )}

          <View style={[styles.formulaCard, { backgroundColor: colors.cardHover }]}>
            <Info size={16} color={colors.textMuted} />
            <Text style={[styles.formulaText, { color: colors.textMuted }]}>Formule : Poids (kg) × 0.033 = Litres/jour</Text>
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
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  inputLabel: { fontSize: 15, fontWeight: '500' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, paddingHorizontal: 12 },
  input: { fontSize: 18, fontWeight: '700', width: 70, textAlign: 'center', paddingVertical: 10 },
  inputUnit: { fontSize: 14, fontWeight: '500', marginLeft: 4 },
  exerciseButtons: { flexDirection: 'row', gap: 8 },
  exerciseButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.sm },
  exerciseButtonText: { fontSize: 14, fontWeight: '600' },
  resultCard: { padding: 20, borderRadius: RADIUS.lg, borderWidth: 1, marginTop: 20, alignItems: 'center' },
  resultLabel: { fontSize: 14, marginBottom: 8 },
  waterResults: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginVertical: 16 },
  waterResultItem: { alignItems: 'center', gap: 8 },
  waterResultValue: { fontSize: 32, fontWeight: '900' },
  waterResultLabel: { fontSize: 12 },
  waterTip: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: RADIUS.md, width: '100%' },
  waterTipText: { fontSize: 12, fontWeight: '500' },
  formulaCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: RADIUS.md, marginTop: 20 },
  formulaText: { fontSize: 12 },
});
