/**
 * Mes sauvegardes (refonte v2) : creer une sauvegarde, voir son contenu, la restaurer,
 * la partager, la copier dans un dossier cloud, la supprimer. Les outils avances
 * (type, chiffrement, migration, test, retour arriere, questions) restent disponibles.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { ActivityIndicator, Modal, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync } from 'expo-sharing';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card, EspaceHeader, Icon, RoundButton, SectionTitle } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { useCustomPopup } from '@/components/CustomPopup';
import { BackupStatusHeader } from '@/components/BackupStatusHeader';
import { BackupEncryptionToggle } from '@/components/BackupEncryptionToggle';
import { SafetyBackupRestoreButton } from '@/components/SafetyBackupRestoreButton';
import { BackupTypeSelector } from '@/components/BackupTypeSelector';
import { CrossPlatformMigrationButton } from '@/components/CrossPlatformMigrationButton';
import { TestRestoreButton } from '@/components/TestRestoreButton';
import { BackupFaqAccordion } from '@/components/BackupFaqAccordion';
import { exportDataToJSON } from '@/lib/exportService';
import { isEncryptedBackup } from '@/lib/backupEncryption';
import { logger } from '@/lib/security/logger';
import {
  copyToCloudFolder,
  disconnectCloudFolder,
  getSavedCloudFolder,
  listCloudBackups,
  pickCloudFolder,
  readCloudBackupFile,
  type CloudBackupFile,
  type CloudFolder,
} from '@/lib/cloudFolderService';
import { ChargementBloc } from '@/components/yoroi/v2/chargement/Chargement';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

interface BackupFile {
  name: string;
  uri: string;
  size: number;
  modifiedAt: number;
  version: string;
  userName: string;
  weightsCount: number;
  trainingsCount: number;
  photosCount: number;
  sleepCount: number;
  hydrationCount: number;
  injuriesCount: number;
  competitionsCount: number;
  clubsCount: number;
  /** 18 octobre 2026 : sauvegarde chiffree, son contenu ne se lit qu'avec le mot de passe */
  protegee?: boolean;
}

const MONTHS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];
const DAYS = [traduire('dimanche'), traduire('lundi'), traduire('mardi'), traduire('mercredi'), traduire('jeudi'), traduire('vendredi'), traduire('samedi')];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', DECIMAL)} Mo`;
}
function formatDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function formatLong(ts: number): string {
  const d = new Date(ts);
  const day = DAYS[d.getDay()];
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} ${formatDay(ts)}`;
}
function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
}
function dateFromFileName(name: string): number {
  try {
    const m = name.match(/yoroi_backup_(\d{4}-\d{2}-\d{2})_(\d{2})h(\d{2})/);
    if (m) return new Date(`${m[1]}T${m[2]}:${m[3]}:00`).getTime();
    const old = name.match(/yoroi_backup_(\d{4}-\d{2}-\d{2})/);
    if (old) return new Date(old[1]).getTime();
  } catch {
    // nom inattendu
  }
  return 0;
}

export default function BackupHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { showPopup, PopupComponent } = useCustomPopup();

  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restoringUri, setRestoringUri] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncingUri, setSyncingUri] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackupFile | null>(null);
  const [cloudFolder, setCloudFolder] = useState<CloudFolder | null>(null);
  const [cloudBackups, setCloudBackups] = useState<CloudBackupFile[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [restoringCloud, setRestoringCloud] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(false);

  const loadBackups = useCallback(async () => {
    try {
      const dir = FileSystem.documentDirectory!;
      const files = await FileSystem.readDirectoryAsync(dir);
      const list: BackupFile[] = [];
      for (const name of files.filter((f) => f.startsWith('yoroi_backup_') && f.endsWith('.json'))) {
        const uri = `${dir}${name}`;
        try {
          const info = (await FileSystem.getInfoAsync(uri)) as any;
          if (!info.exists) continue;
          const b: BackupFile = {
            name, uri, size: info.size || 0,
            modifiedAt: dateFromFileName(name) || (info.modificationTime ? info.modificationTime * 1000 : Date.now()),
            version: '?', userName: '?', weightsCount: 0, trainingsCount: 0, photosCount: 0, sleepCount: 0,
            hydrationCount: 0, injuriesCount: 0, competitionsCount: 0, clubsCount: 0,
          };
          try {
            const p = JSON.parse(await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 }));
            const n = (x: unknown) => (Array.isArray(x) ? x.length : 0);
            b.protegee = isEncryptedBackup(p);
            b.version = p.version || '?';
            b.userName = p.profile?.name || '?';
            b.weightsCount = n(p.weights);
            b.trainingsCount = n(p.trainings);
            b.photosCount = n(p.photos);
            b.sleepCount = n(p.sleep);
            b.hydrationCount = n(p.hydration);
            b.injuriesCount = n(p.injuries);
            b.competitionsCount = n(p.competitions);
            b.clubsCount = n(p.clubs);
          } catch {
            // fichier chiffre ou illisible : on garde les infos de base
          }
          list.push(b);
        } catch {
          // ignore
        }
      }
      list.sort((a, b) => b.modifiedAt - a.modifiedAt);
      setBackups(list);
    } catch (error) {
      logger.error('[BackupHistory] Erreur chargement:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadCloud = useCallback(async () => {
    const folder = await getSavedCloudFolder().catch(() => null);
    setCloudFolder(folder);
    setCloudBackups(folder ? await listCloudBackups().catch(() => []) : []);
  }, []);

  useEffect(() => { loadBackups(); loadCloud(); }, [loadBackups, loadCloud]);

  const onRefresh = () => { setRefreshing(true); loadBackups(); loadCloud(); };

  const newBackup = async () => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    setCreating(true);
    try {
      await exportDataToJSON();
      await loadBackups();
      if (cloudFolder) await loadCloud();
    } finally {
      setCreating(false);
    }
  };

  const download = async (b: BackupFile) => {
    try {
      await shareAsync(b.uri, { mimeType: 'application/json', dialogTitle: traduire('Partager cette sauvegarde'), UTI: 'public.json' });
    } catch (e) {
      logger.error('[BackupHistory] Erreur téléchargement:', e);
    }
  };

  const copyCloud = async (b: BackupFile) => {
    setSyncingUri(b.uri);
    try {
      const clean = b.uri.startsWith('file://') ? decodeURIComponent(b.uri.slice(7)) : b.uri;
      if (await copyToCloudFolder(clean)) {
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        await loadCloud();
      }
    } catch (e) {
      logger.error('[BackupHistory] Erreur copie cloud:', e);
    } finally {
      setSyncingUri(null);
    }
  };

  const restoreRaw = async (content: string): Promise<boolean> => {
    let raw = JSON.parse(content);
    // 18 octobre 2026 : une sauvegarde protegee (chiffrement actif) s'ouvre d'abord, avec le mot de passe
    // garde sur ce telephone, sinon celui que tu tapes. Avant, elle etait refusee comme « Fichier invalide ».
    const enc = await import('@/lib/backupEncryption');
    if (enc.isEncryptedBackup(raw)) {
      let opened: unknown = null;
      const stored = await enc.getStoredEncryptionPassword().catch(() => null);
      if (stored) {
        try { opened = enc.decryptBackup(raw, stored); } catch { opened = null; }
      }
      if (!opened) {
        const { requestPassword } = await import('@/lib/passwordPromptController');
        const pwd = await requestPassword({ title: traduire('Sauvegarde protégée'), message: traduire('Cette sauvegarde est protégée par un mot de passe. Tape-le pour continuer.'), confirmLabel: traduire('Ouvrir') });
        if (!pwd) return false;
        try {
          opened = enc.decryptBackup(raw, pwd);
        } catch {
          showPopup(traduire('Mot de passe incorrect'), traduire('Vérifie ton mot de passe, puis réessaie.'));
          return false;
        }
      }
      raw = opened;
    }
    const { validateBackup } = await import('@/lib/backupMigrationService');
    const v = validateBackup(raw);
    if (!v.valid) {
      showPopup(traduire('Fichier invalide'), v.errors.join('\n'));
      return false;
    }
    const { importDataFromBackupObject } = await import('@/lib/exportService');
    // Le fichier est passe tel quel : l'empreinte est verifiee sur l'original, puis il est mis au format actuel
    return !!(await importDataFromBackupObject(raw));
  };

  const restore = (b: BackupFile) => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    showPopup(traduire('Restaurer cette sauvegarde ?'), traduire("{0}, {1}.\n\nCes données s’ajoutent à tes données actuelles.", formatDay(b.modifiedAt), b.protegee ? 'sauvegarde protégée par un mot de passe' : `${b.weightsCount} pesées et ${b.trainingsCount} séances`), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Restaurer'),
        style: 'primary',
        onPress: async () => {
          setRestoringUri(b.uri);
          try {
            const ok = await restoreRaw(await FileSystem.readAsStringAsync(b.uri, { encoding: FileSystem.EncodingType.UTF8 }));
            if (ok) {
              notificationAsync(NotificationFeedbackType.Success).catch(() => {});
              showPopup(traduire('Restauration réussie'), traduire('Tes données sont revenues.'), [{ text: 'OK', style: 'primary', onPress: () => router.replace('/(tabs)' as any) }]);
            }
          } catch (e) {
            logger.error('[BackupHistory] Erreur restauration:', e);
            showPopup(traduire('Oups'), traduire('Cette sauvegarde n’a pas pu être restaurée.'));
          } finally {
            setRestoringUri(null);
          }
        },
      },
    ]);
  };

  const remove = (b: BackupFile) => {
    showPopup(traduire('Supprimer cette sauvegarde ?'), traduire("{0}, {1}. C’est définitif.", formatDay(b.modifiedAt), formatSize(b.size)), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: async () => {
          try {
            await FileSystem.deleteAsync(b.uri, { idempotent: true });
            notificationAsync(NotificationFeedbackType.Success).catch(() => {});
            setBackups((p) => p.filter((x) => x.uri !== b.uri));
          } catch {
            showPopup(traduire('Oups'), traduire('Ce fichier n’a pas pu être supprimé.'));
          }
        },
      },
    ]);
  };

  const connectCloud = async () => {
    setConnecting(true);
    try {
      const folder = await pickCloudFolder();
      if (folder) {
        setCloudFolder(folder);
        setCloudBackups(await listCloudBackups().catch(() => []));
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      }
    } catch {
      showPopup(traduire('Oups'), traduire('Le dossier n’a pas pu être connecté.'));
    } finally {
      setConnecting(false);
    }
  };

  const disconnectCloud = () => {
    showPopup(traduire('Déconnecter le dossier ?'), traduire("« {0} » sera déconnecté. Tes sauvegardes locales restent intactes.", cloudFolder?.displayName), [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Déconnecter'), style: 'primary', onPress: async () => { await disconnectCloudFolder(); setCloudFolder(null); setCloudBackups([]); } },
    ]);
  };

  const restoreCloud = (f: CloudBackupFile) => {
    showPopup(traduire('Restaurer depuis le cloud ?'), traduire("{0}, {1}.\n\nCes données s’ajoutent à tes données actuelles.", formatDay(f.modifiedAt), formatSize(f.size)), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Restaurer'),
        style: 'primary',
        onPress: async () => {
          setRestoringCloud(f.name);
          try {
            const content = await readCloudBackupFile(f.name);
            if (!content) { showPopup(traduire('Oups'), traduire('Le fichier cloud est illisible.')); return; }
            if (await restoreRaw(content)) {
              notificationAsync(NotificationFeedbackType.Success).catch(() => {});
              showPopup(traduire('Restauration réussie'), traduire('Tes données sont revenues.'), [{ text: 'OK', style: 'primary', onPress: () => router.replace('/(tabs)' as any) }]);
            }
          } catch {
            showPopup(traduire('Oups'), traduire('Cette sauvegarde cloud n’a pas pu être restaurée.'));
          } finally {
            setRestoringCloud(null);
          }
        },
      },
    ]);
  };

  const latest = backups[0];
  const ageDays = latest ? Math.floor((Date.now() - latest.modifiedAt) / 86400000) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />}
      >
        <EspaceHeader title={traduire("Mes sauvegardes")} />

        <View style={{ borderRadius: 22, backgroundColor: c.darkCard, padding: 18, gap: 14, overflow: 'hidden' }}>
          <Glyph kind="sakura" size={150} color="#242833" style={{ position: 'absolute', right: -24, top: -34 }} />
          <View style={{ gap: 4 }}>
            <Ink size={44} weight="black" tight color={c.onDark}>{loading ? ' ' : String(backups.length)}</Ink>
            <Ink size={14} color={c.onDarkSecondary}>
              {loading ? traduire('Recherche de tes sauvegardes') : latest ? traduirePluriel(backups.length, backups.length > 1, "sauvegarde sur ce téléphone, la dernière {0}", "sauvegardes sur ce téléphone, la dernière {0}", ageDays === 0 ? 'aujourd’hui' : ageDays === 1 ? 'hier' : `il y a ${ageDays} jours`) : traduire('Aucune sauvegarde pour l’instant')}
            </Ink>
          </View>
          <Button tone="gold" icon="plus" label={creating ? traduire('Création') : traduire('Nouvelle sauvegarde')} loading={creating} onPress={newBackup} />
        </View>

        {loading ? (
          <ChargementBloc />
        ) : backups.length === 0 ? (
          <Card style={{ padding: 18, gap: 6, alignItems: 'center' }}>
            <Icon name="archive" size={34} color={c.textMuted} />
            <Ink size={16} weight="extraBold">{traduire("Ta bibliothèque est vide")}</Ink>
            <Ink size={14} color={c.textSecondary} style={{ textAlign: 'center' }}>{traduire("Crée ta première sauvegarde. Elle garde ton historique si tu changes de téléphone.")}</Ink>
          </Card>
        ) : (
          <>
            <SectionTitle title={traduire("Sur ce téléphone")} />
            {backups.map((b, i) => (
              <Pressable key={b.uri} onPress={() => setPreview(b)} accessibilityRole="button" accessibilityLabel={traduire("Sauvegarde du {0}", formatDay(b.modifiedAt))}>
                <Card style={{ padding: 14, gap: 12, borderColor: i === 0 ? c.ink : c.border, borderWidth: i === 0 ? 2 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: i === 0 ? c.ink : c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="archive" size={20} color={i === 0 ? c.goldLight : c.ink} />
                    </View>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Ink size={16} weight="extraBold">{formatDay(b.modifiedAt)}</Ink>
                      <Ink size={12} color={c.textMuted}>{b.protegee ? `${formatTime(b.modifiedAt)}, ${formatSize(b.size)}` : `${formatTime(b.modifiedAt)}, ${formatSize(b.size)}, version ${b.version}`}</Ink>
                    </View>
                    {i === 0 ? (
                      <View style={{ backgroundColor: c.successTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Ink size={11} weight="extraBold" color={c.successText}>{traduire("La plus récente")}</Ink>
                      </View>
                    ) : null}
                  </View>
                  {b.protegee ? (
                    <Protegee />
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Stat n={b.weightsCount} label={traduire("pesées")} />
                      <Stat n={b.trainingsCount} label={traduire("séances")} />
                      <Stat n={b.photosCount} label="photos" />
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Action icon="restore" label={traduire("Restaurer")} busy={restoringUri === b.uri} onPress={() => restore(b)} />
                    <Action icon={cloudFolder ? 'upload' : 'share'} label={cloudFolder ? traduire('Vers le cloud') : traduire('Partager')} busy={syncingUri === b.uri} onPress={() => (cloudFolder ? copyCloud(b) : download(b))} />
                    <Action icon="trash" label={traduire("Supprimer")} danger onPress={() => remove(b)} />
                  </View>
                </Card>
              </Pressable>
            ))}
          </>
        )}

        {Platform.OS === 'ios' ? (
          <>
            <SectionTitle title={traduire("Dossier cloud")} sub={traduire("iCloud Drive, Google Drive, Dropbox")} />
            <Card>
              {cloudFolder ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                    <Icon name="archive" size={20} color={c.indigo} />
                    <View style={{ flex: 1 }}>
                      <Ink size={15} weight="extraBold" numberOfLines={1}>{cloudFolder.displayName}</Ink>
                      <Ink size={12} color={c.textMuted}>{cloudBackups.length ? traduirePluriel(cloudBackups.length, cloudBackups.length > 1, "{0} sauvegarde", "{0} sauvegardes", cloudBackups.length) : traduire('Aucune sauvegarde dans ce dossier')}</Ink>
                    </View>
                    <RoundButton icon="close" label={traduire("Déconnecter le dossier")} onPress={disconnectCloud} />
                  </View>
                  {cloudBackups.map((f) => (
                    <View key={f.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderColor: c.divider }}>
                      <View style={{ flex: 1 }}>
                        <Ink size={14} weight="bold">{`${formatDay(f.modifiedAt)}, ${formatTime(f.modifiedAt)}`}</Ink>
                        <Ink size={12} color={c.textMuted}>{formatSize(f.size)}</Ink>
                      </View>
                      <Button small tone="ghost" label={traduire("Restaurer")} loading={restoringCloud === f.name} onPress={() => restoreCloud(f)} />
                    </View>
                  ))}
                </>
              ) : (
                <Pressable onPress={connectCloud} disabled={connecting} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 60 }}>
                  {connecting ? <ActivityIndicator color={c.accent} /> : <Icon name="plus" size={20} color={c.accent} />}
                  <View style={{ flex: 1 }}>
                    <Ink size={15} weight="extraBold">{traduire("Connecter un dossier cloud")}</Ink>
                    <Ink size={12} color={c.textMuted}>{traduire("Une copie de chaque sauvegarde, hors du téléphone")}</Ink>
                  </View>
                  <Icon name="chevron" size={16} color={c.textMuted} />
                </Pressable>
              )}
            </Card>
          </>
        ) : null}

        <Pressable onPress={() => setShowTools((v) => !v)} accessibilityRole="button" style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
          <Ink size={19} weight="black" tight style={{ flex: 1 }}>{traduire("Outils avancés")}</Ink>
          <Icon name={showTools ? 'up' : 'down'} size={18} />
        </Pressable>
        {showTools ? (
          <View style={{ gap: 12 }}>
            <BackupStatusHeader />
            <BackupTypeSelector />
            <CrossPlatformMigrationButton />
            <TestRestoreButton />
            <SafetyBackupRestoreButton />
            <BackupEncryptionToggle />
            <BackupFaqAccordion />
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={!!preview} transparent animationType="slide" onRequestClose={() => setPreview(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(29,32,41,0.45)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setPreview(null)} accessibilityLabel={traduire("Fermer")} />
          {preview ? (
            <View style={{ backgroundColor: c.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 10, paddingBottom: insets.bottom + 22, gap: 14 }}>
              <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Ink size={22} weight="black" tight>{formatLong(preview.modifiedAt)}</Ink>
                  <Ink size={13} color={c.textMuted}>{preview.protegee ? `${formatTime(preview.modifiedAt)}, ${formatSize(preview.size)}` : `${formatTime(preview.modifiedAt)}, ${formatSize(preview.size)}, version ${preview.version}`}</Ink>
                  {preview.userName !== '?' ? <Ink size={13} weight="bold" color={c.indigo}>{traduire("Profil de {0}", preview.userName)}</Ink> : null}
                </View>
                <RoundButton icon="close" label={traduire("Fermer")} onPress={() => setPreview(null)} />
              </View>
              {preview.protegee ? <Protegee /> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, display: preview.protegee ? 'none' : 'flex' }}>
                {([
                  ['scale', traduire('Pesées'), preview.weightsCount],
                  ['dumbbell', traduire('Séances'), preview.trainingsCount],
                  ['camera', 'Photos', preview.photosCount],
                  ['moon', traduire('Sommeil'), preview.sleepCount],
                  ['drop', traduire('Hydratation'), preview.hydrationCount],
                  ['heart', traduire('Blessures'), preview.injuriesCount],
                  ['trophy', traduire('Compétitions'), preview.competitionsCount],
                  ['home', traduire('Clubs'), preview.clubsCount],
                ] as [IconName, string, number][]).map(([icon, label, n]) => (
                  <View key={label} style={{ width: '23%', flexGrow: 1, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 10, gap: 4, alignItems: 'center' }}>
                    <Icon name={icon} size={16} color={c.accent} />
                    <Ink size={18} weight="black" tight>{String(n)}</Ink>
                    <Ink size={11} color={c.textMuted} numberOfLines={1}>{label}</Ink>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Button tone="ink" icon="restore" label={traduire("Restaurer")} onPress={() => { const b = preview; setPreview(null); setTimeout(() => restore(b), 300); }} /></View>
                <View style={{ flex: 1 }}><Button tone="ghost" icon="share" label={traduire("Partager")} onPress={() => { const b = preview; setPreview(null); setTimeout(() => download(b), 300); }} /></View>
              </View>
              <Pressable onPress={() => { const b = preview; setPreview(null); setTimeout(() => remove(b), 300); }} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={14} weight="extraBold" color={c.danger}>{traduire("Supprimer cette sauvegarde")}</Ink>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>

      <PopupComponent />
    </View>
  );
}

/** 18 octobre 2026 : a la place de faux zeros, une sauvegarde chiffree le dit */
function Protegee() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, backgroundColor: c.fillSoft, paddingVertical: 10, paddingHorizontal: 12 }}>
      <Icon name="lock" size={16} color={c.indigo} />
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={14} weight="extraBold">{traduire("Sauvegarde protégée")}</Ink>
        <Ink size={11} color={c.textMuted}>{traduire("Son contenu s’affiche avec ton mot de passe, au moment de la restaurer.")}</Ink>
      </View>
    </View>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, borderRadius: 12, backgroundColor: c.fillSoft, paddingVertical: 8, alignItems: 'center' }}>
      <Ink size={17} weight="black" tight>{String(n)}</Ink>
      <Ink size={11} color={c.textMuted}>{label}</Ink>
    </View>
  );
}

function Action({ icon, label, onPress, busy, danger }: { icon: IconName; label: string; onPress: () => void; busy?: boolean; danger?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: danger ? c.dangerTint : c.fillSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}
    >
      {busy ? <ActivityIndicator color={c.ink} size="small" /> : <Icon name={icon} size={15} color={danger ? c.danger : c.ink} stroke={2.4} />}
      <Ink size={12} weight="extraBold" color={danger ? c.danger : c.ink} numberOfLines={1}>{label}</Ink>
    </Pressable>
  );
}
