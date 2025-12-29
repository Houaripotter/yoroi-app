import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// ============================================
// HOOK AUTO-SAVE UNIVERSEL
// ============================================
// Sauvegarde automatique sécurisée pour tous les écrans
// avec saisie de texte

interface UseAutoSaveOptions {
  /**
   * Function to call when auto-saving
   */
  onSave: () => void | Promise<void>;

  /**
   * Dependencies that trigger the save
   */
  data: any[];

  /**
   * Debounce delay in milliseconds (default: 3000ms)
   */
  debounceMs?: number;

  /**
   * Whether auto-save is enabled (default: true)
   */
  enabled?: boolean;
}

export function useAutoSave({
  onSave,
  data,
  debounceMs = 3000,
  enabled = true,
}: UseAutoSaveOptions) {
  const appState = useRef(AppState.currentState);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChanges = useRef(false);
  const isInitialMount = useRef(true);

  // Memoize the save callback
  const save = useCallback(async () => {
    if (!enabled || !hasUnsavedChanges.current) {
      return;
    }

    try {
      await onSave();
      hasUnsavedChanges.current = false;
      console.log('[AUTO-SAVE] Data saved successfully');
    } catch (error) {
      console.error('[AUTO-SAVE] Failed to save:', error);
    }
  }, [onSave, enabled]);

  // AppState listener - Save when app goes to background/inactive
  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // App is going to background or becoming inactive
      if (
        appState.current.match(/active/) &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        console.log('[AUTO-SAVE] App going to background, triggering save...');
        save();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [save, enabled]);

  // Save on unmount (when leaving the screen)
  useEffect(() => {
    return () => {
      if (enabled && hasUnsavedChanges.current) {
        console.log('[AUTO-SAVE] Screen unmounting, triggering save...');
        save();
      }
      // Clear any pending timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [save, enabled]);

  // Mark changes as unsaved when data changes
  useEffect(() => {
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (enabled) {
      hasUnsavedChanges.current = true;
    }
  }, [...data]);

  // Debounced auto-save during data changes
  useEffect(() => {
    if (!enabled) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Only set timer if there are unsaved changes
    if (hasUnsavedChanges.current) {
      autoSaveTimerRef.current = setTimeout(() => {
        console.log(`[AUTO-SAVE] Debounced save triggered after ${debounceMs}ms inactivity`);
        save();
      }, debounceMs);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [...data, save, debounceMs, enabled]);

  // Return a manual save function and reset function
  return {
    /**
     * Manually trigger a save (marks as saved)
     */
    save,

    /**
     * Mark data as saved (no unsaved changes)
     */
    markAsSaved: () => {
      hasUnsavedChanges.current = false;
    },

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges: () => hasUnsavedChanges.current,
  };
}
