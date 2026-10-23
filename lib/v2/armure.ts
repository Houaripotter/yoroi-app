/**
 * La Voie de l'Armure : XP, rangs, semaines réussies, ceintures et sceaux.
 * CONTRAT PARTAGE : ArmureState, getArmureState, ARMURE_CHANGED_EVENT, RANKS et rankFor
 * gardent leur forme. On ajoute des champs et des fonctions, on ne retire rien.
 *
 * Journal d'XP : lignes ajoutees une seule fois par cle (source + reference), stockees
 * dans AsyncStorage. Jamais de montant negatif : le total ne baisse jamais, meme si
 * une seance est supprimee. Le recalcul relit tout l'historique et n'ajoute que les
 * lignes absentes : il est idempotent et sert aussi a la reprise des anciens utilisateurs.
 *
 * Reprise v2 (meta.v = 2) : un rattrapage unique recredite tout ce qui est date d'avant le
 * jour de la premiere reprise, quelle que soit sa date d'enregistrement (restauration,
 * import, sortie du mode demo), et toutes les semaines réussies. Il se relance tout seul
 * quand une restauration arrive d'un coup, ou sur demande (requestArmureCatchup).
 * Les seances et pesees venues d'Apple Sante ou d'une montre sont toujours eligibles.
 *
 * Reprise v3 (meta.v = 3, vague 22) : decision de Houari, « ce qu'il y a de mieux » pour les
 * anciens utilisateurs. Un rattrapage unique recredite tout l'historique date d'avant le jour
 * de la reprise selon les regles actuelles, sans plafond de rang. Aucun rang ne descend :
 * si le rang deja vu (ou l'ancien rang de l'app d'avant) est plus haut que le rang
 * recalcule, une ligne de reprise complete l'XP jusqu'au seuil de ce rang.
 *
 * Date de depart (vague 46, decision de Houari) : le Dojo commence au premier lancement.
 * Un nouvel utilisateur repart a zero : rien de date d'avant ne rapporte d'XP, de semaine,
 * de lune, de record, de ceinture ou de sceau, en particulier l'historique d'Apple Sante ou
 * de Health Connect. Un ancien utilisateur (donnees YOROI d'avant, points de l'ancienne app,
 * sauvegarde restauree) garde son rang et ses donnees YOROI comptent ; son historique Sante
 * d'avant le depart ne compte pas. Une sauvegarde YOROI recente contient le journal d'XP :
 * la restauration le reprend tel quel, sans rien recrediter.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import {
  getCompetitions,
  getMeasurements,
  getPhotos,
  getProfile,
  getTrainings,
  getWeeklyPlan,
  getWeights,
} from '@/lib/database';
import type { Training } from '@/lib/database';
import { openDatabase } from '@/lib/database';
import { getSportCategory, getSportName } from '@/lib/sports';
import { ALL_IBJJF_COMPETITIONS } from '@/lib/competitions-ibjjf-2025';
import { ALL_CFJJB_COMPETITIONS } from '@/lib/competitions-cfjjb-2026';
import { logger } from '@/lib/security/logger';
import { getEspace, saveEspace } from '@/lib/v2/espace';
import { reprendreAncienAvatar } from '@/lib/v2/espace/personnage';
import { durationOf, mondayOf, tonnage } from '@/lib/v2/trainingWeek';
import { computeRecords as computeSessionRecords } from '@/lib/v2/seances/records';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';
import { devNow } from '@/lib/v2/creator/devClock';
import { LUNE, SEALS, SEALS_TOTAL, familyOf, sealById, sealDone } from '@/lib/v2/dojo/seals';
import type { SealContext, SealFamily } from '@/lib/v2/dojo/seals';
import { BELTS, beltFor } from '@/lib/v2/dojo/belts';
import type { Belt } from '@/lib/v2/dojo/belts';
import { traduire, traduirePluriel, DECIMAL, LOCALE } from '@/lib/i18n/tr';

// ============================================================
// Contrat
// ============================================================

export type RankId = 'ashigaru' | 'bushi' | 'samourai' | 'ronin' | 'shogun';

export type ArmureRank = {
  id: RankId;
  name: string;
  index: number; // 0 a 4
  minXp: number;
  nextMinXp: number | null;
  kanji?: string;
  /** piece d'armure gagnee a ce rang */
  piece?: string;
  /** apres Shogun : 1er dan, 2e dan... (0 avant) */
  dan?: number;
};

export type ArmureSeal = { id: string; name: string; earnedAt: string; kanji?: string; family?: SealFamily };

export type PauseKind = 'repos' | 'blessure' | 'malade';

export type WeekStatusKind = 'tenue' | 'protegee' | 'manquee' | 'pause' | 'en_cours';

export type WeekStatus = {
  monday: string;
  count: number;
  goal: number;
  status: WeekStatusKind;
  pauseKind?: PauseKind;
  /** semaine réussie juste apres une pause ou un bouclier : veine d'or kintsugi */
  gold: boolean;
};

export type NextGoal = {
  kind: 'semaine' | 'ceinture' | 'sceau' | 'rang' | 'debut';
  title: string;
  detail: string;
  href: string;
};

export type BeltInfo = {
  sport: string;
  sportName: string;
  count: number;
  belt: Belt;
  next: Belt | null;
  remaining: number;
  progress: number;
};

export type ArmureState = {
  xp: number;
  rank: ArmureRank;
  weekStreak: number; // semaines d'affilee avec l'objectif tenu
  shields: number; // boucliers qui protegent la serie
  thisWeekSessions: number;
  weeklyGoal: number;
  recentSeals: ArmureSeal[];
  // ajouts de l'agent Dojo
  bestStreak?: number;
  weeks?: WeekStatus[];
  pauseThisWeek?: PauseKind | null;
  goldenVein?: boolean;
  sealsCount?: number;
  sealsTotal?: number;
  topBelts?: BeltInfo[];
  nextGoals?: NextGoal[];
  /** 0 a 1 vers le rang suivant */
  rankProgress?: number;
  xpToNext?: number | null;
  /** nombre de seances par sport (id lib/sports.ts) */
  sportCounts?: Record<string, number>;
  isNewUser?: boolean;
  // ajouts vague 14
  /** nom complet du rang, dan compris (« Shōgun, 2e dan ») */
  rankTitle?: string;
  /** palier suivant : rang ou dan */
  nextStep?: { name: string; minXp: number; fromXp: number } | null;
  /** plaques d'armure du palier en cours : 3 par rang, une a chaque tiers */
  plates?: { earned: number; total: number; progress: number };
  /** nombre de Lunes du mois gagnees */
  lunes?: number;
  /** geste du jour (seance, pesee ou hydratation) */
  gesteToday?: { done: boolean; kind: 'seance' | 'pesee' | 'hydratation' | null; xp: number };
  /** XP d'une semaine réussie avec l'objectif actuel */
  weekXp?: number;
  /** vrai quand l'utilisateur a choisi lui-meme son objectif de seances (sinon : pas de « x sur objectif » a l'ecran) */
  goalChosen?: boolean;
  // vague 47
  /** serie de jours d'affilee avec un geste */
  serie?: { jours: number; record: number; aSauver: boolean; semaine: JourSerie[] };
  /** coffre du jour : verrouille (pas encore de geste), pret, ou ouvert (xp gagnee) */
  coffre?: { etat: 'verrouille' | 'pret' | 'ouvert'; xp: number; grand: boolean; grandDans: number; chance?: boolean };
};

export const ARMURE_CHANGED_EVENT = 'YOROI_ARMURE_CHANGED';

export const RANKS: Omit<ArmureRank, 'nextMinXp'>[] = [
  { id: 'ashigaru', name: 'Ashigaru', index: 0, minXp: 0, kanji: '足軽', piece: traduire('Tenue d’entraînement et bandeau') },
  { id: 'bushi', name: 'Bushi', index: 1, minXp: 300, kanji: '武士', piece: traduire('Kimono indigo et plastron') },
  { id: 'samourai', name: traduire('Samouraï'), index: 2, minXp: 2000, kanji: '侍', piece: traduire('Armure complète') },
  { id: 'ronin', name: 'Rōnin', index: 3, minXp: 7000, kanji: '浪人', piece: traduire('Cape et chapeau de paille') },
  { id: 'shogun', name: 'Shōgun', index: 4, minXp: 18000, kanji: '将軍', piece: traduire('Armure d’apparat noir et or') },
];

/** Apres Shogun, un dan tous les 4 000 XP. */
export const DAN_STEP = 4000;

export function danFor(xp: number): number {
  const top = RANKS[RANKS.length - 1].minXp;
  return xp >= top ? Math.floor((xp - top) / DAN_STEP) : 0;
}

export function danLabel(n: number): string {
  return n === 1 ? '1er dan' : `${n}e dan`;
}

export function rankFor(xp: number): ArmureRank {
  let r = RANKS[0];
  for (const k of RANKS) if (xp >= k.minXp) r = k;
  const next = RANKS[r.index + 1];
  return { ...r, nextMinXp: next ? next.minXp : null, dan: danFor(xp) };
}

/** Nom du rang avec son dan (« Shōgun, 1er dan »). */
export function rankTitle(rank: Pick<ArmureRank, 'name' | 'dan'>): string {
  return rank.dan ? `${rank.name}, ${danLabel(rank.dan)}` : rank.name;
}

/** Palier en cours : bornes basse et haute (rang suivant, puis dan suivant). */
function stepBounds(xp: number): { lo: number; hi: number; name: string } {
  const r = rankFor(xp);
  if (r.nextMinXp !== null) return { lo: r.minXp, hi: r.nextMinXp, name: RANKS[r.index + 1].name };
  const d = r.dan ?? 0;
  const lo = r.minXp + d * DAN_STEP;
  return { lo, hi: lo + DAN_STEP, name: `${r.name}, ${danLabel(d + 1)}` };
}

export function nextStepFor(xp: number): { name: string; minXp: number; fromXp: number } {
  const b = stepBounds(xp);
  return { name: b.name, minXp: b.hi, fromXp: b.lo };
}

export const PLATES_PER_RANK = 3;

/** Plaques du palier en cours : 0 a 2 gagnees, la troisieme est le passage au palier suivant. */
export function platesFor(xp: number): { earned: number; total: number; progress: number } {
  const b = stepBounds(xp);
  const progress = Math.max(0, Math.min(1, (xp - b.lo) / (b.hi - b.lo)));
  return { earned: Math.min(PLATES_PER_RANK - 1, Math.floor(progress * PLATES_PER_RANK)), total: PLATES_PER_RANK, progress };
}

/** Numero global de la derniere plaque gagnee depuis le debut (sert a la celebrer une fois). */
export function plateIndex(xp: number): number {
  let n = 0;
  for (let i = 0; i < RANKS.length - 1; i += 1) {
    const lo = RANKS[i].minXp;
    const hi = RANKS[i + 1].minXp;
    if (xp <= lo) return n;
    n += Math.floor((PLATES_PER_RANK * Math.min(xp - lo, hi - lo)) / (hi - lo));
  }
  const top = RANKS[RANKS.length - 1].minXp;
  if (xp > top) n += Math.floor((PLATES_PER_RANK * (xp - top)) / DAN_STEP);
  return n;
}

// ============================================================
// Regles d'XP
// ============================================================

export type XpSource =
  | 'seance'
  | 'pesee'
  | 'mensurations'
  | 'photo'
  | 'record'
  | 'semaine'
  | 'sceau'
  | 'migration'
  | 'lune'
  | 'geste'
  | 'reprise'
  | 'coffre';

/** semaine : valeur pour un objectif de 3 seances (voir weekXp) */
export const XP_VALUES = { seance: 20, pesee: 5, mensurations: 10, photo: 10, record: 15, semaine: 50, sceau: 25, lune: 25, geste: 5 } as const;

/** Une semaine réussie rapporte 20 XP plus 10 par seance visee. */
export function weekXp(goal: number): number {
  return 20 + 10 * Math.max(1, Math.min(7, Math.round(goal || 1)));
}

/**
 * Vague 47 : coffre du jour. Il s'ouvre dans le Dojo une fois le geste du jour fait (seance, pesee,
 * mensurations, photo ou eau notee). base + 1 XP par jour de serie (au plus bonusMax), et le grand
 * coffre tous les 7 jours d'affilee. Il remplace le geste du jour credite tout seul.
 */
export const COFFRE = { base: 5, bonusMax: 10, grand: 25 } as const;

export function coffreXp(serie: number, chance = false): { xp: number; grand: boolean; chance: boolean } {
  const n = Math.max(1, serie);
  const grand = n % 7 === 0;
  const part = COFFRE.base + Math.min(n - 1, COFFRE.bonusMax);
  return { xp: part * (chance ? 2 : 1) + (grand ? COFFRE.grand : 0), grand, chance };
}

/**
 * Coup de chance du coffre : environ un jour sur cinq, l'XP du coffre est doublee (le bonus du grand
 * coffre ne l'est pas). Tire une fois par jour et par appareil : rouvrir l'app ne change rien.
 */
function coupDeChance(day: string, graine: string): boolean {
  let h = 5381;
  const txt = `${day}|${graine}`;
  for (let i = 0; i < txt.length; i += 1) h = ((h * 33) ^ txt.charCodeAt(i)) >>> 0;
  return h % 5 === 0;
}

export type JourSerie = { date: string; etat: 'fait' | 'repos' | 'vide' | 'aujourdhui' | 'avenir' };

/**
 * Serie de jours : jours d'affilee avec un geste. Un jour manque par semaine (lundi a dimanche)
 * est pardonne tout seul. Aujourd'hui sans geste ne casse rien : la serie attend jusqu'a minuit.
 * floor : rien avant ce jour (date de depart d'un nouvel utilisateur).
 */
function computeSerie(active: Set<string>, today: string, floor: string | null): { jours: number; repos: Set<string> } {
  const repos = new Set<string>();
  const reposSemaines = new Set<string>();
  let d = active.has(today) ? today : addDays(today, -1);
  let jours = 0;
  let pendant: string | null = null;
  for (let guard = 0; guard < 1200; guard += 1) {
    if (floor && d < floor) break;
    if (active.has(d)) {
      jours += 1;
      if (pendant) {
        repos.add(pendant);
        pendant = null;
      }
      d = addDays(d, -1);
      continue;
    }
    if (pendant) break;
    const wk = mondayOf(d);
    if (reposSemaines.has(wk)) break;
    reposSemaines.add(wk);
    pendant = d;
    d = addDays(d, -1);
  }
  return { jours, repos };
}

/** Plafonds de la reprise de l'ancienne app */
const REPRISE_QUETES_MAX = 2000;
const REPRISE_BADGE_XP = 10;
const REPRISE_BADGES_MAX = 300;

export const XP_RULES: { source: XpSource; label: string; xp: number; limit: string }[] = [
  { source: 'seance', label: traduire('Séance enregistrée'), xp: XP_VALUES.seance, limit: traduire('2 par jour') },
  { source: 'pesee', label: traduire('Pesée'), xp: XP_VALUES.pesee, limit: traduire('1 par jour') },
  { source: 'mensurations', label: 'Mensurations', xp: XP_VALUES.mensurations, limit: traduire('1 par semaine') },
  { source: 'photo', label: traduire('Photo de progression'), xp: XP_VALUES.photo, limit: traduire('1 par semaine') },
  { source: 'record', label: 'Record personnel', xp: XP_VALUES.record, limit: traduire('3 par jour, avec un poids et des répétitions') },
  { source: 'semaine', label: traduire('Semaine réussie'), xp: XP_VALUES.semaine, limit: traduire('1 par semaine') },
  { source: 'sceau', label: traduire('Sceau débloqué'), xp: XP_VALUES.sceau, limit: traduire('une fois par sceau') },
  { source: 'lune', label: traduire('Lune du mois'), xp: XP_VALUES.lune, limit: traduire('3 semaines réussies dans le mois') },
  { source: 'coffre', label: traduire('Coffre du jour'), xp: COFFRE.base, limit: traduire("1 par jour, jusqu’à {0} avec ta série, +{1} au grand coffre tous les 7 jours", COFFRE.base + COFFRE.bonusMax, COFFRE.grand) },
];

/** Regles avec l'XP de semaine calculee pour ton objectif. */
export function xpRulesFor(goal: number): { source: XpSource; label: string; xp: number; limit: string }[] {
  return XP_RULES.map((r) =>
    r.source === 'semaine' ? { ...r, xp: weekXp(goal), limit: traduire(`1 par semaine, 20 XP plus 10 par séance visée`) } : r,
  );
}

export const SOURCE_LABELS: Record<XpSource, string> = {
  seance: traduire('Séances'),
  pesee: traduire('Pesées'),
  mensurations: 'Mensurations',
  photo: 'Photos',
  record: 'Records',
  semaine: traduire('Semaines réussies'),
  sceau: 'Sceaux',
  migration: traduire('Reprise de ton ancien rang'),
  lune: traduire('Lunes du mois'),
  geste: traduire('Gestes du jour'),
  reprise: traduire('Reprise de tes quêtes, défis et badges'),
  coffre: traduire('Coffres du jour'),
};

const SEANCES_PAR_JOUR = 2;
const RECORDS_PAR_JOUR = 3;
const ANTIDATE_JOURS = 7;
/** Lignes importees (Sante, montre) : synchronisation parfois en retard, fenetre plus large */
const ANTIDATE_IMPORT_JOURS = 30;

// ============================================================
// Stockage
// ============================================================

const LEDGER_KEY = 'yoroi_xp_ledger_v1';
const META_KEY = 'yoroi_armure_meta_v1';
const OLD_POINTS_KEY = '@yoroi_unified_total_points';
const OLD_RANK_THRESHOLDS = [0, 500, 2000, 5000, 10000];
const OLD_XP_KEYS = ['@yoroi_quests_state', '@yoroi_user_xp', '@yoroi_challenge_xp', '@yoroi_chest_xp_total', '@yoroi_login_bonus_xp_total'] as const;
const OLD_BADGES_KEY = '@yoroi_unlocked_badges';
const ESPACE_KEY = 'yoroi_espace_v1';
/** Anciens badges qui ont un sceau equivalent (pas de double comptage) */
const BADGE_TO_SEAL: Record<string, string> = { first_step: 'balance', photographer: 'appareil_photo' };

/** Ligne du journal d'XP (cles courtes pour un stockage compact). */
type LedgerRow = { k: string; d: string; s: XpSource; a: number; t: string; l: string };

export type XpEntry = { key: string; date: string; source: XpSource; ref: string; amount: number; createdAt: string; label: string };

/** Ce que la reprise a recupere, affiche une seule fois dans le Dojo. Uniquement des chiffres calcules. */
export type WelcomeSummary = {
  seances: number;
  pesees: number;
  records: number;
  semaines: number;
  quetesXp: number;
  badges: number;
  badgesXp: number;
  rankTitle: string;
  rankIndex: number;
  seals: number;
  mainSport: { name: string; level: string; count: number } | null;
  xp: number;
  /** nom du rang garde par la reprise quand le recalcul seul donnait moins */
  rankKept?: string | null;
};

type Meta = {
  v: 1 | 2 | 3;
  migratedAt: string | null;
  seals: Record<string, string>;
  pauses: Record<string, PauseKind>;
  goals: { from: string; goal: number }[];
  rankSeen: number;
  pendingSeals: string[];
  recap: boolean;
  // v2
  /** jour limite d'un rattrapage demande (restauration, sortie du mode demo) */
  catchupPending?: string | null;
  /** jour du dernier rattrapage fait */
  catchupDone?: string | null;
  danSeen?: number;
  plateSeen?: number;
  goalsRebuilt?: boolean;
  avatarDone?: boolean;
  welcome?: WelcomeSummary | null;
  welcomeSeen?: boolean;
  // vague 47
  /** jour ou l'utilisateur a touche son coffre : il s'ouvre au prochain calcul */
  coffreDemande?: string | null;
  /** plus longue serie de jours */
  serieRecord?: number;
  // vague 46
  /** premier jour du Dojo : rien d'importe date d'avant ne compte, rien du tout pour un nouveau */
  departDay?: string | null;
  /** ancien utilisateur : ses donnees YOROI d'avant le depart comptent */
  ancien?: boolean;
  /** sauvegarde restauree avant le premier calcul */
  restaure?: boolean;
};

const EMPTY_META: Meta = { v: 1, migratedAt: null, seals: {}, pauses: {}, goals: [], rankSeen: 0, pendingSeals: [], recap: false };

async function readLedger(): Promise<LedgerRow[]> {
  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    return Array.isArray(list) ? (list as LedgerRow[]).filter((r) => r && typeof r.k === 'string' && r.a > 0) : [];
  } catch {
    return [];
  }
}

async function writeLedger(rows: LedgerRow[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(rows));
  } catch (e) {
    logger.warn('[Armure] ecriture du journal impossible', e);
  }
}

async function readMeta(): Promise<Meta> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (!raw) return { ...EMPTY_META, seals: {}, pauses: {}, goals: [], pendingSeals: [] };
    return { ...EMPTY_META, ...(JSON.parse(raw) as Partial<Meta>) };
  } catch {
    return { ...EMPTY_META, seals: {}, pauses: {}, goals: [], pendingSeals: [] };
  }
}

async function writeMeta(m: Meta): Promise<void> {
  try {
    await AsyncStorage.setItem(META_KEY, JSON.stringify(m));
  } catch (e) {
    logger.warn('[Armure] ecriture des reglages impossible', e);
  }
}

// ============================================================
// Dates
// ============================================================

const p2 = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
/** Jour courant ; suit l'horloge de developpement du Studio (mode createur seulement) */
export const todayIso = () => isoOf(devNow());
function addDays(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoOf(d);
}
/** Horodatage au format SQLite (UTC), comparable a created_at. */
const nowStamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const dayOf = (s?: string) => (s ?? '').slice(0, 10);

const stampOf = (ms: number) => new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
const normStamp = (s?: string) => (s ? s.replace('T', ' ').slice(0, 19) : null);

/** Ligne venue d'Apple Sante, Health Connect, d'une montre ou d'une balance. */
function isImported(row: { healthkit_uuid?: string | null; source?: string | null }): boolean {
  if (row.healthkit_uuid) return true;
  const s = (row.source ?? '').trim().toLowerCase();
  return !!s && s !== 'manual' && s !== 'manuel';
}

type EligCtx = { migratedAt: string | null; cutoff: string | null };

/**
 * Antidater : XP accordee seulement si la date est dans les 7 jours avant l'enregistrement.
 * Exceptions : premier calcul, lignes importees (Sante, montre), lignes creees avant la reprise,
 * et pendant un rattrapage tout ce qui est date d'avant le jour limite.
 */
function eligible(date: string, createdAt: string | undefined, ctx: EligCtx, imported = false): boolean {
  if (!ctx.migratedAt) return true;
  if (ctx.cutoff && dayOf(date) < ctx.cutoff) return true;
  const created = normStamp(createdAt);
  if (created && created <= ctx.migratedAt) return true;
  const ref = created ? dayOf(created) : todayIso();
  // une seance saisie a la main dans Sante avec une vieille date ne passe pas non plus
  return dayOf(date) >= addDays(ref, -(imported ? ANTIDATE_IMPORT_JOURS : ANTIDATE_JOURS));
}

function median(list: number[]): number {
  if (!list.length) return 0;
  const a = [...list].sort((x, y) => x - y);
  return a[Math.floor((a.length - 1) / 2)];
}

function parseNum(raw: string | null | undefined): number {
  const n = parseInt(raw ?? '0', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Somme des XP de l'ancienne app : quetes, defis, coffres et bonus de connexion. */
function oldXpSum(values: (string | null)[]): number {
  let total = 0;
  values.forEach((raw, i) => {
    if (!raw) return;
    if (i === 0) {
      try {
        const st = JSON.parse(raw) as { totalXp?: unknown };
        const v = Number(st?.totalXp);
        if (Number.isFinite(v) && v > 0) total += Math.round(v);
      } catch {
        // format inattendu : ignore
      }
      return;
    }
    total += parseNum(raw);
  });
  return total;
}

function oldBadges(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    const ids = list
      .map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string' ? (x as { id: string }).id : null))
      .filter((x): x is string => !!x);
    return Array.from(new Set(ids));
  } catch {
    return [];
  }
}

/** Noms des competitions importees automatiquement (IBJJF, CFJJB) : elles ne comptent pas seules. */
let importedCompNames: Set<string> | null = null;
function importedNames(): Set<string> {
  if (!importedCompNames) {
    const list = [...(ALL_IBJJF_COMPETITIONS as { nom?: string }[]), ...(ALL_CFJJB_COMPETITIONS as { nom?: string }[])];
    importedCompNames = new Set(list.map((c) => (c.nom ?? '').trim().toLowerCase()).filter(Boolean));
  }
  return importedCompNames;
}

// ============================================================
// Familles de sports
// ============================================================

const MUSCU = new Set(['musculation', 'powerlifting', 'halterophilie', 'strongman', 'street_workout', 'calisthenics', 'body_pump', 'kettlebell']);
const RUNS = new Set(['running', 'trail', 'marathon', 'ultra_trail', 'sprint', 'course_haies', 'obstacle', 'athletisme']);
const YOGA = new Set(['yoga', 'pilates', 'stretching', 'mobilite', 'tai_chi', 'qi_gong', 'foam_roller', 'meditation', 'respiration', 'récupération', 'barre_au_sol']);

function roundsOf(t: Training): number {
  return Math.max(t.combat_rounds?.length ?? 0, Number(t.rounds) || 0);
}

// ============================================================
// Records personnels
// ============================================================

type RecordHit = { trainingId: number; date: string; createdAt?: string; exercise: string; label: string; plateau: boolean };

const fmtNum = (n: number) => String(Math.round(n * 10) / 10).replace('.', DECIMAL);

/**
 * Records du Dojo (vague 32) : MEME source que Seances, Records et Carnet (lib/v2/seances/records.ts,
 * seances dedoublonnees). Chaque tampon compte dans « records » (sceaux Poing et Rocher, bienvenue).
 * Les XP de record (15 XP, 3 par jour) restent reserves aux records de force (charge et repetitions) ;
 * les lignes deja gagnees ne sont jamais retirees (cle record:<seance>:<exercice> inchangee).
 */
function computeRecordStamps(sorted: Training[]): { hits: RecordHit[]; stamps: { date: string; trainingId: number | null }[] } {
  const res = computeSessionRecords(dedupeTrainings(sorted));
  const byId = new Map<number, Training>();
  sorted.forEach((t) => t.id && byId.set(t.id, t));
  const hits: RecordHit[] = [];
  const stamps: { date: string; trainingId: number | null }[] = [];
  for (const l of res.lines) {
    if (l.minor) continue;
    let lastImprove = l.history[0]?.date ?? '';
    let since = 0;
    for (const p of l.history) {
      if (!p.isRecord) {
        since += 1;
        continue;
      }
      stamps.push({ date: p.date, trainingId: p.trainingId ?? null });
      if (l.kind === 'force' && p.trainingId != null) {
        hits.push({
          trainingId: p.trainingId,
          date: p.date,
          createdAt: byId.get(p.trainingId)?.created_at,
          exercise: l.name,
          label: traduire("{0}, {1} kilos estimés", l.name, fmtNum(p.value)),
          plateau: !!lastImprove && lastImprove <= addDays(p.date, -90) && since >= 2,
        });
      }
      lastImprove = p.date;
      since = 0;
    }
  }
  hits.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { hits, stamps };
}

// ============================================================
// Semaines réussies
// ============================================================

function goalFor(monday: string, goals: Meta['goals']): number {
  let g = goals[0]?.goal ?? 3;
  for (const x of goals) if (x.from <= monday) g = x.goal;
  return g;
}

type WeeksResult = { weeks: WeekStatus[]; streak: number; best: number; shields: number; held: number; bridge: boolean; goldenVein: boolean };

function computeWeeks(trainings: Training[], meta: Meta, today: string): WeeksResult {
  const current = mondayOf(today);
  const counts = new Map<string, number>();
  let first: string | null = null;
  for (const t of trainings) {
    const d = dayOf(t.date);
    if (!d || d > today) continue;
    const m = mondayOf(d);
    counts.set(m, (counts.get(m) ?? 0) + 1);
    if (!first || m < first) first = m;
  }
  const res: WeeksResult = { weeks: [], streak: 0, best: 0, shields: 0, held: 0, bridge: false, goldenVein: false };
  if (!first) {
    const pk = meta.pauses[current];
    res.weeks.push({ monday: current, count: 0, goal: goalFor(current, meta.goals), status: pk ? 'pause' : 'en_cours', pauseKind: pk, gold: false });
    return res;
  }
  const floor = addDays(current, -7 * 520);
  let m = first < floor ? floor : first;
  let run = 0;
  let prevStatus: WeekStatusKind | null = null;
  let streakHasGold = false;
  let guard = 0;
  while (m <= current && guard < 600) {
    guard += 1;
    const count = counts.get(m) ?? 0;
    const goal = goalFor(m, meta.goals);
    const pk = meta.pauses[m];
    let status: WeekStatusKind;
    let gold = false;
    if (count >= goal) {
      status = 'tenue';
      res.held += 1;
      res.streak += 1;
      run += 1;
      if (run % 4 === 0) res.shields = Math.min(2, res.shields + 1);
      if (prevStatus === 'pause' || prevStatus === 'protegee') {
        gold = true;
        streakHasGold = true;
      }
      if (prevStatus === 'pause') res.bridge = true;
    } else if (pk) {
      status = 'pause';
    } else if (m === current) {
      status = 'en_cours';
    } else if (res.shields > 0) {
      status = 'protegee';
      res.shields -= 1;
      run = 0;
    } else {
      status = 'manquee';
      res.streak = 0;
      run = 0;
      streakHasGold = false;
    }
    res.best = Math.max(res.best, res.streak);
    res.weeks.push({ monday: m, count, goal, status, pauseKind: pk, gold });
    if (status !== 'en_cours') prevStatus = status;
    m = addDays(m, 7);
  }
  res.goldenVein = streakHasGold && res.streak > 0;
  return res;
}

// ============================================================
// Instantane complet
// ============================================================

export type SealView = {
  id: string;
  family: SealFamily;
  name: string;
  kanji: string;
  condition: string;
  earned: boolean;
  earnedAt: string | null;
  current: number;
  target: number;
};

export type ArmureSnapshot = {
  state: ArmureState;
  ledger: XpEntry[];
  belts: BeltInfo[];
  seals: SealView[];
  weeks: WeekStatus[];
  records: { trainingId: number; date: string; label: string }[];
};

let cached: ArmureSnapshot | null = null;
let cachedAt = 0;
let inflight: Promise<ArmureSnapshot> | null = null;
let dirty = false;

/** File d'attente : un seul acces a la fois au journal et aux reglages. */
let lock: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => undefined);
  return run;
}

function toEntry(r: LedgerRow): XpEntry {
  const i = r.k.indexOf(':');
  return { key: r.k, date: r.d, source: r.s, ref: i >= 0 ? r.k.slice(i + 1) : r.k, amount: r.a, createdAt: r.t, label: r.l };
}

async function safe<T>(f: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await f();
  } catch {
    return fallback;
  }
}

async function runSync(): Promise<ArmureSnapshot> {
  const today = todayIso();
  const [
    trainingsRaw,
    weights,
    measurements,
    photos,
    profile,
    competitions,
    plan,
    espace,
    meta,
    ledger,
    userMode,
    templatesRaw,
    oldPointsRaw,
    oldXpRaw,
    oldBadgesRaw,
    hydrationRaw,
    espaceRaw,
    combatCompIds,
  ] = await Promise.all([
    safe(() => getTrainings(), [] as Training[]),
    safe(() => getWeights(), []),
    safe(() => getMeasurements(), []),
    safe(() => getPhotos(), []),
    safe(() => getProfile(), null),
    safe(() => getCompetitions(), []),
    safe(() => getWeeklyPlan(), []),
    getEspace(),
    readMeta(),
    readLedger(),
    safe(() => AsyncStorage.getItem('@yoroi_user_mode'), null),
    safe(() => AsyncStorage.getItem('@yoroi_training_templates'), null),
    safe(() => AsyncStorage.getItem(OLD_POINTS_KEY), null),
    safe(() => AsyncStorage.multiGet([...OLD_XP_KEYS]).then((rows) => rows.map((r) => r[1])), [] as (string | null)[]),
    safe(() => AsyncStorage.getItem(OLD_BADGES_KEY), null),
    safe(() => AsyncStorage.getItem('@yoroi_hydration_log'), null),
    safe(() => AsyncStorage.getItem(ESPACE_KEY), null),
    safe(async () => {
      const db = await openDatabase();
      const rows = await db.getAllAsync<{ competition_id: number | null }>('SELECT competition_id FROM combats WHERE competition_id IS NOT NULL');
      return new Set(rows.map((r) => Number(r.competition_id)));
    }, new Set<number>()),
  ]);

  const firstRun = !meta.migratedAt;
  const stamp = nowStamp();
  const keys = new Set(ledger.map((r) => r.k));
  const added: LedgerRow[] = [];
  const add = (k: string, d: string, s: XpSource, a: number, l: string) => {
    if (a <= 0 || keys.has(k)) return;
    keys.add(k);
    added.push({ k, d, s, a, t: stamp, l });
  };

  const trainings = [...(trainingsRaw ?? [])]
    .filter((t) => t && t.date)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id ?? 0) - (b.id ?? 0)));
  const pastTrainings = trainings.filter((t) => dayOf(t.date) <= today);

  // ---------- Rattrapage : premier calcul, reprise v2 ou restauration ----------
  // Reprise v3 : une fois, tout l'historique d'avant aujourd'hui redevient eligible
  const v3Pass = !firstRun && (meta.v ?? 1) < 3;
  const rankSeenBefore = firstRun ? 0 : Math.max(0, Math.min(RANKS.length - 1, meta.rankSeen || 0));
  const danSeenBefore = firstRun ? 0 : Math.max(0, meta.danSeen ?? 0);
  let cutoff: string | null = null;
  if (v3Pass) cutoff = today;
  if (!firstRun && meta.catchupPending) cutoff = !cutoff || meta.catchupPending > cutoff ? meta.catchupPending : cutoff;

  const catchup = firstRun || !!cutoff;
  const limitDay = firstRun ? today : (cutoff as string | null) ?? today;
  const ectx: EligCtx = { migratedAt: meta.migratedAt, cutoff };

  // Ancien utilisateur : des seances YOROI (pas Sante) avant le jour limite, ou des points de l'ancienne app
  const quetesXp = oldXpSum(oldXpRaw ?? []);
  const badgeIds = oldBadges(oldBadgesRaw);
  const oldTrainings = pastTrainings.filter((t) => !isImported(t) && dayOf(t.date) < addDays(limitDay, -14)).length;
  const oldApp = quetesXp > 0 || badgeIds.length > 0 || parseNum(oldPointsRaw) > 0;
  const restoreRun = (!firstRun && !!meta.catchupPending) || !!meta.restaure;
  const legacy = oldTrainings >= 3 || oldApp || restoreRun;

  // Date de depart du Dojo, fixee une fois. Un appareil deja passe par cette version garde
  // le jour de son premier calcul.
  if (!meta.departDay) meta.departDay = firstRun ? today : dayOf(meta.migratedAt ?? '') || today;
  const departDay = meta.departDay;
  if (firstRun || v3Pass || restoreRun || meta.ancien === undefined) meta.ancien = !!meta.ancien || legacy;
  meta.restaure = false;
  const ancien = !!meta.ancien;
  /** ce qui compte dans le Dojo : tout depuis le depart, et avant seulement les donnees YOROI d'un ancien */
  const counts = (date: string, imported: boolean) => dayOf(date) >= departDay || (ancien && !imported);
  // une seance YOROI relue depuis Sante, ou vue par deux apps, ne compte qu'une fois
  const trainingsC = dedupeTrainings(trainings.filter((t) => counts(t.date, isImported(t))));
  const pastTrainingsC = trainingsC.filter((t) => dayOf(t.date) <= today);
  const weightsC = (weights ?? []).filter((w) => w && counts(dayOf(w.date), isImported(w)));
  const measurementsC = (measurements ?? []).filter((mz) => mz && counts(dayOf(mz.date), isImported(mz as { source?: string })));
  const photosC = (photos ?? []).filter((ph) => ph && counts(dayOf(ph.date), false));

  // Seances par semaine (pour les objectifs)
  const weekCounts = new Map<string, number>();
  for (const t of pastTrainingsC) {
    const m = mondayOf(dayOf(t.date));
    weekCounts.set(m, (weekCounts.get(m) ?? 0) + 1);
  }
  const currentMonday = mondayOf(today);
  const firstMonday = pastTrainingsC.length ? mondayOf(dayOf(pastTrainingsC[0].date)) : currentMonday;
  const mondaysBetween = (from: string, to: string): string[] => {
    const out: string[] = [];
    let m = from < addDays(to, -7 * 520) ? addDays(to, -7 * 520) : from;
    while (m < to && out.length < 600) {
      out.push(m);
      m = addDays(m, 7);
    }
    return out;
  };

  // Reprise v3 : la bienvenue (YOROI a change, historique converti) se montre une fois de plus
  if (v3Pass && legacy) {
    meta.welcome = null;
    meta.welcomeSeen = false;
  }

  // Objectif initial d'un ancien utilisateur : mediane de ses 8 dernieres semaines
  let goalNow = Math.max(1, Math.min(7, Math.round(espace.objectifSemaine || 3)));
  let espaceStored: { objectifChoisi?: boolean; objectifSemaine?: number } = {};
  try {
    espaceStored = espaceRaw ? (JSON.parse(espaceRaw) as typeof espaceStored) : {};
  } catch {
    espaceStored = {};
  }
  if (catchup && legacy && !meta.goalsRebuilt && !espaceStored.objectifChoisi && goalNow === 3) {
    const last8 = mondaysBetween(addDays(currentMonday, -56), currentMonday).map((m) => weekCounts.get(m) ?? 0);
    const g = Math.max(1, Math.min(7, median(last8) || 1));
    if (g !== goalNow) {
      goalNow = g;
      await saveEspace({ objectifSemaine: g, objectifChoisi: false }).catch(() => undefined);
    }
  }

  // Objectif de la semaine : effet la semaine suivante quand il change
  const nextMonday = addDays(currentMonday, 7);
  if (meta.goals.length === 0) meta.goals = [{ from: '0000-00-00', goal: goalNow }];
  else if (meta.goals.length === 1 && trainingsC.length === 0) meta.goals = [{ from: '0000-00-00', goal: goalNow }];
  else {
    let last = meta.goals[meta.goals.length - 1];
    if (last.from === nextMonday && last.goal !== goalNow) {
      meta.goals.pop();
      last = meta.goals[meta.goals.length - 1];
    }
    if (last.goal !== goalNow) meta.goals.push({ from: nextMonday, goal: goalNow });
  }

  // Reprise : le passe est juge avec l'objectif de chaque periode (mediane glissante de 8 semaines)
  if (catchup && legacy && !meta.goalsRebuilt) {
    const limitMonday = mondayOf(limitDay);
    const past: { from: string; goal: number }[] = [];
    const hist: number[] = [];
    for (const m of mondaysBetween(firstMonday, limitMonday)) {
      const g = Math.max(1, Math.min(7, median(hist.slice(-8)) || 1));
      if (!past.length || past[past.length - 1].goal !== g) past.push({ from: past.length ? m : '0000-00-00', goal: g });
      hist.push(weekCounts.get(m) ?? 0);
    }
    if (past.length) {
      const atLimit = goalFor(limitMonday, meta.goals);
      const later = meta.goals.filter((x) => x.from > limitMonday);
      meta.goals = [...past, { from: limitMonday, goal: atLimit }, ...later];
    }
    meta.goalsRebuilt = true;
  }

  // 1. Seances : 20 XP, 2 par jour (et jamais plus que le nombre de seances du jour)
  const perDay = new Map<string, number>();
  ledger.forEach((r) => {
    if (r.s === 'seance') perDay.set(r.d, (perDay.get(r.d) ?? 0) + 1);
  });
  const dayTotal = new Map<string, number>();
  pastTrainingsC.forEach((t) => {
    const d = dayOf(t.date);
    dayTotal.set(d, (dayTotal.get(d) ?? 0) + 1);
  });
  for (const t of pastTrainingsC) {
    if (!t.id) continue;
    const k = `seance:${t.id}`;
    if (keys.has(k)) continue;
    const d = dayOf(t.date);
    if (!eligible(d, t.created_at, ectx, isImported(t))) continue;
    const n = perDay.get(d) ?? 0;
    if (n >= Math.min(SEANCES_PAR_JOUR, dayTotal.get(d) ?? 0)) continue;
    perDay.set(d, n + 1);
    add(k, d, 'seance', XP_VALUES.seance, getSportName(t.sport));
  }

  // 2. Pesees : 5 XP, 1 par jour (aucune XP liee au chiffre)
  const weighDays = new Set<string>();
  for (const w of weightsC) {
    if (!w || !(w.weight > 0)) continue;
    const d = dayOf(w.date);
    if (!d || d > today) continue;
    weighDays.add(d);
    if (eligible(d, w.created_at, ectx, isImported(w))) add(`pesee:${d}`, d, 'pesee', XP_VALUES.pesee, traduire('Pesée'));
  }

  // 3. Mensurations : 10 XP, 1 par semaine
  for (const mz of measurementsC) {
    const d = dayOf(mz?.date);
    if (!d || d > today) continue;
    if (eligible(d, mz.created_at, ectx, isImported(mz as { source?: string }))) add(`mensurations:${mondayOf(d)}`, d, 'mensurations', XP_VALUES.mensurations, 'Mensurations');
  }

  // 4. Photos de progression : 10 XP, 1 par semaine
  for (const ph of photosC) {
    const d = dayOf(ph?.date);
    if (!d || d > today) continue;
    if (eligible(d, ph.created_at, ectx)) add(`photo:${mondayOf(d)}`, d, 'photo', XP_VALUES.photo, traduire('Photo de progression'));
  }

  // 5. Records : 15 XP, 3 par jour, poids et repetitions obligatoires
  // un record doit battre tout l'historique reel, mais ne compte que s'il tombe dans ce qui compte
  const recAll = computeRecordStamps(pastTrainings);
  const countedIds = new Set(pastTrainingsC.map((t) => t.id));
  const records = recAll.hits.filter((h) => countedIds.has(h.trainingId));
  const recordStamps = recAll.stamps.filter((st) => (st.trainingId != null ? countedIds.has(st.trainingId) : st.date >= departDay || ancien));
  const recPerDay = new Map<string, number>();
  const recSeen = new Set<string>();
  ledger.forEach((r) => {
    if (r.s !== 'record') return;
    recPerDay.set(r.d, (recPerDay.get(r.d) ?? 0) + 1);
    // apres une restauration les identifiants changent : on reconnait le record par jour et exercice
    recSeen.add(`${r.d}|${(r.l.split(',')[0] ?? '').trim().toLowerCase()}`);
  });
  const trainingById = new Map<number, Training>();
  pastTrainings.forEach((t) => t.id && trainingById.set(t.id, t));
  for (const h of records) {
    const k = `record:${h.trainingId}:${h.exercise.toLowerCase()}`;
    if (keys.has(k)) continue;
    const sig = `${h.date}|${h.exercise.trim().toLowerCase()}`;
    if (recSeen.has(sig)) continue;
    const n = recPerDay.get(h.date) ?? 0;
    const tr = trainingById.get(h.trainingId);
    if (n >= RECORDS_PAR_JOUR || !eligible(h.date, h.createdAt, ectx, tr ? isImported(tr) : false)) continue;
    recPerDay.set(h.date, n + 1);
    recSeen.add(sig);
    add(k, h.date, 'record', XP_VALUES.record, h.label);
  }

  // 6. Semaines réussies : 20 XP + 10 par seance visee
  const wk = computeWeeks(trainingsC, meta, today);
  const recentLimit = addDays(today, -ANTIDATE_JOURS - 6);
  for (const w of wk.weeks) {
    if (w.status !== 'tenue') continue;
    if (!catchup && addDays(w.monday, 6) < recentLimit) continue;
    add(traduire("semaine:{0}", w.monday), w.monday, 'semaine', weekXp(w.goal), traduire("Semaine réussie, {0} séances", w.count));
  }

  // 6 bis. Lune du mois : au moins 3 semaines réussies dont le lundi tombe dans le mois, repetable
  const heldByMonth = new Map<string, number>();
  const recentMonths = new Set<string>();
  for (const w of wk.weeks) {
    const mo = w.monday.slice(0, 7);
    if (addDays(w.monday, 6) >= recentLimit) recentMonths.add(mo);
    if (w.status === 'tenue') heldByMonth.set(mo, (heldByMonth.get(mo) ?? 0) + 1);
  }
  heldByMonth.forEach((n, mo) => {
    if (n < LUNE.weeks) return;
    if (!catchup && !recentMonths.has(mo)) return;
    add(`lune:${mo}`, mo === today.slice(0, 7) ? today : `${mo}-28`, 'lune', XP_VALUES.lune, traduire("Lune du mois, {0} semaines réussies", n));
  });

  // 6 ter. Vague 47 : serie de jours et coffre du jour (remplace le geste du jour credite tout seul)
  let gesteKind: 'seance' | 'pesee' | 'hydratation' | null = null;
  const hydraDays = new Set<string>();
  try {
    const log = hydrationRaw ? (JSON.parse(hydrationRaw) as unknown) : [];
    if (Array.isArray(log)) {
      for (const e of log) {
        const d = dayOf((e as { date?: string } | null)?.date);
        const ml = Number((e as { amount?: number }).amount) > 0 || Number((e as { quantite_ml?: number }).quantite_ml) > 0;
        if (d && ml && d <= today && counts(d, false)) hydraDays.add(d);
      }
    }
  } catch {
    // journal d'hydratation illisible : pas de geste d'eau
  }
  const activeDays = new Set<string>();
  pastTrainingsC.forEach((t) => activeDays.add(dayOf(t.date)));
  weightsC.forEach((w) => w.weight > 0 && dayOf(w.date) <= today && activeDays.add(dayOf(w.date)));
  measurementsC.forEach((mz) => dayOf(mz.date) <= today && activeDays.add(dayOf(mz.date)));
  photosC.forEach((ph) => dayOf(ph.date) <= today && activeDays.add(dayOf(ph.date)));
  hydraDays.forEach((d) => activeDays.add(d));
  if (pastTrainingsC.some((t) => dayOf(t.date) === today)) gesteKind = 'seance';
  else if (weighDays.has(today)) gesteKind = 'pesee';
  else if (hydraDays.has(today)) gesteKind = 'hydratation';

  const gesteFait = activeDays.has(today);
  const serieCalc = computeSerie(activeDays, today, ancien ? null : departDay);
  const serieJours = serieCalc.jours;
  meta.serieRecord = Math.max(meta.serieRecord ?? 0, serieJours);
  const coffreCle = `coffre:${today}`;
  const chance = coupDeChance(today, meta.migratedAt ?? stamp);
  const coffreCalc = coffreXp(serieJours, chance);
  if (meta.coffreDemande === today && gesteFait) {
    add(coffreCle, today, 'coffre', coffreCalc.xp, traduirePluriel(serieJours, serieJours > 1, "{0}, {1} jour d’affilée{2}", "{0}, {1} jours d’affilée{2}", coffreCalc.grand ? 'Grand coffre' : 'Coffre du jour', serieJours, coffreCalc.chance ? ', coup de chance' : ''));
  }
  meta.coffreDemande = null;
  const coffreRow = ledger.find((r) => r.k === coffreCle) ?? added.find((r) => r.k === coffreCle);
  const semaineSerie: JourSerie[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mondayOf(today), i);
    const etat: JourSerie['etat'] = d > today ? 'avenir' : activeDays.has(d) ? 'fait' : serieCalc.repos.has(d) ? 'repos' : d === today ? 'aujourdhui' : 'vide';
    return { date: d, etat };
  });
  // jours avant le grand coffre : 0 = celui d'aujourd'hui est le grand
  const serieDuCoffre = gesteFait ? serieJours : serieJours + 1;
  const grandDans = coffreRow ? (7 - (serieJours % 7)) % 7 || 7 : (7 - (serieDuCoffre % 7)) % 7;

  // 7. Ceintures et contexte des sceaux
  const sportCounts: Record<string, number> = {};
  let muscu = 0, striking = 0, grappling = 0, combat = 0, rounds = 0, runs = 0, runKm = 0, yoga = 0, matMin = 0, kg = 0;
  const partners = new Set<string>();
  for (const t of pastTrainingsC) {
    const s = t.sport || 'autre';
    sportCounts[s] = (sportCounts[s] ?? 0) + 1;
    const cat = getSportCategory(s);
    if (MUSCU.has(s)) muscu += 1;
    if (RUNS.has(s)) {
      runs += 1;
      const km = Number(t.distance) || 0;
      if (km > 0 && km < 400) runKm += km;
    }
    if (YOGA.has(s)) yoga += 1;
    if (cat === 'combat_striking') striking += 1;
    if (cat === 'combat_grappling') grappling += 1;
    if (cat === 'combat_striking' || cat === 'combat_grappling') {
      combat += 1;
      matMin += durationOf(t);
    }
    rounds += roundsOf(t);
    (t.combat_rounds ?? []).forEach((r) => {
      const n = (r?.partner ?? '').trim().toLowerCase();
      if (n) partners.add(n);
    });
    kg += tonnage(t);
  }
  let programs = 0;
  try {
    const list = templatesRaw ? (JSON.parse(templatesRaw) as unknown) : [];
    programs = Array.isArray(list) ? list.length : 0;
  } catch {
    programs = 0;
  }
  // la date de naissance reste facultative : le profil est complet avec le prenom et la taille
  const profileComplete = !!(profile && profile.name && profile.name.trim() && profile.height_cm);

  // Sceau Oni : competitions creees par l'utilisateur, ou passees avec un resultat
  const imported = importedNames();
  const realComps = (competitions ?? []).filter((c) => {
    if (!c) return false;
    const x = c as typeof c & { resultat?: string | null; placement?: string | null; victoires?: number | null };
    const hasResult = dayOf(c.date) <= today && (!!(x.resultat ?? '').toString().trim() || !!(x.placement ?? '').toString().trim() || (Number(x.victoires) || 0) > 0 || (c.id ? combatCompIds.has(c.id) : false));
    const userMade = !imported.has((c.nom ?? '').trim().toLowerCase());
    return userMade || hasResult;
  }).length;

  const baseTotal = () => ledger.reduce((s, r) => s + r.a, 0) + added.reduce((s, r) => s + r.a, 0);
  const ctxFor = (): SealContext => ({
    heldWeeks: wk.held,
    bestStreak: wk.best,
    bridge: wk.bridge,
    weighDays: weighDays.size,
    rankIndex: rankFor(baseTotal()).index,
    muscuSessions: muscu,
    records: recordStamps.length,
    plateauRecords: records.filter((r) => r.plateau).length,
    tonnes: kg / 1000,
    strikingSessions: striking,
    grapplingSessions: grappling,
    combatSessions: combat,
    rounds,
    competitions: realComps,
    partners: partners.size,
    matHours: matMin / 60,
    profileComplete,
    sportsCount: Object.keys(sportCounts).filter((k) => k !== 'autre').length,
    runs,
    runKm,
    yogaSessions: yoga,
    moduleOn: userMode === 'competiteur' || (plan ?? []).some((x) => !x.is_rest_day),
    programs,
    photos: photosC.length,
    measurements: measurementsC.length,
  });

  // 8. Sceaux : 25 XP une fois, deux passes (le Mont Fuji depend du rang)
  const newSeals: string[] = [];
  const sealPass = () => {
    const ctx = ctxFor();
    for (const def of SEALS) {
      if (meta.seals[def.id]) continue;
      if (!sealDone(def, ctx)) continue;
      meta.seals[def.id] = today;
      newSeals.push(def.id);
      add(`sceau:${def.id}`, today, 'sceau', XP_VALUES.sceau, `Sceau ${def.name}`);
    }
  };
  sealPass();

  // 9. Reprise de l'ancienne app : quetes et defis, badges sans sceau equivalent, ancien rang
  let oldIdx = 0;
  if (catchup && legacy) {
    if (quetesXp > 0) add('reprise:quetes', limitDay, 'reprise', Math.min(REPRISE_QUETES_MAX, quetesXp), traduire('Reprise de tes quêtes et défis'));
    const badgesSansSceau = badgeIds.filter((id) => !(BADGE_TO_SEAL[id] && meta.seals[BADGE_TO_SEAL[id]]));
    if (badgesSansSceau.length) {
      add('reprise:badges', limitDay, 'reprise', Math.min(REPRISE_BADGES_MAX, badgesSansSceau.length * REPRISE_BADGE_XP), traduire("Reprise de tes {0} anciens badges", badgesSansSceau.length));
    }
    // ancien total recalcule sur tout l'historique (formule de l'ancienne app)
    // seulement les donnees YOROI : l'historique Sante ne fabrique pas un ancien rang
    const recomputed = pastTrainings.filter((t) => !isImported(t)).length * 20 + (weights ?? []).filter((w) => w && !isImported(w)).length * 5 + (photos ?? []).length * 15 + quetesXp;
    const oldPoints = Math.max(parseNum(oldPointsRaw), recomputed);
    OLD_RANK_THRESHOLDS.forEach((th, i) => {
      if (oldPoints >= th) oldIdx = i;
    });
  }
  // 9 bis. Aucun rang ne descend : ni l'ancien rang de l'app d'avant (sans plafond), ni le rang
  // deja vu dans cette app (seuils changes entre deux versions de test). Une ligne complete l'XP.
  let rankKept: string | null = null;
  if (catchup) {
    const floorIdx = Math.max(oldIdx, rankSeenBefore);
    const floorDan = floorIdx === RANKS.length - 1 && rankSeenBefore === RANKS.length - 1 ? danSeenBefore : 0;
    const target = RANKS[floorIdx].minXp + floorDan * DAN_STEP;
    const total = baseTotal();
    if (floorIdx > 0 && total < target) {
      let n = 1;
      while (keys.has(n === 1 ? 'migration:rang' : `migration:rang${n}`) && n < 50) n += 1;
      const name = rankTitle({ name: RANKS[floorIdx].name, dan: floorDan });
      add(n === 1 ? 'migration:rang' : traduire("migration:rang{0}", n), limitDay, 'migration', target - total, traduire("Ton rang {0} est gardé", name));
      rankKept = name;
    }
  }
  sealPass();

  // 10. Fin du rattrapage
  const totalNow = baseTotal();
  if (firstRun) {
    meta.migratedAt = stamp;
    meta.rankSeen = rankFor(totalNow).index;
    meta.pendingSeals = legacy ? [] : newSeals;
    meta.recap = !legacy && newSeals.length > 1;
  } else if (newSeals.length) {
    meta.pendingSeals = Array.from(new Set([...meta.pendingSeals, ...newSeals]));
  }
  if (catchup) {
    if (!firstRun) {
      // les sceaux retrouves ne declenchent pas vingt celebrations : la bienvenue les resume
      if (legacy) meta.pendingSeals = meta.pendingSeals.filter((id) => !newSeals.includes(id));
      // ancien utilisateur : la bienvenue resume le rang, rien d'autre a feter.
      // Sinon (restauration) : un seul passage de rang, celui du rang final, se fete une fois.
      meta.rankSeen = legacy ? rankFor(totalNow).index : Math.min(rankSeenBefore, rankFor(totalNow).index);
      meta.danSeen = legacy ? danFor(totalNow) : Math.min(danSeenBefore, danFor(totalNow));
    } else {
      meta.danSeen = danFor(totalNow);
    }
    meta.plateSeen = plateIndex(totalNow);
    meta.catchupPending = null;
    meta.catchupDone = limitDay;
  }
  meta.v = 3;
  if (meta.danSeen === undefined) meta.danSeen = danFor(totalNow);
  if (meta.plateSeen === undefined) meta.plateSeen = plateIndex(totalNow);

  // Personnage de l'ancienne app (une seule fois)
  if (catchup && legacy && !meta.avatarDone) {
    meta.avatarDone = true;
    if (espace.personnage === 'guerrier_h') await reprendreAncienAvatar(rankFor(totalNow).index);
  }

  const all = [...ledger, ...added];
  if (added.length) await writeLedger(all);

  // Etat
  const xp = all.reduce((s, r) => s + r.a, 0);
  const rank = rankFor(xp);
  const step = nextStepFor(xp);
  const plates = platesFor(xp);
  const rankProgress = plates.progress;

  const belts: BeltInfo[] = Object.entries(sportCounts)
    .filter(([s]) => s !== 'autre' || Object.keys(sportCounts).length === 1)
    .map(([sport, count]) => ({ sport, sportName: getSportName(sport), count, ...beltFor(count) }))
    .sort((a, b) => b.count - a.count);

  const ctx = ctxFor();
  const seals: SealView[] = SEALS.map((def) => {
    const [cur, target] = def.metric(ctx);
    const earnedAt = meta.seals[def.id] ?? null;
    return { id: def.id, family: def.family, name: def.name, kanji: def.kanji, condition: def.condition, earned: !!earnedAt, earnedAt, current: Math.min(cur, target), target };
  });
  const earned = seals.filter((s) => s.earned).sort((a, b) => (a.earnedAt! < b.earnedAt! ? 1 : a.earnedAt! > b.earnedAt! ? -1 : 0));
  const lunes = all.filter((r) => r.s === 'lune').length;

  // Bienvenue des anciens utilisateurs : une seule fois, uniquement des chiffres calcules
  if (catchup && legacy && !meta.welcomeSeen && !meta.welcome) {
    const before = all.filter((r) => r.d <= limitDay);
    const countOf = (s: XpSource) => before.filter((r) => r.s === s).length;
    const quetes = all.find((r) => r.k === 'reprise:quetes');
    const badges = all.find((r) => r.k === 'reprise:badges');
    const top = belts.find((b) => b.sport !== 'autre') ?? null;
    meta.welcome = {
      seances: countOf('seance'),
      pesees: countOf('pesee'),
      records: recordStamps.filter((r) => r.date <= limitDay).length,
      semaines: countOf('semaine'),
      quetesXp: quetes?.a ?? 0,
      badges: badges ? Math.round(badges.a / REPRISE_BADGE_XP) : 0,
      badgesXp: badges?.a ?? 0,
      rankTitle: rankTitle(rank),
      rankIndex: rank.index,
      seals: earned.length,
      mainSport: top ? { name: top.sportName, level: top.belt.name, count: top.count } : null,
      xp,
      rankKept: rankKept ?? (all.some((r) => r.s === 'migration') && rankFor(xp - all.filter((r) => r.s === 'migration').reduce((t, r) => t + r.a, 0)).index < rank.index ? rankTitle(rank) : null),
    };
  }
  await writeMeta(meta);

  const currentWeek = wk.weeks[wk.weeks.length - 1];
  const thisWeekSessions = currentWeek && currentWeek.monday === mondayOf(today) ? currentWeek.count : 0;
  const weeklyGoal = goalFor(mondayOf(today), meta.goals);

  const nextGoals = buildNextGoals({ trainings: trainingsC.length, thisWeekSessions, weeklyGoal, paused: !!meta.pauses[mondayOf(today)], belts, seals, xp, rank });

  const state: ArmureState = {
    xp,
    rank,
    weekStreak: wk.streak,
    shields: wk.shields,
    thisWeekSessions,
    weeklyGoal,
    recentSeals: earned.slice(0, 3).map((s) => ({ id: s.id, name: s.name, earnedAt: s.earnedAt!, kanji: s.kanji, family: s.family })),
    bestStreak: wk.best,
    weeks: wk.weeks.slice(-12),
    pauseThisWeek: meta.pauses[mondayOf(today)] ?? null,
    goldenVein: wk.goldenVein,
    sealsCount: earned.length,
    sealsTotal: SEALS_TOTAL,
    topBelts: belts.slice(0, 3),
    nextGoals,
    rankProgress,
    xpToNext: step.minXp - xp,
    sportCounts,
    isNewUser: trainingsC.length === 0 && weighDays.size === 0,
    rankTitle: rankTitle(rank),
    nextStep: step,
    plates,
    lunes,
    gesteToday: { done: gesteFait, kind: gesteKind, xp: XP_VALUES.geste },
    serie: { jours: serieJours, record: Math.max(meta.serieRecord ?? 0, serieJours), aSauver: !gesteFait && serieJours > 0, semaine: semaineSerie },
    coffre: {
      etat: coffreRow ? 'ouvert' : gesteFait ? 'pret' : 'verrouille',
      xp: coffreRow ? coffreRow.a : coffreXp(serieDuCoffre, chance).xp,
      grand: coffreRow ? coffreRow.l.startsWith('Grand') : coffreXp(serieDuCoffre).grand,
      chance: coffreRow ? coffreRow.l.includes('coup de chance') : false,
      grandDans,
    },
    weekXp: weekXp(weeklyGoal),
    goalChosen: espaceStored.objectifChoisi === true,
  };

  const snap: ArmureSnapshot = {
    state,
    ledger: all.map(toEntry).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1)),
    belts,
    seals,
    weeks: wk.weeks,
    records: records.map((r) => ({ trainingId: r.trainingId, date: r.date, label: r.label })),
  };
  const changed = added.length > 0 || !cached || cached.state.xp !== xp || cached.state.weekStreak !== wk.streak;
  cached = snap;
  cachedAt = Date.now();
  if (changed) DeviceEventEmitter.emit(ARMURE_CHANGED_EVENT, state);
  return snap;
}

function buildNextGoals(a: {
  trainings: number;
  thisWeekSessions: number;
  weeklyGoal: number;
  paused: boolean;
  belts: BeltInfo[];
  seals: SealView[];
  xp: number;
  rank: ArmureRank;
}): NextGoal[] {
  const out: NextGoal[] = [];
  if (a.trainings === 0) {
    out.push({ kind: 'debut', title: traduire('Enregistre ta première séance'), detail: traduire("+ {0} XP vers ta première pièce d’armure", XP_VALUES.seance), href: '/ajouter' });
  }
  const left = a.weeklyGoal - a.thisWeekSessions;
  if (!a.paused && left > 0 && a.trainings > 0) {
    out.push({ kind: 'semaine', title: traduire("Encore {0} pour tenir ta semaine", left > 1 ? `${left} séances` : '1 séance'), detail: traduire("+ {0} XP et ta série continue", weekXp(a.weeklyGoal)), href: '/ajouter' });
  }
  const belt = a.belts.filter((b) => b.next && b.count > 0).sort((x, y) => x.remaining - y.remaining)[0];
  if (belt && belt.next) {
    out.push({
      kind: 'ceinture',
      title: traduire("Encore {0} pour le niveau {1} en {2}", belt.remaining > 1 ? `${belt.remaining} séances` : '1 séance', belt.next.name, belt.sportName),
      detail: traduirePluriel(belt.count, belt.count > 1, "{0} séance de {1} pour l’instant", "{0} séances de {1} pour l’instant", belt.count, belt.sportName),
      href: '/dojo/ceintures',
    });
  }
  const seal = a.seals
    .filter((s) => !s.earned && s.current > 0 && s.target > 1)
    .sort((x, y) => y.current / y.target - x.current / x.target)[0];
  if (seal) {
    out.push({ kind: 'sceau', title: traduire("Sceau {0} : {1} sur {2}", seal.name, seal.current, seal.target), detail: seal.condition, href: '/dojo/sceaux' });
  }
  const step = nextStepFor(a.xp);
  const plates = platesFor(a.xp);
  const nextPlateXp = Math.ceil(step.fromXp + ((plates.earned + 1) * (step.minXp - step.fromXp)) / PLATES_PER_RANK);
  if (plates.earned < PLATES_PER_RANK - 1) {
    out.push({ kind: 'rang', title: traduire("Encore {0} XP pour la prochaine étape de ton armure", (nextPlateXp - a.xp).toLocaleString(LOCALE)), detail: traduire("Étape {0} sur {1} de ta pièce vers {2}", plates.earned + 1, PLATES_PER_RANK, step.name), href: '/dojo/rangs' });
  } else if (a.rank.nextMinXp) {
    const next = RANKS[a.rank.index + 1];
    out.push({ kind: 'rang', title: traduire("Encore {0} XP pour devenir {1}", (a.rank.nextMinXp - a.xp).toLocaleString(LOCALE), next.name), detail: traduire("Pièce suivante : {0}", next.piece ?? ''), href: '/dojo/rangs' });
  } else {
    out.push({ kind: 'rang', title: traduire("Encore {0} XP pour {1}", (step.minXp - a.xp).toLocaleString(LOCALE), step.name), detail: traduire('Un dan tous les 4 000 XP'), href: '/dojo/rangs' });
  }
  return out;
}

// ============================================================
// API publique
// ============================================================

/** Recalcule (si besoin) et renvoie l'instantane complet. */
export function syncArmure(force = false): Promise<ArmureSnapshot> {
  if (!force && cached && Date.now() - cachedAt < 1500) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = exclusive(runSync)
    .catch((e) => {
      logger.warn('[Armure] recalcul impossible', e);
      if (cached) return cached;
      throw e;
    })
    .finally(() => {
      inflight = null;
      if (dirty) {
        dirty = false;
        void syncArmure(true).catch(() => undefined);
      }
    });
  return inflight;
}

export async function getArmureState(): Promise<ArmureState> {
  try {
    return (await syncArmure()).state;
  } catch {
    return {
      xp: 0,
      rank: rankFor(0),
      weekStreak: 0,
      shields: 0,
      thisWeekSessions: 0,
      weeklyGoal: 3,
      recentSeals: [],
      sealsCount: 0,
      sealsTotal: SEALS_TOTAL,
      isNewUser: true,
    };
  }
}

export async function getBelts(): Promise<BeltInfo[]> {
  return (await syncArmure()).belts;
}

export async function getSeals(): Promise<SealView[]> {
  return (await syncArmure()).seals;
}

export async function getXpHistory(): Promise<XpEntry[]> {
  return (await syncArmure()).ledger;
}

export async function getWeeks(): Promise<WeekStatus[]> {
  return (await syncArmure()).weeks;
}

/** Totaux d'XP par source, pour le journal. */
export function totalsBySource(entries: XpEntry[]): { source: XpSource; label: string; amount: number }[] {
  const m = new Map<XpSource, number>();
  entries.forEach((e) => m.set(e.source, (m.get(e.source) ?? 0) + e.amount));
  return Array.from(m.entries())
    .map(([source, amount]) => ({ source, label: SOURCE_LABELS[source], amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Pose ou retire le statut repos, blesse ou malade sur la semaine en cours. */
export async function setWeekPause(kind: PauseKind | null): Promise<ArmureState> {
  const m = mondayOf(todayIso());
  await exclusive(async () => {
    const meta = await readMeta();
    if (kind) meta.pauses[m] = kind;
    else delete meta.pauses[m];
    await writeMeta(meta);
  });
  if (inflight) await inflight.catch(() => undefined);
  const snap = await syncArmure(true);
  DeviceEventEmitter.emit(ARMURE_CHANGED_EVENT, snap.state);
  return snap.state;
}

export const PAUSE_LABELS: Record<PauseKind, string> = { repos: traduire('Repos'), blessure: traduire('Blessé'), malade: 'Malade' };

/** Recompense d'une seance (fin de seance) : XP de la seance et de ses records, semaine réussie. */
export async function getSessionReward(trainingId: number): Promise<{ xp: number; records: string[]; weekHeld: boolean; weekXp: number; state: ArmureState }> {
  const snap = await syncArmure(true);
  const mine = snap.ledger.filter((e) => e.key === `seance:${trainingId}` || e.key.startsWith(`record:${trainingId}:`));
  const rec = snap.ledger.filter((e) => e.key.startsWith(`record:${trainingId}:`)).map((e) => e.label);
  const seance = snap.ledger.find((e) => e.key === `seance:${trainingId}`);
  const monday = seance ? mondayOf(seance.date) : mondayOf(todayIso());
  const week = snap.weeks.find((w) => w.monday === monday);
  const weekEntry = snap.ledger.find((e) => e.key === `semaine:${monday}`);
  return {
    xp: mine.reduce((s, e) => s + e.amount, 0),
    records: rec,
    weekHeld: week?.status === 'tenue',
    weekXp: weekEntry?.amount ?? 0,
    state: snap.state,
  };
}

export type Celebration = { rankUp: ArmureRank | null; seals: SealView[]; recap: boolean; plate?: { index: number; earned: number; total: number } | null };

/** Ce qu'il reste a celebrer une seule fois : passage de rang, nouveaux sceaux. */
export async function getPendingCelebration(): Promise<Celebration> {
  const snap = await syncArmure();
  const meta = await readMeta();
  const rank = snap.state.rank;
  const seals = meta.pendingSeals.map((id) => snap.seals.find((s) => s.id === id)).filter((s): s is SealView => !!s);
  const danUp = rank.index === RANKS.length - 1 && (rank.dan ?? 0) > (meta.danSeen ?? 0);
  const pIdx = plateIndex(snap.state.xp);
  const rankUp = rank.index > meta.rankSeen || danUp ? rank : null;
  // une plaque seule (sans passage de rang) se fete dans le Dojo
  const plate = !rankUp && pIdx > (meta.plateSeen ?? pIdx) && snap.state.plates ? { index: pIdx, earned: snap.state.plates.earned, total: snap.state.plates.total } : null;
  return { rankUp, seals, recap: meta.recap, plate };
}

/** plate : vrai pour marquer aussi la plaque comme vue (le Dojo seulement). */
export async function markCelebrationSeen(opts: { plate?: boolean; keepSeals?: boolean } = {}): Promise<void> {
  const snap = await syncArmure();
  await exclusive(async () => {
    const meta = await readMeta();
    const rankUp = snap.state.rank.index > meta.rankSeen || (snap.state.rank.dan ?? 0) > (meta.danSeen ?? 0);
    meta.rankSeen = Math.max(meta.rankSeen, snap.state.rank.index);
    meta.danSeen = Math.max(meta.danSeen ?? 0, snap.state.rank.dan ?? 0);
    // un passage de rang inclut sa derniere plaque
    if (opts.plate || rankUp) meta.plateSeen = Math.max(meta.plateSeen ?? 0, plateIndex(snap.state.xp));
    if (!opts.keepSeals) {
      meta.pendingSeals = [];
      meta.recap = false;
    }
    await writeMeta(meta);
  });
}

/** Bienvenue des anciens utilisateurs, a montrer une seule fois dans le Dojo (null sinon). */
export async function getWelcome(): Promise<WelcomeSummary | null> {
  await syncArmure();
  const meta = await readMeta();
  return meta.welcome && !meta.welcomeSeen ? meta.welcome : null;
}

export async function markWelcomeSeen(): Promise<void> {
  await exclusive(async () => {
    const meta = await readMeta();
    meta.welcomeSeen = true;
    // la bienvenue resume le rang et les sceaux retrouves : pas de seconde celebration
    meta.pendingSeals = [];
    meta.recap = false;
    await writeMeta(meta);
  });
}

/**
 * Demande un rattrapage : a appeler apres une restauration de sauvegarde, un import ou la
 * sortie du mode demo. Tout ce qui est date d'avant aujourd'hui redevient eligible une fois.
 * Les lignes deja creditees ne le sont pas deux fois (cles par jour, par semaine et par record).
 */
export async function requestArmureCatchup(): Promise<ArmureState> {
  await exclusive(async () => {
    const meta = await readMeta();
    if (meta.migratedAt) meta.catchupPending = todayIso();
    else meta.restaure = true;
    await writeMeta(meta);
  });
  cachedAt = 0;
  if (inflight) await inflight.catch(() => undefined);
  return (await syncArmure(true)).state;
}

/** Ce que la sauvegarde garde du Dojo : le journal d'XP et la date de depart. */
export type ArmureBackup = { v: 1; ledger: LedgerRow[]; departDay: string | null; ancien: boolean; migratedAt: string | null; seals: Record<string, string>; rankSeen: number; danSeen: number };

/**
 * Restaure le Dojo d'une sauvegarde : le journal est fusionne (rien ne baisse, rien n'est
 * compte deux fois), la date de depart la plus ancienne est gardee. Rien n'est recredite :
 * ce que la sauvegarde n'avait pas credite (seances antidatees) ne l'est pas non plus.
 * Renvoie false si la sauvegarde ne contient pas de Dojo (ancienne version) : le rattrapage
 * classique prend alors le relais.
 */
export async function restoreArmureBackup(raw: unknown): Promise<boolean> {
  const b = raw as Partial<ArmureBackup> | null | undefined;
  if (!b || !Array.isArray(b.ledger)) return false;
  await exclusive(async () => {
    const [meta, ledger] = await Promise.all([readMeta(), readLedger()]);
    const keys = new Set(ledger.map((r) => r.k));
    // seances et records : cles par identifiant, qui changent a la restauration. Un jour deja
    // credite sur cet appareil n'est pas credite une deuxieme fois.
    const daysOf = (src: XpSource) => new Set(ledger.filter((r) => r.s === src).map((r) => r.d));
    const seanceDays = daysOf('seance');
    const recordDays = daysOf('record');
    const hasMigration = ledger.some((r) => r.s === 'migration');
    const merged = [...ledger];
    for (const r of b.ledger as LedgerRow[]) {
      if (!r || typeof r.k !== 'string' || !(r.a > 0) || keys.has(r.k)) continue;
      if (r.s === 'seance' && seanceDays.has(r.d)) continue;
      if (r.s === 'record' && recordDays.has(r.d)) continue;
      if (r.s === 'migration' && hasMigration) continue;
      keys.add(r.k);
      merged.push(r);
    }
    // rang de la sauvegarde garde : une ligne complete l'XP si la fusion donne moins
    const bRank = Math.max(0, Math.min(RANKS.length - 1, b.rankSeen || 0));
    const target = RANKS[bRank].minXp + (bRank === RANKS.length - 1 ? Math.max(0, b.danSeen ?? 0) * DAN_STEP : 0);
    const total = merged.reduce((t, r) => t + r.a, 0);
    if (bRank > 0 && total < target) {
      let n = 1;
      while (keys.has(`migration:restaure${n}`) && n < 50) n += 1;
      merged.push({ k: `migration:restaure${n}`, d: todayIso(), s: 'migration', a: target - total, t: nowStamp(), l: traduire("Ton rang {0} est gardé", rankTitle({ name: RANKS[bRank].name, dan: bRank === RANKS.length - 1 ? b.danSeen ?? 0 : 0 })) });
    }
    if (merged.length !== ledger.length) await writeLedger(merged);
    if (b.departDay && (!meta.departDay || b.departDay < meta.departDay)) meta.departDay = b.departDay;
    meta.ancien = !!meta.ancien || !!b.ancien;
    if (b.migratedAt && (!meta.migratedAt || b.migratedAt < meta.migratedAt)) meta.migratedAt = b.migratedAt;
    meta.seals = { ...(b.seals ?? {}), ...(meta.seals ?? {}) };
    // aucun rang ne descend : le rang deja vu sert de plancher au prochain rattrapage
    meta.rankSeen = Math.max(meta.rankSeen || 0, b.rankSeen || 0);
    meta.danSeen = Math.max(meta.danSeen ?? 0, b.danSeen ?? 0);
    meta.restaure = false;
    meta.catchupPending = null;
    if ((meta.v ?? 1) < 3 && meta.migratedAt) meta.v = 3;
    await writeMeta(meta);
  });
  cachedAt = 0;
  if (inflight) await inflight.catch(() => undefined);
  await syncArmure(true).catch(() => undefined);
  return true;
}

/** Cles du Dojo dans les cles de l'app : restaurees par restoreArmureFromStorage, pas par la fusion generale */
export const ARMURE_STORAGE_KEYS = [LEDGER_KEY, META_KEY] as const;

/**
 * Sauvegarde 6.0 et suivantes : le journal et les reglages du Dojo sont dans les cles de l'app.
 * Renvoie false s'il n'y a pas de journal (ancienne sauvegarde) : le rattrapage prend le relais.
 */
export async function restoreArmureFromStorage(map: unknown): Promise<boolean> {
  if (!map || typeof map !== 'object') return false;
  const m = map as Record<string, unknown>;
  const parse = (v: unknown): unknown => {
    if (typeof v !== 'string') return null;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };
  const ledger = parse(m[LEDGER_KEY]);
  if (!Array.isArray(ledger)) return false;
  const meta = (parse(m[META_KEY]) ?? {}) as Partial<Meta>;
  return restoreArmureBackup({
    v: 1,
    ledger: ledger as LedgerRow[],
    departDay: meta.departDay ?? (meta.migratedAt ? dayOf(meta.migratedAt) : null),
    ancien: !!meta.ancien,
    migratedAt: meta.migratedAt ?? null,
    seals: meta.seals ?? {},
    rankSeen: meta.rankSeen || 0,
    danSeen: meta.danSeen ?? 0,
  });
}

/**
 * Vague 47 : ouvre le coffre du jour (une fois par jour, geste fait). Renvoie l'XP gagnee,
 * ou null si le coffre n'etait pas pret.
 */
export async function openDailyChest(): Promise<{ xp: number; grand: boolean; chance: boolean; serie: number } | null> {
  const before = await syncArmure(true).catch(() => null);
  if (!before || before.state.coffre?.etat !== 'pret') return null;
  await exclusive(async () => {
    const meta = await readMeta();
    meta.coffreDemande = todayIso();
    await writeMeta(meta);
  });
  cachedAt = 0;
  if (inflight) await inflight.catch(() => undefined);
  const after = await syncArmure(true);
  const c = after.state.coffre;
  return c && c.etat === 'ouvert' ? { xp: c.xp, grand: c.grand, chance: !!c.chance, serie: after.state.serie?.jours ?? 0 } : null;
}

/**
 * 18 octobre 2026 (visite guidee avec l'exemple) : attend que le journal ne travaille plus (aucun recalcul en cours
 * ni en attente), pour fermer la vitrine sans qu'un recalcul de l'exemple finisse dans tes vraies donnees.
 * Oublie aussi l'instantane garde en memoire : le prochain recalcul part de tes donnees.
 */
export async function armureAuRepos(): Promise<void> {
  for (let k = 0; k < 40; k++) {
    const p = inflight;
    if (p) await p.catch(() => undefined);
    await lock.catch(() => undefined);
    if (!inflight && !dirty) break;
    await new Promise((r) => setTimeout(r, 25));
  }
  cached = null;
  cachedAt = 0;
}

export { BELTS, SEALS, familyOf, sealById };

// Recalcul automatique quand les donnees changent ailleurs dans l'app
const DATA_EVENT = 'YOROI_DATA_CHANGED';
const g = globalThis as unknown as { __yoroiArmureListener?: boolean };
if (!g.__yoroiArmureListener) {
  g.__yoroiArmureListener = true;
  DeviceEventEmitter.addListener(DATA_EVENT, () => {
    cachedAt = 0;
    if (inflight) dirty = true;
    else void syncArmure(true).catch(() => undefined);
  });
}
