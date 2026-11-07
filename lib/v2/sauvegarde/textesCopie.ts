/**
 * 18 octobre 2026 : les textes de la copie automatique (Accueil, Dojo, selecteur de dossier). Purs, testes dans
 * __tests__/unit/copieAuto.test.ts.
 */
import { Platform } from 'react-native';
import { nomDuCloud, type EtatProtection } from './copieAuto';
import { traduire, traduirePluriel, LOCALE } from '@/lib/i18n/tr';

const NB = '\u00a0';

/** Ce qu'il faut toucher dans le selecteur de dossier */
export function etapesSelecteur(os: string = Platform.OS): string {
  return os === 'android'
    ? traduire('Dans la fenêtre qui s’ouvre : touche le menu, choisis Google Drive, crée un dossier « YOROI », puis « Utiliser ce dossier » et « Autoriser ».')
    : traduire('Dans la fenêtre qui s’ouvre : choisis iCloud Drive, crée un dossier « YOROI » (icône dossier en haut), ouvre ce dossier puis touche « Ouvrir ».');
}

/** Textes de la copie automatique (a activer, ou qui ne passe plus) */
export function texteCopieAuto(etat: EtatProtection, jours: number | null, dossier: string | null, os: string = Platform.OS): { titre: string; texte: string; bouton: string } {
  const cloud = nomDuCloud(os);
  if (etat === 'en_panne') {
    return {
      titre: traduire('Ta copie automatique ne passe plus'),
      texte: traduire("{0}Choisis à nouveau ton dossier{1} dans {2}.", jours != null ? `${traduirePluriel(jours, jours > 1, 'Dernière copie il y a {0} jour.', 'Dernière copie il y a {0} jours.', jours)} ` : '', dossier ? ` « ${dossier} »` : '', cloud),
      bouton: traduire('Choisir le dossier'),
    };
  }
  return {
    titre: traduire('Ne perds jamais tes données'),
    texte: traduire("Pas de compte YOROI : tout vit sur ce téléphone. Active la copie automatique, une copie part chaque jour dans ton {0}.", cloud),
    bouton: traduire('Activer la copie automatique'),
  };
}

/** Texte de la carte, avec ce que l'utilisateur a deja construit */
export function texteAbri(etat: EtatProtection, o: { rang: string; xp: number; serie: number }): { titre: string; texte: string } {
  const xp = o.xp.toLocaleString(LOCALE).replace(/\s/g, NB);
  const bien = traduire("Ton rang {0}, tes {1}{2}XP{3}", o.rang, xp, NB, o.serie > 1 ? ` ${traduirePluriel(o.serie, o.serie > 1, 'et ton {0} jour d’affilée', 'et tes {0} jours d’affilée', o.serie)}` : '');
  if (etat === 'en_panne') return { titre: traduire('Ta copie automatique ne passe plus'), texte: traduire("{0} ne sont plus copiés. Choisis à nouveau ton dossier dans {1}.", bien, nomDuCloud()) };
  return { titre: traduire('Mets ton Dojo à l’abri'), texte: traduire("{0} vivent seulement sur ce téléphone. Une copie chaque jour dans {1}, et tu ne perds jamais rien.", bien, nomDuCloud()) };
}

