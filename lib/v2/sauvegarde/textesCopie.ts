/**
 * 18 octobre 2026 : les textes de la copie automatique (Accueil, Dojo, selecteur de dossier). Purs, testes dans
 * __tests__/unit/copieAuto.test.ts.
 */
import { Platform } from 'react-native';
import { nomDuCloud, type EtatProtection } from './copieAuto';

const NB = '\u00a0';

/** Ce qu'il faut toucher dans le selecteur de dossier */
export function etapesSelecteur(os: string = Platform.OS): string {
  return os === 'android'
    ? 'Dans la fenêtre qui s’ouvre : touche le menu, choisis Google Drive, crée un dossier « YOROI », puis « Utiliser ce dossier » et « Autoriser ».'
    : 'Dans la fenêtre qui s’ouvre : choisis iCloud Drive, crée un dossier « YOROI » (icône dossier en haut), ouvre-le puis touche « Ouvrir ».';
}

/** Textes de la copie automatique (a activer, ou qui ne passe plus) */
export function texteCopieAuto(etat: EtatProtection, jours: number | null, dossier: string | null, os: string = Platform.OS): { titre: string; texte: string; bouton: string } {
  const cloud = nomDuCloud(os);
  if (etat === 'en_panne') {
    return {
      titre: 'Ta copie automatique ne passe plus',
      texte: `${jours != null ? `Dernière copie il y a ${jours} jour${jours > 1 ? 's' : ''}. ` : ''}Choisis à nouveau ton dossier${dossier ? ` « ${dossier} »` : ''} dans ${cloud}.`,
      bouton: 'Choisir le dossier',
    };
  }
  return {
    titre: 'Ne perds jamais tes données',
    texte: `Pas de compte YOROI : tout vit sur ce téléphone. Active la copie automatique, une copie part chaque jour dans ton ${cloud}.`,
    bouton: 'Activer la copie automatique',
  };
}

/** Texte de la carte, avec ce que l'utilisateur a deja construit */
export function texteAbri(etat: EtatProtection, o: { rang: string; xp: number; serie: number }): { titre: string; texte: string } {
  const xp = o.xp.toLocaleString('fr-FR').replace(/\s/g, NB);
  const bien = `Ton rang ${o.rang}, tes ${xp}${NB}XP${o.serie > 1 ? ` et tes ${o.serie} jours d’affilée` : ''}`;
  if (etat === 'en_panne') return { titre: 'Ta copie automatique ne passe plus', texte: `${bien} ne sont plus copiés. Choisis à nouveau ton dossier dans ${nomDuCloud()}.` };
  return { titre: 'Mets ton Dojo à l’abri', texte: `${bien} vivent seulement sur ce téléphone. Une copie chaque jour dans ${nomDuCloud()}, et tu ne perds jamais rien.` };
}

