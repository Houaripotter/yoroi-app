/**
 * Horloge de developpement du Studio : decale l'heure vue par les series et les changements
 * de jour (todayIso de l'armure, accueil, semaine des seances), de moins 3 heures a plus 7 jours.
 * En memoire seulement (disparait a la fermeture de l'app) et actif seulement en mode createur.
 * Le reste de l'app garde l'heure reelle.
 */
import { DeviceEventEmitter } from 'react-native';

export const DEV_CLOCK_CHANGED = 'YOROI_DEV_CLOCK_CHANGED';
export const DEV_CLOCK_MIN_MS = -3 * 3600 * 1000;
export const DEV_CLOCK_MAX_MS = 7 * 86400 * 1000;

let offsetMs = 0;
let enabled = false;

/** L'heure vue par les ecrans branches : l'heure reelle, plus le decalage du Studio s'il est actif. */
export function devNow(): Date {
  return new Date(Date.now() + (enabled ? offsetMs : 0));
}

export function devNowMs(): number {
  return Date.now() + (enabled ? offsetMs : 0);
}

export function getDevClockOffset(): number {
  return enabled ? offsetMs : 0;
}

export function isDevClockShifted(): boolean {
  return enabled && offsetMs !== 0;
}

export function setDevClockOffset(ms: number): void {
  if (!enabled) return;
  const next = Math.max(DEV_CLOCK_MIN_MS, Math.min(DEV_CLOCK_MAX_MS, Math.round(ms)));
  if (next === offsetMs) return;
  offsetMs = next;
  DeviceEventEmitter.emit(DEV_CLOCK_CHANGED, offsetMs);
}

/** Appele par le mode createur : coupe, l'horloge revient a l'heure reelle. */
export function setDevClockEnabled(on: boolean): void {
  const wasShifted = enabled && offsetMs !== 0;
  enabled = on;
  if (!on) offsetMs = 0;
  if (wasShifted && !on) DeviceEventEmitter.emit(DEV_CLOCK_CHANGED, 0);
}
