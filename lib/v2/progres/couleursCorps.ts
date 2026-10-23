/**
 * Vague 45 : LA source des couleurs de la composition du corps (muscle, graisse, os, eau), pour toute l'app :
 * barre de composition, pastilles, cartes, courbes, detail, Progres, clair et sombre.
 * Houari : « donne des couleurs mieux vues et mieux comprises ». Elles se comprennent sans legende :
 *  - eau en bleu cyan (l'eau, c'est bleu) ;
 *  - muscle en violet indigo profond ;
 *  - graisse en ambre orange ;
 *  - os en gris sable (neutre a dessein : sa chroma est sous le plancher du validateur, l'os est toujours nomme).
 * Jamais de rouge (reserve aux records et aux erreurs).
 * Validees avec le validateur du skill dataviz, en toutes paires (cartes cote a cote) :
 *  - clair, sur papier #F2F1EC et sur blanc : daltonisme (protan, deutan) dE 13,6 au pire, vision normale 18,7,
 *    contraste 3:1 au moins pour les quatre ;
 *  - sombre, sur la carte #1E212B et le fond #10131B : daltonisme dE 11,2, vision normale 16,8, contraste 3:1.
 */
import { paletteSombre } from '@/components/yoroi/livePalette';

export type MesureCorps = 'muscle' | 'graisse' | 'os' | 'eau';

export const CORPS_CLAIR: Record<MesureCorps, string> = { muscle: '#654ABB', graisse: '#C96A16', os: '#5E5446', eau: '#1690C0' };
export const CORPS_SOMBRE: Record<MesureCorps, string> = { muscle: '#7A61D6', graisse: '#D67523', os: '#7A6F60', eau: '#299FCD' };

/** Les couleurs en cours (suivent le mode sombre au rendu) */
export const CORPS: Record<MesureCorps, string> = {
  get muscle() {
    return (paletteSombre() ? CORPS_SOMBRE : CORPS_CLAIR).muscle;
  },
  get graisse() {
    return (paletteSombre() ? CORPS_SOMBRE : CORPS_CLAIR).graisse;
  },
  get os() {
    return (paletteSombre() ? CORPS_SOMBRE : CORPS_CLAIR).os;
  },
  get eau() {
    return (paletteSombre() ? CORPS_SOMBRE : CORPS_CLAIR).eau;
  },
};

/**
 * La couleur d'une mesure du corps par sa cle (celles de lib/v2/progres) : muscle, masse maigre et muscle en kg
 * en violet ; graisse, graisse en kg et gras visceral en ambre ; os en gris sable ; eau en cyan.
 * null pour une mesure qui n'est pas de la composition (IMC, metabolisme, age metabolique).
 */
export function couleurMesureCorps(key: string): string | null {
  switch (key) {
    case 'muscle':
    case 'muscleKg':
    case 'muscle_percent':
    case 'muscle_mass':
    case 'lean':
      return CORPS.muscle;
    case 'fat':
    case 'fatKg':
    case 'fat_percent':
    case 'visceral':
    case 'visceral_fat':
      return CORPS.graisse;
    case 'bone':
    case 'bone_mass':
      return CORPS.os;
    case 'water':
    case 'water_percent':
      return CORPS.eau;
    default:
      return null;
  }
}
