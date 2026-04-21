// ============================================
// BACKUP STATUS HEADER
// Affiche un résumé rassurant de l'état des sauvegardes en haut de la page
// backup-history. Montre à l'user que ses données sont en sécurité.
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { Shield, Cloud, CloudOff, CheckCircle2, AlertTriangle, RefreshCw, Share2 } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getLastAutoBackupDate, runAutoBackupIfDue, isAutoBackupEnabled } from '@/lib/autoBackupService';
import { getSavedCloudFolder, CloudFolder } from '@/lib/cloudFolderService';
import { shareLatestBackup } from '@/lib/backupShareService';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

import { formatRelative } from '@/lib/utils/formatDate';

const BackupStatusHeaderInner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [cloud, setCloud] = useState<CloudFolder | null>(null);
  const [triggering, setTriggering] = useState(false);

  const refresh = useCallback(async () => {
    const [d, enabled, cf] = await Promise.all([
      getLastAutoBackupDate(),
      isAutoBackupEnabled(),
      getSavedCloudFolder(),
    ]);
    setLastBackup(d);
    setAutoEnabled(enabled);
    setCloud(cf);
  }, []);

  useEffect(() => {
    refresh();
    const s1 = DeviceEventEmitter.addListener('YOROI_AUTO_BACKUP_DONE', refresh);
    const s2 = DeviceEventEmitter.addListener('YOROI_AUTO_BACKUP_CONFIG_CHANGED', refresh);
    return () => { s1.remove(); s2.remove(); };
  }, [refresh]);

  const handleManualBackup = async () => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    setTriggering(true);
    try {
      await runAutoBackupIfDue();
      await refresh();
    } finally {
      setTriggering(false);
    }
  };

  // Détermine le statut global
  const hasBackup = !!lastBackup;
  const daysSince = lastBackup
    ? Math.floor((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const statusLevel: 'safe' | 'warn' | 'critical' =
    !hasBackup ? 'critical' :
    (daysSince! >= 14 ? 'critical' : daysSince! >= 7 ? 'warn' : 'safe');

  const bg = statusLevel === 'safe' ? '#DCFCE7'
           : statusLevel === 'warn' ? '#FEF3C7'
           : '#FEE2E2';
  const bgDark = statusLevel === 'safe' ? 'rgba(34,197,94,0.15)'
               : statusLevel === 'warn' ? 'rgba(245,158,11,0.15)'
               : 'rgba(239,68,68,0.15)';
  const color = statusLevel === 'safe' ? '#16A34A'
              : statusLevel === 'warn' ? '#D97706'
              : '#DC2626';
  const title = statusLevel === 'safe' ? 'Tes données sont en sécurité'
              : statusLevel === 'warn' ? 'Pense à faire une sauvegarde'
              : !hasBackup ? 'Aucune sauvegarde' : 'Sauvegarde trop ancienne';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? bgDark : bg, borderColor: `${color}40` }]}>
      {/* Titre + icône */}
      <View style={styles.titleRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}25` }]}>
          {statusLevel === 'safe' ? (
            <CheckCircle2 size={20} color={color} strokeWidth={2.5} />
          ) : statusLevel === 'warn' ? (
            <Shield size={20} color={color} strokeWidth={2.5} />
          ) : (
            <AlertTriangle size={20} color={color} strokeWidth={2.5} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color }]}>{title}</Text>
          <Text style={[styles.sub, { color: colors.text }]}>
            {lastBackup ? `Dernier backup ${formatRelative(lastBackup)}` : 'Jamais sauvegardé'}
          </Text>
        </View>
      </View>

      {/* Infos statut */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          {autoEnabled ? <CheckCircle2 size={12} color={color} /> : <AlertTriangle size={12} color="#F59E0B" />}
          <Text style={[styles.infoText, { color: colors.textMuted ?? '#666' }]}>
            Auto-backup {autoEnabled ? 'activé' : 'désactivé'}
          </Text>
        </View>
        <View style={styles.infoItem}>
          {cloud ? <Cloud size={12} color={color} /> : <CloudOff size={12} color="#6B7280" />}
          <Text style={[styles.infoText, { color: colors.textMuted ?? '#666' }]}>
            {cloud ? cloud.displayName : 'Cloud non configuré'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={handleManualBackup}
          disabled={triggering}
          activeOpacity={0.8}
          style={[styles.btn, styles.btnPrimary, { backgroundColor: color, opacity: triggering ? 0.6 : 1 }]}
          accessibilityLabel="Sauvegarder maintenant"
          accessibilityRole="button"
          accessibilityState={{ disabled: triggering }}
        >
          <RefreshCw size={14} color="#fff" strokeWidth={2.5} />
          <Text style={styles.btnText}>
            {triggering ? 'Sauvegarde…' : 'Sauvegarder'}
          </Text>
        </TouchableOpacity>
        {/* Partage (email/WhatsApp/Drive) — fallback pour users sans cloud configuré */}
        {lastBackup && (
          <TouchableOpacity
            onPress={() => { impactAsync(ImpactFeedbackStyle.Light).catch(() => {}); shareLatestBackup(); }}
            activeOpacity={0.8}
            style={[styles.btn, styles.btnSecondary, { borderColor: `${color}80` }]}
            accessibilityLabel="Partager la sauvegarde par email ou messagerie"
            accessibilityRole="button"
          >
            <Share2 size={14} color={color} strokeWidth={2.5} />
            <Text style={[styles.btnTextSecondary, { color }]}>Partager</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export const BackupStatusHeader = React.memo(BackupStatusHeaderInner);

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '900' },
  sub: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  infoRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 11, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  btnPrimary: { flex: 2 },
  btnSecondary: { flex: 1, borderWidth: 1.5, backgroundColor: 'transparent' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  btnTextSecondary: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
});
