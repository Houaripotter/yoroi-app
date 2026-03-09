// ============================================
// MUSCLE MAP CARD - Carte musculaire SVG
// Affiche les muscles travaillés selon le sport
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Ellipse, Rect, Circle, G, Path } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

// ─── Types ───────────────────────────────────
type MuscleId =
  // AVANT
  | 'pectoraux' | 'deltoide_ant' | 'biceps' | 'avant_bras' | 'abdominaux'
  | 'obliques' | 'quadriceps' | 'tibialis' | 'flechisseurs'
  // ARRIÈRE
  | 'trapeze' | 'dorsaux' | 'deltoide_post' | 'triceps' | 'lombaires'
  | 'fessiers' | 'ischio_jambiers' | 'mollets';

type Activation = 'primary' | 'secondary' | 'inactive';

interface MuscleMapCardProps {
  sport: string;
  sportName?: string;
  sportColor?: string;
  /** Muscles saisis manuellement (ex: "pectoraux,biceps,abdominaux") — prioritaire sur le sport */
  customMuscles?: string;
}

// ─── Couleurs ────────────────────────────────
const C_PRIMARY = '#EF4444';
const C_SECONDARY = '#F97316';

// ─── Mapping sport → muscles ─────────────────
const SPORT_MUSCLES: Record<string, { primary: MuscleId[]; secondary: MuscleId[] }> = {
  // Combat grappling
  jjb:         { primary: ['dorsaux', 'avant_bras', 'biceps', 'fessiers', 'ischio_jambiers'], secondary: ['trapeze', 'lombaires', 'obliques', 'quadriceps'] },
  judo:        { primary: ['trapeze', 'dorsaux', 'biceps', 'avant_bras', 'fessiers'], secondary: ['lombaires', 'obliques', 'quadriceps', 'ischio_jambiers'] },
  wrestling:   { primary: ['dorsaux', 'biceps', 'fessiers', 'quadriceps', 'ischio_jambiers'], secondary: ['pectoraux', 'lombaires', 'avant_bras', 'mollets'] },
  lutte:       { primary: ['dorsaux', 'biceps', 'fessiers', 'quadriceps', 'ischio_jambiers'], secondary: ['pectoraux', 'lombaires', 'avant_bras', 'mollets'] },
  sambo:       { primary: ['dorsaux', 'biceps', 'avant_bras', 'fessiers', 'ischio_jambiers'], secondary: ['trapeze', 'lombaires', 'obliques', 'quadriceps'] },
  // Combat striking
  mma:         { primary: ['pectoraux', 'deltoide_ant', 'biceps', 'triceps', 'quadriceps'], secondary: ['obliques', 'abdominaux', 'lombaires', 'mollets'] },
  boxe:        { primary: ['pectoraux', 'deltoide_ant', 'biceps', 'triceps', 'avant_bras'], secondary: ['obliques', 'abdominaux', 'flechisseurs', 'mollets'] },
  muay_thai:   { primary: ['pectoraux', 'deltoide_ant', 'biceps', 'quadriceps', 'mollets'], secondary: ['obliques', 'fessiers', 'ischio_jambiers', 'tibialis'] },
  karate:      { primary: ['pectoraux', 'triceps', 'quadriceps', 'fessiers', 'mollets'], secondary: ['obliques', 'abdominaux', 'ischio_jambiers', 'tibialis'] },
  taekwondo:   { primary: ['quadriceps', 'fessiers', 'ischio_jambiers', 'mollets', 'tibialis'], secondary: ['obliques', 'abdominaux', 'lombaires', 'deltoide_ant'] },
  krav_maga:   { primary: ['pectoraux', 'biceps', 'triceps', 'quadriceps', 'fessiers'], secondary: ['obliques', 'abdominaux', 'dorsaux', 'mollets'] },
  kickboxing:  { primary: ['pectoraux', 'deltoide_ant', 'quadriceps', 'mollets', 'fessiers'], secondary: ['biceps', 'triceps', 'obliques', 'tibialis'] },
  // Cardio
  running:     { primary: ['quadriceps', 'ischio_jambiers', 'mollets', 'fessiers'], secondary: ['tibialis', 'lombaires', 'abdominaux', 'avant_bras'] },
  trail:       { primary: ['quadriceps', 'ischio_jambiers', 'mollets', 'fessiers'], secondary: ['tibialis', 'lombaires', 'abdominaux', 'flechisseurs'] },
  marche_nordique: { primary: ['quadriceps', 'mollets', 'dorsaux', 'triceps'], secondary: ['fessiers', 'lombaires', 'deltoide_post', 'avant_bras'] },
  randonnee:   { primary: ['quadriceps', 'ischio_jambiers', 'fessiers', 'mollets'], secondary: ['tibialis', 'lombaires', 'abdominaux'] },
  cycling:     { primary: ['quadriceps', 'fessiers', 'mollets', 'ischio_jambiers'], secondary: ['dorsaux', 'avant_bras', 'abdominaux', 'tibialis'] },
  velo:        { primary: ['quadriceps', 'fessiers', 'mollets', 'ischio_jambiers'], secondary: ['dorsaux', 'avant_bras', 'abdominaux', 'tibialis'] },
  velo_route:  { primary: ['quadriceps', 'fessiers', 'mollets', 'ischio_jambiers'], secondary: ['dorsaux', 'avant_bras', 'abdominaux', 'tibialis'] },
  spinning:    { primary: ['quadriceps', 'fessiers', 'mollets', 'ischio_jambiers'], secondary: ['abdominaux', 'lombaires'] },
  // Aquatique
  natation:    { primary: ['dorsaux', 'pectoraux', 'deltoide_ant', 'deltoide_post', 'biceps'], secondary: ['triceps', 'avant_bras', 'lombaires', 'abdominaux', 'fessiers'] },
  swimming:    { primary: ['dorsaux', 'pectoraux', 'deltoide_ant', 'deltoide_post', 'biceps'], secondary: ['triceps', 'avant_bras', 'lombaires', 'abdominaux', 'fessiers'] },
  waterpolo:   { primary: ['dorsaux', 'pectoraux', 'deltoide_ant', 'quadriceps', 'fessiers'], secondary: ['biceps', 'triceps', 'lombaires', 'mollets'] },
  triathlon:   { primary: ['quadriceps', 'dorsaux', 'mollets', 'pectoraux', 'fessiers'], secondary: ['ischio_jambiers', 'biceps', 'abdominaux', 'lombaires'] },
  // Fitness
  musculation: { primary: ['pectoraux', 'dorsaux', 'biceps', 'triceps', 'quadriceps'], secondary: ['deltoide_ant', 'trapeze', 'abdominaux', 'fessiers', 'avant_bras'] },
  crossfit:    { primary: ['pectoraux', 'dorsaux', 'quadriceps', 'fessiers', 'triceps'], secondary: ['biceps', 'trapeze', 'abdominaux', 'mollets', 'avant_bras'] },
  hyrox:       { primary: ['quadriceps', 'fessiers', 'ischio_jambiers', 'dorsaux', 'triceps'], secondary: ['pectoraux', 'abdominaux', 'mollets', 'avant_bras'] },
  calisthenics:{ primary: ['pectoraux', 'dorsaux', 'biceps', 'triceps', 'abdominaux'], secondary: ['deltoide_ant', 'trapeze', 'avant_bras', 'obliques'] },
  hiit:        { primary: ['quadriceps', 'fessiers', 'pectoraux', 'abdominaux', 'dorsaux'], secondary: ['mollets', 'ischio_jambiers', 'deltoide_ant', 'triceps'] },
  yoga:        { primary: ['abdominaux', 'lombaires', 'fessiers', 'obliques'], secondary: ['quadriceps', 'dorsaux', 'ischio_jambiers', 'avant_bras'] },
  pilates:     { primary: ['abdominaux', 'lombaires', 'obliques', 'fessiers'], secondary: ['quadriceps', 'ischio_jambiers', 'dorsaux', 'flechisseurs'] },
  stretching:  { primary: ['obliques', 'lombaires', 'ischio_jambiers', 'quadriceps'], secondary: ['fessiers', 'mollets', 'dorsaux', 'biceps'] },
  // Collectif
  football:    { primary: ['quadriceps', 'ischio_jambiers', 'mollets', 'fessiers'], secondary: ['tibialis', 'abdominaux', 'lombaires', 'flechisseurs'] },
  basketball:  { primary: ['quadriceps', 'fessiers', 'mollets', 'ischio_jambiers'], secondary: ['deltoide_ant', 'avant_bras', 'abdominaux', 'tibialis'] },
  handball:    { primary: ['pectoraux', 'deltoide_ant', 'triceps', 'quadriceps', 'fessiers'], secondary: ['biceps', 'avant_bras', 'mollets', 'abdominaux'] },
  rugby:       { primary: ['quadriceps', 'fessiers', 'dorsaux', 'pectoraux', 'biceps'], secondary: ['ischio_jambiers', 'mollets', 'trapeze', 'lombaires'] },
  volleyball:  { primary: ['deltoide_ant', 'triceps', 'quadriceps', 'mollets', 'fessiers'], secondary: ['pectoraux', 'abdominaux', 'ischio_jambiers', 'tibialis'] },
  foot_americain: { primary: ['quadriceps', 'fessiers', 'pectoraux', 'dorsaux', 'triceps'], secondary: ['mollets', 'ischio_jambiers', 'biceps', 'lombaires'] },
  baseball:    { primary: ['deltoide_ant', 'avant_bras', 'pectoraux', 'obliques', 'quadriceps'], secondary: ['biceps', 'lombaires', 'fessiers', 'mollets'] },
  // Raquettes
  tennis:      { primary: ['avant_bras', 'biceps', 'deltoide_ant', 'quadriceps', 'fessiers'], secondary: ['obliques', 'mollets', 'pectoraux', 'dorsaux'] },
  padel:       { primary: ['avant_bras', 'biceps', 'deltoide_ant', 'quadriceps', 'fessiers'], secondary: ['obliques', 'mollets', 'pectoraux', 'abdominaux'] },
  badminton:   { primary: ['avant_bras', 'deltoide_ant', 'quadriceps', 'mollets', 'fessiers'], secondary: ['biceps', 'obliques', 'tibialis', 'abdominaux'] },
  squash:      { primary: ['avant_bras', 'biceps', 'quadriceps', 'mollets', 'obliques'], secondary: ['deltoide_ant', 'pectoraux', 'ischio_jambiers', 'abdominaux'] },
  tennis_de_table: { primary: ['avant_bras', 'deltoide_ant', 'obliques', 'flechisseurs'], secondary: ['biceps', 'abdominaux', 'quadriceps', 'mollets'] },
  // Glisse
  ski:         { primary: ['quadriceps', 'fessiers', 'ischio_jambiers', 'tibialis'], secondary: ['lombaires', 'obliques', 'avant_bras', 'mollets'] },
  snowboard:   { primary: ['quadriceps', 'fessiers', 'ischio_jambiers', 'obliques'], secondary: ['lombaires', 'avant_bras', 'mollets', 'tibialis'] },
  skateboard:  { primary: ['quadriceps', 'mollets', 'fessiers', 'obliques'], secondary: ['tibialis', 'ischio_jambiers', 'abdominaux', 'avant_bras'] },
  surf:        { primary: ['pectoraux', 'dorsaux', 'deltoide_ant', 'quadriceps', 'fessiers'], secondary: ['biceps', 'obliques', 'lombaires', 'mollets'] },
  // Escalade
  escalade:    { primary: ['dorsaux', 'biceps', 'avant_bras', 'pectoraux', 'fessiers'], secondary: ['trapeze', 'triceps', 'abdominaux', 'quadriceps'] },
  // Aviron / Rameur
  aviron:      { primary: ['dorsaux', 'biceps', 'trapeze', 'ischio_jambiers', 'lombaires'], secondary: ['fessiers', 'deltoide_post', 'avant_bras', 'quadriceps'] },
  rameur:      { primary: ['dorsaux', 'biceps', 'trapeze', 'ischio_jambiers', 'lombaires'], secondary: ['fessiers', 'deltoide_post', 'avant_bras', 'quadriceps'] },
  // Danse
  danse:       { primary: ['quadriceps', 'mollets', 'fessiers', 'ischio_jambiers'], secondary: ['abdominaux', 'dorsaux', 'obliques', 'tibialis'] },
  // Golf
  golf:        { primary: ['obliques', 'dorsaux', 'avant_bras', 'lombaires'], secondary: ['pectoraux', 'deltoide_ant', 'biceps', 'quadriceps'] },
};

function getMuscles(sport: string): { primary: Set<MuscleId>; secondary: Set<MuscleId> } {
  const entry = SPORT_MUSCLES[sport] || SPORT_MUSCLES['musculation'];
  return { primary: new Set(entry.primary), secondary: new Set(entry.secondary) };
}

function muscleColor(id: MuscleId, muscles: { primary: Set<MuscleId>; secondary: Set<MuscleId> }, isDark: boolean): string {
  if (muscles.primary.has(id)) return C_PRIMARY;
  if (muscles.secondary.has(id)) return C_SECONDARY;
  return isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
}

function muscleOpacity(id: MuscleId, muscles: { primary: Set<MuscleId>; secondary: Set<MuscleId> }): number {
  if (muscles.primary.has(id)) return 0.85;
  if (muscles.secondary.has(id)) return 0.7;
  return 1;
}

// ─── SVG Body Component ───────────────────────
// viewBox "0 0 90 165"
const BodyView: React.FC<{
  side: 'front' | 'back';
  muscles: { primary: Set<MuscleId>; secondary: Set<MuscleId> };
  isDark: boolean;
  bodyBg: string;
}> = ({ side, muscles, isDark, bodyBg }) => {
  const mc = (id: MuscleId) => muscleColor(id, muscles, isDark);
  const mo = (id: MuscleId) => muscleOpacity(id, muscles);

  return (
    <Svg width={90} height={165} viewBox="0 0 90 165">
      {/* ── Body silhouette (background) ── */}
      {/* Head */}
      <Circle cx={45} cy={11} r={9} fill={bodyBg} />
      {/* Neck */}
      <Rect x={41} y={19} width={8} height={6} rx={3} fill={bodyBg} />
      {/* Shoulders */}
      <Ellipse cx={45} cy={26} rx={24} ry={5} fill={bodyBg} />
      {/* Left upper arm */}
      <Rect x={13} y={24} width={12} height={28} rx={5} fill={bodyBg} />
      {/* Right upper arm */}
      <Rect x={65} y={24} width={12} height={28} rx={5} fill={bodyBg} />
      {/* Left forearm */}
      <Rect x={11} y={53} width={10} height={22} rx={4} fill={bodyBg} />
      {/* Right forearm */}
      <Rect x={69} y={53} width={10} height={22} rx={4} fill={bodyBg} />
      {/* Torso */}
      <Rect x={28} y={24} width={34} height={46} rx={4} fill={bodyBg} />
      {/* Hips */}
      <Ellipse cx={45} cy={70} rx={20} ry={7} fill={bodyBg} />
      {/* Left thigh */}
      <Rect x={26} y={75} width={17} height={34} rx={6} fill={bodyBg} />
      {/* Right thigh */}
      <Rect x={47} y={75} width={17} height={34} rx={6} fill={bodyBg} />
      {/* Left shin */}
      <Rect x={26} y={110} width={15} height={32} rx={5} fill={bodyBg} />
      {/* Right shin */}
      <Rect x={49} y={110} width={15} height={32} rx={5} fill={bodyBg} />
      {/* Left foot */}
      <Ellipse cx={33} cy={145} rx={8} ry={4} fill={bodyBg} />
      {/* Right foot */}
      <Ellipse cx={57} cy={145} rx={8} ry={4} fill={bodyBg} />

      {side === 'front' ? (
        <>
          {/* ── FRONT muscles ── */}
          {/* Trapèzes (front/top) */}
          <Ellipse cx={31} cy={27} rx={7} ry={4} fill={mc('trapeze')} opacity={mo('trapeze')} />
          <Ellipse cx={59} cy={27} rx={7} ry={4} fill={mc('trapeze')} opacity={mo('trapeze')} />
          {/* Deltoïdes antérieurs */}
          <Ellipse cx={17} cy={33} rx={7} ry={8} fill={mc('deltoide_ant')} opacity={mo('deltoide_ant')} />
          <Ellipse cx={73} cy={33} rx={7} ry={8} fill={mc('deltoide_ant')} opacity={mo('deltoide_ant')} />
          {/* Pectoraux */}
          <Ellipse cx={45} cy={38} rx={14} ry={9} fill={mc('pectoraux')} opacity={mo('pectoraux')} />
          {/* Biceps */}
          <Ellipse cx={16} cy={40} rx={5} ry={9} fill={mc('biceps')} opacity={mo('biceps')} />
          <Ellipse cx={74} cy={40} rx={5} ry={9} fill={mc('biceps')} opacity={mo('biceps')} />
          {/* Avant-bras */}
          <Ellipse cx={14} cy={60} rx={4} ry={9} fill={mc('avant_bras')} opacity={mo('avant_bras')} />
          <Ellipse cx={76} cy={60} rx={4} ry={9} fill={mc('avant_bras')} opacity={mo('avant_bras')} />
          {/* Abdominaux */}
          <Rect x={34} y={47} width={22} height={19} rx={4} fill={mc('abdominaux')} opacity={mo('abdominaux')} />
          {/* Obliques */}
          <Ellipse cx={27} cy={54} rx={5} ry={10} fill={mc('obliques')} opacity={mo('obliques')} />
          <Ellipse cx={63} cy={54} rx={5} ry={10} fill={mc('obliques')} opacity={mo('obliques')} />
          {/* Fléchisseurs hanche */}
          <Ellipse cx={34} cy={74} rx={8} ry={5} fill={mc('flechisseurs')} opacity={mo('flechisseurs')} />
          <Ellipse cx={56} cy={74} rx={8} ry={5} fill={mc('flechisseurs')} opacity={mo('flechisseurs')} />
          {/* Quadriceps */}
          <Ellipse cx={34} cy={93} rx={9} ry={15} fill={mc('quadriceps')} opacity={mo('quadriceps')} />
          <Ellipse cx={56} cy={93} rx={9} ry={15} fill={mc('quadriceps')} opacity={mo('quadriceps')} />
          {/* Tibialis */}
          <Ellipse cx={32} cy={124} rx={6} ry={12} fill={mc('tibialis')} opacity={mo('tibialis')} />
          <Ellipse cx={58} cy={124} rx={6} ry={12} fill={mc('tibialis')} opacity={mo('tibialis')} />
        </>
      ) : (
        <>
          {/* ── BACK muscles ── */}
          {/* Trapèzes */}
          <Ellipse cx={45} cy={30} rx={18} ry={7} fill={mc('trapeze')} opacity={mo('trapeze')} />
          {/* Deltoïdes postérieurs */}
          <Ellipse cx={17} cy={33} rx={7} ry={8} fill={mc('deltoide_post')} opacity={mo('deltoide_post')} />
          <Ellipse cx={73} cy={33} rx={7} ry={8} fill={mc('deltoide_post')} opacity={mo('deltoide_post')} />
          {/* Dorsaux (lats) */}
          <Ellipse cx={32} cy={47} rx={11} ry={14} fill={mc('dorsaux')} opacity={mo('dorsaux')} />
          <Ellipse cx={58} cy={47} rx={11} ry={14} fill={mc('dorsaux')} opacity={mo('dorsaux')} />
          {/* Triceps */}
          <Ellipse cx={16} cy={40} rx={5} ry={9} fill={mc('triceps')} opacity={mo('triceps')} />
          <Ellipse cx={74} cy={40} rx={5} ry={9} fill={mc('triceps')} opacity={mo('triceps')} />
          {/* Avant-bras (back) */}
          <Ellipse cx={14} cy={60} rx={4} ry={9} fill={mc('avant_bras')} opacity={mo('avant_bras')} />
          <Ellipse cx={76} cy={60} rx={4} ry={9} fill={mc('avant_bras')} opacity={mo('avant_bras')} />
          {/* Lombaires */}
          <Ellipse cx={45} cy={63} rx={12} ry={7} fill={mc('lombaires')} opacity={mo('lombaires')} />
          {/* Fessiers */}
          <Ellipse cx={34} cy={78} rx={11} ry={9} fill={mc('fessiers')} opacity={mo('fessiers')} />
          <Ellipse cx={56} cy={78} rx={11} ry={9} fill={mc('fessiers')} opacity={mo('fessiers')} />
          {/* Ischio-jambiers */}
          <Ellipse cx={34} cy={95} rx={9} ry={15} fill={mc('ischio_jambiers')} opacity={mo('ischio_jambiers')} />
          <Ellipse cx={56} cy={95} rx={9} ry={15} fill={mc('ischio_jambiers')} opacity={mo('ischio_jambiers')} />
          {/* Mollets */}
          <Ellipse cx={32} cy={124} rx={6} ry={12} fill={mc('mollets')} opacity={mo('mollets')} />
          <Ellipse cx={58} cy={124} rx={6} ry={12} fill={mc('mollets')} opacity={mo('mollets')} />
        </>
      )}
    </Svg>
  );
};

// ─── Labels ────────────────────────────────────
const FRONT_LABELS: Array<{ id: MuscleId; label: string }> = [
  { id: 'pectoraux',    label: 'Pectoraux' },
  { id: 'deltoide_ant', label: 'Épaules' },
  { id: 'biceps',       label: 'Biceps' },
  { id: 'avant_bras',   label: 'Avant-bras' },
  { id: 'abdominaux',   label: 'Abdominaux' },
  { id: 'obliques',     label: 'Obliques' },
  { id: 'quadriceps',   label: 'Quadriceps' },
  { id: 'tibialis',     label: 'Tibialis' },
];
const BACK_LABELS: Array<{ id: MuscleId; label: string }> = [
  { id: 'trapeze',         label: 'Trapèzes' },
  { id: 'dorsaux',         label: 'Dorsaux' },
  { id: 'deltoide_post',   label: 'Épaules arr.' },
  { id: 'triceps',         label: 'Triceps' },
  { id: 'lombaires',       label: 'Lombaires' },
  { id: 'fessiers',        label: 'Fessiers' },
  { id: 'ischio_jambiers', label: 'Ischio-jamb.' },
  { id: 'mollets',         label: 'Mollets' },
];

// ─── Main Component ───────────────────────────
export const MuscleMapCard: React.FC<MuscleMapCardProps> = ({ sport, sportName, sportColor, customMuscles }) => {
  const { colors, isDark } = useTheme();
  const muscles = useMemo(() => {
    // Si des muscles spécifiques ont été saisis, on les utilise en priorité
    if (customMuscles && customMuscles.trim().length > 0) {
      const ids = customMuscles.split(',').map(s => s.trim()).filter(Boolean) as MuscleId[];
      return {
        primary: new Set(ids),
        secondary: new Set<MuscleId>(),
      };
    }
    return getMuscles(sport);
  }, [sport, customMuscles]);

  const bodyBg = isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.09)';
  const cardBg = isDark ? colors.backgroundCard : '#FFFFFF';

  const activeFront = FRONT_LABELS.filter(({ id }) => muscles.primary.has(id) || muscles.secondary.has(id));
  const activeBack  = BACK_LABELS.filter(({ id })  => muscles.primary.has(id) || muscles.secondary.has(id));
  const totalPrimary = muscles.primary.size;
  const totalSecondary = muscles.secondary.size;

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Muscles travaillés</Text>
        <View style={styles.counters}>
          <View style={[styles.badge, { backgroundColor: C_PRIMARY + '20' }]}>
            <View style={[styles.dot, { backgroundColor: C_PRIMARY }]} />
            <Text style={[styles.badgeText, { color: C_PRIMARY }]}>{totalPrimary} principaux</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: C_SECONDARY + '20' }]}>
            <View style={[styles.dot, { backgroundColor: C_SECONDARY }]} />
            <Text style={[styles.badgeText, { color: C_SECONDARY }]}>{totalSecondary} secondaires</Text>
          </View>
        </View>
      </View>

      {/* Body diagram */}
      <View style={styles.bodiesRow}>
        <View style={styles.bodyPanel}>
          <BodyView side="front" muscles={muscles} isDark={isDark} bodyBg={bodyBg} />
          <Text style={[styles.viewLabel, { color: colors.textMuted }]}>Avant</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
        <View style={styles.bodyPanel}>
          <BodyView side="back" muscles={muscles} isDark={isDark} bodyBg={bodyBg} />
          <Text style={[styles.viewLabel, { color: colors.textMuted }]}>Arrière</Text>
        </View>
      </View>

      {/* Légende muscles actifs */}
      {(activeFront.length > 0 || activeBack.length > 0) && (
        <View style={[styles.legend, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
          {[...activeFront, ...activeBack]
            .filter((item, idx, arr) => arr.findIndex(i => i.id === item.id) === idx)
            .map(({ id, label }) => {
              const isPrimary = muscles.primary.has(id);
              const color = isPrimary ? C_PRIMARY : C_SECONDARY;
              return (
                <View key={id} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text>
                </View>
              );
            })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  counters: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bodiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bodyPanel: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  divider: {
    width: 1,
    height: 165,
    alignSelf: 'center',
    marginHorizontal: 8,
  },
  viewLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'transparent',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
