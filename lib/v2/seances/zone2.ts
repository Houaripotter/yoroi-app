/**
 * Zone 2 du cardio de fin de seance (31 octobre 2026, Houari : « la vitesse doit augmenter ou baisser selon leur
 * zone 2, il faut en tenir compte »).
 *
 * Methode : celle de l'app (lib/hrZones.ts, ecran Zones cardiaques), pour que le cardio dise la meme chose :
 *  1. tes zones a toi (saisies, ou lues dans Sante) : la zone 2 telle quelle ;
 *  2. sinon, FC max (mesuree par la montre, sinon estimee par l'age : 220 moins l'age) et FC de repos connues :
 *     reserve cardiaque (Karvonen), zone 2 de 60 a 70 % de la reserve, comme Apple (lib/v2/zones/zonesApple.ts).
 *     Source : Karvonen MJ, Kentala E, Mustala O, « The effects of training on heart rate; a longitudinal study »,
 *     Ann Med Exp Biol Fenn 1957;35(3):307-315 ;
 *  3. sans FC de repos : pourcentage de la FC max (63 a 71 %, la regle deja suivie par l'app) ;
 *  4. sans rien (ni zones, ni FC max, ni age) : pas de zone 2. Aucune valeur par defaut n'est montree.
 * Sans FC pendant le cardio, aucune suggestion chiffree : le test de la parole (persinger2004, sources.ts),
 * approximatif, et c'est dit.
 * L'utilisateur garde la main : la suggestion n'est appliquee que s'il la choisit.
 * Donnees pures plus lecture, testees dans __tests__/unit/cardioChoix.test.ts.
 */
import type { HRZoneThresholds } from '@/lib/hrZones';
import { lowerBounds } from '@/lib/v2/seances/workoutMath';
import { fcMaxPlausible, fcReposPlausible, zonesCommeApple, zonesDepuisFcMax } from '@/lib/v2/zones/zonesApple';
import { PAS_PENTE, PENTE_MIN, NIVEAU_MIN, NIVEAU_MAX, PENTE_MAX, VITESSE_MAX, VITESSE_MIN, bornerNiveau, bornerPente, bornerVitesse } from './cardioChoix';
import type { MesureCardio, TypeCardio, Valeurs } from './cardioChoix';

export type MethodeZone2 = 'perso' | 'reserve' | 'pourcentage';
export type Zone2 = { min: number; max: number; methode: MethodeZone2; fcMax?: 'mesuree' | 'age' };

export type DonneesCoeur = {
  zonesPerso?: Pick<HRZoneThresholds, 'z1max' | 'z2max' | 'z3max' | 'z4max'> & Partial<HRZoneThresholds> | null;
  fcMaxMesuree?: number | null;
  age?: number | null;
  fcRepos?: number | null;
};

const zoneDe = (t: Parameters<typeof lowerBounds>[0] | readonly number[] | null): { min: number; max: number } | null => {
  if (!t) return null;
  const lb = Array.isArray(t) ? t : lowerBounds(t as Parameters<typeof lowerBounds>[0]);
  const min = Math.round(lb[0]);
  const max = Math.round(lb[1]) - 1;
  return Number.isFinite(min) && Number.isFinite(max) && min >= 60 && max > min && max < 220 ? { min, max } : null;
};

/** La zone 2 en bpm, ou null si on ne la connait pas */
export function zone2Depuis(d: DonneesCoeur): Zone2 | null {
  if (d.zonesPerso) {
    const z = zoneDe(d.zonesPerso);
    if (z) return { ...z, methode: 'perso' };
  }
  let fcMax: number | null = null;
  let origine: 'mesuree' | 'age' | undefined;
  if (fcMaxPlausible(d.fcMaxMesuree)) {
    fcMax = Math.round(d.fcMaxMesuree);
    origine = 'mesuree';
  } else if (typeof d.age === 'number' && d.age >= 10 && d.age <= 100) {
    fcMax = 220 - Math.round(d.age);
    origine = 'age';
  }
  if (fcMax === null) return null;
  const repos = fcReposPlausible(d.fcRepos) ? Math.round(d.fcRepos) : null;
  // comme lib/hrZones.ts (calcZonesCommeApple) : la reserve cardiaque si la FC de repos tient debout, sinon le pourcentage
  const reserve = repos !== null ? zonesCommeApple(repos, fcMax) : null;
  const z = zoneDe(reserve ?? zonesDepuisFcMax(fcMax));
  if (!z) return null;
  return { ...z, methode: reserve ? 'reserve' : 'pourcentage', fcMax: origine };
}

/** Comment la zone 2 a ete calculee, en une ligne (texte francais a traduire) */
export function texteMethode(z: Zone2): string {
  if (z.methode === 'perso') return 'Tes zones cardiaques';
  if (z.methode === 'reserve') return z.fcMax === 'mesuree' ? 'Réserve cardiaque, FC max mesurée' : 'Réserve cardiaque, FC max estimée par l’âge';
  return z.fcMax === 'mesuree' ? '63 à 71 % de ta FC max mesurée' : '63 à 71 % de ta FC max, estimée par l’âge';
}

/** Lecture des donnees deja dans l'app (memes sources que lib/hrZones.ts) */
export async function chargerZone2(): Promise<Zone2 | null> {
  const d: DonneesCoeur = {};
  try {
    const { getUserSettings } = require('@/lib/storage') as typeof import('@/lib/storage');
    const s = await getUserSettings();
    if (s?.heartRateZones) d.zonesPerso = s.heartRateZones as DonneesCoeur['zonesPerso'];
  } catch {
    // reglages illisibles : on continue
  }
  try {
    const AsyncStorage = (require('@react-native-async-storage/async-storage') as { default: { getItem: (k: string) => Promise<string | null> } }).default;
    const v = await AsyncStorage.getItem('@yoroi_health_max_hr');
    if (v) d.fcMaxMesuree = parseFloat(v);
  } catch {
    // rien de mesure
  }
  try {
    const db = require('@/lib/database') as typeof import('@/lib/database');
    const p = await db.getProfile();
    if (p?.birth_date) {
      const n = new Date(p.birth_date);
      const auj = new Date();
      let age = auj.getFullYear() - n.getFullYear();
      if (auj.getMonth() < n.getMonth() || (auj.getMonth() === n.getMonth() && auj.getDate() < n.getDate())) age--;
      d.age = age;
    } else if (p?.age && p.age > 0) d.age = p.age;
    const r = await db.getLatestHealthData('heart_rate_resting');
    if (r && r.value) d.fcRepos = r.value;
  } catch {
    // profil ou sante indisponibles
  }
  return zone2Depuis(d);
}

/* ------------------------------------------------------------------------------------------------
 * La suggestion pour la prochaine fois
 * ---------------------------------------------------------------------------------------------- */
/** un pas de suggestion : 0,2 km/h (5,5 devient 5,3), 0,5 % de pente, un niveau */
export const PAS_SUGGESTION_VITESSE = 0.2;

export type Verdict = 'dedans' | 'haut' | 'bas';
export type Suggestion = {
  verdict: Verdict;
  /** d'ou vient le verdict : la FC, ou ton ressenti (approximatif) */
  base: 'fc' | 'ressenti';
  /** les valeurs proposees pour la prochaine fois (egales a celles du jour si on garde) */
  prochain: Valeurs;
  /** ce qui change : rien si on garde ou si on ne peut pas bouger d'un pas */
  change: 'vitesse' | 'pente' | 'niveau' | null;
};

export function verdictFc(fcMoy: number, z: { min: number; max: number }): Verdict {
  const b = Math.round(fcMoy);
  if (b > z.max) return 'haut';
  if (b < z.min) return 'bas';
  return 'dedans';
}

/**
 * Un pas dans le bon sens. Marche inclinee : la vitesse d'abord, la pente si la vitesse est en butee ;
 * course sur tapis : la vitesse, puis la pente ; machines a niveau : le niveau.
 */
export function unPas(_type: TypeCardio, mesure: MesureCardio, v: Valeurs, sens: 1 | -1): { prochain: Valeurs; change: Suggestion['change'] } {
  if (mesure === 'niveau') {
    if (typeof v.niveau !== 'number') return { prochain: { ...v }, change: null };
    const n = bornerNiveau(Math.min(NIVEAU_MAX, Math.max(NIVEAU_MIN, v.niveau + sens)));
    return n !== null && n !== v.niveau ? { prochain: { ...v, niveau: n }, change: 'niveau' } : { prochain: { ...v }, change: null };
  }
  if (mesure !== 'tapis') return { prochain: { ...v }, change: null };
  for (const k of ['vitesse', 'pente'] as const) {
    if (k === 'vitesse' && typeof v.vitesse === 'number') {
      const s = bornerVitesse(Math.min(VITESSE_MAX, Math.max(VITESSE_MIN, v.vitesse + sens * PAS_SUGGESTION_VITESSE)));
      if (s !== null && s !== v.vitesse) return { prochain: { ...v, vitesse: s }, change: 'vitesse' };
    }
    if (k === 'pente' && typeof v.pente === 'number') {
      const p = bornerPente(Math.min(PENTE_MAX, Math.max(PENTE_MIN, v.pente + sens * PAS_PENTE)));
      if (p !== null && p !== v.pente) return { prochain: { ...v, pente: p }, change: 'pente' };
    }
  }
  return { prochain: { ...v }, change: null };
}

/**
 * La suggestion du bilan. Avec une FC moyenne et ta zone 2 : au dessus, un pas plus doux ; en dessous, un pas plus
 * dur ; dedans, on garde. Sans FC : « Tu pouvais parler ? » oui, zone 2 probable, on garde ; non, sans doute au
 * dessus, un pas plus doux. Sans FC ni reponse : null, rien d'invente.
 */
export function suggestionZone2(o: { type: TypeCardio; mesure: MesureCardio; valeurs: Valeurs; fcMoy?: number | null; zone?: { min: number; max: number } | null; parler?: boolean | null }): Suggestion | null {
  const fc = typeof o.fcMoy === 'number' && o.fcMoy >= 40 && o.fcMoy <= 230 ? o.fcMoy : null;
  let verdict: Verdict;
  let base: Suggestion['base'];
  if (fc !== null && o.zone) {
    verdict = verdictFc(fc, o.zone);
    base = 'fc';
  } else if (typeof o.parler === 'boolean') {
    verdict = o.parler ? 'dedans' : 'haut';
    base = 'ressenti';
  } else return null;
  if (verdict === 'dedans') return { verdict, base, prochain: { ...o.valeurs }, change: null };
  const p = unPas(o.type, o.mesure, o.valeurs, verdict === 'haut' ? -1 : 1);
  return { verdict, base, ...p };
}

const virgule = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace(/\.0+$/, '').replace('.', ',');

/** « 5,5 km/h et 10 % », « niveau 8 » : les valeurs en clair (unites communes, non traduites) */
export function texteValeurs(v: Valeurs): string {
  const morceaux: string[] = [];
  if (typeof v.vitesse === 'number') morceaux.push(`${virgule(v.vitesse)} km/h`);
  if (typeof v.pente === 'number') morceaux.push(`${virgule(v.pente)} %`);
  if (typeof v.niveau === 'number') morceaux.push(`niveau ${v.niveau}`);
  return morceaux.join(' et ');
}

/**
 * La phrase du bilan (gabarit francais et ses valeurs, traduits a l'affichage) :
 * « Tu étais en zone 2, on garde 5,5 km/h et 10 % », « Un peu haut : la prochaine fois 5,3 km/h ».
 */
export function phraseBilan(s: Suggestion, valeurs: Valeurs): { cle: string; valeurs: string[] } {
  const garde = texteValeurs(valeurs);
  const prochain = texteValeurs(s.change === 'vitesse' ? { vitesse: s.prochain.vitesse } : s.change === 'pente' ? { pente: s.prochain.pente } : s.change === 'niveau' ? { niveau: s.prochain.niveau } : {});
  if (s.base === 'fc') {
    if (s.verdict === 'dedans') return garde ? { cle: 'Tu étais en zone 2, on garde {0}', valeurs: [garde] } : { cle: 'Tu étais en zone 2', valeurs: [] };
    if (!s.change) return { cle: s.verdict === 'haut' ? 'Un peu haut pour la zone 2' : 'Un peu bas pour la zone 2', valeurs: [] };
    return { cle: s.verdict === 'haut' ? 'Un peu haut : la prochaine fois {0}' : 'Un peu bas : la prochaine fois {0}', valeurs: [prochain] };
  }
  if (s.verdict === 'dedans') return garde ? { cle: 'Zone 2 probable, on garde {0}', valeurs: [garde] } : { cle: 'Zone 2 probable', valeurs: [] };
  if (!s.change) return { cle: 'Sans doute au dessus de la zone 2', valeurs: [] };
  return { cle: 'Sans doute au dessus de la zone 2 : la prochaine fois {0}', valeurs: [prochain] };
}
