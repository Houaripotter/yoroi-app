// ============================================
// FUN COMPARISONS
// Génère des comparaisons amusantes/inspirantes à partir des stats globales.
// "Tu as parcouru 412 km = la distance Paris → Reims aller-retour"
// "Tu as brûlé 250k kcal = 50 kg de chocolat"
// "Tu as soulevé 12 t = un éléphant adulte"
// ============================================

export interface FunComparison {
  id: string;
  /** Phrase principale (max 90 chars) */
  text: string;
  /** Sous-texte / explication (optionnel) */
  hint?: string;
  /** Emoji ou icône en tête */
  emoji: string;
  /** Couleur de tonalité */
  color: string;
}

interface ComparisonInput {
  totalSessions?: number;
  totalDurationMinutes?: number;
  totalKcal?: number;
  totalDistanceKm?: number;
  totalLiftedTons?: number;
}

const fmtNum = (n: number, decimals: number = 0): string => {
  const fixed = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
  return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// ─── Distance ─────────────────────────────────

const distanceComparison = (km: number): FunComparison | null => {
  if (km < 5) return null;
  // Quelques références françaises mémorables
  const refs = [
    { dist: 6,    label: 'tour du périphérique parisien' },
    { dist: 21,   label: 'semi marathon' },
    { dist: 42,   label: 'marathon complet' },
    { dist: 100,  label: '100 km, score à un Brevet de Randonneur' },
    { dist: 200,  label: 'Paris → Reims' },
    { dist: 500,  label: 'Paris → Lyon' },
    { dist: 760,  label: 'Paris → Marseille' },
    { dist: 1500, label: 'Paris → Athènes' },
    { dist: 6371, label: 'rayon de la Terre' },
    { dist: 40075, label: 'tour de la Terre complet' },
  ];

  // Cherche la référence la plus proche pour donner un multiplicateur sympa
  for (let i = refs.length - 1; i >= 0; i--) {
    const r = refs[i];
    const ratio = km / r.dist;
    if (ratio >= 0.8 && ratio <= 1.5) {
      return {
        id: 'dist-equiv',
        text: `${fmtNum(km, 0)} km parcourus = environ ${r.label}`,
        emoji: '',
        color: '#22C55E',
      };
    }
    if (ratio >= 2) {
      return {
        id: 'dist-multi',
        text: `${fmtNum(km, 0)} km = ${ratio.toFixed(1)}× la distance ${r.label}`,
        hint: `Soit ${Math.round(ratio)} fois cette distance`,
        emoji: '',
        color: '#22C55E',
      };
    }
  }
  return {
    id: 'dist-base',
    text: `${fmtNum(km, 0)} km parcourus au total`,
    emoji: '',
    color: '#22C55E',
  };
};

// ─── Calories ─────────────────────────────────

const kcalComparison = (kcal: number): FunComparison | null => {
  if (kcal < 1000) return null;
  // Équivalences "fun" food / poids perdu théorique
  const burgers = kcal / 540;        // un Big Mac
  const pizzas = kcal / 2300;        // une pizza margherita entière
  const choco = kcal / 5500;         // une tablette de 100g chocolat noir × kg équiv

  if (kcal >= 100000) {
    const fatKg = kcal / 7700; // 1 kg de gras = 7700 kcal
    return {
      id: 'kcal-fat',
      text: `${fmtNum(kcal / 1000, 0)}k kcal brûlées = ${fatKg.toFixed(1)} kg de gras pur`,
      hint: 'Théorique : 1 kg de gras = 7700 kcal',
      emoji: '',
      color: '#F97316',
    };
  }
  if (kcal >= 10000) {
    return {
      id: 'kcal-pizza',
      text: `${fmtNum(kcal, 0)} kcal brûlées = ${pizzas.toFixed(0)} pizzas entières`,
      emoji: '',
      color: '#F97316',
    };
  }
  return {
    id: 'kcal-burger',
    text: `${fmtNum(kcal, 0)} kcal = ${burgers.toFixed(0)} Big Mac`,
    emoji: '',
    color: '#F97316',
  };
};

// ─── Durée totale ─────────────────────────────────

const durationComparison = (minutes: number): FunComparison | null => {
  if (minutes < 60) return null;
  const hours = minutes / 60;
  const days = hours / 24;
  if (hours >= 1000) {
    return {
      id: 'time-days',
      text: `${fmtNum(hours, 0)} h d'entraînement = ${days.toFixed(0)} jours sans pause`,
      emoji: '',
      color: '#3B82F6',
    };
  }
  if (hours >= 100) {
    const movies = hours / 1.5;
    return {
      id: 'time-movies',
      text: `${fmtNum(hours, 0)} h d'effort = ${movies.toFixed(0)} films de 1h30`,
      emoji: '',
      color: '#3B82F6',
    };
  }
  return {
    id: 'time-base',
    text: `${fmtNum(hours, 0)} h d'entraînement au total`,
    emoji: '',
    color: '#3B82F6',
  };
};

// ─── Sessions ─────────────────────────────────

const sessionsComparison = (n: number): FunComparison | null => {
  if (n < 10) return null;
  if (n >= 365) {
    return {
      id: 'sess-pro',
      text: `${fmtNum(n)} séances : niveau pro, chapeau`,
      emoji: '',
      color: '#A855F7',
    };
  }
  if (n >= 100) {
    return {
      id: 'sess-100',
      text: `${fmtNum(n)} séances enregistrées : tu es une machine`,
      emoji: '',
      color: '#A855F7',
    };
  }
  return {
    id: 'sess-base',
    text: `${fmtNum(n)} séances : la régularité paie`,
    emoji: '',
    color: '#A855F7',
  };
};

// ─── Levée totale (musculation) ─────────────────────────────────

const liftedComparison = (tons: number): FunComparison | null => {
  if (tons < 0.5) return null;
  const refs = [
    { t: 1, label: 'une voiture compacte' },
    { t: 5, label: 'un éléphant adulte' },
    { t: 12, label: 'un bus parisien' },
    { t: 40, label: 'un camion semi remorque' },
    { t: 200, label: 'la statue de la Liberté' },
  ];
  for (let i = refs.length - 1; i >= 0; i--) {
    if (tons >= refs[i].t) {
      const mul = tons / refs[i].t;
      return {
        id: 'lift-equiv',
        text: `Tu as soulevé ${tons.toFixed(1)} tonnes = ${mul >= 1.5 ? `${mul.toFixed(1)}× ` : ''}${refs[i].label}`,
        emoji: '',
        color: '#EF4444',
      };
    }
  }
  return null;
};

// ─── API publique ─────────────────────────────────

/**
 * Génère jusqu'à `max` comparaisons fun depuis les totaux de l'utilisateur.
 * Retourne tableau vide si pas assez de data.
 */
export const generateFunComparisons = (
  input: ComparisonInput,
  max: number = 3,
): FunComparison[] => {
  const candidates = [
    distanceComparison(input.totalDistanceKm || 0),
    kcalComparison(input.totalKcal || 0),
    durationComparison(input.totalDurationMinutes || 0),
    sessionsComparison(input.totalSessions || 0),
    liftedComparison(input.totalLiftedTons || 0),
  ].filter((c): c is FunComparison => c !== null);
  return candidates.slice(0, max);
};
