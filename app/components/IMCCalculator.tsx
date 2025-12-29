import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X, Info, AlertCircle, Circle } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

type LucideIcon = typeof AlertCircle;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function IMCCalculator({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  const calculateIMC = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || w === 0 || h === 0) return 0;
    const heightM = h / 100;
    const imc = w / (heightM * heightM);
    return isNaN(imc) || !isFinite(imc) ? 0 : imc;
  };

  const getIMCCategory = (imc: number): { label: string; color: string; iconComponent: LucideIcon } => {
    if (imc === 0) return { label: 'Entrez vos donnees', color: colors.textMuted, iconComponent: AlertCircle };
    if (imc < 18.5) return { label: 'Insuffisance ponderale', color: colors.info, iconComponent: AlertCircle };
    if (imc < 25) return { label: 'Normal', color: colors.success, iconComponent: Circle };
    if (imc < 30) return { label: 'Surpoids', color: colors.warning, iconComponent: AlertCircle };
    return { label: 'Obesite', color: colors.danger, iconComponent: AlertCircle };
  };

  const imc = calculateIMC();
  const category = getIMCCategory(imc);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>IMC - Indice de Masse Corporelle</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Poids */}
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poids</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                maxLength={5}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>kg</Text>
            </View>
          </View>

          {/* Taille */}
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Taille</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                maxLength={5}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>cm</Text>
            </View>
          </View>

          {/* Résultat */}
          {imc > 0 && (
            <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Ton IMC</Text>
              <Text style={[styles.resultValue, { color: category.color }]}>
                {imc.toFixed(1)}
              </Text>
              <View style={[styles.resultBadge, { backgroundColor: category.color + '20' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {React.createElement(category.iconComponent, { size: 16, color: category.color })}
                  <Text style={[styles.resultBadgeText, { color: category.color }]}>
                    {category.label}
                  </Text>
                </View>
              </View>

              {/* Échelle IMC */}
              <View style={styles.imcScale}>
                {[
                  { label: '< 18.5', color: colors.info, name: 'Maigre' },
                  { label: '18.5-24.9', color: colors.success, name: 'Normal' },
                  { label: '25-29.9', color: colors.warning, name: 'Surpoids' },
                  { label: '> 30', color: colors.danger, name: 'Obesite' },
                ].map((item, idx) => (
                  <View key={idx} style={styles.imcScaleItem}>
                    <View style={[styles.imcScaleBar, { backgroundColor: item.color }]} />
                    <Text style={[styles.imcScaleLabel, { color: colors.textMuted }]}>{item.label}</Text>
                    <Text style={[styles.imcScaleName, { color: item.color }]}>{item.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.formulaCard, { backgroundColor: colors.cardHover }]}>
            <Info size={16} color={colors.textMuted} />
            <Text style={[styles.formulaText, { color: colors.textMuted }]}>
              Formule : Poids (kg) / Taille (m)²
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const RADIUS = { sm: 8, md: 12, lg: 16 };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
  },
  input: {
    fontSize: 18,
    fontWeight: '700',
    width: 70,
    textAlign: 'center',
    paddingVertical: 10,
  },
  inputUnit: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  resultCard: {
    padding: 20,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginTop: 20,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -2,
  },
  resultBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  resultBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  imcScale: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
    width: '100%',
  },
  imcScaleItem: {
    flex: 1,
    alignItems: 'center',
  },
  imcScaleBar: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    marginBottom: 6,
  },
  imcScaleLabel: {
    fontSize: 10,
  },
  imcScaleName: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  formulaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADIUS.md,
    marginTop: 20,
  },
  formulaText: {
    fontSize: 12,
  },
});
