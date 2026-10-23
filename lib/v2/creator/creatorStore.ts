/**
 * Stockage du mode createur dans expo-secure-store (trousseau iOS, Keystore Android).
 * Le JETON est garde (et non un drapeau « deverrouille ») : il est reverifie a chaque
 * lancement et a chaque ouverture du Studio, son expiration compte donc vraiment.
 * Les essais rates et la date de blocage y sont aussi : ils resistent a la relance de l'app.
 */
import * as SecureStore from 'expo-secure-store';

export const TOKEN_KEY = 'yoroi_creator_token_v1';
export const ATTEMPTS_KEY = 'yoroi_creator_attempts_v1';

/** Toutes les cles SecureStore propres au Studio (pour « tout effacer ») */
export const CREATOR_SECURE_KEYS = [TOKEN_KEY, ATTEMPTS_KEY];

/** Anciennes cles en clair qui ouvraient le Studio : elles ne donnent plus acces et sont effacees */
export const LEGACY_ASYNC_KEYS = ['@yoroi_dev_mode', '@yoroi_screenshot_menu_unlocked', '@yoroi_creator_mode'];

export const MAX_FAILS = 5;
const BASE_LOCK_MS = 60 * 1000;
const MAX_LOCK_MS = 24 * 3600 * 1000;

export type Attempts = { fails: number; level: number; lockedUntil: number };
const EMPTY: Attempts = { fails: 0, level: 0, lockedUntil: 0 };

export async function readToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function writeToken(token: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return true;
  } catch {
    return false;
  }
}

export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // rien a effacer
  }
}

export async function readAttempts(): Promise<Attempts> {
  try {
    const raw = await SecureStore.getItemAsync(ATTEMPTS_KEY);
    if (!raw) return { ...EMPTY };
    const a = JSON.parse(raw) as Partial<Attempts>;
    return {
      fails: Math.max(0, Number(a.fails) || 0),
      level: Math.max(0, Number(a.level) || 0),
      lockedUntil: Math.max(0, Number(a.lockedUntil) || 0),
    };
  } catch {
    return { ...EMPTY };
  }
}

async function writeAttempts(a: Attempts): Promise<void> {
  try {
    await SecureStore.setItemAsync(ATTEMPTS_KEY, JSON.stringify(a));
  } catch {
    // non bloquant
  }
}

/** Un essai rate : au 5e, blocage de 60 s, puis 2 min, 4 min... jusqu'a 24 h. Renvoie l'etat a jour. */
export async function registerFailure(now = Date.now()): Promise<Attempts> {
  const a = await readAttempts();
  a.fails += 1;
  if (a.fails >= MAX_FAILS) {
    a.level += 1;
    a.fails = 0;
    a.lockedUntil = now + Math.min(MAX_LOCK_MS, BASE_LOCK_MS * Math.pow(2, a.level - 1));
  }
  await writeAttempts(a);
  return a;
}

export async function resetAttempts(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
  } catch {
    // rien a effacer
  }
}
