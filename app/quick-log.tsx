// ============================================
// YOROI - LOG RAPIDE POST-SÉANCE
// ============================================
// Dicte ou tape 2 phrases — l'app parse les infos
// et pré-remplit le formulaire d'ajout de séance.
// Utilise la dictée vocale native iOS (micro clavier).
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { X, Mic, ChevronRight, RotateCcw, Check, Dumbbell, Clock, RefreshCw, Zap, ClipboardList } from 'lucide-react-native';
import { SPORTS } from '@/lib/sports';

// ============================================
// PARSING INTELLIGENT DU TEXTE
// ============================================

interface ParsedSession {
  sport?: string;
  sportName?: string;
  duration?: number;
  rounds?: number;
  intensity?: number;
  sessionType?: string;
  notes?: string;
  confidence: number; // 0-100
  detectedFields: string[];
}

const SPORT_KEYWORDS: Record<string, string[]> = {
  jjb: ['jjb', 'jiu jitsu', 'jiu-jitsu', 'bjj', 'brésilien', 'bresilien', 'grappling'],
  mma: ['mma', 'mixed martial'],
  boxe: ['boxe', 'boxing', 'box'],
  muay_thai: ['muay thai', 'muaythai', 'thai', 'kickboxing', 'kick boxing'],
  lutte: ['lutte', 'wrestling', 'catch'],
  judo: ['judo'],
  course: ['course', 'running', 'run', 'jogging', 'footing'],
  velo: ['vélo', 'velo', 'cycling', 'cyclisme'],
  natation: ['natation', 'nage', 'swimming'],
  musculation: ['muscu', 'musculation', 'gym', 'poids', 'haltères'],
  yoga: ['yoga'],
  crossfit: ['crossfit', 'cross fit', 'wod'],
};

const SESSION_TYPE_KEYWORDS: Record<string, string[]> = {
  sparring: ['sparring', 'spar', 'combat', 'roulé', 'roule', 'rolling', 'roll'],
  drilling: ['drilling', 'drill', 'technique', 'répétition', 'repetition', 'exercice'],
  cours: ['cours', 'course', 'classe', 'class', 'entraînement', 'entrainement'],
  competition: ['compét', 'compet', 'tournoi', 'competition', 'match', 'combat officiel'],
};

const INTENSITY_KEYWORDS: Record<number, string[]> = {
  3: ['léger', 'leger', 'détendu', 'cool', 'relax', 'facile', 'easy'],
  5: ['modéré', 'modere', 'moyen', 'medium'],
  7: ['intense', 'dur', 'hard', 'difficile', 'corsé', 'corse'],
  9: ['très dur', 'tres dur', 'max', 'maximum', 'à fond', 'a fond', 'brutal', 'mortel'],
};

function parseQuickLog(text: string): ParsedSession {
  const lower = text.toLowerCase();
  const result: ParsedSession = { confidence: 0, detectedFields: [], notes: text.trim() };

  // ── Détection sport ──
  for (const [sportId, keywords] of Object.entries(SPORT_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      result.sport = sportId;
      result.sportName = SPORTS.find(s => s.id === sportId)?.name ?? sportId;
      result.detectedFields.push('sport');
      break;
    }
  }

  // ── Détection durée ──
  // "1h30", "90 minutes", "2h", "45min"
  const durationMatch =
    lower.match(/(\d+)\s*h\s*(\d+)/) ||
    lower.match(/(\d+)\s*h(?:eure)?s?/) ||
    lower.match(/(\d+)\s*min(?:ute)?s?/);
  if (durationMatch) {
    if (lower.match(/(\d+)\s*h\s*(\d+)/)) {
      const m = lower.match(/(\d+)\s*h\s*(\d+)/)!;
      result.duration = parseInt(m[1]) * 60 + parseInt(m[2]);
    } else if (lower.match(/(\d+)\s*h(?:eure)?s?/)) {
      const m = lower.match(/(\d+)\s*h(?:eure)?s?/)!;
      result.duration = parseInt(m[1]) * 60;
    } else {
      const m = lower.match(/(\d+)\s*min(?:ute)?s?/)!;
      result.duration = parseInt(m[1]);
    }
    result.detectedFields.push('durée');
  }

  // ── Détection rounds ──
  const roundMatch = lower.match(/(\d+)\s*(?:round|ronde|roll|roule)/);
  if (roundMatch) {
    result.rounds = parseInt(roundMatch[1]);
    result.detectedFields.push('rounds');
  }

  // ── Détection intensité ──
  for (const [rpe, keywords] of Object.entries(INTENSITY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      result.intensity = parseInt(rpe);
      result.detectedFields.push('intensité');
      break;
    }
  }

  // ── Détection type de séance ──
  for (const [type, keywords] of Object.entries(SESSION_TYPE_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      result.sessionType = type;
      result.detectedFields.push('type');
      break;
    }
  }

  // ── Calcul confiance ──
  result.confidence = Math.min(100, result.detectedFields.length * 25);

  return result;
}

// ============================================
// COMPOSANT
// ============================================

export default function QuickLogScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedSession | null>(null);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus pour que le clavier (avec micro) s'ouvre immédiatement
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleAnalyze = () => {
    if (!text.trim()) return;
    setParsing(true);
    impactAsync(ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      setParsed(parseQuickLog(text));
      setParsing(false);
    }, 300);
  };

  const handleConfirm = () => {
    if (!parsed) return;
    impactAsync(ImpactFeedbackStyle.Heavy);

    const params: Record<string, string> = {};
    if (parsed.sport) params.sport = parsed.sport;
    if (parsed.duration) params.duration = String(parsed.duration);
    if (parsed.rounds) params.rounds = String(parsed.rounds);
    if (parsed.intensity) params.intensity = String(parsed.intensity);
    if (parsed.sessionType) params.sessionType = parsed.sessionType;
    if (parsed.notes) params.notes = parsed.notes;

    const query = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    router.replace((`/add-training${query ? '?' + query : ''}`) as any);
  };

  const confidenceColor = parsed
    ? parsed.confidence >= 75 ? '#22C55E'
    : parsed.confidence >= 50 ? '#F59E0B'
    : '#EF4444'
    : '#94A3B8';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 48 : 0}
    >
      <View style={[styles.root, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Log rapide</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 280 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* Instruction */}
          <View style={[styles.tipBox, { backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.07)', borderColor: '#8B5CF640' }]}>
            <Mic size={18} color="#8B5CF6" />
            <Text style={[styles.tipText, { color: colors.textMuted ?? '#888' }]}>
              <Text style={{ fontWeight: '700', color: '#8B5CF6' }}>Astuce :</Text> tape le micro{' '}
              <Mic size={14} color="#8B5CF6" /> sur ton clavier pour dicter.{'\n'}
              Ex : <Text style={{ fontStyle: 'italic' }}>"JJB 1h30, 4 rounds de sparring, très dur"</Text>
            </Text>
          </View>

          {/* Zone de saisie */}
          <View style={[styles.inputCard, {
            backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }]}>
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: colors.text }]}
              value={text}
              onChangeText={setText}
              placeholder="Décris ta séance en 2-3 phrases..."
              placeholderTextColor={colors.textMuted ?? '#888'}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="done"
              onSubmitEditing={handleAnalyze}
            />
            {text.length > 0 && (
              <TouchableOpacity
                onPress={() => { setText(''); setParsed(null); inputRef.current?.focus(); }}
                style={styles.clearBtn}
              >
                <RotateCcw size={16} color={colors.textMuted ?? '#888'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Exemples */}
          {!text && (
            <View style={{ gap: 8, marginTop: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted ?? '#888', letterSpacing: 0.5 }}>EXEMPLES</Text>
              {[
                'JJB 1h, 5 rounds de sparring, modéré',
                'MMA 2h, technique sur les takedowns, léger',
                'Boxe 45 minutes, très intense, sparring',
                'Musculation 1h30, entraînement du haut du corps',
              ].map(ex => (
                <TouchableOpacity
                  key={ex}
                  onPress={() => { setText(ex); impactAsync(ImpactFeedbackStyle.Light); }}
                  style={[styles.examplePill, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                  }]}
                >
                  <Text style={{ fontSize: 13, color: colors.textMuted ?? '#888' }}>{ex}</Text>
                  <ChevronRight size={14} color={colors.textMuted ?? '#888'} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Bouton analyser */}
          {text.length > 5 && !parsed && (
            <TouchableOpacity
              style={[styles.analyzeBtn, { backgroundColor: '#8B5CF6' }]}
              onPress={handleAnalyze}
              activeOpacity={0.8}
            >
              {parsing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Mic size={18} color="#fff" />
                  <Text style={styles.analyzeBtnText}>Analyser la séance</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Résultat du parsing */}
          {parsed && (
            <View style={{ marginTop: 16, gap: 12 }}>
              {/* Score de confiance */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <View style={{ width: `${parsed.confidence}%` as any, height: '100%', backgroundColor: confidenceColor, borderRadius: 3 }} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: confidenceColor }}>
                  {parsed.confidence}% détecté
                </Text>
              </View>

              {/* Champs détectés */}
              <View style={[styles.parsedCard, {
                backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              }]}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
                  Séance détectée
                </Text>

                {[
                  { label: 'Sport', value: parsed.sportName, icon: Dumbbell },
                  { label: 'Durée', value: parsed.duration ? `${Math.floor(parsed.duration / 60)}h${parsed.duration % 60 > 0 ? (parsed.duration % 60) + 'min' : ''}` : undefined, icon: Clock },
                  { label: 'Rounds', value: parsed.rounds ? `${parsed.rounds} rounds` : undefined, icon: RefreshCw },
                  { label: 'Intensité', value: parsed.intensity ? `RPE ${parsed.intensity}/10` : undefined, icon: Zap },
                  { label: 'Type', value: parsed.sessionType, icon: ClipboardList },
                ].filter(f => f.value).map(field => {
                  const FieldIcon = field.icon;
                  return (
                  <View key={field.label} style={[styles.fieldRow, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                    <FieldIcon size={14} color={colors.textMuted ?? '#888'} />
                    <Text style={{ fontSize: 13, color: colors.textMuted ?? '#888', width: 70 }}>{field.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 }}>{field.value}</Text>
                    <Check size={14} color="#22C55E" />
                  </View>
                  );
                })}

                {parsed.detectedFields.length === 0 && (
                  <Text style={{ color: colors.textMuted ?? '#888', fontSize: 13 }}>
                    Aucun champ reconnu. Reformule ou remplis manuellement.
                  </Text>
                )}
              </View>

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setParsed(null)}
                  style={[styles.actionBtn, {
                    flex: 1,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                  }]}
                >
                  <RotateCcw size={16} color={colors.text} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirm}
                  style={[styles.actionBtn, { flex: 2, backgroundColor: '#8B5CF6' }]}
                >
                  <ChevronRight size={16} color="#fff" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>Continuer dans le formulaire</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '800',
  },
  tipBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14,
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },
  inputCard: {
    borderRadius: 16, borderWidth: 1, padding: 14,
    minHeight: 110, position: 'relative',
  },
  textInput: {
    fontSize: 15, lineHeight: 22,
    minHeight: 80,
  },
  clearBtn: {
    position: 'absolute', top: 10, right: 10,
    padding: 4,
  },
  examplePill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1,
  },
  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 12,
  },
  analyzeBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  parsedCard: {
    borderRadius: 16, borderWidth: 1, padding: 14, gap: 4,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 13,
  },
});
