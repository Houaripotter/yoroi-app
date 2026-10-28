/**
 * Zones cardiaques facon Apple (28 octobre 2026, refonte de l'ecran Zones cardiaques).
 * Logique pure, testee dans __tests__/unit/zonesApple.test.ts.
 *
 * Ce que l'app sait lire de Sante (honnete) :
 *  - iOS 27 : tes zones exactes, avec HKHealthStore.preferredWorkoutZoneConfiguration(for: heartRate)
 *    (module natif getApplePreferredHeartRateZonesAsJSON, deja code). Ce sont les bornes de Reglages Sante,
 *    manuelles si tu en as saisi, sinon celles qu'Apple calcule.
 *  - avant iOS 27 (ou app compilee sans Xcode 27) : aucune API ne donne les zones d'Apple. On lit ta FC de
 *    repos (restingHeartRate, derniere mesure) et ta FC max (record de heartRate sur 180 jours), et on refait
 *    le calcul d'Apple.
 *
 * Methode d'Apple : Apple dit que ses zones automatiques partent de ta FC max et de ta FC de repos
 * (watchOS 9, vue Zones de frequence cardiaque). La methode reconnue est celle de la reserve cardiaque
 * (Karvonen) : borne = repos + (max moins repos) x pourcentage, zones a 60, 70, 80 et 90 % de la reserve.
 * Verifie sur un exemple reel publie (FC max 185, repos 59 : Apple affiche zone 2 de 134 a 146, soit
 * 134,6 et 147,2 tronques). Apple ne publie pas sa formule exacte ni sa FC max : c'est une reproduction.
 */
import type { LowerBounds } from '@/lib/v2/seances/workoutMath';
import { traduire } from '@/lib/i18n/tr';

/** Debut des zones 2, 3, 4 et 5, en part de la reserve cardiaque */
export const RESERVE_APPLE = [0.6, 0.7, 0.8, 0.9] as const;

export const FC_REPOS_MIN = 30;
export const FC_REPOS_MAX = 110;
export const FC_MAX_MIN = 120;
export const FC_MAX_MAX = 230;

export function fcReposPlausible(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v) && v >= FC_REPOS_MIN && v <= FC_REPOS_MAX;
}

export function fcMaxPlausible(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v) && v >= FC_MAX_MIN && v <= FC_MAX_MAX;
}

/**
 * Debut des zones 2 a 5 comme Apple : repos + reserve x 60, 70, 80, 90 %, tronque au battement
 * (Apple affiche 134 pour 134,6). null si les valeurs ne tiennent pas debout.
 */
export function zonesCommeApple(repos: number, max: number): LowerBounds | null {
  if (!fcReposPlausible(repos) || !fcMaxPlausible(max) || max - repos < 40) return null;
  const reserve = max - repos;
  const lb = RESERVE_APPLE.map((p) => Math.floor(repos + reserve * p + 1e-9)) as LowerBounds;
  return bornesValides(lb) ? lb : null;
}

/** Pourcentage de la FC max (methode « Ma FC max », sans FC de repos) */
export const POURCENT_MAX = [0.63, 0.71, 0.79, 0.9] as const;

export function zonesDepuisFcMax(max: number): LowerBounds | null {
  if (!fcMaxPlausible(max)) return null;
  const lb = POURCENT_MAX.map((p) => Math.round(max * p)) as LowerBounds;
  return bornesValides(lb) ? lb : null;
}

/** Quatre debuts croissants, d'au moins 2 battements d'ecart, entre 40 et 229 */
export function bornesValides(lb: readonly number[] | null | undefined): lb is LowerBounds {
  if (!lb || lb.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const v = lb[i];
    if (typeof v !== 'number' || !isFinite(v) || v < 40 || v > 229) return false;
    if (i > 0 && v - lb[i - 1] < 2) return false;
  }
  return true;
}

export type BorneZone = { debut: number | null; fin: number | null };

/** Debut et fin de chaque zone (bornes incluses, comme Apple) : zone 1 sans debut, zone 5 sans fin */
export function bornesDesZones(lb: LowerBounds): BorneZone[] {
  return [
    { debut: null, fin: lb[0] - 1 },
    { debut: lb[0], fin: lb[1] - 1 },
    { debut: lb[1], fin: lb[2] - 1 },
    { debut: lb[2], fin: lb[3] - 1 },
    { debut: lb[3], fin: null },
  ];
}

/**
 * Change le debut ou la fin d'une zone : les zones restent collees comme dans Apple
 * (la fin de la zone 2 change le debut de la zone 3). zone : 0 pour la zone 1, 4 pour la zone 5. Rend les nouveaux debuts, sans les valider.
 */
export function changerBorne(lb: LowerBounds, zone: number, cote: 'debut' | 'fin', valeur: number): LowerBounds {
  const out = [...lb] as LowerBounds;
  const v = Math.round(valeur);
  if (cote === 'debut' && zone >= 1 && zone <= 4) out[zone - 1] = v;
  if (cote === 'fin' && zone >= 0 && zone <= 3) out[zone] = v + 1;
  return out;
}

/** Parts de l'arc de chaque zone, de la FC de repos a la FC max (zone 1 plafonnee, au moins 6 % chacune pour rester visible) */
export function partsArc(lb: LowerBounds, repos?: number | null, max?: number | null): { bas: number; haut: number; parts: number[] } {
  const bas = fcReposPlausible(repos) && repos < lb[0] ? repos : Math.max(30, lb[0] - 30);
  const haut = fcMaxPlausible(max) && max > lb[3] ? max : lb[3] + 15;
  const bords = [bas, ...lb, haut];
  const brut = [0, 1, 2, 3, 4].map((i) => Math.max(1, bords[i + 1] - bords[i]));
  // la zone 1 part de la FC de repos : sans plafond elle mangerait la moitie de l'arc
  const moyenne = (brut[1] + brut[2] + brut[3] + brut[4]) / 4;
  brut[0] = Math.min(brut[0], moyenne * 1.4);
  const total = brut.reduce((a, b) => a + b, 0);
  const min = 0.06;
  let parts = brut.map((b) => Math.max(min, b / total));
  const somme = parts.reduce((a, b) => a + b, 0);
  parts = parts.map((p) => p / somme);
  return { bas, haut, parts };
}

export type SourceFcMax = 'sante' | 'seances' | 'age';

/**
 * FC max a retenir : ton record de Sante (180 jours), sinon le plus haut de tes seances, sinon 220 moins ton age.
 * Un record aberrant (capteur qui s'emballe, plus de 220) est ignore.
 */
export function choisirFcMax(input: { sante?: number | null; seances?: number | null; age?: number | null }): { valeur: number; source: SourceFcMax } | null {
  const ok = (v: unknown): v is number => fcMaxPlausible(v) && (v as number) <= 220;
  if (ok(input.sante)) return { valeur: Math.round(input.sante), source: 'sante' };
  if (ok(input.seances)) return { valeur: Math.round(input.seances), source: 'seances' };
  const a = input.age;
  if (typeof a === 'number' && a >= 10 && a <= 100) return { valeur: 220 - Math.round(a), source: 'age' };
  return null;
}

export type ResultatImport =
  | { type: 'exactes'; lb: LowerBounds; appleSource: 'system' | 'user' | 'app' | 'autre' }
  | { type: 'calculees'; lb: LowerBounds; repos: number; max: number; sourceMax: SourceFcMax; pourquoi: 'ancien_ios' | 'app_a_jour' | 'sante_vide' | 'android' }
  | { type: 'echec'; raison: 'pas_de_repos' | 'pas_de_max' | 'illisible' };

/**
 * Que donne l'import ? Les zones exactes d'Apple si Sante les donne (iOS 27), sinon le calcul d'Apple
 * depuis ta FC de repos et ta FC max lues dans Sante (ou Health Connect).
 */
export function deciderImport(input: {
  plateforme: 'ios' | 'android';
  /** version majeure d'iOS du telephone */
  versionIos?: number;
  /** reponse du module natif (iOS) */
  apple?: { ios27: boolean; missing?: boolean; lowers?: LowerBounds | null; source?: 'system' | 'user' | 'app' | 'autre' } | null;
  repos?: number | null;
  fcMax?: { valeur: number; source: SourceFcMax } | null;
}): ResultatImport {
  const a = input.apple;
  if (input.plateforme === 'ios' && a?.ios27 && a.lowers && bornesValides(a.lowers)) {
    return { type: 'exactes', lb: a.lowers.map((v) => Math.round(v)) as LowerBounds, appleSource: a.source ?? 'autre' };
  }
  if (!fcReposPlausible(input.repos)) return { type: 'echec', raison: 'pas_de_repos' };
  if (!input.fcMax) return { type: 'echec', raison: 'pas_de_max' };
  const lb = zonesCommeApple(Math.round(input.repos), input.fcMax.valeur);
  if (!lb) return { type: 'echec', raison: 'illisible' };
  const pourquoi =
    input.plateforme === 'android' ? 'android'
      : a?.ios27 ? 'sante_vide'
        : (input.versionIos ?? 0) >= 27 || a?.missing ? 'app_a_jour'
          : 'ancien_ios';
  return { type: 'calculees', lb, repos: Math.round(input.repos), max: input.fcMax.valeur, sourceMax: input.fcMax.source, pourquoi };
}

/** « aujourd'hui a 14 h 05 », « hier a 9 h 30 », « le 12 octobre » */
export function dateImport(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return null;
  const jour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jour(now) - jour(d)) / 86400000);
  const heure = `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
  if (ecart === 0) return traduire('aujourd’hui à {0}', heure);
  if (ecart === 1) return traduire('hier à {0}', heure);
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const an = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
  return traduire('le {0}', `${d.getDate()} ${traduire(mois[d.getMonth()])}${an}`);
}
