/**
 * Garde du Studio, montee une fois dans app/_layout.tsx : sans mode createur actif
 * (jamais ouvert, verrouille ou jeton expire), les modes de test du Studio sont coupes
 * (mode capture, barre 09:41, carnet de demonstration).
 * 27 octobre 2026 : rend aussi le bandeau de la vue « Nouvel utilisateur » (rien hors de cette vue).
 */
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScreenshotMode } from '@/lib/ScreenshotModeContext';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { BandeauNouvelUtilisateur } from './BandeauNouvelUtilisateur';

export const STUDIO_TEST_KEYS = ['@yoroi_journal_screenshot_mode', '@yoroi_surgeon_mode', '@yoroi_mock_stats_mode'];

export function CreatorGuard() {
  const { ready, isCreator } = useCreatorMode();
  const { isScreenshotMode, useFakeStatusBar, setScreenshotMode, toggleFakeStatusBar } = useScreenshotMode();

  useEffect(() => {
    if (!ready || isCreator) return;
    if (isScreenshotMode) void setScreenshotMode(false).catch(() => undefined);
    if (useFakeStatusBar) void toggleFakeStatusBar().catch(() => undefined);
  }, [ready, isCreator, isScreenshotMode, useFakeStatusBar, setScreenshotMode, toggleFakeStatusBar]);

  useEffect(() => {
    if (!ready || isCreator) return;
    AsyncStorage.multiRemove(STUDIO_TEST_KEYS).catch(() => undefined);
  }, [ready, isCreator]);

  return <BandeauNouvelUtilisateur />;
}

export default CreatorGuard;
