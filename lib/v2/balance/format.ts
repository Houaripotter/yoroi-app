/**
 * Import d'une pesee depuis les photos d'une balance non connectee, toutes marques et tous formats :
 * ecran de balance (Tanita, Omron, Withings, Xiaomi, Renpho, Garmin, Eufy...), ticket ou feuille imprimee
 * (InBody, Tanita pro), capture d'une autre application.
 * L'utilisateur envoie ses photos a l'IA de son choix avec la consigne ci-dessous, l'IA repond par un ou
 * plusieurs blocs « YOROI BALANCE v1 » (un par date), l'utilisateur les colle dans YOROI.
 * YOROI n'envoie rien a aucune IA.
 *
 * Ce fichier est pur (aucun import React Native) : il est teste par jest
 * (__tests__/unit/balancePhotoFormat.test.ts).
 *
 * Mesures verifiees (scratchpad/balance/tanita.md et balance2, recherche du 13/10/2026) :
 * - Tanita BC-545N : poids, IMC, graisse %, eau %, muscle kg, physique 1 a 9, os kg, metabolisme kcal (et kJ),
 *   age metabolique, graisse viscerale 1 a 59 (pas de 0,5), graisse % et muscle kg des 5 segments.
 * - InBody (feuille de resultats) : eau totale, proteines, mineraux, masse grasse, masse maigre, muscle squelettique,
 *   analyse segmentaire de la masse maigre en kg et en % de la norme, graisse segmentaire en kg, ECW/TBW,
 *   angle de phase, score InBody sur 100, poids cible, metabolisme, rapport taille hanches.
 * - Xiaomi Body Composition Scale 2 : proteines %, age corporel, poids ideal, score, type de corps.
 * - Renpho : muscle squelettique, masse non grasse, proteines, graisse sous cutanee, age metabolique.
 * - Omron (HBF-375) : graisse sous cutanee et muscle squelettique en %, par segment, age corporel.
 * - Withings Body Comp : masse maigre, eau en kg, graisse viscerale. Eufy P2 Pro : frequence cardiaque, age corporel.
 * Tout le reste arrive en lignes « autre: Nom = valeur unite », gardees telles quelles.
 */

export type BalanceKind = 'muscle' | 'graisse' | 'os' | 'eau' | null;
export type BalanceGroup = 'principal' | 'avance' | 'segment' | 'mensuration';
/** Les mensurations de l'app (table measurements, lib/v2/progres/measures.ts, MeasureKey) */
export type MeasureTarget = 'chest' | 'waist' | 'navel' | 'hips' | 'shoulders' | 'neck' | 'armL' | 'armR' | 'thighL' | 'thighR' | 'calfL' | 'calfR';
export type SegmentKey = 'arm_right' | 'arm_left' | 'trunk' | 'leg_right' | 'leg_left';

export type BalanceFieldSpec = {
  /** cle du bloc YOROI BALANCE v1 */
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  /** pas d'arrondi : 1 pour un entier, 0.5 pour la graisse viscerale, 0.1 en general, 0.001 pour un ratio */
  step: number;
  group: BalanceGroup;
  kind: BalanceKind;
  /** consigne courte pour l'IA */
  ai: string;
  /** synonymes acceptes (normalises), en plus de la cle */
  aliases?: string[];
  /** les kilos peuvent arriver en livres ou en stones : conversion */
  mass?: boolean;
  segment?: SegmentKey;
  /** IMPORT MULTI : mensuration rangee dans la table measurements (colonne de MeasureKey) */
  measure?: MeasureTarget;
  /** IMPORT MULTI : longueur en cm, peut arriver en pouces : conversion */
  length?: boolean;
  /** gardee dans la colonne JSON scale_extras (et pas dans une colonne a elle) */
  json?: boolean;
  /** cle lue puis convertie vers une autre (kJ vers kcal) */
  convert?: { to: string; factor: number };
  /** pas listee une a une dans la consigne (segments : decrits par un modele) */
  pattern?: boolean;
};

const SEGMENTS: { seg: SegmentKey; key: string; label: string; de: string; names: string[] }[] = [
  { seg: 'arm_right', key: 'bras_droit', label: 'bras droit', de: 'du bras droit', names: ['bras_droit', 'bras_d', 'bd', 'right_arm', 'arm_right', 'r_arm', 'arm_r'] },
  { seg: 'arm_left', key: 'bras_gauche', label: 'bras gauche', de: 'du bras gauche', names: ['bras_gauche', 'bras_g', 'bg', 'left_arm', 'arm_left', 'l_arm', 'arm_l'] },
  { seg: 'trunk', key: 'tronc', label: 'tronc', de: 'du tronc', names: ['tronc', 'torse', 'trunk', 'torso', 'core'] },
  { seg: 'leg_right', key: 'jambe_droite', label: 'jambe droite', de: 'de la jambe droite', names: ['jambe_droite', 'jambe_d', 'jd', 'right_leg', 'leg_right', 'r_leg', 'leg_r'] },
  { seg: 'leg_left', key: 'jambe_gauche', label: 'jambe gauche', de: 'de la jambe gauche', names: ['jambe_gauche', 'jambe_g', 'jg', 'left_leg', 'leg_left', 'l_leg', 'leg_l'] },
];

/**
 * IMPORT MULTI : les mensurations, rangees dans la table measurements (memes colonnes que l'ecran Mensurations :
 * chest, waist, navel, hips, shoulders, neck, left_arm, right_arm, left_thigh, right_thigh, left_calf, right_calf).
 * Le nom de la colonne est accepte comme cle. L'avant-bras n'a pas de colonne : il est garde avec la pesee du jour.
 * Bras, cuisse, mollet sans cote precise : range a gauche, comme l'ancien ecran (arms, thighs).
 */
const MEASURES: { key: string; label: string; measure?: MeasureTarget; min: number; max: number; ai: string; aliases: string[] }[] = [
  { key: 'tour_de_cou_cm', label: 'Cou', measure: 'neck', min: 20, max: 70, ai: 'tour de cou', aliases: ['neck', 'cou', 'tour_cou', 'tour_du_cou', 'neck_circumference'] },
  { key: 'tour_d_epaules_cm', label: 'Épaules', measure: 'shoulders', min: 60, max: 190, ai: 'tour d’épaules', aliases: ['shoulders', 'epaules', 'tour_epaules', 'tour_des_epaules', 'carrure'] },
  { key: 'tour_de_poitrine_cm', label: 'Poitrine', measure: 'chest', min: 50, max: 200, ai: 'tour de poitrine', aliases: ['chest', 'poitrine', 'tour_poitrine', 'pectoraux', 'chest_circumference', 'tour_de_torse', 'torse_cm'] },
  { key: 'tour_de_taille_cm', label: 'Tour de taille', measure: 'waist', min: 40, max: 200, ai: 'tour de taille', aliases: ['waist', 'tour_taille', 'tour_de_taille', 'waist_circumference', 'tour_de_ventre'] },
  { key: 'tour_au_nombril_cm', label: 'Nombril', measure: 'navel', min: 40, max: 200, ai: 'tour au niveau du nombril', aliases: ['navel', 'nombril', 'tour_nombril', 'tour_de_nombril', 'tour_ombilical'] },
  { key: 'tour_de_hanches_cm', label: 'Hanches', measure: 'hips', min: 50, max: 200, ai: 'tour de hanches', aliases: ['hips', 'hanches', 'tour_hanches', 'hip', 'hip_circumference', 'tour_de_bassin'] },
  { key: 'tour_bras_droit_cm', label: 'Bras droit', measure: 'armR', min: 15, max: 70, ai: 'tour du bras droit', aliases: ['right_arm', 'tour_de_bras_droit', 'biceps_droit', 'bras_droit_cm'] },
  { key: 'tour_bras_gauche_cm', label: 'Bras gauche', measure: 'armL', min: 15, max: 70, ai: 'tour du bras gauche', aliases: ['left_arm', 'tour_de_bras_gauche', 'biceps_gauche', 'bras_gauche_cm'] },
  { key: 'tour_de_bras_cm', label: 'Bras', measure: 'armL', min: 15, max: 70, ai: 'tour de bras, si le côté n’est pas indiqué', aliases: ['arms', 'arm', 'tour_bras', 'biceps', 'bras_cm'] },
  { key: 'tour_avant_bras_droit_cm', label: 'Avant-bras droit', min: 15, max: 50, ai: 'tour de l’avant-bras droit', aliases: ['right_forearm', 'tour_d_avant_bras_droit', 'avant_bras_droit'] },
  { key: 'tour_avant_bras_gauche_cm', label: 'Avant-bras gauche', min: 15, max: 50, ai: 'tour de l’avant-bras gauche', aliases: ['left_forearm', 'tour_d_avant_bras_gauche', 'avant_bras_gauche'] },
  { key: 'tour_avant_bras_cm', label: 'Avant-bras', min: 15, max: 50, ai: 'tour d’avant-bras, si le côté n’est pas indiqué', aliases: ['forearm', 'avant_bras', 'tour_d_avant_bras', 'tour_avant_bras'] },
  { key: 'tour_cuisse_droite_cm', label: 'Cuisse droite', measure: 'thighR', min: 30, max: 110, ai: 'tour de la cuisse droite', aliases: ['right_thigh', 'tour_de_cuisse_droite', 'cuisse_droite'] },
  { key: 'tour_cuisse_gauche_cm', label: 'Cuisse gauche', measure: 'thighL', min: 30, max: 110, ai: 'tour de la cuisse gauche', aliases: ['left_thigh', 'tour_de_cuisse_gauche', 'cuisse_gauche'] },
  { key: 'tour_de_cuisse_cm', label: 'Cuisse', measure: 'thighL', min: 30, max: 110, ai: 'tour de cuisse, si le côté n’est pas indiqué', aliases: ['thighs', 'thigh', 'cuisse', 'cuisses', 'tour_cuisse'] },
  { key: 'tour_mollet_droit_cm', label: 'Mollet droit', measure: 'calfR', min: 20, max: 70, ai: 'tour du mollet droit', aliases: ['right_calf', 'tour_de_mollet_droit', 'mollet_droit'] },
  { key: 'tour_mollet_gauche_cm', label: 'Mollet gauche', measure: 'calfL', min: 20, max: 70, ai: 'tour du mollet gauche', aliases: ['left_calf', 'tour_de_mollet_gauche', 'mollet_gauche'] },
  { key: 'tour_de_mollet_cm', label: 'Mollet', measure: 'calfL', min: 20, max: 70, ai: 'tour de mollet, si le côté n’est pas indiqué', aliases: ['calf', 'calves', 'mollet', 'mollets', 'tour_mollet'] },
];

function measureFields(): BalanceFieldSpec[] {
  return MEASURES.map((m) => ({
    key: m.key,
    label: m.label,
    unit: 'cm',
    min: m.min,
    max: m.max,
    step: 0.1,
    group: 'mensuration' as const,
    kind: null,
    length: true,
    ai: m.ai,
    aliases: m.aliases,
    ...(m.measure ? { measure: m.measure } : { json: true }),
  }));
}

/** Cles de mensuration sans cote precise : la cle avec cote l'emporte si les deux sont la */
export const UNSIDED_MEASURE: Record<string, string> = { tour_de_bras_cm: 'tour_bras_gauche_cm', tour_de_cuisse_cm: 'tour_cuisse_gauche_cm', tour_de_mollet_cm: 'tour_mollet_gauche_cm', tour_avant_bras_cm: 'tour_avant_bras_gauche_cm' };

const MUSCLE_SEG_MAX: Record<SegmentKey, [number, number]> = {
  arm_right: [0.5, 15],
  arm_left: [0.5, 15],
  trunk: [8, 90],
  leg_right: [2, 40],
  leg_left: [2, 40],
};

function segFields(): BalanceFieldSpec[] {
  const out: BalanceFieldSpec[] = [];
  const base = { group: 'segment' as const, step: 0.1, pattern: true };
  for (const s of SEGMENTS) {
    out.push({
      ...base,
      key: `graisse_${s.key}_pct`,
      label: `Graisse ${s.label}`,
      unit: '%',
      min: 2,
      max: 75,
      kind: 'graisse',
      segment: s.seg,
      ai: `graisse ${s.de} en %`,
      aliases: s.names.flatMap((n) => [`graisse_${n}`, `${n}_graisse`, `gras_${n}`, `fat_${n}`, `${n}_fat`, `masse_grasse_${n}`, `body_fat_${n}`]),
    });
  }
  for (const s of SEGMENTS) {
    const [min, max] = MUSCLE_SEG_MAX[s.seg];
    out.push({
      ...base,
      key: `muscle_${s.key}_kg`,
      label: `Muscle ${s.label}`,
      unit: 'kg',
      min,
      max,
      kind: 'muscle',
      segment: s.seg,
      mass: true,
      ai: `masse musculaire ${s.de} en kg`,
      aliases: s.names.flatMap((n) => [`muscle_${n}`, `${n}_muscle`, `masse_musculaire_${n}`, `muscle_mass_${n}`, `${n}_muscle_mass`, `lean_${n}`, `${n}_lean`, `masse_maigre_${n}`]),
    });
  }
  // BALANCE 2 : InBody (graisse segmentaire en kg), Omron (muscle squelettique en % par segment), eau par segment
  for (const s of SEGMENTS) {
    out.push({
      ...base,
      key: `graisse_${s.key}_kg`,
      label: `Graisse ${s.label}`,
      unit: 'kg',
      min: 0.1,
      max: 60,
      kind: 'graisse',
      segment: s.seg,
      mass: true,
      json: true,
      ai: `graisse ${s.de} en kg`,
      aliases: s.names.flatMap((n) => [`fat_mass_${n}`, `${n}_fat_mass`, `masse_grasse_${n}_kg`]),
    });
  }
  for (const s of SEGMENTS) {
    out.push({
      ...base,
      key: `muscle_${s.key}_pct`,
      label: `Muscle ${s.label}`,
      unit: '%',
      min: 1,
      max: 90,
      kind: 'muscle',
      segment: s.seg,
      json: true,
      ai: `muscle ${s.de} en %`,
      aliases: s.names.flatMap((n) => [`muscle_squelettique_${n}`, `skeletal_muscle_${n}`, `${n}_skeletal_muscle`]),
    });
  }
  for (const s of SEGMENTS) {
    out.push({
      ...base,
      key: `eau_${s.key}_kg`,
      label: `Eau ${s.label}`,
      unit: 'kg',
      min: 0.3,
      max: 45,
      kind: 'eau',
      segment: s.seg,
      mass: true,
      json: true,
      ai: `eau ${s.de} en kg ou en litres`,
      aliases: s.names.flatMap((n) => [`eau_${n}`, `${n}_eau`, `water_${n}`, `${n}_water`, `body_water_${n}`, `eau_${n}_l`]),
    });
  }
  return out;
}

export const BALANCE_FIELDS: BalanceFieldSpec[] = [
  { key: 'poids_kg', label: 'Poids', unit: 'kg', min: 20, max: 300, step: 0.1, group: 'principal', kind: null, mass: true, ai: 'poids en kg', aliases: ['poids', 'weight', 'masse', 'body_weight', 'poids_corporel'] },
  { key: 'graisse_pct', label: 'Masse grasse', unit: '%', min: 2, max: 75, step: 0.1, group: 'principal', kind: 'graisse', ai: 'masse grasse du corps entier en %', aliases: ['graisse', 'masse_grasse', 'masse_grasse_pct', 'body_fat', 'fat', 'bf', 'pbf', 'percent_body_fat', 'taux_de_graisse', 'graisse_corporelle'] },
  { key: 'muscle_kg', label: 'Masse musculaire', unit: 'kg', min: 5, max: 150, step: 0.1, group: 'principal', kind: 'muscle', mass: true, ai: 'masse musculaire du corps entier en kg', aliases: ['muscle', 'masse_musculaire', 'muscle_mass', 'muscles'] },
  { key: 'eau_pct', label: 'Eau', unit: '%', min: 20, max: 80, step: 0.1, group: 'principal', kind: 'eau', ai: 'eau corporelle totale en %', aliases: ['eau', 'eau_corporelle', 'eau_totale', 'water', 'body_water', 'tbw', 'hydratation', 'hydration'] },
  { key: 'os_kg', label: 'Masse osseuse', unit: 'kg', min: 0.5, max: 10, step: 0.1, group: 'avance', kind: 'os', mass: true, ai: 'masse osseuse en kg', aliases: ['os', 'masse_osseuse', 'bone', 'bone_mass', 'ossature'] },
  { key: 'graisse_viscerale', label: 'Graisse viscérale', unit: 'niveau', min: 1, max: 59, step: 0.5, group: 'avance', kind: 'graisse', ai: 'indice de graisse viscérale, de 1 à 59', aliases: ['viscerale', 'visceral', 'visceral_fat', 'graisse_viscerale_niveau', 'gras_visceral', 'visceral_fat_rating', 'visceral_fat_level'] },
  { key: 'metabolisme_kcal', label: 'Métabolisme de base', unit: 'kcal', min: 600, max: 5000, step: 1, group: 'avance', kind: null, ai: 'métabolisme de base en kcal', aliases: ['metabolisme', 'metabolisme_de_base', 'mb', 'bmr', 'basal_metabolic_rate', 'dee', 'metabolisme_au_repos', 'resting_metabolism'] },
  { key: 'metabolisme_kj', label: 'Métabolisme de base', unit: 'kJ', min: 2500, max: 21000, step: 1, group: 'avance', kind: null, convert: { to: 'metabolisme_kcal', factor: 1 / 4.184 }, ai: 'métabolisme de base en kJ, seulement si la balance ne donne pas les kcal', aliases: ['metabolisme_de_base_kj', 'bmr_kj', 'kj'] },
  { key: 'age_metabolique', label: 'Âge métabolique', unit: 'ans', min: 10, max: 100, step: 1, group: 'avance', kind: null, ai: 'âge métabolique en années', aliases: ['age_metabolique_ans', 'metabolic_age', 'age_meta'] },
  { key: 'imc', label: 'IMC', unit: '', min: 10, max: 70, step: 0.1, group: 'avance', kind: null, ai: 'IMC affiché par la balance', aliases: ['bmi', 'indice_de_masse_corporelle'] },
  { key: 'physique', label: 'Morphologie', unit: 'sur 9', min: 1, max: 9, step: 1, group: 'avance', kind: null, ai: 'physique rating, chiffre de 1 à 9', aliases: ['physique_rating', 'morphologie', 'type_physique'] },
  { key: 'graisse_kg', label: 'Masse grasse en kilos', unit: 'kg', min: 1, max: 200, step: 0.1, group: 'avance', kind: 'graisse', mass: true, ai: 'masse grasse en kg', aliases: ['masse_grasse_kg', 'fat_mass', 'fat_kg', 'body_fat_mass'] },
  { key: 'muscle_pct', label: 'Muscle en pourcentage', unit: '%', min: 10, max: 90, step: 0.1, group: 'avance', kind: 'muscle', ai: 'muscle en %, seulement si la balance le donne en %', aliases: ['masse_musculaire_pct', 'muscle_percent', 'taux_de_muscle'] },
  // BALANCE 2 : ce que donnent souvent les autres balances et les feuilles InBody (colonne JSON scale_extras)
  { key: 'masse_maigre_kg', label: 'Masse maigre', unit: 'kg', min: 10, max: 200, step: 0.1, group: 'avance', kind: 'muscle', mass: true, json: true, ai: 'masse maigre ou masse non grasse en kg', aliases: ['masse_maigre', 'masse_non_grasse', 'lean_mass', 'lean_body_mass', 'lbm', 'fat_free_mass', 'ffm', 'fat_free_body_weight', 'poids_sans_graisse'] },
  { key: 'muscle_squelettique_kg', label: 'Muscle squelettique', unit: 'kg', min: 5, max: 100, step: 0.1, group: 'avance', kind: 'muscle', mass: true, json: true, ai: 'masse musculaire squelettique en kg', aliases: ['muscle_squelettique', 'masse_musculaire_squelettique', 'skeletal_muscle', 'skeletal_muscle_mass', 'smm'] },
  { key: 'muscle_squelettique_pct', label: 'Muscle squelettique', unit: '%', min: 10, max: 70, step: 0.1, group: 'avance', kind: 'muscle', json: true, ai: 'muscle squelettique en %', aliases: ['skeletal_muscle_percent', 'taux_de_muscle_squelettique'] },
  { key: 'eau_kg', label: 'Eau en kilos', unit: 'kg', min: 10, max: 120, step: 0.1, group: 'avance', kind: 'eau', mass: true, json: true, ai: 'eau corporelle totale en kg ou en litres', aliases: ['water_mass', 'masse_d_eau', 'eau_totale_kg', 'total_body_water_kg', 'eau_l', 'eau_totale_l'] },
  { key: 'proteines_kg', label: 'Protéines', unit: 'kg', min: 1, max: 40, step: 0.1, group: 'avance', kind: null, mass: true, json: true, ai: 'protéines en kg', aliases: ['proteines', 'protein', 'proteins', 'protein_mass', 'proteine'] },
  { key: 'proteines_pct', label: 'Protéines', unit: '%', min: 5, max: 30, step: 0.1, group: 'avance', kind: null, json: true, ai: 'protéines en %', aliases: ['protein_percent', 'taux_de_proteines'] },
  { key: 'mineraux_kg', label: 'Minéraux', unit: 'kg', min: 0.5, max: 10, step: 0.01, group: 'avance', kind: 'os', mass: true, json: true, ai: 'minéraux en kg', aliases: ['mineraux', 'minerals', 'mineral', 'masse_minerale', 'mineral_mass'] },
  { key: 'graisse_sous_cutanee_pct', label: 'Graisse sous-cutanée', unit: '%', min: 1, max: 70, step: 0.1, group: 'avance', kind: 'graisse', json: true, ai: 'graisse sous cutanée en %', aliases: ['graisse_sous_cutanee', 'sous_cutanee', 'subcutaneous_fat', 'subcutaneous_fat_percent', 'gras_sous_cutane'] },
  { key: 'ratio_eau_extracellulaire', label: 'Ratio eau extracellulaire', unit: 'ECW/TBW', min: 0.3, max: 0.5, step: 0.001, group: 'avance', kind: 'eau', json: true, ai: 'ratio ECW/TBW, par exemple 0.380', aliases: ['ecw_tbw', 'ecw_tbw_ratio', 'ratio_ecw_tbw', 'ecw_ratio', 'extracellular_water_ratio', 'ratio_eau_extracellulaire_eau_totale'] },
  { key: 'angle_de_phase', label: 'Angle de phase', unit: '°', min: 1, max: 15, step: 0.1, group: 'avance', kind: null, json: true, ai: 'angle de phase en degrés', aliases: ['phase_angle', 'angle_phase', 'whole_body_phase_angle', 'angle_de_phase_50khz'] },
  { key: 'score_corporel', label: 'Score corporel', unit: 'points', min: 1, max: 100, step: 1, group: 'avance', kind: null, json: true, ai: 'score InBody ou score corporel sur 100', aliases: ['score', 'inbody_score', 'score_inbody', 'body_score', 'health_score', 'score_sante', 'score_corps'] },
  { key: 'fc_repos', label: 'Fréquence cardiaque', unit: 'bpm', min: 30, max: 200, step: 1, group: 'avance', kind: null, json: true, ai: 'fréquence cardiaque mesurée par la balance, en bpm', aliases: ['frequence_cardiaque', 'fc', 'pouls', 'heart_rate', 'hr', 'bpm', 'standing_heart_rate', 'resting_heart_rate', 'rythme_cardiaque'] },
  { key: 'age_corporel', label: 'Âge corporel', unit: 'ans', min: 10, max: 100, step: 1, group: 'avance', kind: null, json: true, ai: 'âge corporel en années, s’il est distinct de l’âge métabolique', aliases: ['body_age', 'age_du_corps', 'age_biologique'] },
  { key: 'poids_ideal_kg', label: 'Poids idéal ou cible', unit: 'kg', min: 20, max: 300, step: 0.1, group: 'avance', kind: null, mass: true, json: true, ai: 'poids idéal ou poids cible affiché, en kg', aliases: ['poids_ideal', 'poids_cible', 'ideal_weight', 'target_weight', 'poids_de_reference', 'standard_weight'] },
  ...segFields(),
  ...measureFields(),
];

export const BALANCE_FIELD: Record<string, BalanceFieldSpec> = Object.fromEntries(BALANCE_FIELDS.map((f) => [f.key, f]));

/** Les cles gardees dans la colonne JSON scale_extras de la pesee */
export const JSON_FIELDS: BalanceFieldSpec[] = BALANCE_FIELDS.filter((f) => f.json);

/** Les 9 morphologies de la Tanita (tanita.co.uk, physique rating) */
export const PHYSIQUE_LABELS: Record<number, string> = {
  1: 'obésité cachée',
  2: 'obèse',
  3: 'costaud',
  4: 'manque d’exercice',
  5: 'standard',
  6: 'standard musclé',
  7: 'mince',
  8: 'mince et musclé',
  9: 'très musclé',
};

export const SEGMENT_LABELS: Record<SegmentKey, string> = {
  arm_right: 'Bras droit',
  arm_left: 'Bras gauche',
  trunk: 'Tronc',
  leg_right: 'Jambe droite',
  leg_left: 'Jambe gauche',
};
export const SEGMENT_ORDER: SegmentKey[] = ['arm_left', 'arm_right', 'trunk', 'leg_left', 'leg_right'];

// ---------- la consigne pour l'IA ----------

function promptLines(): string {
  return BALANCE_FIELDS.filter((f) => !f.pattern && f.group !== 'mensuration')
    .map((f) => `${f.key}: (${f.ai})`)
    .join('\n');
}

function measureLines(): string {
  return BALANCE_FIELDS.filter((f) => f.group === 'mensuration')
    .map((f) => `${f.key}: (${f.ai})`)
    .join('\n');
}

export const BALANCE_PROMPT = `Je t'envoie des photos pour mon application YOROI, parfois tout un dossier pris à des dates différentes : écrans de balance (toute marque), captures d'une application de balance connectée (Withings, Zepp Life ou Mi Fit, Renpho, Eufy, Garmin Connect, Apple Santé, Samsung Health, Google Fit...) avec leurs historiques et graphiques chiffrés, tickets ou feuilles imprimées (InBody, Tanita...), et mensurations en centimètres (note, carnet, capture). Lis les valeurs et recopie-les.

Règles :
1. Recopie seulement les chiffres que tu vois clairement. Ne devine rien, ne calcule rien, ne convertis rien.
2. Si une valeur n'apparaît nulle part, ou si tu as un doute, n'écris pas sa ligne.
3. Réponds UNIQUEMENT avec les blocs ci-dessous : aucun texte avant, après ou entre, aucune explication.
4. Une ligne par valeur, au format cle: nombre, avec un point pour les décimales. Garde exactement les noms des clés. Pas d'unité, sauf pour une masse en livres ou en stones (écris lb ou st après le nombre, exemple : poids_kg: 12 st 4 lb) et pour une longueur en pouces (écris in après le nombre).
5. Un bloc par date, de YOROI BALANCE v1 à FIN. Tout ce qui a été mesuré le même jour va dans un seul bloc, même si cela vient de plusieurs photos (la balance le matin, le mètre ruban le soir). Les photos arrivent dans n'importe quel ordre et peuvent se répéter : une valeur vue sur deux photos ne s'écrit qu'une fois.
6. La date de chaque bloc : cherche-la dans cet ordre. La date affichée sur l'écran de la balance ou dans la capture de l'application (date_source: ecran). La date imprimée sur un ticket ou une feuille (date_source: ticket). Sinon la date de prise de vue de la photo, si tu y as accès ou si elle est dans la liste « Dates de prise des photos » à la fin de ce message (date_source: photo). Écris-la au format date: AAAA-MM-JJ, et sur la ligne suivante d'où elle vient : date_source: ecran, ticket ou photo. Si le jour et le mois sont visibles mais pas l'année, écris date: JJ/MM, l'app ajoutera l'année. Si tu ne trouves aucune date, écris date: inconnue et date_source: inconnue, l'app demandera le jour. Une date visible sur la photo prime toujours sur la date de prise de vue. N'invente jamais une date, n'utilise pas la date du fichier ni celle de l'envoi, jamais la date d'aujourd'hui.
7. Historique ou graphique d'une application : chaque ligne qui montre une date et un chiffre écrits devient un bloc à sa date. Ne lis pas une valeur sur la hauteur d'une courbe, seulement les chiffres écrits. Une moyenne de la semaine ou du mois n'est pas une pesée : ne l'écris pas.
8. Beaucoup de balances (Tanita comprise) n'écrivent pas le nom de la mesure : reconnais-la par son unité, son petit symbole et sa plage de valeurs.
   kg avec la silhouette debout, valeur la plus grande : poids_kg.
   kg avec la silhouette musclée (haltère), environ 30 à 90 : muscle_kg.
   kg petit, environ 1 à 6, avec le symbole os : os_kg.
   % avec la silhouette et le symbole %, environ 3 à 50 : graisse_pct.
   % avec la goutte d'eau, environ 35 à 75 : eau_pct.
   Level : graisse_viscerale. Age : age_metabolique.
   kcal : metabolisme_kcal. kJ : metabolisme_kj, seulement si aucun écran ne donne les kcal (ne convertis pas).
   Chiffre seul sans unité de 1 à 9 avec le symbole silhouette : physique. Nombre à virgule sans unité, environ 15 à 45, avec BMI : imc.
   bpm ou un cœur : fc_repos. Degrés (°) : angle_de_phase. Nombre comme 0.380 avec ECW/TBW : ratio_eau_extracellulaire.
   Si deux valeurs peuvent correspondre à la même clé et que tu ne peux pas trancher, n'écris aucune des deux.
9. Bras, jambes, tronc d'une balance (sur une Tanita : les écrans des deux boutons orange, graisse en % et muscle en kg) : le côté droit ou gauche est celui indiqué par la balance ou la feuille. Si tu ne sais pas de quel segment il s'agit, n'écris pas la ligne. Un pourcentage « de la norme » (InBody) n'est pas un pourcentage du segment : mets-le en ligne autre.
10. Mensurations au mètre ruban, en cm : prends la clé avec le côté s'il est écrit, sinon la clé sans côté. Un tour de bras en cm n'est pas le muscle du bras en kg.
11. Toute autre mesure affichée avec son nom, une ligne chacune, au format :
   autre: Nom exact affiché = valeur unité
   N'écris pas en autre une mesure qui a déjà sa clé.
12. Si tu sais de quelles photos viennent les valeurs d'un bloc, ajoute la ligne photos: avec leurs numéros, dans l'ordre de la liste ou de l'envoi (exemple : photos: 1, 2, 3). Sinon n'écris pas cette ligne.

Clés possibles (écris seulement celles que tu vois) :
date: (AAAA-MM-JJ, JJ/MM sans l'année, ou inconnue)
date_source: (ecran, ticket, photo ou inconnue : d'où vient la date)
photos: (numéros des photos lues pour ce bloc, facultatif)
${promptLines()}

Mensurations, en cm :
${measureLines()}

Bras, jambes, tronc d'une balance, avec SEGMENT = bras_droit, bras_gauche, tronc, jambe_droite ou jambe_gauche :
graisse_SEGMENT_pct: (graisse du segment en %)
graisse_SEGMENT_kg: (graisse du segment en kg)
muscle_SEGMENT_kg: (muscle du segment en kg)
muscle_SEGMENT_pct: (muscle du segment en %)
eau_SEGMENT_kg: (eau du segment en kg ou en litres)

Exemple de réponse attendue pour un dossier de photos :
YOROI BALANCE v1
date: 2026-10-13
date_source: ecran
photos: 1, 2, 3
poids_kg: 82.4
graisse_pct: 18.2
muscle_kg: 63.5
graisse_bras_droit_pct: 15.3
tour_de_taille_cm: 84.5
autre: Eau intracellulaire = 28.1 L
FIN

YOROI BALANCE v1
date: 2026-10-06
date_source: ticket
poids_kg: 83.1
graisse_pct: 18.6
FIN

YOROI BALANCE v1
date: inconnue
date_source: inconnue
tour_de_hanches_cm: 98
tour_bras_droit_cm: 36.5
FIN`;

// ---------- l'analyse du texte colle ----------

export type ParsedValue = {
  key: string;
  value: number;
  /** le texte d'origine apres les deux points */
  raw: string;
  /** en dehors des valeurs possibles : decoche par defaut, a verifier */
  outOfRange: boolean;
  /** converti depuis des livres */
  fromLb?: boolean;
  /** unite d'origine convertie par YOROI : livres, stones, kilojoules, pouces */
  from?: 'lb' | 'st' | 'kj' | 'in';
};

/** Une mesure que YOROI ne connait pas, gardee telle que l'IA l'a lue */
export type AutreValue = { name: string; value: number; unit: string; raw: string };

/** BALANCE 3 : d'ou vient la date d'un bloc : l'ecran de la balance ou la capture, un ticket, la prise de vue, aucune */
export type DateSource = 'ecran' | 'ticket' | 'photo' | 'inconnue';

/** « ecran », « écran de la balance », « capture », « ticket InBody », « prise de vue », « inconnue »... */
export function readDateSource(raw: string): DateSource | undefined {
  const v = normKey(raw);
  if (!v) return undefined;
  if (/inconn|aucun|unknown|absent|non_visible|pas_de/.test(v)) return 'inconnue';
  if (/ticket|feuille|imprim|papier|print|receipt|inbody_sheet/.test(v)) return 'ticket';
  if (/photo|prise|exif|liste|fichier|vue|metadata|metadonnee/.test(v)) return 'photo';
  if (/ecran|screen|balance|capture|app|affich|display/.test(v)) return 'ecran';
  return undefined;
}

/** « l'écran de la balance », pour « Date détectée : 12 oct. (l'écran de la balance) » */
export const DATE_SOURCE_LABEL: Record<DateSource, string> = {
  ecran: 'écran de la balance',
  ticket: 'ticket',
  photo: 'date de prise de la photo',
  inconnue: 'aucune date trouvée',
};

export type ParseResult = {
  /** un en-tete YOROI BALANCE a ete trouve */
  header: boolean;
  date?: string;
  /** date ecrite mais illisible */
  badDate?: string;
  /** IMPORT MULTI : l'IA a ecrit « date: inconnue » (aucune date visible) : l'app demande le jour */
  dateUnknown?: boolean;
  /** BALANCE 3 : d'ou vient la date selon l'IA (ligne date_source:) ; absent dans les anciens blocs */
  dateSource?: DateSource;
  /** IMPORT MULTI : la photo montrait le jour et le mois sans l'annee, l'annee a ete ajoutee par YOROI */
  yearAdded?: boolean;
  /** PHOTOS DATEES : les numeros des photos lues pour ce bloc (ligne photos: 1, 2, 3), dans la liste de la consigne */
  photos?: number[];
  values: ParsedValue[];
  /** lignes « autre: Nom = valeur unite », et lignes cle: nombre dont la cle est inconnue */
  autres: AutreValue[];
  /** lignes dont la cle est inconnue et la valeur sans nombre */
  unknown: string[];
  /** cles reconnues dont la valeur est illisible (texte, vide) */
  unreadable: string[];
};

export function normKey(k: string): string {
  return k
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/%/g, '_pct')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const SUFFIXES: [RegExp, string][] = [
  [/_(kg|kilos?|kilogrammes?)$/, 'kg'],
  [/_(pct|percent|pourcent|pourcentage|p100)$/, 'pct'],
  [/_(kcal|cal|calories)$/, 'kcal'],
  [/_(kj|kilojoules?)$/, 'kj'],
  [/_(ans|annees|years|yrs)$/, 'ans'],
  [/_(niveau|level|rating|indice)$/, ''],
  [/_(cm|centimetres?)$/, 'cm'],
];

const UNIT_END: Record<string, RegExp> = { kg: /_kg$/, pct: /_pct$/, kcal: /_kcal$/, kj: /_kj$/, cm: /_cm$/ };

const ALIAS: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const f of BALANCE_FIELDS) {
    m.set(normKey(f.key), f.key);
    for (const a of f.aliases ?? []) if (!m.has(normKey(a))) m.set(normKey(a), f.key);
  }
  return m;
})();

function unitOfKey(key: string): string | undefined {
  for (const [u, re] of Object.entries(UNIT_END)) if (re.test(key)) return u;
  return undefined;
}

/** La cle canonique d'une cle ecrite par l'IA, ou undefined */
export function canonicalKey(written: string): string | undefined {
  const k = normKey(written);
  if (!k) return undefined;
  const direct = ALIAS.get(k);
  if (direct) return direct;
  for (const [re, unit] of SUFFIXES) {
    if (!re.test(k)) continue;
    const stem = k.replace(re, '');
    if (unit) {
      const withUnit = ALIAS.get(`${stem}_${unit}`);
      if (withUnit) return withUnit;
    }
    const s = ALIAS.get(stem);
    if (s) {
      // « graisse kg » n'est pas la graisse en %, « muscle % » n'est pas le muscle en kg : la cle soeur, ou rien
      const own = unitOfKey(s);
      if (unit && own && own !== unit) {
        const sister = s.replace(UNIT_END[own], `_${unit}`);
        return BALANCE_FIELD[sister] ? sister : undefined;
      }
      return s;
    }
  }
  return undefined;
}

const EMPTY = /^(?:-+|_+|\?+|n\/?a|na|nc|aucun|aucune|absent|absente|non|none|null|vide|illisible|non visible|pas visible|inconnu|inconnue|unknown|x)$/i;

type ReadUnit = 'lb' | 'st' | 'kj' | 'in' | undefined;

/** Le nombre d'une valeur ecrite (« 82,4 kg », « 1 850 kcal », « 1.850 », « 181.6 lb », « 12 st 4 lb », « 8385 kJ ») */
export function readNumber(raw: string, spec?: BalanceFieldSpec): { value: number; lb: boolean; unit?: ReadUnit } | undefined {
  let s = raw.trim().replace(/^[*_`"'«\s]+|[*_`"'»\s]+$/g, '');
  if (!s || EMPTY.test(s)) return undefined;
  // stones, avec ou sans livres : 12 st 4 lb, 13.5 st
  const st = s.match(/(\d+(?:[.,]\d+)?)\s*(?:st|stones?)\b(?:\s*(\d+(?:[.,]\d+)?)\s*(?:lbs?|livres?|pounds?)?)?/i);
  if (st) {
    const value = parseFloat(st[1].replace(',', '.')) + (st[2] ? parseFloat(st[2].replace(',', '.')) / 14 : 0);
    if (Number.isFinite(value)) return { value, lb: false, unit: 'st' };
  }
  const lb = /\b(lbs?|livres?|pounds?)\b/i.test(s);
  const kj = /\b(kj|kilojoules?)\b/i.test(s);
  const inch = /\d\s*(?:in|inch|inches|pouces?)\b|\d\s*(?:"|″)/i.test(s);
  // espaces de milliers : 1 850, 1 850 (espaces fines comprises)
  s = s.replace(/(\d)[\s  ](?=\d{3}\b)/g, '$1');
  const m = s.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return undefined;
  let txt = m[0];
  // « 1.850 » ou « 1,850 » pour un entier attendu au-dessus de 1000 : separateur de milliers
  if (spec && spec.step === 1 && spec.min >= 100 && /^\d{1,2}[.,]\d{3}$/.test(txt)) txt = txt.replace(/[.,]/, '');
  const value = parseFloat(txt.replace(',', '.'));
  if (!Number.isFinite(value)) return undefined;
  return { value, lb, unit: lb ? 'lb' : kj ? 'kj' : inch ? 'in' : undefined };
}

function decimalsOf(step: number): number {
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  if (step >= 0.01) return 2;
  return 3;
}

export function roundTo(v: number, step: number): number {
  if (step >= 1) return Math.round(v);
  if (step === 0.5) return Math.round(v * 2) / 2;
  const p = 10 ** decimalsOf(step);
  return Math.round(v * p) / p;
}

const MONTHS: Record<string, number> = { janvier: 1, janv: 1, jan: 1, fevrier: 2, fevr: 2, fev: 2, feb: 2, mars: 3, mar: 3, avril: 4, avr: 4, apr: 4, mai: 5, may: 5, juin: 6, jun: 6, juillet: 7, juil: 7, jul: 7, aout: 8, aug: 8, septembre: 9, sept: 9, sep: 9, octobre: 10, oct: 10, novembre: 11, nov: 11, decembre: 12, dec: 12 };

function isoOf(y: number, mo: number, d: number): string | undefined {
  if (y < 100) y += 2000;
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1) return undefined;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Une date ecrite (2026-10-13, 13/10/2026, 13.10.26, 13 octobre 2026) en AAAA-MM-JJ */
export function readDate(raw: string): string | undefined {
  const s = raw.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return isoOf(+m[1], +m[2], +m[3]);
  m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) return isoOf(+m[3], +m[2], +m[1]);
  m = s.match(/(\d{1,2})(?:er)?\s+([a-z]+)\.?\s+(\d{4})/);
  if (m && MONTHS[m[2]]) return isoOf(+m[3], MONTHS[m[2]], +m[1]);
  // « Oct 3, 2026 » (applications en anglais)
  m = s.match(/([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MONTHS[m[1]]) return isoOf(+m[3], MONTHS[m[1]], +m[2]);
  return undefined;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Jour local AAAA-MM-JJ (pas d'UTC) */
export function localIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * IMPORT MULTI : un jour et un mois sans annee (03/10, 3 oct., Oct 3) : l'annee de la derniere fois
 * que ce jour est passe (jamais une date dans le futur). L'utilisateur la voit et peut la changer.
 */
export function readDayMonth(raw: string, today: string): string | undefined {
  const s = raw.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^[a-z]+\.?\s+(?=\d)/, '');
  let d: number | undefined;
  let mo: number | undefined;
  let m = s.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    d = +m[1];
    mo = +m[2];
  } else if ((m = s.match(/^(\d{1,2})(?:er)?\s+([a-z]+)\.?$/)) && MONTHS[m[2]]) {
    d = +m[1];
    mo = MONTHS[m[2]];
  } else if ((m = s.match(/^([a-z]+)\.?\s+(\d{1,2})$/)) && MONTHS[m[1]]) {
    d = +m[2];
    mo = MONTHS[m[1]];
  }
  if (!d || !mo) return undefined;
  const y = +today.slice(0, 4);
  const same = isoOf(y, mo, d);
  if (same && same <= today) return same;
  return isoOf(y - 1, mo, d);
}

const HEADER = /yoroi[\s_-]*balance/i;
const END = /^\s*(?:fin|end|fin du bloc)\s*$/i;
const AUTRE_KEYS = new Set(['autre', 'autres', 'other', 'others', 'extra', 'autre_mesure', 'mesure']);

const MASS_UNITS = /^(kg|kgs|kilos?|lbs?|livres?|st|stones?)$/;

/** L'unite ecrite est-elle celle de la cle connue ? (une ligne autre qui a en fait sa cle) */
function unitFits(spec: BalanceFieldSpec, unit: string): boolean {
  const u = unit.toLowerCase().replace(/\.$/, '').trim();
  if (!u) return true;
  if (spec.mass && MASS_UNITS.test(u)) return true;
  if (spec.unit === 'kg' && spec.kind === 'eau' && /^(l|litres?)$/.test(u)) return true;
  switch (spec.unit) {
    case '%':
      return u === '%';
    case 'kcal':
      return u === 'kcal';
    case 'kJ':
      return u === 'kj';
    case 'ans':
      return /^(ans?|years?|yrs?)$/.test(u);
    case 'bpm':
      return /^(bpm|battements?\/min)$/.test(u);
    case '°':
      return /^(°|deg|degres?|degrees?)$/.test(u);
    case 'cm':
      return /^(cm|centimetres?|in|inch|inches|pouces?|"|″)$/.test(u);
    case '':
    case 'niveau':
    case 'points':
    case 'sur 9':
    case 'ECW/TBW':
      return /^(level|niveau|points?|pts|\/100|sur 100)$/.test(u);
    default:
      return false;
  }
}

function unitTag(unit: string): string {
  const u = unit.toLowerCase().trim();
  if (u === '%') return '%';
  if (/^(kg|lbs?|st)$/.test(u)) return 'kg';
  if (u === 'kcal' || u === 'kj') return u;
  if (/^(cm|in|pouces?)$/.test(u)) return 'cm';
  return '';
}

function cleanName(s: string): string {
  const t = s.replace(/[*_`"«»]/g, ' ').replace(/\s+/g, ' ').trim();
  return (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 48);
}

/** « Nom = 28.1 L » en { nom, valeur, unite } */
function readAutre(rest: string): { name: string; valRaw: string; value: number; unit: string } | undefined {
  const m = rest.match(/^(.+?)\s*=\s*(.+)$/) ?? rest.match(/^(.+)\s*:\s*(.+)$/);
  if (!m) return undefined;
  const name = cleanName(m[1]);
  const valRaw = m[2].trim();
  if (!name) return undefined;
  const n = readNumber(valRaw);
  if (!n) return undefined;
  const after = valRaw.replace(/(\d)[\s  ](?=\d{3}\b)/g, '$1').replace(/^[^\d-]*-?\d+(?:[.,]\d+)?/, '');
  const unit = after.replace(/[*_`"']/g, '').replace(/\s+/g, ' ').trim().replace(/[.;,]$/, '').slice(0, 16);
  return { name, valRaw, value: n.value, unit };
}

type Acc = { res: ParseResult; seen: Set<string>; autreSeen: Set<string> };

function pushKnown(acc: Acc, key: string, valRaw: string): boolean {
  const { res, seen } = acc;
  let spec = BALANCE_FIELD[key];
  const n = readNumber(valRaw, spec);
  if (!n) {
    if (valRaw && !EMPTY.test(valRaw.replace(/[*_`"']/g, '').trim())) res.unreadable.push(key);
    return false;
  }
  let value = n.value;
  let from: ParsedValue['from'];
  if (spec.mass && n.unit === 'lb') {
    value *= 0.45359237;
    from = 'lb';
  } else if (spec.mass && n.unit === 'st') {
    value *= 6.35029318;
    from = 'st';
  }
  // IMPORT MULTI : mensuration en pouces, YOROI convertit (1 pouce = 2,54 cm)
  if (spec.length && n.unit === 'in') {
    value *= 2.54;
    from = 'in';
  }
  // kJ : YOROI convertit lui-meme (1 kcal = 4,184 kJ)
  if (key === 'metabolisme_kcal' && n.unit === 'kj') {
    value /= 4.184;
    from = 'kj';
  }
  if (spec.convert) {
    value *= spec.convert.factor;
    key = spec.convert.to;
    spec = BALANCE_FIELD[key];
    from = 'kj';
  }
  value = roundTo(value, spec.step);
  if (seen.has(key)) {
    // les kcal lues sur l'ecran l'emportent sur la conversion des kJ
    const i = res.values.findIndex((v) => v.key === key);
    if (i >= 0 && res.values[i].from === 'kj' && from !== 'kj') res.values.splice(i, 1);
    else return true;
  }
  seen.add(key);
  res.values.push({ key, value, raw: valRaw, outOfRange: value < spec.min || value > spec.max, fromLb: from === 'lb' ? true : undefined, from });
  return true;
}

function pushAutre(acc: Acc, name: string, value: number, unit: string, raw: string) {
  const id = normKey(name);
  if (!id || acc.autreSeen.has(id)) return;
  acc.autreSeen.add(id);
  acc.res.autres.push({ name, value, unit, raw });
}

function parseRun(lines: string[], header: boolean, today: string): ParseResult {
  const res: ParseResult = { header, values: [], autres: [], unknown: [], unreadable: [] };
  const acc: Acc = { res, seen: new Set(), autreSeen: new Set() };
  for (const line of lines) {
    if (header && END.test(line.replace(/[*_`]/g, ''))) break;
    // puces, citations, gras, bloc de code
    const clean = line.replace(/^\s*(?:[-*+>•·]|\d+[.)])\s+/, '').replace(/\*\*/g, '').replace(/`/g, '').trim();
    if (!clean || /^```/.test(line.trim())) continue;
    const mm = clean.match(/^([^:=\t]+?)\s*(?::|=|\t|\s-\s)\s*(.*)$/);
    if (!mm) continue;
    const keyRaw = mm[1].trim();
    const valRaw = mm[2].trim();
    const nk = normKey(keyRaw);
    // BALANCE 3 : « date_source: ecran » (ecran, ticket, photo ou inconnue)
    if (nk === 'date_source' || nk === 'source_date' || nk === 'source_de_la_date' || nk === 'source') {
      const src = readDateSource(valRaw);
      if (src) res.dateSource = src;
      continue;
    }
    if (nk === 'date' || nk === 'jour') {
      let vd = valRaw.replace(/[*_`"']/g, '').trim();
      // « 2026-10-12 (écran) » : la source entre parentheses
      const par = vd.match(/\(([^)]*)\)\s*$/);
      if (par) {
        const src = readDateSource(par[1]);
        if (src && !res.dateSource) res.dateSource = src;
        vd = vd.slice(0, par.index).trim();
      }
      if (!vd) continue;
      // IMPORT MULTI : « date: inconnue » (aucune date sur la photo) : l'app demandera le jour
      if (EMPTY.test(vd) || /^(?:date\s+)?(?:inconnue|non visible|pas de date|aucune date|absente)\b/i.test(vd)) {
        if (!res.date) res.dateUnknown = true;
        continue;
      }
      const d = readDate(vd);
      if (d) {
        res.date = d;
        res.dateUnknown = undefined;
        res.yearAdded = undefined;
        continue;
      }
      const dm = readDayMonth(vd, today);
      if (dm) {
        res.date = dm;
        res.yearAdded = true;
        res.dateUnknown = undefined;
      } else res.badDate = valRaw;
      continue;
    }
    // PHOTOS DATEES : « photos: 1, 2, 3 », les photos d'ou vient ce bloc (jamais une mesure)
    if (nk === 'photos' || nk === 'photo' || nk === 'numeros_photos' || nk === 'photos_lues') {
      const refs = readPhotoRefs(valRaw);
      if (refs.length) res.photos = [...new Set([...(res.photos ?? []), ...refs])];
      continue;
    }
    if (AUTRE_KEYS.has(nk)) {
      const a = readAutre(valRaw);
      if (!a) {
        if (valRaw) res.unknown.push(valRaw.slice(0, 40));
        continue;
      }
      // une ligne autre qui a en fait sa cle connue : on la range a sa place
      const tag = unitTag(a.unit);
      const known = (tag ? canonicalKey(`${a.name} ${tag}`) : undefined) ?? canonicalKey(a.name);
      if (known && unitFits(BALANCE_FIELD[known], a.unit) && pushKnown(acc, known, a.valRaw)) continue;
      pushAutre(acc, a.name, a.value, a.unit, a.valRaw);
      continue;
    }
    const key = canonicalKey(keyRaw);
    if (!key) {
      if (!header || nk.length > 48) continue;
      // cle inconnue avec un nombre : gardee comme une mesure en plus, rien ne se perd
      const n = readNumber(valRaw);
      if (n) {
        const a = readAutre(`${keyRaw.replace(/_/g, ' ')} = ${valRaw}`);
        if (a) pushAutre(acc, a.name, a.value, a.unit, a.valRaw);
      } else res.unknown.push(keyRaw);
      continue;
    }
    pushKnown(acc, key, valRaw);
  }
  return res;
}

function mergeInto(a: ParseResult, b: ParseResult) {
  const seen = new Set(a.values.map((v) => v.key));
  for (const v of b.values) if (!seen.has(v.key)) a.values.push(v);
  const seenA = new Set(a.autres.map((x) => normKey(x.name)));
  for (const x of b.autres) if (!seenA.has(normKey(x.name))) a.autres.push(x);
  a.unknown.push(...b.unknown);
  a.unreadable.push(...b.unreadable);
  if (!a.badDate && b.badDate) a.badDate = b.badDate;
  if (!a.dateSource && b.dateSource) a.dateSource = b.dateSource;
  if (a.yearAdded && b.date && !b.yearAdded) a.yearAdded = undefined;
  if (b.photos?.length) a.photos = [...new Set([...(a.photos ?? []), ...b.photos])];
}

/** PHOTOS DATEES : « photos: 1, 2 et 3 », « photo 4 », « 1-3 » : les numeros cites, sans doublon, dans l'ordre */
export function readPhotoRefs(raw: string): number[] {
  const out: number[] = [];
  const s = raw.replace(/photos?|n°|#/gi, ' ');
  for (const part of s.split(/[,;]|\bet\b|\band\b/i)) {
    const r = part.match(/^\s*(\d{1,3})\s*(?:-|à|a|to)\s*(\d{1,3})\s*$/i);
    if (r) {
      const x = +r[1];
      const y = +r[2];
      if (x >= 1 && y >= x && y - x <= 60) for (let k = x; k <= y; k++) out.push(k);
      continue;
    }
    for (const m of part.match(/\d{1,3}/g) ?? []) out.push(+m);
  }
  return [...new Set(out.filter((n) => n >= 1))];
}

/** IMPORT MULTI : la signature des valeurs d'un bloc (meme texte colle deux fois : meme signature) */
export function blockSignature(b: ParseResult): string {
  const v = b.values.map((x) => `${x.key}=${x.value}`).sort();
  const a = b.autres.map((x) => `${normKey(x.name)}=${x.value}`).sort();
  return [...v, ...a].join('|');
}

/** IMPORT MULTI : les dates a choisir d'abord (en haut), puis de la plus recente a la plus ancienne */
export function sortBlocks(blocks: ParseResult[]): ParseResult[] {
  return blocks
    .map((b, i) => ({ b, i }))
    .sort((x, y) => {
      const dx = x.b.date ?? '';
      const dy = y.b.date ?? '';
      if (dx === dy) return x.i - y.i;
      if (!dx) return -1;
      if (!dy) return 1;
      return dx < dy ? 1 : -1;
    })
    .map((x) => x.b);
}

/**
 * Analyse tolerante de tout le texte colle : un bloc par date. Le bloc peut etre entoure de texte, dans un
 * bloc de code, en majuscules, avec des puces, des virgules decimales, des unites ecrites, des espaces.
 * Sans en-tete, les lignes cle: valeur reconnues sont prises quand meme (un seul bloc).
 * Deux blocs de la meme date (ou sans date tous les deux) n'en font qu'un : la premiere valeur l'emporte.
 */
export function parseBalanceBlocks(text: string, today: string = localIso(new Date())): ParseResult[] {
  if (!text) return [];
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const starts = lines.map((l, i) => (HEADER.test(l) ? i : -1)).filter((i) => i >= 0);
  const runs: ParseResult[] = starts.length
    ? starts.map((s, k) => parseRun(lines.slice(s + 1, k + 1 < starts.length ? starts[k + 1] : lines.length), true, today))
    : [parseRun(lines, false, today)];
  const out: ParseResult[] = [];
  for (const r of runs) {
    if (!r.values.length && !r.autres.length && runs.length > 1) continue;
    // IMPORT MULTI : deux blocs de la meme date n'en font qu'un ; deux blocs sans date seulement s'ils sont identiques
    // (le meme texte colle deux fois), sinon ce sont deux pesees dont il faudra choisir le jour
    const same = r.date ? out.find((o) => o.date === r.date) : out.find((o) => !o.date && blockSignature(o) === blockSignature(r));
    if (same) mergeInto(same, r);
    else out.push(r);
  }
  return out.length ? sortBlocks(out) : [runs[0]];
}

/** Le premier bloc seulement (compatibilite) */
export function parseBalanceText(text: string): ParseResult {
  return parseBalanceBlocks(text)[0] ?? { header: false, values: [], autres: [], unknown: [], unreadable: [] };
}

// ---------- vers les colonnes de la base ----------

export type ScaleColumns = {
  weight?: number;
  fat_percent?: number;
  muscle_percent?: number;
  water_percent?: number;
  bone_mass?: number;
  visceral_fat?: number;
  metabolic_age?: number;
  bmr?: number;
};

/** Colonnes ajoutees a la table weights pour garder tout ce que donne une balance */
export type ScaleExtras = {
  muscle_kg?: number;
  fat_kg?: number;
  bmi_scale?: number;
  physique_rating?: number;
  fat_arm_right?: number;
  fat_arm_left?: number;
  fat_trunk?: number;
  fat_leg_right?: number;
  fat_leg_left?: number;
  muscle_arm_right?: number;
  muscle_arm_left?: number;
  muscle_trunk?: number;
  muscle_leg_right?: number;
  muscle_leg_left?: number;
};

export const SCALE_EXTRA_COLUMNS: (keyof ScaleExtras)[] = [
  'muscle_kg',
  'fat_kg',
  'bmi_scale',
  'physique_rating',
  'fat_arm_right',
  'fat_arm_left',
  'fat_trunk',
  'fat_leg_right',
  'fat_leg_left',
  'muscle_arm_right',
  'muscle_arm_left',
  'muscle_trunk',
  'muscle_leg_right',
  'muscle_leg_left',
];

/** Une mesure en plus, rangee dans la colonne JSON scale_extras */
export type ScaleAutre = { nom: string; valeur: number; unite?: string };
/** La colonne JSON scale_extras d'une pesee : les cles connues sans colonne, et les lignes autre */
export type ScaleJson = { v: 1; mesures?: Record<string, number>; autres?: ScaleAutre[] };

/** Les valeurs choisies dans l'apercu, rangees dans les bonnes colonnes. weight peut venir d'ailleurs. */
export function toColumns(
  values: Record<string, number | undefined>,
  fallbackWeight?: number,
  autres?: ScaleAutre[],
): { cols: ScaleColumns; extras: ScaleExtras; json?: ScaleJson } {
  const v = (k: string) => {
    const x = values[k];
    return typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : undefined;
  };
  const weight = v('poids_kg') ?? fallbackWeight;
  const muscleKg = v('muscle_kg');
  const musclePct = v('muscle_pct');
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const cols: ScaleColumns = {
    weight,
    fat_percent: v('graisse_pct') ?? (v('graisse_kg') && weight ? r1((v('graisse_kg')! / weight) * 100) : undefined),
    muscle_percent: muscleKg && weight ? r1((muscleKg / weight) * 100) : musclePct,
    water_percent: v('eau_pct'),
    bone_mass: v('os_kg'),
    visceral_fat: v('graisse_viscerale'),
    metabolic_age: v('age_metabolique'),
    bmr: v('metabolisme_kcal'),
  };
  const extras: ScaleExtras = {
    muscle_kg: muscleKg ?? (musclePct && weight ? r1((musclePct * weight) / 100) : undefined),
    fat_kg: v('graisse_kg'),
    bmi_scale: v('imc'),
    physique_rating: v('physique'),
    fat_arm_right: v('graisse_bras_droit_pct'),
    fat_arm_left: v('graisse_bras_gauche_pct'),
    fat_trunk: v('graisse_tronc_pct'),
    fat_leg_right: v('graisse_jambe_droite_pct'),
    fat_leg_left: v('graisse_jambe_gauche_pct'),
    muscle_arm_right: v('muscle_bras_droit_kg'),
    muscle_arm_left: v('muscle_bras_gauche_kg'),
    muscle_trunk: v('muscle_tronc_kg'),
    muscle_leg_right: v('muscle_jambe_droite_kg'),
    muscle_leg_left: v('muscle_jambe_gauche_kg'),
  };
  const mesures: Record<string, number> = {};
  for (const f of JSON_FIELDS) {
    const x = v(f.key);
    if (x !== undefined) mesures[f.key] = x;
  }
  const list = (autres ?? []).filter((a) => a && a.nom && typeof a.valeur === 'number' && Number.isFinite(a.valeur));
  const json: ScaleJson | undefined =
    Object.keys(mesures).length || list.length ? { v: 1, ...(Object.keys(mesures).length ? { mesures } : {}), ...(list.length ? { autres: list } : {}) } : undefined;
  return { cols, extras, json };
}

/** La colonne scale_extras lue en base (texte JSON ou objet), validee ; undefined si vide ou abimee */
export function parseScaleJson(raw: unknown): ScaleJson | undefined {
  let o: unknown = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return undefined;
    try {
      o = JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  if (!o || typeof o !== 'object') return undefined;
  const src = o as { mesures?: unknown; autres?: unknown };
  const mesures: Record<string, number> = {};
  if (src.mesures && typeof src.mesures === 'object') {
    for (const [k, x] of Object.entries(src.mesures as Record<string, unknown>)) {
      if (BALANCE_FIELD[k] && typeof x === 'number' && Number.isFinite(x) && x > 0) mesures[k] = x;
    }
  }
  const autres: ScaleAutre[] = [];
  if (Array.isArray(src.autres)) {
    for (const a of src.autres as unknown[]) {
      const x = a as { nom?: unknown; valeur?: unknown; unite?: unknown };
      if (typeof x?.nom === 'string' && x.nom.trim() && typeof x.valeur === 'number' && Number.isFinite(x.valeur)) {
        autres.push({ nom: x.nom.trim().slice(0, 48), valeur: x.valeur, ...(typeof x.unite === 'string' && x.unite.trim() ? { unite: x.unite.trim().slice(0, 16) } : {}) });
      }
    }
  }
  if (!Object.keys(mesures).length && !autres.length) return undefined;
  return { v: 1, ...(Object.keys(mesures).length ? { mesures } : {}), ...(autres.length ? { autres } : {}) };
}

/** Complete une pesee deja notee : les nouvelles valeurs l'emportent, rien d'ancien ne se perd */
export function mergeScaleJson(old: ScaleJson | undefined, next: ScaleJson | undefined): ScaleJson | undefined {
  if (!old) return next;
  if (!next) return old;
  const mesures = { ...(old.mesures ?? {}), ...(next.mesures ?? {}) };
  const byName = new Map<string, ScaleAutre>();
  for (const a of [...(old.autres ?? []), ...(next.autres ?? [])]) byName.set(normKey(a.nom), a);
  const autres = Array.from(byName.values());
  return { v: 1, ...(Object.keys(mesures).length ? { mesures } : {}), ...(autres.length ? { autres } : {}) };
}

/** Source d'une pesee importee depuis une photo */
export const PHOTO_SOURCE = 'balance_photo';
export const PHOTO_SOURCE_LABEL = 'Balance (photo)';

/** Valeur en texte francais pour un champ de l'apercu */
export function fmtBalance(v: number, step: number): string {
  if (step >= 1) return String(Math.round(v));
  if (step === 0.5) return String(Math.round(v * 2) / 2).replace('.', ',');
  return roundTo(v, step).toFixed(decimalsOf(step)).replace('.', ',');
}

/** Une mesure en plus, en texte francais (garde les decimales lues, trois au plus) */
export function fmtAutre(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return String(r).replace('.', ',');
}

/** Saisie d'une correction dans l'apercu */
export function readEdited(s: string, spec: BalanceFieldSpec): number | undefined {
  const n = readNumber(s, spec);
  if (!n || n.value <= 0) return undefined;
  return roundTo(n.value, spec.step);
}
