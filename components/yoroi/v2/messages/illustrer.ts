/**
 * Illustration d'une fenetre YOROI, depuis un service sans JSX (lib/...).
 * Chargee a la demande : le service reste leger, et un echec de chargement n'empeche jamais la fenetre.
 *   const illustration = await illustrer('sauvegarde');
 *   appAlert(titre, texte, boutons, illustration ? { illustration } : undefined);
 */
import type { ReactNode } from 'react';

export type NomIllustration = 'sauvegarde' | 'copieFaite' | 'sante' | 'rappels' | 'abri';

export async function illustrer(nom: NomIllustration, size = 84): Promise<ReactNode | undefined> {
  try {
    const React = await import('react');
    const I = await import('./Illustrations');
    const table = {
      sauvegarde: I.IllusSauvegarde,
      copieFaite: I.IllusCopieFaite,
      sante: I.IllusSante,
      rappels: I.IllusRappels,
      abri: I.IllusAbri,
    } as const;
    return React.createElement(table[nom], { size, disque: true });
  } catch {
    return undefined;
  }
}
