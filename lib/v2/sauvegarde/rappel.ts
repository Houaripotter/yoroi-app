/**
 * Rappels de sauvegarde (13 octobre 2026).
 * Il n'y a pas de compte YOROI : tout reste sur le telephone. Une copie n'est vraiment a l'abri
 * que hors du telephone (Fichiers, iCloud Drive, Google Drive...). Les sauvegardes automatiques
 * du telephone ne comptent donc pas ici : seule compte la derniere copie envoyee hors du telephone.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { illustrer } from '@/components/yoroi/v2/messages/illustrer';
import { logger } from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

const MANUAL_KEY = '@yoroi_last_manual_export';
const CLOUD_KEY = '@yoroi_last_cloud_sync_success';
const TIP_SEEN_KEY = '@yoroi_conseil_sauvegarde_vu';

const toTime = (iso: string | null) => {
  const t = iso ? new Date(iso).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
};

/** Date de la derniere copie envoyee hors du telephone (partage vers le cloud, ou dossier cloud relie), ou null */
export async function getLastOffPhoneBackupDate(): Promise<Date | null> {
  try {
    const [m, c] = await Promise.all([AsyncStorage.getItem(MANUAL_KEY), AsyncStorage.getItem(CLOUD_KEY)]);
    const best = Math.max(toTime(m), toTime(c));
    return best ? new Date(best) : null;
  } catch {
    return null;
  }
}

/** Ouvre la feuille de partage avec une sauvegarde complete (a ranger dans le cloud) */
export async function sauvegarderMaintenant(): Promise<boolean> {
  try {
    const { exportDataToJSON } = await import('@/lib/exportService');
    return await exportDataToJSON();
  } catch (e) {
    logger.warn('[Sauvegarde] export impossible', e);
    return false;
  }
}

/**
 * Conseil doux, une seule fois (apres la visite guidee) : pas de compte, tout est sur le telephone,
 * une copie dans ton cloud de temps en temps. Aucune obligation.
 */
export async function proposerSauvegardeDouce(): Promise<void> {
  try {
    if ((await AsyncStorage.getItem(TIP_SEEN_KEY)) === '1') return;
    await AsyncStorage.setItem(TIP_SEEN_KEY, '1');
    const cloud = Platform.OS === 'android' ? 'Google Drive' : 'iCloud Drive';
    const illustration = await illustrer('sauvegarde');
    const { lireProtection, etatProtection } = await import('./copieAuto');
    const auto = etatProtection(await lireProtection()) === 'a_activer';
    const { etapesSelecteur } = await import('@/components/yoroi/v2/sauvegarde/lancerCopieAuto');
    appAlert(
      traduire('Tes données, chez toi'),
      auto
        ? traduire("YOROI n’a ni compte ni serveur : tout ce que tu notes reste sur ce téléphone. Active la copie automatique : une copie part chaque jour dans {0}, même si tu changes de téléphone.\n\n{1}", cloud, etapesSelecteur())
        : traduire("YOROI n’a ni compte ni serveur : tout ce que tu notes reste sur ce téléphone. Une copie dans {0} le protège, même si tu changes de téléphone. Pour la remettre un jour : « J’ai déjà une sauvegarde », au premier écran.", cloud),
      [
        { text: traduire('Plus tard'), style: 'cancel' },
        {
          // 18 octobre 2026 : la copie automatique d'abord (dossier choisi une fois), sinon la copie a la main
          text: auto ? traduire('Activer la copie automatique') : traduire('Faire ma copie'),
          isPreferred: true,
          onPress: () => {
            if (!auto) return void sauvegarderMaintenant();
            void import('@/components/yoroi/v2/sauvegarde/lancerCopieAuto').then((m) => m.choisirDossierEtCopier());
          },
        },
      ],
      illustration ? { illustration } : undefined,
    );
  } catch {
    // jamais bloquant
  }
}
