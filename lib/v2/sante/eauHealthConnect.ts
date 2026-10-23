/**
 * Eau vers Health Connect (Android), un verre une seule fois.
 * - ajout : un enregistrement Hydration avec metadata.clientRecordId = « yoroi-eau-<id> ». Health Connect remplace
 *   un enregistrement de même clientRecordId au lieu d'en créer un second : un verre de widget reçu deux fois reste un verre.
 *   Sans id (écrans de l'app), un id est créé ici ;
 * - retrait : supprime par clientRecordId les verres écrits par YOROI ce jour-là, les plus récents d'abord ;
 *   si on supprime plus que demandé, la différence est réécrite. Rien d'écrit par YOROI ce jour-là : false (eauSante.ts garde une note).
 * Le journal local des verres écrits (JOURNAL_EAU_HC_KEY) garde 7 jours.
 * Droit WRITE_HYDRATION : app.json, AndroidManifest.xml et ANDROID_ECRITURE (typesSante.ts).
 * Testé dans __tests__/unit/eauHealthConnect.test.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';

export const JOURNAL_EAU_HC_KEY = '@yoroi_eau_health_connect';
export const PREFIXE_EAU_HC = 'yoroi-eau-';
export type VerreHC = { cid: string; ml: number; at: string; jour: string };

type ModuleHC = {
  initialize?: () => Promise<boolean>;
  insertRecords: (records: unknown[]) => Promise<string[]>;
  deleteRecordsByUuids: (recordType: string, ids: string[], clientIds: string[]) => Promise<void>;
};

function moduleHC(): ModuleHC | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('react-native-health-connect');
    return m && typeof m.insertRecords === 'function' ? (m as ModuleHC) : null;
  } catch {
    return null;
  }
}

async function pret(): Promise<ModuleHC | null> {
  const HC = moduleHC();
  if (!HC) return null;
  try {
    if (typeof HC.initialize === 'function') await HC.initialize();
  } catch {
    // déjà initialisé ou Health Connect absent : l'écriture dira la suite
  }
  return HC;
}

const jourLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function lireJournalEauHC(): Promise<VerreHC[]> {
  try {
    const brut = await AsyncStorage.getItem(JOURNAL_EAU_HC_KEY);
    const l = brut ? JSON.parse(brut) : [];
    return Array.isArray(l) ? l.filter((v) => v && typeof v.cid === 'string' && Number(v.ml) > 0) : [];
  } catch {
    return [];
  }
}

async function ecrireJournal(l: VerreHC[]): Promise<void> {
  const limite = jourLocal(new Date(Date.now() - 7 * 86_400_000));
  try {
    await AsyncStorage.setItem(JOURNAL_EAU_HC_KEY, JSON.stringify(l.filter((v) => v.jour >= limite).slice(-200)));
  } catch {
    // non bloquant
  }
}

let compteur = 0;
const nouvelId = (d: Date) => `app-${d.getTime()}-${Date.now().toString(36)}-${(compteur++).toString(36)}`;

/** Écrit un verre (ml > 0). true : écrit (ou déjà écrit avec cet id) ; false : refusé ; null : module absent. */
export async function ecrireVerreHC(ml: number, id: string | undefined, date: Date): Promise<boolean | null> {
  const HC = await pret();
  if (!HC) return null;
  const cid = PREFIXE_EAU_HC + (id ?? nouvelId(date));
  const journal = await lireJournalEauHC();
  if (id && journal.some((v) => v.cid === cid)) return true;
  try {
    await HC.insertRecords([
      {
        recordType: 'Hydration',
        startTime: date.toISOString(),
        // Health Connect veut une fin après le début
        endTime: new Date(date.getTime() + 60_000).toISOString(),
        volume: { value: ml / 1000, unit: 'liters' },
        metadata: { clientRecordId: cid, clientRecordVersion: 1 },
      },
    ]);
  } catch (e) {
    logger.warn('[Eau] Health Connect refuse le verre', e);
    return false;
  }
  await ecrireJournal([...journal, { cid, ml, at: date.toISOString(), jour: jourLocal(date) }]);
  return true;
}

/** Retire ml (> 0) des verres écrits par YOROI le jour de date. true : retiré ; false : impossible ; null : module absent. */
export async function retirerVerreHC(ml: number, date: Date): Promise<boolean | null> {
  const HC = await pret();
  if (!HC) return null;
  const jour = jourLocal(date);
  const journal = await lireJournalEauHC();
  const pris: VerreHC[] = [];
  let somme = 0;
  for (let i = journal.length - 1; i >= 0 && somme < ml; i--) {
    if (journal[i].jour !== jour) continue;
    pris.push(journal[i]);
    somme += journal[i].ml;
  }
  if (pris.length === 0 || somme < ml) return false;
  try {
    await HC.deleteRecordsByUuids('Hydration', [], pris.map((v) => v.cid));
  } catch (e) {
    logger.warn('[Eau] Health Connect refuse le retrait', e);
    return false;
  }
  const retires = new Set(pris.map((v) => v.cid));
  await ecrireJournal(journal.filter((v) => !retires.has(v.cid)));
  const reste = somme - ml;
  if (reste > 0) {
    const dernier = pris[pris.length - 1];
    await ecrireVerreHC(reste, undefined, new Date(dernier.at));
  }
  return true;
}
