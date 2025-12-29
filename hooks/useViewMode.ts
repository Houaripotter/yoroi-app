import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VIEW_MODE_KEY = '@yoroi_view_mode';

export type ViewMode = 'guerrier' | 'essentiel';

export const useViewMode = () => {
  const [mode, setMode] = useState<ViewMode>('essentiel');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMode();
  }, []);

  const loadMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(VIEW_MODE_KEY);
      if (savedMode === 'guerrier' || savedMode === 'essentiel') {
        setMode(savedMode);
      } else {
        // Si pas de mode sauvegardé, utiliser 'essentiel' par défaut
        setMode('essentiel');
      }
    } catch (error) {
      console.error('Erreur chargement mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = async () => {
    const newMode: ViewMode = mode === 'guerrier' ? 'essentiel' : 'guerrier';
    setMode(newMode);
    try {
      await AsyncStorage.setItem(VIEW_MODE_KEY, newMode);
    } catch (error) {
      console.error('Erreur sauvegarde mode:', error);
    }
  };

  return { mode, toggleMode, isLoading };
};
