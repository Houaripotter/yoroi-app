/**
 * Monte une seule fois dans app/_layout.tsx, a cote de <SynchroMontre /> : tient a jour l'instantane des grands
 * widgets iPad et Mac (lib/v2/widgetsGrands/synchro.ts). iOS seulement. N'affiche rien.
 */
import { useEffect } from 'react';
import { demarrerSynchroGrands } from './synchro';

export function SynchroGrands(): null {
  useEffect(() => demarrerSynchroGrands(), []);
  return null;
}
