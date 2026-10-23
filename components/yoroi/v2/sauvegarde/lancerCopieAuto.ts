/**
 * 18 octobre 2026 : le geste « Activer la copie automatique », le meme partout (Accueil, Dojo, conseil apres la visite).
 * 1. Une fenetre explique en deux lignes ce qui va se passer et quoi toucher dans le selecteur.
 * 2. Le selecteur de dossier du telephone s'ouvre (iCloud Drive sur iPhone, Google Drive sur Android).
 * 3. La premiere copie part tout de suite, et une fenetre dit si c'est bon.
 * Sans module natif (web, Expo Go) : la copie a la main (feuille de partage), comme avant.
 */
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { activerCopieAuto, nomDuCloud } from '@/lib/v2/sauvegarde/copieAuto';
import { sauvegarderMaintenant } from '@/lib/v2/sauvegarde/rappel';
import { etapesSelecteur } from '@/lib/v2/sauvegarde/textesCopie';
import { traduire } from '@/lib/i18n/tr';

export { etapesSelecteur };

/** Le selecteur puis la premiere copie, sans fenetre d'explication avant (deja donnee) */
export async function choisirDossierEtCopier(apres?: (ok: boolean) => void): Promise<void> {
  const cloud = nomDuCloud();
  const r = await activerCopieAuto();
  if (r === 'ok') {
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    appAlert(traduire('Tes données sont à l’abri'), traduire("Première copie faite dans {0}. La suivante partira demain, toute seule. Si tu changes de téléphone : « J’ai déjà une sauvegarde » au premier écran.", cloud));
    apres?.(true);
  } else if (r === 'non_dispo') {
    await sauvegarderMaintenant();
    apres?.(false);
  } else if (r === 'echec') {
    appAlert(traduire('La copie n’est pas passée'), traduire("Le dossier est bien choisi, mais la première copie n’a pas réussi. Vérifie qu’il reste de la place dans {0}, puis réessaie depuis Réglages, Mes sauvegardes.", cloud));
    apres?.(false);
  } else {
    apres?.(false);
  }
}

/** Lance le geste complet, avec la fenetre d'explication ; apres(vrai) si la copie automatique est active */
export function lancerCopieAuto(apres?: (ok: boolean) => void): void {
  const cloud = nomDuCloud();
  appAlert(
    traduire('Copie automatique'),
    traduire("Tu choisis une fois un dossier dans {0}. Ensuite, YOROI y range une copie de toutes tes données chaque jour, tout seul.\n\n{1}", cloud, etapesSelecteur()),
    [
      { text: traduire('Annuler'), style: 'cancel', onPress: () => apres?.(false) },
      { text: traduire('Choisir le dossier'), isPreferred: true, onPress: () => void choisirDossierEtCopier(apres) },
    ],
  );
}
