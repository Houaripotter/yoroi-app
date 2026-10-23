/**
 * Notifications et changement de langue (23 octobre 2026). Les rappels programmés gardent le texte du jour
 * où ils ont été programmés. La plupart sont refaits à chaque lancement ; ceux qui ne le sont pas
 * (récap du dimanche, rappels de compétition, conseils du soir) sont refaits ici quand la langue a changé.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANG } from './tr';

const CLE = 'yoroi_langue_notifs';

export async function replanifierSiLangueChangee(): Promise<void> {
  try {
    const avant = await AsyncStorage.getItem(CLE);
    if (avant === LANG) return;
    await AsyncStorage.setItem(CLE, LANG);
    if (avant === null) return;
  } catch {
    return;
  }
  try {
    const w = await import('@/lib/weeklyRecapNotification');
    if (await w.isWeeklyRecapEnabled()) await w.scheduleWeeklyRecap();
  } catch { /* rien */ }
  try {
    const c = await import('@/lib/v2/competition/reminders');
    await c.syncCompetitionReminders();
  } catch { /* rien */ }
  try {
    const t = await import('@/lib/eveningHealthTipsService');
    await t.scheduleHealthTipNotifications();
  } catch { /* rien */ }
}
