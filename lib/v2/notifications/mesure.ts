/**
 * Points d'accroche pour la mesure (permission de notification, demande d'avis).
 * Branches sur utils/telemetry.ts depuis le 13 octobre 2026 : seuls des noms et des ecrans de listes fermees partent.
 */
import { track, type EcranPermission } from '@/utils/telemetry';

export type EvenementMesure =
  | 'notif_permission_proposee'
  | 'notif_permission_plus_tard'
  | 'notif_permission_demandee'
  | 'notif_permission_acceptee'
  | 'notif_permission_refusee'
  | 'avis_demande';

const ECRANS: readonly EcranPermission[] = ['pesee', 'seance', 'timer', 'sparring', 'reglages', 'essai'];

/** Branche sur utils/telemetry.ts (13 octobre 2026) */
export function noter(evenement: EvenementMesure, details?: Record<string, string | number | boolean>): void {
  if (evenement === 'avis_demande') {
    track('avis_demande', { moment: 'troisieme_seance' });
    return;
  }
  const e = details?.ecran;
  const ecran: EcranPermission = typeof e === 'string' && (ECRANS as string[]).includes(e) ? (e as EcranPermission) : 'reglages';
  const nom = evenement === 'notif_permission_acceptee' ? 'notif_permission_accordee' : evenement;
  track(nom, { ecran });
}
