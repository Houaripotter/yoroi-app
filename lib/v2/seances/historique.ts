/**
 * L'historique complet de tes séances (3 novembre 2026, Houari : « un appui sur Ta dernière séance ouvre la liste de
 * TOUTES les séances passées »). Données pures, lues par app/history.tsx :
 *  - grouperParJour : de la plus récente à la plus ancienne, une section par jour. Un même jour peut contenir
 *    plusieurs séances (deux marches, la musculation et le JJB) : elles restent ensemble, la plus tardive en haut ;
 *  - filtrerParSport : le filtre des pastilles du haut (le premier sport de la séance, comme l'onglet Séances) ;
 *  - chiffreCle : le chiffre qui résume une séance sur sa ligne (kilos soulevés, distance, rounds, séries...).
 * Rien n'est inventé : seulement ce qui est enregistré dans la séance.
 */
import type { Training } from '@/lib/database';
import { durationOf, formatDuration } from '@/lib/v2/trainingWeek';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { DOW_LONG, MONTHS, dateOf, daysFrom, firstSport } from './sessionData';
import { keyFacts } from './weekCompare';

export type SectionJour = {
  /** « 2026-11-02 » */
  key: string;
  /** « Aujourd’hui », « Hier », « Samedi 31 octobre », « Lundi 3 mars 2025 » */
  titre: string;
  /** « 3 séances, 2 h 10 » */
  resume: string;
  data: Training[];
};

const jourDe = (t: Training): string => String(t.date ?? '').slice(0, 10);

/** La plus récente d'abord ; le même jour, la plus tardive d'abord (sans heure : la dernière enregistrée) */
export function trierRecentes(trainings: readonly Training[]): Training[] {
  return [...trainings].sort((a, b) => {
    const da = jourDe(a);
    const db = jourDe(b);
    if (da !== db) return da < db ? 1 : -1;
    const ha = a.start_time ?? '';
    const hb = b.start_time ?? '';
    if (ha !== hb) return hb.localeCompare(ha);
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}

/** Le titre d'un jour de l'historique */
export function titreJour(iso: string, aujourdhui: string): string {
  const n = daysFrom(iso, aujourdhui);
  if (n === 0) return traduire('Aujourd’hui');
  if (n === 1) return traduire('Hier');
  const d = dateOf(iso);
  const base = `${DOW_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const avecAnnee = iso.slice(0, 4) !== aujourdhui.slice(0, 4) ? `${base} ${iso.slice(0, 4)}` : base;
  return avecAnnee.charAt(0).toLocaleUpperCase() + avecAnnee.slice(1);
}

/** « 3 séances, 2 h 10 » : le résumé d'un jour */
export function resumeJour(items: readonly Training[]): string {
  const n = items.length;
  const min = items.reduce((s, t) => s + durationOf(t), 0);
  const parts = [traduirePluriel(n, n > 1, '{0} séance', '{0} séances', n)];
  if (min > 0) parts.push(formatDuration(min));
  return parts.join(', ');
}

/** Une section par jour, du plus récent au plus ancien ; les séances sans date sont écartées */
export function grouperParJour(trainings: readonly Training[], aujourdhui: string): SectionJour[] {
  const out: SectionJour[] = [];
  let courante: SectionJour | null = null;
  for (const t of trierRecentes(trainings)) {
    const d = jourDe(t);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    if (!courante || courante.key !== d) {
      courante = { key: d, titre: titreJour(d, aujourdhui), resume: '', data: [] };
      out.push(courante);
    }
    courante.data.push(t);
  }
  for (const s of out) s.resume = resumeJour(s.data);
  return out;
}

/** Le filtre des pastilles : null, toutes tes séances ; sinon le premier sport de la séance */
export function filtrerParSport(trainings: readonly Training[], sport: string | null): Training[] {
  if (!sport) return [...trainings];
  return trainings.filter((t) => firstSport(t.sport) === sport);
}

/** Les sections à montrer pour un chargement progressif : les `n` premiers jours */
export function premiersJours(sections: readonly SectionJour[], n: number): SectionJour[] {
  return sections.slice(0, Math.max(0, n));
}

/** L'heure de la séance : « 18 h 30 » (vide si elle n'a pas d'heure) */
export function heureDe(t: Training, langue = 'fr'): string {
  const h = (t.start_time ?? '').slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(h)) return '';
  return langue === 'fr' ? h.replace(':', ' h ') : h;
}

/** Le chiffre clé d'une séance, en dehors de sa durée : kilos soulevés, séries, rounds, distance, cardio, calories */
export function chiffreCle(t: Training, unite: UnitePoids = 'kg'): string {
  const f = keyFacts(t, unite).find((x) => x.kind !== 'duree');
  return f ? f.text : '';
}
