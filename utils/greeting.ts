// ============================================
// YOROI - MESSAGE D'ACCUEIL INTELLIGENT
// ============================================
// Change selon l'heure de la journée

export interface GreetingResult {
  message: string;
  showSleepTip: boolean;
  emoji: string;
}

/**
 * Génère un message d'accueil personnalisé selon l'heure
 * @param name - Prénom de l'utilisateur
 * @returns Message + indicateur si conseil sommeil à afficher
 */
export const getGreeting = (name: string): GreetingResult => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      message: `Bonjour, ${name} !`,
      showSleepTip: false,
      emoji: '☀️',
    };
  } else if (hour >= 12 && hour < 14) {
    return {
      message: `Bon appétit, ${name} !`,
      showSleepTip: false,
      emoji: '🍽️',
    };
  } else if (hour >= 14 && hour < 18) {
    return {
      message: `Bon après-midi, ${name} !`,
      showSleepTip: false,
      emoji: '💪',
    };
  } else if (hour >= 18 && hour < 22) {
    return {
      message: `Bonsoir, ${name} !`,
      showSleepTip: false,
      emoji: '🌅',
    };
  } else if (hour >= 22 && hour < 24) {
    return {
      message: `Bonne soirée, ${name} !`,
      showSleepTip: false,
      emoji: '🌙',
    };
  } else {
    // Entre minuit et 5h
    return {
      message: `Il est tard, ${name}...`,
      showSleepTip: true,
      emoji: '🌙',
    };
  }
};

/**
 * Message court de motivation selon l'heure
 */
export const getMotivationalContext = (): string => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 9) {
    return "Parfait pour une pesée matinale !";
  } else if (hour >= 9 && hour < 12) {
    return "Une belle journée t'attend !";
  } else if (hour >= 12 && hour < 14) {
    return "Pense à bien t'hydrater !";
  } else if (hour >= 14 && hour < 18) {
    return "Continue sur ta lancée !";
  } else if (hour >= 18 && hour < 21) {
    return "Bilan de la journée ?";
  } else if (hour >= 21 && hour < 24) {
    return "Repos mérité ce soir !";
  } else {
    return "Le sommeil est essentiel à ta transformation.";
  }
};
