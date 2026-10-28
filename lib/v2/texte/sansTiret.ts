/**
 * Filtre d'affichage sans tiret (28 octobre 2026, decision de Houari : aucun tiret ni trait d'union dans les textes affiches).
 * A appliquer SEULEMENT au moment d'afficher un nom venu des donnees (exercice, theme de combat, type de seance, sport,
 * garde, ville). Les donnees, les cles, les recherches et les correspondances d'images gardent le nom d'origine.
 * Regles : « 3-5 » devient « 3 à 5 » ; « Avant-bras » devient « Avant bras » ; « Combat - JJB » devient « Combat, JJB » ;
 * un signe moins devant un nombre (« -5 kg ») est garde.
 */
const TIRETS = '\\-\\u2010\\u2011\\u2012\\u2013\\u2014\\u2212';
const ENTRE_NOMBRES = new RegExp(`(\\d)\\s?[${TIRETS}]\\s?(?=\\d)`, 'g');
const ESPACE_TIRET_ESPACE = new RegExp(`\\s+[${TIRETS}]+\\s+`, 'g');
const DANS_UN_MOT = new RegExp(`([\\p{L}\\p{N}])[${TIRETS}]+(?=[\\p{L}])`, 'gu');
const LETTRE_PUIS_CHIFFRE = new RegExp(`(\\p{L})[${TIRETS}]+(?=\\d)`, 'gu');

export function sansTiret(texte: string): string;
export function sansTiret(texte: string | null | undefined): string | null | undefined;
export function sansTiret(texte: string | null | undefined): string | null | undefined {
  if (!texte) return texte;
  return texte
    .replace(ENTRE_NOMBRES, '$1 à ')
    .replace(ESPACE_TIRET_ESPACE, ', ')
    .replace(DANS_UN_MOT, '$1 ')
    .replace(LETTRE_PUIS_CHIFFRE, '$1 ')
    .replace(/\s{2,}/g, ' ');
}
