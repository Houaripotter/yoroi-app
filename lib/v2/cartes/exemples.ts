/**
 * 3 novembre 2026 (photos d'exemple), Houari : « que les gens se projettent ». Les vignettes de Mes cartes et l'apercu
 * du studio en composition Ta photo montrent une photo d'EXEMPLE tant que tu n'as pas mis la tienne.
 * Images generees par Google Gemini pour YOROI, personnes fictives (assets/images/cartes_exemple/LICENCE.txt).
 *
 * Les regles (fonctions pures, testees dans __tests__/unit/cartesPhotosExemple.test.tsx) :
 * 1. le visuel se choisit par famille et par sport : musculation (homme et femme en alternance), course, JJB et sports
 *    de combat, marche, record (de musculation ; un record de course ou de combat prend le visuel de son sport) ;
 *    avant apres avec ses deux photos ;
 * 2. les chiffres restent TES chiffres ; seule la vignette avant apres d'exemple, sans tes photos, montre un chiffre
 *    d'exemple (−8,4 kg), marque « Exemple » ;
 * 3. une photo d'exemple n'entre JAMAIS dans un export : visuelsSansExemple() la retire, la carte retombe sur le dessin ;
 * 4. la protection du visage s'applique aussi : chaque exemple donne la boite de son visage (tiers superieur), mesuree
 *    sur l'image, comme le ferait le module photo.
 */
import type { CarteData, FamilleMoteur, PhotoCarte } from './types';
import type { AnalysePhoto, BoitePart } from './moteur/analysePhoto';
import { compositionsPour, famillesPour } from './moteur/familles';
import { carteAvantApres } from './avantApres';
import { traduire } from '@/lib/i18n/tr';

export type ExempleId = 'muscu_homme' | 'muscu_femme' | 'course' | 'jjb' | 'marche' | 'record' | 'avant' | 'apres';

export const EXEMPLES: ExempleId[] = ['muscu_homme', 'muscu_femme', 'course', 'jjb', 'marche', 'record', 'avant', 'apres'];

/** La taille de chaque image, en pixels (connue : pas besoin de la lire sur l'appareil) */
export const TAILLES_EXEMPLE: Record<ExempleId, { w: number; h: number }> = {
  muscu_homme: { w: 1080, h: 1935 },
  muscu_femme: { w: 1080, h: 1935 },
  course: { w: 1080, h: 1935 },
  jjb: { w: 1080, h: 1935 },
  marche: { w: 1080, h: 1935 },
  record: { w: 1080, h: 1935 },
  avant: { w: 1080, h: 1200 },
  apres: { w: 1080, h: 1200 },
};

/**
 * Le visage de chaque exemple, en part de l'image (mesure le 3 novembre 2026 sur les images finales).
 * Les photos sont cadrees avec le visage dans le tiers superieur.
 */
export const VISAGES_EXEMPLE: Record<ExempleId, BoitePart> = {
  muscu_homme: { x: 0.424, y: 0.268, l: 0.216, h: 0.12 },
  muscu_femme: { x: 0.421, y: 0.151, l: 0.194, h: 0.108 },
  course: { x: 0.457, y: 0.216, l: 0.127, h: 0.071 },
  jjb: { x: 0.396, y: 0.055, l: 0.219, h: 0.122 },
  marche: { x: 0.419, y: 0.167, l: 0.132, h: 0.074 },
  record: { x: 0.379, y: 0.278, l: 0.182, h: 0.102 },
  avant: { x: 0.406, y: 0.036, l: 0.16, h: 0.144 },
  apres: { x: 0.446, y: 0.038, l: 0.147, h: 0.132 },
};

/** L'analyse d'un exemple : son visage, de face ; jamais de masque (A+ reste eteint) */
export function analyseExemple(id: ExempleId): AnalysePhoto {
  return { visages: [VISAGES_EXEMPLE[id]], corps: null, frontal: true, masque: null, lumiere: null, niveau: 'A', raisons: ['exemple'], source: null };
}

/**
 * Le rang de l'exemple dans le studio : celui de la vignette touchee (&exemple= dans le lien), sinon un rang stable
 * pour la carte (homme ou femme, toujours le meme pour la meme carte).
 */
export function rangStudio(cle: string, voulu?: string | null): number {
  if (voulu === 'muscu_homme') return 0;
  if (voulu === 'muscu_femme') return 1;
  return rangDe(cle);
}

/** Vrai si la valeur est un exemple connu (lu dans un lien) */
export function estExempleId(x: unknown): x is ExempleId {
  return typeof x === 'string' && (EXEMPLES as string[]).includes(x);
}

/** Un rang stable pour une carte (studio) : homme ou femme, toujours le meme pour la meme carte */
export function rangDe(cle: string): number {
  let n = 0;
  for (let i = 0; i < cle.length; i++) n = (n + cle.charCodeAt(i)) % 9973;
  return n;
}

function muscu(rang: number): ExempleId {
  return rang % 2 === 1 ? 'muscu_femme' : 'muscu_homme';
}

/**
 * L'exemple d'une carte, par famille et par sport ; null si la carte n'a pas de composition Ta photo, si tu as deja
 * ta photo, ou si aucun exemple ne lui va (pesee, mois, objectifs...). L'avant apres a sa carte d'exemple a part.
 * rang : la place de la carte parmi les cartes de musculation (homme et femme en alternance).
 */
export function exemplePourCarte(d: CarteData | null | undefined, rang = 0, aPhoto = false, famille?: FamilleMoteur): ExempleId | null {
  if (!d || aPhoto) return null;
  const fams = famillesPour(d);
  const f = famille && fams.includes(famille) ? famille : fams[0];
  if (!f || f === 'transfo') return null;
  if (!compositionsPour(d, f).includes('A')) return null;
  switch (f) {
    case 'muscu':
      return muscu(rang);
    case 'course':
      return 'course';
    case 'marche':
      return 'marche';
    case 'jjb':
      return 'jjb';
    case 'record':
      // un record de course ou de combat garde le visuel de son sport ; la fonte, la photo record
      if (d.famille === 'course') return 'course';
      if (d.famille === 'combat') return 'jjb';
      return 'record';
    case 'sport':
    case 'exploit':
      // un autre sport ou un exploit : le visuel de son sport
      if (d.famille === 'combat') return 'jjb';
      if (d.famille === 'course') return 'course';
      if (d.famille === 'muscu') return muscu(rang);
      return null;
    default:
      return null;
  }
}

/** Les poids de l'exemple avant apres : −8,4 kg, en un peu plus de 6 mois */
export const POIDS_EXEMPLE = { avant: 92.6, apres: 84.2 } as const;

/**
 * La carte avant apres d'EXEMPLE, quand tu n'as pas encore tes deux photos : les deux photos d'exemple et un chiffre
 * d'exemple, marque « Exemple » dans sa ligne et par la pastille de la vignette. uris : les deux images resolues.
 */
export function carteAvantApresExemple(uris: { avant: string; apres: string }): CarteData {
  const photos: PhotoCarte[] = [
    { id: 'exemple_avant', uri: uris.avant, date: '2026-03-02', poids: POIDS_EXEMPLE.avant },
    { id: 'exemple_apres', uri: uris.apres, date: '2026-09-14', poids: POIDS_EXEMPLE.apres },
  ];
  const d = carteAvantApres(photos)!;
  return { ...d, sousTitre: traduire('Exemple, −8,4 kg'), cle: 'avant_apres:exemple', exemple: true };
}

/**
 * L'avant apres de la rubrique : le tien des que tu as tes deux photos (tes chiffres) ; sinon celui d'exemple,
 * seule carte qui porte un chiffre d'exemple.
 */
export function avantApresOuExemple(tien: CarteData | null | undefined, exemple: CarteData): CarteData {
  return tien ?? exemple;
}

/** Vrai si la carte est une carte d'exemple (jamais tes donnees) */
export function estCarteExemple(d: CarteData | null | undefined): boolean {
  return !!d?.exemple;
}

/** Ce que la carte recoit pour dessiner ta photo (le sous-ensemble utile de VisuelsCarte) */
export type VisuelsPhoto = {
  photo?: string | null;
  analyse?: AnalysePhoto | null;
  recadrage?: { zoom: number; dx: number; dy: number } | null;
  taillePhoto?: { w: number; h: number } | null;
  exemple?: boolean;
};

/** Les visuels avec la photo d'exemple a la place de la tienne */
export function visuelsAvecExemple<V extends VisuelsPhoto>(v: V, id: ExempleId, uri: string): V & VisuelsPhoto {
  return { ...v, photo: uri, analyse: analyseExemple(id), recadrage: null, taillePhoto: TAILLES_EXEMPLE[id], exemple: true };
}

/**
 * Les visuels pour un export (enregistrer, partager, copier) : JAMAIS de photo d'exemple. Sans ta photo, la carte
 * retombe sur le dessin ou ta couleur (compositionEffective : Ta photo sans photo devient Dessin).
 */
export function visuelsSansExemple<V extends VisuelsPhoto>(v: V): V & VisuelsPhoto {
  if (!v.exemple) return v;
  return { ...v, photo: null, analyse: null, recadrage: null, taillePhoto: null, exemple: false };
}
