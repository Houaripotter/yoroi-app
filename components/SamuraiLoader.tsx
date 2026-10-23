// ============================================
// YOROI, ecran de chargement (vague 18)
// Toute l'attente passe par components/yoroi/v2/chargement/Chargement.tsx :
// papier de riz, embleme a la place exacte du splash natif, allee des cerisiers, petales, trait d'encre.
// API inchangee : SamuraiCircleLoader, SamuraiLoader, SamuraiSplash.
// ============================================

import React from 'react';
import { EcranChargement } from '@/components/yoroi/v2/chargement/Chargement';

interface Props {
  message?: string;
  size?: number;
  isDark?: boolean;
}

/** Ancien chargeur rond : meme ecran que le lancement */
export function SamuraiCircleLoader(_props: { duration?: number; bgColor?: string }) {
  return <EcranChargement />;
}

/** Ecran de chargement interne (toujours en clair) */
export function SamuraiLoader({ message }: Omit<Props, 'isDark'>) {
  return <EcranChargement message={message} />;
}

/** Ecran de lancement (hors fournisseurs de theme) : toujours en clair, isDark et size ignores */
export function SamuraiSplash({ message }: Props) {
  return <EcranChargement message={message} />;
}

export default SamuraiLoader;
