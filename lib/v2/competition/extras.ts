/**
 * Complements d'une competition, gardes a cote de la base (cle AsyncStorage dediee) :
 * site officiel, ceinture, jour de la pesee, rappels actives et resultat (medaille).
 * La table competitions de la base ne change pas.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const KEY = '@yoroi_competition_extras_v1';

export type Medaille = 'or' | 'argent' | 'bronze' | 'aucune';
export type PeseeMoment = 'veille' | 'jour';

export type CompetitionExtra = {
  url?: string;
  ceinture?: string;
  pesee?: PeseeMoment;
  rappels?: boolean;
  medaille?: Medaille;
  resultatNote?: string;
  resultatLe?: string;
};

export const MEDAILLES: { key: Medaille; label: string; color: string; edge: string }[] = [
  { key: 'or', label: 'Or', color: '#E3C47B', edge: '#C59D45' },
  { key: 'argent', label: 'Argent', color: '#D9DBE0', edge: '#A9ADB7' },
  { key: 'bronze', label: 'Bronze', color: '#D9A877', edge: '#A8743F' },
  { key: 'aucune', label: 'Pas de podium', color: '#EFECE5', edge: '#D5D2CA' },
];

export function medailleLabel(m?: Medaille): string {
  return MEDAILLES.find((x) => x.key === m)?.label ?? '';
}

type Store = Record<string, CompetitionExtra>;

export async function getAllExtras(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === 'object' ? (v as Store) : {};
  } catch (e) {
    logger.warn('Lecture des complements de competition impossible', e);
    return {};
  }
}

export async function getExtra(id: number): Promise<CompetitionExtra> {
  return (await getAllExtras())[String(id)] ?? {};
}

export async function setExtra(id: number, patch: Partial<CompetitionExtra>): Promise<CompetitionExtra> {
  const all = await getAllExtras();
  const next: CompetitionExtra = { ...(all[String(id)] ?? {}), ...patch };
  (Object.keys(next) as (keyof CompetitionExtra)[]).forEach((k) => {
    if (next[k] === undefined || next[k] === '') delete next[k];
  });
  all[String(id)] = next;
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return next;
}

export async function removeExtra(id: number): Promise<void> {
  const all = await getAllExtras();
  delete all[String(id)];
  await AsyncStorage.setItem(KEY, JSON.stringify(all)).catch(() => {});
}

/** Adresse web propre : ajoute https:// si besoin, refuse ce qui n'est pas un site */
export function cleanUrl(s: string | undefined): string | undefined {
  const t = (s ?? '').trim();
  if (!t) return undefined;
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(withProto) ? withProto : undefined;
}
