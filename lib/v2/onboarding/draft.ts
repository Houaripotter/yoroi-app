/**
 * Brouillon de l'onboarding : chaque reponse est gardee des qu'elle est donnee,
 * pour reprendre au bon ecran si l'app est fermee. Efface a la fin.
 * Version 4 (vague 27, 17 ecrans) : un brouillon v3 en cours est repris tel quel,
 * son ecran est converti vers la nouvelle numerotation.
 * Vague 45 : version 5, un ecran « Ton univers » apres Toi (ecran 3) ; un brouillon v4 en cours est repris,
 * ses ecrans a partir de l'Objectif sont decales d'un cran.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isChoixUnivers, type ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { CHOIX_RAPPELS_VIDE, type ChoixRappels } from '@/lib/v2/notifications/discipline';

export const DRAFT_KEY = '@yoroi_onboarding_draft_v3';

/** Ce qui a freine l'utilisateur jusqu'ici (ecran Frein, choix multiples) */
export type Frein = 'regularite' | 'progres' | 'motivation' | 'blessures' | 'programme' | 'rien';

/** Moment habituel de la pesee (ecran Pesee) ; 'heure' : une heure precise (peseeHeure) */
export type PeseeMoment = 'reveil' | 'douche' | 'midi' | 'soir' | 'heure' | 'inconnu';

export type Goal = 'lose' | 'gain' | 'combat' | 'maintain';

export type WeighInDone = {
  /** jour de la pesee enregistree (AAAA-MM-JJ) */
  date: string;
  weight: number;
  origin: 'manual' | 'health';
  /** 18 octobre 2026 : une pesee existait deja ce jour-la, elle a ete gardee et rien n'a ete ecrit */
  conservee?: boolean;
};

export type RewardLine = { label: string; amount: number };

export type Reward = {
  lines: RewardLine[];
  total: number;
  /** plaques du palier en cours apres la pesee (0 a 3, decimal) */
  platesAfter: number;
  platesBefore: number;
  rankName: string;
};

export type Draft = {
  v: 5;
  page: number;
  name: string;
  gender: 'homme' | 'femme' | null;
  /** objectif principal, deduit de goals (lib/v2/onboarding/objectifs.ts) pour les appelants qui n'en lisent qu'un */
  goal: Goal | null;
  /** vague 29 : tous les objectifs choisis (choix multiples avec compatibilites) */
  goals: Goal[];
  sports: string[];
  category: string | null;
  weight: number | null;
  weightOrigin: 'manual' | 'health';
  /** jour de la pesee reprise d'Apple Sante ou de Health Connect */
  healthDate: string | null;
  target: number | null;
  height: number | null;
  sessions: number | null;
  /** vague 28 : jours d'entrainement choisis, 0 = lundi a 6 = dimanche (sessions = leur nombre) */
  jours: number[];
  weighIn: WeighInDone | null;
  reward: Reward | null;
  freins: Frein[];
  peseeMoment: PeseeMoment | null;
  /** vague 28 : jours de pesee, 0 = lundi a 6 = dimanche */
  peseeJours: number[];
  /** vague 28 : heure precise de la pesee (HH:MM) quand peseeMoment vaut 'heure' */
  peseeHeure: string | null;
  /** vague 45 : univers choisi (Japon par defaut), enregistre a la fin avec le reste */
  univers: ChoixUnivers;
  /** 14 octobre 2026 : rappels de discipline choisis a l'ecran 7 (rien d'allume par defaut), appliques a la fin */
  rappels: ChoixRappels;
};

export const EMPTY_DRAFT: Draft = {
  v: 5,
  page: 0,
  name: '',
  gender: null,
  goal: null,
  goals: [],
  sports: [],
  category: null,
  weight: null,
  weightOrigin: 'manual',
  healthDate: null,
  target: null,
  height: null,
  sessions: null,
  jours: [],
  weighIn: null,
  reward: null,
  freins: [],
  peseeMoment: null,
  peseeJours: [],
  peseeHeure: null,
  univers: 'japon',
  rappels: CHOIX_RAPPELS_VIDE,
};

/** Ecrans de la version 3 (0 a 10) vers ceux de la version 4 (0 a 16) */
const PAGE_V3_TO_V4 = [0, 1, 2, 3, 6, 7, 9, 10, 10, 10, 10];
/** Vague 45 : ecran de la version 4 vers la version 5 (Ton univers insere en 3) */
const PAGE_V4_TO_V5 = (p: number) => (p >= 3 ? p + 1 : p);

/** Brouillon d'avant le 14 octobre 2026, ou abime : aucun rappel */
function rappelsValides(r: unknown): ChoixRappels {
  const x = r as Partial<ChoixRappels> | null | undefined;
  if (!x || typeof x !== 'object' || !x.seance || !x.pesee || !x.eau || !x.bilan) return CHOIX_RAPPELS_VIDE;
  return {
    seance: { ...CHOIX_RAPPELS_VIDE.seance, ...x.seance, actif: x.seance.actif === true },
    pesee: { ...CHOIX_RAPPELS_VIDE.pesee, ...x.pesee, actif: x.pesee.actif === true },
    eau: { actif: x.eau.actif === true },
    bilan: { actif: x.bilan.actif === true },
  };
}

export async function loadDraft(): Promise<Draft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Omit<Draft, 'v'>> & { v?: number };
    if (!d || (d.v !== 3 && d.v !== 4 && d.v !== 5)) return null;
    const pageV4 = d.v === 3 ? PAGE_V3_TO_V4[Math.max(0, Math.min(10, Number(d.page) || 0))] : Number(d.page) || 0;
    const page = d.v === 5 ? pageV4 : PAGE_V4_TO_V5(pageV4);
    return {
      ...EMPTY_DRAFT,
      ...d,
      v: 5,
      page,
      univers: isChoixUnivers(d.univers) ? d.univers : 'japon',
      sports: Array.isArray(d.sports) ? d.sports : [],
      // vague 29 : un brouillon d'avant n'a qu'un objectif
      goals: Array.isArray(d.goals) ? d.goals.filter((g): g is Goal => ['lose', 'gain', 'combat', 'maintain'].includes(g as string)) : d.goal ? [d.goal] : [],
      freins: Array.isArray(d.freins) ? d.freins : [],
      peseeMoment: d.peseeMoment ?? null,
      jours: Array.isArray(d.jours) ? d.jours.filter((j) => Number.isInteger(j) && j >= 0 && j <= 6) : [],
      peseeJours: Array.isArray(d.peseeJours) ? d.peseeJours.filter((j) => Number.isInteger(j) && j >= 0 && j <= 6) : [],
      peseeHeure: typeof d.peseeHeure === 'string' ? d.peseeHeure : null,
      rappels: rappelsValides(d.rappels),
    };
  } catch {
    return null;
  }
}

export async function saveDraft(d: Draft): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // stockage indisponible : l'onboarding continue en memoire
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch {
    // sans importance
  }
}
