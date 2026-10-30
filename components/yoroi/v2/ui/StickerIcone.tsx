/**
 * Le sticker a la place d'une icone au trait (30 octobre 2026, Houari : « je deteste les icones »).
 * Table des icones qui ont un sticker clair, partagee par les composants Icon de l'app (espace, seances, seance,
 * accueil, combat, carnet, nutrition). Avec le reglage Illustrations sur Stickers, l'icone devient le sticker ;
 * en Encre japonaise, l'icone d'avant reste. Passe par useIllustrations : le changement de reglage redessine tout.
 *
 * Ne sont PAS dans la table : les icones purement fonctionnelles (chevron, croix, retour, plus, moins, coche,
 * haut, bas, points de menu, pause) et celles qui n'ont pas de sticker adapte ou dont le sens change selon
 * l'ecran (cadenas, bouclier, oeil, document, info, image, personne, etincelles). Un appel peut imposer un
 * sticker avec la prop sticker, ou le refuser avec sticker={false}.
 * Le sticker est dessine un peu plus grand que l'icone (le contour blanc prend de la place), avec une marge
 * negative : la mise en page ne bouge pas.
 */
import React from 'react';
import { Image } from 'react-native';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';

export const STICKER_ICONE: Readonly<Record<string, NomSticker>> = {
  share: 'partager',
  crown: 'couronne',
  bell: 'rappels',
  moon: 'sommeil',
  bed: 'sommeil',
  sun: 'soleil',
  calendar: 'calendrier',
  scale: 'balance',
  trophy: 'trophee',
  medal: 'medaille_or',
  star: 'etoile',
  flame: 'flamme',
  heart: 'coeur',
  dumbbell: 'musculation',
  search: 'recherche',
  trash: 'corbeille',
  edit: 'crayon',
  pencil: 'crayon',
  camera: 'appareil_photo',
  clock: 'chrono',
  timer: 'chrono',
  target: 'objectifs',
  bolt: 'force_eclair',
  drop: 'nutrition',
  book: 'carnet',
  note: 'carnet_papier',
  download: 'sauvegarde',
  upload: 'sauvegarde',
  save: 'sauvegarde',
  restore: 'refresh',
  sync: 'refresh',
  refresh: 'refresh',
  repeat: 'repeter',
  play: 'play',
  glove: 'gants',
  belt: 'ceinture_nouee',
  mountain: 'montagne_drapeau',
  watch: 'sante_appareils',
  link: 'chaine',
  globe: 'langue',
  chart: 'bilan',
  tape: 'metre_ruban',
  ruler: 'metre_ruban',
  table: 'tableur',
  body: 'corps',
  archive: 'coffre_ferme',
  pulse: 'cardio_zone2',
  wind: 'souffle',
  steps: 'empreintes',
  history: 'sablier',
  swords: 'katanas',
  broom: 'balai',
  wand: 'presentation',
  route: 'sentier',
  map: 'carte_tresor',
  text: 'taille_texte',
  swap: 'fleches_haut_bas',
  video: 'videos',
  film: 'videos',
  run: 'course',
};

/** Le sticker d'une icone, s'il y en a un */
export function stickerDeLIcone(nom: string | undefined | null): NomSticker | undefined {
  return nom ? STICKER_ICONE[nom] : undefined;
}

/** Le sticker a retenir : celui impose, sinon celui de la table ; rien avec false */
export function choixSticker(nom: string | undefined | null, sticker?: NomSticker | false): NomSticker | undefined {
  if (sticker === false) return undefined;
  return sticker ?? stickerDeLIcone(nom);
}

/** Taille dessinee du sticker pour une icone de taille donnee */
export function tailleSticker(taille: number): number {
  return Math.round(taille * 1.3);
}

/**
 * Le sticker de l'icone si le reglage est sur Stickers, sinon l'icone passee en enfant.
 * Utilise par les composants Icon ; un ecran peut aussi l'utiliser autour d'une icone d'une autre bibliotheque.
 */
export function IconeOuSticker({ nom, sticker, taille, children }: { nom?: string | null; sticker?: NomSticker | false; taille: number; children: React.ReactNode }) {
  const illus = useIllustrations();
  const choisi = choixSticker(nom, sticker);
  if (!choisi || !illus.stickers) return <>{children}</>;
  const t = tailleSticker(taille);
  const m = (taille - t) / 2;
  return <Image source={illus.img(choisi)} style={{ width: t, height: t, margin: m }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}
