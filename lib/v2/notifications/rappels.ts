/**
 * Rappels de discipline (14 octobre 2026) : lecture, application et autorisation.
 * Logique pure dans ./discipline.ts. Rien n'est active par defaut : seulement ce que l'utilisateur allume
 * (onboarding ecran 7, « Nouveautes de la 3.0 », Reglages, Rappels).
 *
 * Aucun doublon : chaque choix passe par le service qui existait deja, qui n'annule que ses propres notifications.
 *  - seance : notificationService (training), rappels dates sur deux semaines, sans les jours deja faits ;
 *  - pesee : rappelHabitude (rappel doux, jamais si la pesee du jour est notee) ; l'ancien rappel de pesee a heure fixe
 *    (notificationService, weighing) est coupe quand celui-ci s'allume, pour ne pas recevoir deux rappels de pesee ;
 *  - eau : notificationService (hydration) ;
 *  - bilan : weeklyRecapNotification (dimanche 19 h).
 * Les anciens rappels de l'ecran ReminderSettings (supprime) sont annules a chaque application.
 */
import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { logger } from '@/lib/security/logger';
import { ouvrirFenetreRappels } from '@/components/yoroi/v2/notifications/FenetreRappels';
import { demanderPermissionSysteme } from './permission';
import type { EcranPermission } from './permission';
import {
  JOURS_PESEE,
  auMoinsUnRappel,
  choixDepuisServices,
  heureValide,
  joursSeanceRetenus,
  lundiVersJs,
} from './discipline';
import type { ChoixRappels } from './discipline';
import { cancelLegacyReminderSettings, notificationService } from '@/lib/notificationService';
import { getHabitudePesee, planifierRappelPesee, saveHabitudePesee } from '@/lib/v2/pesee/rappelHabitude';
import { cancelWeeklyRecap, isWeeklyRecapEnabled, scheduleWeeklyRecap } from '@/lib/weeklyRecapNotification';

export type ResultatPermission = 'ok' | 'refuse' | 'plus_tard';

export const TITRE_PERMISSION = 'Des rappels, seulement les tiens';
export const TEXTE_PERMISSION =
  'YOROI te prévient les jours et à l’heure que tu choisis, rien de plus. Jamais de chiffre de santé sur l’écran verrouillé. Ton téléphone va te demander l’autorisation.';

async function statut(): Promise<{ status: string; canAskAgain: boolean } | null> {
  if (Platform.OS === 'web') return null;
  try {
    const p = await Notifications.getPermissionsAsync();
    return { status: p.status, canAskAgain: p.canAskAgain !== false };
  } catch {
    return null;
  }
}

export async function rappelsAutorises(): Promise<boolean> {
  return (await statut())?.status === 'granted';
}

/**
 * A appeler seulement quand l'utilisateur allume un rappel.
 * Deja autorise : ok sans rien demander. Jamais demande : un mot d'explication, puis la fenetre du systeme.
 * Refuse par le systeme : 'refuse' sans rien redemander (l'ecran montre le lien vers Reglages).
 */
export async function permissionPourRappels(ecran: EcranPermission): Promise<ResultatPermission> {
  const s = await statut();
  if (!s) return 'refuse';
  if (s.status === 'granted') return 'ok';
  if (s.status === 'denied' || !s.canAskAgain) return 'refuse';
  return new Promise<ResultatPermission>((resolve) => {
    ouvrirFenetreRappels({
      titre: TITRE_PERMISSION,
      texte: TEXTE_PERMISSION,
      onActiver: () => {
        void (async () => {
          try {
            // Android 13 et plus : le canal doit exister avant la demande
            if (Platform.OS === 'android') {
              await Notifications.setNotificationChannelAsync('default', {
                name: 'YOROI',
                importance: Notifications.AndroidImportance.HIGH,
              }).catch(() => undefined);
            }
            resolve((await demanderPermissionSysteme(ecran)) ? 'ok' : 'refuse');
          } catch {
            resolve('refuse');
          }
        })();
      },
      onPlusTard: () => resolve('plus_tard'),
    });
  });
}

export function ouvrirReglagesSysteme(): void {
  Linking.openSettings().catch(() => undefined);
}

/** Le choix tel qu'il est vraiment programme aujourd'hui (tout eteint sans autorisation) */
export async function lireChoixRappels(): Promise<ChoixRappels> {
  const [hab, recap, autorise] = await Promise.all([
    getHabitudePesee().catch(() => null),
    isWeeklyRecapEnabled().catch(() => false),
    rappelsAutorises(),
  ]);
  const s = await notificationService.loadSettings().catch(() => notificationService.getSettings());
  const on = s.enabled !== false;
  return choixDepuisServices({
    autorise,
    training: on ? s.training : null,
    hydratation: on && !!s.hydration?.enabled,
    pesee: hab ? { actif: hab.actif && !!hab.moment && hab.moment !== 'inconnu', joursJs: hab.jours } : null,
    bilan: recap,
  });
}

/**
 * Ecrit le choix dans les services et reprogramme. Ne demande jamais l'autorisation.
 * joursEntrainement (0 = lundi) : a l'onboarding, les jours de l'ecran Rythme quand les jours du rappel n'ont pas ete touches.
 */
export async function appliquerChoixRappels(c: ChoixRappels, opts: { joursEntrainement?: number[] | null } = {}): Promise<void> {
  try {
    const s = await notificationService.loadSettings().catch(() => notificationService.getSettings());
    const hyd = s.hydration;
    // premiere activation : des horaires utiles plutot qu'un seul rappel a 8 h (comme Reglages, Rappels)
    const hydration = c.eau.actif
      ? hyd.startTime === hyd.endTime && hyd.interval >= 24
        ? { ...hyd, enabled: true, useSlots: false, startTime: '09:00', endTime: '19:00', interval: 3 }
        : { ...hyd, enabled: true }
      : { ...hyd, enabled: false };
    await notificationService.updateSettings({
      ...(auMoinsUnRappel(c) ? { enabled: true } : {}),
      training: {
        ...s.training,
        enabled: c.seance.actif,
        time: heureValide(c.seance.heure),
        days: joursSeanceRetenus(c, opts.joursEntrainement).map(lundiVersJs).sort((a, b) => a - b),
      },
      // un seul rappel de pesee : le rappel doux remplace celui a heure fixe
      weighing: c.pesee.actif ? { ...s.weighing, enabled: false } : s.weighing,
      hydration,
    });
    await cancelLegacyReminderSettings();
  } catch (e) {
    logger.warn('[Rappels] seance ou eau non appliques', e);
  }

  try {
    if (c.pesee.actif) {
      const h = await getHabitudePesee();
      const moment = h.moment && h.moment !== 'inconnu' ? h.moment : 'reveil';
      await saveHabitudePesee({ actif: true, moment, jours: JOURS_PESEE[c.pesee.frequence].map(lundiVersJs).sort((a, b) => a - b) });
    } else {
      await saveHabitudePesee({ actif: false });
    }
    await planifierRappelPesee();
  } catch (e) {
    logger.warn('[Rappels] pesee non appliquee', e);
  }

  try {
    if (c.bilan.actif) await scheduleWeeklyRecap();
    else await cancelWeeklyRecap();
  } catch (e) {
    logger.warn('[Rappels] bilan non applique', e);
  }
}
