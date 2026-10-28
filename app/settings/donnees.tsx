/**
 * Mes donnees (sous-page de Reglages) : restaurer, exporter, bilan PDF, imports, tableau des mesures,
 * nettoyage, synchro entre appareils, confidentialite, verrouillage, et tout en bas la zone sensible.
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Linking, Platform, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card, EspaceScreen, SectionTitle, ToggleRow } from '@/components/yoroi/v2/espace/ui';
import { Sheet, ValueRow } from '@/components/yoroi/v2/espace/reglages/parts';
import { plural, useEspaceStatus } from '@/components/yoroi/v2/espace/reglages/useEspaceStatus';
import { useCustomPopup } from '@/components/CustomPopup';
import { safeOpenURL } from '@/lib/security/validators';
import { exportDataToJSON, importDataFromJSON } from '@/lib/exportService';
import { generateProgressPDF } from '@/lib/pdfExport';
import { effacerToutesMesDonnees } from '@/lib/storage';
import { TEXTE_EFFACE, texteResteEnDehors } from '@/lib/effacementPlan';
import { deduplicateTrainings } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { usePremium } from '@/context/PremiumContext';
import { isBiometricHardwareAvailable, isBiometricLockEnabled, setBiometricLockEnabled } from '@/lib/biometricLockService';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

// Version 3.0.0 : « Verrouiller l'app » est masqué. Le module expo-local-authentication n'est pas
// installé (absent de package.json et de node_modules), donc le verrou répondait toujours
// « pas disponible sur ce téléphone ». Le code reste en place : passer à true après l'installation
// du module et un nouveau build natif.
const VERROU_DISPONIBLE = false;

export default function MesDonnees() {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { showPopup, PopupComponent } = useCustomPopup();
  const { isPremium } = usePremium();
  const { status, reload: reloadStatus } = useEspaceStatus();

  const [busy, setBusy] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [resetText, setResetText] = useState('');
  const [cleanVisible, setCleanVisible] = useState(false);
  const [cleanStep, setCleanStep] = useState(0);

  useEffect(() => {
    isBiometricLockEnabled().then(setBioOn).catch(() => {});
  }, []);

  const go = (href: string) => router.push(href as any);

  const handleImport = () => {
    showPopup(traduire('Restaurer une sauvegarde'), traduire('Choisis ton fichier de sauvegarde YOROI. Les anciennes versions sont reconnues automatiquement.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Choisir le fichier'),
        style: 'primary',
        onPress: async () => {
          try {
            const ok = await importDataFromJSON();
            if (ok) {
              notificationAsync(NotificationFeedbackType.Success).catch(() => {});
              DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
              router.push('/(tabs)' as any);
            }
          } catch (error) {
            logger.error('[Donnees] import', error);
            notificationAsync(NotificationFeedbackType.Error).catch(() => {});
          }
        },
      },
    ]);
  };

  const handlePDF = () => {
    // Le bilan PDF reste Premium
    if (!isPremium) {
      router.push('/paywall' as any);
      return;
    }
    showPopup(traduire('Bilan en PDF'), traduire('Un bilan de ta progression, prêt à partager avec ton coach ou ton médecin.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('30 jours'), style: 'default', onPress: () => generateProgressPDF('30j').catch(() => showPopup(traduire('Oups'), traduire('Le bilan n’a pas pu être créé.'))) },
      { text: traduire('90 jours'), style: 'primary', onPress: () => generateProgressPDF('90j').catch(() => showPopup(traduire('Oups'), traduire('Le bilan n’a pas pu être créé.'))) },
    ]);
  };

  const handleDedupe = () => {
    showPopup(traduire('Nettoyer les doublons'), traduire("Les séances en double venues {0} seront supprimées. Celles que tu as créées ne bougent pas.\n\nFais une sauvegarde avant, par sécurité.", Platform.OS === 'android' ? traduire('de Health Connect') : traduire('d’Apple Santé')), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Nettoyer'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const n = await deduplicateTrainings();
            DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
            showPopup(n === 0 ? traduire('Aucun doublon') : traduire('Nettoyage terminé'), n === 0 ? traduire('Ton journal est déjà propre.') : traduirePluriel(n, n > 1, "{0} séance en double supprimée.", "{0} séances en double supprimées.", n));
          } catch (e) {
            logger.error('[Donnees] doublons', e);
            showPopup(traduire('Oups'), traduire('Le nettoyage n’a pas abouti. Réessaie.'));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  // 14 octobre 2026 (zones_apple) : fichier brut des séances Apple, pour caler les zones sur Forme
  const handleDiagnostic = async () => {
    if (Platform.OS !== 'ios') {
      showPopup(traduire('Diagnostic'), traduire('Disponible sur iPhone, avec l’app Santé de ton téléphone.'));
      return;
    }
    setBusy(true);
    try {
      const { healthConnect } = await import('@/lib/healthConnect');
      const fn = (healthConnect as unknown as { exportRawWorkoutsForDiagnostic?: (d: number) => Promise<{ path: string; count: number } | null> }).exportRawWorkoutsForDiagnostic;
      const res = fn ? await fn.call(healthConnect, 30) : null;
      setBusy(false);
      if (!res) {
        showPopup(traduire('Diagnostic'), traduire('L’app Santé de ton téléphone n’a rien renvoyé. Vérifie que Yoroi a accès aux entraînements et à la fréquence cardiaque.'));
        return;
      }
      const Sharing = await import('expo-sharing');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.path, { mimeType: 'application/json', dialogTitle: traduirePluriel(res.count, res.count > 1, "{0} séance, 30 derniers jours", "{0} séances, 30 derniers jours", res.count), UTI: 'public.json' });
      } else {
        showPopup(traduire('Diagnostic'), traduire("Fichier prêt : {0}", res.path));
      }
    } catch (e) {
      setBusy(false);
      logger.warn('[Diagnostic] Export des séances impossible', e);
      showPopup(traduire('Oups'), traduire('Le fichier de diagnostic n’a pas pu être créé.'));
    }
  };

  const handleClearCache = () => {
    showPopup(traduire('Vider le cache'), traduire('Les fichiers temporaires seront supprimés. Tes données restent intactes.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Vider'),
        style: 'primary',
        onPress: async () => {
          setBusy(true);
          try {
            const dir = FileSystem.cacheDirectory;
            if (dir) {
              // 18 octobre 2026 : le dossier ImagePicker reste. Les photos et videos des fiches partenaires
              // (combat/partner/MediaAudio) y pointent encore directement : les effacer les ferait disparaitre.
              const items = (await FileSystem.readDirectoryAsync(dir).catch(() => [] as string[])).filter((n) => n !== 'ImagePicker');
              await Promise.all(items.map((n) => FileSystem.deleteAsync(`${dir}${n}`, { idempotent: true }).catch(() => {})));
            }
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter((k) => k.startsWith('@yoroi_preview_') || k.startsWith('@yoroi_cache_') || k.startsWith('@yoroi_tmp_'));
            if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
            notificationAsync(NotificationFeedbackType.Success).catch(() => {});
            reloadStatus();
            showPopup(traduire('Cache vidé'), traduire('C’est fait.'));
          } catch (e) {
            logger.error('[Donnees] cache', e);
            showPopup(traduire('Oups'), traduire('Le cache n’a pas pu être vidé.'));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleBiometric = async (v: boolean) => {
    if (v) {
      const ok = await isBiometricHardwareAvailable();
      if (!ok) {
        showPopup(traduire('Indisponible'), traduire('Face ID ou l’empreinte ne sont pas disponibles sur ce téléphone, ou ne sont pas configurés.'));
        return;
      }
    }
    setBioOn(v);
    await setBiometricLockEnabled(v).catch(() => {});
  };

  // ============================================
  // ZONE SENSIBLE
  // ============================================

  const confirmWord = resetText.trim().toUpperCase();
  const resetOk = ['SUPPRIMER', 'SUPRIMER', 'EFFACER', 'OUI', 'YES', 'DELETE', 'LÖSCHEN', 'LOESCHEN', 'LOSCHEN', 'JA', 'VERWIJDEREN', 'WISSEN', 'ELIMINAR', 'BORRAR', 'EXCLUIR', 'APAGAR', 'ELIMINA', 'CANCELLA'].includes(confirmWord);

  const handleResetAll = () => {
    showPopup(traduire('Sauvegarde conseillée'), traduire('Avant de tout effacer, garde une copie de tes données.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Sauvegarder d’abord'),
        style: 'primary',
        onPress: async () => {
          await exportDataToJSON().catch(() => {});
          setResetText('');
          setResetVisible(true);
        },
      },
      { text: traduire('Continuer sans'), style: 'default', onPress: () => { setResetText(''); setResetVisible(true); } },
    ]);
  };

  const confirmReset = async () => {
    if (!resetOk || busy) return;
    setResetVisible(false);
    setResetText('');
    setBusy(true);
    try {
      const { ok } = await effacerToutesMesDonnees();
      if (ok) {
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        showPopup(traduire('Tout est effacé'), traduire('L’app repart de zéro.'), [{ text: 'OK', style: 'primary', onPress: () => router.replace('/onboarding' as any) }]);
      } else {
        showPopup(traduire('Effacement incomplet'), traduire('Presque tout est effacé, mais une partie a résisté. Relance « Tout effacer » pour finir.'));
      }
    } catch (e) {
      logger.error('[Donnees] reset', e);
      showPopup(traduire('Oups'), traduire('L’effacement n’a pas abouti. Réessaie.'));
    } finally {
      setBusy(false);
    }
  };

  const handleCleanUninstall = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { ok } = await effacerToutesMesDonnees();
      if (ok) {
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        setCleanStep(1);
      } else {
        showPopup(traduire('Effacement incomplet'), traduire('Presque tout est effacé, mais une partie a résisté. Réessaie avant de supprimer l’app.'));
      }
    } catch (e) {
      logger.error('[Donnees] désinstallation propre', e);
      showPopup(traduire('Oups'), traduire('Le nettoyage n’a pas abouti.'));
    } finally {
      setBusy(false);
    }
  };

  // Après l'effacement, l'app repart comme neuve si on ne la supprime pas
  const closeCleanSheet = () => {
    setCleanVisible(false);
    if (cleanStep === 1) router.replace('/onboarding' as any);
  };

  const counts = status.counts;
  const privacySub = counts
    ? `${plural(counts.weights, traduire('pesée'), traduire('pesées'))}, ${plural(counts.trainings, traduire('séance'), traduire('séances'))}${status.storage ? `, ${status.storage}` : ''}`
    : traduire('Ce qui est stocké, et où');

  return (
    <View style={{ flex: 1 }}>
      <EspaceScreen title={traduire("Mes données")} subtitle={traduire("Elles restent sur ton téléphone")} gap={14}>
        <Card>
          <ValueRow first icon="restore" label={traduire("Restaurer une sauvegarde")} onPress={handleImport} />
          <ValueRow icon="download" label={traduire("Exporter")} sub={traduire("Tableur, fichier complet, texte")} onPress={() => go('/export-data')} />
          <ValueRow icon="doc" label={traduire("Bilan en PDF")} sub={traduire("Pour ton coach ou ton médecin")} value={isPremium ? undefined : traduire('Premium')} valueColor={c.goldDeep} onPress={handlePDF} />
        </Card>

        <SectionTitle title={traduire("Importer et ranger")} />
        <Card>
          <ValueRow first icon="upload" label={traduire("Importer un tableur")} sub={traduire("Pesées et mensurations")} onPress={() => go('/import-csv')} />
          <ValueRow icon="dumbbell" label={traduire("Importer des séances")} sub={traduire("Depuis une autre app")} onPress={() => go('/import-workouts')} />
          <ValueRow icon="table" label={traduire("Tableau du corps")} sub={traduire("Poids, composition et mensurations")} onPress={() => go('/companion')} />
          <ValueRow icon="broom" label={traduire("Nettoyer les doublons")} sub={traduire("Séances importées en double")} onPress={handleDedupe} />
          <ValueRow icon="trash" label={traduire("Vider le cache")} sub={traduire("Tes données restent")} onPress={handleClearCache} />
          <ValueRow icon="sync" label={Platform.OS === 'ios' ? traduire('Synchro iPhone et iPad') : traduire('Synchro entre appareils')} sub={traduire("Sans internet")} onPress={() => go('/sync-devices')} />
        </Card>

        <SectionTitle title={traduire("Confidentialité")} />
        <Card>
          {VERROU_DISPONIBLE ? (
            <ToggleRow first icon="lock" label={traduire("Verrouiller l’app")} sub={Platform.OS === 'ios' ? traduire('Face ID ou Touch ID à l’ouverture') : traduire('Empreinte à l’ouverture')} value={bioOn} onChange={handleBiometric} />
          ) : null}
          <ValueRow first={!VERROU_DISPONIBLE} icon="shield" label={traduire("Confidentialité")} sub={privacySub} onPress={() => go('/privacy-data')} />
          <ValueRow icon="doc" label={traduire("Politique de confidentialité")} onPress={() => go('/privacy-policy')} />
        </Card>

        {Platform.OS === 'ios' ? (
          <>
            <SectionTitle title={traduire("Diagnostic")} />
            <Card>
              <ValueRow first icon="doc" label={traduire("Exporter les données brutes des séances")} sub={traduire("30 derniers jours, pour caler tes zones cardiaques")} onPress={handleDiagnostic} />
            </Card>
          </>
        ) : null}

        <SectionTitle title={traduire("Zone sensible")} />
        <Card>
          <ValueRow first danger icon="exit" label={traduire("Désinstallation propre")} sub={traduire("Tout effacer avant de supprimer l’app")} onPress={() => { setCleanStep(0); setCleanVisible(true); }} />
          <ValueRow danger icon="trash" label={traduire("Tout effacer")} sub={traduire("Repartir de zéro, c’est définitif")} onPress={handleResetAll} />
        </Card>
      </EspaceScreen>

      {busy ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(242,241,236,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: c.surface, borderRadius: 20, padding: 24 }}>
            <ChargementPetit size={34} />
          </View>
        </View>
      ) : null}

      <Sheet visible={resetVisible} onClose={() => setResetVisible(false)} title={traduire("Tout effacer")}>
        <View style={{ backgroundColor: c.dangerTint, borderRadius: 18, padding: 14, gap: 6 }}>
          <Ink size={15} weight="extraBold" color={c.danger}>{traduire("C’est définitif")}</Ink>
          <Ink size={14} color={c.textSecondary}>{TEXTE_EFFACE}</Ink>
        </View>
        <Ink size={14} color={c.textSecondary}>{texteResteEnDehors(Platform.OS)}</Ink>
        <Ink size={14} weight="bold">{traduire("Écris SUPPRIMER pour confirmer")}</Ink>
        <TextInput
          value={resetText}
          onChangeText={setResetText}
          placeholder={traduire("SUPPRIMER")}
          placeholderTextColor={c.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel={traduire("Mot de confirmation")}
          style={{ height: 52, borderRadius: 14, borderWidth: 2, borderColor: resetOk ? c.success : c.border, backgroundColor: c.surface, paddingHorizontal: 14, fontSize: 17, fontWeight: '800', color: c.ink }}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Button tone="ghost" label={traduire("Annuler")} onPress={() => setResetVisible(false)} /></View>
          <View style={{ flex: 1 }}><Button tone="danger" label={traduire("Tout effacer")} disabled={!resetOk} onPress={confirmReset} /></View>
        </View>
      </Sheet>

      <Sheet visible={cleanVisible} onClose={closeCleanSheet} title={traduire("Désinstallation propre")}>
        {cleanStep === 0 ? (
          <>
            <Ink size={14} color={c.textSecondary}>
              {traduire("Avant de supprimer YOROI, efface tout ce qu’il a gardé sur ton téléphone. Pense à faire une sauvegarde si tu veux revenir un jour.")}</Ink>
            <Ink size={14} color={c.textSecondary}>{TEXTE_EFFACE}</Ink>
            <Ink size={14} color={c.textSecondary}>{texteResteEnDehors(Platform.OS)}</Ink>
            <Button tone="danger" icon="trash" label={traduire("Effacer les données de YOROI")} onPress={handleCleanUninstall} />
            <Button tone="ghost" label={traduire("Annuler")} onPress={() => setCleanVisible(false)} />
          </>
        ) : (
          <>
            <View style={{ backgroundColor: c.successTint, borderRadius: 18, padding: 14, gap: 4 }}>
              <Ink size={15} weight="extraBold" color={c.successText}>{traduire("Données effacées")}</Ink>
              <Ink size={14} color={c.textSecondary}>{Platform.OS === 'ios' ? traduire('Il reste deux étapes, à faire de ton côté.') : traduire('Il reste une étape, à faire de ton côté.')}</Ink>
            </View>
            {Platform.OS === 'ios' ? (
              <>
                <Ink size={15} weight="extraBold">{traduire("1. Apple Santé")}</Ink>
                <Ink size={14} color={c.textSecondary}>{traduire("Dans Santé, profil, Apps, YOROI : retire les autorisations et supprime les données écrites par l’app si tu le souhaites.")}</Ink>
                <Button tone="accent" label={traduire("Ouvrir Santé")} onPress={() => safeOpenURL('x-apple-health://')} />
              </>
            ) : null}
            <Ink size={15} weight="extraBold">{Platform.OS === 'ios' ? '2. Autorisations' : '1. Autorisations'}</Ink>
            <Ink size={14} color={c.textSecondary}>{traduire("Coupe les autorisations restantes (notifications, photos, caméra) puis supprime l’app depuis l’écran d’accueil.")}</Ink>
            <Button tone="accent" label={traduire("Ouvrir les réglages du téléphone")} onPress={() => Linking.openSettings()} />
            <Button tone="ghost" label={traduire("Terminé")} onPress={closeCleanSheet} />
          </>
        )}
      </Sheet>

      <PopupComponent />
    </View>
  );
}
