/**
 * Cartes a partager : capture en haute definition (1080 de large : 1080 x 1920 pour la story),
 * enregistrement dans la pellicule (demande la permission la premiere fois) et feuille de partage du systeme.
 * Sur iPhone, view-shot compte la taille en points : on divise par la densite de l'ecran.
 */
import type { RefObject } from 'react';
import { PixelRatio, Platform } from 'react-native';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { setImageAsync } from 'expo-clipboard';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { requestPermissionsAsync, saveToLibraryAsync } from 'expo-media-library';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { logger } from '@/lib/security/logger';
import { noterPartage } from '@/lib/v2/partage/mesure';
import type { SourcePartage } from '@/lib/v2/partage/mesure';
import type { FormatId, Moment, TypeExploit } from './types';
import { traduire } from '@/lib/i18n/tr';
import { effacerApresPartage, effacerExport, rangerDansCartesTmp } from './tmp';

const PX: Record<FormatId, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
  carre: { w: 1080, h: 1080 },
};

export function sourceDe(m: Moment, type?: TypeExploit): SourcePartage {
  if (m === 'exploit') {
    if (type?.startsWith('record_')) return 'record';
    if (type === 'bilan_mois') return 'recap_mois';
    if (type === 'poids_perdu' || type === 'plus_bas' || type === 'palier_poids' || type === 'objectif_poids' || type === 'chemin_poids') return 'carte_pesee';
    if (type === 'compteur' || type === 'techniques') return 'derniere_seance';
    return 'compteur_annee';
  }
  if (m === 'avant_apres') return 'avant_apres';
  if (m === 'mois') return 'recap_mois';
  if (m === 'annee') return 'compteur_annee';
  return m === 'seance' ? 'derniere_seance' : m === 'semaine' ? 'recap_semaine' : 'carte_pesee';
}

/**
 * 31 octobre 2026 (cartes v2) : toujours en PNG. react-native-view-shot garde la transparence en PNG
 * (iPhone : contexte de dessin non opaque ; Android : bitmap ARGB, le fond n'est rempli qu'en JPEG) :
 * l'autocollant seul, dessine sans fond, sort a fond transparent.
 */
export async function capturerHD(ref: RefObject<View | null>, format: FormatId): Promise<string | null> {
  if (!ref.current) return null;
  const px = PX[format];
  const k = Platform.OS === 'ios' ? PixelRatio.get() : 1;
  const brut = await captureRef(ref.current, { format: 'png', quality: 1, result: 'tmpfile', width: px.w / k, height: px.h / k });
  // 2 novembre 2026 (confidentialite) : l'image exportee passe par cacheDirectory/cartes_tmp/ quand le systeme
  // la laisse dans le cache de l'app ; sinon (iPhone : tmp/ReactNative) elle est liberee par view-shot apres usage
  return rangerDansCartesTmp(brut, 'export');
}

/**
 * 31 octobre 2026 (cartes v2) : « Partager en story ». L'app n'a pas de partage direct vers la story Instagram
 * (ni react-native-share, ni le scheme instagram-stories dans Info.plist, et Instagram demande un identifiant
 * d'app Facebook) : on ouvre la feuille du systeme avec l'image en PNG, ou Instagram propose Story.
 */
export async function partagerStory(ref: RefObject<View | null>, format: FormatId, moment: Moment, onErreur?: Erreur, type?: TypeExploit): Promise<boolean> {
  impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
  noterPartage(sourceDe(moment, type));
  let uri: string | null = null;
  try {
    uri = await capturerHD(ref, format);
    if (!uri) {
      dire(onErreur, traduire('Un instant'), traduire('La carte n’est pas encore prête, réessaie dans une seconde.'));
      return false;
    }
    if (!(await isAvailableAsync())) return enregistrerCarte(ref, format, onErreur);
    await shareAsync(uri, { mimeType: 'image/png', dialogTitle: traduire('Choisis Instagram, puis Story'), UTI: 'public.png' });
    return true;
  } catch (e) {
    logger.error('[cartes] partage story', e);
    dire(onErreur, traduire('Oups'), traduire('Impossible de partager la carte.'));
    return false;
  } finally {
    // 2 novembre 2026 : effacee apres le partage, termine ou annule
    effacerApresPartage(uri);
  }
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
  let uri: string | null = null;
  try {
    const perm = await requestPermissionsAsync(true);
    const st = perm.status as string;
    if (st !== 'granted' && st !== 'limited') {
      dire(onErreur, traduire('Pellicule bloquée'), traduire('Autorise YOROI à ajouter des photos dans les réglages de ton téléphone, puis réessaie.'));
      return false;
    }
    uri = await capturerHD(ref, format);
    if (!uri) {
      dire(onErreur, traduire('Un instant'), traduire('La carte n’est pas encore prête, réessaie dans une seconde.'));
      return false;
    }
    await saveToLibraryAsync(uri);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    return true;
  } catch (e) {
    logger.error('[cartes] enregistrement', e);
    dire(onErreur, traduire('Oups'), traduire('Impossible d’enregistrer la carte dans ta pellicule.'));
    return false;
  } finally {
    // la pellicule a sa propre copie : l'image exportee est effacee tout de suite
    void effacerExport(uri);
  }
}

/** Ouvre la feuille de partage du systeme (Instagram, TikTok, WhatsApp...) avec l'image */
export async function partagerCarte(ref: RefObject<View | null>, format: FormatId, moment: Moment, onErreur?: Erreur, type?: TypeExploit): Promise<boolean> {
  impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
  noterPartage(sourceDe(moment, type));
  let uri: string | null = null;
  try {
    uri = await capturerHD(ref, format);
    if (!uri) {
      dire(onErreur, traduire('Un instant'), traduire('La carte n’est pas encore prête, réessaie dans une seconde.'));
      return false;
    }
    if (!(await isAvailableAsync())) {
      return enregistrerCarte(ref, format, onErreur);
    }
    await shareAsync(uri, { mimeType: 'image/png', dialogTitle: traduire('Partager ma carte YOROI'), UTI: 'public.png' });
    return true;
  } catch (e) {
    logger.error('[cartes] partage', e);
    dire(onErreur, traduire('Oups'), traduire('Impossible de partager la carte.'));
    return false;
  } finally {
    // 2 novembre 2026 : effacee apres le partage, termine ou annule
    effacerApresPartage(uri);
  }
}

/**
 * 31 octobre 2026 (cartes v2) : l'autocollant seul copie dans le presse-papiers, en PNG transparent.
 * Dans la story Instagram, un appui long puis Coller le pose comme un sticker sur ta photo ou ta video.
 * Ancien moteur : la carte entiere, au format de la carte (1080 x 1920 en story).
 * 2 novembre 2026, nouveau moteur (recadre) : ref est la vue de l'autocollant seul (CarteMoteur, refAutocollant), deja a
 * environ 700 px de large sur l'appareil ; elle est prise a sa taille, sans zone vide autour (optionsAutocollant).
 * En base64 : aucun fichier n'est ecrit.
 */
export async function copierAutocollant(ref: RefObject<View | null>, format: FormatId, moment: Moment, onErreur?: Erreur, recadre = false): Promise<boolean> {
  impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
  noterPartage(sourceDe(moment));
  try {
    if (!ref.current) return false;
    const px = PX[format];
    const k = Platform.OS === 'ios' ? PixelRatio.get() : 1;
    const b64 = await captureRef(ref.current, recadre ? optionsAutocollant('base64') : { format: 'png', quality: 1, result: 'base64', width: px.w / k, height: px.h / k });
    await setImageAsync(b64);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    return true;
  } catch (e) {
    logger.error('[cartes] copie autocollant', e);
    dire(onErreur, traduire('Oups'), traduire('Impossible de copier l’autocollant.'));
    return false;
  }
}

/**
 * 2 novembre 2026 (nouveau moteur) : la capture de l'autocollant seul. Toujours en PNG (la transparence reste) ;
 * sans largeur ni hauteur : la vue est deja a la taille de l'export (EXPORT_AUTOCOLLANT, miseEnPage.ts).
 */
export function optionsAutocollant(result: 'base64' | 'tmpfile'): { format: 'png'; quality: number; result: 'base64' | 'tmpfile' } {
  return { format: 'png', quality: 1, result };
}

/** L'autocollant seul en fichier PNG, range dans cartes_tmp/ quand le systeme le laisse dans le cache de l'app */
export async function capturerAutocollant(ref: RefObject<View | null>): Promise<string | null> {
  if (!ref.current) return null;
  const brut = await captureRef(ref.current, optionsAutocollant('tmpfile'));
  return rangerDansCartesTmp(brut, 'autocollant');
}

/** 2 novembre 2026 (nouveau moteur) : l'autocollant seul, en PNG transparent, dans la pellicule. Vrai si c'est fait. */
export async function enregistrerAutocollant(ref: RefObject<View | null>, onErreur?: Erreur): Promise<boolean> {
  impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
  let uri: string | null = null;
  try {
    const perm = await requestPermissionsAsync(true);
    const st = perm.status as string;
    if (st !== 'granted' && st !== 'limited') {
      dire(onErreur, traduire('Pellicule bloquée'), traduire('Autorise YOROI à ajouter des photos dans les réglages de ton téléphone, puis réessaie.'));
      return false;
    }
    uri = await capturerAutocollant(ref);
    if (!uri) {
      dire(onErreur, traduire('Un instant'), traduire('L’autocollant n’est pas encore prêt, réessaie dans une seconde.'));
      return false;
    }
    await saveToLibraryAsync(uri);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    return true;
  } catch (e) {
    logger.error('[cartes] enregistrement autocollant', e);
    dire(onErreur, traduire('Oups'), traduire('Impossible d’enregistrer l’autocollant dans ta pellicule.'));
    return false;
  } finally {
    // la pellicule a sa propre copie : le PNG exporte est efface tout de suite
    void effacerExport(uri);
  }
}
