// ============================================
// YOROI - PRÉFÉRENCES
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { ChevronRight, Check, Weight, Ruler, X } from 'lucide-react-native';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';
import { getUserSettings, saveUserSettings } from '@/lib/storage';
import * as Haptics from 'expo-haptics';

export default function PreferencesScreen() {
  const { colors } = useTheme();
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [measurementUnit, setMeasurementUnit] = useState<'cm' | 'in'>('cm');
  const [weightUnitModalVisible, setWeightUnitModalVisible] = useState(false);
  const [measurementUnitModalVisible, setMeasurementUnitModalVisible] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await getUserSettings();
    setWeightUnit(settings.weight_unit || 'kg');
    setMeasurementUnit(settings.measurement_unit || 'cm');
  };

  const handleWeightUnitChange = async (unit: 'kg' | 'lbs') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWeightUnit(unit);
    await saveUserSettings({ weight_unit: unit });
    setWeightUnitModalVisible(false);
  };

  const handleMeasurementUnitChange = async (unit: 'cm' | 'in') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMeasurementUnit(unit);
    await saveUserSettings({ measurement_unit: unit });
    setMeasurementUnitModalVisible(false);
  };

  return (
    <ScreenWrapper>
      <Header title="Préférences" showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Unités */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
            UNITÉS DE MESURE
          </Text>

          <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
            {/* Unité de poids */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setWeightUnitModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' + '20' }]}>
                  <Weight size={20} color="#3B82F6" strokeWidth={2} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    Unité de poids
                  </Text>
                  <Text style={[styles.settingValue, { color: colors.textMuted }]}>
                    {weightUnit === 'kg' ? 'Kilogrammes (kg)' : 'Livres (lbs)'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Unité de mesure */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMeasurementUnitModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#10B981' + '20' }]}>
                  <Ruler size={20} color="#10B981" strokeWidth={2} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                    Unité de mesure
                  </Text>
                  <Text style={[styles.settingValue, { color: colors.textMuted }]}>
                    {measurementUnit === 'cm' ? 'Centimètres (cm)' : 'Pouces (in)'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            Ces paramètres affectent l'affichage du poids, de la taille et des mesures corporelles dans toute l'application.
          </Text>
        </View>
      </ScrollView>

      {/* Modal Unité de poids */}
      <Modal visible={weightUnitModalVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setWeightUnitModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Unité de poids
              </Text>
              <TouchableOpacity onPress={() => setWeightUnitModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.optionButton,
                { borderColor: colors.border },
                weightUnit === 'kg' && { backgroundColor: colors.gold + '20', borderColor: colors.gold }
              ]}
              onPress={() => handleWeightUnitChange('kg')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionText,
                { color: colors.textPrimary },
                weightUnit === 'kg' && { color: colors.gold, fontWeight: '700' }
              ]}>
                Kilogrammes (kg)
              </Text>
              {weightUnit === 'kg' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                { borderColor: colors.border },
                weightUnit === 'lbs' && { backgroundColor: colors.gold + '20', borderColor: colors.gold }
              ]}
              onPress={() => handleWeightUnitChange('lbs')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionText,
                { color: colors.textPrimary },
                weightUnit === 'lbs' && { color: colors.gold, fontWeight: '700' }
              ]}>
                Livres (lbs)
              </Text>
              {weightUnit === 'lbs' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Modal Unité de mesure */}
      <Modal visible={measurementUnitModalVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMeasurementUnitModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Unité de mesure
              </Text>
              <TouchableOpacity onPress={() => setMeasurementUnitModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.optionButton,
                { borderColor: colors.border },
                measurementUnit === 'cm' && { backgroundColor: colors.gold + '20', borderColor: colors.gold }
              ]}
              onPress={() => handleMeasurementUnitChange('cm')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionText,
                { color: colors.textPrimary },
                measurementUnit === 'cm' && { color: colors.gold, fontWeight: '700' }
              ]}>
                Centimètres (cm)
              </Text>
              {measurementUnit === 'cm' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                { borderColor: colors.border },
                measurementUnit === 'in' && { backgroundColor: colors.gold + '20', borderColor: colors.gold }
              ]}
              onPress={() => handleMeasurementUnitChange('in')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionText,
                { color: colors.textPrimary },
                measurementUnit === 'in' && { color: colors.gold, fontWeight: '700' }
              ]}>
                Pouces (in)
              </Text>
              {measurementUnit === 'in' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  card: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.medium,
  },
  divider: {
    height: 1,
    marginLeft: SPACING.lg + 40 + SPACING.md,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    marginBottom: SPACING.sm,
  },
  optionText: {
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
  },
});
