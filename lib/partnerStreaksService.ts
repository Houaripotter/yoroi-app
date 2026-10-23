// ============================================
// PARTNER STREAKS : Calcul des streaks victoires / no-tap
// ============================================

export interface PartnerStreakData {
  currentWinStreak: number;
  longestWinStreak: number;
  currentNoTapStreak: number;
  longestNoTapStreak: number;
  lastMatchups: Array<{ date: string; result: 'V' | 'D' | 'N'; tapOut?: boolean }>;
}

/**
 * Calcule les streaks depuis l'historique trie du plus ancien au plus recent.
 */
export function computePartnerStreaks(
  matchups: Array<{ date: string; result: 'V' | 'D' | 'N' | null; tapOut?: boolean }>,
): PartnerStreakData {
  const sorted = [...matchups]
    .filter(m => m.result != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let currentWinStreak = 0;
  let longestWinStreak = 0;
  let currentNoTapStreak = 0;
  let longestNoTapStreak = 0;

  for (const m of sorted) {
    if (m.result === 'V') {
      currentWinStreak += 1;
      if (currentWinStreak > longestWinStreak) longestWinStreak = currentWinStreak;
    } else if (m.result === 'D') {
      currentWinStreak = 0;
    }
    // pas touche sur null
    if (m.tapOut === true) {
      currentNoTapStreak = 0;
    } else {
      currentNoTapStreak += 1;
      if (currentNoTapStreak > longestNoTapStreak) longestNoTapStreak = currentNoTapStreak;
    }
  }

  const lastMatchups = sorted.slice(-10).reverse().map(m => ({
    date: m.date,
    result: (m.result as 'V' | 'D' | 'N'),
    tapOut: m.tapOut,
  }));

  return {
    currentWinStreak,
    longestWinStreak,
    currentNoTapStreak,
    longestNoTapStreak,
    lastMatchups,
  };
}
