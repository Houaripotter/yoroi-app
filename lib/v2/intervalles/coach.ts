/**
 * Sprints guidés : quel évènement du coach vocal (lib/v2/coachVocal/moteur.ts) à chaque étape.
 * Début d'échauffement, de sprint (le dernier a sa phrase), de récupération : intervalStart.
 * Début du retour au calme : intervalsEnd (« Intervalles terminés, récupère tranquillement »).
 * Fin de la séance : sessionEnd, ou intervalsEnd s'il n'y a pas de retour au calme.
 */
import type { EvenementCoach } from '@/lib/v2/coachVocal/moteur';
import type { EtapeIntervalle } from './plan';

export function evenementPourEtape(e: EtapeIntervalle): EvenementCoach {
  switch (e.type) {
    case 'echauffement':
      return { type: 'intervalStart', phase: 'echauffement' };
    case 'sprint':
      return { type: 'intervalStart', phase: 'sprint', dernier: e.dernier };
    case 'recup':
      return { type: 'intervalStart', phase: 'recup' };
    default:
      return { type: 'intervalsEnd' };
  }
}

export function evenementFin(plan: readonly EtapeIntervalle[]): EvenementCoach {
  const der = plan[plan.length - 1];
  return der && der.type === 'retour_calme' ? { type: 'sessionEnd' } : { type: 'intervalsEnd' };
}
