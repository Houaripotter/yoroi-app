import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

type Gender = 'male' | 'female';

export const IdealWeightCalculator = React.memo(function IdealWeightCalculator({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<Gender>('male');

  const calculateIdealWeight = () => {
    const h = parseFloat(height);
    if (!h || h === 0) return { min: 0, max: 0 };
    const heightM = h / 100;
    const minIMC = 18.5 * heightM * heightM;
    const maxIMC = 24.9 * heightM * heightM;
    return { min: Math.round(minIMC * 10) / 10, max: Math.round(maxIMC * 10) / 10 };
  };

  const result = calculateIdealWeight();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Poids Ideal</Text>
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

          <View style={styles.inputRow}>
            <Text style={{ color: colors.textSecondary }}>Taille</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput style={[styles.input, { color: colors.textPrimary }]} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textMuted} />
              <Text style={{ color: colors.textMuted }}>cm</Text>
            </View>
          </View>

          {result.min > 0 && (
            <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary }}>Fourchette de poids ideal</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={[styles.resultValue, { color: colors.gold }]}>{result.min} - {result.max}</Text>
                <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '600' }}>kg</Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>Basee sur un IMC entre 18.5 et 24.9</Text>
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
  resultCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginTop: 20, alignItems: 'center' },
  resultValue: { fontSize: 36, fontWeight: '900' },
});
