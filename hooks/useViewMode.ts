import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const VIEW_MODE_KEY = '@yoroi_view_mode';

export type ViewMode = 'complet' | 'essentiel';

export const useViewMode = () => {
  const [mode, setMode] = useState<ViewMode>('complet');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMode();
  }, []);

  const loadMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(VIEW_MODE_KEY);
      if (savedMode === 'complet' || savedMode === 'essentiel') {
        setMode(savedMode);
      } else {
        // Si pas de mode sauvegarde, utiliser 'complet' par defaut
        setMode('complet');
      }
    } catch (error) {
      logger.error('Erreur chargement mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = async () => {
    const newMode: ViewMode = mode === 'complet' ? 'essentiel' : 'complet';
    setMode(newMode);
    try {
      await AsyncStorage.setItem(VIEW_MODE_KEY, newMode);
    } catch (error) {
      logger.error('Erreur sauvegarde mode:', error);
    }
  };

  return { mode, toggleMode, isLoading };
};
