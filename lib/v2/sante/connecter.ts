/**
 * Connexion à Apple Santé ou Health Connect avec vérification réelle (14 octobre 2026, SANTÉ CONNEXION).
 * Utilisée par l'onboarding, le mini onboarding 3.0, la carte de l'Accueil, Santé et Appareils et sources.
 * Les règles sont dans ./connexion.ts (pur, testé).
 */
import { AppState, DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthConnect } from '@/lib/healthConnect';
import { logger } from '@/lib/security/logger';
import { connecterAvecVerification, uneSeuleFois } from './connexion';
import type { IssueConnexion, StatutDemande } from './connexion';
import { publierEtapeConnexion } from './importEtat';

type Service = {
  isAvailable: () => Promise<boolean>;
  initialize?: () => Promise<boolean>;
  connect: (opts?: { sansSync?: boolean; silent?: boolean }) => Promise<boolean>;
  statutDemande?: () => Promise<StatutDemande>;
  lectureReelle?: () => Promise<boolean>;
  setupWorkoutObserver?: () => Promise<void>;
  importFullHistory?: () => Promise<unknown>;
  syncAll?: () => Promise<unknown>;
};

const svc = healthConnect as unknown as Service;
const LAST_IMPORT_KEY = '@yoroi_last_full_import_ts';

/** Import complet puis synchro du jour, une seule fois à la fois, sans bloquer l'écran */
export const lancerImportInitial = uneSeuleFois(async (): Promise<void> => {
  try {
    publierEtapeConnexion('import');
    await svc.importFullHistory?.();
    await AsyncStorage.setItem(LAST_IMPORT_KEY, String(Date.now())).catch(() => {});
    await svc.syncAll?.();
  } catch (e) {
    logger.warn('[Sante] import initial', e);
  } finally {
    publierEtapeConnexion('termine');
    DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
  }
});

/** Une seule demande à la fois, résultat vérifié par une vraie lecture */
export const connecterSante = uneSeuleFois(async (): Promise<IssueConnexion> => {
  const plateforme = Platform.OS;
  let issue: IssueConnexion = 'erreur';
  try {
    issue = await connecterAvecVerification(
      {
        disponible: () => svc.isAvailable(),
        demander: async () => {
          await svc.initialize?.();
          return svc.connect({ sansSync: true });
        },
        statut: () => (svc.statutDemande ? svc.statutDemande() : Promise.resolve('inconnu' as StatutDemande)),
        lectureReelle: () => (svc.lectureReelle ? svc.lectureReelle() : Promise.resolve(false)),
        surRetour: (cb) => {
          const sub = AppState.addEventListener('change', (st) => {
            if (st === 'active') cb();
          });
          return () => sub.remove();
        },
        etape: publierEtapeConnexion,
      },
      plateforme,
    );
  } catch (e) {
    logger.warn('[Sante] connexion', e);
    issue = 'erreur';
  }
  logger.info('[Sante] issue de la connexion', issue);

  // iOS : la fenêtre a été montrée, la reconnexion au lancement peut reprendre (les données arriveront)
  if (plateforme === 'ios' && (issue === 'connecte' || issue === 'rien_lu')) {
    await AsyncStorage.setItem('@yoroi_healthkit_asked', 'true').catch(() => {});
  }
  if (issue === 'connecte') {
    if (plateforme === 'android') await AsyncStorage.setItem('@yoroi_healthconnect_connected', 'true').catch(() => {});
    await svc.setupWorkoutObserver?.().catch(() => {});
    void lancerImportInitial();
  } else {
    publierEtapeConnexion('repos');
  }
  return issue;
});
