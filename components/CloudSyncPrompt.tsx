// ============================================
// CLOUD SYNC PROMPT
// Banner qui apparaît sur l'accueil quand un backup plus récent est détecté
// dans le cloud partagé (ex : iPhone → iPad, Android → tablette).
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, DeviceEventEmitter, Alert, ActivityIndicator } from 'react-native';
import { Cloud, CloudDownload, X, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { acceptCloudSync, dismissCloudSync } from '@/lib/multiDeviceSyncService';
import { computeBackupDiff, formatDiffMessage } from '@/lib/backupDiffService';
import { readCloudBackupFile } from '@/lib/cloudFolderService';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import logger from '@/lib/security/logger';

import { formatRelative, formatSize } from '@/lib/utils/formatDate';

interface PromptData {
  cloudBackupName: string;
  cloudBackupDate: Date;
  cloudBackupSize: number;
}

const CloudSyncPromptInner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [data, setData] = useState<PromptData | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_CLOUD_SYNC_AVAILABLE', (payload: PromptData) => {
      setData({
        ...payload,
        cloudBackupDate: new Date(payload.cloudBackupDate), // rehydrate Date
      });
    });
    return () => sub.remove();
  }, []);

  const handleAccept = useCallback(async () => {
    if (!data) return;
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});

    // ─── DIFF PREVIEW : on calcule ce qui va être ajouté avant de prompter ───
    setSyncing(true);
    let diffMessage = '';
    try {
      const content = await readCloudBackupFile(data.cloudBackupName);
      if (content) {
        const backupData = JSON.parse(content);
        const diff = await computeBackupDiff(backupData);
        diffMessage = formatDiffMessage(diff);
      }
    } catch (e) {
      logger.warn('[CloudSyncPrompt] Diff preview échoué:', e);
    } finally {
      setSyncing(false);
    }

    // Confirmation explicite AVEC le diff calculé
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        '✨ Synchroniser depuis ton autre appareil',
        (diffMessage ? `${diffMessage}\n\n` : '') +
        "• Tes données existantes ne sont PAS supprimées\n" +
        "• En cas de doublons, les plus récentes sont gardées\n" +
        "• Une sauvegarde de sécurité est créée juste avant\n\n" +
        "Continuer ?",
        [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Synchroniser', style: 'default', onPress: () => resolve(true) },
        ]
      );
    });
    if (!confirmed) return;

    setSyncing(true);
    try {
      const ok = await acceptCloudSync(data.cloudBackupName);
      if (ok) {
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        Alert.alert(
          '✨ Synchronisation réussie',
          'Tes données depuis ton autre appareil sont maintenant sur celui-ci.\n\nSi tu constates un problème, une sauvegarde de sécurité a été créée juste avant la synchro — tu peux revenir en arrière depuis Mes sauvegardes.'
        );
        setData(null);
      } else {
        Alert.alert('Erreur', 'Impossible de synchroniser. Réessaie plus tard.');
      }
    } catch (e) {
      logger.error('[CloudSyncPrompt] Erreur:', e);
      Alert.alert('Erreur', 'Impossible de synchroniser.');
    } finally {
      setSyncing(false);
    }
  }, [data]);

  const handleDismiss = useCallback(async () => {
    if (!data) return;
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    await dismissCloudSync(data.cloudBackupDate);
    setData(null);
  }, [data]);

  if (!data) return null;

  const accent = '#0EA5E9';
  const bg = isDark ? 'rgba(14,165,233,0.15)' : '#E0F2FE';

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: `${accent}50` }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${accent}25` }]}>
          <Sparkles size={20} color={accent} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: accent }]}>
            Nouveau contenu depuis un autre appareil
          </Text>
          <Text style={[styles.sub, { color: colors.text }]}>
            Backup créé {formatRelative(data.cloudBackupDate)} · {formatSize(data.cloudBackupSize)}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn} disabled={syncing}>
          <X size={16} color={colors.textMuted ?? '#888'} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.body, { color: colors.text }]}>
        Ton iPhone/Android a créé une sauvegarde plus récente. Tu veux la récupérer ici ?
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleDismiss}
          activeOpacity={0.75}
          disabled={syncing}
          style={[styles.secondaryBtn, { borderColor: `${accent}40` }]}
        >
          <Text style={[styles.secondaryBtnText, { color: accent }]}>Plus tard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleAccept}
          activeOpacity={0.85}
          disabled={syncing}
          style={[styles.primaryBtn, { backgroundColor: accent, opacity: syncing ? 0.7 : 1 }]}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <CloudDownload size={14} color="#fff" strokeWidth={2.5} />
          )}
          <Text style={styles.primaryBtnText}>
            {syncing ? 'Synchronisation…' : 'Synchroniser'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const CloudSyncPrompt = React.memo(CloudSyncPromptInner);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
  sub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  closeBtn: { padding: 4 },
  body: { fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  secondaryBtn: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700' },
});
