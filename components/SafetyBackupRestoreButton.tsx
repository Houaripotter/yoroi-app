// ============================================
// SAFETY BACKUP RESTORE BUTTON
// Bouton à placer dans la page Mes Sauvegardes qui permet à l'user
// de revenir en arrière à un état précédent si un import a foiré.
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Shield, RotateCcw } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { listSafetyBackups } from '@/lib/safetyBackupService';
import { importDataFromBackupObject } from '@/lib/exportService';
import * as FileSystem from 'expo-file-system/legacy';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { formatRelative } from '@/lib/utils/formatDate';
import logger from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

interface SafetyBackup {
  name: string;
  label: string;
  date: Date;
  path: string;
}

const SafetyBackupRestoreButtonInner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [safeties, setSafeties] = useState<SafetyBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  const refresh = useCallback(async () => {
    const list = await listSafetyBackups();
    setSafeties(list);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleRestore = async () => {
    if (safeties.length === 0) return;
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});

    const latest = safeties[0];
    const confirmed = await new Promise<boolean>((resolve) => {
      appAlert(
        traduire('Restaurer l’état précédent ?'),
        traduire("Tu vas revenir à l'état de tes données avant la dernière action risquée ({0}, {1}).\n\nLes modifications faites depuis seront remplacées.\n\nUne nouvelle sauvegarde de sécurité est créée avant la restauration, tu peux toujours revenir en arrière.", latest.label, formatRelative(latest.date)),
        [
          { text: traduire('Annuler'), style: 'cancel', onPress: () => resolve(false) },
          { text: traduire('Restaurer'), style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });
    if (!confirmed) return;

    setRestoring(true);
    try {
      const content = await FileSystem.readAsStringAsync(latest.path, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const data = JSON.parse(content);
      const ok = await importDataFromBackupObject(data);
      if (ok) {
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        appAlert(traduire('Restauration réussie'), traduire('Ton état précédent a été restauré.'));
        await refresh();
      } else {
        appAlert(traduire('Oups'), traduire('L’état précédent n’a pas pu être restauré.'));
      }
    } catch (e) {
      logger.error('[SafetyBackupRestore] Erreur:', e);
      appAlert(traduire('Restauration impossible'), traduire('Le fichier est peut-être abîmé.'));
    } finally {
      setRestoring(false);
    }
  };

  if (loading || safeties.length === 0) return null;

  const latest = safeties[0];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1E1E22' : '#fff', borderColor: '#F59E0B40' }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: '#F59E0B20' }]}>
          <Shield size={18} color="#F59E0B" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{traduire("Revenir à un état précédent")}</Text>
          <Text style={[styles.sub, { color: colors.textMuted ?? '#888' }]}>
            {traduirePluriel(safeties.length, safeties.length > 1, "{0} sauvegarde de sécurité, dernière {1}", "{0} sauvegardes de sécurité, dernière {1}", safeties.length, formatRelative(latest.date))}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleRestore}
        disabled={restoring}
        activeOpacity={0.8}
        style={[styles.btn, { backgroundColor: '#F59E0B', opacity: restoring ? 0.6 : 1 }]}
        accessibilityLabel={traduire("Restaurer au dernier état précédent")}
        accessibilityRole="button"
      >
        {restoring ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <RotateCcw size={14} color="#fff" strokeWidth={2.5} />
        )}
        <Text style={styles.btnText}>
          {restoring ? 'Restauration…' : traduire('Annuler la dernière restauration')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export const SafetyBackupRestoreButton = React.memo(SafetyBackupRestoreButtonInner);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16, marginTop: 10, padding: 14,
    borderRadius: 12, borderWidth: 1, gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '800' },
  sub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
});
