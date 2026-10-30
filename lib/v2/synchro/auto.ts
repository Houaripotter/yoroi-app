/**
 * Synchro automatique entre tes appareils appaires (30 octobre 2026).
 *
 * La recherche des appareils (Multipeer Connectivity) tourne quand :
 *  . l'app est au premier plan,
 *  . ET au moins un appareil est appaire, ou l'ecran « Tes appareils » est ouvert (pour appairer).
 * Elle s'arrete des que l'app passe en arriere plan : pas de recherche permanente, la batterie est menagee
 * (iOS ne laisse de toute facon pas Multipeer tourner en arriere plan).
 *
 * Deux appareils appaires proches, app ouverte, se relient et s'echangent tout seuls (lib/peerSyncService.ts,
 * a la connexion). Apres un enregistrement, l'envoi part aussi vers ceux qui sont relies.
 * Un appareil non appaire ne recoit rien : tout passe par la cle de la paire.
 *
 * Monte une fois par <SynchroAuto /> (components/yoroi/v2/synchro/SynchroAuto.tsx). Teste dans
 * __tests__/unit/synchroAuto.test.ts.
 */
import { AppState, type AppStateStatus } from 'react-native';
import { aDesAppareilsAppaires, initPeerSync, isPeerSyncAvailable, stopPeerSync, synchroEnMarche } from '@/lib/peerSyncService';

const raisons = new Set<string>();
let premierPlan = AppState.currentState === 'active' || AppState.currentState == null;
let monte = 0;
let file: Promise<void> = Promise.resolve();

/** Met la recherche en marche ou l'arrete selon l'etat de l'app. Les appels se suivent, jamais en meme temps. */
export function evaluer(): Promise<void> {
  const run = async () => {
    if (!isPeerSyncAvailable()) return;
    const veut = premierPlan && (raisons.size > 0 || (monte > 0 && (await aDesAppareilsAppaires())));
    if (veut && !synchroEnMarche()) await initPeerSync();
    else if (!veut && synchroEnMarche()) await stopPeerSync();
  };
  file = file.then(run, run).catch(() => undefined);
  return file;
}

/** Garde la recherche en marche tant que la fonction rendue n'est pas appelee (ecran « Tes appareils ») */
export function garderSynchro(raison: string): () => void {
  raisons.add(raison);
  void evaluer();
  return () => {
    raisons.delete(raison);
    void evaluer();
  };
}

function changementEtat(etat: AppStateStatus) {
  // « inactive » (centre de controle, appel) ne coupe pas : seule la vraie mise en arriere plan arrete tout
  if (etat === 'active') premierPlan = true;
  else if (etat === 'background') premierPlan = false;
  else return;
  void evaluer();
}

/** Demarre la synchro automatique. Rend la fonction d'arret. */
export function demarrerSynchroAuto(): () => void {
  monte += 1;
  premierPlan = AppState.currentState === 'active' || AppState.currentState == null;
  const sub = AppState.addEventListener('change', changementEtat);
  void evaluer();
  return () => {
    monte = Math.max(0, monte - 1);
    sub.remove();
    void evaluer();
  };
}

export const __test__ = {
  reinitialiser: () => { raisons.clear(); monte = 0; premierPlan = true; file = Promise.resolve(); },
  attendre: () => file,
};
