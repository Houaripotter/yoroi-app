// ============================================
// UTILS - FORMATAGE DE DATES
// Fonctions partagées pour éviter la duplication entre composants.
// ============================================

/**
 * Retourne une chaîne relative du type "il y a 2h", "hier", "il y a 3 jours".
 */
import { traduire } from '@/lib/i18n/tr';
export function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return traduire("à l'instant");
  if (m < 60) return traduire("il y a {0} min", m);
  const h = Math.floor(m / 60);
  if (h < 24) return traduire("il y a {0}h", h);
  const days = Math.floor(h / 24);
  if (days === 1) return 'hier';
  if (days < 7) return traduire("il y a {0} jours", days);
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return traduire('il y a 1 semaine');
  if (weeks < 5) return traduire("il y a {0} semaines", weeks);
  const months = Math.floor(days / 30);
  if (months === 1) return traduire('il y a 1 mois');
  return traduire("il y a {0} mois", months);
}

/**
 * Formate une taille en bytes en chaîne lisible (KB/MB).
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
