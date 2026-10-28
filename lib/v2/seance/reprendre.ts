/**
 * Revenir a sa seance en cours (26 octobre 2026, retour d'un utilisateur : « il est alle sur WhatsApp pendant
 * son repos, il est revenu, il avait tout perdu »). Le toucher de l'ecran verrouille, de la Dynamic Island ou
 * de la notification de fin de repos ouvrait le chrono seul (/timer) ou rien du tout : la seance semblait effacee.
 * Maintenant, s'il y a une seance en cours, on rouvre CETTE seance, avec ses series.
 */
import { loadDraft } from './model';
import { draftRoute } from './resume';
import { chargerBrouillonSprints } from '@/lib/v2/intervalles/brouillon';
import { chargerBrouillonChrono } from '@/lib/v2/carnet/brouillonChrono';

export type Reprise = { pathname: string; params: { resume: '1' } };

/** La seance en cours a rouvrir, ou null s'il n'y en a pas (ou si on y est deja) */
export async function repriseSeance(ici?: string): Promise<Reprise | null> {
  const d = await loadDraft().catch(() => null);
  // 28 octobre 2026 : des sprints guidés gardés se rouvrent aussi (lib/v2/intervalles/brouillon.ts)
  const sprints = !d || d.form ? await chargerBrouillonSprints().catch(() => null) : null;
  // et un chrono garde (app/timer.tsx, lib/v2/carnet/brouillonChrono.ts)
  const chrono = (!d || d.form) && !sprints ? await chargerBrouillonChrono().catch(() => null) : null;
  if ((!d || d.form) && !sprints && !chrono) return null;
  const pathname = d && !d.form ? draftRoute(d) : sprints ? '/seance/sprints' : '/timer';
  if (ici && ici === pathname) return null;
  return { pathname, params: { resume: '1' } };
}
