/**
 * 3 novembre 2026 (Houari : « quand il y a un chrono, à 10 secondes, le clac clac clac ») : les claquettes de bois
 * des 10 dernieres secondes, comme le coin du ring en boxe et en MMA. Trois coups secs, 0,18 s d'ecart
 * (assets/sounds/claquettes_10s.mp3, son cree pour YOROI).
 *
 * Ou elles sonnent : les rounds, les repos entre les rounds (10 s avant le round suivant, comme la minuterie
 * d'une salle), le Tabata, chaque minute, le maximum de tours, le repos entre les series et les sprints guides.
 * Jamais dans une phase de 10 s ou moins (le repos de 10 s du Tabata), ni dans la preparation, ni quand le chrono monte.
 * Reglage commun « Claquettes à 10 secondes » (lib/v2/carnet/chrono.ts, CLAP_KEY), ouvert par defaut.
 * Le son passe par les lecteurs de l'app : il suit le reglage des sons de l'app, comme le gong et la cloche.
 */
import type { ChronoPhase } from './useChronoEngine';

export const CLAQUETTES_S = 10;
/** ecart entre deux coups du fichier son, pour caler les petites vibrations */
export const CLAQUETTES_ECART_MS = 180;
export const CLAQUETTES_COUPS = 3;

/** Les claquettes sonnent dans cette phase : un effort ou un repos qui descend et dure plus de 10 s */
export function claquettesPrevues(p: Pick<ChronoPhase, 'kind' | 'duration' | 'countUp' | 'clap' | 'clapEtDecompte'>): boolean {
  if (!p.clap && !p.clapEtDecompte) return false;
  return !p.countUp && p.kind !== 'prepa' && p.duration > CLAQUETTES_S;
}

/** Le decompte 3 2 1 reste, sauf dans un round de combat : la cloche suffit, comme avant */
export function decompteGarde(p: Pick<ChronoPhase, 'kind' | 'duration' | 'countUp' | 'clap' | 'clapEtDecompte'>): boolean {
  return !(p.clap && claquettesPrevues(p));
}

/**
 * Ce que joue l'ecran au repere des 10 s. Claquettes coupees : un round de combat reste muet (comme avant),
 * les autres phases de plus de 30 s gardent le petit bip des 10 s d'avant.
 */
export function sonDixSecondes(p: Pick<ChronoPhase, 'duration' | 'clap'>, clapOn: boolean): 'clap' | 'bip' | null {
  if (clapOn) return 'clap';
  return !p.clap && p.duration > 30 ? 'bip' : null;
}

/**
 * Minuteurs hors moteur (repos de la seance de muscu, seance de combat en direct) : vrai quand le temps restant
 * vient de passer les 10 s. Un passage vu en retard (retour dans l'app) ne fait pas sonner.
 */
export function claquettesAuPassage(totalS: number, resteMs: number, fenetreMs = 1500): boolean {
  return totalS > CLAQUETTES_S && resteMs <= CLAQUETTES_S * 1000 && resteMs > CLAQUETTES_S * 1000 - fenetreMs;
}

/** Une petite vibration avec chaque coup ; rend une fonction qui annule celles a venir */
export function tapsClaquettes(tap: () => void): () => void {
  const minuteurs: ReturnType<typeof setTimeout>[] = [];
  const sur = () => {
    try {
      tap();
    } catch {
      // une vibration ne bloque jamais le chrono
    }
  };
  sur();
  for (let k = 1; k < CLAQUETTES_COUPS; k++) minuteurs.push(setTimeout(sur, k * CLAQUETTES_ECART_MS));
  return () => minuteurs.forEach(clearTimeout);
}
