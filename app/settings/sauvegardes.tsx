/**
 * Donnees et sauvegardes (13 octobre, soir) : le groupe Tes donnees de la page Reglages, sorti pour la raccourcir.
 * Memes lignes qu'avant : Sauvegarde (avec le bouton Sauvegarder), Copies de securite automatiques,
 * Mes donnees (exporter, effacer), Coffre photos. Le bouton Sauvegarder reste aussi sur la page Reglages.
 * Les marges de l'encoche et du bas (useSafeAreaInsets) sont gerees par EspaceScreen.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Card, EspaceScreen } from '@/components/yoroi/v2/espace/ui';
import { MiniAction, ValueRow } from '@/components/yoroi/v2/espace/reglages/parts';
import { TUILE } from '@/components/yoroi/v2/reglages/kit';
import { backupAgeDays, backupWhen, useEspaceStatus } from '@/components/yoroi/v2/espace/reglages/useEspaceStatus';
import { useCustomPopup } from '@/components/CustomPopup';
import { exportDataToJSON } from '@/lib/exportService';
import { logger } from '@/lib/security/logger';

export default function DonneesEtSauvegardes() {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { showPopup, PopupComponent } = useCustomPopup();
  const { status, reload } = useEspaceStatus();
  const [busy, setBusy] = useState(false);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const backupNow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await exportDataToJSON();
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      reload();
    } catch (e) {
      logger.error('[Reglages] sauvegarde', e);
      showPopup('Oups', 'La sauvegarde n’a pas abouti. Réessaie.');
    } finally {
      setBusy(false);
    }
  };

  const go = (href: string) => router.push(href as any);
  const age = backupAgeDays(status.lastBackup);
  const backupLate = status.lastBackup !== undefined && (age === null || age >= 14);
  const backupSub = status.lastBackup === undefined ? 'Une copie de tes données' : status.lastBackup ? `Dans ton cloud : ${backupWhen(status.lastBackup)}` : 'Aucune copie dans ton cloud';
  const nbPhotos = status.counts?.photos;

  return (
    <EspaceScreen title="Données et sauvegardes" subtitle="Pas de compte : tout reste sur ton téléphone" gap={14}>
      <Card>
        <ValueRow first tint={TUILE.mousse} icon="save" label="Sauvegarde" sub={backupSub} valueColor={backupLate ? c.accent : undefined} onPress={() => go('/backup-history')} action={<MiniAction label="Sauvegarder" onPress={backupNow} busy={busy} />} />
        {/* les copies faites seules avant chaque mise a jour, a voir, partager et remettre */}
        <ValueRow tint={TUILE.ardoise} icon="archive" label="Copies de sécurité automatiques" sub="Faites avant chaque mise à jour" onPress={() => go('/settings/copies-securite')} />
        <ValueRow tint={TUILE.indigo} icon="shield" label="Mes données" value="Exporter, effacer" onPress={() => go('/settings/donnees')} />
        <ValueRow tint={TUILE.or} icon="camera" label="Coffre photos" value={nbPhotos ? `${nbPhotos} photo${nbPhotos > 1 ? 's' : ''}` : undefined} onPress={() => go('/photos')} />
      </Card>
      <PopupComponent />
    </EspaceScreen>
  );
}
