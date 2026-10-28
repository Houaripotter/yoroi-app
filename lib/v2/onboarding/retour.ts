/**
 * Onboarding « retour » de la 3.0 (28 octobre 2026) : a la premiere ouverture apres la mise a jour, tout utilisateur
 * existant revoit l'onboarding, une seule fois. Logique pure, testee (__tests__/unit/onboardingRetour.test.ts).
 *
 * Regle absolue : aucune donnee existante n'est perdue ni ecrasee sans que la personne l'ait changee elle meme.
 *  - brouillonRetour : toutes les reponses sont preremplies avec ses vraies donnees ;
 *  - champsModifies : seulement ce qui differe des valeurs de depart ;
 *  - enregistrerRetour : n'ecrit que ces champs, jamais une valeur vide a la place d'une valeur existante.
 *    Seances, pesees, XP, rangs, coffres, records, clubs, pratiques, programmes et photos ne sont jamais touches ;
 *  - marquerRetourVu : « Plus tard », le drapeau seulement, rien d'autre n'est ecrit.
 * Les acces a l'appareil passent par des ports (branches dans retourAppareil.ts).
 */
import type { Draft, Goal } from './draft';
import { EMPTY_DRAFT, genreDeCalcul } from './draft';
import { brouillonPrerempli, profilFusionne, type ProfilExistant } from './fusion';
import { objectifPrincipal, objectifsDuBrouillon, weightGoalDe } from './objectifs';
import { CHOIX_RAPPELS_VIDE, type ChoixRappels } from '@/lib/v2/notifications/discipline';
import { choixUniversDe, type ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';

/** Version de l'onboarding vue par l'utilisateur ; inferieure a VERSION_ONBOARDING : il le revoit une fois */
export const ONBOARDING_VU_VERSION_KEY = '@yoroi_onboarding_vu_version';
/** La version de l'app (app.json) qui fait revoir l'onboarding */
export const VERSION_ONBOARDING = '3.0.0';
const NOUVEAUTES_30_KEY = '@yoroi_nouveautes_3_0_vues';
const TOUR_DONE_KEY = '@yoroi_onboarding_tour_done';

/** Compare deux versions « 3.0.0 » : negatif si a < b */
export function comparerVersions(a: string, b: string): number {
  const pa = String(a).split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Vrai : utilisateur existant qui n'a pas encore vu l'onboarding de cette version.
 * versionVue : null si la cle est absente, undefined si la lecture a echoue (prudence : on ne montre rien).
 */
export function doitRevoirOnboarding(e: { existant: boolean; lectureRatee: boolean; demo?: boolean; versionVue: string | null | undefined }): boolean {
  if (!e.existant || e.lectureRatee || e.demo) return false;
  if (e.versionVue === undefined) return false;
  return e.versionVue == null || comparerVersions(e.versionVue, VERSION_ONBOARDING) < 0;
}

export type EspaceLu = {
  scene?: string;
  sceneFixe?: string;
  personnage?: string;
  univers?: 'japon' | 'classique';
  sportsFavoris?: string[];
  objectifSemaine?: number;
  objectifChoisi?: boolean;
  joursSemaine?: number[];
  freins?: string[];
  objectifs?: Goal[];
} | null;

export type HabitudeLue = { moment: Draft['peseeMoment']; actif: boolean; jours?: number[]; heure?: string | null } | null;

export type SourcesRetour = {
  settings: Parameters<typeof brouillonPrerempli>[1]['settings'];
  profile: ProfilExistant | null;
  espace: EspaceLu;
  /** la pesee la plus recente */
  derniere: { weight: number } | null;
  habitude: HabitudeLue;
  /** la categorie de poids deja choisie (mode competiteur) */
  categorie?: string | null;
};

const jsVersLundi = (j: number) => (j + 6) % 7;
const GOALS: Goal[] = ['lose', 'gain', 'combat', 'maintain'];

/** Toutes les reponses preremplies avec les vraies donnees */
export function brouillonRetour(src: SourcesRetour): Draft {
  const base = brouillonPrerempli({ ...EMPTY_DRAFT }, { settings: src.settings, profile: src.profile });
  const e = src.espace ?? {};
  const goals = Array.isArray(e.objectifs) && e.objectifs.length ? e.objectifs.filter((g) => GOALS.includes(g)) : base.goals;
  const jours = Array.isArray(e.joursSemaine) ? e.joursSemaine.filter((j) => Number.isInteger(j) && j >= 0 && j <= 6) : [];
  const sessions = jours.length || (e.objectifChoisi === true && e.objectifSemaine ? e.objectifSemaine : null);
  const h = src.habitude;
  const w = src.derniere?.weight;
  return {
    ...base,
    page: 0,
    goals,
    goal: goals.length ? objectifPrincipal(goals) : base.goal,
    sports: Array.isArray(e.sportsFavoris) ? [...e.sportsFavoris] : [],
    category: src.categorie ?? null,
    weight: typeof w === 'number' && w > 0 ? Math.round(w * 10) / 10 : null,
    weightOrigin: 'manual',
    jours,
    sessions,
    freins: (Array.isArray(e.freins) ? e.freins : []) as Draft['freins'],
    univers: choixUniversDe(src.espace as never),
    scene: e.sceneFixe ?? e.scene ?? null,
    peseeMoment: h?.moment ?? null,
    peseeJours: Array.isArray(h?.jours) ? (h?.jours ?? []).map(jsVersLundi).sort((a, b) => a - b) : [],
    peseeHeure: h?.heure ?? null,
    rappels: CHOIX_RAPPELS_VIDE,
  };
}

export type Champ =
  | 'name' | 'genre' | 'trancheAge' | 'height' | 'target' | 'goals' | 'category' | 'sports'
  | 'jours' | 'freins' | 'univers' | 'scene' | 'pesee_habitude' | 'rappels';

const meme = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const trie = (l: readonly (string | number)[]) => [...l].sort();

/** Les champs que la personne a reellement modifies (compares aux valeurs de depart) */
export function champsModifies(depart: Draft, fin: Draft): Champ[] {
  const out: Champ[] = [];
  if (fin.name.trim() !== depart.name.trim()) out.push('name');
  if (fin.gender !== depart.gender || (fin.gender === 'autre' && fin.genreRepere !== depart.genreRepere)) out.push('genre');
  if (fin.trancheAge !== depart.trancheAge) out.push('trancheAge');
  if (!meme(fin.height, depart.height)) out.push('height');
  if (!meme(fin.target, depart.target)) out.push('target');
  if (!meme(trie(objectifsDuBrouillon(fin)), trie(objectifsDuBrouillon(depart)))) out.push('goals');
  if (fin.category !== depart.category) out.push('category');
  if (!meme(fin.sports, depart.sports)) out.push('sports');
  if (!meme(trie(fin.jours), trie(depart.jours))) out.push('jours');
  if (!meme(trie(fin.freins), trie(depart.freins))) out.push('freins');
  if (fin.univers !== depart.univers) out.push('univers');
  if ((fin.scene ?? null) !== (depart.scene ?? null)) out.push('scene');
  if (fin.peseeMoment !== depart.peseeMoment || !meme(trie(fin.peseeJours), trie(depart.peseeJours)) || (fin.peseeHeure ?? null) !== (depart.peseeHeure ?? null)) out.push('pesee_habitude');
  if (!meme(fin.rappels, depart.rappels)) out.push('rappels');
  return out;
}

/** Ecran Poids du mode retour : une pesee seulement si la personne a bouge la valeur et qu'elle differe */
export function peseeRetourAEcrire(departPoids: number | null, poids: number | null, touche: boolean): boolean {
  if (!touche || poids == null || !(poids > 0)) return false;
  return departPoids == null || Math.abs(poids - departPoids) >= 0.05;
}

export type PortsRetour = {
  getProfile: () => Promise<ProfilExistant | null>;
  saveProfile: (p: ProfilExistant) => Promise<unknown>;
  getSettingsStrict: () => Promise<unknown>;
  saveSettings: (s: Record<string, unknown>) => Promise<unknown>;
  saveEspace: (patch: Record<string, unknown>) => Promise<unknown>;
  choisirUnivers: (u: ChoixUnivers, g: 'h' | 'f') => Promise<unknown>;
  setUserMode: (m: 'competiteur' | 'loisir') => Promise<unknown>;
  setUserSport: (s: string) => Promise<unknown>;
  setUserWeightCategory: (c: string) => Promise<unknown>;
  saveHabitudePesee: (h: { moment: Draft['peseeMoment']; actif: boolean; jours: number[]; heure: string | null }) => Promise<unknown>;
  appliquerRappels: (r: ChoixRappels, jours: number[]) => Promise<unknown>;
  ecrireIllustrations: (s: 'encre' | 'stickers') => Promise<unknown>;
  setItem: (k: string, v: string) => Promise<void>;
  /** sport de categorie ou de combat parmi les sports choisis */
  sportDeCombat?: (sports: string[]) => string | null;
  today: () => string;
};

/** « Plus tard » ou fin : le drapeau (et les nouveautes de la 3.0, deja contenues dans l'onboarding) */
export async function marquerRetourVu(p: Pick<PortsRetour, 'setItem'>): Promise<void> {
  await p.setItem(ONBOARDING_VU_VERSION_KEY, VERSION_ONBOARDING).catch(() => undefined);
  await p.setItem(NOUVEAUTES_30_KEY, 'true').catch(() => undefined);
  await p.setItem(TOUR_DONE_KEY, 'true').catch(() => undefined);
}

const lundiVersJs = (j: number) => (j + 1) % 7;

/**
 * L'enregistrement final du mode retour : seulement les champs modifies, fusionnes sur l'existant.
 * Le profil est relu strictement : si la lecture echoue, rien n'est ecrit (l'erreur remonte).
 */
export async function enregistrerRetour(depart: Draft, fin: Draft, p: PortsRetour): Promise<Champ[]> {
  const ch = champsModifies(depart, fin);
  const a = (c: Champ) => ch.includes(c);
  const name = fin.name.trim();
  const genre = genreDeCalcul(fin);
  const objectifs = objectifsDuBrouillon(fin);

  // ── Profil : seulement les champs modifies, sur la ligne existante ──
  const champsProfil = (a('name') && name) || (a('genre') && genre) || (a('height') && fin.height) || (a('target') && fin.target) || (a('goals') && objectifs.length);
  if (champsProfil) {
    const existing = await p.getProfile();
    if (existing) {
      await p.saveProfile({
        ...existing,
        ...(a('name') && name ? { name } : {}),
        ...(a('genre') && genre ? { avatar_gender: genre } : {}),
        ...(a('height') && fin.height ? { height_cm: fin.height } : {}),
        ...(a('target') && fin.target ? { target_weight: fin.target } : {}),
        ...(a('goals') && objectifs.length ? { weight_goal: weightGoalDe(objectifs) } : {}),
      });
    } else if (name) {
      await p.saveProfile(profilFusionne(null, { name, gender: genre, height: fin.height, target: fin.target, startWeight: fin.weight ?? undefined, weightGoal: objectifs.length ? weightGoalDe(objectifs) : undefined, today: p.today() }));
    }
  }

  // ── Reglages du trousseau : seulement s'ils sont lisibles, seulement les cles modifiees ──
  const reglages: Record<string, unknown> = {};
  if (a('name') && name) reglages.username = name;
  if (a('genre')) {
    if (genre) reglages.gender = genre === 'femme' ? 'female' : 'male';
    else if (fin.gender === 'autre' && fin.genreRepere === 'neutre') reglages.gender = 'neutral';
    if (fin.gender) reglages.genreDeclare = fin.gender === 'autre' ? 'autre' : null;
  }
  if (a('trancheAge') && fin.trancheAge) reglages.trancheAge = fin.trancheAge;
  if (a('height') && fin.height) reglages.height = fin.height;
  if (a('target') && fin.target) reglages.targetWeight = fin.target;
  if (a('goals') && objectifs.length) reglages.goal = weightGoalDe(objectifs);
  if (Object.keys(reglages).length) {
    let lisibles = true;
    try {
      await p.getSettingsStrict();
    } catch {
      lisibles = false;
    }
    if (lisibles) await p.saveSettings(reglages);
  }

  // ── Mode competiteur : seulement si l'objectif combat ou la categorie ont change ──
  const combatAvant = objectifsDuBrouillon(depart).includes('combat');
  const combat = objectifs.includes('combat');
  if (a('goals') && combat !== combatAvant) await p.setUserMode(combat ? 'competiteur' : 'loisir');
  if (combat && (a('goals') || a('sports'))) {
    const sport = p.sportDeCombat?.(fin.sports) ?? null;
    if (sport && (a('sports') || combat !== combatAvant)) await p.setUserSport(sport);
  }
  if (a('category') && fin.category) await p.setUserWeightCategory(fin.category);

  // ── Espace : seulement les cles modifiees (jamais une liste videe a la place d'une liste remplie) ──
  const espace: Record<string, unknown> = {};
  if (a('sports') && (fin.sports.length || !depart.sports.length)) espace.sportsFavoris = fin.sports;
  if (a('goals') && objectifs.length) espace.objectifs = objectifs;
  if (a('freins') && fin.freins.length) espace.freins = fin.freins;
  if (a('jours') && fin.jours.length) {
    espace.joursSemaine = fin.jours;
    espace.objectifSemaine = fin.jours.length;
    espace.objectifChoisi = true;
  }
  if (Object.keys(espace).length) await p.saveEspace(espace);

  // ── Univers, personnage et scene ──
  if (a('univers') || (a('genre') && genre)) await p.choisirUnivers(fin.univers ?? 'japon', genre === 'femme' ? 'f' : 'h');
  if (a('scene') && fin.scene) await p.saveEspace({ scene: fin.scene });
  if (a('univers')) await p.ecrireIllustrations((fin.univers ?? 'japon') === 'japon' ? 'encre' : 'stickers').catch(() => undefined);

  // ── Habitude de pesee et rappels ──
  if (a('pesee_habitude') && fin.peseeMoment) {
    await p.saveHabitudePesee({
      moment: fin.peseeMoment,
      actif: fin.peseeMoment !== 'inconnu',
      jours: fin.peseeJours.map(lundiVersJs),
      heure: fin.peseeMoment === 'heure' ? fin.peseeHeure ?? '07:00' : null,
    });
  }
  if (a('rappels')) await p.appliquerRappels(fin.rappels, fin.jours).catch(() => undefined);

  await marquerRetourVu(p);
  return ch;
}
