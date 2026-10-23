/**
 * Proposition d'accueil (17 octobre 2026, nuit). Houari veut voir les maquettes et choisir avant toute application.
 * Trois mises en page de la meme donnee, basculables en une ligne :
 *   A  Tuiles vivantes : la grille de 2 colonnes, chaque tuile avec sa micro visualisation
 *   B  Sections        : les memes tuiles rangees en chapitres titres (Aujourd'hui, Ton entrainement, Ton corps)
 *   C  Tableau du jour : un grand tableau Aujourd'hui (anneaux, recuperation, sommeil, eau), puis un carrousel
 * 17 octobre nuit : Houari choisit C. Reglage interne : PROPOSITION_DEFAUT ci-dessous ; la cle CLE_PROPOSITION (AsyncStorage) la remplace pour un essai.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PropositionAccueil = 'A' | 'B' | 'C';

/** Pour appliquer le choix de Houari : changer cette lettre */
export const PROPOSITION_DEFAUT: PropositionAccueil = 'C';
export const CLE_PROPOSITION = 'yoroi.accueil.proposition';

export function propositionPropre(v: unknown): PropositionAccueil {
  return v === 'A' || v === 'B' || v === 'C' ? v : PROPOSITION_DEFAUT;
}

export function useProposition(): PropositionAccueil {
  const [p, setP] = useState<PropositionAccueil>(PROPOSITION_DEFAUT);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(CLE_PROPOSITION)
      .then((v) => alive && v && setP(propositionPropre(v)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return p;
}

/** Proposition B : le chapitre de chaque bloc */
export function sectionDuBloc(b: string): 'jour' | 'entrainement' | 'corps' | 'mois' {
  if (b === 'activite' || b === 'forme' || b === 'mange') return 'jour';
  if (b === 'semaine' || b === 'progres' || b === 'rendezvous') return 'entrainement';
  if (b === 'mois') return 'mois';
  return 'corps';
}

export const TITRES_SECTIONS: Record<'jour' | 'entrainement' | 'corps' | 'mois', string> = {
  jour: 'Aujourd’hui',
  entrainement: 'Ton entraînement',
  corps: 'Ton corps',
  mois: 'Ton mois',
};

/**
 * Lisibilite des valeurs des anneaux sur la carte claire (17 octobre nuit) : A « pastille » (le chiffre dans la
 * couleur exacte de l'anneau, sur une pastille noire, retenue : l'eclat reste et c'est AA, 4,9 a 15,7 sur le noir)
 * ou B « barre » (le chiffre en encre et une barre fine de la couleur de l'anneau). Reglage interne, comme la
 * proposition ; la cle CLE_STYLE_VALEURS le remplace pour un essai.
 */
// 17 octobre : Houari trouve la pastille noire trop lourde ; trois traitements legers a l'essai, sans pastille :
// « ombre » (ombre portee douce de la meme teinte, plus sombre, 35 %), « trait » (contour fin plus sombre, 0,6),
// « surlignage » (surlignage pale de la teinte, arrondi, sans bord). 17 octobre soir : Houari choisit le surlignage,
// applique par defaut ; en clair fond a 17 % et vert et cyan assombris de 15 %, en sombre couleur exacte sur 18 %.
export type StyleValeurs = 'pastille' | 'barre' | 'ombre' | 'trait' | 'surlignage';
const STYLES_VALEURS: StyleValeurs[] = ['pastille', 'barre', 'ombre', 'trait', 'surlignage'];
export const STYLE_VALEURS_DEFAUT: StyleValeurs = 'surlignage';
export const CLE_STYLE_VALEURS = 'yoroi.accueil.valeurs.style';

export function useStyleValeurs(): StyleValeurs {
  const [v, setV] = useState<StyleValeurs>(STYLE_VALEURS_DEFAUT);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(CLE_STYLE_VALEURS)
      .then((x) => alive && STYLES_VALEURS.includes(x as StyleValeurs) && setV(x as StyleValeurs))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return v;
}


/**
 * Contour noir autour de l'anneau rose (17 octobre) : « avec » (le disque noir deborde de 4 points autour des trois
 * anneaux, retenu) ou « sans » (le disque noir s'arrete au bord interieur de l'anneau rose, pose directement sur la
 * carte ; les espaces noirs entre les anneaux et le centre restent). 17 octobre soir : Houari choisit « sans », par defaut.
 */
export type StyleContour = 'avec' | 'sans';
export const STYLE_CONTOUR_DEFAUT: StyleContour = 'sans';
export const CLE_STYLE_CONTOUR = 'yoroi.accueil.anneaux.contour';

export function useStyleContour(): StyleContour {
  const [v, setV] = useState<StyleContour>(STYLE_CONTOUR_DEFAUT);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(CLE_STYLE_CONTOUR)
      .then((x) => alive && (x === 'avec' || x === 'sans') && setV(x))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return v;
}
