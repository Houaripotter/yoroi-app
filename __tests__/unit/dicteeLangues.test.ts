// Dictée dans les autres langues : chaque phrase doit être comprise comme sa version française
import { parseDictee } from '@/lib/v2/seance/dictee';
import type { Lang } from '@/lib/i18n/tr';

const LANGUES: Lang[] = ['en', 'de', 'nl', 'es', 'pt', 'it'];
const CHAMPS = ['sport', 'date', 'moment', 'time', 'duration', 'durationSec', 'rounds', 'roundMin', 'distance', 'speed', 'paceSec', 'heartRate', 'maxHeartRate', 'calories', 'intensity', 'mood', 'sessionType', 'exercises', 'partners', 'combatRounds', 'team', 'grade'] as const;
const net = (o: unknown) => JSON.parse(JSON.stringify(o, (k, v) => (['src', 'spans', 'found', 'extraNotes', 'learned'].includes(k) ? undefined : v)));
const now = new Date('2026-10-23T10:00:00');

describe('Dictée dans les autres langues', () => {
  for (const lang of LANGUES) {
    test(`${lang} : comprise comme en français`, () => {
      const paires: [string, string][] = require(`./dictee-langues/tests-${lang}.json`);
      const fautes: string[] = [];
      for (const [phrase, fr] of paires) {
        const a = net(parseDictee(phrase, now, lang));
        const b = net(parseDictee(fr, now, 'fr'));
        for (const k of CHAMPS) if (JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null)) fautes.push(`${phrase} : ${k}`);
      }
      expect(fautes).toEqual([]);
    });
  }
});
