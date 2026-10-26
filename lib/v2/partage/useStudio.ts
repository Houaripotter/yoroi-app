/**
 * Etat d'un atelier de partage : habillage, photo de fond, capture, partage et enregistrement.
 */
import { useCallback, useRef, useState } from 'react';
import type { View } from 'react-native';
import { pickCardPhoto, saveCard, shareCard } from './capture';
import type { CardVariant } from '@/components/yoroi/v2/partage/cardKit';
import type { SourcePartage } from './mesure';

export function useStudio(opts?: { initialStyle?: CardVariant; initialPhoto?: string | null; square?: boolean; dialogTitle?: string; fallbackMessage?: string; source?: SourcePartage }) {
  const cardRef = useRef<View>(null);
  const [style, setStyleState] = useState<CardVariant>(opts?.initialStyle ?? (opts?.initialPhoto ? 'photo' : 'laque'));
  const [photo, setPhoto] = useState<string | null>(opts?.initialPhoto ?? null);
  const [landscape, setLandscape] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoEnCours, setPhotoEnCours] = useState(false);

  const pick = useCallback(async (src: 'gallery' | 'camera') => {
    const res = await pickCardPhoto(src, { square: opts?.square, onPreparation: setPhotoEnCours });
    if (res) {
      setPhoto(res.uri);
      setLandscape(res.landscape);
      setStyleState('photo');
    }
  }, [opts?.square]);

  const setStyle = useCallback((s: CardVariant) => {
    setStyleState(s);
    if (s === 'photo' && !photo) pick('gallery');
  }, [photo, pick]);

  const share = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await shareCard(cardRef, opts?.dialogTitle, opts?.fallbackMessage, opts?.source);
    } finally {
      setBusy(false);
    }
  }, [busy, opts?.dialogTitle, opts?.fallbackMessage, opts?.source]);

  const save = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await saveCard(cardRef);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  /** Valeur attendue par les cartes : 'photo' seulement si une photo est choisie */
  const legacyBg: 'photo' | 'black' | 'white' = style === 'photo' && photo ? 'photo' : style === 'papier' ? 'white' : 'black';
  const duelBg: 'photo' | 'dark' | 'light' = style === 'photo' && photo ? 'photo' : style === 'papier' ? 'light' : 'dark';

  return { cardRef, style, setStyle, setStyleRaw: setStyleState, photo, setPhoto, photoEnCours, landscape, busy, pick, share, save, legacyBg, duelBg, hasPhoto: !!photo };
}
