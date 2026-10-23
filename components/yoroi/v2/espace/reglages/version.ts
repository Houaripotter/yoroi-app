/**
 * Version de l'app lue dynamiquement : d'abord expo-constants (app.json embarque),
 * sinon app.json directement. Jamais de numero ecrit en dur.
 */
import Constants from 'expo-constants';

export function appVersion(): string {
  const anyC = Constants as unknown as { manifest?: { version?: string }; manifest2?: { extra?: { expoClient?: { version?: string } } } };
  const v = Constants.expoConfig?.version ?? anyC.manifest2?.extra?.expoClient?.version ?? anyC.manifest?.version;
  if (v) return v;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const json = require('../../../../../app.json') as { expo?: { version?: string } };
    return json.expo?.version ?? '';
  } catch {
    return '';
  }
}

export const APP_VERSION = appVersion();
