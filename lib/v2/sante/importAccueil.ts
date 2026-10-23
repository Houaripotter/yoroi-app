/**
 * Carte « Importe tes données » de l'Accueil (18 octobre 2026).
 * Regles pures, testees dans __tests__/unit/importAccueil.test.ts. La carte reutilise la connexion
 * existante (demandeActions.ts, connecter.ts) et l'import de l'historique existant (lancerImportInitial).
 */
import type { IssueConnexion } from './connexion';
import { messageConnexion } from './connexion';

/** « Plus tard » touche : la carte ne revient plus */
export const CLE_IMPORT_ACCUEIL_MASQUE = '@yoroi_import_accueil_masque_v1';
/** Un import a abouti depuis la carte : elle ne revient plus */
export const CLE_IMPORT_ACCUEIL_FAIT = '@yoroi_import_accueil_fait_v1';

export type EtatCarteImport = {
  /** compte charge depuis la base (sinon on ne montre rien, pas de clignotement) */
  pret: boolean;
  demo: boolean;
  masquee: boolean;
  faite: boolean;
  pesees: number;
  seances: number;
  /** Sante ou Health Connect relie (mode live) */
  santeRelie: boolean;
};

/**
 * Affichee seulement quand c'est utile : aucune pesee et aucune seance, ou Sante jamais reliee.
 * Jamais en mode demo, jamais apres « Plus tard », jamais apres un import reussi depuis la carte.
 */
export function carteImportVisible(e: EtatCarteImport): boolean {
  if (!e.pret || e.demo || e.masquee || e.faite) return false;
  const vide = e.pesees <= 0 && e.seances <= 0;
  return vide || !e.santeRelie;
}

export const nomSantePlateforme = (platform: string) => (platform === 'android' ? 'Health Connect' : 'Apple Santé');

export type LibellesImport = { nom: string; titre: string; texte: string; bouton: string; plusTard: string; enCours: string };

export function libellesImport(platform: string): LibellesImport {
  const nom = nomSantePlateforme(platform);
  return {
    nom,
    titre: 'Importe tes données',
    texte: `Récupère ton poids, tes pas, ton sommeil et tes entraînements depuis ${nom}.`,
    bouton: 'Importer',
    plusTard: 'Plus tard',
    enCours: 'Import en cours…',
  };
}

export type CompteImportAccueil = { pesees: number; seances: number; nuits: number };

/** « 42 pesées et 18 séances importées », ou null si rien de nouveau */
export function texteResultatImport(c: CompteImportAccueil): string | null {
  const p = (n: number, un: string, plusieurs: string) => (n > 0 ? `${n} ${n > 1 ? plusieurs : un}` : null);
  const parts = [p(c.pesees, 'pesée', 'pesées'), p(c.seances, 'séance', 'séances'), p(c.nuits, 'nuit', 'nuits')].filter(Boolean) as string[];
  if (!parts.length) return null;
  const liste = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
  const total = c.pesees + c.seances + c.nuits;
  return `${liste} ${total > 1 ? 'importées' : 'importée'}`;
}

export type MessageImport = { titre: string; texte: string; action: 'reglages' | 'playstore' | null };

/** Le message affiche apres le bouton Importer */
export function messageImport(issue: IssueConnexion, platform: string, compte: CompteImportAccueil | null): MessageImport {
  const nom = nomSantePlateforme(platform);
  if (issue === 'connecte') {
    const t = compte ? texteResultatImport(compte) : null;
    return t
      ? { titre: 'Import terminé', texte: `${t}.`, action: null }
      : { titre: 'Import terminé', texte: `Aucune nouvelle pesée, séance ou nuit trouvée dans ${nom}.`, action: null };
  }
  if (issue === 'indisponible' && platform === 'android') {
    return { titre: 'Health Connect absent', texte: 'Installe ou mets à jour Health Connect depuis le Play Store, puis touche à nouveau Importer.', action: 'playstore' };
  }
  const m = messageConnexion(issue, platform);
  if (issue === 'rien_lu') return { titre: `Rien trouvé dans ${nom}`, texte: m.texte, action: 'reglages' };
  return { titre: m.titre, texte: m.texte, action: m.reglages ? 'reglages' : null };
}
