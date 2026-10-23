/**
 * Fenêtre maison qui explique les rappels avant la fenêtre du système.
 * Passe par l'hôte unique des fenêtres YOROI (components/yoroi/v2/fenetre) :
 * jamais d'alerte système grise. Utilisée par lib/v2/notifications/permission.ts.
 */
import React from 'react';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { IllusRappels } from '@/components/yoroi/v2/messages/Illustrations';
import { traduire } from '@/lib/i18n/tr';

export const TITRE_RAPPELS = traduire('Tes rappels, à ton heure');
export const TEXTE_RAPPELS =
  traduire('Un rappel pour ta pesée et tes séances, à l’heure que tu choisis. Jamais de chiffre de santé sur l’écran verrouillé.');

export function ouvrirFenetreRappels(opts: { titre?: string; texte?: string; onActiver: () => void; onPlusTard: () => void }): void {
  let fait = false;
  const une = (f: () => void) => () => {
    if (fait) return;
    fait = true;
    f();
  };
  const plusTard = une(opts.onPlusTard);
  appAlert(
    opts.titre ?? TITRE_RAPPELS,
    opts.texte ?? TEXTE_RAPPELS,
    [
      { text: traduire('Plus tard'), style: 'cancel', onPress: plusTard },
      { text: traduire('Activer les rappels'), isPreferred: true, onPress: une(opts.onActiver) },
    ],
    { illustration: <IllusRappels size={84} disque />, onDismiss: plusTard },
  );
}
