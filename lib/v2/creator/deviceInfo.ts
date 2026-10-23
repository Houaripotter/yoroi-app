/**
 * Infos de l'appareil et de l'app pour le Studio (en-tete et diagnostic a copier).
 * Rien n'est envoye : tout reste sur le telephone, sauf ce que Houari copie lui-meme.
 */
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { traduire } from '@/lib/i18n/tr';

export type AppInfo = { version: string; build: string; model: string; os: string; env: string; sdk: string };

export function getAppInfo(): AppInfo {
  const cfg = Constants.expoConfig;
  const build = Platform.OS === 'ios' ? cfg?.ios?.buildNumber : cfg?.android?.versionCode != null ? String(cfg.android.versionCode) : undefined;
  const env =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? 'Expo Go'
      : Constants.executionEnvironment === ExecutionEnvironment.Standalone
        ? traduire('App installée')
        : traduire('Build de développement');
  return {
    version: cfg?.version ?? 'inconnue',
    build: build ?? 'inconnu',
    model: Device.modelName ?? (Device.isDevice ? traduire('Téléphone') : traduire('Simulateur')),
    os: `${Device.osName ?? Platform.OS} ${Device.osVersion ?? ''}`.trim(),
    env,
    sdk: cfg?.sdkVersion ?? 'inconnu',
  };
}

export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return traduire("{0}/{1}/{2} à {3} h {4}", p(d.getDate()), p(d.getMonth() + 1), d.getFullYear(), d.getHours(), p(d.getMinutes()));
}

export function formatDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Texte a copier (pour un rapport de bug) */
export function appInfoText(extra: Record<string, string> = {}): string {
  const i = getAppInfo();
  const lines: [string, string][] = [
    ['YOROI', `${i.version} (build ${i.build})`],
    ['Appareil', i.model],
    [traduire('Système'), i.os],
    [traduire('Environnement'), i.env],
    [traduire('Expo SDK'), i.sdk],
    [traduire('Appareil réel'), Device.isDevice ? 'oui' : 'non'],
    ...Object.entries(extra),
  ];
  return lines.map(([k, v]) => `${k} : ${v}`).join('\n');
}
