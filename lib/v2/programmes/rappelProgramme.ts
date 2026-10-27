/**
 * Le rappel de ton programme construit (27 octobre 2026, « Je construis le mien ») : le même réglage que la carte
 * « Rappel de séance » (components/yoroi/v2/programmes/RappelSeance.tsx), un seul pour toute l'app (les rappels de
 * séance de lib/notificationService.ts). Les jours du rappel sont tes jours de séance, l'heure est la tienne.
 * La permission n'est demandée que si tu allumes le rappel. Testé dans __tests__/unit/monProgramme.test.ts.
 */
import { notificationService } from '@/lib/notificationService';
import { permissionPourRappels, rappelsAutorises } from '@/lib/v2/notifications/rappels';
import { heureRappelValide, joursDuRappel } from './rappel';
import type { RappelPerso } from './monProgramme';

/** Le rappel tel qu'il est réglé aujourd'hui (allumé seulement si le téléphone l'autorise) */
export async function lireRappelSeance(): Promise<RappelPerso> {
  try {
    const [s, ok] = await Promise.all([notificationService.loadSettings(), rappelsAutorises()]);
    const heure = heureRappelValide(s.training?.time) ? s.training.time : '18:00';
    return { actif: ok && s.enabled !== false && !!s.training?.enabled, heure };
  } catch {
    return { actif: false, heure: '18:00' };
  }
}

/** Applique ton choix : 'ok', ou 'refuse' si le téléphone n'autorise pas les notifications (le rappel reste éteint) */
export async function appliquerRappelProgramme(r: RappelPerso, joursLundi: number[]): Promise<'ok' | 'refuse'> {
  if (r.actif) {
    const p = await permissionPourRappels('seance');
    if (p !== 'ok') return 'refuse';
  }
  try {
    const s = await notificationService.loadSettings();
    await notificationService.updateSettings({
      ...(r.actif ? { enabled: true } : {}),
      training: { ...s.training, enabled: r.actif, time: heureRappelValide(r.heure) ? r.heure : '18:00', days: joursDuRappel(joursLundi) },
    });
    if (r.actif) await notificationService.replanifierSeances();
  } catch {
    // rien de cassé : le réglage reste celui d'avant
  }
  return 'ok';
}
