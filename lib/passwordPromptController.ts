// ============================================
// GLOBAL PASSWORD PROMPT CONTROLLER
// Permet de demander un mot de passe depuis n'importe quelle fonction async
// (pas seulement depuis un composant React). Passe par la fenetre maison YOROI (appPassword).
//
// Usage :
//   import { requestPassword } from '@/lib/passwordPromptController';
//   const pwd = await requestPassword({ title: '...', message: '...' });
//   if (pwd === null) return; // annulé
//
// Le host component <GlobalPasswordPromptMount /> doit être monté une fois
// dans _layout.tsx pour écouter les requests et afficher le modal.
// ============================================

import { DeviceEventEmitter } from 'react-native';
import { appPassword } from '@/components/yoroi/v2/fenetre/api';

export interface PasswordPromptRequest {
  id: string;
  title: string;
  message?: string;
  confirmLabel?: string;
  minLength?: number;
}

const REQUEST_EVENT = 'YOROI_PWD_PROMPT_REQUEST';
const RESPONSE_EVENT = 'YOROI_PWD_PROMPT_RESPONSE';

/**
 * Demande un mot de passe en affichant un modal global.
 * Résout avec le mot de passe saisi, ou null si annulé.
 */
export function requestPassword(opts: {
  title: string;
  message?: string;
  confirmLabel?: string;
  minLength?: number;
}): Promise<string | null> {
  // Fenetre maison YOROI (saisie masquee), au-dessus de tout
  return appPassword(opts);
}

/**
 * (Interne) À utiliser uniquement par le host component pour écouter les requests.
 */
export function subscribeToPasswordRequests(handler: (req: PasswordPromptRequest) => void): () => void {
  const sub = DeviceEventEmitter.addListener(REQUEST_EVENT, handler);
  return () => sub.remove();
}

/**
 * (Interne) Le host component appelle ça pour répondre à une request.
 */
export function respondToPasswordRequest(id: string, value: string | null): void {
  DeviceEventEmitter.emit(RESPONSE_EVENT, { id, value });
}
