/**
 * Les séances réellement faites, reliées aux jours du programme (1er novembre 2026). Houari : « 0 séance sur 4 cette
 * semaine, Séances faites 0, alors que j'ai fait plusieurs séances cette semaine ».
 *
 * La cause : le programme ne comptait que ProgrammeActif.faits, écrit seulement quand une séance est lancée depuis
 * le programme et enregistrée (marquerJourFait). Une séance de musculation saisie d'une autre façon (séance libre,
 * séance passée, import, programme commencé ou changé en cours de semaine) restait invisible pour le programme.
 *
 * La règle, sur les vraies données, rien d'inventé :
 *  1. un jour noté fait par le programme (faits) est fait ;
 *  2. sinon, un jour prévu avec une séance de musculation est fait si une séance de musculation est enregistrée ce
 *     jour-là (un jour de cardio ou de rounds : une séance de n'importe quel sport) ;
 *  3. une séance de musculation restée seule (faite un jour de repos, ou une deuxième le même jour) rattrape le jour
 *     prévu le plus proche avant elle, dans la même semaine, qui n'est pas encore fait ;
 *  4. jamais une séance future, jamais une séance déjà comptée deux fois.
 * Données pures, testées dans __tests__/unit/programmeJourParJour.test.ts.
 */
import type { Training } from '@/lib/database';
import { estSeanceMuscu } from '@/lib/v2/frequence/deuxFois';
import { estJourMuscu } from './finSeance';
import type { JourFait } from './suivi';
import type { JourProgramme } from './types';

/** Ce qu'il faut d'une séance enregistrée */
export type SeanceEnregistree = Pick<Training, 'id' | 'date' | 'sport' | 'exercises'>;

export type JourRelie = {
  /** la séance du programme faite ce jour-là ; null : pas de séance prévue connue */
  jourId: string | null;
  /** la séance enregistrée, pour son détail */
  trainingId?: number;
  /** 'programme' : notée par le programme ; 'seance' : retrouvée dans tes séances */
  source: 'programme' | 'seance';
  /** rattrapée un autre jour : la date où elle a été faite */
  le?: string;
};

const SPORTS_MUSCU = new Set(['musculation', 'powerlifting', 'halterophilie', 'haltérophilie', 'street_workout', 'calisthenics', 'crossfit']);
const iso10 = (s: unknown) => String(s ?? '').slice(0, 10);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Une séance de musculation : des séries de travail, ou un sport de musculation */
export function estMuscuEnregistree(t: SeanceEnregistree): boolean {
  try {
    if (estSeanceMuscu(t as Training)) return true;
  } catch {
    // exercices illisibles : le sport décide
  }
  return SPORTS_MUSCU.has(String(t.sport ?? '').toLowerCase());
}

/** Le lundi (« 2026-10-26 ») de la semaine d'une date */
export function lundiIsoDe(iso: string): string {
  const d = new Date(`${iso10(iso)}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Chaque date faite, reliée à sa séance du programme. `dates` : les dates regardées (dans l'ordre), `prevuLe` : la
 * séance prévue ce jour-là (null : repos), `aujourdhui` : « 2026-11-01 », rien après n'est compté.
 */
export function relierSeances(o: {
  dates: readonly string[];
  prevuLe: (iso: string) => JourProgramme | null;
  faits: readonly JourFait[];
  trainings: readonly SeanceEnregistree[];
  aujourdhui: string;
}): Map<string, JourRelie> {
  const out = new Map<string, JourRelie>();
  const regardees = new Set(o.dates);
  const auj = iso10(o.aujourdhui);
  // 1. ce que le programme a noté
  const dejaComptees = new Set<number>();
  for (const f of o.faits) {
    if (typeof f.trainingId === 'number') dejaComptees.add(f.trainingId);
    if (!regardees.has(f.date) || out.has(f.date)) continue;
    out.set(f.date, { jourId: f.jourId, ...(typeof f.trainingId === 'number' ? { trainingId: f.trainingId } : {}), source: 'programme' });
  }
  // les séances enregistrées de ces dates, pas encore comptées, jamais dans le futur
  const restantes = o.trainings
    .filter((t) => {
      const d = iso10(t?.date);
      return ISO.test(d) && regardees.has(d) && d <= auj && !(typeof t.id === 'number' && dejaComptees.has(t.id));
    })
    .sort((a, b) => iso10(a.date).localeCompare(iso10(b.date)) || (a.id ?? 0) - (b.id ?? 0));
  const utilisees = new Set<SeanceEnregistree>();
  const prevus = new Map<string, JourProgramme>();
  for (const d of o.dates) {
    const j = d <= auj ? o.prevuLe(d) : null;
    if (j) prevus.set(d, j);
  }
  // 2. le jour prévu et sa séance du même jour
  for (const [d, j] of prevus) {
    if (out.has(d)) continue;
    const muscu = estJourMuscu(j);
    const t = restantes.find((x) => !utilisees.has(x) && iso10(x.date) === d && (muscu ? estMuscuEnregistree(x) : true));
    if (!t) continue;
    utilisees.add(t);
    out.set(d, { jourId: j.id, ...(typeof t.id === 'number' ? { trainingId: t.id } : {}), source: 'seance' });
  }
  // 3. une séance de musculation restée seule rattrape le jour prévu le plus proche avant elle, même semaine
  for (const t of restantes) {
    if (utilisees.has(t) || !estMuscuEnregistree(t)) continue;
    const d = iso10(t.date);
    const lundi = lundiIsoDe(d);
    const cible = [...prevus.keys()]
      .filter((x) => x < d && x >= lundi && !out.has(x) && estJourMuscu(prevus.get(x)!))
      .sort()
      .pop();
    if (!cible) continue;
    utilisees.add(t);
    out.set(cible, { jourId: prevus.get(cible)!.id, ...(typeof t.id === 'number' ? { trainingId: t.id } : {}), source: 'seance', le: d });
  }
  return out;
}
