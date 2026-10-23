// Langues de YOROI : contrôle des dictionnaires (anglais, allemand, néerlandais, espagnol, portugais, italien)
import en from '@/lib/i18n/dict/en.json';
import de from '@/lib/i18n/dict/de.json';
import nl from '@/lib/i18n/dict/nl.json';
import es from '@/lib/i18n/dict/es.json';
import pt from '@/lib/i18n/dict/pt.json';
import it from '@/lib/i18n/dict/it.json';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const DICTS: Record<string, Record<string, string>> = { en, de, nl, es, pt, it };
const vars = (s: string) => (s.match(/\{\d+\}|\{\{\s*\w+\s*\}\}/g) ?? []).sort().join(',');

describe('Langues', () => {
  test('tous les dictionnaires ont les mêmes phrases', () => {
    const k = Object.keys(en).sort().join('\n');
    for (const d of [de, nl, es, pt, it]) expect(Object.keys(d).sort().join('\n')).toBe(k);
  });

  test('chaque traduction garde les mêmes variables que le français', () => {
    for (const [lang, d] of Object.entries(DICTS)) {
      const fautes = Object.entries(d).filter(([fr, t]) => vars(fr) !== vars(t)).map(([fr]) => `${lang}: ${fr}`);
      expect(fautes).toEqual([]);
    }
  });

  test('aucun tiret long ni tiret moyen dans les traductions', () => {
    for (const [lang, d] of Object.entries(DICTS)) {
      const fautes = Object.entries(d).filter(([, t]) => /[–—]/.test(t)).map(([fr]) => `${lang}: ${fr}`);
      expect(fautes).toEqual([]);
    }
  });

  test('en français, le texte reste identique', () => {
    expect(traduire('Annuler')).toBe('Annuler');
    expect(traduire('  Ta semaine ')).toBe('  Ta semaine ');
    expect(traduire('Il reste {0} jours', 3)).toBe('Il reste 3 jours');
    expect(traduire(undefined)).toBeUndefined();
    expect(traduirePluriel(1, 1 > 1, '{0} séance', '{0} séances', 1)).toBe('1 séance');
    expect(traduirePluriel(0, 0 > 1, '{0} séance', '{0} séances', 0)).toBe('0 séance');
    expect(traduirePluriel(3, 3 > 1, '{0} séance', '{0} séances', 3)).toBe('3 séances');
  });
});
