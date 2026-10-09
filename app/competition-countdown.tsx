// ============================================
// COMPETITION COUNTDOWN · Mode J-X
// ============================================
// Affiche un countdown enrichi + checklist prepa + conseils du jour
// ============================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check, Circle, Trophy, Calendar, MapPin, Weight, Moon, Droplet, Apple, Dumbbell, AlertTriangle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/ThemeContext';
import { getCompetitions, type Competition } from '@/lib/database';
import { lightHaptic, successHaptic } from '@/lib/haptics';

interface PrepStep {
  id: string;
  label: string;
  description: string;
  icon: any;
  fromDays: number; // distance en jours (Math.abs) avant competition ou leq
  checked: boolean;
}

const CHECKLIST_KEY_PREFIX = '@yoroi_comp_checklist_';

// Parse 'yyyy-MM-dd' en date locale (évite le décalage UTC)
const parseLocalDate = (d: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d);
};

export default function CompetitionCountdownScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ compId?: string }>();
  const [comp, setComp] = useState<Competition | null>(null);
  const [steps, setSteps] = useState<PrepStep[]>([]);

  useEffect(() => {
    (async () => {
      const list = await getCompetitions().catch(() => [] as Competition[]);
      // Choisir la competition ciblee ou la prochaine a venir
      // Début de journée locale : le jour J reste "à venir"
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const now = startOfToday.getTime();
      const target =
        (params.compId && list.find(c => String(c.id) === params.compId)) ||
        list
          .filter(c => parseLocalDate(c.date).getTime() >= now)
          .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())[0] ||
        null;
      setComp(target || null);
      if (target) {
        const loaded = await loadChecklist(target.id ?? 0);
        setSteps(buildSteps(loaded));
      }
    })();
  }, [params.compId]);

  const daysLeft = useMemo(() => {
    if (!comp) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = parseLocalDate(comp.date);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - now.getTime()) / 86400000);
  }, [comp]);

  const hoursLeft = useMemo(() => {
    if (!comp) return 0;
    return Math.max(0, Math.round((parseLocalDate(comp.date).getTime() - Date.now()) / 3600000));
  }, [comp]);

  const toggleStep = async (stepId: string) => {
    lightHaptic().catch(() => {});
    const newSteps = steps.map(s => s.id === stepId ? { ...s, checked: !s.checked } : s);
    setSteps(newSteps);
    if (comp?.id != null) {
      const map: Record<string, boolean> = {};
      newSteps.forEach(s => { map[s.id] = s.checked; });
      await AsyncStorage.setItem(CHECKLIST_KEY_PREFIX + comp.id, JSON.stringify(map));
    }
    if (newSteps.every(s => s.checked)) {
      successHaptic().catch(() => {});
    }
  };

  if (!comp) {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <ChevronLeft size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Trophy size={56} color={colors.textMuted} />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 20, textAlign: 'center' }}>
            Aucune competition a venir
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 10, textAlign: 'center', lineHeight: 20 }}>
            Ajoute une competition dans la section dediee pour voir ton compte a rebours active.
          </Text>
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.accent, marginTop: 24 }]}
            onPress={() => router.replace('/competitions')}
          >
            <Text style={[styles.ctaText, { color: colors.textOnGold }]}>Ouvrir mes competitions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Filtre les etapes pertinentes selon J-X
  const relevantSteps = steps.filter(s => daysLeft <= s.fromDays);

  // Phase pour le label
  const phase =
    daysLeft <= 0 ? 'JOUR J' :
    daysLeft === 1 ? 'J-1 · VEILLE' :
    daysLeft <= 3 ? 'PHASE FINALE' :
    daysLeft <= 7 ? 'DERNIERE SEMAINE' :
    daysLeft <= 14 ? 'AFFUTAGE' : 'PREPARATION';
  const phaseColor =
    daysLeft <= 0 ? '#EF4444' :
    daysLeft <= 1 ? '#F59E0B' :
    daysLeft <= 3 ? '#D4AF37' :
    daysLeft <= 7 ? '#10B981' : colors.accent;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header gradient */}
        <LinearGradient
          colors={[phaseColor + '30', 'transparent']}
          style={{ paddingTop: insets.top + 6, paddingBottom: 20, paddingHorizontal: 16 }}
        >
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <ChevronLeft size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.phaseLabel, { color: phaseColor }]}>{phase}</Text>
            <View style={{ width: 26 }} />
          </View>

          <Text style={[styles.compName, { color: colors.text }]} numberOfLines={2}>
            {comp.nom}
          </Text>

          <View style={styles.metaRow}>
            <Calendar size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {parseLocalDate(comp.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            {comp.lieu ? (
              <>
                <MapPin size={14} color={colors.textMuted} style={{ marginLeft: 10 }} />
                <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                  {comp.lieu}
                </Text>
              </>
            ) : null}
          </View>

          {/* Gros countdown */}
          <View style={styles.countdownBox}>
            {daysLeft > 1 ? (
              <>
                <Text style={[styles.countBig, { color: phaseColor }]}>{daysLeft}</Text>
                <Text style={[styles.countLabel, { color: colors.text }]}>JOURS</Text>
              </>
            ) : daysLeft === 1 ? (
              <>
                <Text style={[styles.countBig, { color: phaseColor }]}>{hoursLeft}</Text>
                <Text style={[styles.countLabel, { color: colors.text }]}>HEURES</Text>
              </>
            ) : daysLeft === 0 ? (
              <>
                <Text style={[styles.countBig, { color: phaseColor }]}>C'EST</Text>
                <Text style={[styles.countLabel, { color: colors.text, fontSize: 48 }]}>AUJOURD'HUI</Text>
              </>
            ) : (
              <>
                <Text style={[styles.countBig, { color: colors.textMuted, fontSize: 48 }]}>TERMINEE</Text>
              </>
            )}
          </View>

          {comp.poids_max && comp.categorie_poids ? (
            <View style={[styles.weightBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <Weight size={16} color={phaseColor} />
              <Text style={[styles.weightText, { color: colors.text }]}>
                Categorie {comp.categorie_poids} · {comp.poids_max} kg max
              </Text>
            </View>
          ) : null}
        </LinearGradient>

        {/* Checklist */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Check-list preparation</Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
            {relevantSteps.filter(s => s.checked).length} / {relevantSteps.length} effectuees
          </Text>

          {relevantSteps.length === 0 && (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              La check-list se deploie au fur et a mesure que la competition approche.
            </Text>
          )}

          {relevantSteps.map(step => {
            const Icon = step.icon;
            return (
              <TouchableOpacity
                key={step.id}
                activeOpacity={0.8}
                onPress={() => toggleStep(step.id)}
                style={[
                  styles.stepRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: step.checked ? phaseColor : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                  },
                ]}
              >
                <View style={[styles.stepIcon, { backgroundColor: phaseColor + '22' }]}>
                  <Icon size={18} color={phaseColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepLabel, { color: colors.text, textDecorationLine: step.checked ? 'line-through' : 'none', opacity: step.checked ? 0.6 : 1 }]}>
                    {step.label}
                  </Text>
                  <Text style={[styles.stepDesc, { color: colors.textMuted }]}>{step.description}</Text>
                </View>
                <View style={[styles.checkBox, { borderColor: step.checked ? phaseColor : colors.border, backgroundColor: step.checked ? phaseColor : 'transparent' }]}>
                  {step.checked ? <Check size={16} color="#fff" /> : <Circle size={14} color="transparent" />}
                </View>
              </TouchableOpacity>
            );
          })}

          {daysLeft <= 3 && daysLeft >= 0 && (
            <View style={[styles.warningBox, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}>
              <AlertTriangle size={18} color="#F59E0B" />
              <Text style={[styles.warningText, { color: colors.text }]}>
                Phase critique. Prioritise sommeil, hydratation, et eviter toute session trop intense.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

async function loadChecklist(compId: number): Promise<Record<string, boolean>> {
  try {
    const raw = await AsyncStorage.getItem(CHECKLIST_KEY_PREFIX + compId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function buildSteps(saved: Record<string, boolean>): PrepStep[] {
  const list: PrepStep[] = [
    { id: 'weight_check', label: 'Pesee controle', description: 'Pesee quotidienne a jeun. Ajuste sans paniquer.', icon: Weight, fromDays: 14, checked: false },
    { id: 'train_taper', label: 'Affutage technique', description: 'Reduis volume. Garde intensite. Repete ton plan de combat.', icon: Dumbbell, fromDays: 7, checked: false },
    { id: 'sleep_8h', label: '8h de sommeil', description: 'Couche-toi tot. La recup nocturne, c\'est ton arme secrete.', icon: Moon, fromDays: 7, checked: false },
    { id: 'hydration', label: 'Hydratation reglée', description: '2-3L/jour. Pas de binge d\'eau la veille.', icon: Droplet, fromDays: 7, checked: false },
    { id: 'nutrition', label: 'Repas pre-competition', description: 'Glucides complexes + proteines. Pas d\'aliments nouveaux.', icon: Apple, fromDays: 3, checked: false },
    { id: 'gear', label: 'Materiel prepare', description: 'Kimono / tenue, protections, snacks, eau : check la veille.', icon: Trophy, fromDays: 2, checked: false },
    { id: 'mental', label: 'Visualisation mentale', description: '5 min les yeux fermes. Visualise ta victoire, calme.', icon: Circle, fromDays: 2, checked: false },
    { id: 'light_breakfast', label: 'Petit dej leger', description: 'Facile a digerer. 2-3h avant peser.', icon: Apple, fromDays: 1, checked: false },
    { id: 'warmup_plan', label: 'Plan d\'echauffement', description: 'Routine connue. Pas de surprise le jour J.', icon: Dumbbell, fromDays: 1, checked: false },
  ];
  return list.map(s => ({ ...s, checked: !!saved[s.id] }));
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  phaseLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  compName: { fontSize: 24, fontWeight: '800', marginTop: 16, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  metaText: { fontSize: 13 },
  countdownBox: { alignItems: 'center', marginTop: 28 },
  countBig: { fontSize: 96, fontWeight: '900', letterSpacing: -4, lineHeight: 100 },
  countLabel: { fontSize: 16, fontWeight: '800', letterSpacing: 4, marginTop: -4 },
  weightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 20,
  },
  weightText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 24 },
  sectionSub: { fontSize: 13, marginTop: 2, marginBottom: 12 },
  empty: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  stepIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 14, fontWeight: '700' },
  stepDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  checkBox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  warningText: { flex: 1, fontSize: 13, lineHeight: 18 },
  cta: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  ctaText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
});
