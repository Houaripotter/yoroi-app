/**
 * Ton programme en cours, lu pour l'accueil (1er novembre 2026) : « Ta prochaine séance » et, en grand écran,
 * Ton programme et Ta semaine travaille. Mêmes données que la page du programme (useProchaines, vueDuJour) :
 * tes remplacements, ton matériel, ta fin de séance et les charges proposées. L'accueil lit seulement : il ne
 * prépare jamais les versions B (completer faux).
 */
import { useMemo } from 'react';
import { useProchaines, vueDuJour } from '@/app/programmes/prochaines';
import type { Donnees } from '@/app/programmes/prochaines';
import type { VueJour } from '@/components/yoroi/v2/programmes/ProchainesSeances';
import { prochaineSeanceProgramme } from '@/lib/v2/accueil/prochaineProgramme';

export type ProgrammeAccueil = {
  /** tout ce que la page du programme lit ; null : aucun programme en cours */
  d: Donnees | null;
  pret: boolean;
  /** la prochaine séance à faire (aujourd'hui compris), telle que tu la feras */
  prochaine: VueJour | null;
};

export function useProgrammeAccueil(): ProgrammeAccueil {
  const { d, pret } = useProchaines({ completer: false });
  const prochaine = useMemo(() => {
    if (!d) return null;
    try {
      const jp = prochaineSeanceProgramme(d.actif, d.p, d.trainings, new Date());
      return jp ? vueDuJour(d, jp) : null;
    } catch {
      return null;
    }
  }, [d]);
  return { d, pret, prochaine };
}
