// ============================================
// SPARRING INSIGHTS GENERATOR
// Génère des phrases contextuelles depuis les data combat.
// Exemples :
//   "Triangle ta meilleure arme (12 fois)"
//   "Tu reçois souvent Armbar (7), travaille ta défense"
//   "Meilleur partenaire : Alex (15 rounds)"
//   "Win rate en hausse : +8% ce mois"
// ============================================

import { differenceInDays, parseISO } from 'date-fns';
import type { Insight } from './statsInsights';

interface PartnerStat {
  name: string;
  totalRounds: number;
  wins: number;
  losses: number;
  draws: number;
  avgRating?: number;
}

interface MethodStat {
  method: string;
  given: number;
  taken: number;
}

interface SparringTraining {
  date: string;
  sport?: string;
  combat_rounds?: string | Array<any>;
}

// ─── Generators ─────────────────────────────────

/** Trouve la meilleure finition donnée (celle qu'on réussit le plus). */
const bestFinisherInsight = (methods: MethodStat[]): Insight | null => {
  if (!methods || methods.length === 0) return null;
  const top = [...methods].sort((a, b) => b.given - a.given)[0];
  if (top.given < 3) return null;
  return {
    id: 'spar-best-finisher',
    text: `${top.method} ta meilleure arme (${top.given} fois)`,
    tone: 'celebration',
    icon: 'fire',
  };
};

/** Trouve la finition qu'on prend le plus souvent (faiblesse défensive). */
const weakestDefenseInsight = (methods: MethodStat[]): Insight | null => {
  if (!methods || methods.length === 0) return null;
  const weak = [...methods].sort((a, b) => b.taken - a.taken)[0];
  if (weak.taken < 3) return null;
  return {
    id: 'spar-weak-defense',
    text: `Tu reçois souvent ${weak.method} (${weak.taken}×), travaille la défense`,
    tone: 'warning',
    icon: 'alert-circle',
  };
};

/** Meilleur partenaire (celui avec qui on a le plus de rounds). */
const bestPartnerInsight = (partners: PartnerStat[]): Insight | null => {
  if (!partners || partners.length === 0) return null;
  const top = [...partners].sort((a, b) => b.totalRounds - a.totalRounds)[0];
  if (top.totalRounds < 5) return null;
  return {
    id: 'spar-best-partner',
    text: `${top.name} ton partenaire fétiche (${top.totalRounds} rounds)`,
    tone: 'positive',
    icon: 'trending-up',
  };
};

/** Win rate global (si assez de data). */
const winRateInsight = (partners: PartnerStat[]): Insight | null => {
  let wins = 0, losses = 0;
  for (const p of partners) { wins += p.wins; losses += p.losses; }
  const total = wins + losses;
  if (total < 10) return null;
  const rate = Math.round((wins / total) * 100);
  if (rate >= 65) {
    return {
      id: 'spar-dominant',
      text: `Win rate ${rate}%, tu domines le tatami 🔥`,
      tone: 'celebration',
      icon: 'fire',
    };
  }
  if (rate >= 50) {
    return {
      id: 'spar-solid',
      text: `Win rate ${rate}%, niveau solide`,
      tone: 'positive',
      icon: 'trending-up',
    };
  }
  return {
    id: 'spar-growing',
    text: `Win rate ${rate}%, chaque loss est une leçon`,
    tone: 'neutral',
    icon: 'trending-up',
  };
};

/** Streak combat : N derniers jours avec au moins 1 séance. */
const streakInsight = (trainings: SparringTraining[]): Insight | null => {
  if (!trainings || trainings.length === 0) return null;
  const dates = new Set<string>();
  for (const t of trainings) {
    try {
      const d = parseISO(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      dates.add(key);
    } catch { /* ignore */ }
  }
  const last14 = trainings.filter(t => {
    try { return differenceInDays(new Date(), parseISO(t.date)) <= 14; }
    catch { return false; }
  }).length;
  if (last14 >= 6) {
    return {
      id: 'spar-high-vol',
      text: `${last14} séances en 14 jours, intensité max 🥋`,
      tone: 'celebration',
      icon: 'fire',
    };
  }
  if (last14 === 0) {
    return {
      id: 'spar-pause',
      text: `Aucun sparring récent, reprends doucement`,
      tone: 'warning',
      icon: 'alert-circle',
    };
  }
  return null;
};

/** Compare dernier mois vs mois précédent (volume de rounds). */
const monthDeltaInsight = (trainings: SparringTraining[]): Insight | null => {
  if (!trainings || trainings.length === 0) return null;
  const countRounds = (t: SparringTraining): number => {
    try {
      const arr = typeof t.combat_rounds === 'string'
        ? JSON.parse(t.combat_rounds)
        : t.combat_rounds;
      return Array.isArray(arr) ? arr.length : 0;
    } catch { return 0; }
  };
  let last30 = 0, prev30 = 0;
  for (const t of trainings) {
    try {
      const days = differenceInDays(new Date(), parseISO(t.date));
      if (days < 0) continue;
      if (days <= 30) last30 += countRounds(t);
      else if (days <= 60) prev30 += countRounds(t);
    } catch { /* ignore */ }
  }
  if (prev30 === 0 && last30 === 0) return null;
  if (prev30 === 0) {
    return {
      id: 'spar-starting',
      text: `${last30} rounds ce mois, bon démarrage`,
      tone: 'positive',
      icon: 'trending-up',
    };
  }
  const delta = Math.round(((last30 - prev30) / prev30) * 100);
  if (Math.abs(delta) < 10) return null;
  if (delta > 0) {
    return {
      id: 'spar-up',
      text: `+${delta}% de rounds vs mois précédent 💪`,
      tone: 'celebration',
      icon: 'trending-up',
    };
  }
  return {
    id: 'spar-down',
    text: `${delta}% de rounds vs mois précédent`,
    tone: 'neutral',
    icon: 'trending-down',
  };
};

// ─── API publique ─────────────────────────────────

export const generateSparringInsights = (data: {
  partners: PartnerStat[];
  methods: MethodStat[];
  trainings: SparringTraining[];
}, max: number = 3): Insight[] => {
  const candidates: (Insight | null)[] = [
    bestFinisherInsight(data.methods),
    weakestDefenseInsight(data.methods),
    bestPartnerInsight(data.partners),
    winRateInsight(data.partners),
    streakInsight(data.trainings),
    monthDeltaInsight(data.trainings),
  ];
  const order: Record<Insight['tone'], number> = {
    celebration: 0, positive: 1, warning: 2, neutral: 3,
  };
  return candidates
    .filter((x): x is Insight => x !== null)
    .sort((a, b) => order[a.tone] - order[b.tone])
    .slice(0, max);
};
