/**
 * Synchro automatique entre tes appareils appaires (30 octobre 2026) : monte une fois dans app/_layout.tsx, a cote
 * de <SynchroMontre />. Ne dessine rien. Voir lib/v2/synchro/auto.ts.
 */
import { useEffect } from 'react';
import { demarrerSynchroAuto } from '@/lib/v2/synchro/auto';

export function SynchroAuto(): null {
  useEffect(() => demarrerSynchroAuto(), []);
  return null;
}

export default SynchroAuto;
