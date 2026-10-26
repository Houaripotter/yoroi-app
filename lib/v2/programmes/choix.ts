/**
 * Le bon programme pour toi (24 octobre 2026) : quatre questions, des regles simples, aucun calcul cache.
 * Donnees pures, testees dans __tests__/unit/programmes.test.ts.
 *
 * 26 octobre 2026 : plusieurs objectifs (ReponsesMulti, testes dans __tests__/unit/modules.test.ts).
 *  1. Le programme de base vient d'UN objectif : le premier coche dans l'ordre PRIORITE_BASE. Les objectifs de
 *     musculation passent avant les objectifs specialises, qui deviennent plus facilement des modules
 *     (« Prendre du muscle » + « Grip » : un programme muscle, plus le module grip). Fessiers et ventre plat coches
 *     ensemble : le programme « Fessiers et ventre plat ». Le programme est celui de la regle a un objectif.
 *  2. Chaque objectif coche (base comprise) propose ses modules (MODULES_OBJECTIF), gardes seulement s'ils changent
 *     quelque chose au programme (modules.ts, moduleUtile) ; pas de cardio en plus si le programme a deja ses seances
 *     de cardio ; pas de force pour qui debute.
 *  3. Un objectif qui n'est ni la base ni un module possible (course, sac, foot...) ajoute son programme dans `autres`.
 */
import { programmeParId } from './catalogue';
import { moduleUtile } from './modules';
import type { ModuleId } from './modules';
import type { Materiel, Niveau } from './types';

export type ObjectifChoix =
  | 'debuter'
  | 'muscle'
  | 'masse'
  | 'pecs'
  | 'force'
  | 'fessiers'
  | 'ventre'
  | 'fessiers_ventre'
  | 'perte'
  | 'seche'
  | 'course'
  | 'combat'
  | 'sac'
  | 'grip'
  | 'foot'
  | 'raquette'
  | 'mobilite'
  | 'forme';

/** Libellés du quiz, dans l'ordre d'affichage */
export const OBJECTIFS_CHOIX: { key: ObjectifChoix; label: string }[] = [
  // 26 octobre 2026 : pour qui n'y connait rien (combien de poids, de series, de repetitions)
  { key: 'debuter', label: 'Je n’y connais rien' },
  { key: 'perte', label: 'Perdre du poids' },
  { key: 'ventre', label: 'Ventre plat' },
  { key: 'seche', label: 'Être tracé' },
  { key: 'masse', label: 'Prendre du poids' },
  { key: 'muscle', label: 'Prendre du muscle' },
  { key: 'pecs', label: 'Je stagne, les pecs' },
  { key: 'fessiers', label: 'Fessiers' },
  { key: 'fessiers_ventre', label: 'Fessiers et ventre plat' },
  { key: 'force', label: 'Force' },
  { key: 'course', label: 'Courir' },
  { key: 'combat', label: 'Sport de combat' },
  { key: 'sac', label: 'Sac de frappe' },
  { key: 'grip', label: 'Grip judo et JJB' },
  { key: 'foot', label: 'Football' },
  { key: 'raquette', label: 'Padel et raquette' },
  { key: 'mobilite', label: 'Souplesse et mobilité' },
];

export type Reponses = {
  objectif: ObjectifChoix;
  niveau: Niveau;
  /** jours par semaine que tu peux donner a la muscu */
  jours: 2 | 3 | 4 | 5 | 6;
  lieu: Materiel;
};

export type Conseil = {
  /** programme conseille */
  id: string;
  /** pourquoi, en une phrase */
  pourquoi: string;
  /** autres programmes qui te vont aussi */
  autres: string[];
  /** 26 octobre 2026 : proposer « Trouver ton poids de départ » (lib/v2/programmes/charge.ts, POIDS_DE_DEPART) */
  guideDebutant?: boolean;
};

export const DEBUTANT = 'Au début, travailler tout le corps deux à trois fois par semaine est la recommandation de l’ACSM.';

/** Plusieurs objectifs (26 octobre 2026) : l'ordre de la liste ne compte pas, PRIORITE_BASE decide */
export type ReponsesMulti = Omit<Reponses, 'objectif'> & { objectifs: ObjectifChoix[] };

export type ConseilMulti = Conseil & {
  /** l'objectif qui a donne le programme de base */
  objectif: ObjectifChoix;
  /** modules proposes, deja coches dans le questionnaire */
  modules: ModuleId[];
};

/** Quel objectif donne le programme de base, du plus prioritaire au moins prioritaire */
export const PRIORITE_BASE: ObjectifChoix[] = [
  'debuter', 'muscle', 'masse', 'pecs', 'fessiers_ventre', 'fessiers', 'force', 'seche', 'perte', 'ventre',
  'combat', 'sac', 'foot', 'raquette', 'course', 'grip', 'mobilite', 'forme',
];

/** Les modules qu'un objectif propose quand il n'est pas (ou pas seulement) le programme de base */
export const MODULES_OBJECTIF: Partial<Record<ObjectifChoix, ModuleId[]>> = {
  force: ['force'],
  grip: ['grip'],
  combat: ['cou'],
  ventre: ['abdos', 'cardio'],
  perte: ['cardio'],
  seche: ['cardio'],
  mobilite: ['mobilite'],
};

export function conseillerProgramme(r: Reponses): Conseil;
export function conseillerProgramme(r: ReponsesMulti): ConseilMulti;
export function conseillerProgramme(r: Reponses | ReponsesMulti): Conseil | ConseilMulti {
  return 'objectifs' in r ? conseillerPlusieurs(r) : conseillerUn(r);
}

function conseillerPlusieurs(r: ReponsesMulti): ConseilMulti {
  const choisis = new Set<ObjectifChoix>(r.objectifs.length ? r.objectifs : ['forme']);
  if (choisis.has('fessiers') && choisis.has('ventre')) choisis.add('fessiers_ventre');
  const objectif = PRIORITE_BASE.find((o) => choisis.has(o)) ?? 'forme';
  const niveau: Niveau = choisis.has('debuter') ? 'debutant' : r.niveau;
  const { objectifs: _o, ...reste } = r;
  const base = conseillerUn({ ...reste, niveau, objectif });
  const p = programmeParId(base.id);
  const aDuCardio = !!p?.jours.some((j) => j.cardio);
  const modules: ModuleId[] = [];
  const autres: string[] = [];
  for (const o of PRIORITE_BASE) {
    if (!choisis.has(o) || o === 'fessiers_ventre') continue;
    const proposes = (MODULES_OBJECTIF[o] ?? []).filter((m) => p && moduleUtile(p, m) && !(m === 'cardio' && aDuCardio) && !(m === 'force' && niveau === 'debutant'));
    for (const m of proposes) if (!modules.includes(m)) modules.push(m);
    // ni la base ni un module : son propre programme te va aussi
    if (o !== objectif && !proposes.length && !(MODULES_OBJECTIF[o] ?? []).some((m) => modules.includes(m))) {
      const id = conseillerUn({ ...reste, niveau, objectif: o }).id;
      if (id !== base.id && !autres.includes(id)) autres.push(id);
    }
  }
  for (const id of base.autres) if (id !== base.id && !autres.includes(id)) autres.push(id);
  return { ...base, objectif, modules, autres };
}

function conseillerUn(r: Reponses): Conseil {
  // tu n'y connais rien : un programme debutant tout le corps, selon ton lieu, et le guide du poids de depart
  if (r.objectif === 'debuter') {
    if (r.lieu === 'maison') {
      return { id: 'maison-3j', pourquoi: 'Tu pars de zéro, sans matériel : tout le corps au poids du corps, trois fois par semaine. YOROI te dit combien de séries et de répétitions faire.', autres: [], guideDebutant: true };
    }
    if (r.lieu === 'halteres') {
      return { id: 'halteres-maison-3j', pourquoi: 'Tu pars de zéro, avec tes haltères : tout le corps, trois fois par semaine. YOROI te dit combien de séries et de répétitions faire, et quand monter la charge.', autres: ['maison-3j'], guideDebutant: true };
    }
    return {
      id: 'debutant-fullbody-3j',
      pourquoi: 'Tu pars de zéro : c’est le bon départ. Tout le corps, trois fois par semaine, des exercices simples et guidés. YOROI te dit combien de séries et de répétitions faire, et quand monter la charge.',
      autres: [],
      guideDebutant: true,
    };
  }
  // objectifs qui ne dependent pas du lieu : la course, et les objectifs dont le programme s'adapte a ton materiel
  if (r.objectif === 'course') {
    return r.niveau === 'debutant'
      ? { id: 'course-5km-8sem', pourquoi: 'Course et marche en alternance, jusqu’à 30 minutes sans t’arrêter en 8 semaines, le plan d’une étude sur 532 débutants.', autres: [] }
      : { id: 'course-10km-8sem', pourquoi: 'Surtout du facile et un fractionné par semaine : la répartition qui a fait gagner 5 % sur 10 km à des coureurs loisir.', autres: ['course-5km-8sem'] };
  }
  if (r.objectif === 'foot') {
    return { id: 'foot-prevention-2j', pourquoi: 'Le Nordic curl et le gainage Copenhagen ont fait baisser les blessures des ischios et de l’aine chez les footballeurs, et les sauts font progresser le sprint.', autres: ['fullbody-2j', 'pp-ul-4j', 'mobilite-3j'] };
  }
  if (r.objectif === 'raquette') {
    return { id: 'padel-raquette-2j', pourquoi: 'Épaule, coude, bas du dos et jambes : les zones qui souffrent le plus au padel, renforcées en deux séances.', autres: ['fullbody-2j', 'mobilite-3j'] };
  }
  if (r.objectif === 'mobilite') {
    return { id: 'mobilite-3j', pourquoi: 'Trois fois 20 minutes par semaine : s’étirer régulièrement fait gagner de l’amplitude en quelques semaines.', autres: [] };
  }
  if (r.objectif === 'perte' || r.objectif === 'ventre') {
    return {
      id: 'perte-poids-4j',
      pourquoi: r.objectif === 'ventre'
        ? 'Les abdos ne font pas fondre le ventre : le cardio et l’alimentation, si. La musculation garde ton muscle pendant ce temps.'
        : 'Alimentation et sport ensemble font perdre bien plus que le sport seul : deux séances de musculation, deux de marche.',
      autres: r.niveau === 'debutant' ? ['fessiers-ventre-4j', 'maison-3j'] : ['seche-4j', 'fessiers-ventre-4j'],
    };
  }
  if (r.objectif === 'fessiers_ventre') {
    return { id: 'fessiers-ventre-4j', pourquoi: 'Hip thrust et squat profond pour les fessiers, cardio pour le ventre : les deux en quatre jours.', autres: ['bas-du-corps-4j', 'perte-poids-4j'] };
  }
  if (r.objectif === 'masse') {
    return r.niveau === 'debutant'
      ? { id: 'debutant-fullbody-3j', pourquoi: 'Au début, tout le corps trois fois par semaine avec un surplus de 350 à 500 kcal : tu prendras vite.', autres: ['prise-de-masse-4j'] }
      : { id: 'prise-de-masse-4j', pourquoi: 'Chaque muscle deux fois par semaine avec beaucoup de séries, et un surplus raisonnable pour que le poids pris soit du muscle.', autres: ['haut-bas-4j'] };
  }
  if (r.objectif === 'pecs') {
    return r.niveau === 'debutant'
      ? { id: 'debutant-fullbody-3j', pourquoi: 'Au début, tout progresse avec un programme simple : les pectoraux aussi. Passe à la priorité pectoraux après quelques mois.', autres: ['pecs-priorite-4j'] }
      : { id: 'pecs-priorite-4j', pourquoi: 'Environ 17 séries de pectoraux par semaine, proches de l’échec, avec une progression notée : ce qui marche chez les pratiquants entraînés.', autres: ['haut-bas-4j', 'split-5j'] };
  }
  if (r.lieu === 'maison') {
    return { id: 'maison-3j', pourquoi: 'Sans matériel, chez toi : tout le corps, trois fois par semaine.', autres: [] };
  }
  if (r.lieu === 'halteres') {
    return { id: 'halteres-maison-3j', pourquoi: 'Avec tes haltères, chez toi : tout le corps, trois fois par semaine.', autres: ['maison-3j'] };
  }
  if (r.objectif === 'sac') {
    return r.niveau === 'debutant'
      ? { id: 'sac-debutant-3j', pourquoi: 'Trois séances de 6 rounds pour apprendre à frapper juste avant d’aller vite.', autres: ['sac-cardio-3j'] }
      : { id: 'sac-cardio-3j', pourquoi: 'Des rounds de 3 minutes comme en boxe amateur, avec des fractions explosives.', autres: ['sac-mma-3j', 'sac-hiit-4sem'] };
  }
  if (r.objectif === 'grip') {
    return { id: 'grip-2j', pourquoi: 'Deux séances courtes à côté du club pour tenir le kimono plus fort et plus longtemps.', autres: ['combat-force-2j'] };
  }
  if (r.objectif === 'fessiers' && r.niveau === 'debutant') {
    return { id: 'fessiers-ventre-4j', pourquoi: 'Hip thrust et squat profond deux fois par semaine : chez des femmes débutantes, ajouter le hip thrust a fait gagner 9 % aux fessiers en 10 semaines.', autres: ['bas-du-corps-4j'] };
  }
  if (r.objectif === 'seche') {
    return { id: 'seche-4j', pourquoi: 'Musculation pour garder ton muscle, cardio pour dépenser plus : avec un déficit raisonnable, c’est ce qui marche.', autres: r.niveau === 'debutant' ? ['debutant-fullbody-3j'] : ['haut-bas-4j'] };
  }
  if (r.objectif === 'combat') {
    return {
      id: 'combat-force-2j',
      pourquoi: 'Deux séances de force à côté de ton club : assez pour progresser sans voler l’énergie de tes entraînements.',
      autres: r.niveau === 'debutant' ? ['debutant-fullbody-3j', 'sac-debutant-3j'] : ['grip-2j', 'cou-combat-2j', 'sac-cardio-3j', 'force-3j', 'pp-ul-4j'],
    };
  }
  if (r.niveau === 'debutant') {
    const autres = r.jours === 2 ? ['fullbody-2j'] : r.objectif === 'force' ? ['force-3j'] : r.objectif === 'fessiers' ? ['bas-du-corps-4j'] : r.jours >= 5 ? ['split-5j'] : r.jours === 4 ? ['haut-bas-4j'] : [];
    return { id: 'debutant-fullbody-3j', pourquoi: DEBUTANT, autres };
  }
  if (r.jours === 2) {
    return { id: 'fullbody-2j', pourquoi: 'Deux jours : tout le corps à chaque séance, pour que chaque muscle travaille deux fois par semaine.', autres: ['combat-force-2j'] };
  }
  if (r.objectif === 'force') {
    return { id: 'force-3j', pourquoi: 'Pour la force : les gros mouvements, des charges lourdes, peu de répétitions et 3 minutes de repos.', autres: ['haut-bas-4j'] };
  }
  if (r.objectif === 'fessiers') {
    return r.jours >= 4
      ? { id: 'bas-du-corps-4j', pourquoi: 'Fessiers et jambes deux fois par semaine, avec plus de 12 séries directes pour les fessiers.', autres: ['haut-bas-4j'] }
      : { id: 'ppl-3j', pourquoi: 'Trois jours : une séance complète pour les jambes et les fessiers chaque semaine. Avec un quatrième jour, passe au programme fessiers et jambes.', autres: ['bas-du-corps-4j'] };
  }
  if (r.jours === 3) {
    return { id: 'ppl-3j', pourquoi: 'Trois jours : pousser, tirer, jambes. Chaque muscle a sa séance complète.', autres: ['debutant-fullbody-3j'] };
  }
  if (r.jours === 4) {
    return { id: 'haut-bas-4j', pourquoi: 'Quatre jours : haut et bas du corps, chaque muscle travaillé deux fois par semaine.', autres: ['pp-ul-4j', 'pp-pp-4j', 'bas-du-corps-4j', 'split-5j'] };
  }
  if (r.jours === 6) {
    return { id: 'ppl-6j', pourquoi: 'Six jours : pousser, tirer, jambes deux fois, un cycle force et un cycle hypertrophie. Chaque muscle travaille deux fois par semaine.', autres: ['split-5j', 'ppl-3j'] };
  }
  return { id: 'split-5j', pourquoi: 'Cinq jours : un groupe musculaire par jour, avec beaucoup de séries par muscle.', autres: ['ppl-ul-5j', 'haut-bas-4j'] };
}
