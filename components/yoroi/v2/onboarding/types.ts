/** Navigation commune passee a chaque ecran de l'onboarding */
export type Nav = {
  progress?: number | null;
  onBack?: () => void;
  onSkip?: () => void;
  onClose?: () => void;
};
