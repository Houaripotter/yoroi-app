// ============================================
// YOROI - CAMP DE COMPÉTITION
// ============================================
// Génération automatique d'un plan périodisé
// en 3 phases : Prépa générale / Spécifique / Affûtage
// ============================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { ChevronLeft, Calendar, Zap, Target, TrendingUp, TrendingDown, Minus as MinusIcon } from 'lucide-react-native';
import { PremiumGate } from '@/components/premium/PremiumGate';

// ============================================
// TYPES
// ============================================

interface CampPhase {
  name: string;
  weeks: number;
  loadPct: number;        // % de charge relative (0-100)
  focus: string;
  color: string;
  tips: string[];
}

interface WeekPlan {
  weekNumber: number;
  phase: string;
  phaseColor: string;
  startDate: string;
  sessions: number;
  loadLevel: 'faible' | 'modere' | 'eleve' | 'max' | 'affutage';
  loadColor: string;
  focus: string;
}

const LOAD_COLORS = {
  faible: '#22C55E',
  modere: '#F59E0B',
  eleve: '#F97316',
  max: '#EF4444',
  affutage: '#06B6D4',
};

// ============================================
// ALGORITHME DE PÉRIODISATION
// ============================================

function generateCamp(totalWeeks: number, currentSessionsPerWeek: number): { phases: CampPhase[]; weeks: WeekPlan[] } {
  // Distribution des phases selon la durée du camp
  let prepWeeks: number, specWeeks: number, taperingWeeks: number;

  if (totalWeeks <= 4) {
    prepWeeks = 1; specWeeks = 2; taperingWeeks = 1;
  } else if (totalWeeks <= 8) {
    prepWeeks = Math.round(totalWeeks * 0.4);
    taperingWeeks = Math.max(1, Math.round(totalWeeks * 0.15));
    specWeeks = totalWeeks - prepWeeks - taperingWeeks;
  } else {
    prepWeeks = Math.round(totalWeeks * 0.45);
    taperingWeeks = Math.max(2, Math.round(totalWeeks * 0.15));
    specWeeks = totalWeeks - prepWeeks - taperingWeeks;
  }

  const phases: CampPhase[] = [
    {
      name: 'Préparation générale',
      weeks: prepWeeks,
      loadPct: 70,
      focus: 'Volume élevé, intensité modérée. Renforcement général, cardio, technique de base.',
      color: '#22C55E',
      tips: [
        'Augmente le volume progressivement (+10% par semaine max)',
        'Travaille les fondamentaux techniques',
        'Inclus au moins 1 jour de récupération active',
        'Renforcement musculaire général 2x/semaine',
      ],
    },
    {
      name: 'Préparation spécifique',
      weeks: specWeeks,
      loadPct: 90,
      focus: 'Charge maximale, haute intensité. Sparring intense, tactique, situations de compétition.',
      color: '#EF4444',
      tips: [
        'Sparring de compétition 2-3x/semaine',
        'Travail des points faibles identifiés',
        'Simulation de matchs (durée réglementaire)',
        'Nutrition et récupération prioritaires',
      ],
    },
    {
      name: 'Affûtage',
      weeks: taperingWeeks,
      loadPct: 40,
      focus: 'Réduction du volume, maintien de l\'intensité. Fraîcheur physique et mentale.',
      color: '#06B6D4',
      tips: [
        'Réduis le volume de 40-60%',
        'Maintiens l\'intensité des séances courtes',
        'Priorité au sommeil (8h+)',
        'Dernier sparring intense : J-10 minimum',
      ],
    },
  ];

  // Génération du plan semaine par semaine
  const weeks: WeekPlan[] = [];
  const today = new Date();
  let weekIndex = 0;
  const base = currentSessionsPerWeek || 4;

  for (const phase of phases) {
    for (let w = 0; w < phase.weeks; w++) {
      weekIndex++;
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + (weekIndex - 1) * 7);
      const dateStr = startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

      // Charge progressive dans chaque phase
      const phaseProg = w / Math.max(1, phase.weeks - 1);
      let loadPct = phase.loadPct;

      if (phase.name.includes('générale')) {
        loadPct = 55 + phaseProg * 20; // 55% → 75%
      } else if (phase.name.includes('spécifique')) {
        loadPct = 80 + phaseProg * 15; // 80% → 95%
        // Semaine de décharge toutes les 3 semaines
        if (w > 0 && (w + 1) % 3 === 0) loadPct = 65;
      } else {
        loadPct = 45 - phaseProg * 10; // 45% → 35%
      }

      const sessions = phase.name.includes('Affûtage')
        ? Math.max(2, Math.round(base * 0.6))
        : phase.name.includes('spécifique')
        ? base + 1
        : base;

      let loadLevel: WeekPlan['loadLevel'] = 'modere';
      let loadColor = LOAD_COLORS.modere;
      if (loadPct >= 85) { loadLevel = 'max'; loadColor = LOAD_COLORS.max; }
      else if (loadPct >= 70) { loadLevel = 'eleve'; loadColor = LOAD_COLORS.eleve; }
      else if (loadPct >= 50) { loadLevel = 'modere'; loadColor = LOAD_COLORS.modere; }
      else if (phase.name.includes('Affûtage')) { loadLevel = 'affutage'; loadColor = LOAD_COLORS.affutage; }
      else { loadLevel = 'faible'; loadColor = LOAD_COLORS.faible; }

      weeks.push({
        weekNumber: weekIndex,
        phase: phase.name,
        phaseColor: phase.color,
        startDate: dateStr,
        sessions,
        loadLevel,
        loadColor,
        focus: phase.focus,
      });
    }
  }

  return { phases, weeks };
}

// ============================================
// COMPOSANT
// ============================================

const LOAD_LABELS: Record<string, string> = {
  faible: 'Charge faible',
  modere: 'Charge modérée',
  eleve: 'Charge élevée',
  max: 'Charge max',
  affutage: 'Affûtage',
};

const LOAD_ICONS: Record<string, React.ReactNode> = {
  faible: <TrendingDown size={12} color={LOAD_COLORS.faible} />,
  modere: <MinusIcon size={12} color={LOAD_COLORS.modere} />,
  eleve: <TrendingUp size={12} color={LOAD_COLORS.eleve} />,
  max: <Zap size={12} color={LOAD_COLORS.max} />,
  affutage: <TrendingDown size={12} color={LOAD_COLORS.affutage} />,
};

export default function CompetitionCampScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [weeksInput, setWeeksInput] = useState('8');
  const [sessionsInput, setSessionsInput] = useState('4');
  const [generated, setGenerated] = useState(false);

  const camp = useMemo(() => {
    const w = Math.max(2, Math.min(24, parseInt(weeksInput) || 8));
    const s = Math.max(1, Math.min(7, parseInt(sessionsInput) || 4));
    return generateCamp(w, s);
  }, [weeksInput, sessionsInput]);

  const cardStyle = {
    backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    padding: 16,
  };

  return (
    <PremiumGate featureTitle="Camp de competition">
    <View style={[styles.root, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Camp de compétition</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Paramètres */}
        <View style={cardStyle}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Paramètres du camp</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', marginBottom: 6 }}>Semaines avant la compét.</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border ?? '#333', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}
                value={weeksInput}
                onChangeText={v => setWeeksInput(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
                onEndEditing={() => setGenerated(true)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', marginBottom: 6 }}>Séances/semaine actuelles</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border ?? '#333', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}
                value={sessionsInput}
                onChangeText={v => setSessionsInput(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={1}
                onEndEditing={() => setGenerated(true)}
              />
            </View>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 }}
            onPress={() => { setGenerated(true); impactAsync(ImpactFeedbackStyle.Medium); }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Générer mon camp</Text>
          </TouchableOpacity>
        </View>

        {generated && (
          <>
            {/* Résumé des phases */}
            {camp.phases.map(phase => (
              <View key={phase.name} style={[cardStyle, { borderLeftWidth: 3, borderLeftColor: phase.color }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: phase.color }} />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{phase.name}</Text>
                  <View style={{ marginLeft: 'auto' as any, backgroundColor: `${phase.color}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: phase.color }}>{phase.weeks} sem.</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: colors.textMuted ?? '#888', lineHeight: 18, marginBottom: 8 }}>{phase.focus}</Text>
                <View style={{ gap: 4 }}>
                  {phase.tips.map((tip, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: phase.color, marginTop: 5 }} />
                      <Text style={{ flex: 1, fontSize: 12, color: colors.textMuted ?? '#888', lineHeight: 17 }}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {/* Semainier */}
            <View style={cardStyle}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 12 }}>Plan semaine par semaine</Text>
              <View style={{ gap: 8 }}>
                {camp.weeks.map(week => (
                  <View
                    key={week.weekNumber}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      backgroundColor: `${week.phaseColor}09`,
                      borderRadius: 10, padding: 10,
                      borderLeftWidth: 3, borderLeftColor: week.phaseColor,
                    }}
                  >
                    {/* Numéro */}
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: week.phaseColor, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>S{week.weekNumber}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888' }}>{week.startDate}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{week.phase.split(' ').slice(-1)[0]}</Text>
                    </View>
                    {/* Séances */}
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{week.sessions}</Text>
                      <Text style={{ fontSize: 9, color: colors.textMuted ?? '#888' }}>séances</Text>
                    </View>
                    {/* Niveau charge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: `${week.loadColor}18` }}>
                      {LOAD_ICONS[week.loadLevel]}
                      <Text style={{ fontSize: 9, fontWeight: '700', color: week.loadColor }}>{LOAD_LABELS[week.loadLevel]}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Note informative */}
            <View style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)', borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
              <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', lineHeight: 18 }}>
                Ce plan est une base de périodisation classique. Adapte-le selon tes ressentis et les conseils de ton coach. Utilise le score Readiness dans l'app pour ajuster ta charge en temps réel.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
    </PremiumGate>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  input: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, fontWeight: '700', textAlign: 'center',
  },
});
