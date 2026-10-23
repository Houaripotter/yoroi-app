/**
 * Visite guidee avec l'exemple (18 octobre 2026) : ouvre et ferme la vitrine (lib/v2/visite/vitrine.ts).
 *
 * entrerExemple : lit le schema de ta vraie base (lecture seule), cree une base en memoire avec les memes tables,
 * ouvre la vitrine, puis y ecrit Heny (lib/demoDataService.ts injecterHenyVitrine). Les ecrans se rechargent et
 * montrent Heny. sortirExemple : attend que les calculs en cours soient finis (dans la vitrine), ferme la vitrine,
 * et les ecrans se rechargent sur tes vraies donnees.
 * Entree et sortie passent l'une apres l'autre (jamais en meme temps) : une sortie demandee pendant le chargement
 * attend la fin du chargement, pour qu'aucune ecriture de l'exemple ne tombe dans tes donnees.
 * Pas d'exemple : sur le web, ou si la demo du Studio est deja chargee (les ecrans montrent deja Heny).
 */
import { DeviceEventEmitter, Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import logger from '@/lib/security/logger';
import { openRealDatabase, prepareVitrineDatabase } from '@/lib/database';
import { injecterHenyVitrine } from '@/lib/demoDataService';
import { armureAuRepos } from '@/lib/v2/armure';
import { oublierToriiEnMemoire } from '@/lib/v2/pesee/usePlanPoids';
import { ESPACE_CHANGED_EVENT, getEspace } from '@/lib/v2/espace';
import { recevoirActionsMontre } from '@/lib/v2/montre/synchro';
import { recevoirActionsWidgets } from '@/lib/v2/widgets/synchro';
import { asyncStorageReel, fermerVitrine, ouvrirVitrine, vitrineActive } from './vitrine';

export const EXEMPLE_CHANGE_EVENT = 'YOROI_VISITE_EXEMPLE';
const EVENTS_DONNEES = ['YOROI_DATA_CHANGED', 'YOROI_PARTNERS_CHANGED', 'YOROI_PROFILE_CHANGED', 'YOROI_DEMO_CHANGED'];
const CLE_DEMO_STUDIO = '@yoroi_demo_data_active';

let file: Promise<unknown> = Promise.resolve();
function ensuite<T>(fn: () => Promise<T>): Promise<T> {
  const p = file.then(fn, fn);
  file = p.catch(() => undefined);
  return p;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function prevenirEcrans(): Promise<void> {
  EVENTS_DONNEES.forEach((e) => DeviceEventEmitter.emit(e));
  try {
    DeviceEventEmitter.emit(ESPACE_CHANGED_EVENT, await getEspace());
  } catch {
    // les ecrans relisent aussi en revenant au premier plan
  }
  DeviceEventEmitter.emit(EXEMPLE_CHANGE_EVENT, vitrineActive());
}

/** Les tables de ta vraie base (lecture seule de sqlite_master) */
async function schemaReel(): Promise<string[]> {
  const vraie = await openRealDatabase();
  const rows = await vraie.getAllAsync<{ type: string; name: string; sql: string | null }>(
    "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'demo_bak_%'",
  );
  const ordre: Record<string, number> = { table: 0, index: 1, view: 2, trigger: 3 };
  return rows
    .slice()
    .sort((a, b) => (ordre[a.type] ?? 9) - (ordre[b.type] ?? 9))
    .map((r) => String(r.sql));
}

async function fermerEtOublier(): Promise<void> {
  // les calculs lances pendant la visite finissent dans la vitrine
  try {
    await Promise.race([armureAuRepos(), pause(4000)]);
  } catch {
    // rien en cours
  }
  await pause(150);
  const db = await fermerVitrine();
  try {
    oublierToriiEnMemoire();
  } catch {
    // rien en memoire
  }
  // fermee un peu plus tard : une lecture encore en route finit sans erreur
  if (db) {
    const t = setTimeout(() => void db.closeAsync().catch(() => undefined), 3000) as unknown as { unref?: () => void };
    t?.unref?.();
  }
}

/** Ouvre l'exemple (Heny). Renvoie vrai si les ecrans montrent maintenant l'exemple. */
export function entrerExemple(): Promise<boolean> {
  return ensuite(async () => {
    if (vitrineActive()) return true;
    if (Platform.OS === 'web') return false;
    try {
      // la demo du Studio est deja la (mode createur) : rien a ouvrir
      if ((await asyncStorageReel().getItem(CLE_DEMO_STUDIO)) === 'true') return false;
      const schema = await schemaReel();
      const memoire = await SQLite.openDatabaseAsync(':memory:');
      if (!memoire) return false;
      await ouvrirVitrine(memoire);
      // a partir d'ici, plus rien n'est ecrit dans tes vraies donnees
      await prepareVitrineDatabase(memoire);
      for (const sql of schema) {
        try {
          await memoire.execAsync(sql);
        } catch {
          // deja creee par les migrations
        }
      }
      await injecterHenyVitrine();
      await prevenirEcrans();
      return true;
    } catch (e) {
      logger.warn('[Visite] exemple indisponible, la visite continue sur tes donnees', e);
      if (vitrineActive()) {
        await fermerEtOublier();
        await prevenirEcrans();
      }
      return false;
    }
  });
}

/** Ferme l'exemple : les ecrans reviennent a tes vraies donnees. Sans effet hors exemple. */
export function sortirExemple(): Promise<void> {
  return ensuite(async () => {
    if (!vitrineActive()) return;
    await fermerEtOublier();
    await prevenirEcrans();
    // ce qui attendait (actions de la montre ou des widgets) passe maintenant, sur tes donnees
    recevoirActionsMontre().catch(() => undefined);
    recevoirActionsWidgets().catch(() => undefined);
  });
}
