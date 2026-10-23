/**
 * Etat concret affiche en tete de "Ton espace" : derniere sauvegarde, sante reliee,
 * rappels actifs, volume de donnees. Tout est lu en lecture seule, sans rien modifier.
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { getTrainings, getWeights } from '@/lib/database';
import { getPhotosFromStorage } from '@/lib/storage';
import { getCitationNotifSettings } from '@/lib/citations';
import { getSanteSource } from '@/lib/v2/sante/data';
import type { SanteSource } from '@/lib/v2/sante/data';
import { logger } from '@/lib/security/logger';
import { getLastOffPhoneBackupDate } from '@/lib/v2/sauvegarde/rappel';
import { traduire, DECIMAL, LOCALE } from '@/lib/i18n/tr';

export type EspaceStatus = {
  /** undefined : en cours de lecture ; null : jamais sauvegarde */
  lastBackup: Date | null | undefined;
  sante: SanteSource | null;
  reminders: string[] | null;
  counts: { weights: number; trainings: number; photos: number } | null;
  storage: string | null;
};

const REMINDER_LABELS: [string, string][] = [
  ['weighing', traduire('pesée')],
  ['training', traduire('entraînement')],
  ['streak', traduire('série')],
  ['briefing', 'briefing'],
  ['sleep', 'coucher'],
  ['hydration', 'eau'],
];

/**
 * Derniere copie HORS du telephone (partage vers ton cloud, ou dossier cloud relie).
 * Les sauvegardes automatiques restent sur le telephone : elles ne comptent pas ici.
 */
async function readLastBackup(): Promise<Date | null> {
  return getLastOffPhoneBackupDate();
}

async function readReminders(): Promise<string[]> {
  const on: string[] = [];
  try {
    const raw = await AsyncStorage.getItem('@yoroi_notification_settings');
    const s = raw ? JSON.parse(raw) : null;
    if (s && typeof s === 'object' && s.enabled !== false) {
      for (const [key, label] of REMINDER_LABELS) {
        if (s[key]?.enabled) on.push(label);
      }
    }
  } catch {
    // reglages illisibles
  }
  try {
    const cit = await getCitationNotifSettings();
    if (cit?.enabled) on.push('citation');
  } catch {
    // ignore
  }
  return on;
}

async function readStorage(): Promise<string | null> {
  try {
    const dir = FileSystem.documentDirectory;
    if (!dir) return null;
    const files = await FileSystem.readDirectoryAsync(dir);
    let total = 0;
    for (const f of files) {
      try {
        const info = (await FileSystem.getInfoAsync(`${dir}${f}`)) as { exists?: boolean; size?: number };
        if (info.exists && info.size) total += info.size;
      } catch {
        // ignore
      }
    }
    const mb = total / (1024 * 1024);
    return mb < 1 ? `${Math.max(1, Math.round(total / 1024))} Ko` : `${mb.toFixed(1).replace('.', DECIMAL)} Mo`;
  } catch {
    return null;
  }
}

export function useEspaceStatus() {
  const [status, setStatus] = useState<EspaceStatus>({ lastBackup: undefined, sante: null, reminders: null, counts: null, storage: null });

  const reload = useCallback(async () => {
    const [lastBackup, reminders, storage] = await Promise.all([readLastBackup(), readReminders(), readStorage()]);
    setStatus((s) => ({ ...s, lastBackup, reminders, storage }));
    try {
      const [w, t, p] = await Promise.all([
        getWeights().catch(() => []),
        getTrainings().catch(() => []),
        getPhotosFromStorage().catch(() => []),
      ]);
      setStatus((s) => ({ ...s, counts: { weights: w.length, trainings: t.length, photos: p.length } }));
    } catch (e) {
      logger.warn('[Espace] comptage des données', e);
    }
    try {
      const sante = await getSanteSource();
      setStatus((s) => ({ ...s, sante }));
    } catch {
      // statut indisponible
    }
  }, []);

  useEffect(() => {
    reload();
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', () => { reload(); });
    return () => sub.remove();
  }, [reload]);

  return { status, reload };
}

const MOIS = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];

function hour(d: Date): string {
  const m = d.getMinutes();
  return m === 0 ? `${d.getHours()} h` : `${d.getHours()} h ${String(m).padStart(2, '0')}`;
}

/** "aujourd'hui à 14 h 05", "hier à 9 h", "le 3 oct." */
export function backupWhen(d: Date): string {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start - day) / 86400000);
  if (diff <= 0) return traduire("aujourd’hui à {0}", hour(d));
  if (diff === 1) return traduire("hier à {0}", hour(d));
  const y = d.getFullYear() !== today.getFullYear() ? ` ${d.getFullYear()}` : '';
  return traduire("le {0} {1}{2}", d.getDate(), MOIS[d.getMonth()], y);
}

export function backupAgeDays(d: Date | null | undefined): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString(LOCALE).replace(/ | /g, ' ')} ${n > 1 ? many : one}`;
}
