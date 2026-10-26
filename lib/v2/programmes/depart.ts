/**
 * Le départ avec ton coach (26 octobre 2026), app/coach-depart.tsx. Houari : « Quand je clique sur Coach, il y a
 * un onboarding du coach pour poser les questions : qu'est-ce que je veux, quand je suis disponible. »
 * Rien de nouveau sur la science : le programme vient de conseillerProgramme (choix.ts, plusieurs objectifs, modules),
 * puis deux réglages simples, écrits ici et testés dans __tests__/unit/coachDepart.test.ts :
 *  1. Ton autre sport (combat, foot, course) compte comme un objectif de plus : le module Cou pour le combat,
 *     le programme du sport dans « Te va aussi ». Avec 4 jours ou plus en salle, hors débutant, un programme à deux
 *     séances de jambes devient « Push Pull + Upper Lower, jambes une fois » (pp-ul-4j), écrit pour ce cas
 *     dans le catalogue (« Pour ceux dont les jambes travaillent déjà ailleurs, au foot, en sport de combat ou en course »).
 *  2. Ton temps par séance : si le programme dure plus longtemps et qu'un programme de « Te va aussi » du même
 *     objectif, du même matériel et de ton niveau rentre dans ton temps, il le remplace ; sinon YOROI le dit
 *     (dureeTropLongue) et la séance express de la page du programme reste là (express.ts).
 * Tes jours : ceux que tu choisis (0 = lundi) ; aucun : les jours conseillés du programme (suivi.ts, joursConseilles).
 *
 * 26 octobre 2026 (Houari : « J'ai choisi cinq objectifs et il me propose un seul programme ») : propositionsDepart
 * rend 2 ou 3 programmes « Pour toi », chacun avec les objectifs qu'il couvre, par lui même ou par un module.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { programmeParId } from './catalogue';
import { MODULES_OBJECTIF, PRIORITE_BASE, conseillerProgramme } from './choix';
import type { ConseilMulti, ObjectifChoix, Reponses } from './choix';
import { joursValides } from './coach';
import { moduleUtile, normaliserModules } from './modules';
import type { ModuleId } from './modules';
import { joursConseilles } from './suivi';
import type { Materiel, Niveau, Programme } from './types';

/* ---------------------------------- le drapeau : le départ a eu lieu ---------------------------------- */
export const CLE_DEPART = 'yoroi_coach_depart_v1';
export type EtatDepart = 'fait' | 'plus_tard';

export async function lireDepart(): Promise<EtatDepart | null> {
  try {
    const v = await AsyncStorage.getItem(CLE_DEPART);
    return v === 'fait' || v === 'plus_tard' ? v : null;
  } catch {
    return null;
  }
}

export async function ecrireDepart(e: EtatDepart): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_DEPART, e);
  } catch {
    // rien a faire : le coach reproposera le départ
  }
}

/* ---------------------------------- les réponses ---------------------------------- */
export type TempsSeance = 30 | 45 | 60 | 75;
export const TEMPS_SEANCE: { key: TempsSeance; label: string }[] = [
  { key: 30, label: '30 min' },
  { key: 45, label: '45 min' },
  { key: 60, label: '60 min' },
  { key: 75, label: 'Plus d’une heure' },
];

export type AutreSport = 'combat' | 'foot' | 'course' | 'autre' | 'non';
export const AUTRES_SPORTS: { key: AutreSport; label: string }[] = [
  { key: 'non', label: 'Non' },
  { key: 'combat', label: 'Sport de combat' },
  { key: 'foot', label: 'Football' },
  { key: 'course', label: 'Course à pied' },
  { key: 'autre', label: 'Un autre sport' },
];

export type ReponsesDepart = {
  objectifs: ObjectifChoix[];
  /** absent : « Je n'y connais rien » (débutant) */
  niveau?: Niveau;
  /** tes jours, 0 = lundi ; vide : YOROI choisit */
  jours: number[];
  temps?: TempsSeance;
  sport?: AutreSport;
  lieu: Materiel;
};

export type ConseilDepart = ConseilMulti & {
  /** les jours à donner à demarrerProgramme */
  jours: number[];
  /** le programme dure plus que ton temps, rien de plus court ne convient : la séance express est là */
  dureeTropLongue: boolean;
  /** le programme a changé pour ton temps ou pour ton sport */
  change?: 'temps' | 'sport';
  /** une règle du programme qui parle de ton sport (match, club), à montrer telle quelle */
  principeSport?: string;
};

/** Ton sport à côté devient un objectif de plus */
export function objectifsAvecSport(objectifs: readonly ObjectifChoix[], sport?: AutreSport): ObjectifChoix[] {
  const out = [...objectifs];
  const o: ObjectifChoix | null = sport === 'combat' ? 'combat' : sport === 'foot' ? 'foot' : sport === 'course' ? 'course' : null;
  if (o && !out.includes(o)) out.push(o);
  return out;
}

/** Nombre de jours pour la règle (2 à 6) ; aucun jour choisi : 3, les jours conseillés les plus courants */
export function joursPourConseil(n: number): Reponses['jours'] {
  if (n <= 0) return 3;
  return Math.max(2, Math.min(6, n)) as Reponses['jours'];
}

/** Les programmes à deux séances de jambes ou plus, remplacés par pp-ul-4j quand ton sport fait travailler tes jambes */
const JAMBES_DEUX_FOIS = ['haut-bas-4j', 'pp-pp-4j', 'split-5j', 'ppl-ul-5j', 'ppl-6j'];
const MARGE_MIN = 5;

export function conseilDepart(r: ReponsesDepart): ConseilDepart {
  const debuter = r.objectifs.includes('debuter');
  const niveau: Niveau = debuter ? 'debutant' : r.niveau ?? 'debutant';
  const choisis = joursValides(r.jours);
  const base = conseillerProgramme({ objectifs: objectifsAvecSport(r.objectifs.length ? r.objectifs : ['forme'], r.sport), niveau, jours: joursPourConseil(choisis?.length ?? 0), lieu: r.lieu });
  let conseil: ConseilMulti = base;
  let change: ConseilDepart['change'];

  const remplacer = (p: Programme, pourquoi: string) => {
    const avant = conseil.id;
    conseil = {
      ...conseil,
      id: p.id,
      pourquoi,
      modules: conseil.modules.filter((m) => moduleUtile(p, m)),
      autres: [avant, ...conseil.autres.filter((x) => x !== p.id && x !== avant)],
    };
  };

  // 1. ton sport fait déjà travailler tes jambes
  const sportJambes = r.sport === 'foot' || r.sport === 'combat' || r.sport === 'course';
  const ppul = programmeParId('pp-ul-4j');
  if (sportJambes && ppul && niveau !== 'debutant' && r.lieu === 'salle' && (choisis?.length ?? 0) >= 4 && JAMBES_DEUX_FOIS.includes(conseil.id)) {
    remplacer(ppul, ppul.accroche);
    change = 'sport';
  }

  // 2. ton temps par séance
  let p = programmeParId(conseil.id);
  let dureeTropLongue = false;
  if (p && r.temps && r.temps < 75 && p.dureeMin > r.temps + MARGE_MIN) {
    const actuel = p;
    const court = conseil.autres
      .map((id) => programmeParId(id))
      .find((x): x is Programme => !!x && x.objectif === actuel.objectif && x.materiel === actuel.materiel && (niveau !== 'debutant' || x.niveau === 'debutant') && x.dureeMin <= r.temps! + MARGE_MIN);
    if (court) {
      remplacer(court, court.accroche);
      change = 'temps';
      p = court;
    } else dureeTropLongue = true;
  }

  // « Te va aussi » : ceux qui rentrent dans ton temps d'abord
  if (r.temps) {
    const t = r.temps;
    const rentre = (id: string) => ((programmeParId(id)?.dureeMin ?? 999) <= t + MARGE_MIN ? 0 : 1);
    conseil = { ...conseil, autres: [...conseil.autres].sort((a, b) => rentre(a) - rentre(b)) };
  }

  const principeSport = sportJambes && p ? p.principes.find((x) => /match|club/i.test(x)) : undefined;
  return {
    ...conseil,
    jours: choisis ?? (p ? joursConseilles(p.joursParSemaine) : joursConseilles(3)),
    dureeTropLongue,
    ...(change ? { change } : {}),
    ...(principeSport ? { principeSport } : {}),
  };
}

/* ---------------------------------- plusieurs objectifs : 2 ou 3 programmes « Pour toi » ---------------------------------- */

/** Les programmes du catalogue qui sont faits pour un objectif (en plus de celui que donne la règle à un objectif) */
const FAITS_POUR: Partial<Record<ObjectifChoix, (p: Programme) => boolean>> = {
  force: (p) => p.id === 'force-3j' || p.id === 'combat-force-2j',
  seche: (p) => ['seche-4j', 'perte-poids-4j'].includes(p.id),
  perte: (p) => ['perte-poids-4j', 'seche-4j', 'fessiers-ventre-4j'].includes(p.id),
  ventre: (p) => ['fessiers-ventre-4j', 'perte-poids-4j', 'seche-4j'].includes(p.id),
  fessiers: (p) => ['bas-du-corps-4j', 'fessiers-ventre-4j'].includes(p.id),
  fessiers_ventre: (p) => p.id === 'fessiers-ventre-4j',
  muscle: (p) => p.objectif === 'muscle',
  masse: (p) => p.objectif === 'muscle',
  pecs: (p) => p.id === 'pecs-priorite-4j',
  combat: (p) => p.objectif === 'combat',
  sac: (p) => p.id.startsWith('sac-'),
  grip: (p) => p.id === 'grip-2j',
  course: (p) => p.objectif === 'course',
  foot: (p) => p.id === 'foot-prevention-2j',
  raquette: (p) => p.id === 'padel-raquette-2j',
  mobilite: (p) => p.id === 'mobilite-3j',
};

export type Couverture = { objectif: ObjectifChoix; via: 'programme' | 'module'; module?: ModuleId };

export type Proposition = {
  id: string;
  /** le programme du conseil (le premier) */
  conseille: boolean;
  /** ce que le programme fait pour chacun de tes objectifs */
  couvre: Couverture[];
  /** les modules à cocher avec ce programme */
  modules: ModuleId[];
  /** pourquoi, en une phrase (la règle pour le premier, l'accroche du programme pour les autres) */
  pourquoi: string;
  jours: number[];
};

/** Le matériel du programme se fait là où tu t'entraînes */
const materielOk = (p: Programme, lieu: Materiel) => lieu === 'salle' || p.materiel === 'maison' || p.materiel === lieu;

/** Ce que ce programme fait pour tes objectifs, et les modules qui vont avec (mêmes règles que conseillerProgramme) */
export function couverture(p: Programme, objectifs: readonly ObjectifChoix[], niveau: Niveau, propre: Partial<Record<ObjectifChoix, string>> = {}): { couvre: Couverture[]; modules: ModuleId[] } {
  const aDuCardio = p.jours.some((j) => !!j.cardio);
  const couvre: Couverture[] = [];
  const modules: ModuleId[] = [];
  for (const o of objectifs) {
    if (o === 'debuter' || o === 'forme') continue;
    if (propre[o] === p.id || FAITS_POUR[o]?.(p)) {
      couvre.push({ objectif: o, via: 'programme' });
      continue;
    }
    const m = (MODULES_OBJECTIF[o] ?? []).find((x) => moduleUtile(p, x) && !(x === 'cardio' && aDuCardio) && !(x === 'force' && niveau === 'debutant'));
    if (m) {
      couvre.push({ objectif: o, via: 'module', module: m });
      if (!modules.includes(m)) modules.push(m);
    }
  }
  return { couvre, modules: normaliserModules(modules) };
}

/**
 * 2 ou 3 programmes pour tes objectifs : le conseil d'abord, puis, parmi ceux qui couvrent par eux mêmes au moins un
 * objectif que les programmes déjà retenus ne couvrent que par un module (ou pas du tout), celui qui couvre le plus
 * (2 points par objectif couvert par le programme, 1 par un module). Un seul objectif, ou « Je n'y connais rien » :
 * le conseil seul.
 */
export function propositionsDepart(r: ReponsesDepart, conseil: ConseilDepart, max = 3): Proposition[] {
  const debuter = r.objectifs.includes('debuter');
  const niveau: Niveau = debuter ? 'debutant' : r.niveau ?? 'debutant';
  const objectifs = PRIORITE_BASE.filter((o) => objectifsAvecSport(r.objectifs, r.sport).includes(o) && o !== 'debuter' && o !== 'forme');
  const choisis = joursValides(r.jours);
  const nJours = joursPourConseil(choisis?.length ?? 0);
  // le programme que la règle à un objectif donne pour chacun de tes objectifs
  const propre: Partial<Record<ObjectifChoix, string>> = {};
  for (const o of objectifs) propre[o] = conseillerProgramme({ objectif: o, niveau, jours: nJours, lieu: r.lieu }).id;

  const p0 = programmeParId(conseil.id);
  if (!p0) return [];
  const premier: Proposition = {
    id: p0.id,
    conseille: true,
    couvre: couverture(p0, objectifs, niveau, propre).couvre,
    modules: conseil.modules,
    pourquoi: conseil.pourquoi,
    jours: conseil.jours,
  };
  if (debuter || objectifs.length < 2) return [premier];

  const ids: string[] = [];
  for (const id of [...objectifs.map((o) => propre[o]!), ...conseil.autres]) if (id !== p0.id && !ids.includes(id)) ids.push(id);
  const candidats = ids
    .map((id) => programmeParId(id))
    .filter((p): p is Programme => !!p && materielOk(p, r.lieu) && !(niveau === 'debutant' && p.niveau === 'confirme'))
    .map((p) => ({ p, ...couverture(p, objectifs, niveau, propre) }));

  const out: Proposition[] = [premier];
  const parProgramme = new Set(premier.couvre.filter((x) => x.via === 'programme').map((x) => x.objectif));
  const score = (c: (typeof candidats)[number]) => c.couvre.reduce((s, x) => s + (x.via === 'programme' ? 2 : 1), 0);
  while (out.length < max) {
    let meilleur: (typeof candidats)[number] | null = null;
    let mieux = [0, 0];
    for (const c of candidats) {
      if (out.some((x) => x.id === c.p.id)) continue;
      const neufs = c.couvre.filter((x) => x.via === 'programme' && !parProgramme.has(x.objectif)).length;
      if (!neufs) continue;
      const s = score(c);
      if (s > mieux[1] || (s === mieux[1] && neufs > mieux[0])) {
        meilleur = c;
        mieux = [neufs, s];
      }
    }
    if (!meilleur) break;
    for (const x of meilleur.couvre) if (x.via === 'programme') parProgramme.add(x.objectif);
    out.push({
      id: meilleur.p.id,
      conseille: false,
      couvre: meilleur.couvre,
      modules: meilleur.modules,
      pourquoi: meilleur.p.accroche,
      jours: choisis ?? joursConseilles(meilleur.p.joursParSemaine),
    });
  }
  return out;
}
