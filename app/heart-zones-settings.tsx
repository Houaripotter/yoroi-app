// ============================================
// YOROI - CONFIGURATION ZONES CARDIAQUES
// ============================================
// L'utilisateur saisit ses 4 seuils personnels (BPM)
// Les 5 zones sont calculées automatiquement.
// Ces zones sont ensuite utilisées dans tous les détails de séances.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, ChevronLeft, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getUserSettings, saveUserSettings } from '@/lib/storage';

const ZONE_COLORS = ['#3B82F6', '#22C55E', '#EAB308', '#F97316', '#EF4444'];
const ZONE_NAMES = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];
const ZONE_LABELS = ['Récupération', 'Endurance', 'Tempo', 'Seuil', 'Max'];

export default function HeartZonesSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [z1max, setZ1max] = useState('119');
  const [z2max, setZ2max] = useState('135');
  const [z3max, setZ3max] = useState('150');
  const [z4max, setZ4max] = useState('169');
  const [saved, setSaved] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [age, setAge] = useState('');

  useEffect(() => {
    getUserSettings().then(s => {
      if (s.heartRateZones) {
        setZ1max(String(s.heartRateZones.z1max));
        setZ2max(String(s.heartRateZones.z2max));
        setZ3max(String(s.heartRateZones.z3max));
        setZ4max(String(s.heartRateZones.z4max));
        setHasExisting(true);
      }
      // Note: l'âge n'est pas stocké dans UserSettings, on le laisse vide
    });
  }, []);

  const handleAutoCalculate = () => {
    const a = parseInt(age);
    if (!a || a < 10 || a > 100) return;
    const fcmax = 220 - a;
    // Seuils Apple Fitness : 60% / 70% / 80% / 90% de FCmax
    setZ1max(String(Math.round(fcmax * 0.60)));
    setZ2max(String(Math.round(fcmax * 0.70)));
    setZ3max(String(Math.round(fcmax * 0.80)));
    setZ4max(String(Math.round(fcmax * 0.90)));
  };

  const v1 = parseInt(z1max) || 0;
  const v2 = parseInt(z2max) || 0;
  const v3 = parseInt(z3max) || 0;
  const v4 = parseInt(z4max) || 0;

  const isValid = v1 > 40 && v2 > v1 && v3 > v2 && v4 > v3 && v4 < 230;

  const zones = [
    { label: ZONE_NAMES[0], sub: ZONE_LABELS[0], range: `< ${v1 || '?'} BPM`, color: ZONE_COLORS[0] },
    { label: ZONE_NAMES[1], sub: ZONE_LABELS[1], range: `${v1 || '?'} – ${v2 || '?'} BPM`, color: ZONE_COLORS[1] },
    { label: ZONE_NAMES[2], sub: ZONE_LABELS[2], range: `${v2 || '?'} – ${v3 || '?'} BPM`, color: ZONE_COLORS[2] },
    { label: ZONE_NAMES[3], sub: ZONE_LABELS[3], range: `${v3 || '?'} – ${v4 || '?'} BPM`, color: ZONE_COLORS[3] },
    { label: ZONE_NAMES[4], sub: ZONE_LABELS[4], range: `> ${v4 || '?'} BPM`, color: ZONE_COLORS[4] },
  ];

  const handleSave = async () => {
    if (!isValid) return;
    await saveUserSettings({
      heartRateZones: { z1max: v1, z2max: v2, z3max: v3, z4max: v4 },
    });
    setSaved(true);
    setTimeout(() => router.back(), 900);
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      color: colors.text,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Zones cardiaques</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Explication */}
          <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)' }]}>
            <Heart size={16} color="#3B82F6" />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Entre tes 4 seuils personnels en BPM. Tu peux les retrouver dans l'app Forme (Apple Fitness) dans tes réglages de fréquence cardiaque.
            </Text>
          </View>

          {/* Calcul automatique */}
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CALCUL AUTOMATIQUE</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Ton âge</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    color: colors.text,
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                  },
                ]}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholder="ex: 30"
                placeholderTextColor={colors.textMuted}
                maxLength={3}
              />
              <Text style={[styles.unit, { color: colors.textMuted }]}>ans</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.autoCalcBtn,
                {
                  backgroundColor: parseInt(age) >= 10 ? 'rgba(59,130,246,0.12)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                  borderColor: parseInt(age) >= 10 ? 'rgba(59,130,246,0.25)' : 'transparent',
                },
              ]}
              onPress={handleAutoCalculate}
              disabled={!parseInt(age) || parseInt(age) < 10}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: parseInt(age) >= 10 ? '#3B82F6' : colors.textMuted }}>
                Calculer mes zones (FCmax = {parseInt(age) >= 10 ? 220 - parseInt(age) : '?'} bpm)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Seuils */}
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>TES SEUILS PERSONNELS</Text>

          <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
            {[
              { label: 'Seuil Z1 / Z2', hint: 'ex: 119', value: z1max, set: setZ1max, color: ZONE_COLORS[0] },
              { label: 'Seuil Z2 / Z3', hint: 'ex: 135', value: z2max, set: setZ2max, color: ZONE_COLORS[1] },
              { label: 'Seuil Z3 / Z4', hint: 'ex: 150', value: z3max, set: setZ3max, color: ZONE_COLORS[2] },
              { label: 'Seuil Z4 / Z5', hint: 'ex: 169', value: z4max, set: setZ4max, color: ZONE_COLORS[3] },
            ].map((item, i) => (
              <View key={i} style={[styles.row, i < 3 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={[styles.rowDot, { backgroundColor: item.color }]} />
                <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                <TextInput
                  style={inputStyle}
                  value={item.value}
                  onChangeText={item.set}
                  keyboardType="number-pad"
                  placeholder={item.hint}
                  placeholderTextColor={colors.textMuted}
                  maxLength={3}
                />
                <Text style={[styles.unit, { color: colors.textMuted }]}>BPM</Text>
              </View>
            ))}
          </View>

          {/* Apercu zones */}
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APERCU DE TES ZONES</Text>

          <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
            {zones.map((z, i) => (
              <View key={i} style={[styles.zoneRow, i < 4 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={[styles.zoneBar, { backgroundColor: z.color }]} />
                <View style={styles.zoneInfo}>
                  <Text style={[styles.zoneName, { color: z.color }]}>{z.label}</Text>
                  <Text style={[styles.zoneSub, { color: colors.textMuted }]}>{z.sub}</Text>
                </View>
                <Text style={[styles.zoneRange, { color: colors.textMuted }]}>{z.range}</Text>
              </View>
            ))}
          </View>

          {/* Erreur de validation */}
          {!isValid && (v1 > 0 || v2 > 0 || v3 > 0 || v4 > 0) && (
            <Text style={styles.errorText}>
              Chaque seuil doit être supérieur au précédent (ex: 119 &lt; 135 &lt; 150 &lt; 169)
            </Text>
          )}

          {/* Bouton sauvegarder */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: isValid ? '#EF4444' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') },
            ]}
            onPress={handleSave}
            disabled={!isValid}
            activeOpacity={0.8}
          >
            {saved ? (
              <Check size={20} color="#FFF" />
            ) : (
              <Text style={[styles.saveBtnText, { color: isValid ? '#FFF' : colors.textMuted }]}>
                Sauvegarder mes zones
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
  card: { borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  input: {
    width: 64,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  unit: { fontSize: 12, fontWeight: '500', width: 30 },
  autoCalcBtn: {
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  zoneBar: { width: 4, height: 36, borderRadius: 2 },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 14, fontWeight: '700' },
  zoneSub: { fontSize: 12, marginTop: 1 },
  zoneRange: { fontSize: 13, fontWeight: '600' },
  errorText: { color: '#EF4444', fontSize: 12, textAlign: 'center', marginTop: 4 },
  saveBtn: {
    marginTop: 8,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
});
