/**
 * Ajout d'une competition au calendrier du telephone.
 * 1. expo-calendar ouvre la fiche d'evenement du systeme : tu valides toi-meme, sans autorisation globale.
 * 2. Si le systeme refuse, on cree un fichier .ics (format standard des calendriers) et on ouvre le partage.
 */
import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Competition } from '@/lib/fighterMode';
import { formatKg } from '@/lib/v2/weightStats';
import { addDays, parseLocalDate } from './dates';
import type { CompetitionExtra } from './extras';
import logger from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

export type CalendarResult = 'saved' | 'opened' | 'shared' | 'canceled' | 'failed';

function notesOf(comp: Competition, extra: CompetitionExtra): string {
  const lines: string[] = [];
  if (comp.categorie_poids) lines.push(traduire("Catégorie : {0}{1}", comp.categorie_poids, comp.poids_max && comp.poids_max < 900 ? `, ${formatKg(comp.poids_max)} kg maximum` : ''));
  if (extra.pesee) lines.push(extra.pesee === 'veille' ? traduire('Pesée la veille') : traduire('Pesée le jour même'));
  if (extra.url) lines.push(extra.url);
  lines.push(traduire('Ajouté depuis YOROI'));
  return lines.join('\n');
}

const pad = (n: number) => String(n).padStart(2, '0');
const icsDate = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function buildIcs(comp: Competition, extra: CompetitionExtra): string {
  const day = parseLocalDate(comp.date);
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YOROI//Competitions//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:yoroi-competition-${comp.id}-${icsDate(day)}@yoroi`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(day)}`,
    `DTEND;VALUE=DATE:${icsDate(addDays(day, 1))}`,
    `SUMMARY:${esc(comp.nom)}`,
    comp.lieu ? `LOCATION:${esc(comp.lieu)}` : '',
    `DESCRIPTION:${esc(notesOf(comp, extra))}`,
    extra.url ? `URL:${extra.url}` : '',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(comp.nom)}`,
    'TRIGGER:-PT15H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

async function shareIcs(comp: Competition, extra: CompetitionExtra): Promise<CalendarResult> {
  if (!(await Sharing.isAvailableAsync().catch(() => false))) return 'failed';
  const dir = FileSystem.cacheDirectory;
  if (!dir) return 'failed';
  const safe = comp.nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'competition';
  const uri = `${dir}${safe}.ics`;
  await FileSystem.writeAsStringAsync(uri, buildIcs(comp, extra), { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType: 'text/calendar', UTI: 'com.apple.ical.ics', dialogTitle: traduire('Ajouter à ton calendrier') });
  return 'shared';
}

export async function addCompetitionToCalendar(comp: Competition, extra: CompetitionExtra): Promise<CalendarResult> {
  const day = parseLocalDate(comp.date);
  if (isNaN(day.getTime())) return 'failed';
  if (Platform.OS !== 'web') {
    try {
      const start = new Date(day);
      start.setHours(8, 0, 0, 0);
      const end = new Date(day);
      end.setHours(18, 0, 0, 0);
      const r = await Calendar.createEventInCalendarAsync({
        title: comp.nom,
        startDate: start,
        endDate: end,
        allDay: true,
        location: comp.lieu || undefined,
        notes: notesOf(comp, extra),
        url: extra.url,
        alarms: [{ relativeOffset: -24 * 60 }],
      });
      if (r.action === 'saved') return 'saved';
      if (r.action === 'canceled' || r.action === 'deleted') return 'canceled';
      return 'opened';
    } catch (e) {
      logger.warn('Fiche calendrier du systeme indisponible, passage par un fichier .ics', e);
    }
  }
  try {
    return await shareIcs(comp, extra);
  } catch (e) {
    logger.error('Ajout au calendrier impossible', e);
    return 'failed';
  }
}
