/**
 * « Ajoute d'autres machines d'un coup » (18 novembre 2026). Houari : « c'est surtout les exercices, il faut tout ».
 * Les exercices crees dans une autre app, ou seulement poses dans une routine, ne sont pas dans l'export des seances :
 * l'utilisateur colle, tape ou dicte (micro du clavier) une liste de noms, un par ligne. Chaque nom devient une de
 * ses machines (machinesPerso.ts) ; le muscle est devine quand le nom est clair, sinon il le choisit d'une pastille.
 * Doublons ignores (dans la liste, avec ses machines, avec la bibliotheque). Pur, teste dans
 * __tests__/unit/repriseAutresExos.test.ts. L'ecran : components/yoroi/v2/import/AjoutListe.tsx.
 */
import { muscleDevine } from '@/lib/v2/import/repriseHevy';
import { plierHevy } from '@/lib/v2/import/nomsHevy';
import { LONGUEUR_NOM_MACHINE, machineDe } from './machinesPerso';
import type { MachinePerso } from './machinesPerso';

/**
 * Consigne a copier pour l'IA de l'utilisateur (comme l'import de pesees par photo) : il lui envoie ses captures
 * d'ecran de routines, et colle la reponse ici. YOROI n'envoie rien a aucune IA. Texte francais, traduit a l'affichage.
 */
export const CONSIGNE_IA_MACHINES = 'Lis mes captures d’écran de routines de musculation. Rends seulement la liste des noms d’exercices, un par ligne, écrits exactement comme sur les captures, sans numéro, sans séries ni charges, sans doublon.';

/** Les noms d'une liste collee : un par ligne (puces, numeros, series « 3x10 » et charges retires) */
export function lireListeNoms(texte: string): string[] {
  const vus = new Set<string>();
  const out: string[] = [];
  for (const brute of String(texte ?? '').replace(/\r/g, '').split('\n')) {
    const nom = brute
      .replace(/^\s*(?:[-•*·–]+|\d{1,3}\s*[.)]|\d{1,3}\s+-)\s*/, '')
      .replace(/\s+\d{1,2}\s*[x×*]\s*\d{1,3}(?:\s*[-/]\s*\d{1,3})?.*$/i, '')
      .replace(/\s+\d+(?:[.,]\d+)?\s*(?:kg|kgs|lb|lbs)\b.*$/i, '')
      .replace(/[:;,.]+$/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, LONGUEUR_NOM_MACHINE)
      .trim();
    if (!nom || !/[a-zA-ZÀ-ÿ]/.test(nom)) continue;
    const k = plierHevy(nom);
    if (!k || vus.has(k)) continue;
    vus.add(k);
    out.push(nom);
  }
  return out;
}

export type ListePreparee = {
  /** a ajouter : le muscle devine, null s'il faut le demander */
  nouveaux: { nom: string; muscle: string | null }[];
  /** deja dans tes machines */
  deja: string[];
  /** deja dans la bibliotheque de YOROI (meme nom), rien a ajouter */
  dansYoroi: string[];
};

/** La liste prete a ajouter. `nomBibliotheque` : le nom exact de la bibliotheque qui porte ce nom, sinon null */
export function preparerListe(texte: string, machines: readonly MachinePerso[], nomBibliotheque: (nom: string) => string | null): ListePreparee {
  const r: ListePreparee = { nouveaux: [], deja: [], dansYoroi: [] };
  for (const nom of lireListeNoms(texte)) {
    if (machineDe(machines, nom)) r.deja.push(nom);
    else if (nomBibliotheque(nom)) r.dansYoroi.push(nom);
    else r.nouveaux.push({ nom, muscle: muscleDevine(nom) });
  }
  return r;
}
