/**
 * Coach vocal : les fichiers audio des phrases (phrases.ts), voix ElevenLabs Antonin.
 * VIDE pour l'instant : les fichiers seront enregistrés plus tard (liste : _propositions/coach_vocal_phrases_fr.md).
 * Pour brancher un fichier : le poser dans assets/sounds/coach/ puis ajouter une ligne, par exemple
 *   cv_fr_reprise_1: require('../../../assets/sounds/coach/cv_fr_reprise_1.mp3'),
 * Les require doivent rester statiques (Metro les résout à la compilation).
 * Sans fichier pour une phrase, le coach se tait (expo-speech, la voix du téléphone, n'est pas installé).
 */
export const SONS_COACH: Readonly<Record<string, number>> = {};

export function fichierPhrase(id: string): number | null {
  return Object.prototype.hasOwnProperty.call(SONS_COACH, id) ? SONS_COACH[id] : null;
}

export function nombreDeFichiers(): number {
  return Object.keys(SONS_COACH).length;
}
