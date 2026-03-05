/**
 * Format minutes into a clean "Xh", "XhMM", or "Xmin" string.
 * Examples:
 *   0     -> "0min"
 *   45    -> "45min"
 *   60    -> "1h"
 *   61    -> "1h01"
 *   90    -> "1h30"
 *   125.7 -> "2h06"
 */
export function formatDurationHM(minutes: number): string {
  if (!minutes || minutes <= 0) return '0min';
  const totalMin = Math.round(minutes);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

/**
 * Format hours (decimal) into a clean "Xh", "XhMM" string.
 * Examples:
 *   0     -> "0h"
 *   1.5   -> "1h30"
 *   2.0   -> "2h"
 *   7.25  -> "7h15"
 */
export function formatHoursHM(hours: number): string {
  if (!hours || hours <= 0) return '0h';
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}
