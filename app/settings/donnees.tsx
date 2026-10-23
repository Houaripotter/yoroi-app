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
    showPopup('Restaurer une sauvegarde', 'Choisis ton fichier de sauvegarde YOROI. Les anciennes versions sont reconnues automatiquement.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Choisir le fichier',
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
    showPopup('Bilan en PDF', 'Un bilan de ta progression, prêt à partager avec ton coach ou ton médecin.', [
      { text: 'Annuler', style: 'cancel' },
      { text: '30 jours', style: 'default', onPress: () => generateProgressPDF('30j').catch(() => showPopup('Oups', 'Le bilan n’a pas pu être créé.')) },
      { text: '90 jours', style: 'primary', onPress: () => generateProgressPDF('90j').catch(() => showPopup('Oups', 'Le bilan n’a pas pu être créé.')) },
    ]);
  };

  const handleDedupe = () => {
    showPopup('Nettoyer les doublons', `Les séances en double venues ${Platform.OS === 'android' ? 'de Health Connect' : 'd’Apple Santé'} seront supprimées. Celles que tu as créées toi-même ne bougent pas.\n\nFais une sauvegarde avant, par sécurité.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Nettoyer',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const n = await deduplicateTrainings();
            DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
            showPopup(n === 0 ? 'Aucun doublon' : 'Nettoyage terminé', n === 0 ? 'Ton journal est déjà propre.' : `${n} séance${n > 1 ? 's' : ''} en double supprimée${n > 1 ? 's' : ''}.`);
          } catch (e) {
            logger.error('[Donnees] doublons', e);
            showPopup('Oups', 'Le nettoyage n’a pas abouti. Réessaie.');
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
      showPopup('Diagnostic', 'Disponible sur iPhone, avec Apple Santé.');
      return;
    }
    setBusy(true);
    try {
      const { healthConnect } = await import('@/lib/healthConnect');
      const fn = (healthConnect as unknown as { exportRawWorkoutsForDiagnostic?: (d: number) => Promise<{ path: string; count: number } | null> }).exportRawWorkoutsForDiagnostic;
      const res = fn ? await fn.call(healthConnect, 30) : null;
      setBusy(false);
      if (!res) {
        showPopup('Diagnostic', 'Apple Santé n’a rien renvoyé. Vérifie que Yoroi a accès aux entraînements et à la fréquence cardiaque.');
        return;
      }
      const Sharing = await import('expo-sharing');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.path, { mimeType: 'application/json', dialogTitle: `${res.count} séance${res.count > 1 ? 's' : ''}, 30 derniers jours`, UTI: 'public.json' });
      } else {
        showPopup('Diagnostic', `Fichier prêt : ${res.path}`);
      }
    } catch (e) {
      setBusy(false);
      logger.warn('[Diagnostic] Export des séances impossible', e);
      showPopup('Oups', 'Le fichier de diagnostic n’a pas pu être créé.');
    }
  };

  const handleClearCache = () => {
    showPopup('Vider le cache', 'Les fichiers temporaires seront supprimés. Tes données restent intactes.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Vider',
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
            showPopup('Cache vidé', 'C’est fait.');
          } catch (e) {
            logger.error('[Donnees] cache', e);
            showPopup('Oups', 'Le cache n’a pas pu être vidé.');
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
        showPopup('Indisponible', 'Face ID ou l’empreinte ne sont pas disponibles sur ce téléphone, ou ne sont pas configurés.');
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
  const resetOk = ['SUPPRIMER', 'SUPRIMER', 'EFFACER', 'OUI', 'YES', 'DELETE'].includes(confirmWord);

  const handleResetAll = () => {
    showPopup('Sauvegarde conseillée', 'Avant de tout effacer, garde une copie de tes données.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Sauvegarder d’abord',
        style: 'primary',
        onPress: async () => {
          await exportDataToJSON().catch(() => {});
          setResetText('');
          setResetVisible(true);
        },
      },
      { text: 'Continuer sans', style: 'default', onPress: () => { setResetText(''); setResetVisible(true); } },
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
        showPopup('Tout est effacé', 'L’app repart de zéro.', [{ text: 'OK', style: 'primary', onPress: () => router.replace('/onboarding' as any) }]);
      } else {
        showPopup('Effacement incomplet', 'Presque tout est effacé, mais une partie a résisté. Relance « Tout effacer » pour finir.');
      }
    } catch (e) {
      logger.error('[Donnees] reset', e);
      showPopup('Oups', 'L’effacement n’a pas abouti. Réessaie.');
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
        showPopup('Effacement incomplet', 'Presque tout est effacé, mais une partie a résisté. Réessaie avant de supprimer l’app.');
      }
    } catch (e) {
      logger.error('[Donnees] désinstallation propre', e);
      showPopup('Oups', 'Le nettoyage n’a pas abouti.');
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
    ? `${plural(counts.weights, 'pesée', 'pesées')}, ${plural(counts.trainings, 'séance', 'séances')}${status.storage ? `, ${status.storage}` : ''}`
    : 'Ce qui est stocké, et où';

  return (
    <View style={{ flex: 1 }}>
      <EspaceScreen title="Mes données" subtitle="Elles restent sur ton téléphone" gap={14}>
        <Card>
          <ValueRow first icon="restore" label="Restaurer une sauvegarde" onPress={handleImport} />
          <ValueRow icon="download" label="Exporter" sub="Tableur, fichier complet, texte" onPress={() => go('/export-data')} />
          <ValueRow icon="doc" label="Bilan en PDF" sub="Pour ton coach ou ton médecin" value={isPremium ? undefined : 'Premium'} valueColor={c.goldDeep} onPress={handlePDF} />
        </Card>

        <SectionTitle title="Importer et ranger" />
        <Card>
          <ValueRow first icon="upload" label="Importer un tableur" sub="Pesées et mensurations" onPress={() => go('/import-csv')} />
          <ValueRow icon="dumbbell" label="Importer des séances" sub="Depuis une autre app" onPress={() => go('/import-workouts')} />
          <ValueRow icon="table" label="Tableau du corps" sub="Poids, composition et mensurations" onPress={() => go('/companion')} />
          <ValueRow icon="broom" label="Nettoyer les doublons" sub="Séances importées en double" onPress={handleDedupe} />
          <ValueRow icon="trash" label="Vider le cache" sub="Tes données restent" onPress={handleClearCache} />
          <ValueRow icon="sync" label={Platform.OS === 'ios' ? 'Synchro iPhone et iPad' : 'Synchro entre appareils'} sub="Sans internet" onPress={() => go('/sync-devices')} />
        </Card>

        <SectionTitle title="Confidentialité" />
        <Card>
          {VERROU_DISPONIBLE ? (
            <ToggleRow first icon="lock" label="Verrouiller l’app" sub={Platform.OS === 'ios' ? 'Face ID ou Touch ID à l’ouverture' : 'Empreinte à l’ouverture'} value={bioOn} onChange={handleBiometric} />
          ) : null}
          <ValueRow first={!VERROU_DISPONIBLE} icon="shield" label="Confidentialité" sub={privacySub} onPress={() => go('/privacy-data')} />
          <ValueRow icon="doc" label="Politique de confidentialité" onPress={() => go('/privacy-policy')} />
        </Card>

        {Platform.OS === 'ios' ? (
          <>
            <SectionTitle title="Diagnostic" />
            <Card>
              <ValueRow first icon="doc" label="Exporter les données brutes des séances" sub="30 derniers jours, pour caler tes zones cardiaques" onPress={handleDiagnostic} />
            </Card>
          </>
        ) : null}

        <SectionTitle title="Zone sensible" />
        <Card>
          <ValueRow first danger icon="exit" label="Désinstallation propre" sub="Tout effacer avant de supprimer l’app" onPress={() => { setCleanStep(0); setCleanVisible(true); }} />
          <ValueRow danger icon="trash" label="Tout effacer" sub="Repartir de zéro, c’est définitif" onPress={handleResetAll} />
        </Card>
      </EspaceScreen>

      {busy ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(242,241,236,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: c.surface, borderRadius: 20, padding: 24 }}>
            <ChargementPetit size={34} />
          </View>
        </View>
      ) : null}

      <Sheet visible={resetVisible} onClose={() => setResetVisible(false)} title="Tout effacer">
        <View style={{ backgroundColor: c.dangerTint, borderRadius: 18, padding: 14, gap: 6 }}>
          <Ink size={15} weight="extraBold" color={c.danger}>C’est définitif</Ink>
          <Ink size={14} color={c.textSecondary}>{TEXTE_EFFACE}</Ink>
        </View>
        <Ink size={14} color={c.textSecondary}>{texteResteEnDehors(Platform.OS)}</Ink>
        <Ink size={14} weight="bold">Écris SUPPRIMER pour confirmer</Ink>
        <TextInput
          value={resetText}
          onChangeText={setResetText}
          placeholder="SUPPRIMER"
          placeholderTextColor={c.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel="Mot de confirmation"
          style={{ height: 52, borderRadius: 14, borderWidth: 2, borderColor: resetOk ? c.success : c.border, backgroundColor: c.surface, paddingHorizontal: 14, fontSize: 17, fontWeight: '800', color: c.ink }}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Button tone="ghost" label="Annuler" onPress={() => setResetVisible(false)} /></View>
          <View style={{ flex: 1 }}><Button tone="danger" label="Tout effacer" disabled={!resetOk} onPress={confirmReset} /></View>
        </View>
      </Sheet>

      <Sheet visible={cleanVisible} onClose={closeCleanSheet} title="Désinstallation propre">
        {cleanStep === 0 ? (
          <>
            <Ink size={14} color={c.textSecondary}>
              Avant de supprimer YOROI, efface tout ce qu’il a gardé sur ton téléphone. Pense à faire une sauvegarde si tu veux revenir un jour.
            </Ink>
            <Ink size={14} color={c.textSecondary}>{TEXTE_EFFACE}</Ink>
            <Ink size={14} color={c.textSecondary}>{texteResteEnDehors(Platform.OS)}</Ink>
            <Button tone="danger" icon="trash" label="Effacer les données de YOROI" onPress={handleCleanUninstall} />
            <Button tone="ghost" label="Annuler" onPress={() => setCleanVisible(false)} />
          </>
        ) : (
          <>
            <View style={{ backgroundColor: c.successTint, borderRadius: 18, padding: 14, gap: 4 }}>
              <Ink size={15} weight="extraBold" color={c.successText}>Données effacées</Ink>
              <Ink size={14} color={c.textSecondary}>{Platform.OS === 'ios' ? 'Il reste deux étapes, à faire toi-même.' : 'Il reste une étape, à faire toi-même.'}</Ink>
            </View>
            {Platform.OS === 'ios' ? (
              <>
                <Ink size={15} weight="extraBold">1. Apple Santé</Ink>
                <Ink size={14} color={c.textSecondary}>Dans Santé, profil, Apps, YOROI : retire les autorisations et supprime les données écrites par l’app si tu le souhaites.</Ink>
                <Button tone="accent" label="Ouvrir Santé" onPress={() => safeOpenURL('x-apple-health://')} />
              </>
            ) : null}
            <Ink size={15} weight="extraBold">{Platform.OS === 'ios' ? '2. Autorisations' : '1. Autorisations'}</Ink>
            <Ink size={14} color={c.textSecondary}>Coupe les autorisations restantes (notifications, photos, caméra) puis supprime l’app depuis l’écran d’accueil.</Ink>
            <Button tone="accent" label="Ouvrir les réglages du téléphone" onPress={() => Linking.openSettings()} />
            <Button tone="ghost" label="Terminé" onPress={closeCleanSheet} />
          </>
        )}
      </Sheet>

      <PopupComponent />
    </View>
  );
}
