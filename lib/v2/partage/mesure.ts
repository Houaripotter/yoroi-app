/**
 * Mesure des partages, branchee sur utils/telemetry.ts (13 octobre 2026) : share_tap et share_envoye.
 * Seule la source part, jamais le contenu partage.
 */
import { track } from '@/utils/telemetry';

export type SourcePartage =
  | 'record'
  | 'recap_semaine'
  | 'recap_mois'
  | 'compteur_annee'
  | 'derniere_seance'
  | 'avant_apres'
  | 'bilan_annuel'
  | 'carte_combattant'
  | 'duel'
  | 'carnet'
  | 'record_mouvement'
  | 'sparring'
  | 'citation'
  | 'app'
  | 'stats_seances'
  | 'partenaire'
  /** cartes a partager (nuit du 14 octobre) : la pesee en progres */
  | 'carte_pesee'
  /** 18 octobre 2026 : la carte des paliers de serie (7, 30 et 100 jours d'affilee, Dojo) */
  | 'serie';

/**
 * A appeler quand la personne touche Partager (envoye absent),
 * puis avec envoye = true quand le systeme confirme l'envoi.
 */
export function noterPartage(source: SourcePartage, envoye?: boolean): void {
  track(envoye ? 'share_envoye' : 'share_tap', { source });
}
