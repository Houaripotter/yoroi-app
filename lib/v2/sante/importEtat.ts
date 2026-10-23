/**
 * État partagé de la connexion Santé et de l'import initial (14 octobre 2026, SANTÉ CONNEXION).
 * Écoute les événements YOROI_IMPORT_* dès le chargement : un écran ouvert en cours d'import
 * (Accueil après l'onboarding) affiche quand même « Import en cours : 120 pesées, 45 séances ».
 */
import { DeviceEventEmitter } from 'react-native';
import type { CompteImport, EtapeConnexion } from './connexion';

export type EtatSante = {
  connexion: EtapeConnexion;
  import: 'aucun' | 'en_cours' | 'termine';
  compte: CompteImport | null;
  etapeImport: string;
};

let etat: EtatSante = { connexion: 'repos', import: 'aucun', compte: null, etapeImport: '' };
const abonnes = new Set<(e: EtatSante) => void>();

function publier(p: Partial<EtatSante>) {
  etat = { ...etat, ...p };
  abonnes.forEach((cb) => {
    try {
      cb(etat);
    } catch {
      /* un écran fermé ne bloque pas les autres */
    }
  });
}

export function lireEtatSante(): EtatSante {
  return etat;
}

export function ecouterEtatSante(cb: (e: EtatSante) => void): () => void {
  abonnes.add(cb);
  return () => {
    abonnes.delete(cb);
  };
}

export function publierEtapeConnexion(e: EtapeConnexion) {
  publier({ connexion: e });
}

const compteDe = (d: any): CompteImport | null =>
  d && typeof d === 'object' ? { weights: Number(d.weights) || 0, workouts: Number(d.workouts) || 0, sleep: Number(d.sleep) || 0, steps: Number(d.steps) || 0 } : null;

try {
  DeviceEventEmitter.addListener('YOROI_IMPORT_START', () => publier({ import: 'en_cours', compte: null, etapeImport: '' }));
  DeviceEventEmitter.addListener('YOROI_IMPORT_PROGRESS', (d: { step?: string; compte?: unknown }) =>
    publier({ import: 'en_cours', etapeImport: String(d?.step ?? ''), compte: compteDe(d?.compte) ?? etat.compte }),
  );
  DeviceEventEmitter.addListener('YOROI_IMPORT_DONE', (d: unknown) => publier({ import: 'termine', compte: compteDe(d) ?? etat.compte }));
} catch {
  /* tests sans react-native complet */
}
