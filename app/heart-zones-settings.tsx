// ============================================
// YOROI - CONFIGURATION ZONES CARDIAQUES
// ============================================
// L'utilisateur saisit ses 4 seuils personnels (BPM)
// identiques à ce qu'affiche Apple Santé / Google Fit.
// Calcul Karvonen disponible (méthode "fréquence de repos" d'Apple).

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
import { Heart, ChevronLeft, Check, Calculator, BookOpen } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getUserSettings, saveUserSettings } from '@/lib/storage';

const ZONE_COLORS = ['#3B82F6', '#22C55E', '#EAB308', '#F97316', '#EF4444'];
const ZONE_NAMES = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];
const ZONE_LABELS = ['Récupération', 'Endurance', 'Tempo', 'Seuil', 'Max'];

type CalcMode = 'manual' | 'karvonen';

export default function HeartZonesSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Seuils manuels
  const [z1max, setZ1max] = useState('119');
  const [z2max, setZ2max] = useState('135');
  const [z3max, setZ3max] = useState('150');
  const [z4max, setZ4max] = useState('169');
  const [saved, setSaved] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  // Mode de calcul
  const [calcMode, setCalcMode] = useState<CalcMode>('manual');

  // Karvonen : FCmax + FC repos
  const [fcmax, setFcmax] = useState('');
  const [fcrepos, setFcrepos] = useState('');

  useEffect(() => {
    getUserSettings().then(s => {
      if (s.heartRateZones) {
        setZ1max(String(s.heartRateZones.z1max));
        setZ2max(String(s.heartRateZones.z2max));
        setZ3max(String(s.heartRateZones.z3max));
        setZ4max(String(s.heartRateZones.z4max));
        setHasExisting(true);
      }
    });
  }, []);

  // Calcul Karvonen : identique à la méthode "fréquence de repos" d'Apple
  // Seuils : réserve × 60/70/80/90% + FC repos
  const handleKarvonenCalc = () => {
    const max = parseInt(fcmax);
    const repos = parseInt(fcrepos);
    if (!max || !repos || max <= repos || max > 230 || repos < 30) return;
    const reserve = max - repos;
    setZ1max(String(Math.round(repos + reserve * 0.60)));
    setZ2max(String(Math.round(repos + reserve * 0.70)));
    setZ3max(String(Math.round(repos + reserve * 0.80)));
    setZ4max(String(Math.round(repos + reserve * 0.90)));
    setCalcMode('manual'); // bascule sur la vue manuelle pour confirmer/affiner
  };

  const karvonenReady =
    parseInt(fcmax) > 100 && parseInt(fcrepos) >= 30 && parseInt(fcmax) > parseInt(fcrepos);

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
      <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
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
          {/* Info : où trouver ses zones */}
          <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)' }]}>
            <BookOpen size={16} color="#3B82F6" />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Pour avoir les mêmes zones que Apple : ouvre{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>Apple Santé</Text>
              {' '}→ Résumé → Fréquence cardiaque → puis fais défiler jusqu'aux zones. Recopie les 4 seuils ici.
            </Text>
          </View>

          {/* Sélecteur de mode */}
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>MÉTHODE</Text>
          <View style={[styles.modeRow, { backgroundColor: colors.backgroundCard }]}>
            <TouchableOpacity
              style={[styles.modeBtn, calcMode === 'manual' && { backgroundColor: '#EF4444' }]}
              onPress={() => setCalcMode('manual')}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeBtnText, { color: calcMode === 'manual' ? '#FFF' : colors.textMuted }]}>
                Saisie manuelle
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, calcMode === 'karvonen' && { backgroundColor: '#3B82F6' }]}
              onPress={() => setCalcMode('karvonen')}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeBtnText, { color: calcMode === 'karvonen' ? '#FFF' : colors.textMuted }]}>
                Calcul Karvonen
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── MODE KARVONEN ── */}
          {calcMode === 'karvonen' && (
            <>
              <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
                <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>FC max</Text>
                  <Text style={[styles.rowHint, { color: colors.textMuted }]}>ton maximum absolu</Text>
                  <TextInput
                    style={inputStyle}
                    value={fcmax}
                    onChangeText={setFcmax}
                    keyboardType="number-pad"
                    placeholder="190"
                    placeholderTextColor={colors.textMuted}
                    maxLength={3}
                  />
                  <Text style={[styles.unit, { color: colors.textMuted }]}>BPM</Text>
                </View>
                <View style={[styles.row, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>FC repos</Text>
                  <Text style={[styles.rowHint, { color: colors.textMuted }]}>le matin au réveil</Text>
                  <TextInput
                    style={inputStyle}
                    value={fcrepos}
                    onChangeText={setFcrepos}
                    keyboardType="number-pad"
                    placeholder="55"
                    placeholderTextColor={colors.textMuted}
                    maxLength={3}
                  />
                  <Text style={[styles.unit, { color: colors.textMuted }]}>BPM</Text>
                </View>
              </View>

              {karvonenReady && (
                <View style={[styles.karvonenPreview, { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)' }]}>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                    Réserve FC = {parseInt(fcmax)} − {parseInt(fcrepos)} = {parseInt(fcmax) - parseInt(fcrepos)} bpm
                  </Text>
                  {[0.60, 0.70, 0.80, 0.90].map((pct, i) => {
                    const val = Math.round(parseInt(fcrepos) + (parseInt(fcmax) - parseInt(fcrepos)) * pct);
                    return (
                      <Text key={i} style={{ fontSize: 12, color: ZONE_COLORS[i], fontWeight: '600' }}>
                        Seuil Z{i + 1}/Z{i + 2} : {val} BPM ({Math.round(pct * 100)}% réserve)
                      </Text>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.calcBtn,
                  { backgroundColor: karvonenReady ? '#3B82F6' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') },
                ]}
                onPress={handleKarvonenCalc}
                disabled={!karvonenReady}
                activeOpacity={0.8}
              >
                <Calculator size={18} color={karvonenReady ? '#FFF' : colors.textMuted} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: karvonenReady ? '#FFF' : colors.textMuted }}>
                  Appliquer ces zones
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── MODE MANUEL ── */}
          {calcMode === 'manual' && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>TES 4 SEUILS (en BPM)</Text>
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
            </>
          )}

          {/* Aperçu zones */}
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
    borderRadius: 14,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
  card: { borderRadius: 16, overflow: 'hidden' },
  modeRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeBtnText: { fontSize: 13, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  rowHint: { fontSize: 11, maxWidth: 80, textAlign: 'right' },
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
  karvonenPreview: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  calcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
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
