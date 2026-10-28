/**
 * Taille du stockage de l'app (28 octobre 2026, audit « ne jamais perdre de donnees »).
 *
 * Sur Android, AsyncStorage est une base limitee (6 Mo par defaut, 50 Mo depuis android/gradle.properties
 * AsyncStorage_db_size_in_MB=50, a partir du prochain build) et une seule valeur de plus de 2 Mo ne se relit
 * plus (« Row too big to fit into CursorWindow »). Au dela, les nouvelles donnees ne s'enregistrent plus.
 * Ici : une mesure une fois par lancement, un avertissement dans le journal et dans la mesure (Sentry,
 * Firebase) quand on approche. Aucune valeur ni nom de cle ne part : seulement le niveau et la cause.
 * evaluerTaille est pur et teste (__tests__/unit/securiteDonnees2.test.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from '@/lib/security/logger';
import { track } from '@/utils/telemetry';

/** Limite prise en compte : celle des builds d'avant le reglage (6 Mo), la plus prudente */
export const LIMITE_TOTAL_OCTETS = 6 * 1024 * 1024;
/** Au dela, une valeur ne se relit plus sur Android */
export const LIMITE_CLE_OCTETS = 2 * 1024 * 1024;
export const SEUIL_PROCHE = 0.7;
export const SEUIL_CRITIQUE = 0.9;

export type EtatTaille = {
  total: number;
  /** cles les plus lourdes (nom et taille), pour le journal local seulement */
  lourdes: Array<{ cle: string; octets: number }>;
  niveau: 'ok' | 'proche' | 'critique';
  cause: 'total' | 'cle' | null;
};

/** Taille approchee d'un texte stocke (SQLite range le texte en UTF-8) */
export const octets = (s: string | null | undefined): number => {
  if (!s) return 0;
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c >= 0xd800 && c <= 0xdbff ? (i++, 4) : 3;
  }
  return n;
};

export function evaluerTaille(paires: Array<[string, string | null]>, limiteTotal = LIMITE_TOTAL_OCTETS, limiteCle = LIMITE_CLE_OCTETS): EtatTaille {
  const tailles = paires.map(([k, v]) => ({ cle: k, octets: octets(k) + octets(v) }));
  const total = tailles.reduce((a, t) => a + t.octets, 0);
  const lourdes = [...tailles].sort((a, b) => b.octets - a.octets).slice(0, 5);
  const plusGrosse = lourdes[0]?.octets ?? 0;
  const rTotal = total / limiteTotal;
  const rCle = plusGrosse / limiteCle;
  const r = Math.max(rTotal, rCle);
  const niveau = r >= SEUIL_CRITIQUE ? 'critique' : r >= SEUIL_PROCHE ? 'proche' : 'ok';
  return { total, lourdes, niveau, cause: niveau === 'ok' ? null : rCle > rTotal ? 'cle' : 'total' };
}

let dejaFait = false;

/** Une fois par lancement, jamais bloquant. Une cle illisible (trop grosse) compte comme critique. */
export async function verifierTailleStockage(force = false): Promise<EtatTaille | null> {
  if (Platform.OS === 'web' || (dejaFait && !force)) return null;
  dejaFait = true;
  try {
    const cles = [...((await AsyncStorage.getAllKeys()) ?? [])];
    const paires: Array<[string, string | null]> = [];
    let illisible = false;
    for (let i = 0; i < cles.length; i += 50) {
      const part = cles.slice(i, i + 50);
      try {
        for (const [k, v] of (await AsyncStorage.multiGet(part)) ?? []) paires.push([k, v]);
      } catch {
        for (const k of part) {
          try { paires.push([k, await AsyncStorage.getItem(k)]); } catch { illisible = true; logger.warn(`[Stockage] cle illisible (trop grosse ?) : ${k}`); }
        }
      }
    }
    let etat = evaluerTaille(paires);
    if (illisible) etat = { ...etat, niveau: 'critique', cause: 'cle' };
    if (etat.niveau !== 'ok') {
      logger.warn(`[Stockage] ${etat.niveau} : ${Math.round(etat.total / 1024)} Ko, plus lourdes : ${etat.lourdes.map((l) => `${l.cle} ${Math.round(l.octets / 1024)} Ko`).join(', ')}`);
      track('stockage_presque_plein', { niveau: etat.niveau, cause: etat.cause ?? 'total' });
    }
    return etat;
  } catch (e) {
    logger.warn('[Stockage] mesure de la taille impossible', e);
    return null;
  }
}
