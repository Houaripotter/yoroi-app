/**
 * Palette vivante P des ecrans v2 (vague 35, mode sombre).
 * P garde la meme forme qu'avant (P.paper, P.ink, P.white...) mais ses valeurs changent quand le theme bascule :
 * le fournisseur de theme recopie P_CLAIR ou P_SOMBRE dedans avant de redessiner l'app.
 * En sombre, P.white devient la surface des cartes (encre un cran plus claire) et P.ink le texte papier :
 * un texte « blanc » pose sur l'accent devient donc de l'encre sur un indigo eclairci (contraste 7,8:1).
 * Pour un blanc qui doit rester blanc (texte pose sur une illustration), utilise P.pureWhite.
 */

export const P_CLAIR = {
  // 27 octobre 2026, refonte « Pastel et Ciel » : fond gris bleute, encre bleu nuit, lignes bleutees
  paper: '#F5F6FB',
  ink: '#1D2033',
  ink2: '#646985',
  muted: '#8F94AC',
  line: '#E4E7F1',
  line2: '#ECEEF5',
  dashed: '#B8BED3',
  // Couleur d'action : bleu nuit (suit theme.colors.accent), lisible en texte. Correction du 27 octobre (Houari :
  // « le bleu plein est trop fort ») : les fonds d'action sont pastel (primary), le bleu vif (detail) pour les petits details
  accent: '#23358F',
  accentDark: '#1A2870',
  accentSoft: '#EEF1FF',
  accentText: '#23358F',
  primary: '#DCE3FF',
  /** 27 octobre 2026 : le pastel un cran plus soutenu, a l'appui */
  primaryPressed: '#C9D3FB',
  onPrimary: '#23358F',
  detail: '#4C6EF5',
  /** fond pastel de la carte Ton poids (degrade tres leger) et points du carrousel */
  poidsFond: '#E8ECFF',
  poidsFond2: '#F1ECFF',
  pointInactif: '#C9D2F5',
  // Rouge soie : erreurs, suppressions, alertes ; et tampons de record
  danger: '#B0282E',
  dangerSoft: '#F6E3E1',
  record: '#B0282E',
  // Famille coeur (frequence cardiaque, tension)
  heart: '#7B3B63',
  red: '#B0282E',
  redDark: '#8C1E23',
  redSoft: '#F6E3E1',
  indigo: '#3557D9',
  indigoSoft: '#EEF1FF',
  gold: '#C59D45',
  goldDark: '#9C7A2F',
  goldLight: '#E3C47B',
  goldSoft: '#F5ECD6',
  moss: '#6E8C3A',
  mossText: '#4F6B28',
  mossSoft: '#E8EEDC',
  white: '#FFFFFF',
  lacquer: '#454A58',
  water: '#3D5D9E',
  /** blanc qui reste blanc dans les deux modes (texte sur une illustration) */
  pureWhite: '#FFFFFF',
  /** papier washi de la carte poids et son bord */
  washi: '#FFFFFF',
  washiBord: '#E4E7F1',
  /** verre des boutons ronds poses sur une scene */
  glass: 'rgba(255,255,255,0.86)',
  /** bande claire sous une carte (derniere seance, mensurations) */
  bande: '#F8F9FD',
  /** carte en verre (blanc a 80 %) */
  carte: 'rgba(255,255,255,0.8)',
  /** fonds doux des tuiles Tes outils */
  tuileIndigo: '#EEF1FF',
  tuileOr: '#EFE7D6',
  tuileMousse: '#E4EADB',
  tuileRouge: '#EEE1DF',
  tuileBord: 'rgba(255,255,255,0.9)',
  /**
   * 27 octobre 2026 (maquettes choisies : Ton accueil A, Plus A, Ta scene C) : les pastels des pastilles de bloc,
   * des tuiles du bouton + et de la carte du programme du jour. fond = aplat de tuile, texte = son ecriture lisible.
   */
  pastelLilas: '#C9B6E4',
  pastelPeche: '#F7B8A2',
  pastelMenthe: '#A9DCC0',
  pastelCiel: '#B9C7F2',
  pastelSable: '#EBD29A',
  pastelEteint: '#D3D6E2',
  tuileMentheFond: '#E3F2EA',
  tuileMentheTexte: '#1C6B45',
  tuileSableFond: '#FFF1C7',
  tuileSableTexte: '#7A5200',
  programmeFond: '#EFE6F3',
  programmeFond2: '#E8ECFF',
  etiquettePrune: '#7B3F6E',
  semaineFaite: '#B8A6E8',
  semaineJour: '#7B5BD6',
  semainePrevue: '#D7CDF5',
  semaineRepos: '#E6E2F2',
  poignee: '#B4B9CC',
  chevron: '#A3A8BE',
  cadre: '#1D2033',
};

export type PaletteV2 = typeof P_CLAIR;

/** Nuit : fond encre bleute tres fonce, cartes un cran plus claires, texte papier, couleurs eclaircies (AA) */
export const P_SOMBRE: PaletteV2 = {
  paper: '#10131B',
  ink: '#ECEAE3',
  ink2: '#B8BBC6',
  muted: '#8A8E9B',
  line: '#2B303D',
  line2: '#242935',
  dashed: '#4B5162',
  accent: '#8FA8DE',
  accentDark: '#7A94CC',
  accentSoft: '#212B42',
  accentText: '#8FA8DE',
  primary: '#2A3557',
  primaryPressed: '#33406A',
  onPrimary: '#DCE3FF',
  detail: '#8FA8DE',
  poidsFond: '#1E2540',
  poidsFond2: '#231F3D',
  pointInactif: '#3A4466',
  danger: '#EC7A70',
  dangerSoft: '#3A2326',
  record: '#EC7A70',
  heart: '#D08AB6',
  red: '#EC7A70',
  redDark: '#D45F55',
  redSoft: '#3A2326',
  indigo: '#8FA8DE',
  indigoSoft: '#212B42',
  gold: '#D8B562',
  goldDark: '#D3AE5C',
  goldLight: '#C9A85E',
  goldSoft: '#2F2A1C',
  moss: '#93B562',
  mossText: '#A8C77A',
  mossSoft: '#222B1D',
  white: '#1A1E29',
  lacquer: '#A6ABB8',
  water: '#86A2DA',
  pureWhite: '#FFFFFF',
  washi: '#1E212B',
  washiBord: '#353140',
  glass: 'rgba(16,19,27,0.55)',
  bande: '#151923',
  carte: 'rgba(26,30,41,0.94)',
  tuileIndigo: '#1E2537',
  tuileOr: '#28241C',
  tuileMousse: '#1F271D',
  tuileRouge: '#2A1F22',
  tuileBord: 'rgba(255,255,255,0.06)',
  pastelLilas: '#8E7BB8',
  pastelPeche: '#C08572',
  pastelMenthe: '#6FA88B',
  pastelCiel: '#7F90C4',
  pastelSable: '#B39A63',
  pastelEteint: '#3A3F4E',
  tuileMentheFond: '#17302A',
  tuileMentheTexte: '#8FD9B6',
  tuileSableFond: '#2F2A1C',
  tuileSableTexte: '#E8C66A',
  programmeFond: '#2A2238',
  programmeFond2: '#1E2540',
  etiquettePrune: '#E3A3CB',
  semaineFaite: '#8E7BB8',
  semaineJour: '#B5A8FF',
  semainePrevue: '#4A4170',
  semaineRepos: '#2E2A40',
  poignee: '#5A6072',
  chevron: '#6B7186',
  cadre: '#05070C',
};

/** La palette en cours, partagee par tous les ecrans v2 (mutee sur place, jamais remplacee) */
export const P: PaletteV2 = { ...P_CLAIR };

let sombreActif = false;

/** Recopie la palette du mode demande dans P ; renvoie true si quelque chose a change */
export function appliquerPalette(sombre: boolean): boolean {
  if (sombre === sombreActif) return false;
  Object.assign(P, sombre ? P_SOMBRE : P_CLAIR);
  sombreActif = sombre;
  return true;
}

export function paletteSombre(): boolean {
  return sombreActif;
}

/**
 * Audit 43 : le blanc translucide des cartes et des boutons poses dans un style en ligne.
 * En clair, exactement le meme blanc ; en sombre, la surface des cartes (lisible sous un texte papier).
 */
export function blancA(alpha: number): string {
  return sombreActif ? `rgba(26,30,41,${Math.max(alpha, 0.9)})` : `rgba(255,255,255,${alpha})`;
}

/** Le fond papier (ou encre en sombre) avec une transparence, pour les fondus */
export function paperA(alpha: number): string {
  const h = P.paper.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
