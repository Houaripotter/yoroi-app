/**
 * Cartes a partager : capture en haute definition (1080 de large : 1080 x 1920 pour la story),
 * enregistrement dans la pellicule (demande la permission la premiere fois) et feuille de partage du systeme.
 * Sur iPhone, view-shot compte la taille en points : on divise par la densite de l'ecran.
 */
import type { RefObject } from 'react';
import { PixelRatio, Platform } from 'react-native';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { requestPermissionsAsync, saveToLibraryAsync } from 'expo-media-library';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { logger } from '@/lib/security/logger';
import { noterPartage } from '@/lib/v2/partage/mesure';
import type { SourcePartage } from '@/lib/v2/partage/mesure';
import type { FormatId, Moment, TypeExploit } from './types';

const PX: Record<FormatId, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
  carre: { w: 1080, h: 1080 },
};

export function sourceDe(m: Moment, type?: TypeExploit): SourcePartage {
  if (m === 'exploit') {
    if (type?.startsWith('record_')) return 'record';
    if (type === 'bilan_mois') return 'recap_mois';
    if (type === 'poids_perdu' || type === 'plus_bas' || type === 'palier_poids' || type === 'objectif_poids') return 'carte_pesee';
    if (type === 'compteur' || type === 'techniques') return 'derniere_seance';
    return 'compteur_annee';
  }
  if (m === 'avant_apres') return 'avant_apres';
  return m === 'seance' ? 'derniere_seance' : m === 'semaine' ? 'recap_semaine' : 'carte_pesee';
}

export async function capturerHD(ref: RefObject<View | null>, format: FormatId): Promise<string | null> {
  if (!ref.current) return null;
  const px = PX[format];
  const k = Platform.OS === 'ios' ? PixelRatio.get() : 1;
  return captureRef(ref.current, { format: 'png', quality: 1, result: 'tmpfile', width: px.w / k, height: px.h / k });
}

/** Enregistre la carte dans la pellicule. Vrai si c'est fait. */
/** Message d'erreur : dans la fenetre maison, ou en ligne quand on est deja dans une feuille (onErreur) */
type Erreur = ((titre: string, texte: string) => void) | undefined;
function dire(onErreur: Erreur, titre: string, texte: string) {
  if (onErreur) onErreur(titre, texte);
  else appAlert(titre, texte);
}

export async function enregistrerCarte(ref: RefObject<View | null>, format: FormatId, onErreur?: Erreur): Promise<boolean> {
  impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
  try {
    const perm = await requestPermissionsAsync(true);
    const st = perm.status as string;
    if (st !== 'granted' && st !== 'limited') {
      dire(onErreur, 'Pellicule bloquée', 'Autorise YOROI à ajouter des photos dans les réglages de ton téléphone, puis réessaie.');
      return false;
    }
    const uri = await capturerHD(ref, format);
    if (!uri) {
      dire(onErreur, 'Un instant', 'La carte n’est pas encore prête, réessaie dans une seconde.');
      return false;
    }
    await saveToLibraryAsync(uri);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    return true;
  } catch (e) {
    logger.error('[cartes] enregistrement', e);
    dire(onErreur, 'Oups', 'Impossible d’enregistrer la carte dans ta pellicule.');
    return false;
  }
}

/** Ouvre la feuille de partage du systeme (Instagram, TikTok, WhatsApp...) avec l'image */
export async function partagerCarte(ref: RefObject<View | null>, format: FormatId, moment: Moment, onErreur?: Erreur, type?: TypeExploit): Promise<boolean> {
  impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
  noterPartage(sourceDe(moment, type));
  try {
    const uri = await capturerHD(ref, format);
    if (!uri) {
      dire(onErreur, 'Un instant', 'La carte n’est pas encore prête, réessaie dans une seconde.');
      return false;
    }
    if (!(await isAvailableAsync())) {
      return enregistrerCarte(ref, format, onErreur);
    }
    await shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Partager ma carte YOROI', UTI: 'public.png' });
    return true;
  } catch (e) {
    logger.error('[cartes] partage', e);
    dire(onErreur, 'Oups', 'Impossible de partager la carte.');
    return false;
  }
}
