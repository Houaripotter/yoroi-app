/**
 * Mode createur YOROI : etat partage, ouvert uniquement par un jeton signe (voir creatorToken.ts).
 * { isCreator, expiresAt, unlock(raw), lock() } plus ready, label et recheck().
 * Le jeton est garde dans SecureStore et reverifie au lancement, au retour au premier plan
 * et a chaque ouverture du Studio. A l'expiration, le mode se coupe tout seul.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenErrorMessage, verifyCreatorToken } from './creatorToken';
import { clearToken, LEGACY_ASYNC_KEYS, MAX_FAILS, readAttempts, readToken, registerFailure, resetAttempts, writeToken } from './creatorStore';
import { setDevClockEnabled } from './devClock';
import { setCreatorPremium } from './premiumFlags';
import { chargerSourceDemos, setDemosCreateur } from '@/lib/v2/programmes/demosTest';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export const CREATOR_CHANGED_EVENT = 'YOROI_CREATOR_CHANGED';

export type UnlockResult = { ok: true } | { ok: false; message: string; lockedUntil?: number; left?: number };

export type CreatorModeValue = {
  /** vrai une fois l'etat lu au demarrage */
  ready: boolean;
  isCreator: boolean;
  /** expiration du jeton, en millisecondes */
  expiresAt: number | null;
  /** etiquette du jeton (par exemple iphone) */
  label: string | null;
  unlock: (raw: string) => Promise<UnlockResult>;
  lock: () => Promise<void>;
  /** relit et reverifie le jeton garde (a l'ouverture du Studio) */
  recheck: () => Promise<boolean>;
  /** blocage en cours apres trop d'essais rates (millisecondes, 0 sinon) */
  getLockedUntil: () => Promise<number>;
};

const CreatorModeContext = createContext<CreatorModeValue | null>(null);

const MAX_TIMER_MS = 2147483000;

function lockMessage(until: number): string {
  const s = Math.max(1, Math.ceil((until - Date.now()) / 1000));
  if (s < 90) return traduire("Trop d’essais. Réessaie dans {0} secondes.", s);
  const m = Math.ceil(s / 60);
  if (m < 90) return traduire("Trop d’essais. Réessaie dans {0} minutes.", m);
  return traduire("Trop d’essais. Réessaie dans {0} heures.", Math.ceil(m / 60));
}

export function CreatorModeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void chargerSourceDemos();
  }, []);

  const apply = useCallback((exp: number | null, sub: string | null) => {
    setExpiresAt(exp);
    setLabel(sub);
    setDevClockEnabled(exp !== null);
    // Premium ouvert sans achat tant que le mode createur est actif
    setCreatorPremium(exp !== null);
    // animations de test des exercices : jamais hors mode createur
    setDemosCreateur(exp !== null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (exp !== null) {
      const wait = exp - Date.now();
      if (wait > 0 && wait < MAX_TIMER_MS) {
        timer.current = setTimeout(() => {
          void clearToken();
          apply(null, null);
        }, wait + 500);
      }
    }
    DeviceEventEmitter.emit(CREATOR_CHANGED_EVENT, exp !== null);
  }, []);

  const recheck = useCallback(async (): Promise<boolean> => {
    const raw = await readToken();
    if (!raw) {
      apply(null, null);
      return false;
    }
    // heure reelle, jamais l'horloge du Studio
    const r = verifyCreatorToken(raw, Date.now());
    if (!r.valid) {
      await clearToken();
      apply(null, null);
      return false;
    }
    apply(r.payload.exp * 1000, r.payload.sub);
    return true;
  }, [apply]);

  // Demarrage : les anciennes cles en clair ne donnent plus acces, elles sont effacees
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await AsyncStorage.multiRemove(LEGACY_ASYNC_KEYS);
      } catch {
        // rien a effacer
      }
      await recheck().catch(() => false);
      if (alive) setReady(true);
    })();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void recheck().catch(() => false);
    });
    return () => {
      alive = false;
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [recheck]);

  const getLockedUntil = useCallback(async () => {
    const a = await readAttempts();
    return a.lockedUntil > Date.now() ? a.lockedUntil : 0;
  }, []);

  const unlock = useCallback(
    async (raw: string): Promise<UnlockResult> => {
      const before = await readAttempts();
      if (before.lockedUntil > Date.now()) return { ok: false, message: lockMessage(before.lockedUntil), lockedUntil: before.lockedUntil };
      const r = verifyCreatorToken(raw, Date.now());
      if (!r.valid) {
        const a = await registerFailure();
        if (a.lockedUntil > Date.now()) return { ok: false, message: lockMessage(a.lockedUntil), lockedUntil: a.lockedUntil };
        const left = MAX_FAILS - a.fails;
        return { ok: false, message: traduirePluriel(left, left > 1, "{0} Encore {1} essai avant un blocage.", "{0} Encore {1} essais avant un blocage.", tokenErrorMessage(r.reason), left), left };
      }
      const saved = await writeToken(raw.replace(/\s+/g, ''));
      if (!saved) return { ok: false, message: traduire('Le jeton n’a pas pu être gardé sur ce téléphone. Réessaie.') };
      await resetAttempts();
      apply(r.payload.exp * 1000, r.payload.sub);
      return { ok: true };
    },
    [apply],
  );

  const lock = useCallback(async () => {
    await clearToken();
    apply(null, null);
  }, [apply]);

  const value = useMemo<CreatorModeValue>(
    () => ({ ready, isCreator: expiresAt !== null, expiresAt, label, unlock, lock, recheck, getLockedUntil }),
    [ready, expiresAt, label, unlock, lock, recheck, getLockedUntil],
  );

  return <CreatorModeContext.Provider value={value}>{children}</CreatorModeContext.Provider>;
}

const FALLBACK: CreatorModeValue = {
  ready: true,
  isCreator: false,
  expiresAt: null,
  label: null,
  unlock: async () => ({ ok: false, message: traduire('Mode créateur indisponible.') }),
  lock: async () => undefined,
  recheck: async () => false,
  getLockedUntil: async () => 0,
};

/** Etat du mode createur. Hors du fournisseur : toujours ferme. */
export function useCreatorMode(): CreatorModeValue {
  return useContext(CreatorModeContext) ?? FALLBACK;
}
