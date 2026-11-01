/**
 * « Ta prochaine séance » de l'accueil lit ton programme en cours (1er novembre 2026, bug vu sur Mac par Houari :
 * « Rien de prévu, Planifier » alors que son programme Push Pull + Upper Lower prévoyait Push le lendemain).
 * La tuile ne lisait que ton planning (getNextSession, les créneaux de la semaine) et jamais le programme du Coach.
 * Maintenant : la même semaine que la page du programme (joursPrevus, prochainesSeances.ts, avec tes séances
 * faites reliées par seancesFaites.ts), et la première séance pas encore faite, aujourd'hui compris.
 * « Rien de prévu » seulement sans programme ni planning.
 * Données pures, testées dans __tests__/unit/prochaineProgrammeAccueil.test.ts.
 */
import { joursPrevus } from '@/lib/v2/programmes/prochainesSeances';
import type { JourPrevu } from '@/lib/v2/programmes/prochainesSeances';
import type { SeanceEnregistree } from '@/lib/v2/programmes/seancesFaites';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { Programme } from '@/lib/v2/programmes/types';

const p2 = (n: number) => String(n).padStart(2, '0');
const isoDe = (d: Date): string => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/** La première séance à faire : aujourd'hui si elle n'est pas encore faite, sinon la suivante ; null : aucune */
export function prochaineDuProgramme(jours: readonly JourPrevu[], aujourdhui: string): JourPrevu | null {
  return jours.find((j) => !!j.jour && j.date >= aujourdhui && (j.statut === 'aujourdhui' || j.statut === 'avenir')) ?? null;
}

/** La prochaine séance de ton programme, sur cette semaine et les deux suivantes */
export function prochaineSeanceProgramme(a: ProgrammeActif, p: Programme, trainings: readonly SeanceEnregistree[] = [], aujourdhui = new Date()): JourPrevu | null {
  return prochaineDuProgramme(joursPrevus(a, p, 3, aujourdhui, trainings, 0), isoDe(aujourdhui));
}

/** « aujourdhui », « demain », ou null (plus loin : la date) */
export function quandRelatif(date: string, aujourdhui: string): 'aujourdhui' | 'demain' | null {
  if (date === aujourdhui) return 'aujourdhui';
  const d = new Date(`${aujourdhui}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return isoDe(d) === date ? 'demain' : null;
}
