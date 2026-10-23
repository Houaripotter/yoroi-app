/**
 * Partage d'un texte : la signature YOROI est ajoutee sur une ligne a part, et si le texte contient
 * une donnee de sante, la personne voit d'abord le texte exact dans une fenetre maison.
 */
import { Share } from 'react-native';
import logger from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { signaturePartage } from '@/constants/partage';
import { noterPartage } from './mesure';
import type { SourcePartage } from './mesure';
import { traduire } from '@/lib/i18n/tr';

/** Texte final tel qu'il part : le message puis la signature sur sa propre ligne */
export function texteSigne(message: string): string {
  return `${message.trim()}\n\n${signaturePartage()}`;
}

/** Ouvre la feuille de partage du systeme avec le texte deja signe */
async function envoyer(source: SourcePartage, texte: string, titre?: string): Promise<boolean> {
  try {
    const res = await Share.share(titre ? { message: texte, title: titre } : { message: texte });
    if (res.action === Share.sharedAction) {
      noterPartage(source, true);
      return true;
    }
    return false;
  } catch (e) {
    logger.error('[partage] texte', e);
    return false;
  }
}

/**
 * Partage un texte signe. Avec apercu = true (obligatoire des qu'il y a une donnee de sante),
 * une fenetre montre le texte exact avec Partager et Annuler avant d'ouvrir le partage.
 */
export function partagerTexte(opts: { source: SourcePartage; message: string; titre?: string; apercu?: boolean }): void {
  const texte = texteSigne(opts.message);
  if (!opts.apercu) {
    noterPartage(opts.source);
    envoyer(opts.source, texte, opts.titre).catch(() => {});
    return;
  }
  appAlert(traduire('Voici ce qui sera partagé'), texte, [
    { text: traduire('Annuler'), style: 'cancel' },
    {
      text: traduire('Partager'),
      style: 'primary',
      onPress: () => {
        noterPartage(opts.source);
        envoyer(opts.source, texte, opts.titre).catch(() => {});
      },
    },
  ]);
}
