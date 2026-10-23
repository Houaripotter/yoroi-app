/**
 * Adresses publiques de YOROI et signature des partages (13 octobre 2026).
 *
 * Un seul endroit pour les liens : quand le site existera, on remplit SITE_URL et toutes les signatures
 * pointent vers lui sans toucher a aucun ecran. Tant qu'il n'existe pas, la signature donne le lien du store
 * de la plateforme de la personne qui partage.
 */
import { Platform } from 'react-native';
import { traduire } from '@/lib/i18n/tr';

/** Site de YOROI, en ligne depuis le 18 octobre 2026. */
export const SITE_URL = 'https://yoroiapp.com';

export const APP_STORE_URL = 'https://apps.apple.com/app/id6757306612';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.houari.yoroi';

/** Lien a mettre dans un partage : le site s'il existe, sinon le store de la plateforme */
export function lienApp(): string {
  if (SITE_URL) return SITE_URL;
  return Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
}

/** Signature ajoutee a la fin de tout texte partage */
export function signaturePartage(): string {
  return traduire("Suivi avec YOROI : {0}", lienApp());
}

/** Signature courte pour une image (ecrite sur la carte) : l'adresse sans https */
export function signatureImage(): string {
  return lienApp().replace(/^https?:\/\//, '');
}
