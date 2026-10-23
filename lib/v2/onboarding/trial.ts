/**
 * Essai gratuit d'une offre du store : lu uniquement dans ce que RevenueCat renvoie,
 * jamais suppose. Rappel local deux jours avant la fin, seulement avec l'accord de l'utilisateur.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { format } from 'date-fns';
import { DATE_FNS_LOCALE as fr } from '@/lib/i18n/dateLocale';
import { logger } from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

export type FreeTrial = { days: number; end: Date };

type Period = { unit?: string; count?: number };

const TRIAL_REMINDER_KEY = '@yoroi_trial_reminder';

function addPeriod(from: Date, p: Period): Date | null {
  const n = Math.max(1, Math.round(Number(p.count) || 0));
  const unit = String(p.unit ?? '').toUpperCase();
  const d = new Date(from.getTime());
  if (unit.startsWith('DAY')) d.setDate(d.getDate() + n);
  else if (unit.startsWith('WEEK')) d.setDate(d.getDate() + 7 * n);
  else if (unit.startsWith('MONTH')) d.setMonth(d.getMonth() + n);
  else if (unit.startsWith('YEAR')) d.setFullYear(d.getFullYear() + n);
  else return null;
  return d;
}

/** Duree ISO 8601 du type P1W, P7D, P1M */
function parseIso(iso: unknown): Period | null {
  const m = typeof iso === 'string' ? /^P(\d+)([DWMY])$/.exec(iso) : null;
  if (!m) return null;
  const map: Record<string, string> = { D: 'DAY', W: 'WEEK', M: 'MONTH', Y: 'YEAR' };
  return { unit: map[m[2]], count: Number(m[1]) };
}

/** Essai gratuit propose par le store pour ce paquet RevenueCat, sinon null */
export function freeTrialOf(raw: unknown): FreeTrial | null {
  const product = (raw as { product?: Record<string, any> } | null)?.product;
  if (!product) return null;
  let period: Period | null = null;
  const intro = product.introPrice as { price?: number; periodUnit?: string; periodNumberOfUnits?: number; cycles?: number; period?: string } | null | undefined;
  if (intro && Number(intro.price) === 0) {
    const cycles = Math.max(1, Math.round(Number(intro.cycles) || 1));
    period = intro.periodUnit ? { unit: intro.periodUnit, count: (Number(intro.periodNumberOfUnits) || 1) * cycles } : parseIso(intro.period);
  }
  // Google Play : phase gratuite de l'option par defaut
  const free = product.defaultOption?.freePhase as { billingPeriod?: { unit?: string; value?: number; iso8601?: string } } | null | undefined;
  if (!period && free?.billingPeriod) {
    period = free.billingPeriod.unit ? { unit: free.billingPeriod.unit, count: free.billingPeriod.value } : parseIso(free.billingPeriod.iso8601);
  }
  if (!period) return null;
  const now = new Date();
  const end = addPeriod(now, period);
  if (!end) return null;
  return { days: Math.round((end.getTime() - now.getTime()) / 86400000), end };
}

export const longDate = (d: Date) => format(d, 'd MMMM yyyy', { locale: fr });

export const storeName = () => (Platform.OS === 'ios' ? 'App Store' : 'Google Play');

/**
 * Demande l'autorisation des notifications (au lancement de l'essai seulement) et programme
 * un rappel deux jours avant la fin. Renvoie vrai si le rappel est programme.
 */
export async function scheduleTrialReminder(end: Date): Promise<boolean> {
  try {
    // Demande liee a l'essai (rappel avant debit) : jamais redemandee apres un refus du systeme
    const { demanderPermissionSysteme } = await import('@/lib/v2/notifications/permission');
    if (!(await demanderPermissionSysteme('essai'))) return false;
    const at = new Date(end.getTime() - 2 * 86400000);
    if (at.getTime() < Date.now() + 3600000) return false;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: traduire('Ton essai Premium se termine bientôt'),
        body: traduire("Il prend fin le {0}. Pour ne pas être débité, annule-le avant dans les réglages de ton compte {1}.", longDate(end), storeName()),
        data: { type: 'trial_reminder' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
    await AsyncStorage.setItem(TRIAL_REMINDER_KEY, JSON.stringify({ id, at: at.toISOString(), end: end.toISOString() })).catch(() => {});
    return true;
  } catch (e) {
    logger.warn('[Onboarding] rappel de fin d’essai impossible', e);
    return false;
  }
}
