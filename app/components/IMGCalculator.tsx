import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X, Info } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

type Gender = 'male' | 'female';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const IMGCalculator = React.memo(function IMGCalculator({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');

  const calculateIMC = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || w === 0 || h === 0) return 0;
    const heightM = h / 100;
    const imc = w / (heightM * heightM);
    return isNaN(imc) || !isFinite(imc) ? 0 : imc;
  };

  const calculateIMG = () => {
    const imc = calculateIMC();
    const a = parseFloat(age);
    if (imc === 0 || !a || a === 0) return 0;
    let img = 0;
    if (gender === 'male') {
      img = (1.20 * imc) + (0.23 * a) - 10.8 - 5.4;
    } else {
      img = (1.20 * imc) + (0.23 * a) - 5.4;
    }
    return isNaN(img) || !isFinite(img) ? 0 : img;
  };

  const getIMGCategory = (img: number): { label: string; color: string } => {
    if (img === 0) return { label: 'Entre tes donnees', color: colors.textMuted };
    if (gender === 'male') {
      if (img < 10) return { label: 'Tres maigre', color: colors.info };
      if (img < 20) return { label: 'Athlete', color: colors.success };
      if (img < 25) return { label: 'Normal', color: colors.success };
      return { label: 'Eleve', color: colors.warning };
    } else {
      if (img < 18) return { label: 'Tres maigre', color: colors.info };
      if (img < 25) return { label: 'Athlete', color: colors.success };
      if (img < 32) return { label: 'Normal', color: colors.success };
      return { label: 'Eleve', color: colors.warning };
    }
  };

  const img = calculateIMG();
  const category = getIMGCategory(img);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>IMG - Indice de Masse Grasse</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Gender Toggle */}
          <View style={styles.genderToggle}>
            <TouchableOpacity
              style={[styles.genderButton, { backgroundColor: gender === 'male' ? colors.gold : colors.cardHover }]}
              onPress={() => setGender('male')}
            >
              <Text style={[styles.genderText, { color: gender === 'male' ? colors.background : colors.textSecondary }]}>
                Homme
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderButton, { backgroundColor: gender === 'female' ? colors.gold : colors.cardHover }]}
              onPress={() => setGender('female')}
            >
              <Text style={[styles.genderText, { color: gender === 'female' ? colors.background : colors.textSecondary }]}>
                Femme
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poids</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput style={[styles.input, { color: colors.textPrimary }]} value={weight} onChangeText={(text) => setWeight(text.replace(',', '.'))} keyboardType="decimal-pad" maxLength={5} placeholder="0" placeholderTextColor={colors.textMuted} />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>kg</Text>
            </View>
          </View>

          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Taille</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput style={[styles.input, { color: colors.textPrimary }]} value={height} onChangeText={(text) => setHeight(text.replace(',', '.'))} keyboardType="decimal-pad" maxLength={5} placeholder="0" placeholderTextColor={colors.textMuted} />
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
          {img > 0 && (
            <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Ton IMG (estimation)</Text>
              <Text style={[styles.resultValue, { color: category.color }]}>{img.toFixed(1)}%</Text>
              <View style={[styles.resultBadge, { backgroundColor: category.color + '20' }]}>
                <Text style={[styles.resultBadgeText, { color: category.color }]}>{category.label}</Text>
              </View>

              <View style={[styles.imgReference, { borderTopColor: colors.border }]}>
                <Text style={[styles.imgReferenceTitle, { color: colors.textSecondary }]}>
                  Plages de reference ({gender === 'male' ? 'Homme' : 'Femme'})
                </Text>
                <View style={styles.imgReferenceList}>
                  {(gender === 'male' ? [
                    { range: '< 10%', label: 'Tres maigre' },
                    { range: '10-20%', label: 'Athlete' },
                    { range: '20-25%', label: 'Normal' },
                    { range: '> 25%', label: 'Eleve' },
                  ] : [
                    { range: '< 18%', label: 'Tres maigre' },
                    { range: '18-25%', label: 'Athlete' },
                    { range: '25-32%', label: 'Normal' },
                    { range: '> 32%', label: 'Eleve' },
                  ]).map((item, idx) => (
                    <View key={idx} style={styles.imgReferenceItem}>
                      <Text style={[styles.imgReferenceRange, { color: colors.gold }]}>{item.range}</Text>
                      <Text style={[styles.imgReferenceLabel, { color: colors.textMuted }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          <View style={[styles.formulaCard, { backgroundColor: colors.cardHover }]}>
            <Info size={16} color={colors.textMuted} />
            <View>
              <Text style={[styles.formulaText, { color: colors.textMuted }]}>Formule Deurenberg :</Text>
              <Text style={[styles.formulaDetail, { color: colors.textMuted }]}>H: (1.20 × IMC) + (0.23 × age) - 10.8 - 5.4</Text>
              <Text style={[styles.formulaDetail, { color: colors.textMuted }]}>F: (1.20 × IMC) + (0.23 × age) - 5.4</Text>
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
  resultBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 12 },
  resultBadgeText: { fontSize: 14, fontWeight: '700' },
  imgReference: { width: '100%', marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  imgReferenceTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  imgReferenceList: { flexDirection: 'row', justifyContent: 'space-around' },
  imgReferenceItem: { alignItems: 'center' },
  imgReferenceRange: { fontSize: 12, fontWeight: '700' },
  imgReferenceLabel: { fontSize: 10, marginTop: 2 },
  formulaCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: RADIUS.md, marginTop: 20 },
  formulaText: { fontSize: 12 },
  formulaDetail: { fontSize: 11, fontFamily: 'monospace', marginTop: 4 },
});
