/**
 * NUIT 14 : la ligne d'historique d'une pesee (ecran du poids).
 * Le grand chiffre est le poids mesure de la pesee montree ce jour-la (le poids du jour, comme la courbe :
 * lib/v2/pesee/poidsDuJour.ts).
 * La legende dit d'ou elle vient (la source de CETTE pesee, plus celle d'une autre du meme jour),
 * puis la tendance en petit, puis les autres pesees du meme jour avec leur poids : rien n'est cache.
 */
import type { Weight } from '@/lib/database';
import { peseesDuJourOrdonnees } from './poidsDuJour';
import { formatKg } from '@/lib/v2/weightStats';
import { traduire } from '@/lib/i18n/tr';

export const WEIGHT_SOURCES: Record<string, string> = {
  manual: traduire('saisie à la main'),
  withings: traduire('balance Withings'),
  garmin: 'Garmin',
  apple_health: 'Apple Santé',
  healthkit: 'Apple Santé',
  health_connect: 'Health Connect',
  xiaomi: traduire('balance Xiaomi'),
  balance_photo: 'balance (photo)',
  yoroi_montre: 'Apple Watch',
};

export const sourceLabel = (s?: string | null): string => WEIGHT_SOURCES[s ?? 'manual'] ?? traduire('importée');

/**
 * Les pesees d'un jour, le poids du jour d'abord (celui que montrent la courbe et l'accueil, regle de
 * lib/v2/pesee/poidsDuJour.ts), puis les autres de la plus recente a la plus ancienne
 */
export function weighInsOfDay(raw: Weight[], day: string): Weight[] {
  return peseesDuJourOrdonnees(raw, day);
}

/** « balance (photo), tendance 91,3 kg, autre pesée ce jour-là : 91,8 kg (saisie à la main) » */
export function historyCaption(p: { id?: number; date: string; trend: number }, raw: Weight[]): string {
  const day = weighInsOfDay(raw, p.date);
  const shown = day.find((w) => w.id === p.id) ?? day[0];
  const parts = [shown ? sourceLabel(shown.source) : '', `tendance ${formatKg(p.trend)} kg`].filter(Boolean);
  const others = day.filter((w) => w !== shown);
  if (others.length === 1) parts.push(traduire("autre pesée ce jour : {0} kg ({1})", formatKg(Number(others[0].weight)), sourceLabel(others[0].source)));
  else if (others.length > 1) parts.push(traduire("{0} autres pesées ce jour : {1}", others.length, others.map((w) => `${formatKg(Number(w.weight))} kg`).join(', ')));
  return parts.join(', ');
}
