/**
 * Vague 47 : rappel du coffre du jour, une seule notification douce vers 19 h.
 * Prudence (comme le rappel de pesee, lib/v2/pesee/rappelHabitude.ts) :
 *  - jamais de demande d'autorisation ici : rien n'est programme si les notifications ne sont pas deja autorisees ;
 *  - une seule notification a la fois, la sienne (data.type 'coffre_du_jour'), les autres ne sont jamais touchees ;
 *  - jamais de culpabilite : on parle de la recompense qui attend, pas de ce qui serait perdu ;
 *  - rien aujourd'hui si le coffre est deja ouvert : le prochain rappel est pour demain ;
 *  - un interrupteur dans le Dojo le coupe (cle @yoroi_rappel_coffre_v1 = 'off').
 * Reprogramme a chaque calcul du Dojo (ARMURE_CHANGED_EVENT) et a l'ouverture du Dojo.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { logger } from '@/lib/security/logger';
import type { ArmureState } from '@/lib/v2/armure';
import { vitrineActive } from '@/lib/v2/visite/vitrine';

const KEY = '@yoroi_rappel_coffre_v1';
export const RAPPEL_COFFRE_TYPE = 'coffre_du_jour';
const HEURE = 19;

export async function rappelCoffreActif(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) !== 'off';
  } catch {
    return true;
  }
}

export async function setRappelCoffre(actif: boolean, state?: ArmureState | null): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, actif ? 'on' : 'off');
  } catch {
    // sans importance
  }
  if (actif && state) await programmerRappelCoffre(state);
  else await annuler();
}

async function annuler(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => (n.content?.data as Record<string, unknown> | undefined)?.type === RAPPEL_COFFRE_TYPE)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => undefined)),
    );
  } catch (e) {
    logger.warn('[RappelCoffre] annulation impossible', e);
  }
}

/** Texte du rappel selon ta journee : jamais culpabilisant */
export function texteRappel(state: Pick<ArmureState, 'serie' | 'coffre'> | null, pourDemain: boolean): { title: string; body: string } {
  const serie = state?.serie?.jours ?? 0;
  if (!pourDemain && state?.coffre?.etat === 'pret') {
    return { title: 'Ton coffre est prêt', body: 'Ta récompense du jour t’attend dans le Dojo.' };
  }
  if (!pourDemain && state?.coffre?.grandDans === 0) {
    return { title: 'C’est le jour du grand coffre', body: 'Un geste aujourd’hui et il s’ouvre : une séance, une pesée ou un verre d’eau.' };
  }
  if (!pourDemain && serie > 0) {
    return { title: `${serie} jour${serie > 1 ? 's' : ''} d’affilée, et demain ?`, body: 'Un verre d’eau noté suffit pour ouvrir ton coffre du jour.' };
  }
  return { title: 'Ton coffre du jour t’attend', body: 'Une séance, une pesée ou un verre d’eau, et il s’ouvre.' };
}

/** Programme le prochain rappel (aujourd'hui 19 h si le coffre n'est pas ouvert, sinon demain 19 h). */
export async function programmerRappelCoffre(state: ArmureState | null): Promise<void> {
  if (Platform.OS === 'web' || !state?.coffre) return;
  // 18 octobre 2026 : pas pendant la visite guidee avec l'exemple (le coffre de l'exemple n'est pas le tien)
  if (vitrineActive()) return;
  try {
    await annuler();
    if (!(await rappelCoffreActif())) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const now = new Date();
    const aujourdhui = new Date(now.getFullYear(), now.getMonth(), now.getDate(), HEURE, 0, 0);
    const pourDemain = state.coffre.etat === 'ouvert' || now >= aujourdhui;
    const date = pourDemain ? new Date(aujourdhui.getTime() + 24 * 3600 * 1000) : aujourdhui;
    const t = texteRappel(state, pourDemain);
    await Notifications.scheduleNotificationAsync({
      content: { title: t.title, body: t.body, data: { type: RAPPEL_COFFRE_TYPE, screen: 'dojo' }, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  } catch (e) {
    logger.warn('[RappelCoffre] programmation impossible', e);
  }
}
