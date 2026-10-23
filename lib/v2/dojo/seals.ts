/**
 * Les 41 sceaux de la Voie de l'Armure, en 5 familles, et la Lune du mois (repetable).
 * Chaque sceau donne 25 XP une seule fois, la Lune du mois 25 XP chaque mois tenu.
 * Aucun sceau n'est lie a un nombre de kilos.
 * Le calcul se fait sur un contexte deja agrege (voir lib/v2/armure.ts).
 */

import { traduire } from '@/lib/i18n/tr';
export type SealFamily = 'regularite' | 'force' | 'combat' | 'souffle' | 'decouverte';

export type SealContext = {
  heldWeeks: number;
  bestStreak: number;
  bridge: boolean;
  weighDays: number;
  rankIndex: number;
  muscuSessions: number;
  records: number;
  plateauRecords: number;
  tonnes: number;
  strikingSessions: number;
  grapplingSessions: number;
  combatSessions: number;
  rounds: number;
  competitions: number;
  partners: number;
  matHours: number;
  profileComplete: boolean;
  sportsCount: number;
  runs: number;
  /** kilometres de course cumules (champ distance des seances de course) */
  runKm: number;
  yogaSessions: number;
  moduleOn: boolean;
  programs: number;
  photos: number;
  measurements: number;
};

export type SealDef = {
  id: string;
  family: SealFamily;
  name: string;
  kanji: string;
  condition: string;
  /** valeur actuelle et cible, pour afficher la progression */
  metric: (c: SealContext) => [number, number];
};

export const SEAL_FAMILIES: { id: SealFamily; name: string; color: string; ink: string; description: string }[] = [
  { id: 'regularite', name: traduire('Régularité'), color: '#2C4A84', ink: '#2C4A84', description: traduire('Tenir tes semaines, revenir après une pause') },
  { id: 'force', name: 'Force', color: '#8C6A3F', ink: '#8C6A3F', description: traduire('Tes records et le poids que tu soulèves') },
  { id: 'combat', name: traduire('Combat'), color: '#C59D45', ink: '#1D2029', description: traduire('Rounds, partenaires et heures sur le tapis') },
  { id: 'souffle', name: 'Souffle', color: '#3F7480', ink: '#2F5A64', description: traduire('Course, yoga et mobilité') },
  { id: 'decouverte', name: 'Découverte', color: '#6E8C3A', ink: '#4F6B28', description: traduire('Explorer YOROI et de nouveaux sports') },
];

const b = (v: boolean): [number, number] => [v ? 1 : 0, 1];

export const SEALS: SealDef[] = [
  // Regularite (indigo)
  { id: 'flamme', family: 'regularite', name: 'Flamme', kanji: '炎', condition: traduire('Ta première semaine réussie'), metric: (c) => [c.heldWeeks, 1] },
  { id: 'bambou', family: 'regularite', name: 'Bambou', kanji: '竹', condition: traduire('4 semaines réussies d’affilée'), metric: (c) => [c.bestStreak, 4] },
  { id: 'lune_soleil', family: 'regularite', name: 'Lune et soleil', kanji: '明', condition: traduire('12 semaines réussies d’affilée'), metric: (c) => [c.bestStreak, 12] },
  { id: 'sablier', family: 'regularite', name: 'Sablier', kanji: '時', condition: traduire('26 semaines réussies d’affilée'), metric: (c) => [c.bestStreak, 26] },
  { id: 'lanterne', family: 'regularite', name: 'Lanterne', kanji: '灯', condition: traduire('52 semaines réussies d’affilée'), metric: (c) => [c.bestStreak, 52] },
  { id: 'pont', family: 'regularite', name: 'Pont', kanji: '橋', condition: traduire('Une semaine réussie juste après une pause'), metric: (c) => b(c.bridge) },
  { id: 'sentier', family: 'regularite', name: 'Sentier', kanji: '道', condition: traduire('30 jours de pesée'), metric: (c) => [c.weighDays, 30] },
  { id: 'cerisier', family: 'regularite', name: 'Cerisier', kanji: '桜', condition: traduire('100 jours de pesée'), metric: (c) => [c.weighDays, 100] },
  { id: 'fuji', family: 'regularite', name: 'Mont Fuji', kanji: '富', condition: traduire('Atteindre le rang Shōgun'), metric: (c) => [c.rankIndex, 4] },
  // Force (indigo)
  { id: 'haltere', family: 'force', name: 'Haltère', kanji: '鉄', condition: traduire('Ta première séance de musculation'), metric: (c) => [c.muscuSessions, 1] },
  { id: 'kettlebell', family: 'force', name: 'Kettlebell', kanji: '鈴', condition: traduire('10 séances de musculation'), metric: (c) => [c.muscuSessions, 10] },
  { id: 'barre', family: 'force', name: 'Barre', kanji: '棒', condition: traduire('Ton premier record personnel'), metric: (c) => [c.records, 1] },
  { id: 'poing', family: 'force', name: 'Poing', kanji: '拳', condition: '10 records personnels', metric: (c) => [c.records, 10] },
  { id: 'rocher', family: 'force', name: 'Rocher', kanji: '岩', condition: '25 records personnels', metric: (c) => [c.records, 25] },
  { id: 'chaine', family: 'force', name: 'Chaîne brisée', kanji: '破', condition: traduire('Un record sur un exercice qui stagnait depuis 3 mois'), metric: (c) => [c.plateauRecords, 1] },
  { id: 'enclume', family: 'force', name: 'Enclume', kanji: '鍛', condition: traduire('50 tonnes soulevées au total'), metric: (c) => [Math.floor(c.tonnes), 50] },
  { id: 'bras', family: 'force', name: 'Bras', kanji: '腕', condition: traduire('250 tonnes soulevées au total'), metric: (c) => [Math.floor(c.tonnes), 250] },
  { id: 'marteau', family: 'force', name: 'Marteau', kanji: '槌', condition: traduire('1 000 tonnes soulevées au total'), metric: (c) => [Math.floor(c.tonnes), 1000] },
  // Combat (noir et or)
  { id: 'gants', family: 'combat', name: 'Gants', kanji: '打', condition: traduire('Ta première séance de sport de frappe'), metric: (c) => [c.strikingSessions, 1] },
  { id: 'ceinture_nouee', family: 'combat', name: 'Ceinture nouée', kanji: '帯', condition: traduire('Ta première séance de grappling'), metric: (c) => [c.grapplingSessions, 1] },
  { id: 'kimono', family: 'combat', name: 'Kimono', kanji: '衣', condition: traduire('25 séances de combat'), metric: (c) => [c.combatSessions, 25] },
  { id: 'katanas', family: 'combat', name: 'Katanas', kanji: '刀', condition: '100 rounds', metric: (c) => [c.rounds, 100] },
  { id: 'kabuto', family: 'combat', name: 'Kabuto', kanji: '兜', condition: '500 rounds', metric: (c) => [c.rounds, 500] },
  { id: 'oni', family: 'combat', name: 'Masque d’oni', kanji: '鬼', condition: traduire('Ta première compétition enregistrée'), metric: (c) => [c.competitions, 1] },
  { id: 'eventail', family: 'combat', name: 'Éventail', kanji: '扇', condition: traduire('10 partenaires différents'), metric: (c) => [c.partners, 10] },
  { id: 'bandes', family: 'combat', name: 'Bandes', kanji: '巻', condition: traduire('50 heures sur le tapis'), metric: (c) => [Math.floor(c.matHours), 50] },
  { id: 'gong', family: 'combat', name: 'Gong', kanji: '鐘', condition: traduire('200 heures sur le tapis'), metric: (c) => [Math.floor(c.matHours), 200] },
  // Souffle (course, yoga et mobilite)
  { id: 'chaussure', family: 'souffle', name: 'Chaussure', kanji: '走', condition: traduire('Ta première course'), metric: (c) => [c.runs, 1] },
  { id: 'foulee', family: 'souffle', name: 'Foulée', kanji: '歩', condition: traduire('10 sorties de course'), metric: (c) => [c.runs, 10] },
  { id: 'riviere', family: 'souffle', name: traduire('Rivière'), kanji: '川', condition: traduire('100 kilomètres de course au total'), metric: (c) => [Math.floor(c.runKm), 100] },
  { id: 'montagne', family: 'souffle', name: 'Montagne', kanji: '山', condition: traduire('500 kilomètres de course au total'), metric: (c) => [Math.floor(c.runKm), 500] },
  { id: 'tapis', family: 'souffle', name: 'Tapis', kanji: '柔', condition: traduire('Ta première séance de yoga ou de mobilité'), metric: (c) => [c.yogaSessions, 1] },
  { id: 'lotus', family: 'souffle', name: 'Lotus', kanji: '蓮', condition: traduire('10 séances de yoga ou de mobilité'), metric: (c) => [c.yogaSessions, 10] },
  { id: 'souffle_long', family: 'souffle', name: 'Souffle long', kanji: '息', condition: traduire('50 séances de yoga ou de mobilité'), metric: (c) => [c.yogaSessions, 50] },
  // Decouverte (matcha)
  { id: 'boussole', family: 'decouverte', name: 'Boussole', kanji: '針', condition: traduire('Ton profil complété'), metric: (c) => b(c.profileComplete) },
  { id: 'carte', family: 'decouverte', name: 'Carte', kanji: '図', condition: traduire('3 sports différents pratiqués'), metric: (c) => [c.sportsCount, 3] },
  { id: 'torii', family: 'decouverte', name: 'Torii', kanji: '門', condition: traduire('Un module activé : mode compétiteur ou planning'), metric: (c) => b(c.moduleOn) },
  { id: 'lanterne_papier', family: 'decouverte', name: traduire('Lanterne de papier'), kanji: '計', condition: traduire('Ton premier programme créé'), metric: (c) => [c.programs, 1] },
  { id: 'appareil_photo', family: 'decouverte', name: 'Appareil photo', kanji: '写', condition: traduire('Ta première photo de progression'), metric: (c) => [c.photos, 1] },
  { id: 'metre_ruban', family: 'decouverte', name: 'Mètre ruban', kanji: '測', condition: traduire('Tes premières mensurations'), metric: (c) => [c.measurements, 1] },
  { id: 'balance', family: 'decouverte', name: 'Balance', kanji: '量', condition: traduire('Ta première pesée'), metric: (c) => [c.weighDays, 1] },
];

export const SEALS_TOTAL = SEALS.length;

/** Sceau repetable : gagne chaque mois ou tu tiens au moins 3 semaines (semaines dont le lundi tombe dans le mois). */
export const LUNE = {
  id: 'lune',
  name: 'Lune du mois',
  kanji: '月',
  condition: 'Au moins 3 semaines réussies dans le même mois',
  weeks: 3,
} as const;

export function sealById(id: string): SealDef | undefined {
  return SEALS.find((s) => s.id === id);
}

export function familyOf(f: SealFamily) {
  return SEAL_FAMILIES.find((x) => x.id === f) ?? SEAL_FAMILIES[0];
}

export function sealDone(def: SealDef, c: SealContext): boolean {
  const [cur, target] = def.metric(c);
  return cur >= target;
}
