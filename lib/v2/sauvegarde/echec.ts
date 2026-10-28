/**
 * Message honnete si la preparation des donnees a echoue au lancement (migrations de la base).
 * Rien n'est efface dans ce cas : les migrations ne font qu'ajouter des tables et des colonnes,
 * et une copie de securite a ete faite juste avant (voir avantMiseAJour.ts).
 */
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { illustrer } from '@/components/yoroi/v2/messages/illustrer';
import { logger } from '@/lib/security/logger';
import { buildShareableSafetyFile, getLastSafetySnapshot } from './avantMiseAJour';
import { traduire } from '@/lib/i18n/tr';

let shown = false;

export async function annoncerEchecMiseAJour(err: unknown): Promise<void> {
  if (shown) return;
  shown = true;
  logger.error('[Securite] Preparation des donnees echouee', err);
  const snap = await getLastSafetySnapshot().catch(() => null);
  const copie = snap && snap.db === 'ok';
  const illustration = await illustrer('abri');
  appAlert(
    traduire('Tes données sont à l’abri'),
    copie
      ? traduire('YOROI n’a pas réussi à préparer tes données pour cette version. Rien n’a été effacé, et une copie de sécurité a été faite sur ce téléphone juste avant. Ferme YOROI, puis ouvre YOROI de nouveau. Si ce message revient, garde cette copie dans ton cloud et écris nous un mot (Réglages, Aide et questions).')
      : traduire('YOROI n’a pas réussi à préparer tes données pour cette version. Rien n’a été effacé. Ferme YOROI, puis ouvre YOROI de nouveau. Si ce message revient, contacte nous avant de supprimer l’app (Réglages, Aide et questions).'),
    copie
      ? [
          { text: 'OK', style: 'cancel' },
          {
            text: traduire('Garder la copie'),
            onPress: () => {
              void (async () => {
                const file = await buildShareableSafetyFile(snap);
                if (!file) return;
                const Sharing = await import('expo-sharing');
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(file, { mimeType: 'application/json', dialogTitle: traduire('Garder la copie dans ton cloud'), UTI: 'public.json' });
                }
              })().catch((e) => logger.warn('[Securite] partage de la copie impossible', e));
            },
          },
        ]
      : [{ text: 'OK' }],
    illustration ? { illustration } : undefined,
  );
}
