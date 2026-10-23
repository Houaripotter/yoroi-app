/**
 * Modification d'une seance existante : lecture propre (rounds decodes) et details de depart.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTrainingById, openDatabase } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import type { Training } from '@/lib/database';
import { minutesOf, normalizeRounds } from './params';
import type { SessionDetails } from './model';

export async function loadTrainingForEdit(id: number): Promise<Training | null> {
  const t = await getTrainingById(id);
  if (!t) return null;
  const exercises = typeof (t.exercises as unknown) === 'string' ? safeParse(t.exercises as unknown as string) : t.exercises;
  // club supprime (lien mort, sans nom joint) : la seance se relit sans club plutot qu'avec un club fantome
  const clubMort = t.club_id != null && !t.club_name;
  return { ...t, club_id: clubMort ? undefined : t.club_id, exercises: Array.isArray(exercises) ? exercises : undefined, combat_rounds: normalizeRounds(t.combat_rounds) };
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

export function detailsFromTraining(t: Training): SessionDetails {
  return {
    date: t.date.slice(0, 10),
    startMin: minutesOf(t.start_time ?? undefined) ?? 18 * 60,
    duration: t.duration_minutes ?? t.duration ?? 60,
    clubId: t.club_id ?? null,
    outdoor: !!t.is_outdoor,
    place: t.location_name ?? '',
    lat: t.location_lat ?? null,
    lon: t.location_lon ?? null,
    technique: t.technique_rating ?? null,
    cadre: cadreOf(t),
    clubFixe: true,
  };
}

/**
 * Le cadre d'une seance enregistree : dehors, a la maison, en salle (lieu ecrit) ou rien.
 * 17 octobre 2026 : la colonne lieu_type fait foi ; une salle que tu as appelee « Maison » reste une salle.
 * Les seances d'avant (sans lieu_type) sont relues comme avant.
 */
export const MAISON = 'Maison';
function cadreOf(t: Training): SessionDetails['cadre'] {
  if (t.is_outdoor) return 'exterieur';
  if (t.lieu_type === 'maison' || t.lieu_type === 'salle') return t.lieu_type;
  const name = (t.location_name ?? '').trim();
  if (name.toLowerCase() === MAISON.toLowerCase()) return 'maison';
  return name || t.club_id ? 'salle' : null;
}

/** Champs d'une seance qui viennent des details */
export function trainingFromDetails(d: SessionDetails): Partial<Training> {
  // a la maison (sans club) : le lieu s'appelle « Maison », jamais dehors
  const home = !d.clubId && d.cadre === 'maison';
  const place = home ? MAISON : d.place.trim();
  return {
    club_id: d.clubId ?? undefined,
    is_outdoor: home ? false : d.outdoor,
    location_name: place || undefined,
    location_lat: !home && place && d.lat !== null ? d.lat : undefined,
    location_lon: !home && place && d.lon !== null ? d.lon : undefined,
    technique_rating: d.technique ?? null,
    lieu_type: d.clubId ? null : home ? 'maison' : d.cadre === 'exterieur' || d.outdoor ? 'exterieur' : d.cadre === 'salle' ? 'salle' : null,
  };
}

/** Sports qui se pratiquent d'habitude dehors : sans club, « Dehors » est propose d'office (tu peux le changer) */
const DEHORS_PAR_DEFAUT = new Set(['running', 'trail', 'marathon', 'velo', 'cycling', 'vtt', 'velo_route', 'velo_electrique', 'randonnee', 'marche', 'marche_nordique', 'roller']);
export function dehorsParDefaut(sport: string): boolean {
  return DEHORS_PAR_DEFAUT.has((sport ?? '').split(',')[0].trim());
}

/** Machines de salle : pente, resistance et watts n'ont de sens que la */
const MACHINES = new Set(['tapis', 'tapis_de_course', 'elliptique', 'rameur', 'stairmaster', 'assault_bike', 'ski_erg', 'spinning', 'aquabike']);
/** Sports qui se font dehors ou sur machine selon le jour (course sur tapis, velo d'appartement) */
const MACHINE_SI_EN_SALLE = new Set(['running', 'marche', 'velo', 'cycling']);
export function mesuresMachine(sport: string, d?: Pick<SessionDetails, 'clubId' | 'outdoor' | 'cadre'> | null): boolean {
  if (MACHINES.has(sport)) return true;
  if (!MACHINE_SI_EN_SALLE.has(sport) || !d || d.outdoor) return false;
  return d.cadre === 'salle' || (!!d.clubId && d.cadre !== 'exterieur');
}

/** Sport « Autre » : le nom libre vit dans session_type, l'identifiant reste « autre ». Les anciennes seances avaient le nom a la place du sport. */
export function sportLibre(t: Pick<Training, 'sport' | 'session_type'>, connu: (id: string) => boolean): { sport: string; customName?: string } {
  if (t.sport === 'autre') return { sport: 'autre', customName: t.session_type?.trim() || undefined };
  if (t.sport && !t.sport.includes(',') && !connu(t.sport)) return { sport: 'autre', customName: t.sport };
  return { sport: t.sport };
}

const REPAIR_KEY = 'yoroi_rounds_repares_v1';

/**
 * Repare une fois pour toutes les rounds encodes deux fois par l'ancienne saisie de combat
 * (la colonne contenait une chaine JSON au lieu d'un tableau). Sans effet si tout est deja propre.
 */
export async function repairDoubleEncodedRounds(): Promise<number> {
  try {
    if (await AsyncStorage.getItem(REPAIR_KEY)) return 0;
    const db = await openDatabase();
    const rows = await db.getAllAsync<{ id: number; combat_rounds: string }>(
      "SELECT id, combat_rounds FROM trainings WHERE combat_rounds IS NOT NULL AND substr(ltrim(combat_rounds), 1, 1) = '\"'",
    );
    let fixed = 0;
    for (const r of rows) {
      const list = normalizeRounds(r.combat_rounds);
      if (!list) continue;
      await db.runAsync('UPDATE trainings SET combat_rounds = ? WHERE id = ?', [list.length ? JSON.stringify(list) : null, r.id]);
      fixed += 1;
    }
    await AsyncStorage.setItem(REPAIR_KEY, new Date().toISOString());
    if (fixed) logger.info(`Rounds de combat repares : ${fixed}`);
    return fixed;
  } catch (err) {
    logger.warn('Reparation des rounds impossible', err);
    return 0;
  }
}
