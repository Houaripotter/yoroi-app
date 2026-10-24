/**
 * Recherches d'exercice sans resultat (24 octobre 2026).
 * Quand quelqu'un cherche un exercice qui n'est pas dans la bibliotheque, on le garde ici pour l'ajouter
 * a la prochaine mise a jour. Seul le terme tape est garde : aucun identifiant, aucune donnee de sante.
 *
 * Stockage local : AsyncStorage, cle yoroi_recherches_introuvables_v1, 100 termes au plus avec leur compte
 * et la date de la derniere recherche.
 *
 * Envoi distant : le point d'accroche envoyerEvenement('recherche_exercice_introuvable', { terme }) existe, mais
 * il reste COUPE (ENVOI_DISTANT_AUTORISE = false). La politique de confidentialite publiee promet qu'aucun texte
 * ecrit par la personne ne part (data/politiqueConfidentialite.json). Avant de passer le drapeau a true, il faut
 * mettre la politique a jour. Meme allume, l'envoi respecte l'interrupteur Reglages, Confidentialite
 * (consentementActif de utils/telemetry.ts) et ne part jamais en developpement ni sur simulateur.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLE_RECHERCHES_INTROUVABLES = 'yoroi_recherches_introuvables_v1';
export const MAX_ENTREES = 100;
export const LONGUEUR_MAX = 40;
export const LONGUEUR_MIN = 3;

/** A passer a true seulement apres mise a jour de la politique de confidentialite */
export const ENVOI_DISTANT_AUTORISE = false;

export type RechercheIntrouvable = { terme: string; compte: number; derniere: string };

/** Un e-mail, un numero de telephone ou une adresse web : jamais garde */
export function ressembleDonneePerso(brut: string): boolean {
  const s = String(brut ?? '');
  if (/@/.test(s)) return true;
  if (/(https?:|www\.)/i.test(s)) return true;
  const chiffres = s.replace(/\D/g, '');
  if (chiffres.length >= 6) return true;
  return false;
}

/**
 * Terme pret a etre garde : minuscules, espaces resserres, 40 caracteres au plus.
 * Null s'il est trop court ou s'il ressemble a une donnee personnelle.
 */
export function nettoyerTerme(brut: string): string | null {
  const s = String(brut ?? '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  if (s.length < LONGUEUR_MIN) return null;
  if (ressembleDonneePerso(s)) return null;
  const coupe = s.slice(0, LONGUEUR_MAX).trim();
  return coupe.length >= LONGUEUR_MIN ? coupe : null;
}

/** Ajoute ou compte un terme ; les plus recents d'abord, 100 au plus (les plus anciens sortent) */
export function ajouterRecherche(liste: RechercheIntrouvable[], terme: string, date: string): RechercheIntrouvable[] {
  const avant = liste.find((e) => e.terme === terme);
  const autres = liste.filter((e) => e.terme !== terme);
  const entree = { terme, compte: (avant?.compte ?? 0) + 1, derniere: date };
  return [entree, ...autres].slice(0, MAX_ENTREES);
}

/** Lecture tolerante de ce qui est stocke */
export function lireListe(raw: string | null): RechercheIntrouvable[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p.filter((e) => e && typeof e.terme === 'string' && typeof e.compte === 'number' && typeof e.derniere === 'string').slice(0, MAX_ENTREES);
  } catch {
    return [];
  }
}

export async function lireRecherchesIntrouvables(): Promise<RechercheIntrouvable[]> {
  try {
    return lireListe(await AsyncStorage.getItem(CLE_RECHERCHES_INTROUVABLES));
  } catch {
    return [];
  }
}

/**
 * Point d'accroche de la mesure. Ne fait rien tant que ENVOI_DISTANT_AUTORISE est faux, ni si la personne a coupe
 * la mesure. Le transport de utils/telemetryTransport.ts verifie lui meme que le module natif Firebase est present
 * avant tout require (lecon de l'ecran rouge du 16 octobre), et reste muet en developpement et sur simulateur.
 */
export function envoyerEvenement(nom: 'recherche_exercice_introuvable', params: { terme: string }): void {
  if (!ENVOI_DISTANT_AUTORISE) return;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { consentementActif } = require('@/utils/telemetry') as { consentementActif: () => boolean };
    if (!consentementActif()) return;
    const { transport } = require('@/utils/telemetryTransport') as { transport: { evenement(n: string, p?: Record<string, string>): Promise<boolean> } };
    /* eslint-enable @typescript-eslint/no-require-imports */
    void transport.evenement(nom, { terme: params.terme }).catch(() => undefined);
  } catch {
    // mesure absente : rien ne part
  }
}

let file: Promise<void> = Promise.resolve();

/**
 * A appeler avec le terme final (apres une pause) et le nombre de resultats.
 * Ne garde que les recherches d'au moins 3 caracteres sans aucun resultat.
 */
export function noterRecherche(q: string, nbResultats: number): Promise<void> {
  if (nbResultats > 0) return Promise.resolve();
  const terme = nettoyerTerme(q);
  if (!terme) return Promise.resolve();
  // ecritures a la suite, pour ne pas perdre un compte quand deux recherches se suivent
  file = file.then(async () => {
    try {
      const liste = await lireRecherchesIntrouvables();
      await AsyncStorage.setItem(CLE_RECHERCHES_INTROUVABLES, JSON.stringify(ajouterRecherche(liste, terme, new Date().toISOString())));
    } catch {
      // stockage indisponible : sans importance
    }
    envoyerEvenement('recherche_exercice_introuvable', { terme });
  });
  return file;
}
