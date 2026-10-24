/**
 * Le programme dans ton planning (24 octobre 2026) : sur ton accord, YOROI ajoute à ton planning de la
 * semaine un créneau par séance du programme, les jours conseillés (lundi, mercredi, vendredi pour 3 jours).
 * Les identifiants des créneaux créés sont gardés à part (aucune colonne ajoutée à la base) : on ne touche
 * jamais à tes autres créneaux, et « Retirer » n'enlève que ceux que YOROI a créés.
 * Un créneau du programme ouvre directement la prochaine séance du programme.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WeeklyPlan } from '@/lib/database';
import { programmeParId, sportDuProgramme } from './catalogue';
import { routeDuJour } from './lancer';
import { chargerProgrammeActif, joursConseilles, semaineDuProgramme } from './suivi';
import type { Programme } from './types';

const CLE = 'yoroi_programme_creneaux_v1';

export type CreneauxProgramme = { programme: string; ids: number[]; heure: string };

/**
 * Sport des créneaux : celui de la saisie qui ouvrira la séance (musculation pour un programme d'exercices,
 * même au football), pour que le créneau tapé n'ouvre jamais une saisie d'un autre genre
 */
export function sportDesCreneaux(p: Programme): string {
  const j = p.jours[0];
  if (j?.cardio) return j.cardio.sport;
  if (j?.rounds) return j.rounds.sport;
  return p.jours.some((x) => x.exos.length) ? 'musculation' : sportDuProgramme(p);
}

/** Les créneaux à créer : jours conseillés (0 = lundi), sport et durée du programme, ton heure */
export function creneauxACreer(p: Programme, heure: string, titre: string): WeeklyPlan[] {
  return joursConseilles(p.joursParSemaine).map((d) => ({
    day_of_week: d,
    sport: sportDesCreneaux(p),
    time: heure,
    duration_minutes: p.dureeMin,
    label: titre,
  }));
}

/** Créneaux du planning qui existent encore parmi ceux que YOROI a créés */
export function creneauxRestants(c: CreneauxProgramme | null, plan: WeeklyPlan[]): number[] {
  if (!c) return [];
  const ids = new Set(plan.map((s) => s.id).filter((x): x is number => typeof x === 'number'));
  return c.ids.filter((id) => ids.has(id));
}

export async function chargerCreneaux(): Promise<CreneauxProgramme | null> {
  try {
    const raw = await AsyncStorage.getItem(CLE);
    if (!raw) return null;
    const v = JSON.parse(raw) as CreneauxProgramme;
    return v && typeof v.programme === 'string' && Array.isArray(v.ids) ? v : null;
  } catch {
    return null;
  }
}

export async function enregistrerCreneaux(c: CreneauxProgramme | null): Promise<void> {
  try {
    if (!c) await AsyncStorage.removeItem(CLE);
    else await AsyncStorage.setItem(CLE, JSON.stringify(c));
  } catch {
    // rien de grave : le planning reste tel quel
  }
}

/**
 * La séance que doit ouvrir un créneau : la prochaine du programme suivi si le créneau a été créé pour lui,
 * sinon null (le créneau ouvre la saisie de son sport, comme avant)
 */
export async function routeDuCreneau(slotId: number | null | undefined): Promise<{ pathname: string; params: Record<string, string> } | null> {
  if (!slotId) return null;
  try {
    const [c, a] = await Promise.all([chargerCreneaux(), chargerProgrammeActif()]);
    const p = a ? programmeParId(a.id) : undefined;
    if (!p || !a || !p.jours.length || !estCreneauDuProgramme(c, slotId, p.id)) return null;
    return routeDuJour(p, p.jours[a.prochain % p.jours.length], semaineDuProgramme(a));
  } catch {
    return null;
  }
}

/** Le créneau appartient au programme : son id fait partie de ceux créés pour lui */
export function estCreneauDuProgramme(c: CreneauxProgramme | null, slotId: number, programmeId: string): boolean {
  return !!c && c.programme === programmeId && c.ids.includes(slotId);
}
