/**
 * Tirer vers le bas puis relacher pour actualiser (28 octobre 2026, demande de Houari).
 * Une seule fonction pour tous les ecrans, dans cet ordre :
 * 1. Apple Sante ou Health Connect : relance la lecture si l'ecran en affiche et si Sante est reliee (jamais en demo) ;
 * 2. l'autre telephone : lance la synchro existante (peerSyncService.forceSync) si un appareil est appaire et a portee ;
 * 3. les donnees du telephone : l'ecran relit les siennes, et l'evenement YOROI_DATA_CHANGED fait relire les autres.
 * Le resultat donne le message a afficher : « À jour », ou la vraie raison d'un echec.
 */
import { traduire } from '@/lib/i18n/tr';

export type EtapesActualiser = {
  /** relecture propre a l'ecran (base, reglages) */
  relire?: () => unknown;
  /** l'ecran affiche des donnees d'Apple Sante ou de Health Connect */
  sante?: boolean;
  /** false : pas de synchro avec l'autre telephone (par defaut : oui) */
  synchro?: boolean;
  /** false : ne previent pas les autres ecrans (par defaut : oui) */
  annoncer?: boolean;
};

export type ResultatActualiser = { ok: boolean; message: string; appareils: number; erreurs: string[] };

export type DependancesActualiser = {
  nomSante: () => string;
  /** Sante est reliee et l'app n'est pas en mode demo */
  santeReliee: () => Promise<boolean>;
  /** true si la lecture a reussi */
  lireSante: () => Promise<boolean>;
  synchroDisponible: () => boolean;
  /** nombre d'appareils contactes */
  lancerSynchro: () => Promise<number>;
  annoncer: () => void;
};

/* eslint-disable @typescript-eslint/no-require-imports */
const DEPENDANCES: DependancesActualiser = {
  nomSante: () => require('@/lib/v2/sante/data').providerName(),
  santeReliee: async () => {
    const { getSanteSource } = require('@/lib/v2/sante/data');
    const { demoActive } = require('@/lib/v2/demo/garde');
    if (await demoActive()) return false;
    return (await getSanteSource()).mode === 'live';
  },
  lireSante: () => require('@/lib/v2/sante/data').syncNow(),
  synchroDisponible: () => require('@/lib/peerSyncService').isPeerSyncAvailable(),
  lancerSynchro: () => require('@/lib/peerSyncService').forceSync(),
  annoncer: () => {
    const { DeviceEventEmitter } = require('react-native');
    DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
  },
};
/* eslint-enable @typescript-eslint/no-require-imports */

const texteErreur = (e: unknown): string => {
  const m = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  return m.trim();
};

export async function actualiser(etapes: EtapesActualiser = {}, dep: DependancesActualiser = DEPENDANCES): Promise<ResultatActualiser> {
  const erreurs: string[] = [];
  let appareils = 0;

  if (etapes.sante) {
    try {
      if (await dep.santeReliee()) {
        const ok = await dep.lireSante();
        if (!ok) erreurs.push(traduire('{0} n’a pas répondu, réessaie dans un instant.', dep.nomSante()));
      }
    } catch (e) {
      erreurs.push(traduire('{0} n’a pas répondu : {1}', dep.nomSante(), texteErreur(e) || traduire('raison inconnue')));
    }
  }

  if (etapes.synchro !== false) {
    try {
      if (dep.synchroDisponible()) appareils = (await dep.lancerSynchro()) || 0;
    } catch (e) {
      erreurs.push(traduire('La synchro avec ton autre téléphone a échoué : {0}', texteErreur(e) || traduire('raison inconnue')));
    }
  }

  if (etapes.relire) {
    try {
      await etapes.relire();
    } catch (e) {
      erreurs.push(traduire('Tes données n’ont pas pu être relues : {0}', texteErreur(e) || traduire('raison inconnue')));
    }
  }
  if (etapes.annoncer !== false) {
    try {
      dep.annoncer();
    } catch {
      // jamais bloquant
    }
  }

  if (erreurs.length) return { ok: false, message: erreurs[0], appareils, erreurs };
  return {
    ok: true,
    message: appareils > 0 ? traduire('À jour, synchro lancée avec ton autre téléphone') : traduire('À jour'),
    appareils,
    erreurs,
  };
}
