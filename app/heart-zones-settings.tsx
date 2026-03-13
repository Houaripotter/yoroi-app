// ============================================
// YOROI - CONFIGURATION ZONES CARDIAQUES
// ============================================
// Chaque zone affichée avec ses deux bornes min-max (style Apple Santé).
// L'utilisateur saisit le MAX de chaque zone.
// Le MIN de chaque zone = MAX de la zone précédente (automatique).

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
import { Heart, ChevronLeft, Check, Calculator, BookOpen, Download } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getUserSettings, saveUserSettings } from '@/lib/storage';
import { getEffectiveHRZones, calcZonesFromMaxHR } from '@/lib/hrZones';
import { getHeartZonesDataNative } from '@/lib/yoroiHealthKit';

const ZONE_COLORS = ['#3B82F6', '#22C55E', '#EAB308', '#F97316', '#EF4444'] as const;
const ZONE_NAMES  = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'] as const;
const ZONE_LABELS = ['Récupération', 'Endurance', 'Tempo', 'Seuil', 'Max'] as const;

type CalcMode = 'manual' | 'karvonen';

export default function HeartZonesSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Bornes max (seuils entre zones)
  const [z1max, setZ1max] = useState('');
  const [z2max, setZ2max] = useState('');
  const [z3max, setZ3max] = useState('');
  const [z4max, setZ4max] = useState('');
  // Bornes min indépendantes (modifiables librement)
  const [z1min, setZ1min] = useState('0');
  const [z2min, setZ2min] = useState('');
  const [z3min, setZ3min] = useState('');
  const [z4min, setZ4min] = useState('');
  const [z5min, setZ5min] = useState('');
  const [saved, setSaved] = useState(false);
  const [effectiveSource, setEffectiveSource] = useState<'custom' | 'age' | 'default'>('default');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Mode de calcul
  const [calcMode, setCalcMode] = useState<CalcMode>('manual');

  // Karvonen : FCmax + FC repos
  const [fcmax, setFcmax] = useState('');
  const [fcrepos, setFcrepos] = useState('');

  useEffect(() => {
    getEffectiveHRZones().then(effective => {
      setZ1max(String(effective.z1max));
      setZ2max(String(effective.z2max));
      setZ3max(String(effective.z3max));
      setZ4max(String(effective.z4max));
      // Mins : valeurs sauvegardées ou dérivées de la cascade (rétrocompat)
      setZ1min(String(effective.z1min ?? 0));
      setZ2min(String(effective.z2min ?? effective.z1max));
      setZ3min(String(effective.z3min ?? effective.z2max));
      setZ4min(String(effective.z4min ?? effective.z3max));
      setZ5min(String(effective.z5min ?? effective.z4max));
      setEffectiveSource(effective.source);
    });
  }, []);

  // Calcul Karvonen : méthode Apple Santé (50/60/70/80% de réserve)
  const handleKarvonenCalc = () => {
    const max = parseInt(fcmax);
    const repos = parseInt(fcrepos);
    if (!max || !repos || max <= repos || max > 230 || repos < 30) return;
    const reserve = max - repos;
    const nz1max = Math.round(repos + reserve * 0.50);
    const nz2max = Math.round(repos + reserve * 0.60);
    const nz3max = Math.round(repos + reserve * 0.70);
    const nz4max = Math.round(repos + reserve * 0.80);
    setZ1min(String(repos));
    setZ1max(String(nz1max));
    setZ2min(String(nz1max));
    setZ2max(String(nz2max));
    setZ3min(String(nz2max));
    setZ3max(String(nz3max));
    setZ4min(String(nz3max));
    setZ4max(String(nz4max));
    setZ5min(String(nz4max));
    setCalcMode('manual');
  };

  const karvonenReady =
    parseInt(fcmax) > 100 && parseInt(fcrepos) >= 30 && parseInt(fcmax) > parseInt(fcrepos);

  // Importer FC repos + FC max depuis Apple Santé → calculer zones identiques
  const handleImportFromApple = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const data = await getHeartZonesDataNative();
      if (!data || (data.restingHR === 0 && data.maxHR === 0)) {
        setImportResult('Aucune donnée FC trouvée dans Apple Santé.');
        return;
      }
      const fcr  = data.restingHR > 0 ? data.restingHR : 60;
      const fmax = data.maxHR > 0 ? data.maxHR : 0;
      if (fmax < 100) {
        setImportResult('FC max introuvable. Utilise le calcul Karvonen manuellement.');
        return;
      }
      const zones = calcZonesFromMaxHR(fmax, fcr);
      setZ1min(String(fcr));
      setZ1max(String(zones.z1max));
      setZ2min(String(zones.z1max));
      setZ2max(String(zones.z2max));
      setZ3min(String(zones.z2max));
      setZ3max(String(zones.z3max));
      setZ4min(String(zones.z3max));
      setZ4max(String(zones.z4max));
      setZ5min(String(zones.z4max));
      setImportResult(`FC repos ${fcr} bpm · FC max ${fmax} bpm — vérifie dans Apple Santé et ajuste si besoin !`);
      setCalcMode('manual');
    } catch {
      setImportResult('Erreur lors de la lecture Apple Santé.');
    } finally {
      setImporting(false);
    }
  };

  const v1min = parseInt(z1min) || 0;
  const v1 = parseInt(z1max) || 0;
  const v2min = parseInt(z2min) || 0;
  const v2 = parseInt(z2max) || 0;
  const v3min = parseInt(z3min) || 0;
  const v3 = parseInt(z3max) || 0;
  const v4min = parseInt(z4min) || 0;
  const v4 = parseInt(z4max) || 0;
  const v5min = parseInt(z5min) || 0;

  // Chaque zone doit avoir min < max, et toutes les zones doivent être définies
  const isValid = v1 > 40 && v2 > 40 && v3 > 40 && v4 > 40
    && v1min < v1 && v2min < v2 && v3min < v3 && v4min < v4
    && v5min < 230 && v4 < 230;

  // Les 5 zones entièrement éditables (min ET max)
  const zones = [
    { idx: 0, name: ZONE_NAMES[0], label: ZONE_LABELS[0], color: ZONE_COLORS[0],
      minVal: z1min, maxVal: z1max, setMin: setZ1min, setMax: setZ1max, isLastZone: false },
    { idx: 1, name: ZONE_NAMES[1], label: ZONE_LABELS[1], color: ZONE_COLORS[1],
      minVal: z2min, maxVal: z2max, setMin: setZ2min, setMax: setZ2max, isLastZone: false },
    { idx: 2, name: ZONE_NAMES[2], label: ZONE_LABELS[2], color: ZONE_COLORS[2],
      minVal: z3min, maxVal: z3max, setMin: setZ3min, setMax: setZ3max, isLastZone: false },
    { idx: 3, name: ZONE_NAMES[3], label: ZONE_LABELS[3], color: ZONE_COLORS[3],
      minVal: z4min, maxVal: z4max, setMin: setZ4min, setMax: setZ4max, isLastZone: false },
    { idx: 4, name: ZONE_NAMES[4], label: ZONE_LABELS[4], color: ZONE_COLORS[4],
      minVal: z5min, maxVal: '∞', setMin: setZ5min, setMax: null, isLastZone: true },
  ];

  const handleSave = async () => {
    if (!isValid) return;
    await saveUserSettings({
      heartRateZones: {
        z1min: v1min, z1max: v1,
        z2min: v2min, z2max: v2,
        z3min: v3min, z3max: v3,
        z4min: v4min, z4max: v4,
        z5min: v5min,
      },
    });
    setSaved(true);
    setTimeout(() => router.back(), 900);
  };

  const bg = isDark ? '#000000' : '#F2F2F7';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: bg }]}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: bg }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Zones cardiaques</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Bandeau source */}
          {effectiveSource !== 'custom' ? (
            <View style={[styles.banner, { backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.28)' }]}>
              <Heart size={15} color="#F59E0B" />
              <Text style={[styles.bannerText, { color: colors.textMuted }]}>
                {effectiveSource === 'age'
                  ? 'Zones calculées d\'après ton âge (Karvonen). '
                  : 'Zones par défaut. '}
                <Text style={{ fontWeight: '700', color: colors.text }}>Personnalise ci-dessous.</Text>
              </Text>
            </View>
          ) : (
            <View style={[styles.banner, { backgroundColor: isDark ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.07)', borderColor: 'rgba(34,197,94,0.22)' }]}>
              <Check size={15} color="#22C55E" />
              <Text style={[styles.bannerText, { color: '#22C55E', fontWeight: '700' }]}>Tes zones personnalisées sont actives</Text>
            </View>
          )}

          {/* Bouton import Apple Santé (iOS uniquement) */}
          {Platform.OS === 'ios' && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>IMPORT AUTOMATIQUE</Text>
              <TouchableOpacity
                style={[styles.importBtn, { backgroundColor: isDark ? 'rgba(255,45,85,0.12)' : 'rgba(255,45,85,0.08)', borderColor: 'rgba(255,45,85,0.30)' }]}
                onPress={handleImportFromApple}
                disabled={importing}
                activeOpacity={0.8}
              >
                {importing ? (
                  <Heart size={18} color="#FF2D55" />
                ) : (
                  <Download size={18} color="#FF2D55" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#FF2D55' }}>
                    {importing ? 'Lecture en cours...' : 'Calculer depuis Apple Santé'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                    Lit ta FC repos + FC max · bonne approximation, à vérifier
                  </Text>
                </View>
              </TouchableOpacity>

              {importResult && (
                <View style={[styles.importResult, {
                  backgroundColor: importResult.includes('!')
                    ? (isDark ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.07)')
                    : (isDark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.07)'),
                  borderColor: importResult.includes('!') ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
                }]}>
                  <Text style={{ fontSize: 12, color: importResult.includes('!') ? '#22C55E' : '#EF4444', fontWeight: '600' }}>
                    {importResult}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Sélecteur de méthode */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>MÉTHODE DE CALCUL</Text>
          <View style={[styles.modeRow, { backgroundColor: cardBg }]}>
            {(['manual', 'karvonen'] as CalcMode[]).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeBtn, calcMode === mode && { backgroundColor: mode === 'manual' ? '#EF4444' : '#3B82F6' }]}
                onPress={() => setCalcMode(mode)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeBtnText, { color: calcMode === mode ? '#FFF' : colors.textMuted }]}>
                  {mode === 'manual' ? 'Mes valeurs' : 'Calcul Karvonen'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Karvonen */}
          {calcMode === 'karvonen' && (
            <>
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                {[
                  { label: 'FC max', hint: 'ton maximum absolu', value: fcmax, set: setFcmax, placeholder: '190' },
                  { label: 'FC repos', hint: 'le matin au réveil', value: fcrepos, set: setFcrepos, placeholder: '55' },
                ].map((item, i) => (
                  <View key={i} style={[styles.row, i === 0 && { borderBottomWidth: 1, borderBottomColor: divider }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                      <Text style={[styles.rowHint, { color: colors.textMuted }]}>{item.hint}</Text>
                    </View>
                    <TextInput
                      style={[styles.input, { backgroundColor: inputBg, color: colors.text, borderColor: inputBorder }]}
                      value={item.value}
                      onChangeText={item.set}
                      keyboardType="number-pad"
                      placeholder={item.placeholder}
                      placeholderTextColor={colors.textMuted}
                      maxLength={3}
                    />
                    <Text style={[styles.unit, { color: colors.textMuted }]}>BPM</Text>
                  </View>
                ))}
              </View>

              {karvonenReady && (
                <View style={[styles.karvonenPreview, { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)' }]}>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
                    Réserve FC = {parseInt(fcmax)} − {parseInt(fcrepos)} = {parseInt(fcmax) - parseInt(fcrepos)} bpm
                  </Text>
                  {[0.50, 0.60, 0.70, 0.80].map((pct, i) => {
                    const val = Math.round(parseInt(fcrepos) + (parseInt(fcmax) - parseInt(fcrepos)) * pct);
                    return (
                      <Text key={i} style={{ fontSize: 12, color: ZONE_COLORS[i], fontWeight: '600' }}>
                        Z{i + 1} max : {val} BPM ({Math.round(pct * 100)}% réserve)
                      </Text>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity
                style={[styles.calcBtn, { backgroundColor: karvonenReady ? '#3B82F6' : inputBg }]}
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

          {/* Zones avec bornes min-max style Apple Santé */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TES 5 ZONES (en BPM)</Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            {zones.map((z, i) => (
              <View
                key={i}
                style={[styles.zoneRow, i < 4 && { borderBottomWidth: 1, borderBottomColor: divider }]}
              >
                {/* Barre couleur */}
                <View style={[styles.zoneBar, { backgroundColor: z.color }]} />

                {/* Nom + label */}
                <View style={styles.zoneInfo}>
                  <Text style={[styles.zoneName, { color: z.color }]}>{z.name}</Text>
                  <Text style={[styles.zoneLabel, { color: colors.textMuted }]}>{z.label}</Text>
                </View>

                {/* Borne min (éditable) */}
                <TextInput
                  style={[styles.boundInput, { backgroundColor: inputBg, color: z.color, borderColor: z.color + '60' }]}
                  value={z.minVal}
                  onChangeText={z.setMin!}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={colors.textMuted}
                  maxLength={3}
                />

                <Text style={[styles.dash, { color: colors.textMuted }]}>–</Text>

                {/* Borne max (éditable sauf zone 5) */}
                {z.isLastZone ? (
                  <View style={[styles.boundBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: divider }]}>
                    <Text style={[styles.boundValue, { color: colors.textMuted }]}>∞</Text>
                  </View>
                ) : (
                  <TextInput
                    style={[styles.boundInput, { backgroundColor: inputBg, color: z.color, borderColor: z.color + '60' }]}
                    value={z.maxVal}
                    onChangeText={z.setMax!}
                    keyboardType="number-pad"
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                    maxLength={3}
                  />
                )}

                <Text style={[styles.bpmLabel, { color: colors.textMuted }]}>bpm</Text>
              </View>
            ))}
          </View>

          {/* Info selon plateforme */}
          <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.20)' }]}>
            <View style={styles.infoHeader}>
              <BookOpen size={14} color="#3B82F6" />
              <Text style={[styles.infoTitle, { color: '#3B82F6' }]}>Où trouver tes zones ?</Text>
            </View>

            {/* iPhone / Apple Watch */}
            <Text style={[styles.infoSection, { color: colors.text }]}>iPhone · Apple Watch</Text>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Ouvre <Text style={{ fontWeight: '700', color: colors.text }}>l'app Watch</Text> sur ton iPhone → onglet <Text style={{ fontWeight: '700', color: colors.text }}>Ma montre</Text> → <Text style={{ fontWeight: '700', color: colors.text }}>Exercice</Text> → <Text style={{ fontWeight: '700', color: colors.text }}>Zones de fréquence cardiaque</Text> → passe en <Text style={{ fontWeight: '700', color: colors.text }}>Manuel</Text> → édite chaque zone.
            </Text>

            <View style={[styles.infoDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

            {/* Garmin */}
            <Text style={[styles.infoSection, { color: colors.text }]}>Garmin Connect</Text>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              <Text style={{ fontWeight: '700', color: colors.text }}>Plus</Text> → <Text style={{ fontWeight: '700', color: colors.text }}>Appareils Garmin</Text> → ton appareil → <Text style={{ fontWeight: '700', color: colors.text }}>Paramètres utilisateur</Text> → <Text style={{ fontWeight: '700', color: colors.text }}>Zones de fréquence cardiaque</Text> → saisis tes valeurs en BPM.
            </Text>

            <View style={[styles.infoDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

            {/* Samsung */}
            <Text style={[styles.infoSection, { color: colors.text }]}>Samsung Health · Galaxy Watch</Text>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              <Text style={{ fontWeight: '700', color: colors.text }}>Exercice</Text> → choisis une activité → <Text style={{ fontWeight: '700', color: colors.text }}>Paramètres (⋮)</Text> → <Text style={{ fontWeight: '700', color: colors.text }}>Zones de fréquence cardiaque</Text> → passe en personnalisé.
            </Text>

            <View style={[styles.infoDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

            {/* Fitbit */}
            <Text style={[styles.infoSection, { color: colors.text }]}>Fitbit</Text>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Profil → <Text style={{ fontWeight: '700', color: colors.text }}>Paramètres activité</Text> → <Text style={{ fontWeight: '700', color: colors.text }}>Zones de fréquence cardiaque</Text> → <Text style={{ fontWeight: '700', color: colors.text }}>Zone personnalisée</Text> → entre tes valeurs limites.
            </Text>

            <View style={[styles.infoDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

            {/* Google Fit / Health Connect */}
            <Text style={[styles.infoSection, { color: colors.text }]}>Google Fit · Health Connect</Text>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Ces plateformes sont des <Text style={{ fontWeight: '700', color: colors.text }}>agrégateurs</Text> — elles affichent les données de ton capteur. Configure tes zones directement dans l'app du fabricant de ta montre (Garmin Connect, Samsung Health, etc.).
            </Text>
          </View>

          {/* Erreur validation */}
          {!isValid && (v1 > 0 || v2 > 0 || v3 > 0 || v4 > 0) && (
            <Text style={styles.errorText}>
              Chaque zone doit avoir un min inférieur à son max, et les valeurs doivent être entre 40 et 229 bpm.
            </Text>
          )}

          {/* Bouton sauvegarder */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: isValid ? '#EF4444' : inputBg }]}
            onPress={handleSave}
            disabled={!isValid || saved}
            activeOpacity={0.8}
          >
            {saved ? (
              <Check size={22} color="#FFF" />
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
  content: { paddingHorizontal: 16, paddingTop: 10, gap: 12 },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 18 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },

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
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowHint: { fontSize: 11, marginTop: 1 },

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
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  calcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
  },

  // Zone row — style Apple Santé
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  zoneBar: { width: 4, height: 38, borderRadius: 2 },
  zoneInfo: { flex: 1, minWidth: 70 },
  zoneName: { fontSize: 13, fontWeight: '800' },
  zoneLabel: { fontSize: 11, marginTop: 1 },

  // Bornes min/max
  boundBox: {
    width: 48,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boundValue: { fontSize: 14, fontWeight: '600' },
  boundInput: {
    width: 52,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
  },
  dash: { fontSize: 16, fontWeight: '300' },
  bpmLabel: { fontSize: 10, fontWeight: '500', width: 24 },

  errorText: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 2,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  infoSection: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  infoDivider: {
    height: 1,
    borderRadius: 0.5,
    marginVertical: 2,
  },
  saveBtn: {
    marginTop: 4,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  importResult: {
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: -4,
  },
});
