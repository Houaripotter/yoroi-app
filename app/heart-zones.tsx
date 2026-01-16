import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Heart, Info, RefreshCw } from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import { getUserSettings } from '@/lib/storage';
import logger from '@/lib/security/logger';

// ============================================
// CALCULATEUR ZONES FREQUENCE CARDIAQUE
// Methode Karvonen
// ============================================

interface HeartRateZone {
  name: string;
  description: string;
  minPercent: number;
  maxPercent: number;
  color: string;
  emoji: string;
}

const ZONES: HeartRateZone[] = [
  {
    name: 'Zone 1 - Recuperation',
    description: 'Echauffement, recuperation active',
    minPercent: 50,
    maxPercent: 60,
    color: '#3B82F6',
    emoji: '💙',
  },
  {
    name: 'Zone 2 - Endurance',
    description: 'Brulage de graisses, endurance de base',
    minPercent: 60,
    maxPercent: 70,
    color: '#22C55E',
    emoji: '',
  },
  {
    name: 'Zone 3 - Aerobie',
    description: 'Amelioration cardio-vasculaire',
    minPercent: 70,
    maxPercent: 80,
    color: '#EAB308',
    emoji: '💛',
  },
  {
    name: 'Zone 4 - Seuil',
    description: 'Seuil anaerobique, performance',
    minPercent: 80,
    maxPercent: 90,
    color: '#F97316',
    emoji: '🧡',
  },
  {
    name: 'Zone 5 - Anaerobique',
    description: 'Effort maximal, sprints',
    minPercent: 90,
    maxPercent: 100,
    color: '#EF4444',
    emoji: '',
  },
];

export default function HeartZonesScreen() {
  const { colors } = useTheme();

  const [age, setAge] = useState('');
  const [restingHR, setRestingHR] = useState('70');
  const [maxHR, setMaxHR] = useState('');
  const [useCustomMax, setUseCustomMax] = useState(false);

  useEffect(() => {
    loadUserAge();
  }, []);

  const loadUserAge = async () => {
    try {
      const settings = await getUserSettings();
      // L'age sera saisi manuellement par l'utilisateur
      // On peut utiliser settings.age si disponible dans le futur
    } catch (error) {
      logger.info('Erreur chargement settings:', error);
    }
  };

  // Calcul FC max theorique (220 - age)
  const calculatedMaxHR = age ? 220 - parseInt(age) : 0;
  const effectiveMaxHR = useCustomMax && maxHR ? parseInt(maxHR) : calculatedMaxHR;
  const restingHRValue = parseInt(restingHR) || 70;

  // Formule Karvonen : FC cible = FC repos + (FC max - FC repos) x % intensite
  const calculateZoneHR = (percent: number): number => {
    if (!effectiveMaxHR) return 0;
    return Math.round(restingHRValue + (effectiveMaxHR - restingHRValue) * (percent / 100));
  };

  const formatInputValue = (text: string) => {
    return text.replace(/[^0-9]/g, '');
  };

  const isValid = age && parseInt(age) > 0 && parseInt(age) < 120;

  return (
    <ScreenWrapper>
      <Header title="Zones FC" showBack />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.goldMuted }]}>
          <Heart size={24} color={colors.gold} />
          <Text style={[styles.infoText, { color: colors.gold }]}>
            Methode Karvonen pour un entrainement optimal
          </Text>
        </View>

        {/* Inputs */}
        <Card style={styles.inputCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tes donnees</Text>

          {/* Age */}
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Age *</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={age}
                onChangeText={(text) => setAge(formatInputValue(text))}
                placeholder="30"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>ans</Text>
            </View>
          </View>

          {/* FC Repos */}
          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>FC au repos</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={restingHR}
                onChangeText={(text) => setRestingHR(formatInputValue(text))}
                placeholder="70"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>bpm</Text>
            </View>
          </View>

          {/* FC Max Toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setUseCustomMax(!useCustomMax)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.toggleCheckbox,
              { borderColor: colors.border },
              useCustomMax && { backgroundColor: colors.gold, borderColor: colors.gold }
            ]}>
              {useCustomMax && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>
              J'ai une FC max personnalisee
            </Text>
          </TouchableOpacity>

          {/* FC Max Custom */}
          {useCustomMax && (
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>FC max</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={maxHR}
                  onChangeText={(text) => setMaxHR(formatInputValue(text))}
                  placeholder={String(calculatedMaxHR)}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={[styles.inputUnit, { color: colors.textMuted }]}>bpm</Text>
              </View>
            </View>
          )}

          {/* Calculated Max */}
          {!useCustomMax && isValid && (
            <View style={[styles.calculatedRow, { backgroundColor: colors.cardHover }]}>
              <Text style={[styles.calculatedLabel, { color: colors.textSecondary }]}>
                FC max theorique (220 - age)
              </Text>
              <Text style={[styles.calculatedValue, { color: colors.gold }]}>
                {calculatedMaxHR} bpm
              </Text>
            </View>
          )}
        </Card>

        {/* Zones */}
        {isValid && (
          <Card style={styles.zonesCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Tes zones d'entrainement
            </Text>

            {ZONES.map((zone, index) => {
              const minBpm = calculateZoneHR(zone.minPercent);
              const maxBpm = calculateZoneHR(zone.maxPercent);

              return (
                <View
                  key={index}
                  style={[styles.zoneRow, { borderLeftColor: zone.color }]}
                >
                  <View style={styles.zoneHeader}>
                    <Text style={styles.zoneEmoji}>{zone.emoji}</Text>
                    <View style={styles.zoneInfo}>
                      <Text style={[styles.zoneName, { color: colors.textPrimary }]}>
                        {zone.name}
                      </Text>
                      <Text style={[styles.zoneDesc, { color: colors.textSecondary }]}>
                        {zone.description}
                      </Text>
                    </View>
                    <Text style={[styles.zonePercent, { color: colors.textMuted }]}>
                      {zone.minPercent}-{zone.maxPercent}%
                    </Text>
                  </View>
                  <View style={[styles.zoneBpmContainer, { backgroundColor: zone.color + '20' }]}>
                    <Text style={[styles.zoneBpm, { color: zone.color }]}>
                      {minBpm} - {maxBpm} bpm
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Info Formula */}
        <View style={[styles.formulaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Info size={18} color={colors.textSecondary} />
          <View style={styles.formulaContent}>
            <Text style={[styles.formulaTitle, { color: colors.textPrimary }]}>
              Formule Karvonen
            </Text>
            <Text style={[styles.formulaText, { color: colors.textSecondary }]}>
              FC cible = FC repos + (FC max - FC repos) x % intensite
            </Text>
            <Text style={[styles.formulaTip, { color: colors.textMuted }]}>
              Plus precise que la simple formule 220 - age
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const RADIUS = { sm: 8, md: 12, lg: 16 };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: RADIUS.lg,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  inputCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    width: 60,
    textAlign: 'center',
    paddingVertical: 10,
  },
  inputUnit: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  toggleCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  toggleLabel: {
    fontSize: 14,
  },
  calculatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: RADIUS.md,
    marginTop: 8,
  },
  calculatedLabel: {
    fontSize: 13,
  },
  calculatedValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  zonesCard: {
    marginBottom: 20,
  },
  zoneRow: {
    marginBottom: 16,
    borderLeftWidth: 4,
    paddingLeft: 12,
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  zoneEmoji: {
    fontSize: 20,
    marginTop: 2,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '600',
  },
  zoneDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  zonePercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  zoneBpmContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginTop: 8,
    marginLeft: 30,
  },
  zoneBpm: {
    fontSize: 16,
    fontWeight: '700',
  },
  formulaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  formulaContent: {
    flex: 1,
  },
  formulaTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  formulaText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  formulaTip: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
