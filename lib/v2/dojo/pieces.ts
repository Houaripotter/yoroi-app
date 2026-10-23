/**
 * Vague 40 : l'armure qui se construit. Entre deux paliers, la piece d'armure du palier suivant
 * se construit en 3 etapes, une par tiers du chemin en XP (les memes tiers que les anciennes plaques :
 * platesFor de lib/v2/armure.ts). Les etapes se lisent de bas en haut, comme l'image se devoile.
 * Illustrations Gemini dans le style de l'app, detourees, assets/avatars/app/armure/<piece>.webp.
 */
import type { ImageSourcePropType } from 'react-native';
import { RANKS, nextStepFor, platesFor, rankFor, PLATES_PER_RANK } from '@/lib/v2/armure';
import { rangNom, universCourant, type Univers } from './univers';

export type PieceId = 'bushi' | 'samourai' | 'ronin' | 'shogun' | 'dan';

export type PieceArmure = {
  id: PieceId;
  /** « Le plastron » */
  nom: string;
  /** les 3 etapes, de bas en haut */
  etapes: [string, string, string];
  image: ImageSourcePropType;
  /** largeur sur hauteur de l'image detouree */
  ratio: number;
};

export const PIECES: Record<PieceId, PieceArmure> = {
  bushi: { id: 'bushi', nom: 'Le plastron', etapes: ['les plaques de la jupe', 'le plastron laqué', 'les épaulières et le blason'], image: require('@/assets/avatars/app/armure/bushi.webp'), ratio: 336 / 480 },
  samourai: { id: 'samourai', nom: 'Le casque', etapes: ['le couvre-nuque', 'la bombe du casque', 'le cimier doré'], image: require('@/assets/avatars/app/armure/samourai.webp'), ratio: 490 / 480 },
  ronin: { id: 'ronin', nom: 'Le chapeau et la cape', etapes: ['la cape pliée', 'le bord du chapeau', 'la pointe du chapeau'], image: require('@/assets/avatars/app/armure/ronin.webp'), ratio: 476 / 480 },
  shogun: { id: 'shogun', nom: 'L’armure d’apparat', etapes: ['le socle et la jupe', 'le plastron et les épaules', 'le casque et son cimier'], image: require('@/assets/avatars/app/armure/shogun.webp'), ratio: 284 / 480 },
  dan: { id: 'dan', nom: 'L’éventail de commandement', etapes: ['le manche et les glands', 'le corps de l’éventail', 'le soleil d’or'], image: require('@/assets/avatars/app/armure/dan.webp'), ratio: 249 / 480 },
};

/** Vague 45 : univers Classique, la tenue qui se construit (memes paliers, memes etapes en XP) */
export const PIECES_CLASSIQUE: Record<PieceId, PieceArmure> = {
  bushi: { id: 'bushi', nom: 'La veste d’entraînement', etapes: ['le bas de la veste', 'les manches', 'le col et la fermeture'], image: require('@/assets/avatars/app/classique/tenue/veste.webp'), ratio: 441 / 480 },
  samourai: { id: 'samourai', nom: 'Les baskets de compétition', etapes: ['la semelle', 'le corps de la chaussure', 'les lacets'], image: require('@/assets/avatars/app/classique/tenue/baskets.webp'), ratio: 796 / 480 },
  ronin: { id: 'ronin', nom: 'Le coupe-vent et le sac', etapes: ['le sac de sport', 'le coupe-vent plié', 'la casquette'], image: require('@/assets/avatars/app/classique/tenue/sac.webp'), ratio: 560 / 480 },
  shogun: { id: 'shogun', nom: 'La tenue de champion', etapes: ['le short', 'le maillot', 'les bandes dorées'], image: require('@/assets/avatars/app/classique/tenue/champion.webp'), ratio: 327 / 480 },
  dan: { id: 'dan', nom: 'La médaille d’or', etapes: ['le ruban', 'le disque', 'l’éclat doré'], image: require('@/assets/avatars/app/classique/tenue/medaille.webp'), ratio: 219 / 480 },
};

export function piecesDe(u: Univers = universCourant()): Record<PieceId, PieceArmure> {
  return u === 'classique' ? PIECES_CLASSIQUE : PIECES;
}

/** Piece gagnee en atteignant un rang (1 a 4) ; apres Shogun, l'eventail (ou la medaille) a chaque dan */
export function pieceDuRang(rankIndex: number, u: Univers = universCourant()): PieceArmure {
  const ids: PieceId[] = ['bushi', 'bushi', 'samourai', 'ronin', 'shogun'];
  const P = piecesDe(u);
  return rankIndex >= 1 && rankIndex <= 4 ? P[ids[rankIndex]] : P.dan;
}

export type Construction = {
  piece: PieceArmure;
  /** « Bushi » ou « Shōgun, 2e dan » */
  palier: string;
  /** « Le plastron de Bushi » */
  titre: string;
  /** etapes terminees, 0 a 2 (la 3e est le passage au palier) */
  faites: number;
  /** etape en cours, 1 a 3 */
  enCours: number;
  /** progression sur tout le palier, 0 a 1 (la part devoilee de la piece) */
  progres: number;
  xp: number;
  objectifXp: number;
  resteXp: number;
};

/** Ou en est la piece en construction pour un total d'XP. Memes calculs que les plaques. */
export function construction(xp: number, u: Univers = universCourant()): Construction {
  const r = rankFor(xp);
  const step = nextStepFor(xp);
  const plates = platesFor(xp);
  const piece = r.nextMinXp !== null ? pieceDuRang(r.index + 1, u) : piecesDe(u).dan;
  // le palier suivant porte le nom du rang dans l'univers choisi (« Bushi » ou « Régulier », « Shōgun, 2e dan »)
  const palier = r.nextMinXp !== null ? rangNom(r.index + 1, u) : step.name.replace(RANKS[RANKS.length - 1].name, rangNom(4, u));
  const de = /^[AEIOUÉÈÊaeiou]/.test(palier) ? 'd’' : 'de ';
  return {
    piece,
    palier,
    titre: r.nextMinXp !== null ? `${piece.nom} ${de}${palier}` : `${piece.nom}, ${palier.split(', ')[1] ?? palier}`,
    faites: plates.earned,
    enCours: Math.min(PLATES_PER_RANK, plates.earned + 1),
    progres: plates.progress,
    xp,
    objectifXp: step.minXp,
    resteXp: Math.max(0, step.minXp - xp),
  };
}

export const NB_ETAPES = PLATES_PER_RANK;
export { RANKS };
