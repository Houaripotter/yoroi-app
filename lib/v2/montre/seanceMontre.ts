/**
 * Ta séance de musculation en cours, guidée sur l'Apple Watch (28 octobre 2026, maquette Montre B, Muscu).
 * L'écran de la séance (app/seance/muscu.tsx) passe son état par useActiviteSeance (lib/v2/widgets/activiteSeance.ts),
 * qui le range ici. La synchro de la montre (lib/v2/montre/synchro.ts) l'ajoute au contexte (champ seance) et
 * le renvoie dès qu'il change. Sur la montre : le repos qui se vide sur le bord de l'écran, l'exercice suivant,
 * la charge et les répétitions, « Série faite », « +15 s » et « Passer ».
 * Les appuis de la montre reviennent comme ceux de la Dynamic Island (lib/v2/seance/actionsIle.ts).
 * Rien ne sort du téléphone et de ta montre.
 */
import { DeviceEventEmitter } from 'react-native';
import type { SeanceMontre } from './contexte';
import type { PlanIle } from '@/lib/v2/seance/actionsIle';

/** émis quand la séance en cours change (une série, un repos, la fin) */
export const SEANCE_MONTRE_EVENT = 'YOROI_SEANCE_MONTRE_CHANGED';

/** une séance commencée il y a plus de 6 heures n'est plus montrée */
const DUREE_MAX_MS = 6 * 3600 * 1000;

let actuelle: SeanceMontre | null = null;
let empreinte = '';

/** Ce que la montre reçoit de la séance (plan de l'île plus la charge et les répétitions de chaque exercice) */
export function seanceDepuisPlan(e: {
  titre: string;
  debutMs: number;
  finReposMs: number | null;
  reposTotalS: number;
  plan?: PlanIle | null;
  charges?: { kg: number; reps: number }[] | null;
}): SeanceMontre | null {
  const p = e.plan;
  if (!p || p.exos.length === 0) return null;
  const exos = p.exos.slice(0, 20).map((x, i) => {
    const c = e.charges?.[i];
    return {
      id: x.id,
      nom: x.nom,
      faites: x.faites,
      total: x.total,
      repos: x.repos,
      kg: c && Number.isFinite(c.kg) && c.kg > 0 ? Math.round(c.kg * 10) / 10 : 0,
      reps: c && Number.isFinite(c.reps) && c.reps > 0 ? Math.round(c.reps) : 0,
    };
  });
  return {
    titre: e.titre.slice(0, 40),
    debutMs: e.debutMs,
    finReposMs: e.finReposMs,
    reposTotalS: Math.max(0, Math.round(e.reposTotalS)),
    cur: Math.min(Math.max(0, p.cur), exos.length - 1),
    exos,
  };
}

/** Range la séance en cours (null : finie) et prévient la synchro de la montre si elle a changé */
export function majSeanceMontre(s: SeanceMontre | null): void {
  const e = s ? JSON.stringify(s) : '';
  if (e === empreinte) return;
  empreinte = e;
  actuelle = s;
  try {
    DeviceEventEmitter.emit(SEANCE_MONTRE_EVENT);
  } catch {
    // rien a faire
  }
}

/** La séance en cours, ou null (aucune, ou commencée il y a plus de 6 heures) */
export function seanceMontre(maintenant = Date.now()): SeanceMontre | null {
  if (!actuelle) return null;
  if (maintenant - actuelle.debutMs > DUREE_MAX_MS) return null;
  return actuelle;
}
