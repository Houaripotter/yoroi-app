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
      // 25 octobre 2026 (Houari : « plein d'exercices avec les images ») : tous animés, conseil tiré de la fiche technique
      e('Fentes Avant (Haltères)', 'JAMBES', 8, 12, 'Descends jusqu’à ce que le genou arrière frôle le sol, buste droit.'),
      e('Split Squat', 'JAMBES', 8, 12, 'Un pied devant, un pied derrière, écartés d’un grand pas, les deux au sol.'),
      e('Squat Bulgare', 'JAMBES', 8, 12, 'Pied arrière sur un banc ou une chaise, pied avant un grand pas devant.'),
      e('Step Up (Haltères)', 'JAMBES', 8, 12, 'Pousse sur la jambe du dessus pour monter, sans t’aider du pied resté au sol.'),
      e('Presse à Cuisses (Pieds Hauts)', 'JAMBES', 10, 12, 'Pieds hauts sur la plateforme, largeur de hanches, dos collé au dossier.'),
      e('Hack Squat', 'JAMBES', 8, 12, 'Descends en pliant les genoux dans l’axe des pieds, jusqu’aux cuisses parallèles au plateau.'),
      e('Front Squat', 'JAMBES', 6, 10, 'Pieds largeur d’épaules, buste droit, descends entre les talons.'),
      e('Box Squat', 'JAMBES', 6, 10, 'Barre sur le haut du dos, une box basse derrière toi, pieds un peu plus larges que les épaules.'),
      e('Smith Machine Squat', 'JAMBES', 8, 12, 'Débloque la barre, puis descends jusqu’aux cuisses parallèles au sol, dos droit.'),
    ],
  },
  {
    id: 'fessiers',
    nom: 'Fessiers',
    role: 'Les fesses : galbe, posture, et un bassin plus stable.',
    muscles: ['fessiers'],
    exos: [
      e('Hip Thrust Machine', 'FESSIERS', 10, 15, 'Pousse avec les talons et serre les fesses une seconde en haut.'),
      e('Goblet Squat', 'JAMBES', 8, 12, 'Un haltère tenu contre la poitrine, descends le plus bas possible en gardant le dos droit : plus tu descends, plus les fessiers travaillent.'),
      // 25 octobre 2026 (Houari : « plein d'exercices avec les images ») : tous animés, conseil tiré de la fiche technique
      e('Hip Thrust Barre', 'FESSIERS', 8, 12, 'Monte les hanches jusqu’à aligner épaules, hanches et genoux, serre les fessiers.'),
      e('Fentes Bulgares', 'FESSIERS', 8, 12, 'Pied arrière posé sur un banc, pied avant un grand pas devant.'),
      e('Abducteurs Machine', 'FESSIERS', 12, 15, 'Assis, dos contre le dossier, coussins contre l’extérieur des genoux.'),
      e('Cable Kickback', 'FESSIERS', 12, 15, 'Sangle à la cheville, face à la poulie basse, mains sur le support.'),
      e('Single Leg Hip Thrust', 'FESSIERS', 8, 12, 'Haut du dos contre un banc, un pied au sol, l’autre jambe en l’air.', { poidsDuCorps: true }),
      e('Glute Bridge', 'FESSIERS', 12, 20, 'Serre les fessiers en haut une seconde, puis redescends lentement.', { poidsDuCorps: true }),
      e('Reverse Lunges', 'FESSIERS', 8, 12, 'Recule une jambe d’un grand pas et descends le genou arrière près du sol.', { poidsDuCorps: true }),
      e('Kick-back Poulie', 'FESSIERS', 12, 15, 'Pousse la jambe vers l’arrière en serrant le fessier, jambe presque tendue.'),
      e('Sumo Deadlift', 'FESSIERS', 6, 10, 'Pieds très écartés, pointes vers l’extérieur, mains sur la barre entre les genoux.'),
      e('Donkey Kicks', 'FESSIERS', 12, 15, 'Monte une jambe vers l’arrière, genou plié à 90 degrés, plante du pied vers le plafond.', { poidsDuCorps: true }),
      e('Clamshells', 'FESSIERS', 15, 20, 'Allongé sur le côté, genoux pliés, pieds l’un sur l’autre, tête posée sur le bras.', { poidsDuCorps: true }),
    ],
  },
  {
    id: 'ischios',
    nom: 'Cuisses (arrière)',
    role: 'L’arrière des cuisses : souvent oublié, il équilibre l’avant de la cuisse et galbe la jambe.',
    muscles: ['jambes'],
    exos: [
      e('Leg Curl Assis', 'ISCHIOS', 10, 15, 'Plie les jambes contre le boudin, reviens lentement sans laisser tomber la charge.'),
      e('Hyperextensions', 'DOS', 10, 15, 'Hanches sur le coussin, descends le buste, puis remonte jusqu’à faire une ligne droite avec les jambes, sans cambrer.'),
      // 25 octobre 2026 (Houari : « plein d'exercices avec les images ») : tous animés, conseil tiré de la fiche technique
      e('Romanian Deadlift (Haltères)', 'ISCHIOS', 8, 12, 'Descends jusqu’à l’étirement des ischios, puis reviens en poussant les hanches.'),
      e('Nordic Curl', 'ISCHIOS', 4, 8, 'Descends le plus lentement possible, amortis avec les mains, puis repousse pour remonter.', { poidsDuCorps: true }),
      e('Single Leg Deadlift', 'ISCHIOS', 8, 12, 'Penche le buste en poussant la hanche en arrière, l’autre jambe monte derrière.'),
      e('Leg Curl Couché', 'ISCHIOS', 10, 15, 'Allongé sur le ventre, genoux juste après le bord du banc, boudin au dessus des talons.'),
      e('Good Morning', 'DOS', 8, 12, 'Barre légère posée sur le haut du dos, pieds à largeur de hanches, genoux souples.'),
      e('Leg Curl Debout', 'ISCHIOS', 10, 15, 'Debout face à la machine, cuisses contre le coussin, boudin derrière la cheville.'),
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
      // 25 octobre 2026 (Houari : « plein d'exercices avec les images ») : tous animés, conseil tiré de la fiche technique
      e('Rowing Haltère (One Arm)', 'DOS', 8, 12, 'Une main et un genou sur le banc, dos plat, l’autre pied au sol.'),
      e('Tirage Serré (V-Bar)', 'DOS', 8, 12, 'Tire la poignée vers le haut de la poitrine, coudes près du corps.'),
      e('Pull Over Poulie Haute', 'DOS', 10, 15, 'Face à la poulie, buste penché depuis les hanches, dos plat, bras presque tendus.'),
      e('Inverted Row', 'DOS', 6, 12, 'Sous une barre ou une table solide, mains largeur d’épaules, corps tendu.', { poidsDuCorps: true }),
      e('Tractions Neutres', 'DOS', 4, 10, 'Monte jusqu’au menton au dessus des poignées, redescends sous contrôle.', { poidsDuCorps: true }),
      e('Tractions (Supination)', 'DOS', 4, 10, 'Monte jusqu’au menton au dessus de la barre, redescends bras tendus.', { poidsDuCorps: true }),
      e('Rowing T-Bar', 'DOS', 8, 12, 'Debout au dessus de la barre, genoux fléchis, buste penché à 45 degrés, dos plat.'),
      e('Straight Arm Pulldown', 'DOS', 12, 15, 'Face à la poulie haute, barre en main, bras tendus, buste légèrement penché.'),
      e('Chest Supported Row', 'DOS', 10, 12, 'Allongé sur le ventre sur un banc incliné, poitrine sur le dossier, haltères en main.'),
      e('Low Row Machine', 'DOS', 10, 12, 'Assis, poitrine contre le coussin, pieds sur les appuis, poignées basses en main.'),
      e('Tirage Horizontal Unilatéral', 'DOS', 10, 12, 'Assis face à la poulie basse, pieds sur l’appui, buste droit, une poignée dans une main.'),
    ],
  },
  {
    id: 'pectoraux',
    nom: 'Pectoraux',
    role: 'La poitrine : pousser, se relever du sol, un buste plus ferme.',
    muscles: ['pectoraux'],
    exos: [
      e('Développé Incliné (Haltères)', 'PECTORAUX', 8, 12, 'Banc incliné à environ 30 degrés, descends les haltères sur le haut de la poitrine puis pousse vers le haut.'),
      e('Pompes (Poids du corps)', 'PECTORAUX', 6, 15, 'Trop dur ? Fais les genoux au sol. Le corps reste droit comme une planche.', { poidsDuCorps: true }),
      // 25 octobre 2026 (Houari : « plein d'exercices avec les images ») : tous animés, conseil tiré de la fiche technique
      e('Développé Couché (Haltères)', 'PECTORAUX', 8, 12, 'Descends sous contrôle jusqu’à l’étirement, puis pousse les haltères vers le haut.'),
      e('Écartés à la Poulie Haute', 'PECTORAUX', 10, 15, 'Ramène les mains l’une vers l’autre devant le bas de la poitrine, puis remonte lentement.'),
      e('Pec Deck (Butterfly)', 'PECTORAUX', 10, 15, 'Règle le siège pour que les poignées soient à hauteur de poitrine.'),
      e('Dips (Focus Pectoraux)', 'PECTORAUX', 6, 12, 'Buste penché en avant, descends jusqu’à avoir les épaules au niveau des coudes.', { poidsDuCorps: true }),
      e('Développé Couché (Barre)', 'PECTORAUX', 6, 10, 'Descends la barre sur le bas des pectoraux, puis pousse vers le haut en expirant.'),
      e('Chest Press (Machine)', 'PECTORAUX', 10, 12, 'Règle le siège pour que les poignées arrivent à hauteur du milieu de la poitrine.'),
      e('Développé Incliné (Barre)', 'PECTORAUX', 6, 10, 'Banc à environ 30 degrés, pieds au sol, omoplates serrées et collées.'),
      e('Écartés Incliné (Haltères)', 'PECTORAUX', 10, 15, 'Banc à environ 30 degrés, haltères au dessus de la poitrine, coudes légèrement fléchis.'),
      e('Close Grip Bench Press', 'TRICEPS', 6, 10, 'Allongé sur le banc, mains sur la barre à largeur d’épaules, pieds au sol.'),
      e('Pompes Déclinées', 'PECTORAUX', 6, 15, 'Pieds sur un banc ou une chaise stable, mains au sol sous les épaules.', { poidsDuCorps: true }),
      e('Pull Over (Haltère)', 'PECTORAUX', 10, 12, 'Va jusqu’à l’étirement confortable, puis ramène l’haltère au dessus de la poitrine.'),
    ],
  },
  {
    id: 'epaules',
    nom: 'Épaules',
    role: 'Les épaules : des bras qui se lèvent sans gêne et une carrure plus marquée.',
    muscles: ['epaules'],
    exos: [
      e('Élévations Latérales (Haltères)', 'ÉPAULES', 12, 15, 'Monte les bras sur les côtés jusqu’aux épaules, haltères légers, sans élan.'),
      e('Développé Haltères Assis', 'ÉPAULES', 10, 12, 'Assis le dos calé, pousse les haltères au dessus de la tête sans cambrer.'),
      // 25 octobre 2026 (Houari : « plein d'exercices avec les images ») : tous animés, conseil tiré de la fiche technique
      e('Oiseau Machine (Reverse Pec Deck)', 'ÉPAULES', 12, 15, 'Assis face au dossier, poitrine contre le coussin, poignées à hauteur d’épaules.'),
      e('Élévations Latérales (Poulie)', 'ÉPAULES', 12, 15, 'Coude légèrement fléchi, monte le bras sur le côté jusqu’à hauteur d’épaule.'),
      e('Développé Militaire Assis', 'ÉPAULES', 8, 12, 'Recule un peu la tête et pousse la barre à la verticale, au dessus de la tête.'),
      e('Face Pull', 'DOS', 12, 15, 'Tire la corde vers ton front en écartant les mains, coudes hauts.'),
      e('Oiseau Haltères (Rear Delts)', 'ÉPAULES', 12, 15, 'Buste penché vers l’avant, dos plat, nuque dans l’alignement, haltères sous les épaules.'),
      e('Shoulder Press Machine', 'ÉPAULES', 8, 12, 'Dos collé au dossier, pieds à plat, pousse les poignées vers le haut.'),
      e('Élévations Frontales (Haltères)', 'ÉPAULES', 10, 15, 'Debout, un haltère dans chaque main devant les cuisses, coudes très légèrement fléchis.'),
      e('Arnold Press', 'ÉPAULES', 8, 12, 'Redescends lentement en refaisant la rotation inverse jusqu’à la position de départ.'),
      e('Développé Haltères Debout', 'ÉPAULES', 8, 12, 'Serre les abdos et les fessiers, puis pousse les haltères au dessus de la tête.'),
      e('Tirage Menton (Upright Row)', 'ÉPAULES', 10, 12, 'Arrête quand les coudes arrivent à hauteur des épaules, puis redescends lentement.'),
      e('Élévations Latérales (Machine)', 'ÉPAULES', 12, 15, 'L’extérieur des bras contre les coussins, monte les bras sur les côtés jusqu’à hauteur des épaules.'),
      e('Y Raises', 'ÉPAULES', 10, 15, 'Monte les bras tendus devant toi en Y, pouces vers le haut, jusqu’à l’alignement avec le buste.'),
    ],
  },
  {
    id: 'bras',
    nom: 'Bras',
    role: 'Biceps devant, triceps derrière : des bras plus fermes et plus forts.',
    muscles: ['biceps', 'triceps'],
    exos: [
      e('Curl Larry Scott (Pupitre)', 'BICEPS', 10, 12, 'Bras posés sur le pupitre, descends jusqu’aux bras presque tendus et contrôle bien le bas du mouvement.'),
      e('Overhead Extension Poulie', 'TRICEPS', 10, 15, 'Dos à la poulie, coudes pointés vers le haut, tends les bras au-dessus de la tête puis redescends en étirant bien l’arrière du bras.'),
      // 25 octobre 2026 (Houari : « plein d'exercices avec les images ») : tous animés, conseil tiré de la fiche technique
      e('Extension Triceps Poulie (Corde)', 'TRICEPS', 10, 15, 'Tends les bras vers le bas et écarte la corde en fin de mouvement.'),
      e('Curl Marteau (Hammer)', 'BICEPS', 10, 12, 'Monte les haltères en gardant les paumes face à face, coudes fixes.'),
      e('Barre au front (Skullcrusher)', 'TRICEPS', 8, 12, 'Plie seulement les coudes pour descendre la barre vers le front.'),
      e('Curl Haltères Alterné', 'BICEPS', 10, 12, 'Debout, haltères le long du corps, coudes collés aux côtes.'),
      e('Extension Haltère Nuque (2 mains)', 'TRICEPS', 10, 12, 'Plie les coudes pour descendre l’haltère derrière la nuque, coudes vers le haut.'),
      e('Curl Barre EZ', 'BICEPS', 8, 12, 'Debout, barre EZ en main paumes vers l’avant, coudes le long du corps.'),
      e('Dips Banc', 'TRICEPS', 8, 15, 'Mains sur le bord d’un banc ou d’une chaise stable, doigts vers l’avant.', { poidsDuCorps: true }),
      e('Curl Poulie Basse', 'BICEPS', 10, 15, 'Face à la poulie basse, barre ou poignée en main, coudes le long du corps.'),
      e('Extension Triceps Poulie (Barre)', 'TRICEPS', 10, 15, 'Face à la poulie haute, barre en main, coudes collés au corps.'),
      e('Curl Concentré', 'BICEPS', 10, 12, 'Assis au bout d’un banc, jambes écartées, l’arrière du bras calé contre l’intérieur de la cuisse.'),
      e('Curl Machine', 'BICEPS', 10, 15, 'L’arrière des bras à plat sur le pupitre, monte les poignées vers les épaules.'),
      e('Curl Barre Droite', 'BICEPS', 8, 12, 'Debout, barre en prise supination à largeur d’épaules, coudes collés au corps.'),
      e('Skullcrusher Haltères', 'TRICEPS', 10, 12, 'Allongé sur un banc plat, haltères au dessus de la poitrine, paumes face à face.'),
      e('Pompes Diamant', 'PECTORAUX', 6, 12, 'Mains rapprochées sous la poitrine, pouces et index qui forment un losange.', { poidsDuCorps: true }),
      e('Kickback Triceps (Haltère)', 'TRICEPS', 10, 15, 'Un genou et une main sur le banc, dos plat parallèle au sol, haltère dans l’autre main.'),
      e('Curl Haltères Simultané', 'BICEPS', 10, 12, 'Debout, un haltère dans chaque main, paumes vers l’avant, coudes collés au corps.'),
    ],
  },
  {
    // 24 octobre 2026, Houari : « il y a aussi les avant-bras, ne les oublie pas »
    id: 'avantbras',
    nom: 'Avant-bras',
    role: 'Les avant-bras : la poigne pour tenir les charges, porter, s’accrocher, saisir au combat.',
    muscles: ['avant_bras'],
    exos: [
      // 25 octobre 2026, section Grip demandée par Houari. Ordre de la séance Grip (les 5 premiers) :
      // porter lourd, pincer, se suspendre, d'après Dojo en ligne (traversée de disque, tractions serviette,
      // manches de kumi kata), Wodandgo (7 exercices de grip) et Jiu Jitsu Legacy (grip pour le JJB).
      e('Farmer Walk', 'AVANT-BRAS', 30, 45, 'Tu marches en portant lourd : tes mains serrent fort pour ne rien lâcher, c’est ça qui muscle tes avant-bras. Bras tendus, épaules basses, petits pas.', { secondes: true }),
      e('Traversée de Disques (Pince)', 'AVANT-BRAS', 20, 40, 'Garde le dos droit, serre les abdos et marche lentement sur un parcours court.', { secondes: true }),
      e('Dead Hang', 'AVANT-BRAS', 20, 40, 'Serre la barre et respire calmement pendant toute la tenue.', { secondes: true }),
      e('Pince Haltère (par la tête)', 'AVANT-BRAS', 15, 30, 'Bras tendus le long du corps, garde tout dans les doigts, pas dans la paume.', { secondes: true }),
      e('Gripper / Hand Grip', 'AVANT-BRAS', 10, 15, 'Place la pince au creux de la main, poignée fixe contre la paume.'),
      e('Suspension Serviette', 'AVANT-BRAS', 15, 30, 'Passe une serviette ou une veste de kimono par-dessus la barre de traction.', { secondes: true }),
      e('Wrist Roller', 'AVANT-BRAS', 3, 5, 'Bras tendus devant toi, enroule la corde en tournant les poignets jusqu’à remonter le poids, puis redescends lentement. Une montée et une descente font une répétition.'),
      e('Plate Pinch', 'AVANT-BRAS', 20, 30, 'Deux disques lisses face contre face, tenus par la tranche entre le pouce et les doigts.', { secondes: true }),
      e('Curl Disque', 'AVANT-BRAS', 10, 15, 'Debout, un disque tenu par les côtés avec les deux mains, bras le long du corps.'),
      e('Tractions Serviette', 'AVANT-BRAS', 3, 8, 'Serviette ou veste de kimono passée sur la barre, un pan dans chaque main.', { poidsDuCorps: true }),
      e('Tenue Trap Bar', 'AVANT-BRAS', 20, 30, 'Debout au centre de la barre hexagonale, mains au milieu des poignées.', { secondes: true }),
      e('Tirage Manches (Kumi Kata)', 'AVANT-BRAS', 10, 15, 'Tire vers toi en serrant fort, en faisant le geste de ta prise de garde avec beaucoup d’amplitude.'),
    ],
  },
  {
    id: 'mollets',
    nom: 'Mollets',
    role: 'Les mollets : marcher, courir, sauter, monter sur la pointe des pieds.',
    muscles: ['mollets'],
    exos: [e('Mollets Debout (Machine)', 'MOLLETS', 12, 20, 'Monte sur la pointe des pieds, tiens une seconde, descends le talon lentement.'),
      // 25 octobre 2026 (Houari : « plein d'exercices avec les images ») : tous animés, conseil tiré de la fiche technique
      e('Mollets Assis (Machine)', 'MOLLETS', 12, 20, 'Monte sur la pointe des pieds, tiens une seconde, redescends lentement.'),
      e('Mollets Unilatéral', 'MOLLETS', 12, 20, 'Monte sur la pointe du pied, tiens une seconde, redescends lentement.', { poidsDuCorps: true }),
      e('Mollets Haltères (Debout)', 'MOLLETS', 12, 20, 'Monte sur la pointe des pieds, tiens une seconde, redescends lentement.'),
    ],
  },
  {
    id: 'abdos',
    nom: 'Abdos',
    role: 'Le ventre : gainage, posture, un tronc plus solide. Pour voir les abdos, c’est surtout la perte de graisse.',
    muscles: ['abdos'],
    exos: [
      e('Gainage Planche', 'ABDOS', 20, 40, 'Sur les avant bras, le corps droit, le ventre rentré. Respire normalement.', { secondes: true, poidsDuCorps: true }),
      e('Dead Bug', 'ABDOS', 8, 12, 'Allongé, bas du dos collé au sol, descends un bras et la jambe opposée lentement.', { poidsDuCorps: true }),
      // 25 octobre 2026 (Houari : « plein d'exercices avec les images ») : tous animés, conseil tiré de la fiche technique
      e('Crunch Poulie Haute', 'ABDOS', 10, 15, 'À genoux face à la poulie haute, corde tenue près de la tête.'),
      e('Relevé de jambes (Sol)', 'ABDOS', 10, 15, 'Allongé sur le dos, mains sous les fesses ou le long du corps.', { poidsDuCorps: true }),
      e('Gainage Latéral', 'ABDOS', 20, 40, 'Sur le côté, coude sous l’épaule, jambes tendues l’une sur l’autre.', { secondes: true, poidsDuCorps: true }),
      e('Roulette Abdos (Abs Wheel)', 'ABDOS', 6, 12, 'Gaine fort, roule vers l’avant aussi loin que tu gardes le dos plat.', { poidsDuCorps: true }),
      e('Crunch Abdominal', 'ABDOS', 12, 20, 'Enroule le haut du dos pour décoller les épaules du sol.', { poidsDuCorps: true }),
      e('Hanging Knee Raise', 'ABDOS', 8, 15, 'Monte les genoux jusqu’à hauteur des hanches ou plus haut.', { poidsDuCorps: true }),
      e('Cable Crunch', 'ABDOS', 12, 20, 'À genoux face à la poulie haute, corde tenue de chaque côté de la tête.'),
      e('Mountain Climbers', 'ABDOS', 20, 30, 'Alterne les jambes à un rythme que tu peux tenir, hanches à hauteur des épaules.', { poidsDuCorps: true }),
      e('Sit-ups', 'ABDOS', 10, 15, 'Allongé sur le dos, genoux pliés, pieds à plat au sol, bras croisés sur la poitrine.', { poidsDuCorps: true }),
      e('Crunch Inversé', 'ABDOS', 10, 15, 'Ramène les genoux vers la poitrine en enroulant le bassin, qui se décolle du sol.', { poidsDuCorps: true }),
    ],
  },
];

export const zoneParId = (id: string): Zone | undefined => ZONES.find((z) => z.id === id);

/**
 * Raccourcis (25 octobre 2026, Houari : « tu pourrais vraiment mieux préparer ça ») : pour qui ne sait pas
 * quoi choisir, les quatre séances que les débutants demandent le plus. Un appui remplace les zones choisies.
 */
export const RACCOURCIS_ZONES: { id: string; nom: string; zones: ZoneId[] }[] = [
  { id: 'haut', nom: 'Haut du corps', zones: ['pectoraux', 'dos', 'epaules', 'bras'] },
  { id: 'bas', nom: 'Bas du corps', zones: ['quadriceps', 'fessiers', 'ischios', 'mollets'] },
  { id: 'fessiers_abdos', nom: 'Fessiers et abdos', zones: ['fessiers', 'abdos'] },
  { id: 'entier', nom: 'Corps entier', zones: ['quadriceps', 'dos', 'pectoraux', 'fessiers', 'abdos'] },
  // 25 octobre 2026 : la section Grip (la poigne : tenir le kimono, la barre, ne rien lâcher)
  { id: 'grip', nom: 'Grip', zones: ['avantbras'] },
];

/** Le raccourci qui correspond exactement aux zones choisies, sinon null */
export function raccourciActif(choisies: readonly string[]): string | null {
  const r = RACCOURCIS_ZONES.find((x) => x.zones.length === choisies.length && x.zones.every((z) => choisies.includes(z)));
  return r ? r.id : null;
}

/**
 * La séance du jour pour les zones choisies : les gros muscles d'abord, les abdos à la fin (l'ordre de ZONES).
 * 1 ou 2 zones : tous leurs exercices ; 3 zones : 2 chacune ; au delà : 1 chacune, plus le 2e des premières
 * zones tant que la séance reste sous 7 exercices (environ 45 minutes avec 3 séries et 90 s de repos).
 */
export const MAX_EXOS_ZONES = 7;
export function seanceZones(ids: readonly string[]): ExoProgramme[] {
  const choisies = ZONES.filter((z) => ids.includes(z.id));
  if (!choisies.length) return [];
  // 25 octobre 2026 : une seule zone, 5 exercices (les zones en ont maintenant 6 a 9)
  const parZone = choisies.length === 1 ? 5 : choisies.length === 2 ? 3 : choisies.length === 3 ? 2 : 1;
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
