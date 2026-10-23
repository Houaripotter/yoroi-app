/**
 * Calendriers officiels des competitions, ouverts dans le navigateur de l'app.
 * Ils remplacent l'ancienne liste IBJJF et CFJJB ecrite dans le code (perimee depuis juin 2026).
 * Adresses verifiees le 10 octobre 2026. N'ajoute ici qu'une adresse verifiee.
 */
import type { Sport } from '@/lib/fighterMode';
import { traduire } from '@/lib/i18n/tr';

export type OfficialCalendar = { id: string; name: string; sub: string; url: string; sports: Sport[] };

export const OFFICIAL_CALENDARS_CHECKED = traduire('10 octobre 2026');

export const OFFICIAL_CALENDARS: OfficialCalendar[] = [
  { id: 'cfjjb', name: 'CFJJB', sub: traduire('Jiu-jitsu brésilien en France'), url: 'https://cfjjb.com/competitions/calendrier-competitions', sports: ['jjb'] },
  { id: 'ibjjf', name: 'IBJJF', sub: traduire('Jiu-jitsu brésilien, tournois dans le monde'), url: 'https://ibjjf.com/events/calendar', sports: ['jjb'] },
  { id: 'smoothcomp', name: 'Smoothcomp', sub: traduire('Inscriptions en ligne : grappling, jiu-jitsu, MMA'), url: 'https://smoothcomp.com', sports: ['jjb', 'mma', 'judo'] },
  { id: 'ffjudo', name: 'Fédération française de judo', sub: traduire('Judo et jujitsu'), url: 'https://www.ffjudo.com/evenements', sports: ['judo'] },
  { id: 'ffkmda', name: 'FFKMDA', sub: traduire('Kickboxing, muay-thaï, pancrace'), url: 'https://www.ffkmda.com/calendrier/', sports: ['muay_thai', 'mma'] },
];

/** Les calendriers du sport choisi en premier, puis les autres */
export function calendarsFor(sport?: Sport): OfficialCalendar[] {
  if (!sport) return OFFICIAL_CALENDARS;
  const mine = OFFICIAL_CALENDARS.filter((c) => c.sports.includes(sport));
  return [...mine, ...OFFICIAL_CALENDARS.filter((c) => !c.sports.includes(sport))];
}
