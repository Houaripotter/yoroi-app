/** Navigation commune passee a chaque ecran de l'onboarding */
export type Nav = {
  progress?: number | null;
  onBack?: () => void;
  onSkip?: () => void;
  onClose?: () => void;
  /** 28 octobre 2026 : mode retour de la 3.0, lien discret « Plus tard » en haut (sortie sans rien ecrire) */
  onPlusTard?: () => void;
};
