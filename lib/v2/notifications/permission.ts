/**
 * Permission de notification au bon moment.
 *
 * Règles :
 *  - jamais au premier lancement ;
 *  - proposée après une réussite : une pesée enregistrée depuis l'écran Pesée (celle de
 *    l'onboarding ne passe pas par là) ou une séance enregistrée (écran de fin de séance) ;
 *  - d'abord une fenêtre maison qui explique à quoi ça sert, puis la fenêtre du système
 *    seulement si la personne touche « Activer les rappels » ;
 *  - « Plus tard » : pas de nouvelle proposition avant 7 jours, 2 propositions au plus ;
 *  - refusée par le système (status denied ou canAskAgain false) : plus jamais de fenêtre maison.
 *
 * État dans AsyncStorage (clé @yoroi_notif_permission_v1).
 * Les fonctions spécifiques (chrono, sparring, essai Premium, réglages) passent par
 * demanderPermissionSysteme, qui ne redemande jamais une permission déjà refusée.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { logger } from '@/lib/security/logger';
import { ouvrirFenetreRappels } from '@/components/yoroi/v2/notifications/FenetreRappels';
import { noter } from './mesure';

export type EcranPermission = 'pesee' | 'seance' | 'timer' | 'sparring' | 'reglages' | 'essai' | 'onboarding' | 'nouveautes';

// Point d'accroche pour la mesure : fonction vide, branché sur utils/telemetry.ts au chantier mesure
export { noter } from './mesure';
export type { EvenementMesure as EvenementPermission } from './mesure';

const CLE = '@yoroi_notif_permission_v1';
export const DELAI_PLUS_TARD_MS = 7 * 24 * 60 * 60 * 1000;
export const PROPOSITIONS_MAX = 2;

export type EtatPermission = {
  /** nombre de fois où la fenêtre maison a été montrée */
  propositions: number;
  /** dernière fois où « Plus tard » a été touché (ms) */
  plusTardLe: number | null;
};

const ETAT_VIDE: EtatPermission = { propositions: 0, plusTardLe: null };

export type StatutSysteme = { status: 'granted' | 'denied' | 'undetermined' | string; canAskAgain: boolean };

/** Décision pure : peut-on montrer la fenêtre maison maintenant ? */
export function peutProposer(etat: EtatPermission, systeme: StatutSysteme, maintenant: number): boolean {
  if (systeme.status === 'granted') return false;
  if (systeme.status === 'denied' || !systeme.canAskAgain) return false;
  if (etat.propositions >= PROPOSITIONS_MAX) return false;
  if (etat.plusTardLe !== null && maintenant - etat.plusTardLe < DELAI_PLUS_TARD_MS) return false;
  return true;
}

async function lireEtat(): Promise<EtatPermission> {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    if (!brut) return { ...ETAT_VIDE };
    const e = JSON.parse(brut) as Partial<EtatPermission>;
    return {
      propositions: typeof e.propositions === 'number' ? e.propositions : 0,
      plusTardLe: typeof e.plusTardLe === 'number' ? e.plusTardLe : null,
    };
  } catch {
    return { ...ETAT_VIDE };
  }
}

async function ecrireEtat(e: EtatPermission): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE, JSON.stringify(e));
  } catch (err) {
    logger.warn('[Permission notif] état non enregistré', err);
  }
}

async function statutSysteme(): Promise<StatutSysteme | null> {
  if (Platform.OS === 'web') return null;
  try {
    const p = await Notifications.getPermissionsAsync();
    return { status: p.status, canAskAgain: p.canAskAgain !== false };
  } catch {
    return null;
  }
}

/** Vrai si les notifications sont déjà autorisées. Ne demande jamais rien. */
export async function notificationsAutorisees(): Promise<boolean> {
  const s = await statutSysteme();
  return s?.status === 'granted';
}

/**
 * Fenêtre du système, seulement si elle peut encore s'afficher.
 * Déjà autorisée : vrai sans rien demander. Déjà refusée : faux sans rien demander.
 */
export async function demanderPermissionSysteme(ecran: EcranPermission): Promise<boolean> {
  const s = await statutSysteme();
  if (!s) return false;
  if (s.status === 'granted') return true;
  if (s.status === 'denied' || !s.canAskAgain) return false;
  noter('notif_permission_demandee', { ecran });
  try {
    const r = await Notifications.requestPermissionsAsync();
    const ok = r.status === 'granted';
    noter(ok ? 'notif_permission_acceptee' : 'notif_permission_refusee', { ecran });
    return ok;
  } catch (err) {
    logger.warn('[Permission notif] demande système impossible', err);
    return false;
  }
}

let enCours = false;

/** Vrai pendant que la fenêtre maison est à l'écran (ou sur le point de l'être) */
export function propositionEnCours(): boolean {
  return enCours;
}

/**
 * Propose les rappels avec la fenêtre maison, si les règles le permettent.
 * Résout avec vrai si la fenêtre a été montrée (l'appelant n'affiche alors rien d'autre,
 * par exemple pas de demande d'avis).
 * onAccepte : appelé quand la permission système vient d'être accordée.
 */
export async function proposerNotifications(
  ecran: EcranPermission,
  opts?: { titre?: string; texte?: string; onAccepte?: () => void },
): Promise<boolean> {
  if (enCours) return false;
  const s = await statutSysteme();
  if (!s) return false;
  const etat = await lireEtat();
  if (!peutProposer(etat, s, Date.now())) return false;

  enCours = true;
  await ecrireEtat({ ...etat, propositions: etat.propositions + 1 });
  noter('notif_permission_proposee', { ecran });

  ouvrirFenetreRappels({
    titre: opts?.titre,
    texte: opts?.texte,
    onActiver: () => {
      enCours = false;
      void demanderPermissionSysteme(ecran).then((ok) => {
        if (ok) opts?.onAccepte?.();
      });
    },
    onPlusTard: () => {
      enCours = false;
      noter('notif_permission_plus_tard', { ecran });
      void lireEtat().then((e) => ecrireEtat({ ...e, plusTardLe: Date.now() }));
    },
  });
  return true;
}

/** Rappels déjà réglés dans l'app : on les (re)programme une fois la permission accordée */
function reprogrammerRappels(): void {
  import('@/lib/v2/pesee/rappelHabitude')
    .then(({ planifierRappelPesee }) => planifierRappelPesee())
    .catch((err) => logger.info('[Permission notif] rappel de pesée non reprogrammé', err));
  import('@/lib/notificationService')
    .then(({ notificationService }) => notificationService.initialize())
    .catch((err) => logger.info('[Permission notif] rappels non reprogrammés', err));
}

/**
 * Après une réussite (pesée ou séance enregistrée).
 * Appelée par l'écran, pas par le service d'enregistrement : la pesée de l'onboarding
 * ne passe jamais par ici. La fenêtre arrive quelques instants après, pour ne pas
 * couper l'écran de fin ni une célébration.
 */
export async function proposerNotificationsApresReussite(ecran: 'pesee' | 'seance'): Promise<boolean> {
  try {
    return await proposerNotifications(ecran, { onAccepte: reprogrammerRappels });
  } catch (err) {
    logger.warn('[Permission notif] proposition impossible', err);
    enCours = false;
    return false;
  }
}
