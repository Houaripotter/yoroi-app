// ============================================
// MARKETING KIT · guide pas-à-pas pour capturer une séquence narrative
// Guide l'utilisateur à travers 6 écrans clés de l'app pour raconter
// une histoire de progression complète.
// ============================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  DeviceEventEmitter,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, Home, BarChart3, Users, Target,
  TrendingUp, FileText, Check, ExternalLink, Info,
  Sparkles, Clapperboard,
} from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { useScreenshotMode } from '@/lib/ScreenshotModeContext';

interface ScreenshotStep {
  id: string;
  title: string;
  description: string;
  route: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  navigationHint: string;
}

const STEPS: ScreenshotStep[] = [
  {
    id: 'home',
    title: 'Accueil',
    description: 'Dashboard avec ceinture actuelle, streak, stat principale. Premier contact visuel.',
    route: '/(tabs)',
    Icon: Home,
    color: '#3B82F6',
    navigationHint: 'Onglet Accueil → scroll pour voir tout',
  },
  {
    id: 'stats-6mo',
    title: 'Graphique 6 mois',
    description: 'Progression du poids et des séances sur 6 mois. Montre la courbe d\'évolution.',
    route: '/(tabs)/stats',
    Icon: TrendingUp,
    color: '#10B981',
    navigationHint: 'Onglet Stats → onglet Séances ou Poids → période 6 mois',
  },
  {
    id: 'sparring-podium',
    title: 'Podium sparring',
    description: 'Top 3 partenaires avec photos, V/D, taux victoire. Social proof.',
    route: '/training-journal',
    Icon: Users,
    color: '#F59E0B',
    navigationHint: 'Onglet Carnet → Sparring → scroll jusqu\'au podium',
  },
  {
    id: 'session-detail',
    title: 'Détail séance',
    description: 'Une session complète : rounds, techniques, notes tactiques, adversaires.',
    route: '/history',
    Icon: FileText,
    color: '#8B5CF6',
    navigationHint: 'Historique → tape sur une session récente',
  },
  {
    id: 'techniques',
    title: 'Top techniques',
    description: 'Heatmap des techniques travaillées. Expertise démontrée.',
    route: '/training-journal',
    Icon: Target,
    color: '#EF4444',
    navigationHint: 'Carnet → Techniques → voir le heatmap',
  },
  {
    id: 'before-after',
    title: 'Before / After',
    description: 'Comparaison poids et mensurations début vs maintenant. Résultat concret.',
    route: '/body-composition',
    Icon: BarChart3,
    color: '#EC4899',
    navigationHint: 'Composition corporelle → section Évolution',
  },
];

export default function MarketingKitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isScreenshotMode, setScreenshotMode, useFakeStatusBar, toggleFakeStatusBar } = useScreenshotMode();

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const cardBg = colors.backgroundCard;
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const toggleStep = (stepId: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const goToScreen = (step: ScreenshotStep) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    // Active le mode screenshot auto si pas actif
    if (!isScreenshotMode) {
      setScreenshotMode(true);
    }
    router.push(step.route as any);
  };

  const startSequence = async () => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    // Activer mode screenshot + fake status bar
    if (!isScreenshotMode) await setScreenshotMode(true);
    if (!useFakeStatusBar) await toggleFakeStatusBar();
    // Reset progression
    setCompletedSteps(new Set());
    // Naviguer vers le premier
    router.push(STEPS[0].route as any);
  };

  const progress = completedSteps.size / STEPS.length;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Marketing Kit</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Séquence narrative · 6 écrans
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero / Intro ── */}
        <View style={[styles.hero, { backgroundColor: '#A855F712', borderColor: '#A855F744' }]}>
          <View style={styles.heroIcon}>
            <Clapperboard size={28} color="#A855F7" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            6 captures pour raconter ton app
          </Text>
          <Text style={[styles.heroDesc, { color: colors.textMuted }]}>
            Suis la séquence dans l'ordre : chaque écran continue l'histoire du précédent. Tu auras un jeu cohérent pour App Store, landing page ou Instagram.
          </Text>
        </View>

        {/* ── Progression bar ── */}
        <View style={[styles.progressCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>
              Progression
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#A855F7' }}>
              {completedSteps.size} / {STEPS.length}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        {/* ── Bouton démarrer séquence ── */}
        <TouchableOpacity
          onPress={startSequence}
          activeOpacity={0.85}
          style={[styles.startBtn, { backgroundColor: '#A855F7', marginTop: 16 }]}
        >
          <Sparkles size={18} color="#fff" />
          <Text style={styles.startBtnText}>Démarrer la séquence</Text>
        </TouchableOpacity>

        <Text style={[styles.startHint, { color: colors.textMuted }]}>
          Active automatiquement : mode screenshot propre + status bar 09:41
        </Text>

        {/* ── Instructions ── */}
        <View style={[styles.infoBox, { backgroundColor: '#3B82F615', borderColor: '#3B82F644', marginTop: 20 }]}>
          <Info size={14} color="#3B82F6" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#3B82F6', marginBottom: 4 }}>
              Comment capturer :
            </Text>
            <Text style={{ fontSize: 11, color: '#3B82F6', lineHeight: 16 }}>
              1. Tape "Ouvrir" sur un écran ci-dessous{'\n'}
              2. Ajuste le contenu si besoin{'\n'}
              3. Screenshot iPhone : Volume↑ + Touche latérale{'\n'}
              4. Reviens ici, coche l'étape, passe à la suivante
            </Text>
          </View>
        </View>

        {/* ── Liste des étapes ── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          ÉTAPES DE LA SÉQUENCE
        </Text>

        <View style={{ gap: 10 }}>
          {STEPS.map((step, idx) => {
            const isCompleted = completedSteps.has(step.id);
            return (
              <View
                key={step.id}
                style={[styles.stepCard, {
                  backgroundColor: cardBg,
                  borderColor: isCompleted ? '#22C55E' : borderColor,
                  borderWidth: isCompleted ? 2 : 1,
                }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <View style={[styles.stepNumber, {
                    backgroundColor: isCompleted ? '#22C55E' : step.color,
                  }]}>
                    {isCompleted ? (
                      <Check size={14} color="#fff" strokeWidth={3} />
                    ) : (
                      <Text style={styles.stepNumberText}>{idx + 1}</Text>
                    )}
                  </View>
                  <View style={[styles.stepIconWrap, { backgroundColor: step.color + '18' }]}>
                    <step.Icon size={16} color={step.color} />
                  </View>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>
                    {step.title}
                  </Text>
                </View>

                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                  {step.description}
                </Text>

                <View style={[styles.stepHint, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                  <Text style={[styles.stepHintLabel, { color: colors.textMuted }]}>
                    COMMENT Y ALLER
                  </Text>
                  <Text style={[styles.stepHintText, { color: colors.text }]}>
                    {step.navigationHint}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => goToScreen(step)}
                    activeOpacity={0.85}
                    style={[styles.stepBtn, { backgroundColor: step.color, flex: 1 }]}
                  >
                    <ExternalLink size={14} color="#fff" />
                    <Text style={styles.stepBtnText}>Ouvrir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => toggleStep(step.id)}
                    activeOpacity={0.85}
                    style={[styles.stepBtn, {
                      backgroundColor: isCompleted ? '#22C55E' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                      flex: 1,
                    }]}
                  >
                    {isCompleted ? (
                      <>
                        <Check size={14} color="#fff" strokeWidth={3} />
                        <Text style={styles.stepBtnText}>Capturé</Text>
                      </>
                    ) : (
                      <Text style={[styles.stepBtnText, { color: colors.text }]}>
                        Marquer fait
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Fin ── */}
        {completedSteps.size === STEPS.length && (
          <View style={[styles.finishedCard, { backgroundColor: '#22C55E15', borderColor: '#22C55E' }]}>
            <Check size={32} color="#22C55E" strokeWidth={3} />
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#22C55E', marginTop: 8 }}>
              Séquence complète !
            </Text>
            <Text style={{ fontSize: 12, color: '#22C55E', marginTop: 4, textAlign: 'center' }}>
              Récupère tes 6 screenshots dans la Pellicule puis organise-les dans l'ordre pour ta story.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  subtitle: { fontSize: 11, textAlign: 'center' },

  hero: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  heroIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(168,85,247,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  heroDesc: { fontSize: 12, textAlign: 'center', lineHeight: 17 },

  progressCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 4,
  },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  startHint: { fontSize: 10, textAlign: 'center', marginTop: 6, fontStyle: 'italic' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },

  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6, marginTop: 22, marginBottom: 10 },

  stepCard: {
    padding: 14,
    borderRadius: 14,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  stepIconWrap: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  stepTitle: { flex: 1, fontSize: 15, fontWeight: '900' },
  stepDesc: { fontSize: 12, lineHeight: 16 },
  stepHint: {
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  stepHintLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginBottom: 3 },
  stepHintText: { fontSize: 11, fontWeight: '600', lineHeight: 14 },

  stepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  stepBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  finishedCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
});
