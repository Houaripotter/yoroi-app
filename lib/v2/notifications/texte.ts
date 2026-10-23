// ============================================
// YOROI : garde "aucune valeur de santé dans une notification"
// ============================================
// Une notification s'affiche sur l'écran verrouillé, que n'importe qui
// peut lire. On y met un rappel ou un encouragement, jamais une donnée
// de santé : poids, écart de poids, mensuration, calories, fréquence
// cardiaque, distance, eau bue, sommeil chiffré, charge chiffrée.
//
// Fichier pur (aucun import natif) pour rester testable.
// ============================================

/** Texte de repli quand un titre contient une valeur interdite. */
export const TITRE_NEUTRE = 'YOROI';

/** Texte de repli quand un corps contient une valeur interdite. */
export const CORPS_NEUTRE = 'Ouvre YOROI pour voir le détail.';

// Un nombre (entier ou décimal, virgule ou point, signe éventuel)
const NOMBRE = String.raw`[+-]?\d+(?:[.,]\d+)?`;

// Unités de santé qui ne doivent jamais suivre un chiffre
const UNITES_APRES_CHIFFRE = [
  'kg', 'kgs', 'kilos?', 'lbs?', 'g',
  'kcal', 'cal', 'calories?',
  'bpm', 'bat(?:tements)?/min',
  'ml', 'cl', 'dl', 'l', 'litres?',
  'cm', 'mm',
  'km', 'm', 'mètres?', 'metres?',
  'pts', 'points de charge',
  'h de sommeil', 'heures? de sommeil', 'h sans boire', 'heures? sans boire',
  '%\\s*de masse grasse', '%\\s*mg',
];

const MOTIF_CHIFFRE_UNITE = new RegExp(
  `${NOMBRE}\\s*(?:${UNITES_APRES_CHIFFRE.join('|')})(?![\\p{L}\\d'’])`,
  'iu',
);

// Mots qui à eux seuls trahissent une valeur de santé affichée
const MOTIF_MOT_SEUL = /(?<![\p{L}\d])(?:kg|kcal|bpm|ml|cm|lbs)(?![\p{L}\d])/iu;

// "FC 152", "FC moy 140", "fréquence cardiaque de 150"
const MOTIF_FC = /(?<![\p{L}])(?:FC|fréquence cardiaque)(?:\s+(?:moy(?:enne)?|max(?:imale)?|de|à))*\s*:?\s*\d/iu;

// "rien bu depuis 3 h", "pas bu depuis 5 heures"
const MOTIF_DEPUIS_BOIRE = /(?:bu|boire|bois|hydrat\p{L}*)[^.!?]*depuis\s+\d+\s*(?:h|heures?)(?![\p{L}\d])/iu;

// "charge de 820", "charge : 950"
const MOTIF_CHARGE = /charge(?:\s+d['’]entra[iî]nement)?\s*(?:de|:)?\s*\d/iu;

/**
 * Vrai si le texte contient une valeur de santé interdite sur l'écran verrouillé.
 */
export function contientValeurSante(texte: string | null | undefined): boolean {
  if (!texte) return false;
  return (
    MOTIF_CHIFFRE_UNITE.test(texte) ||
    MOTIF_MOT_SEUL.test(texte) ||
    MOTIF_FC.test(texte) ||
    MOTIF_DEPUIS_BOIRE.test(texte) ||
    MOTIF_CHARGE.test(texte)
  );
}

/**
 * Renvoie le texte tel quel s'il est propre, sinon un texte neutre.
 * Filet de sécurité : les messages doivent déjà être écrits sans valeur.
 */
export function sansValeurSante(texte: string, repli: string = CORPS_NEUTRE): string {
  return contientValeurSante(texte) ? repli : texte;
}

/**
 * Applique la garde au titre et au corps d'une notification.
 */
export function contenuSansSante<T extends { title?: string | null; body?: string | null }>(contenu: T): T {
  return {
    ...contenu,
    ...(typeof contenu.title === 'string' ? { title: sansValeurSante(contenu.title, TITRE_NEUTRE) } : {}),
    ...(typeof contenu.body === 'string' ? { body: sansValeurSante(contenu.body, CORPS_NEUTRE) } : {}),
  };
}
