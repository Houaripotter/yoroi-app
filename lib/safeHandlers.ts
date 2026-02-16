// ============================================
// 🔒 SAFE HANDLERS - WRAPPER GLOBAL
// ============================================
// Wrappers pour protéger automatiquement n'importe quel handler
// contre le spam et les double-clics

import { useRef } from 'react';
import logger from '@/lib/security/logger';

/**
 * Crée un wrapper anti-spam pour n'importe quelle fonction
 * @param fn - Fonction à protéger
 * @param delay - Délai minimum entre deux appels (ms)
 * @param logName - Nom pour les logs
 */
export const createSafeHandler = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 500,
  logName?: string
): T => {
  let lastCallTime = 0;
  let isProcessing = false;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    // Protection 1: Déjà en cours
    if (isProcessing) {
      if (__DEV__ && logName) {
        logger.warn(`[SafeHandler] ${logName} - Already processing, skipped`);
      }
      return;
    }

    // Protection 2: Trop rapide
    if (timeSinceLastCall < delay) {
      if (__DEV__ && logName) {
        logger.warn(`[SafeHandler] ${logName} - Too fast (${timeSinceLastCall}ms < ${delay}ms), skipped`);
      }
      return;
    }

    lastCallTime = now;
    isProcessing = true;

    try {
      const result = fn(...args);

      // Si c'est une Promise, attendre qu'elle se termine
      if (result instanceof Promise) {
        return result.finally(() => {
          setTimeout(() => {
            isProcessing = false;
          }, delay);
        });
      }

      setTimeout(() => {
        isProcessing = false;
      }, delay);

      return result;
    } catch (error) {
      isProcessing = false;
      throw error;
    }
  }) as T;
};

/**
 * Hook React pour créer un handler safe
 * Utilise useRef pour maintenir l'état entre les renders
 */
export const useSafeHandler = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 500,
  logName?: string
): T => {
  const handlerRef = useRef<T>();

  if (!handlerRef.current) {
    handlerRef.current = createSafeHandler(fn, delay, logName);
  }

  return handlerRef.current;
};

// ============================================
// HELPERS SPÉCIALISÉS
// ============================================

/**
 * Wrapper spécifique pour les navigations
 */
export const createSafeNavigation = (
  navigateFn: () => void,
  delay: number = 800 // Délai plus long pour les navigations
) => {
  return createSafeHandler(navigateFn, delay, 'Navigation');
};

/**
 * Wrapper spécifique pour les sauvegardes
 */
export const createSafeSave = (
  saveFn: () => Promise<void>,
  delay: number = 1000 // Délai plus long pour les sauvegardes
) => {
  return createSafeHandler(saveFn, delay, 'Save');
};

/**
 * Wrapper spécifique pour les modals
 */
export const createSafeModal = (
  modalFn: () => void,
  delay: number = 300
) => {
  return createSafeHandler(modalFn, delay, 'Modal');
};

// ============================================
// EXEMPLES D'UTILISATION
// ============================================

/*

EXEMPLE 1 - Wrapper simple
============================

import { createSafeHandler } from '@/lib/safeHandlers';

const handleSave = createSafeHandler(async () => {
  await saveData();
  router.push('/success');
}, 1000, 'SaveButton');


EXEMPLE 2 - Navigation sécurisée
==================================

import { createSafeNavigation } from '@/lib/safeHandlers';

const handleNavigate = createSafeNavigation(() => {
  router.push('/next');
});


EXEMPLE 3 - Dans un composant React
=====================================

import { useSafeHandler } from '@/lib/safeHandlers';

const MyComponent = () => {
  const handleSubmit = useSafeHandler(async () => {
    await submitForm();
  }, 1000, 'SubmitForm');

  return <TouchableOpacity onPress={handleSubmit}>...</TouchableOpacity>;
};


EXEMPLE 4 - Wrapper multiple handlers
=======================================

const handlers = {
  save: createSafeHandler(handleSave, 1000),
  delete: createSafeHandler(handleDelete, 1000),
  share: createSafeHandler(handleShare, 500),
};

*/
