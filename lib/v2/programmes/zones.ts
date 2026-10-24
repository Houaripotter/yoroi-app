/**
 * « Je ne sais pas quoi faire » (24 octobre 2026) : tu touches les zones que tu veux travailler sur le corps
 * (fessiers, abdos, bras...), YOROI te donne ta séance du jour, exercice par exercice, avec ce que chacun
 * travaille. Pensé pour ceux qui arrivent à la salle sans savoir par où commencer.
 * Choix pratiques pour débutants : 3 séries par exercice, de 10 à 15 répétitions en général (12 à 20 sur les
 * machines d'isolation comme les mollets et les abducteurs, 6 à 15 pompes, le gainage en secondes), une charge
 * légère pour apprendre le geste ; exercices simples, surtout machines et haltères, remplacés tout seuls selon
 * ton matériel et tes douleurs (materiel.ts, blessures.ts).
 * Données pures, testées dans __tests__/unit/zones.test.ts.
 */
import type { ExoProgramme } from './types';

export type ZoneId = 'epaules' | 'pectoraux' | 'bras' | 'avantbras' | 'abdos' | 'dos' | 'fessiers' | 'quadriceps' | 'ischios' | 'mollets';

export type Zone = {
  id: ZoneId;
  /** nom affiché */
  nom: string;
  /** à quoi ça sert, en une phrase simple */
  role: string;
  /** muscles de lib/sports.ts MUSCLES pour la carte des muscles */
  muscles: string[];
  /** du plus simple au plus exigeant ; les premiers sont gardés quand tu choisis beaucoup de zones */
  exos: ExoProgramme[];
};

const e = (nom: string, muscle: string, repsMin: number, repsMax: number, conseil: string, opts: { secondes?: boolean; poidsDuCorps?: boolean } = {}): ExoProgramme => ({
  nom,
  muscle,
  series: 3,
  repsMin,
  repsMax,
  reposSec: 90,
  conseil,
  ...(opts.poidsDuCorps ? { poidsDuCorps: true } : {}),
  ...(opts.secondes ? { secondes: true } : {}),
});

export const ZONES: Zone[] = [
  {
    id: 'quadriceps',
    nom: 'Cuisses (avant)',
    role: 'L’avant des cuisses : monter les escaliers, se relever, sauter.',
    muscles: ['jambes'],
    exos: [
      e('Presse à Cuisses', 'JAMBES', 10, 15, 'La machine guide le geste : pieds à plat, pousse avec les talons, sans tendre les genoux à fond.'),
      e('Leg Extension', 'JAMBES', 10, 15, 'Monte les jambes tendues, redescends lentement en 2 à 3 secondes.'),
    ],
  },
  {
    id: 'fessiers',
    nom: 'Fessiers',
    role: 'Les fesses : galbe, posture, et un bassin plus stable.',
    muscles: ['fessiers'],
    exos: [
      e('Hip Thrust Machine', 'FESSIERS', 10, 15, 'Pousse avec les talons et serre les fesses une seconde en haut.'),
      e('Abducteurs Machine', 'FESSIERS', 12, 20, 'Écarte les jambes contre la machine, reviens lentement : le haut des fesses travaille.'),
    ],
  },
  {
    id: 'ischios',
    nom: 'Cuisses (arrière)',
    role: 'L’arrière des cuisses : souvent oublié, il équilibre l’avant de la cuisse et galbe la jambe.',
    muscles: ['jambes'],
    exos: [
      e('Leg Curl Assis', 'ISCHIOS', 10, 15, 'Plie les jambes contre le boudin, reviens lentement sans laisser tomber la charge.'),
      e('Romanian Deadlift (Haltères)', 'ISCHIOS', 10, 12, 'Dos droit, pousse les hanches en arrière jusqu’à sentir l’arrière des cuisses tirer.'),
    ],
  },
  {
    id: 'dos',
    nom: 'Dos',
    role: 'Le dos : une silhouette en V, des épaules droites et une meilleure posture.',
    muscles: ['dos'],
    exos: [
      e('Tirage Poitrine (Lat Pulldown)', 'DOS', 10, 12, 'Tire la barre vers le haut de la poitrine en pensant à descendre les coudes.'),
      e('Tirage Horizontal (Seated Row)', 'DOS', 10, 12, 'Tire vers le ventre, serre les omoplates, le buste ne bouge pas.'),
    ],
  },
  {
    id: 'pectoraux',
    nom: 'Pectoraux',
    role: 'La poitrine : pousser, se relever du sol, un buste plus ferme.',
    muscles: ['pectoraux'],
    exos: [
      e('Chest Press (Machine)', 'PECTORAUX', 10, 12, 'Pousse les poignées devant toi, reviens lentement jusqu’à sentir la poitrine s’étirer.'),
      e('Pompes (Poids du corps)', 'PECTORAUX', 6, 15, 'Trop dur ? Fais les genoux au sol. Le corps reste droit comme une planche.', { poidsDuCorps: true }),
    ],
  },
  {
    id: 'epaules',
    nom: 'Épaules',
    role: 'Les épaules : des bras qui se lèvent sans gêne et une carrure plus marquée.',
    muscles: ['epaules'],
    exos: [
      e('Développé Haltères Assis', 'ÉPAULES', 10, 12, 'Assis le dos calé, pousse les haltères au dessus de la tête sans cambrer.'),
      e('Élévations Latérales (Haltères)', 'ÉPAULES', 12, 15, 'Monte les bras sur les côtés jusqu’aux épaules, haltères légers, sans élan.'),
    ],
  },
  {
    id: 'bras',
    nom: 'Bras',
    role: 'Biceps devant, triceps derrière : des bras plus fermes et plus forts.',
    muscles: ['biceps', 'triceps'],
    exos: [
      e('Curl Haltères Alterné', 'BICEPS', 10, 12, 'Coudes collés au corps, monte l’haltère sans balancer le buste.'),
      e('Extension Triceps Poulie (Corde)', 'TRICEPS', 10, 15, 'Coudes fixes contre le corps, tends les bras vers le bas : l’arrière du bras travaille.'),
    ],
  },
  {
    // 24 octobre 2026, Houari : « il y a aussi les avant-bras, ne les oublie pas »
    id: 'avantbras',
    nom: 'Avant-bras',
    role: 'Les avant-bras : la poigne pour tenir les charges, porter, s’accrocher, saisir au combat.',
    muscles: ['avant_bras'],
    exos: [
      e('Farmer Walk', 'AVANT-BRAS', 30, 45, 'Tu marches en portant lourd : tes mains serrent fort pour ne rien lâcher, c’est ça qui muscle tes avant-bras. Bras tendus, épaules basses, petits pas.', { secondes: true }),
      e('Extension Poignets', 'AVANT-BRAS', 12, 20, 'Avant-bras posés sur les cuisses, monte le dos de la main en pliant seulement le poignet.'),
    ],
  },
  {
    id: 'mollets',
    nom: 'Mollets',
    role: 'Les mollets : marcher, courir, sauter, monter sur la pointe des pieds.',
    muscles: ['mollets'],
    exos: [e('Mollets Debout (Machine)', 'MOLLETS', 12, 20, 'Monte sur la pointe des pieds, tiens une seconde, descends le talon lentement.')],
  },
  {
    id: 'abdos',
    nom: 'Abdos',
    role: 'Le ventre : gainage, posture, un tronc plus solide. Pour voir les abdos, c’est surtout la perte de graisse.',
    muscles: ['abdos'],
    exos: [
      e('Gainage Planche', 'ABDOS', 20, 40, 'Sur les avant bras, le corps droit, le ventre rentré. Respire normalement.', { secondes: true, poidsDuCorps: true }),
      e('Dead Bug', 'ABDOS', 8, 12, 'Allongé, bas du dos collé au sol, descends un bras et la jambe opposée lentement.', { poidsDuCorps: true }),
    ],
  },
];

export const zoneParId = (id: string): Zone | undefined => ZONES.find((z) => z.id === id);

/**
 * La séance du jour pour les zones choisies : les gros muscles d'abord, les abdos à la fin (l'ordre de ZONES).
 * 1 ou 2 zones : tous leurs exercices ; 3 zones : 2 chacune ; au delà : 1 chacune, plus le 2e des premières
 * zones tant que la séance reste sous 7 exercices (environ 45 minutes avec 3 séries et 90 s de repos).
 */
export const MAX_EXOS_ZONES = 7;
export function seanceZones(ids: readonly string[]): ExoProgramme[] {
  const choisies = ZONES.filter((z) => ids.includes(z.id));
  if (!choisies.length) return [];
  const parZone = choisies.length <= 2 ? 3 : choisies.length === 3 ? 2 : 1;
  const out: ExoProgramme[][] = choisies.map((z) => z.exos.slice(0, parZone));
  let total = out.reduce((t, l) => t + l.length, 0);
  for (let i = 0; i < choisies.length && total < MAX_EXOS_ZONES; i++) {
    const deuxieme = choisies[i].exos[out[i].length];
    if (parZone === 1 && deuxieme) {
      out[i] = [...out[i], deuxieme];
      total++;
    }
  }
  return out.flat().slice(0, MAX_EXOS_ZONES);
}

/** Titre de la séance : « Fessiers, Abdos et Bras » */
export function titreZones(ids: readonly string[], noms: (nom: string) => string = (n) => n): string {
  const n = ZONES.filter((z) => ids.includes(z.id)).map((z) => noms(z.nom));
  if (n.length <= 1) return n[0] ?? '';
  return `${n.slice(0, -1).join(', ')} ${noms('et')} ${n[n.length - 1]}`;
}

/** Les zones choisies, lues depuis un paramètre de route « fessiers,abdos » (inconnues écartées) */
export function lireZones(param: string | undefined | null): ZoneId[] {
  if (!param) return [];
  const ok = new Set(ZONES.map((z) => z.id));
  return Array.from(new Set(param.split(',').map((s) => s.trim()).filter((s): s is ZoneId => ok.has(s as ZoneId))));
}
