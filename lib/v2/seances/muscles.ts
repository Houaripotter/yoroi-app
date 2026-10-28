/**
 * Muscles travailles d'une seance (meme stockage que l'ancien composant : liste d'ids
 * separes par des virgules dans training.muscles), regroupes en 6 zones pour la silhouette v2.
 */
import type { MuscleName } from '@/lib/v2/progres/strength';
import { traduire } from '@/lib/i18n/tr';

export type MuscleId =
  | 'pectoraux' | 'deltoide_ant' | 'biceps' | 'avant_bras' | 'abdominaux'
  | 'obliques' | 'quadriceps' | 'tibialis' | 'flechisseurs'
  | 'trapeze' | 'dorsaux' | 'deltoide_post' | 'triceps' | 'lombaires'
  | 'fessiers' | 'ischio_jambiers' | 'mollets';

export const ALL_MUSCLES: { id: MuscleId; label: string; group: MuscleName }[] = [
  { id: 'pectoraux', label: 'Pectoraux', group: 'Pectoraux' },
  { id: 'deltoide_ant', label: 'Épaules', group: 'Épaules' },
  { id: 'deltoide_post', label: traduire('Arrière d’épaules'), group: 'Épaules' },
  { id: 'trapeze', label: traduire('Trapèzes'), group: 'Dos' },
  { id: 'dorsaux', label: traduire('Dorsaux'), group: 'Dos' },
  { id: 'lombaires', label: traduire('Lombaires'), group: 'Dos' },
  { id: 'biceps', label: 'Biceps', group: 'Bras' },
  { id: 'triceps', label: 'Triceps', group: 'Bras' },
  { id: 'avant_bras', label: 'Avant bras', group: 'Bras' },
  { id: 'abdominaux', label: traduire('Abdominaux'), group: 'Abdos' },
  { id: 'obliques', label: traduire('Obliques'), group: 'Abdos' },
  { id: 'quadriceps', label: traduire('Quadriceps'), group: 'Jambes' },
  { id: 'ischio_jambiers', label: 'Ischio jambiers', group: 'Jambes' },
  { id: 'fessiers', label: 'Fessiers', group: 'Jambes' },
  { id: 'mollets', label: 'Mollets', group: 'Jambes' },
  { id: 'tibialis', label: traduire('Tibias'), group: 'Jambes' },
  { id: 'flechisseurs', label: traduire('Fléchisseurs de hanche'), group: 'Jambes' },
];

export const SPORT_MUSCLES: Record<string, { primary: MuscleId[]; secondary: MuscleId[] }> = {
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

/** Muscles de la seance : ceux notes, sinon ceux du sport */
export function musclesOf(sport: string, custom?: string | null): Set<MuscleId> {
  if (custom && custom.trim()) {
    const ids = new Set(ALL_MUSCLES.map((m) => m.id));
    return new Set(custom.split(',').map((s) => s.trim()).filter((s): s is MuscleId => ids.has(s as MuscleId)));
  }
  const id = (sport || '').split(',')[0].trim();
  const entry = SPORT_MUSCLES[id] || SPORT_MUSCLES['musculation'];
  return new Set([...entry.primary, ...entry.secondary]);
}

/** Nombre de muscles choisis par zone de la silhouette */
export function groupCounts(selected: Set<MuscleId>): Record<MuscleName, number> {
  const out = { Pectoraux: 0, Dos: 0, 'Épaules': 0, Bras: 0, Jambes: 0, Abdos: 0 } as Record<MuscleName, number>;
  for (const m of ALL_MUSCLES) if (selected.has(m.id)) out[m.group] += 1;
  return out;
}
