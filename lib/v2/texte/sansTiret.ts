/**
 * Filtre d'affichage sans tiret (28 octobre 2026, decision de Houari : aucun tiret ni trait d'union dans les textes affiches).
 * A appliquer SEULEMENT au moment d'afficher un nom venu des donnees (exercice, theme de combat, type de seance, sport,
 * garde, ville). Les donnees, les cles, les recherches et les correspondances d'images gardent le nom d'origine.
 * Regles : « 3-5 » devient « 3 à 5 » ; « Avant-bras » devient « Avant bras » ; « Combat - JJB » devient « Combat, JJB » ;
 * un signe moins devant un nombre (« -5 kg ») est garde.
 * 30 octobre 2026 : le « à » entre deux nombres suit la langue (cle « {0} à {1} », deja traduite : « 3 to 5 » en anglais).
 */
import { traduire } from '@/lib/i18n/tr';

const TIRETS = '\\-\\u2010\\u2011\\u2012\\u2013\\u2014\\u2212';
const ENTRE_NOMBRES = new RegExp(`(\\d)\\s?[${TIRETS}]\\s?(?=\\d)`, 'g');
const ESPACE_TIRET_ESPACE = new RegExp(`\\s+[${TIRETS}]+\\s+`, 'g');
const DANS_UN_MOT = new RegExp(`([\\p{L}\\p{N}])[${TIRETS}]+(?=[\\p{L}])`, 'gu');
const LETTRE_PUIS_CHIFFRE = new RegExp(`(\\p{L})[${TIRETS}]+(?=\\d)`, 'gu');

/** Le mot entre deux nombres dans la langue de l'app, pris dans la traduction de « {0} à {1} » ; illisible : « à » */
let motEntre: string | null = null;
function entreDeuxNombres(): string {
  if (motEntre != null) return motEntre;
  const t = traduire('{0} à {1}', '\u0001', '\u0002');
  const i = t.indexOf('\u0001');
  const j = t.indexOf('\u0002');
  const milieu = i >= 0 && j > i ? t.slice(i + 1, j).trim() : '';
  motEntre = milieu && !new RegExp(`[${TIRETS}]`).test(milieu) ? milieu : 'à';
  return motEntre;
}

export function sansTiret(texte: string): string;
export function sansTiret(texte: string | null | undefined): string | null | undefined;
export function sansTiret(texte: string | null | undefined): string | null | undefined {
  if (!texte) return texte;
  return texte
    .replace(ENTRE_NOMBRES, (_, chiffre: string) => `${chiffre} ${entreDeuxNombres()} `)
    .replace(ESPACE_TIRET_ESPACE, ', ')
    .replace(DANS_UN_MOT, '$1 ')
    .replace(LETTRE_PUIS_CHIFFRE, '$1 ')
    .replace(/\s{2,}/g, ' ');
}
