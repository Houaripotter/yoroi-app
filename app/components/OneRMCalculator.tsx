import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

export const OneRMCalculator = React.memo(function OneRMCalculator({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  const calculateOneRM = () => {
    const w = parseFloat(weight);
    const r = parseInt(reps);
    if (!w || !r || w === 0 || r === 0) return 0;
    if (r === 1) return w;
    return Math.round(w * (1 + r / 30));
  };

  const oneRM = calculateOneRM();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>1RM - Calculateur de Force</Text>
          <TouchableOpacity onPress={onClose}><X size={24} color={colors.textSecondary} /></TouchableOpacity>
        </View>
        <ScrollView style={styles.content} contentContainerStyle={{ padding: 20 }}>
          <View style={styles.liftInputsRow}>
            <View style={styles.liftInputContainer}>
              <Text style={{ color: colors.textSecondary }}>Charge</Text>
              <View style={[styles.liftInputBox, { backgroundColor: colors.cardHover }]}>
                <TextInput style={[styles.liftInput, { color: colors.textPrimary }]} value={weight} onChangeText={(text) => setWeight(text.replace(',', '.'))} keyboardType="decimal-pad" placeholder="60" placeholderTextColor={colors.textMuted} maxLength={5} />
                <Text style={{ color: colors.textMuted }}>kg</Text>
              </View>
            </View>

            <Text style={{ color: colors.textMuted, fontSize: 24, fontWeight: '700', marginTop: 20 }}>×</Text>

            <View style={styles.liftInputContainer}>
              <Text style={{ color: colors.textSecondary }}>Reps</Text>
              <View style={[styles.liftInputBox, { backgroundColor: colors.cardHover }]}>
                <TextInput style={[styles.liftInput, { color: colors.textPrimary }]} value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="5" placeholderTextColor={colors.textMuted} maxLength={3} />
              </View>
            </View>
          </View>

          {oneRM > 0 && (
            <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary }}>Ton 1RM estime</Text>
              <Text style={[styles.resultValue, { color: '#EF4444' }]}>{oneRM}</Text>
              <Text style={{ color: '#EF4444' }}>kg</Text>

              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, width: '100%', marginTop: 16, paddingTop: 16 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 12, textAlign: 'center' }}>Charges estimees</Text>
                {[
                  { reps: 1, weight: oneRM, percent: 100 },
                  { reps: 5, weight: Math.round(oneRM * 0.87), percent: 87 },
                  { reps: 10, weight: Math.round(oneRM * 0.75), percent: 75 },
                ].map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                    <Text style={{ color: colors.textPrimary }}>{item.reps}RM</Text>
                    <Text style={{ color: colors.gold, fontWeight: '800' }}>{item.weight} kg</Text>
                  </View>
                ))}
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
  liftInputsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 },
  liftInputContainer: { alignItems: 'center' },
  liftInputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 16, marginTop: 8 },
  liftInput: { fontSize: 28, fontWeight: '800', width: 80, textAlign: 'center', paddingVertical: 12 },
  resultCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginTop: 20, alignItems: 'center' },
  resultValue: { fontSize: 56, fontWeight: '900' },
});
